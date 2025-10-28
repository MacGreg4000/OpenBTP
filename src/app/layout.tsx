import './globals.css'
import '../styles/react-select.css'
import '../styles/mobile-keyboard.css'
// imports inutilisés supprimés

export const metadata = {
  title: 'OpenBTP',
  description: 'Application de gestion de chantiers',
  // Empêcher la mise en cache PWA
  appleWebApp: {
    capable: false,
  },
  manifest: undefined,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
  },
}

import RootClientProviders from '@/components/providers/RootClientProviders'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head></head>
      <body suppressHydrationWarning>
        <RootClientProviders>
          {children}
        </RootClientProviders>
      </body>
    </html>
  )
}
