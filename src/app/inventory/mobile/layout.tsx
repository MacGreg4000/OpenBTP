'use client'

import { Navbar } from '@/components/Navbar'

export default function MobileInventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="pt-6 pb-6">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>
    </div>
  )
} 