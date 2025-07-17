"use client"

/**
 * Firebase service yang mengambil data dari historyBerat dan realtimeBerat,
 * menjumlahkan semua nilai 'berat' dari historyBerat,
 * dan mengirim total sum serta nilai realtime ke LoadCellStore.
 *
 * File ini hanya bertugas membaca data mentah dari Firebase.
 * Logika pengiriman per 20 gram dan persistensi state aplikasi
 * akan ditangani oleh LoadCellStore.
 */

import type { FirebaseApp } from "firebase/app"
import { initializeApp, type FirebaseOptions } from "firebase/app"
import { getDatabase, ref, onValue, off, set, type DatabaseReference, type DataSnapshot } from "firebase/database"

let FirebaseServiceImpl: any

if (typeof window !== "undefined") {
  // -----  Browser  ----------------------------------------------------
  const firebaseConfig: FirebaseOptions = {
    apiKey: "AIzaSyA2eBJjl9PXZw9jRZCrhbKvYmyTdLD7Sbw",
    authDomain: "tugasakhir2025khairil.firebaseapp.com",
    databaseURL: "https://tugasakhir2025khairil-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tugasakhir2025khairil",
    storageBucket: "tugasakhir2025khairil.appspot.com",
    messagingSenderId: "163871892502",
    appId: "1:163871892502:web:487433946188036b490137",
  }

  const app: FirebaseApp = initializeApp(firebaseConfig)
  const database = getDatabase(app)

  class FirebaseService {
    private historyBeratRef: DatabaseReference | null = null // Untuk historyBerat (total sum)
    private realtimeBeratRef: DatabaseReference | null = null // Untuk realtimeBerat (single value)
    private appStateRef: DatabaseReference | null = null // Untuk menyimpan state aplikasi di node 'perhitungan'
    private connected = false
    private connListeners = new Set<(c: boolean) => void>()
    private historyBeratListeners = new Set<(g: number) => void>() // Listener untuk total berat dari historyBerat
    private realtimeBeratListeners = new Set<(g: number) => void>() // Listener untuk berat realtime
    private appStateListeners = new Set<(state: any) => void>() // Listener untuk state aplikasi
    private historyBeratArrayListeners = new Set<(data: Array<{ berat: number; waktu: number }>) => void>()

    subscribeConnection(fn: (c: boolean) => void) {
      this.connListeners.add(fn)
      fn(this.connected)
      return () => this.connListeners.delete(fn)
    }

    subscribeHistoryBerat(fn: (g: number) => void) {
      this.historyBeratListeners.add(fn)
      return () => this.historyBeratListeners.delete(fn)
    }

    subscribeHistoryBeratArray(fn: (data: Array<{ berat: number; waktu: number }>) => void) {
      this.historyBeratArrayListeners.add(fn)
      return () => this.historyBeratArrayListeners.delete(fn)
    }

    subscribeRealtimeBerat(fn: (g: number) => void) {
      this.realtimeBeratListeners.add(fn)
      return () => this.realtimeBeratListeners.delete(fn)
    }

    subscribeAppState(fn: (state: any) => void) {
      this.appStateListeners.add(fn)
      return () => this.appStateListeners.delete(fn)
    }

    private emitConn(c: boolean) {
      this.connected = c
      this.connListeners.forEach((f) => f(c))
    }

    private emitHistoryBerat(g: number) {
      this.historyBeratListeners.forEach((f) => f(g))
    }

    private emitHistoryBeratArray(data: Array<{ berat: number; waktu: number }>) {
      this.historyBeratArrayListeners.forEach((f) => f(data))
    }

    private emitRealtimeBerat(g: number) {
      this.realtimeBeratListeners.forEach((f) => f(g))
    }

    private emitAppState(state: any) {
      this.appStateListeners.forEach((f) => f(state))
    }

    async connect(): Promise<boolean> {
      if (this.historyBeratRef && this.realtimeBeratRef && this.appStateRef && this.connected) return true // Sudah terhubung dan aktif

      // Referensi untuk data history (historyBerat)
      this.historyBeratRef = ref(database, "historyBerat")
      // Referensi untuk data realtime (realtimeBerat/berat)
      this.realtimeBeratRef = ref(database, "realtimeBerat/berat")
      // Referensi untuk state aplikasi (sekarang di 'perhitungan')
      this.appStateRef = ref(database, "perhitungan")

      let historyBeratInitialized = false
      let realtimeBeratInitialized = false
      let appStateInitialized = false
      let connectionAttempted = false // Flag untuk memastikan hanya satu kali resolve/reject

      return new Promise((resolve, reject) => {
        const checkAndResolve = () => {
          if (historyBeratInitialized && realtimeBeratInitialized && appStateInitialized && !connectionAttempted) {
            connectionAttempted = true
            this.emitConn(true)
            resolve(true)
          }
        }

        const handleConnectionError = (error: any) => {
          if (!connectionAttempted) {
            connectionAttempted = true
            console.error("Firebase connection error:", error)
            this.emitConn(false)
            reject(false)
          }
        }

        // Listener untuk data history (historyBerat)
        onValue(
          this.historyBeratRef!,
          (snap: DataSnapshot) => {
            const dataArray: Array<{ berat: number; waktu: number }> = []
            let totalBerat = 0

            if (snap.exists()) {
              snap.forEach((childSnap) => {
                const berat = childSnap.child("berat").val()
                const waktu = childSnap.child("waktu").val()

                if (typeof berat === "number") {
                  totalBerat += berat
                  dataArray.push({ berat, waktu: waktu || 0 })
                }
              })
            }

            // Sort by waktu (time) untuk urutan yang benar
            dataArray.sort((a, b) => a.waktu - b.waktu)

            console.log(`Firebase: Data historis untuk chart:`, dataArray)
            this.emitHistoryBeratArray(dataArray)

            // Emit total seperti sebelumnya
            console.log(`Firebase: Total berat dari historyBerat: ${totalBerat}gr`)
            this.emitHistoryBerat(totalBerat)

            if (!historyBeratInitialized) {
              historyBeratInitialized = true
              checkAndResolve()
            }
          },
          handleConnectionError,
        )

        // Listener untuk data realtime (realtimeBerat/berat)
        onValue(
          this.realtimeBeratRef!,
          (snap: DataSnapshot) => {
            const beratRealtime = snap.exists() ? snap.val() : 0
            console.log(`Firebase: Berat realtime dari realtimeBerat/berat: ${beratRealtime}gr`)
            this.emitRealtimeBerat(beratRealtime)
            if (!realtimeBeratInitialized) {
              realtimeBeratInitialized = true
              checkAndResolve()
            }
          },
          handleConnectionError,
        )

        // Listener untuk state aplikasi (perhitungan)
        onValue(
          this.appStateRef!,
          (snap: DataSnapshot) => {
            if (snap.exists()) {
              const appState = snap.val()
              console.log("Firebase: App state dimuat dari 'perhitungan':", appState)
              this.emitAppState(appState)
            } else {
              console.log("Firebase: Node 'perhitungan' tidak ditemukan, inisialisasi ke 0.")
              this.emitAppState({ currentWeightGrams: 0, totalEarnings: 0, totalEarningsBeforeSorting: 0 })
            }
            if (!appStateInitialized) {
              appStateInitialized = true
              checkAndResolve()
            }
          },
          handleConnectionError,
        )

        // Timeout untuk mencegah koneksi menggantung
        setTimeout(() => {
          if (!connectionAttempted) {
            handleConnectionError(new Error("Firebase connection timeout"))
          }
        }, 15_000) // Tingkatkan timeout menjadi 15 detik
      })
    }

    async saveAppState(state: {
      currentWeightGrams: number
      totalEarnings: number
      totalEarningsBeforeSorting: number
    }) {
      if (!this.appStateRef || !this.connected) {
        console.warn("Firebase app state reference not initialized or not connected. Cannot save.")
        return
      }
      try {
        await set(this.appStateRef, state)
        console.log("Firebase: App state disimpan ke 'perhitungan':", state)
      } catch (error) {
        console.error("Gagal menyimpan app state ke Firebase:", error)
      }
    }

    async resetAppState() {
      if (!this.appStateRef || !this.connected) {
        console.warn("Firebase app state reference not initialized or not connected. Cannot reset.")
        return
      }
      try {
        await set(this.appStateRef, { currentWeightGrams: 0, totalEarnings: 0, totalEarningsBeforeSorting: 0 })
        console.log("Firebase: App state direset di 'perhitungan'.")
      } catch (error) {
        console.error("Gagal mereset app state di Firebase:", error)
      }
    }

    disconnect() {
      if (this.historyBeratRef) off(this.historyBeratRef)
      if (this.realtimeBeratRef) off(this.realtimeBeratRef)
      if (this.appStateRef) off(this.appStateRef)
      this.historyBeratRef = null
      this.realtimeBeratRef = null
      this.appStateRef = null
      this.emitConn(false)
    }

    getDebugInfo() {
      return {}
    }
  }

  FirebaseServiceImpl = new FirebaseService()
} else {
  // -----  Server / SSR  ------------------------------------------------
  class FirebaseStub {
    subscribeConnection(fn: (c: boolean) => void) {
      fn(false)
      return () => {}
    }
    subscribeHistoryBerat(fn: (g: number) => void) {
      fn(0)
      return () => {}
    }
    subscribeRealtimeBerat(fn: (g: number) => void) {
      fn(0)
      return () => {}
    }
    subscribeAppState(fn: (state: any) => void) {
      fn({ currentWeightGrams: 0, totalEarnings: 0, totalEarningsBeforeSorting: 0 })
      return () => {}
    }
    async connect() {
      return false
    }
    async saveAppState(state: any) {
      console.log("Firebase Stub: Saving app state (no-op)", state)
    }
    async resetAppState() {
      console.log("Firebase Stub: Resetting app state (no-op)")
    }
    disconnect() {}
    getDebugInfo() {
      return {}
    }
  }

  FirebaseServiceImpl = new FirebaseStub()
}

export const firebaseService = FirebaseServiceImpl


