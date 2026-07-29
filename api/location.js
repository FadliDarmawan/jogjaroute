const { sql } = require("./_db");

// GET  /api/location
//   -> { bus1: {lat,lng,heading,speed,updatedAt,isActive} | undefined, bus2: {...} }
// POST /api/location  { busId, lat, lng, heading, speed }
//   -> normal ping SAAT GPS aktif -- otomatis set isActive = true
// POST /api/location  { busId, active: false }
//   -> dipanggil saat kru tekan "Nonaktifkan GPS" -- HANYA ubah isActive,
//      lat/lng/heading/speed terakhir dibiarkan apa adanya (posisi
//      terakhir sebelum GPS dimatikan, bukan dihapus)
module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT * FROM bus_locations`;
      const result = {};
      for (const row of rows) {
        result[row.bus_id] = {
          lat: row.lat,
          lng: row.lng,
          heading: row.heading,
          speed: row.speed,
          isActive: row.is_active,
          updatedAt: new Date(row.updated_at).getTime(),
        };
      }
      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const { busId, lat, lng, heading, speed, active } = req.body;
      if (!busId) return res.status(400).json({ error: "busId wajib diisi" });

      // Kasus "Nonaktifkan GPS": cuma matiin flag, tidak menyentuh posisi.
      if (active === false) {
        await sql`
          UPDATE bus_locations SET is_active = false, updated_at = now()
          WHERE bus_id = ${busId}
        `;
        return res.status(200).json({ ok: true });
      }

      // Kasus normal: ping posisi selama GPS aktif -- selalu set isActive
      // = true, karena baris ini cuma terkirim selagi watchPosition jalan
      // (lihat driver.html, GPS cuma nyala setelah "Aktivasi GPS" ditekan).
      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ error: "lat, lng wajib diisi (angka)" });
      }

      await sql`
        INSERT INTO bus_locations (bus_id, lat, lng, heading, speed, is_active, updated_at)
        VALUES (${busId}, ${lat}, ${lng}, ${heading ?? null}, ${speed ?? null}, true, now())
        ON CONFLICT (bus_id) DO UPDATE SET
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          heading = EXCLUDED.heading,
          speed = EXCLUDED.speed,
          is_active = true,
          updated_at = now()
      `;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method tidak didukung" });
  } catch (err) {
    console.error("Error di /api/location:", err);
    return res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
};
