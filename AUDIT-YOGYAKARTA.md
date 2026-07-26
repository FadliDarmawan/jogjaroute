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

## ✅ UPDATE — SiBulan sudah beres

Sudah dikasih data terminus dari kamu, jadi ini sekarang WIRED IN:

- **SIBULAN1**: 2 stop baru (`Pasar Godean`, `Kantor Dishub Sleman`)
  ditambahkan ke `stops.json`. Titik awal geometrinya (`--start`) dicek dan
  cocok persis ke koordinat "Kantor Dishub Sleman" yang kamu kasih
  (selisih ~5m) — dikonfirmasi lewat `build-route-shapes.js`, bukan cuma
  dipercaya mentah-mentah. 2/2 stop matched.
- **SIBULAN2**: 74 stop rute 14 ditag ulang jadi juga melayani `SIBULAN2`
  (setelah dicek dulu titik awal geometrinya SIBULAN2 memang cocok persis
  ke "Bandara Adisujtipto", terminus rute 14 — jadi klaim "sama kaya halte
  14" itu diverifikasi, bukan cuma diterima gitu aja). 74/74 stop matched.
  `is_departure_hub` juga dicontek dari cara rute 14 nandain dirinya
  sendiri (true di Bandara Adisujtipto, false di Terminal Pakem).
- Timetable fixed (`06:00, 07:00, 13:00, 14:00, 15:00, 15:30`) ditempel di
  2 terminus SIBULAN2 (`departures` field, bukan di `ROUTE_META`).
- Jendela operasional tentatif SIBULAN1 (`06:00-07:00`, `14:00-15:00`) dan
  jam ringkas SIBULAN2 masuk ke `ROUTE_META[id].schedule.hours`.
- **Dimming baseline sudah diimplementasi beneran** (bukan cuma dijanjikan
  kemarin) — `isRouteActiveToday(id)` baca `ROUTE_META[id].schedule.type`,
  dan default tampilan peta (bukan cuma pas di-klik/di-hover) sekarang
  ngikut: SIBULAN1/SIBULAN2 otomatis dim di akhir pekan, rute lain gak
  kesentuh. Ini nyentuh 3 titik: paint awal layer `route-line`, sama reset
  branch di `setRouteDimming()` dan `setRouteOverview()`.

## ✅ UPDATE — timetable & jam operasional sekarang tampil di UI

Sebelumnya datanya ada tapi gak ada satupun tempat yang nampilin. Sekarang:

- **Panel detail rute** (`#route-detail-title`) nampilin `schedule.hours`
  dari `ROUTE_META` di bawah judul rute — otomatis kepake buat rute
  manapun yang punya field ini (nanti kalau Trans Jogja diisi 05:30-20:30,
  ini juga langsung kepake, gak perlu kerjaan tambahan).
- **Popup halte** nampilin timetable asli (`departures`) buat 2 stop yang
  punya field itu (Bandara Adisujtipto & Terminal Pakem, keduanya SIBULAN2).
  Halte lain yang gak punya `departures` ya popup-nya biasa aja.

### 🐛 Bug yang ketemu & dibenerin di sesi ini (bukan dari kamu — dariku)
Pas nelusurin kode buat nempelin timetable, ketemu `showPopup()` masih
manggil `isFd3ActiveWeekend()` — fungsi yang **udah aku hapus sendiri**
minggu lalu pas beresin logic FD3. Ini bakal bikin **setiap klik halte
error (ReferenceError), popup gak pernah muncul**. `node --check` yang aku
andalkan waktu itu cuma ngecek sintaks, bukan referensi runtime, jadi lolos
diam-diam. Sudah dibenerin + di-sweep ulang total, gak ada sisa panggilan
ke fungsi FD3 yang udah dihapus. **Pelajaran buat aku sendiri**: abis
hapus fungsi, harus grep nama fungsinya di seluruh file, bukan cuma
percaya syntax checker.

### Data yang belum ada tempat tampilnya (belum diminta, jadi belum dibikin)
- `schedule.hours` SIBULAN1 (jendela tentatif) dan Trans Jogja belum keisi
  beneran — placeholder kosong sampai kamu kasih jam Trans Jogja yang
  dijanjikan kemarin.

### `ROUTE_DIRECTIONS` — SAMA SEKALI BELUM DIISI buat Yogyakarta
Ini yang paling penting kamu tau. Tabel ini nge-drive tombol "tujuan" tiap
stop (leg "berangkat" vs "pulang") — dan sebelumnya isinya **100% ID rute
Surabaya** (`R5`, `FD2`, `FD3`, dst). Aku hapus semuanya karena gak ada satu
pun yang cocok ke Yogyakarta — tapi aku **belum isi ulang** buat 19 rute
Trans Jogja (atau SiBulan), dan ini bukan pekerjaan kosmetik kayak judul/warna:

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

## ✅ UPDATE — 4 request terbaru

1. **Jam operasional Trans Jogja** — `schedule.hours: ["05:30-20:30"]`
   ditambahin ke 20 rute (bukan 19 — sempat salah hitung di laporan
   sebelumnya, ternyata Trans Jogja-nya 20 rute, SiBulan 2, total 22).
   Otomatis muncul di panel detail rute (fitur yang udah dibangun sesi
   sebelumnya).
2. **Zoom map** — masih `center: [112.7521, -7.2575]` (Surabaya) sejak awal
   fork, kelewat waktu ganti data. Dibenerin ke `[110.390, -7.786]`, dihitung
   dari bounding box asli semua stop di `stops.json` (bukan tebak-tebakan),
   zoom 10.3.
3. **Warna judul "Yogyakarta"** — diganti `#F2B705` (kuning keemasan),
   bukan kuning murni `#FFFF00` — kuning murni nyaris gak kebaca di
   background terang sheet-nya. Ganti manual di CSS `#mobile-sheet-title`
   kalau maunya beda.
4. **Filter operator (SiBulan / Trans Jogja / ...)** — dibangun generik:
   chip filter di-derive dari field `agency` di `ROUTE_META`, bukan
   hardcode daftar operator. Nambah KSPN atau Trans Gadjah Mada nanti
   cukup kasih `agency: "KSPN"` dst di entri rutenya masing-masing — chip
   baru otomatis muncul, gak perlu ubah kode filter. Muncul di rail
   desktop (cuma pas expanded — versi collapsed kesempitan buat teks) dan
   di mobile sheet (state "full"). Sengaja gak bisa di-filter sampai nol
   operator (minimal 1 tetap aktif) biar gak keliatan "rusak".

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
