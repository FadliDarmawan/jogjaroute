const { sql } = require("./_db");

// GET   /api/passenger?busId=bus1
//   -> { events: [...terbaru dulu, masing2 punya count/lat/lng], passengerCount: number }
// POST  /api/passenger  { busId, action: "naik"|"turun", count, stopName, lat, lng }
//   -> { event: {...}, passengerCount: number }
// PATCH /api/passenger  { eventId, action: "delete" }
//   -> { ok: true, passengerCount: number }
module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const busId = req.query.busId;
      if (!busId) return res.status(400).json({ error: "busId wajib diisi" });

      const rits = await sql`
        SELECT id FROM bus_rits
        WHERE bus_id = ${busId} AND ended_at IS NULL
        LIMIT 1
      `;
      if (!rits[0]) return res.status(200).json({ events: [], passengerCount: 0 });
      const ritId = rits[0].id;

      const events = await sql`
        SELECT * FROM passenger_events
        WHERE rit_id = ${ritId} AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 50
      `;
      const passengerCount = events.reduce(
        (sum, e) => sum + (e.action === "naik" ? e.count : -e.count),
        0
      );

      return res.status(200).json({ events, passengerCount });
    }

    if (req.method === "POST") {
      const { busId, action, count, stopName, lat, lng } = req.body;
      if (!busId || !["naik", "turun"].includes(action)) {
        return res.status(400).json({ error: "busId dan action ('naik'/'turun') wajib diisi" });
      }
      const qty = Number.isInteger(count) && count > 0 ? count : 1;

      const rits = await sql`
        SELECT id FROM bus_rits
        WHERE bus_id = ${busId} AND ended_at IS NULL
        LIMIT 1
      `;
      if (!rits[0]) {
        return res.status(400).json({ error: "Belum ada rit aktif untuk bus ini -- mulai rit dulu" });
      }
      const ritId = rits[0].id;

      const rows = await sql`
        INSERT INTO passenger_events (rit_id, action, count, stop_name, lat, lng)
        VALUES (${ritId}, ${action}, ${qty}, ${stopName || null}, ${lat ?? null}, ${lng ?? null})
        RETURNING *
      `;

      const countRows = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN action = 'naik' THEN count ELSE -count END), 0) AS total
        FROM passenger_events
        WHERE rit_id = ${ritId} AND deleted_at IS NULL
      `;

      return res.status(200).json({
        event: rows[0],
        passengerCount: Number(countRows[0].total),
      });
    }

    if (req.method === "PATCH") {
      const { eventId, action } = req.body;
      if (!eventId || action !== "delete") {
        return res.status(400).json({ error: "eventId wajib diisi, action harus 'delete'" });
      }

      const rows = await sql`
        UPDATE passenger_events SET deleted_at = now()
        WHERE id = ${eventId} AND deleted_at IS NULL
        RETURNING rit_id
      `;
      if (!rows[0]) return res.status(404).json({ error: "Kejadian tidak ditemukan" });
      const ritId = rows[0].rit_id;

      const countRows = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN action = 'naik' THEN count ELSE -count END), 0) AS total
        FROM passenger_events
        WHERE rit_id = ${ritId} AND deleted_at IS NULL
      `;

      return res.status(200).json({ ok: true, passengerCount: Number(countRows[0].total) });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method tidak didukung" });
  } catch (err) {
    console.error("Error di /api/passenger:", err);
    return res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
};
