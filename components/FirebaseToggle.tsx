"use client"

import { useState, useEffect } from "react"
import { loadCellStore } from "@/lib/loadCellStore"

export default function FirebaseToggle() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [useFirebase, setUseFirebase] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = loadCellStore.subscribe(() => {
      setUseFirebase(loadCellStore.isUsingFirebase())
      setIsConnected(loadCellStore.isFirebaseConnected())

      // Update debug info jika menggunakan Firebase
      if (loadCellStore.isUsingFirebase()) {
        setDebugInfo(loadCellStore.getFirebaseDebugInfo())
      } else {
        setDebugInfo(null)
      }
    })

    // Initial state
    setUseFirebase(loadCellStore.isUsingFirebase())
    setIsConnected(loadCellStore.isFirebaseConnected())

    return () => { unsubscribe() }
  }, [])

  const handleToggleFirebase = async () => {
    if (useFirebase) {
      // Disconnect from Firebase
      loadCellStore.cleanup()
    } else {
      // Connect to Firebase
      setIsConnecting(true)
      try {
        const connected = await loadCellStore.connectToFirebase()
        if (!connected) {
          console.warn("Firebase connection failed, using dummy data")
        }
      } catch (error) {
        console.error("Firebase connection error:", error)
      } finally {
        setIsConnecting(false)
      }
    }
  }

  const getStatusColor = () => {
    if (isConnecting) return "bg-yellow-500"
    if (useFirebase && isConnected) return "bg-green-500"
    if (useFirebase && !isConnected) return "bg-red-500"
    return "bg-gray-500"
  }

  const getStatusText = () => {
    if (isConnecting) return "Menghubungkan..."
    if (useFirebase && isConnected) return "Firebase Terhubung"
    if (useFirebase && !isConnected) return "Firebase Terputus"
    return "Data Dummy"
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isConnecting ? "animate-pulse" : ""}`}></div>
          <div>
            <h3 className="font-semibold text-gray-800">Sumber Data</h3>
            <p className="text-sm text-gray-600">{getStatusText()}</p>
          </div>
        </div>

        <button
          onClick={handleToggleFirebase}
          disabled={isConnecting}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isConnecting
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : useFirebase
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
          }`}
        >
          {isConnecting ? "Menghubungkan..." : useFirebase ? "Putuskan Firebase" : "Hubungkan Firebase"}
        </button>
      </div>

      {/* Connection Info */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Mode:</span>
            <span className="font-medium">{useFirebase ? "Firebase Real-time" : "Data Simulasi"}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`font-medium ${isConnected && useFirebase ? "text-green-600" : "text-gray-600"}`}>
              {useFirebase ? (isConnected ? "Online" : "Offline") : "Simulasi Aktif"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Increment:</span>
            <span className="font-medium">{useFirebase ? "Per 20 gr" : "20-60 gr"}</span>
          </div>
        </div>
      </div>

      {/* Firebase Info */}
      {useFirebase && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            📡 Mengambil data dari: <code className="bg-blue-100 px-1 rounded">logBeratLC1</code>
          </p>
          <p className="text-xs text-blue-600 mt-1">Data dikirim bertahap per 20 gr setiap 2 detik</p>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && useFirebase && (
        <div className="mt-2 p-2 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-700 font-semibold mb-1">Debug Info:</p>
          <div className="text-xs text-yellow-600 space-y-1">
            <div className="flex justify-between">
              <span>Raw Total Weight:</span>
              <span>{debugInfo.rawTotalWeight}gr</span>
            </div>
            <div className="flex justify-between">
              <span>Sent Weight:</span>
              <span>{debugInfo.sentWeight}gr</span>
            </div>
            <div className="flex justify-between">
              <span>Next Target:</span>
              <span>{debugInfo.nextTarget}gr</span>
            </div>
            <div className="flex justify-between">
              <span>Processing:</span>
              <span className={debugInfo.isProcessing ? "text-green-600" : "text-gray-600"}>
                {debugInfo.isProcessing ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
