import './globals.css'
import '../styles/react-select.css'
import '../styles/mobile-keyboard.css'
// imports inutilisés supprimés

export const metadata = {
  title: 'OpenBTP',
  description: 'Application de gestion de chantiers',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OpenBTP',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

import RootClientProviders from '@/components/providers/RootClientProviders'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import PWAInstall from '@/components/PWAInstall'
import CustomIcons from '@/components/CustomIcons'
import DynamicManifest from '@/components/DynamicManifest'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <CustomIcons />
        <DynamicManifest />
        <RootClientProviders>
          {children}
          <ServiceWorkerRegistration />
          <PWAInstall />
        </RootClientProviders>
      </body>
    </html>
  )
}
