'use client'

import { Navbar } from '@/components/Navbar'
import DashboardPage from './(dashboard)/page'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Redirection vers login si non authentifié
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  // Redirection immédiate si pas de session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    // Force la redirection
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900" suppressHydrationWarning>
      <Navbar />
      <main className="py-6">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardPage />
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic';
