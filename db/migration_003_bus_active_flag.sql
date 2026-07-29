-- Jalankan ini SEKALI kalau database kamu sudah pernah menjalankan
-- schema.sql/migration sebelumnya (yang belum punya kolom is_active di
-- bus_locations). Aman dijalankan berkali-kali.

ALTER TABLE bus_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;
