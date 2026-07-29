const { sql } = require("./_db");

// GET  /api/location
//   -> { bus1: {lat,lng,heading,speed,updatedAt} | undefined, bus2: {...} }
//   Format ini sengaja dibuat SAMA seperti endpoint bot Baileys yang lama,
//   supaya pollBusLocations() di index.html tidak perlu diubah sama sekali.
// POST /api/location  { busId, lat, lng, heading, speed }
//   -> { ok: true }
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
          updatedAt: new Date(row.updated_at).getTime(),
        };
      }
      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const { busId, lat, lng, heading, speed } = req.body;
      if (!busId || typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ error: "busId, lat, lng wajib diisi (angka)" });
      }

      await sql`
        INSERT INTO bus_locations (bus_id, lat, lng, heading, speed, updated_at)
        VALUES (${busId}, ${lat}, ${lng}, ${heading ?? null}, ${speed ?? null}, now())
        ON CONFLICT (bus_id) DO UPDATE SET
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          heading = EXCLUDED.heading,
          speed = EXCLUDED.speed,
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
