// Service worker minimal — solo registra para que la PWA sea instalable.
// Cache estratégica se puede añadir en Fase 2.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // pasa al network — sin caching por ahora para evitar datos viejos
});
