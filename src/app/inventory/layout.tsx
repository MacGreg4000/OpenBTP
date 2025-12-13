'use client'

import { Navbar } from '@/components/Navbar'

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="pt-16 pb-6">
        {children}
      </main>
    </div>
  )
} 