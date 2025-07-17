"use client"

import { firebaseService } from "./firebase" // Import firebaseService

// Optimized global store dengan memory management yang lebih baik dan Firebase integrasi
class LoadCellStore {
  private static instance: LoadCellStore
  private totalAccumulatedWeightGrams = 0 // Total berat yang diproses (per 20gr) dari historyBerat
  private realtimeCurrentWeightGrams = 0 // Berat realtime dari realtimeBerat/berat
  private rawTotalWeightFromFirebase = 0 // Total berat mentah dari historyBerat (sebelum diproses 20gr)
  private dailyWeightsGrams: number[] = []
  private totalEarnings = 0
  private totalEarningsBeforeSorting = 0
  private completedCycles = 0
  private processingInterval: NodeJS.Timeout | null = null // Interval untuk pengiriman per 20gr
  private listeners: Set<() => void> = new Set()
  private lastUpdate = 0
  private readonly MAX_DAILY_WEIGHTS = 50
  private readonly PROCESSING_INTERVAL_MS = 2000 // 2 detik untuk pengiriman per 20gr
  private historicalDataGrams: number[] = [] // Data historis dari historyBerat untuk chart
  private progressiveChartData: number[] = [] // Data progresif untuk chart yang mengikuti total sampah
  private readonly MAX_HISTORICAL_DATA = 10 // Maksimal 10 data point untuk chart
  private firebaseUnsubscribes: Array<() => void> = []

  // Harga per kg
  private readonly PRICE_BEFORE_SORTING_PER_KG = 8000 // Rp 8.000 per kg sebelum pilah
  private readonly PRICE_AFTER_SORTING_PER_KG = 13000 // Rp 13.000 per kg setelah pilah

  // Status Firebase
  private firebaseConnected = false

  static getInstance(): LoadCellStore {
    if (!LoadCellStore.instance) {
      LoadCellStore.instance = new LoadCellStore()
    }
    return LoadCellStore.instance
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const now = Date.now()
    if (now - this.lastUpdate < 100) return

    this.lastUpdate = now
    this.listeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        console.warn("Listener error:", error)
      }
    })
  }

  private updateProgressiveChartData() {
    // Update data chart progresif berdasarkan totalAccumulatedWeightGrams
    this.progressiveChartData.push(this.totalAccumulatedWeightGrams)

    // Batasi maksimal 20 data points untuk performa
    if (this.progressiveChartData.length > 20) {
      this.progressiveChartData.shift()
    }
  }

  async connectToFirebase(): Promise<boolean> {
    // Unsubscribe semua listener lama
    this.firebaseUnsubscribes.forEach(unsub => unsub())
    this.firebaseUnsubscribes = []
    firebaseService.disconnect()

    // Subscribe baru, simpan unsubscribe-nya
    this.firebaseUnsubscribes.push(
      firebaseService.subscribeConnection((connected: boolean) => {
        this.firebaseConnected = connected
        this.notify()
      })
    )
    this.firebaseUnsubscribes.push(
      firebaseService.subscribeHistoryBerat((rawGram: number) => {
        this.rawTotalWeightFromFirebase = rawGram
        this.processIncomingRawData()
        this.notify()
      })
    )
    this.firebaseUnsubscribes.push(
      firebaseService.subscribeHistoryBeratArray((dataArray: Array<{berat: number; waktu: number}>) => {
        this.historicalDataGrams = dataArray.map((item: {berat: number; waktu: number}) => item.berat || 0)
        this.notify()
      })
    )
    this.firebaseUnsubscribes.push(
      firebaseService.subscribeRealtimeBerat((realtimeGram: number) => {
        this.realtimeCurrentWeightGrams = realtimeGram
        this.notify()
      })
    )
    this.firebaseUnsubscribes.push(
      firebaseService.subscribeAppState((state: any) => {
        if (state.currentWeightGrams > this.totalAccumulatedWeightGrams || this.totalAccumulatedWeightGrams === 0) {
          this.totalAccumulatedWeightGrams = state.currentWeightGrams || 0
          this.totalEarnings = state.totalEarnings || 0
          this.totalEarningsBeforeSorting = state.totalEarningsBeforeSorting || 0
          this.completedCycles = Math.floor(this.totalAccumulatedWeightGrams / 1000)
          console.log("LoadCellStore: State dimuat dari Firebase:", state)
          this.updateProgressiveChartData()
          this.notify()
        }
      })
    )

    const connected = await firebaseService.connect()
    if (connected) {
      console.log("LoadCellStore: Terhubung ke Firebase.")
      this.processIncomingRawData()
    } else {
      console.error("LoadCellStore: Gagal terhubung ke Firebase.")
    }
    return connected
  }

  private processIncomingRawData() {
    const targetWeight = Math.floor(this.rawTotalWeightFromFirebase / 20) * 20

    // Jika berat mentah berkurang atau kurang dari berat yang sudah diproses,
    // segera set berat yang diproses ke target baru dan simpan.
    if (targetWeight < this.totalAccumulatedWeightGrams) {
      this.totalAccumulatedWeightGrams = targetWeight
      this.updateCalculationsAndSave() // Simpan state yang lebih rendah
      this.stopProcessingInterval()
      return
    }

    // Jika target weight lebih besar dari berat yang sudah diproses, mulai/lanjutkan pemrosesan.
    if (targetWeight > this.totalAccumulatedWeightGrams) {
      this.startProcessingInterval(targetWeight)
    } else {
      // Jika target weight sama dengan berat yang sudah diproses, pastikan sudah tersimpan dan hentikan interval.
      // Ini menangani kasus di mana data mentah baru masuk tetapi tidak mengubah target (misalnya, < 20gr increment)
      // atau ketika interval pemrosesan baru saja selesai.
      this.totalAccumulatedWeightGrams = targetWeight // Pastikan kecocokan yang tepat
      this.updateCalculationsAndSave() // Simpan state akhir untuk batch ini
      this.stopProcessingInterval()
    }
  }

  private startProcessingInterval(targetWeight: number) {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }

    this.processingInterval = setInterval(() => {
      if (this.totalAccumulatedWeightGrams < targetWeight) {
        this.totalAccumulatedWeightGrams += 20
        console.log(
          `LoadCellStore: Mengirim data: ${this.totalAccumulatedWeightGrams}gr (dari total mentah ${this.rawTotalWeightFromFirebase}gr)`,
        )
        this.updateProgressiveChartData() // Update chart data setiap kali ada perubahan
        this.updateCalculationsAndSave()
      } else {
        this.stopProcessingInterval()
      }
    }, this.PROCESSING_INTERVAL_MS)
  }

  private stopProcessingInterval() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  private updateCalculationsAndSave() {
    const weightKg = this.totalAccumulatedWeightGrams / 1000
    this.totalEarnings = Math.floor(weightKg * this.PRICE_AFTER_SORTING_PER_KG)
    this.totalEarningsBeforeSorting = Math.floor(weightKg * this.PRICE_BEFORE_SORTING_PER_KG)
    this.completedCycles = Math.floor(weightKg)

    // Simpan state ke Firebase
    firebaseService.saveAppState({
      currentWeightGrams: this.totalAccumulatedWeightGrams,
      totalEarnings: this.totalEarnings,
      totalEarningsBeforeSorting: this.totalEarningsBeforeSorting,
    })
    this.notify()
  }

  // Metode ini tidak lagi digunakan karena selalu terhubung ke Firebase
  startSimulation() {
    // No-op
  }

  stopSimulation() {
    // No-op
  }

  // Mengembalikan total berat terakumulasi dari historyBerat (dalam kg)
  getTotalAccumulatedWeightInKg(): number {
    return this.totalAccumulatedWeightGrams / 1000
  }

  // Mengembalikan total berat terakumulasi dari historyBerat (dalam gram)
  getTotalAccumulatedWeightInGrams(): number {
    return this.totalAccumulatedWeightGrams
  }

  // Mengembalikan berat realtime dari realtimeBerat/berat (dalam gram)
  getRealtimeWeightInGrams(): number {
    return this.realtimeCurrentWeightGrams
  }

  getDailyAverage(): number {
    if (this.dailyWeightsGrams.length === 0) return 0
    const sum = this.dailyWeightsGrams.reduce((acc, weight) => acc + weight, 0)
    return sum / this.dailyWeightsGrams.length / 1000 // Konversi ke kg untuk ditampilkan
  }

  getTotalEarnings(): number {
    return this.totalEarnings
  }

  getTotalEarningsBeforeSorting(): number {
    return this.totalEarningsBeforeSorting
  }

  getCompletedCycles(): number {
    return this.completedCycles
  }

  getRealtimeDataInGrams(): number[] {
    // Mengembalikan nilai realtimeCurrentWeightGrams untuk semua titik data
    return Array.from({ length: 5 }, () => this.realtimeCurrentWeightGrams)
  }

  getHistoricalDataInGrams(): number[] {
    // Jika tidak ada data historis, return array kosong dengan 5 elemen
    if (this.historicalDataGrams.length === 0) {
      return Array(5).fill(0)
    }

    // Ambil maksimal 5 data terakhir untuk chart
    const recentData = this.historicalDataGrams.slice(-5)

    // Jika kurang dari 5 data, pad dengan data pertama
    while (recentData.length < 5) {
      recentData.unshift(recentData[0] || 0)
    }

    return recentData
  }

  // Method baru untuk mendapatkan data chart progresif yang mengikuti total sampah
  getProgressiveChartData(): number[] {
    if (this.progressiveChartData.length === 0) {
      // Jika belum ada data, buat data awal berdasarkan current weight
      return Array(5).fill(this.totalAccumulatedWeightGrams)
    }

    // Ambil 5 data terakhir untuk chart
    const recentData = this.progressiveChartData.slice(-5)

    // Jika kurang dari 5 data, pad dengan data yang ada
    while (recentData.length < 5) {
      recentData.unshift(recentData[0] || this.totalAccumulatedWeightGrams)
    }

    return recentData
  }

  getRealtimeData(): number[] {
    // Buat data chart dalam kg untuk ditampilkan (untuk chart lain)
    const baseWeightKg = Math.max(0, (this.totalAccumulatedWeightGrams - 1000) / 1000)
    return Array.from({ length: 5 }, (_, i) => {
      const weight = baseWeightKg + i * 0.02 + Math.random() * 0.01
      return Math.round(weight * 1000) / 1000
    })
  }

  getPriceBeforeSorting(): number {
    return this.PRICE_BEFORE_SORTING_PER_KG
  }

  getPriceAfterSorting(): number {
    return this.PRICE_AFTER_SORTING_PER_KG
  }

  isUsingFirebase(): boolean {
    return true // Selalu Firebase
  }

  isFirebaseConnected(): boolean {
    return this.firebaseConnected
  }

  getFirebaseDebugInfo() {
    return {
      rawTotalWeight: this.rawTotalWeightFromFirebase,
      processedTotalWeight: this.totalAccumulatedWeightGrams,
      realtimeWeight: this.realtimeCurrentWeightGrams,
      nextTarget: Math.floor(this.rawTotalWeightFromFirebase / 20) * 20,
      isProcessing: this.processingInterval !== null,
    }
  }

  reset() {
    this.totalAccumulatedWeightGrams = 0
    this.realtimeCurrentWeightGrams = 0
    this.rawTotalWeightFromFirebase = 0
    this.dailyWeightsGrams = []
    this.totalEarnings = 0
    this.totalEarningsBeforeSorting = 0
    this.completedCycles = 0
    this.progressiveChartData = [] // Reset chart data
    this.stopProcessingInterval()

    // Reset state di Firebase
    firebaseService.resetAppState()
    this.notify()
  }

  cleanup() {
    this.firebaseUnsubscribes.forEach(unsub => unsub())
    this.firebaseUnsubscribes = []
    this.stopProcessingInterval()
    firebaseService.disconnect()
    this.listeners.clear()
    this.dailyWeightsGrams = []
    this.progressiveChartData = []
  }
}

export const loadCellStore = LoadCellStore.getInstance()

// Cleanup saat halaman dimuat ulang
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    loadCellStore.cleanup()
  })
}
