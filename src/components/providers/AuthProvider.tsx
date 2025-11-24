'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'

export default function AuthProvider({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Désactiver le refetch automatique sur les pages d'authentification pour éviter les boucles
  const isAuthPage = useMemo(() => {
    return pathname?.includes('/login') || pathname?.includes('/reset-password') || pathname?.includes('/setup')
  }, [pathname])
  useEffect(() => {
    // Ne pas intercepter les erreurs sur la page de login/setup pour éviter les boucles infinies
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    if (currentPath.includes('/login') || currentPath.includes('/reset-password') || currentPath.includes('/setup')) {
      // Sur la page de login/setup, on laisse NextAuth gérer les erreurs normalement
      return
    }

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
        // Rediriger vers login seulement si on n'est pas déjà sur login, reset-password ou setup
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          if (!path.includes('/login') && !path.includes('/reset-password') && !path.includes('/setup')) {
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
          const path = window.location.pathname
          if (!path.includes('/login') && !path.includes('/reset-password') && !path.includes('/setup')) {
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
      const path = window.location.pathname
      if (path === '/reset-password' && lastPath !== '/reset-password') {
        console.log('🔄 [NextAuth] Détection de redirection vers reset-password, correction vers /login')
        window.location.href = '/login'
      }
      lastPath = path
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
      refetchInterval={isAuthPage ? 0 : 5 * 60} // Désactiver le refetch sur les pages d'auth pour éviter les boucles
      refetchOnWindowFocus={false} // Désactiver pour éviter les erreurs en boucle
      basePath="/api/auth" // Forcer le chemin de base
    >
      {children}
    </SessionProvider>
  )
} 