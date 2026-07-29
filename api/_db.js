// Helper koneksi database, dipakai bareng oleh semua endpoint di folder ini.
// Pakai @neondatabase/serverless karena didesain buat lingkungan serverless
// (Vercel Functions) -- koneksinya HTTP-based, bukan long-lived TCP pool
// biasa, jadi cocok buat function yang idup-mati tiap request.
const { neon } = require("@neondatabase/serverless");

// Set DATABASE_URL di Vercel env vars -- sama persis dengan connection
// string Neon yang dipakai Haruno Task Manager, tabelnya beda jadi aman
// dipakai bareng.
const sql = neon(process.env.DATABASE_URL);

module.exports = { sql };
