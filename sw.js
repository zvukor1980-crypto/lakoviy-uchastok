// Service worker «Лаковый участок»: полная офлайн-работа после первой загрузки
const CACHE = 'lakoviy-aa43883936';
const FILES = ["./", "./assets/facade/facade_1.webp", "./assets/facade/facade_2.webp", "./assets/facade/facade_3.webp", "./assets/facade/facade_4.webp", "./assets/facade/facade_5.webp", "./assets/facade/facade_6.webp", "./assets/rooms/academy_a.webp", "./assets/rooms/academy_b.webp", "./assets/rooms/archive_a.webp", "./assets/rooms/archive_b.webp", "./assets/rooms/armory_a.webp", "./assets/rooms/armory_b.webp", "./assets/rooms/cells_a.webp", "./assets/rooms/cells_b.webp", "./assets/rooms/chief_a.webp", "./assets/rooms/chief_b.webp", "./assets/rooms/command_a.webp", "./assets/rooms/command_b.webp", "./assets/rooms/comms_a.webp", "./assets/rooms/comms_b.webp", "./assets/rooms/detective_a.webp", "./assets/rooms/detective_b.webp", "./assets/rooms/dispatch_a.webp", "./assets/rooms/dispatch_b.webp", "./assets/rooms/garage_a.webp", "./assets/rooms/garage_b.webp", "./assets/rooms/hospital_a.webp", "./assets/rooms/hospital_b.webp", "./assets/rooms/interrogation_a.webp", "./assets/rooms/interrogation_b.webp", "./assets/rooms/k9_a.webp", "./assets/rooms/k9_b.webp", "./assets/rooms/lab_a.webp", "./assets/rooms/lab_b.webp", "./assets/rooms/lounge_a.webp", "./assets/rooms/lounge_b.webp", "./assets/rooms/patrol_a.webp", "./assets/rooms/patrol_b.webp", "./assets/rooms/reception_a.webp", "./assets/rooms/reception_b.webp", "./assets/rooms/research_a.webp", "./assets/rooms/research_b.webp", "./assets/rooms/training_a.webp", "./assets/rooms/training_b.webp", "./assets/rooms/warehouse_a.webp", "./assets/rooms/warehouse_b.webp", "./css/style.css", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./index.html", "./js/audio.js", "./js/data.js", "./js/figures.js", "./js/icons.js", "./js/main.js", "./js/state.js", "./js/station.js", "./js/ui.js", "./manifest.webmanifest"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('lakoviy-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
