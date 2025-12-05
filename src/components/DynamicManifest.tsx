'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function DynamicManifest() {
  const pathname = usePathname()

  useEffect(() => {
    // Déterminer quel manifest utiliser selon l'URL
    const isMobilePath = pathname?.startsWith('/mobile')
    const manifestHref = isMobilePath ? '/manifest-mobile.json' : '/manifest.json'
    
    // Vérifier si le lien manifest existe déjà
    let existingLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    
    if (existingLink) {
      // Mettre à jour le manifest existant
      existingLink.href = manifestHref
    } else {
      // Créer un nouveau lien manifest
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = manifestHref
      document.head.appendChild(link)
    }
  }, [pathname])

  return null
}

