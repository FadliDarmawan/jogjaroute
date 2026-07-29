// Service worker MINIMAL -- tujuan utamanya cuma 2:
// 1. Syarat teknis biar driver.html bisa di-"Add to Home Screen" sebagai
//    app (browser mensyaratkan ada service worker + manifest buat
//    menganggap sebuah halaman "installable").
// 2. Cache app shell biar buka ulang halaman tetap cepat & tetap bisa
//    kebuka meski sinyal sempat putus sebentar.
//
// PENTING -- BATASAN YANG PERLU DIPAHAMI: service worker TIDAK membuat GPS
// terus jalan saat HP dikunci/layar mati atau tab/app ditutup total.
// Browser (apalagi Safari di iPhone) mematikan akses lokasi begitu
// halaman masuk background dalam beberapa saat. Yang benar-benar menjaga
// GPS tetap kirim update adalah layar HP tetap menyala DAN halaman ini
// tetap di depan (foreground) -- itu sebabnya driver.html minta Wake
// Lock (nyalakan terus layar) begitu "Aktivasi GPS" ditekan, bukan
// mengandalkan service worker ini untuk itu.

const CACHE_NAME = "sibulan-driver-v2";
const APP_SHELL = [
  "/driver.html",
  "/manifest.json",
  "/routes/SIBULAN2_stops_ordered.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // API call (/api/..., data live) SELALU ambil dari network, jangan
  // pernah dari cache -- data lokasi/penumpang harus selalu real-time.
  if (event.request.url.includes("/api/")) return;

  // NETWORK-FIRST (bukan cache-first) -- selama online, SELALU ambil
  // versi terbaru dari server dulu. Cache cuma dipakai sebagai fallback
  // kalau network gagal (offline/sinyal putus). Ini penting khususnya
  // untuk driver.html sendiri: dengan cache-first, update kode yang baru
  // di-deploy bisa "ketutup" versi lama yang ke-cache di HP kru, dan baru
  // kepakai 1 kali reload KEMUDIAN -- bikin bingung waktu masih aktif
  // dikembangkan/di-update.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
