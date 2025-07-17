"use client"

import { useEffect } from "react"

import { useState, useCallback, memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChartBarIcon, ScaleIcon, CurrencyDollarIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline"
import { loadCellStore } from "@/lib/loadCellStore" // Import loadCellStore

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartBarIcon },
  { name: "Data Load Cell", href: "/data-load-cell", icon: ScaleIcon },
  { name: "Analisis Keuntungan", href: "/analisis-keuntungan", icon: CurrencyDollarIcon },
]

// Memoized navigation item component
const NavigationItem = memo(
  ({
    item,
    isActive,
    onClose,
  }: {
    item: (typeof navigation)[0]
    isActive: boolean
    onClose: () => void
  }) => (
    <Link
      href={item.href}
      onClick={onClose}
      className={`
      group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
      ${
        isActive
          ? "bg-emerald-100 text-emerald-700 shadow-sm border-l-4 border-emerald-500"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }
    `}
    >
      <item.icon
        className={`
        mr-3 h-5 w-5 transition-colors duration-200
        ${isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-500"}
      `}
      />
      {item.name}
      {isActive && <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
    </Link>
  ),
)

NavigationItem.displayName = "NavigationItem"

export default function Sidebar() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev)
  }, [])

  // Efek samping untuk memastikan koneksi Firebase saat sidebar dimuat
  // Ini penting karena Sidebar adalah bagian dari RootLayout
  useEffect(() => {
    loadCellStore.connectToFirebase()
  }, [])

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobileMenu}
          className="bg-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          ) : (
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-8 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white">
                <img src="/logo-unj.png" alt="Logo UNJ" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-700">EcoProfit</h2>
                <p className="text-xs text-gray-500">Waste Management</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} isActive={pathname === item.href} onClose={closeMobileMenu} />
            ))}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">© 2025 EcoProfit Dashboard</div>
          </div>
        </div>
      </div>
    </>
  )
}
