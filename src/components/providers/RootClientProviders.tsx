'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import AuthProvider from './AuthProvider'
import ChatSystemProvider from './ChatProvider'
import { FeaturesProvider } from '@/hooks/useFeatures'

export default function RootClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'

  const isPublicPortal = pathname.startsWith('/public/portail') || pathname.startsWith('/public/bon-regie') || pathname.startsWith('/public')

  if (isPublicPortal) {
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

