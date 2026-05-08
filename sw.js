const CACHE    = 'aether-v1'
const PRECACHE = [
  '/',
  '/flux',
  '/login',
  '/signup',
  '/css/aether.css',
  '/css/flux.css',
  '/css/temple.css',
  '/css/conciles.css',
  '/css/offrande.css',
  '/lib/supabase.js',
  '/lib/auth.js',
  '/lib/utils.js',
  '/lib/souffles.js',
  '/lib/offrandes.js',
  '/lib/conciles.js',
]

// Installation
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

// Activation — nettoyer anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch — Network First pour les données, Cache First pour les assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Toujours réseau pour Supabase
  if (url.hostname.includes('supabase')) return

  // Cache First pour CSS/JS/fonts
  if (
    e.request.destination === 'style' ||
    e.request.destination === 'script' ||
    e.request.destination === 'font'
  ) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
          return res
        })
      )
    )
    return
  }

  // Network First pour le reste
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})