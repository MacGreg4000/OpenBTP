'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

export default function AuthProvider({
  children
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Intercepter les erreurs NextAuth et rediriger vers login au lieu de reset-password
    const handleError = (event: ErrorEvent) => {
      const errorMsg = event.message || ''
      if (errorMsg.includes('CLIENT_FETCH_ERROR') || 
          errorMsg.includes('Load failed') ||
          errorMsg.includes('/api/auth/session') ||
          errorMsg.includes('reset-password')) {
        console.error('❌ [NextAuth] Erreur de session détectée:', errorMsg)
        // Empêcher la redirection vers reset-password
        event.preventDefault()
        // Rediriger vers login seulement si on n'est pas déjà sur login ou reset-password
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          if (!currentPath.includes('/login') && !currentPath.includes('/reset-password')) {
            console.log('🔄 [NextAuth] Redirection vers /login')
            window.location.href = '/login'
          }
        }
      }
    }

    // Intercepter les erreurs non gérées
    window.addEventListener('error', handleError)
    
    // Intercepter les promesses rejetées non gérées
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMsg = event.reason?.message || event.reason?.toString() || ''
      if (errorMsg.includes('CLIENT_FETCH_ERROR') ||
          errorMsg.includes('Load failed') ||
          errorMsg.includes('/api/auth/session') ||
          errorMsg.includes('reset-password')) {
        console.error('❌ [NextAuth] Erreur de session (promise rejection):', errorMsg)
        event.preventDefault()
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          if (!currentPath.includes('/login') && !currentPath.includes('/reset-password')) {
            console.log('🔄 [NextAuth] Redirection vers /login (promise rejection)')
            window.location.href = '/login'
          }
        }
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Surveiller les changements de pathname pour éviter les boucles de redirection
    let lastPath = window.location.pathname
    const checkPathChange = () => {
      const currentPath = window.location.pathname
      if (currentPath === '/reset-password' && lastPath !== '/reset-password') {
        console.log('🔄 [NextAuth] Détection de redirection vers reset-password, correction vers /login')
        window.location.href = '/login'
      }
      lastPath = currentPath
    }

    // Vérifier périodiquement
    const pathCheckInterval = setInterval(checkPathChange, 100)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      clearInterval(pathCheckInterval)
    }
  }, [])

  return (
    <SessionProvider
      refetchInterval={5 * 60} // Rafraîchir la session toutes les 5 minutes
      refetchOnWindowFocus={false} // Désactiver pour éviter les erreurs en boucle
      basePath="/api/auth" // Forcer le chemin de base
    >
      {children}
    </SessionProvider>
  )
} 