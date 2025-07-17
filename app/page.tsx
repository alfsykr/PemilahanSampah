"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { loadCellStore } from "@/lib/loadCellStore"
import { Line } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

// Memoized chart options to prevent recreation
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
  animation: {
    duration: 300, // Reduced animation duration
  },
}

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [totalAccumulatedWeightKg, setTotalAccumulatedWeightKg] = useState(0) // Total dari historyBerat (dalam kg)
  const [realtimeCurrentWeightGrams, setRealtimeCurrentWeightGrams] = useState(0) // Berat realtime dari realtimeBerat
  const [dailyAverage, setDailyAverage] = useState(0)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalEarningsBeforeSorting, setTotalEarningsBeforeSorting] = useState(0)
  const [completedCycles, setCompletedCycles] = useState(0)
  const [priceBeforeSorting, setPriceBeforeSorting] = useState(0)
  const [priceAfterSorting, setPriceAfterSorting] = useState(0)
  const [isConnected, setIsConnected] = useState(false) // Tambahkan state koneksi
  const [progressiveData, setProgressiveData] = useState<number[]>([])

  // Static data - memoized to prevent recreation
  const monthlyData = useMemo(
    () => ({
      weights: [100, 150, 200, 180, 220],
      profitBefore: [800000, 1200000, 1600000, 1440000, 1760000], // Rp 8.000 per kg
    }),
    [],
  )

  // Memoized chart data
  const chartData = useMemo(() => {
    const monthlyProfitAfter = monthlyData.weights.map((weight) => weight * 13000) // Rp 13.000 per kg

    return {
      weight: {
        labels: ["Jan", "Feb", "Mar", "Apr", "Mei"],
        datasets: [
          {
            label: "Berat Sampah (kg)",
            data: monthlyData.weights,
            borderColor: "#059669",
            backgroundColor: "rgba(5, 150, 105, 0.1)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      profit: {
        labels: ["Jan", "Feb", "Mar", "Apr", "Mei"],
        datasets: [
          {
            label: "Sebelum Pilah (Rp 8.000/kg)",
            data: monthlyData.profitBefore,
            backgroundColor: "#ef4444",
          },
          {
            label: "Sesudah Pilah (Rp 13.000/kg)",
            data: monthlyProfitAfter,
            backgroundColor: "#059669",
          },
        ],
      },
    }
  }, [monthlyData])

  // Progressive chart data yang mengikuti Total Sampah
  const progressiveChartData = useMemo(() => {
    return {
      labels: ["5 menit lalu", "4 menit lalu", "3 menit lalu", "2 menit lalu", "Sekarang"],
      datasets: [
        {
          label: "Total Sampah (gr)",
          data: progressiveData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    }
  }, [progressiveData])

  // Chart options untuk progressive chart
  const progressiveChartOptions = useMemo(() => {
    const maxValue = Math.max(...progressiveData, 100) // Minimal 100 untuk scale
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: Math.ceil(maxValue * 1.2), // 20% lebih tinggi dari nilai maksimum
          ticks: {
            callback: (value: any) => value + " gr",
            stepSize: Math.ceil(maxValue / 10), // 10 step
          },
        },
      },
      animation: {
        duration: 500, // Animasi lebih smooth
      },
    }
  }, [progressiveData])

  // Optimized update handler
  const updateData = useCallback(() => {
    setTotalAccumulatedWeightKg(loadCellStore.getTotalAccumulatedWeightInKg())
    setRealtimeCurrentWeightGrams(loadCellStore.getRealtimeWeightInGrams())
    setDailyAverage(loadCellStore.getDailyAverage())
    setTotalEarnings(loadCellStore.getTotalEarnings())
    setTotalEarningsBeforeSorting(loadCellStore.getTotalEarningsBeforeSorting())
    setCompletedCycles(loadCellStore.getCompletedCycles())
    setPriceBeforeSorting(loadCellStore.getPriceBeforeSorting())
    setPriceAfterSorting(loadCellStore.getPriceAfterSorting())
    setIsConnected(loadCellStore.isFirebaseConnected())
    setProgressiveData(loadCellStore.getProgressiveChartData()) // Update progressive chart data
  }, [])

  useEffect(() => {
    setIsLoaded(true)

    // Subscribe to load cell store updates
    const unsubscribe = loadCellStore.subscribe(updateData)

    // Start simulation if not already running (akan otomatis konek Firebase)
    loadCellStore.startSimulation()

    // Initial data load
    updateData()

    return () => { unsubscribe() }
  }, [updateData])

  // Memoized calculations
  const calculations = useMemo(() => {
    const profitIncrease =
      totalEarnings > 0 && totalEarningsBeforeSorting > 0
        ? (((totalEarnings - totalEarningsBeforeSorting) / totalEarningsBeforeSorting) * 100).toFixed(0)
        : "0"
    const effectiveRate = totalAccumulatedWeightKg > 0 ? (totalEarnings / totalAccumulatedWeightKg).toFixed(0) : "0"
    const profitDifference = totalEarnings > totalEarningsBeforeSorting ? totalEarnings - totalEarningsBeforeSorting : 0

    return {
      profitIncrease,
      effectiveRate,
      profitDifference,
    }
  }, [totalAccumulatedWeightKg, totalEarnings, totalEarningsBeforeSorting])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-emerald-700 mb-6">Dashboard Pemilahan Sampah</h1>
      </div>

      {/* Summary Cards - Updated with new prices */}
      <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          Ringkasan Hari Ini
          <div className="ml-2 flex items-center">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"} animate-ping mr-1`}
            ></div>
            <span className={`text-xs ${isConnected ? "text-emerald-600" : "text-red-600"}`}>
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-shadow duration-300">
            <p className="text-gray-600 text-sm mb-2">Total Sampah (gr)</p>
            <h2 className="text-3xl font-bold text-emerald-600">
              {loadCellStore.getTotalAccumulatedWeightInGrams().toLocaleString()} gr
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Rata-rata: {dailyAverage > 0 ? dailyAverage.toFixed(1) : "0.0"} kg
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg hover:shadow-md transition-shadow duration-300">
            <p className="text-gray-600 text-sm mb-2">Keuntungan Sebelum Pilah</p>
            <h2 className="text-3xl font-bold text-red-500">Rp {totalEarningsBeforeSorting.toLocaleString("id-ID")}</h2>
            <p className="text-xs text-gray-500 mt-1">Rp {priceBeforeSorting.toLocaleString("id-ID")}/kg</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg hover:shadow-md transition-shadow duration-300">
            <p className="text-gray-600 text-sm mb-2">Keuntungan Setelah Pilah</p>
            <h2 className="text-3xl font-bold text-emerald-600">Rp {totalEarnings.toLocaleString("id-ID")}</h2>
            <p className="text-xs text-gray-500 mt-1">Rp {priceAfterSorting.toLocaleString("id-ID")}/kg</p>
          </div>
        </div>
      </div>

      {/* Progressive Chart - Mengikuti Total Sampah */}
      <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">⚖️</span>
          Representasi Hari ini
          <span className={`ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700`}>Firebase</span>
          <div className="ml-2 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
            <span className="text-xs text-blue-600">Mengikuti Total Sampah</span>
          </div>
        </h3>
        <div className="h-96">
          <Line data={progressiveChartData} options={progressiveChartOptions} />
        </div>
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">
            Chart ini menampilkan pergerakan total sampah secara real-time:{" "}
            <span className="font-semibold text-blue-600">{loadCellStore.getTotalAccumulatedWeightInGrams()} gr</span>
          </p>
        </div>
      </div>

      {/* Real-time Statistics - Improved Layout */}
      <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
          <span className="text-2xl mr-2">⚡</span>
          Statistik Real-time
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Peningkatan Profit */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center hover:shadow-md transition-all duration-300 hover:scale-105">
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-3xl font-bold text-purple-600 mb-2">{calculations.profitIncrease}%</div>
            <div className="text-sm text-gray-600 font-medium">Peningkatan Profit</div>
            <div className="text-xs text-purple-500 mt-1">vs sebelum pilah</div>
          </div>

          {/* Card 2: Total Berat */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 text-center hover:shadow-md transition-all duration-300 hover:scale-105">
            <div className="text-4xl mb-3">⚖️</div>
            <div className="text-3xl font-bold text-indigo-600 mb-2">{totalAccumulatedWeightKg.toFixed(1)} kg</div>
            <div className="text-sm text-gray-600 font-medium">Total Berat</div>
            <div className="text-xs text-indigo-500 mt-1">sampah terkumpul</div>
          </div>

          {/* Card 3: Selisih Keuntungan */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 text-center hover:shadow-md transition-all duration-300 hover:scale-105 sm:col-span-2 lg:col-span-1">
            <div className="text-4xl mb-3">💎</div>
            <div className="text-3xl font-bold text-teal-600 mb-2">
              Rp {calculations.profitDifference.toLocaleString("id-ID")}
            </div>
            <div className="text-sm text-gray-600 font-medium">Selisih Keuntungan</div>
            <div className="text-xs text-teal-500 mt-1">keuntungan tambahan</div>
          </div>
        </div>
      </div>

      {/* System Status - Updated */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Status Sistem Load Cell</h3>
            <p className="text-emerald-100">Monitoring aktif • Update setiap 2 detik • Data tersinkronisasi</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end mb-2">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"} animate-pulse mr-2`}
              ></div>
              <span className="font-semibold">{isConnected ? "Online" : "Offline"}</span>
            </div>
            <div className="text-sm text-emerald-200">
              Harga: Rp {priceAfterSorting.toLocaleString("id-ID")}/kg (setelah pilah)
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
