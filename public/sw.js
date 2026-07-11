const CACHE_NAME = 'mesa-ayuda-v2'; // ← sube este número cada vez que cambies este archivo
const urlsToCache = [
  '/',
  '/css/main.css',
  '/css/usuarios.css',
  '/css/fonts.css',
  '/css/font-awesome.min.css',
  '/js/main.js',
  '/js/notificaciones.js',
  '/js/chart.umd.min.js',
  '/img/logo.jpeg'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // activa el SW nuevo de inmediato, sin esperar a cerrar pestañas
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // borra caches de versiones viejas
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim()) // toma control de las pestañas ya abiertas
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo interceptamos GET. POST/PUT/DELETE (formularios, acciones) pasan directo.
  if (event.request.method !== 'GET') {
    return;
  }

  // No interceptar el stream SSE: es una conexión de larga duración,
  // no debe pasar por el Service Worker.
  if (url.pathname === '/notificaciones/stream') {
    return;
  }

  // No interceptar navegaciones (carga de páginas HTML: /, /usuarios, /dashboard, etc).
  // Estas peticiones llegan con redirect:"manual", y si el servidor redirige
  // (ej. / -> /login), fetch(event.request) devuelve una respuesta opaca de
  // redirect que el navegador rechaza al pasarla a respondWith(). Dejamos que
  // el navegador las maneje directo, así los redirects del servidor funcionan
  // siempre y la página nunca queda "pegada" a una versión vieja cacheada.
  if (event.request.mode === 'navigate') {
    return;
  }

  // Para el resto (CSS, JS, imágenes): cache-first, con fallback a red.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});