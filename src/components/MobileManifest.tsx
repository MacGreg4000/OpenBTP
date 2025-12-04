'use client'

import { useEffect } from 'react'

export default function MobileManifest() {
  useEffect(() => {
    // Vérifier si le lien manifest existe déjà
    const existingLink = document.querySelector('link[rel="manifest"]')
    
    if (existingLink) {
      // Remplacer le manifest desktop par le manifest mobile
      existingLink.setAttribute('href', '/manifest-mobile.json')
    } else {
      // Créer un nouveau lien manifest pour mobile
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = '/manifest-mobile.json'
      document.head.appendChild(link)
    }
  }, [])

  return null
}

