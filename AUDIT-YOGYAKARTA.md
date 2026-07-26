# Status fork Yogyakarta — baca sebelum lanjut pegang project ini

"Same format as Surabaya" ternyata cuma bener buat sebagian data. Ini laporan
lengkapnya: apa yang beres, apa yang aku isi provisional (tandai dulu, jangan
anggap final), dan apa yang **beneran gak bisa aku lanjutin** tanpa data
tambahan darimu.

## ✅ Beres dan terverifikasi — 19 rute Trans Jogja

Dari 21 file rute yang kamu kirim, **19 sekarang valid dan siap pakai**:

- **7 file** (`13, 14, 15, 2A, 3A, 5B, L1`) sudah pernah diproses
  `build-route-shapes.js` sebelumnya — aku cross-check ulang, semua stop-nya
  cocok 100% dengan `stops/stops.json` yang baru kamu kirim (gak ada yang
  hilang atau nyasar).
- **12 file** (`10, 11, 12, 1A, 1B, 2B, 3B, 4A, 4B, 5A, 6, 8, 9`) masih format
  ekspor mentah lama (`license/description/zoom/data`) — aku jalanin
  `build-route-shapes.js` di semuanya, semua closed-loop valid, semua stop
  ke-assign. 3 stop jaraknya agak jauh dari garis rute (>300m) — kemungkinan
  cuma haltenya emang mundur dari jalan utama, tapi **cek manual**:
  - Rute 4B: "Galeria Mall" (482m), "Superindo Urip Sumoharjo" (593m)
  - Rute 6: "Eks Menara Kopi - A" (309m)
- **Casing filename dibenerin**: file aslinya huruf kecil (`1a.json`), tapi
  `stops.json` pakai huruf besar (`"1A"`). Karena `routeFileFor()` di
  index.html itu case-sensitive exact-match, ini bakal 404 diam-diam kalau
  gak disamain. Semua file rute yang kena aku rename ke huruf besar.
- `ROUTE_META`/`ROUTE_IDS` di index.html sudah aku ganti total dari data
  Surabaya ke 19 rute ini.

### ⚠️ Provisional — perlu kamu konfirmasi
- **Warna** rute `5B, 13, 15, L1` — file sumbernya gak punya warna asli
  (masih warna default biru Google My Maps atau kosong), jadi aku pilihin
  warna yang beda-beda biar kebaca di peta. Ganti kalau ada warna resmi.
- **Judul rute 13** — sumber-sumber di internet nyebut ini "Ngabean – Pasar
  Belut Godean", tapi data GPS asli kamu terminusnya nongkrong di **"Stadion
  TGP"**, bukan Ngabean. Aku pakai nama dari data asli (lebih bisa
  dipercaya daripada blog), tapi worth dicek — bisa jadi memang itu nama
  resmi terminalnya, atau bisa jadi rutenya sudah berubah dari yang
  dideskripsikan di web.

## 🚫 BLOKIR — gak aku lanjutin, butuh data darimu

### 1. SiBulan1 & SiBulan2 — dipindah ke `_blocked (butuh data lagi)/`
`stops/stops.json` yang kamu kirim **sama sekali gak punya entri stop untuk
SiBulan** — bukan cuma belum ada `departures` (timetable), tapi stop-nya
sendiri belum terdaftar sebagai dilayani rute ini. `build-route-shapes.js`
butuh minimal 1 stop yang nge-tag `"route": "SIBULAN1"` di stops.json buat
bisa jalan sama sekali — tanpa itu dia langsung gagal ("No stops... reference
route X").

Aku sempat coba tebak dari alamat di file mentahnya ("TJ Bandara Adisucipto"
buat SiBulan2, area Tridadi/Sleman buat SiBulan1) — ketemu kandidat
"Bandara Adisujtipto" yang udah ada di stops.json, tapi dia belum di-tag
melayani SIBULAN2. **Aku sengaja gak nebak dan langsung nambahin tag ini
sendiri** — ini data transportasi publik beneran, kalau tebakanku salah,
orang bisa salah naik bus. Yang aku butuh dari kamu:
- Nama + koordinat stop untuk kedua terminus SiBulan1 dan SiBulan2 (2 titik
  masing-masing, karena ini loop/round-trip)
- Kalau salah satu ternyata sama dengan stop yang sudah ada (misal
  "Bandara Adisujtipto"), tinggal konfirmasi itu aja.

Begitu ada, aku tinggal: tag stop-nya di stops.json → jalanin
`build-route-shapes.js` → nambah entri `SIBULAN1`/`SIBULAN2` di `ROUTE_META`
dengan `schedule.type: "weekday-only"` → baru masuk ke bagian dimming/
timetable yang kita diskusiin kemarin.

### 2. `ROUTE_DIRECTIONS` — SAMA SEKALI BELUM DIISI buat Yogyakarta
Ini yang paling penting kamu tau. Tabel ini nge-drive tombol "tujuan" tiap
stop (leg "berangkat" vs "pulang") — dan sebelumnya isinya **100% ID rute
Surabaya** (`R5`, `FD2`, `FD3`, dst). Aku hapus semuanya karena gak ada satu
pun yang cocok ke Yogyakarta — tapi aku **belum isi ulang** buat 19 rute
Trans Jogja, dan ini bukan pekerjaan kosmetik kayak judul/warna:

- Butuh titik **wayback (turnaround)** yang tervalidasi ke geometri asli per
  rute — index.html sendiri punya `validateRouteDirections()` yang bakal
  `console.error` kalau namanya salah eja dikit aja.
- **Topologinya beda-beda per rute**, ini yang bikin aku gak berani nebak:
  aku cek referensi publik, ternyata sebagian koridor (1A, 1B, 2A, 2B, 3A,
  3B, 4A, 4B, 5A, 5B) itu **loop murni** (muter satu arah terus, gak ada
  "pulang" lewat jalan yang sama), sedangkan sebagian lain (6, 8, 9, 10, 11,
  13, 14, 15) itu **end-to-end/dua-arah** yang justru cocok sama model
  start→wayback→end punya Surabaya. Model FD3-style "start/wayback/end"
  Surabaya itu **gak otomatis cocok buat rute yang loop murni** — makan
  konsep "tombol tujuan per arah" itu sendiri.
- Ada juga info yang beda-beda soal rute 1A/1B (ada sumber bilang berubah
  jadi two-way per Februari 2025) — bukan hal yang aman aku putuskan sendiri
  dari cuplikan blog.

**Akibatnya sekarang**: tombol "pilih tujuan" di halte kemungkinan
belum jalan benar untuk rute manapun sampai ini diisi. Peta dan daftar rute
tetap tampil normal (itu gak butuh `ROUTE_DIRECTIONS`), cuma fitur pemilihan
arah/tujuan yang belum punya data.

**Yang aku butuh dari kamu** (per rute, atau minimal buat yang paling sering
dipakai dulu): apakah dia loop atau end-to-end, dan kalau end-to-end, nama
persis stop titik pulang (wayback) sesuai ejaan di `routes/<id>.json`.

## Yang sudah aku rapikan sekalian
- Semua logic FD3 (weekday/weekend file-swap, `FD3_WEEKEND_ONLY_STOPS`,
  `setFd3Preview`, dst) sudah dicabut dari index.html — itu spesifik Surabaya
  dan kalau dibiarin bakal nyoba fetch `routes/fd03.json` tiap load padahal
  filenya gak ada di project ini. Ada komentar penanda di
  `routeFileFor()` buat nanti nyambungin logic dim-on-inactive milik SiBulan.
- `ROUTE_DIRECTIONS`, `ROUTE_WAYPOINTS`, `ROUTE_HUB_LOOPS` — dikosongin
  (sebelumnya isinya 15 entri Surabaya, gak ada satupun ID yang cocok ke
  Yogyakarta). **Sengaja dikosongin, bukan ditebak-tebak** — lihat bagian
  "BLOKIR #2" di atas.
- **Temuan menarik**: `DISPLAY_NAMES` ternyata **udah nyampur** antara nama
  stop Surabaya dan Yogyakarta sebelum aku sentuh — artinya ada yang udah
  mulai kerjain persiapan fork Yogyakarta ini duluan. Aku pertahankan
  bagian Yogyakarta-nya (termasuk 2 komentar aslinya yang berharga: 1B
  sudah pernah dicek spelling "Adisujtipto"-nya ke geometri asli, dan
  "RS Hidayatullah → XT Square" ditandai belum terkonfirmasi). Bagian
  Surabaya-nya aku buang.
- 3 teks yang bocor ke tampilan (bukan cuma di kode internal) sudah
  dibenerin: `<title>`, header sidebar ("Surabaya By Haruno" →
  "Yogyakarta By Haruno" — nama "By Haruno" dipertahankan, cuma kotanya
  yang diganti), dan placeholder search box (contohnya masih nyebut
  "Purabaya, R1").
- Sudah dicek: gak ada kode yang bergantung ke urutan key `ROUTE_META`
  (rawan reorder otomatis buat key angka polos kayak `"10"`,`"13"` dst) —
  `ROUTE_IDS` array eksplisit yang dipakai buat urutan tampil, jadi aman.
- Sintaks JS index.html sudah dicek (`node --check`) — lolos, termasuk
  setelah semua edit di atas.
