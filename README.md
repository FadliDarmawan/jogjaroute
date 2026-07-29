# Bus tracker backend + halaman driver, buat digabung ke repo jogjaroute

Ini SEMUA ditaruh langsung di dalam repo `jogjaroute` yang sudah ada (bukan
repo terpisah kayak `sibulan-tracker-bot` yang lama) -- karena sekarang
sumber datanya browser driver + database, bukan bot Baileys yang butuh
proses long-running terpisah. Bot Baileys/Railway sudah bisa dipensiunkan
setelah ini jalan.

## Cara pasang

1. Copy folder `api/`, `db/`, `tools/build-sibulan2-directions.js`, file
   `driver.html`, dan `package.json` ke root repo `jogjaroute`-mu.
   - Kalau `jogjaroute` sudah punya `package.json` dari sesi sebelumnya
     (dari update bot Baileys), JANGAN ditimpa -- gabungkan isi
     `dependencies`-nya secara manual saja.
2. Jalankan `db/schema.sql` sekali di database Neon yang sama dengan Haruno
   Task Manager (lewat Neon SQL editor, atau `psql $DATABASE_URL -f db/schema.sql`).
   Tabel-tabel barunya (`bus_rits`, `passenger_events`, `bus_locations`)
   terpisah total dari tabel Task Manager, aman digabung di database yang
   sama.
3. Di Vercel dashboard (project jogjaroute), tambah env var `DATABASE_URL`
   -- isi persis connection string Neon yang sama.
4. `npm install` lokal dulu buat mastiin `@neondatabase/serverless` ke-lock
   di `package-lock.json`, baru commit & push.
5. Vercel otomatis detect folder `api/` sebagai serverless functions --
   tidak perlu config tambahan (`vercel.json`) untuk ini.

## Yang sudah bisa dipakai

- **`/api/location`** -- GET (baca posisi semua bus, format PERSIS sama
  dengan endpoint bot Baileys yang lama, jadi `pollBusLocations()` di
  `index.html` tidak perlu diubah) dan POST (driver kirim posisi).
- **`/api/rit`** -- mulai/selesai rit per bus.
- **`/api/passenger`** -- catat & koreksi kejadian naik/turun.
- **`driver.html`** -- halaman yang dibuka kru di HP, akses lewat
  `driver.html?bus=bus1` atau `driver.html?bus=bus2`.

## Yang BELUM ada -- penting sebelum dipakai beneran di lapangan

- **Tidak ada autentikasi.** Siapa saja yang tahu URL `driver.html?bus=bus1`
  bisa buka dan catat data mengatasnamakan bus itu. Untuk testing internal
  ini oke, tapi sebelum dipakai kru beneran, perlu ditambah token/PIN
  sederhana (misal `?bus=bus1&token=xxxxx`, dicek di semua endpoint POST).
- **"Posisi sekarang" belum otomatis nunjuk nama halte.** Percobaan
  deteksi arah otomatis dari geometri rute ternyata tidak reliable (lihat
  percakapan sebelumnya + komentar di `tools/build-sibulan2-directions.js`)
  karena jalur berangkat & pulang SiBulan 2 banyak yang tumpang tindih di
  data GPS-nya. `driver.html` untuk sekarang cuma nampilin koordinat mentah
  sebagai indikator GPS jalan. Begitu file urutan halte manual (yang kamu
  siapkan, format sama seperti jalur 14) sudah ada, kasih tau -- tinggal
  disambung ke `lastStopName` di `driver.html`, tidak perlu ubah bagian
  lain.
- **Icon bus di peta (`index.html`) belum disambung ulang.** Sebelumnya
  sempat disambung ke bot Baileys (`BUS_API_URL` menunjuk ke Railway) --
  sekarang tinggal diarahkan ke `/api/location` di domain sendiri (same
  origin, jadi `BUS_API_URL` bisa jadi path relatif `/api/location`, dan
  header CORS yang tadinya wajib buat Railway tidak dibutuhkan lagi).

## Struktur data (lihat db/schema.sql untuk detail lengkap)

- `bus_rits` -- 1 rit = 1 baris, `ended_at IS NULL` berarti rit itu masih
  aktif. Maksimal 1 rit aktif per bus (dijaga lewat unique index).
- `passenger_events` -- 1 kejadian naik/turun = 1 baris, append-only.
  Koreksi dilakukan lewat `deleted_at` (soft delete), bukan mengubah baris
  lama, supaya jejak asli tetap ada.
- `bus_locations` -- cuma posisi TERAKHIR tiap bus (1 baris per bus), bukan
  histori penuh.
