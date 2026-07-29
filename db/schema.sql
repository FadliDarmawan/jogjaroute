-- Jalankan sekali di database Neon yang sama dengan Haruno Task Manager
-- (bisa pakai Neon SQL editor, atau `psql $DATABASE_URL -f schema.sql`).
-- Tabel-tabel ini dipakai KHUSUS oleh fitur bus tracker, tidak menyentuh
-- tabel Task Manager yang sudah ada.

-- Satu baris = satu rit yang sedang/sudah berjalan untuk satu bus.
CREATE TABLE IF NOT EXISTS bus_rits (
  id SERIAL PRIMARY KEY,
  bus_id TEXT NOT NULL,              -- 'bus1' | 'bus2'
  route_id TEXT NOT NULL DEFAULT 'SiBulan 2',
  rit_number INT NOT NULL,           -- 1, 2, 3, ...
  direction TEXT NOT NULL,           -- 'to_pakem' | 'to_adisutjipto'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ               -- NULL selama rit masih berjalan
);

-- Cuma boleh ada 1 rit aktif (ended_at IS NULL) per bus di satu waktu.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_rit_per_bus
  ON bus_rits (bus_id)
  WHERE ended_at IS NULL;

-- Satu baris = satu kejadian naik/turun. Dibiarkan "append-only" (koreksi
-- lewat soft-delete via deleted_at, bukan UPDATE count), supaya riwayat
-- asli tetap ada untuk audit/debug kalau perlu.
CREATE TABLE IF NOT EXISTS passenger_events (
  id SERIAL PRIMARY KEY,
  rit_id INT NOT NULL REFERENCES bus_rits(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('naik', 'turun')),
  count INT NOT NULL DEFAULT 1 CHECK (count > 0),  -- berapa orang sekaligus (dipilih di driver.html sebelum "Konfirmasi")
  stop_name TEXT,                    -- halte terdekat saat kejadian dicatat
  lat DOUBLE PRECISION,              -- posisi bus saat kejadian dicatat -- dipakai peta visualisasi admin
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ              -- diisi kalau kru koreksi/hapus dari histori
);

CREATE INDEX IF NOT EXISTS passenger_events_rit_idx
  ON passenger_events (rit_id)
  WHERE deleted_at IS NULL;

-- Posisi terakhir tiap bus -- cuma simpan 1 baris per bus (posisi terkini),
-- bukan histori penuh. Kalau nanti butuh histori jejak, tinggal tambah
-- tabel terpisah `bus_location_history`.
CREATE TABLE IF NOT EXISTS bus_locations (
  bus_id TEXT PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT false, -- true = kru sudah tekan "Aktivasi GPS" (bus mulai jalan)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
