"use client"

import { useState, useEffect } from "react"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js"

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

export default function AnalisisKeuntungan() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("monthly")

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const profitComparisonData = {
    labels: ["Plastik", "Kertas", "Logam", "Kaca", "Organik"],
    datasets: [
      {
        label: "Sebelum Pilah (Rp)",
        data: [50000, 30000, 80000, 25000, 15000],
        backgroundColor: "#ef4444",
      },
      {
        label: "Sesudah Pilah (Rp)",
        data: [180000, 120000, 350000, 90000, 60000],
        backgroundColor: "#059669",
      },
    ],
  }

  const wasteTypeData = {
    labels: ["Plastik", "Kertas", "Logam", "Kaca", "Organik"],
    datasets: [
      {
        data: [35, 25, 20, 10, 10],
        backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
        borderWidth: 0,
      },
    ],
  }

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
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
    },
  }

  return (
    <div
      className={`space-y-6 transition-all duration-700 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-emerald-700 mb-6">Analisis Keuntungan</h1>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-xl shadow-lg p-12 animate-slide-up text-center">
        <div className="text-6xl mb-6">🚧</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Halaman Dalam Pengembangan</h2>
        <p className="text-gray-600 mb-6">
          Fitur analisis keuntungan sedang dalam tahap pengembangan dan akan segera tersedia.
        </p>
        <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
          Coming Soon
        </div>
      </div>

      {/* Period Selector */}
      {/* Removed as part of updates */}

      {/* Profit Summary */}
      {/* Removed as part of updates */}

      {/* Charts */}
      {/* Removed as part of updates */}

      {/* Detailed Analysis Table */}
      {/* Removed as part of updates */}
    </div>
  )
}
