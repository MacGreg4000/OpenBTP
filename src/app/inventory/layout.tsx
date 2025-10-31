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
      <main className="pt-6 pb-6">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
} 