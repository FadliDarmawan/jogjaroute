const { sql } = require("./_db");

// GET  /api/location
//   -> { bus1: {lat,lng,heading,speed,updatedAt,isActive,direction,ritNumber,passengerCount} | undefined, bus2: {...} }
//   direction/ritNumber/passengerCount ikut null kalau bus itu lagi tidak
//   ada rit aktif -- dipakai popup info bus di index.html.
// POST /api/location  { busId, lat, lng, heading, speed }
//   -> normal ping SAAT GPS aktif -- otomatis set isActive = true
// POST /api/location  { busId, active: false }
//   -> dipanggil saat kru tekan "Nonaktifkan GPS" -- HANYA ubah isActive,
//      lat/lng/heading/speed terakhir dibiarkan apa adanya (posisi
//      terakhir sebelum GPS dimatikan, bukan dihapus)
module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT
          bl.*,
          r.direction,
          r.rit_number,
          CASE WHEN r.id IS NULL THEN NULL ELSE COALESCE((
            SELECT SUM(CASE WHEN e.action = 'naik' THEN e.count ELSE -e.count END)
            FROM passenger_events e
            WHERE e.rit_id = r.id AND e.deleted_at IS NULL
          ), 0) END AS passenger_count
        FROM bus_locations bl
        LEFT JOIN bus_rits r ON r.bus_id = bl.bus_id AND r.ended_at IS NULL
      `;
      const result = {};
      for (const row of rows) {
        result[row.bus_id] = {
          lat: row.lat,
          lng: row.lng,
          heading: row.heading,
          speed: row.speed,
          isActive: row.is_active,
          updatedAt: new Date(row.updated_at).getTime(),
          direction: row.direction, // 'to_pakem' | 'to_adisutjipto' | null (belum ada rit aktif)
          ritNumber: row.rit_number,
          passengerCount: row.passenger_count == null ? null : Number(row.passenger_count),
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
