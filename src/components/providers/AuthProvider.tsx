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
      if (event.message?.includes('CLIENT_FETCH_ERROR') || 
          event.message?.includes('Load failed') ||
          event.message?.includes('/api/auth/session') ||
          event.message?.includes('reset-password')) {
        console.error('❌ [NextAuth] Erreur de session détectée, redirection vers login')
        // Empêcher la redirection vers reset-password
        event.preventDefault()
        // Rediriger vers login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    // Intercepter les erreurs non gérées
    window.addEventListener('error', handleError)
    
    // Intercepter les promesses rejetées non gérées
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('CLIENT_FETCH_ERROR') ||
          event.reason?.message?.includes('Load failed') ||
          event.reason?.message?.includes('/api/auth/session')) {
        console.error('❌ [NextAuth] Erreur de session (promise rejection), redirection vers login')
        event.preventDefault()
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <SessionProvider
      refetchInterval={5 * 60} // Rafraîchir la session toutes les 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
} 