'use client'

import { Navbar } from '@/components/Navbar'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Encore en train de charger
    
    if (status === 'unauthenticated') {
      console.log('❌ Utilisateur non authentifié - redirection vers login')
      router.push('/login')
      return
    }
    
    console.log('✅ Utilisateur authentifié:', session?.user?.email)
  }, [status, session, router])

  // Afficher un loading pendant la vérification
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Vérification de l'authentification...</p>
        </div>
      </div>
    )
  }

  // Afficher un message si pas authentifié (en cas de problème avec la redirection)
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Vous devez être connecté pour accéder à cette page.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-visible">
      <Navbar />
      
      <main className="pt-6 pb-6 overflow-visible">
        {children}
      </main>
    </div>
  )
} 