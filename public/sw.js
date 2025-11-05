// Service Worker pour PWA - Méthode officielle Next.js avec support hors ligne
const CACHE_NAME = 'openbtp-v2'
const STATIC_CACHE = 'openbtp-static-v2'
const DYNAMIC_CACHE = 'openbtp-dynamic-v2'

// URLs à cacher au démarrage (ressources critiques)
const urlsToCache = [
  '/',
  '/mobile',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-192.png',
  '/favicon-512.png',
]

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation du Service Worker')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cache statique ouvert')
        // Ne pas bloquer l'installation si certaines URLs échouent
        return cache.addAll(urlsToCache).catch((error) => {
          console.warn('[SW] Certaines ressources n\'ont pas pu être mises en cache:', error)
        })
      })
      .then(() => {
        // Activer le service worker immédiatement
        return self.skipWaiting()
      })
  )
})

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation du Service Worker')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression de l\'ancien cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Prendre le contrôle de toutes les pages
      return self.clients.claim()
    })
  )
})

// Stratégie de cache améliorée
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return
  }

  // Ignorer les requêtes vers l'API (toujours en ligne)
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Stratégie pour les pages HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Essayer le réseau, avec fallback sur le cache
          return fetch(request)
            .then((networkResponse) => {
              // Mettre à jour le cache si la réponse est valide
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone()
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, responseToCache)
                })
              }
              return networkResponse
            })
            .catch(() => {
              // Si hors ligne et qu'on a une version en cache, l'utiliser
              if (cachedResponse) {
                return cachedResponse
              }
              // Sinon, retourner une page d'erreur hors ligne basique
              return new Response(
                '<!DOCTYPE html><html><head><title>Hors ligne</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>Hors ligne</h1><p>Cette page n\'est pas disponible hors ligne.</p><p><a href="/mobile">Retour à l\'accueil</a></p></body></html>',
                {
                  headers: { 'Content-Type': 'text/html' },
                  status: 200,
                }
              )
            })
        })
    )
    return
  }

  // Stratégie Cache First pour les ressources statiques (JS, CSS, images, fonts)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/favicon')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone()
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, responseToCache)
                })
              }
              return networkResponse
            })
            .catch(() => {
              // Si on est hors ligne et qu'on n'a pas la ressource, retourner une réponse vide
              return new Response('', { status: 408 })
            })
        })
    )
    return
  }

  // Stratégie Network First pour les autres ressources (avec cache dynamique)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('Ressource non disponible hors ligne', { status: 408 })
        })
      })
  )
})

