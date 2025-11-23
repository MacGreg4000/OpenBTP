'use client'

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { useEffect } from 'react'

export default function SessionProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  useEffect(() => {
    // Intercepter les erreurs NextAuth et rediriger vers login au lieu de reset-password
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('CLIENT_FETCH_ERROR') || 
          event.message?.includes('Load failed') ||
          event.message?.includes('/api/auth/session')) {
        console.error('❌ [NextAuth] Erreur de session détectée, redirection vers login')
        // Empêcher la redirection vers reset-password
        event.preventDefault()
        // Rediriger vers login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  return (
    <NextAuthSessionProvider
      refetchInterval={5 * 60} // Rafraîchir la session toutes les 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </NextAuthSessionProvider>
  )
} 