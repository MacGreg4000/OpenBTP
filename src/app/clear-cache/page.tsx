'use client'

import { useEffect, useState } from 'react'

export default function ClearCachePage() {
  const [status, setStatus] = useState('Nettoyage en cours...')

  useEffect(() => {
    const clearCache = async () => {
      try {
        // Désinstaller tous les service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const registration of registrations) {
            await registration.unregister()
            console.log('Service Worker désenregistré')
          }
        }

        // Vider tous les caches
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
          console.log('Caches vidés')
        }

        // Nettoyer le localStorage et sessionStorage
        localStorage.clear()
        sessionStorage.clear()

        setStatus('Cache nettoyé ! Redirection vers la page de connexion...')
        
        // Rediriger après 2 secondes
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)

      } catch (error) {
        console.error('Erreur lors du nettoyage:', error)
        setStatus('Erreur lors du nettoyage. Redirection...')
        setTimeout(() => {
          window.location.href = '/login'
        }, 3000)
      }
    }

    clearCache()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Nettoyage du cache</h1>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  )
} 