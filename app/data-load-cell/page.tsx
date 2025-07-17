"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { loadCellStore } from "@/lib/loadCellStore"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function DataLoadCell() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [totalAccumulatedWeightKg, setTotalAccumulatedWeightKg] = useState(0) // Total dari historyBerat (dalam kg)
  const [realtimeCurrentWeightGrams, setRealtimeCurrentWeightGrams] = useState(0) // Berat realtime dari realtimeBerat
  const [dailyAverage, setDailyAverage] = useState(0)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [completedCycles, setCompletedCycles] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [priceAfterSorting, setPriceAfterSorting] = useState(0)

  // Optimized update handler
  const updateData = useCallback(() => {
    setTotalAccumulatedWeightKg(loadCellStore.getTotalAccumulatedWeightInKg()) // Total dari historyBerat (dalam kg)
    setRealtimeCurrentWeightGrams(loadCellStore.getRealtimeWeightInGrams()) // Realtime dari realtimeBerat
    setDailyAverage(loadCellStore.getDailyAverage())
    setTotalEarnings(loadCellStore.getTotalEarnings())
    setCompletedCycles(loadCellStore.getCompletedCycles())
    setIsConnected(loadCellStore.isFirebaseConnected())
    setPriceAfterSorting(loadCellStore.getPriceAfterSorting())
  }, [])

  useEffect(() => {
    setIsLoaded(true)

    const unsubscribe = loadCellStore.subscribe(updateData)
    updateData()

    return () => { unsubscribe() }
  }, [updateData])

  // Memoized calculations
  const calculations = useMemo(() => {
    const remainingWeight = totalAccumulatedWeightKg - completedCycles

    return {
      remainingWeight,
      progressPercentage: (totalAccumulatedWeightKg % 1) * 100, // Progress per kg
    }
  }, [totalAccumulatedWeightKg, completedCycles])

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
        <h1 className="text-3xl font-bold text-emerald-700 mb-6">Data Load Cell</h1>
      </div>

      {/* Current Weight Display - Ubah ke gr saja dengan font lebih besar */}
      <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Berat Pada Mesin Saat ini</h2>
          <div className="text-8xl font-bold text-emerald-600 mb-4 animate-pulse">
            {realtimeCurrentWeightGrams.toLocaleString()} gr
          </div>
          <div className="flex justify-center items-center space-x-2 mb-4">
            <div className={`w-3 h-3 rounded-full animate-ping bg-emerald-500`}></div>
            <span className={`font-medium text-emerald-600`}>Real-time Data</span>
          </div>
        </div>
      </div>

      {/* Earnings Display - Enhanced */}
      <div className={`bg-gradient-to-br text-white rounded-xl p-6 animate-slide-up from-emerald-500 to-emerald-600`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
          <div>
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold">Rp {totalEarnings.toLocaleString("id-ID")}</div>
            <div className={"text-emerald-100"}>Total Keuntungan</div>
            <div className="text-xs mt-1 opacity-80">Rp {priceAfterSorting.toLocaleString("id-ID")}/kg</div>
          </div>
          <div>
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold">{completedCycles.toFixed(1)} kg</div>
            <div className={"text-emerald-100"}>Berat Terhitung</div>
          </div>
        </div>
      </div>

      {/* Calculation Details - Enhanced with new prices */}
      <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-2xl mr-2">🧮</span>
          Detail Perhitungan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Sistem Perhitungan:</span>
              <span className="font-semibold">Per gr</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-gray-600">Harga Sebelum Pilah:</span>
              <span className="font-semibold text-red-600">Rp 8.000/kg</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-gray-600">Harga Setelah Pilah:</span>
              <span className="font-semibold text-emerald-600">Rp 13.000/kg</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-gray-600">Berat Terkumpul:</span>
              <span className="font-semibold">
                {loadCellStore.getTotalAccumulatedWeightInGrams().toLocaleString()} gr
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-gray-600">Total Keuntungan:</span>
              <span className="font-semibold text-emerald-600">Rp {totalEarnings.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-600">Status Sistem:</span>
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"} animate-pulse mr-2`}
                ></div>
                <span className={`font-semibold ${isConnected ? "text-emerald-600" : "text-red-600"}`}>
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons - Enhanced */}
      <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Kontrol Sistem</h3>
        <div className="flex gap-4 flex-wrap items-center">
          <button
            onClick={() => loadCellStore.reset()}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium"
          >
            Reset Data
          </button>
          <div className="flex items-center text-sm text-gray-600">
            <div className={`w-2 h-2 rounded-full animate-pulse mr-2 bg-emerald-500`}></div>
            Sistem monitoring aktif
          </div>
          <div className="text-sm text-gray-500">Update otomatis setiap 2 detik</div>
        </div>
      </div>
    </div>
  )
}

