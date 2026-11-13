// Service Worker PWA relawan. Scope-nya /relawan/
const NAMA_CACHE = 'sigap-v4';
const DAFTAR_BERKAS = [
  '/relawan/',
  '/relawan/index.html',
  '/relawan/tugas.css',
  '/relawan/js/DaftarTugasController.js',
  '/relawan/js/HalamanDaftarTugas.js',
  '/relawan/js/PenyimpananLokal.js',
  '/relawan/laporan.html',
  '/relawan/laporan.css',
  '/relawan/js/FormLaporanBuktiKerja.js',
  '/relawan/js/UploadLaporanController.js',
  '/relawan/js/DialogTandaiKeliru.js',
  '/relawan/js/DeteksiKeliruController.js',
  '/relawan/login.html',
  '/relawan/login.css',
  '/relawan/js/HalamanLogin.js',
  '/relawan/js/AutentikasiController.js',
  '/relawan/manifest.json',
  '/sigap.css',
  '/vendor/inter/inter-latin-wght-normal.woff2',
  '/gambar/logo-sigap.png',
  '/gambar/latar-login.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(NAMA_CACHE).then((cache) => cache.addAll(DAFTAR_BERKAS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((semua) =>
      Promise.all(semua.filter((nama) => nama !== NAMA_CACHE).map((nama) => caches.delete(nama)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((respons) => {
        if (respons.ok) {
          const salinan = respons.clone();
          caches.open(NAMA_CACHE).then((cache) => cache.put(event.request, salinan));
        }
        return respons;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
