'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import AuthProvider from './AuthProvider'
import ChatSystemProvider from './ChatProvider'
import { FeaturesProvider } from '@/hooks/useFeatures'

export default function RootClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'

  const isPublicPortal = pathname.startsWith('/public/portail') || pathname.startsWith('/public/bon-regie') || pathname.startsWith('/public')
  
  // Pages d'authentification : ne pas utiliser SessionProvider pour éviter les appels à /api/auth/session
  const isAuthPage = pathname === '/login' || pathname === '/reset-password' || pathname === '/setup'

  if (isPublicPortal) {
    return (
      <>
        {children}
        <Toaster position="top-right" />
      </>
    )
  }

  // Sur les pages d'authentification, ne pas utiliser AuthProvider (qui contient SessionProvider)
  // pour éviter les appels à /api/auth/session qui créent des boucles infinies
  if (isAuthPage) {
    return (
      <>
        {children}
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <AuthProvider>
      <FeaturesProvider>
        {children}
        <ChatSystemProvider />
        <Toaster position="top-right" />
      </FeaturesProvider>
    </AuthProvider>
  )
}

