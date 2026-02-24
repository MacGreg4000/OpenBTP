'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function DynamicManifest() {
  const pathname = usePathname()

  useEffect(() => {
    let manifestHref: string

    if (pathname?.startsWith('/public/portail')) {
      // Portail ouvrier/sous-traitant : start_url = URL actuelle pour "Ajouter à l'écran d'accueil"
      const startUrl = pathname + (typeof window !== 'undefined' && window.location.search ? window.location.search : '')
      manifestHref = `/api/manifest-portail?start_url=${encodeURIComponent(startUrl)}`
    } else if (pathname?.startsWith('/mobile')) {
      manifestHref = '/manifest-mobile.json'
    } else {
      manifestHref = '/manifest.json'
    }

    const existingLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    if (existingLink) {
      existingLink.href = manifestHref
    } else {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = manifestHref
      document.head.appendChild(link)
    }
  }, [pathname])

  return null
}

