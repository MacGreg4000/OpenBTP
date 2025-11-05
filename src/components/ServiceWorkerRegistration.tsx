'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // Enregistrer le service worker en production
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker enregistré avec succès:', registration.scope)
          })
          .catch((error) => {
            console.error('Erreur lors de l\'enregistrement du Service Worker:', error)
          })
      }
    }
  }, [])

  return null
}

