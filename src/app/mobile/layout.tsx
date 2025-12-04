'use client'

import { SelectedChantierProvider } from '@/contexts/SelectedChantierContext'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import MobileManifest from '@/components/MobileManifest'

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      // Récupérer le chemin actuel pour le callbackUrl
      const currentPath = pathname || '/mobile'
      console.log('🔒 Mobile: Utilisateur non authentifié, redirection vers login')
      router.push(`/login?callbackUrl=${encodeURIComponent(currentPath)}`)
      return
    }

    if (session?.user) {
      console.log('👤 Mobile: Utilisateur connecté:', {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      })
      
      const allowedRoles = ['ADMIN', 'MANAGER', 'USER']
      if (!allowedRoles.includes(session.user.role || '')) {
        console.warn('⚠️ Mobile: Rôle non autorisé:', session.user.role)
        router.push('/')
        return
      }
      
      console.log('✅ Mobile: Accès autorisé pour le rôle:', session.user.role)
    }
  }, [status, session, router, pathname])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <SelectedChantierProvider>
      <MobileManifest />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        {children}
      </div>
    </SelectedChantierProvider>
  )
}

