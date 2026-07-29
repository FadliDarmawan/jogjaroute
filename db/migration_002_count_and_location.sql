-- Jalankan ini SEKALI kalau database kamu sudah pernah menjalankan
-- schema.sql versi sebelumnya (yang belum punya kolom count/lat/lng di
-- passenger_events). Aman dijalankan berkali-kali (IF NOT EXISTS).

ALTER TABLE passenger_events ADD COLUMN IF NOT EXISTS count INT NOT NULL DEFAULT 1;
ALTER TABLE passenger_events ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE passenger_events ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Constraint count > 0 ditambah terpisah supaya baris lama (semuanya count=1
-- dari DEFAULT di atas) tidak bikin migrasi gagal kalau constraint dicek
-- lebih dulu daripada default value ke-apply.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'passenger_events_count_check'
  ) THEN
    ALTER TABLE passenger_events ADD CONSTRAINT passenger_events_count_check CHECK (count > 0);
  END IF;
END $$;
