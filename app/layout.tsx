// Opsi 1: Logo di Header (seperti di atas)

// Opsi 2: Logo sebagai favicon
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Sidebar from "@/components/Sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EcoProfit - Dashboard Pemilahan Sampah",
  description: "Sistem monitoring dan analisis keuntungan pemilahan sampah",
  generator: 'Khairil Zaki',
  icons: {
    icon: '/timbangan.svg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto lg:ml-0">
            <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}

// Opsi 3: Jika ingin logo di dalam Sidebar, Anda perlu mengubah komponen Sidebar