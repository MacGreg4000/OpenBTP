// Service Worker pour PWA - Méthode officielle Next.js
const CACHE_NAME = 'openbtp-v1'
const urlsToCache = [
  '/',
  '/mobile',
  '/manifest.json',
]

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache ouvert')
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors du cache', error)
      })
  )
})

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Stratégie de cache: Network First avec fallback sur le cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Vérifier si la réponse est valide
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        // Cloner la réponse
        const responseToCache = response.clone()

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache)
          })

        return response
      })
      .catch(() => {
        // Si le réseau échoue, utiliser le cache
        return caches.match(event.request)
      })
  )
})

