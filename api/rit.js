const { sql } = require("./_db");

// GET  /api/rit?busId=bus1
//   -> { rit: {...} | null, passengerCount: number }
// POST /api/rit  { action: "start", busId, ritNumber, direction }
//   -> { rit: {...} }
// POST /api/rit  { action: "end", busId }
//   -> { ok: true }
// POST /api/rit  { action: "set_direction", busId, direction }
//   -> { rit: {...} }
module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const busId = req.query.busId;
      if (!busId) return res.status(400).json({ error: "busId wajib diisi" });

      const rits = await sql`
        SELECT * FROM bus_rits
        WHERE bus_id = ${busId} AND ended_at IS NULL
        LIMIT 1
      `;
      const rit = rits[0] || null;

      let passengerCount = 0;
      if (rit) {
        const rows = await sql`
          SELECT
            COALESCE(SUM(CASE WHEN action = 'naik' THEN count ELSE -count END), 0) AS total
          FROM passenger_events
          WHERE rit_id = ${rit.id} AND deleted_at IS NULL
        `;
        passengerCount = Number(rows[0].total);
      }

      return res.status(200).json({ rit, passengerCount });
    }

    if (req.method === "POST") {
      const { action, busId } = req.body;
      if (!busId) return res.status(400).json({ error: "busId wajib diisi" });

      if (action === "start") {
        const { ritNumber, direction } = req.body;
        if (!ritNumber || !direction) {
          return res.status(400).json({ error: "ritNumber dan direction wajib diisi" });
        }

        // Tutup rit aktif sebelumnya (kalau ada) sebelum buka yang baru --
        // jaga-jaga kalau kru lupa tekan "Selesai rit" sebelumnya.
        await sql`
          UPDATE bus_rits SET ended_at = now()
          WHERE bus_id = ${busId} AND ended_at IS NULL
        `;

        const rows = await sql`
          INSERT INTO bus_rits (bus_id, rit_number, direction)
          VALUES (${busId}, ${ritNumber}, ${direction})
          RETURNING *
        `;
        return res.status(200).json({ rit: rows[0] });
      }

      if (action === "end") {
        await sql`
          UPDATE bus_rits SET ended_at = now()
          WHERE bus_id = ${busId} AND ended_at IS NULL
        `;
        return res.status(200).json({ ok: true });
      }

      if (action === "set_direction") {
        const { direction } = req.body;
        if (!["to_pakem", "to_adisutjipto"].includes(direction)) {
          return res.status(400).json({ error: "direction harus 'to_pakem' atau 'to_adisutjipto'" });
        }
        const rows = await sql`
          UPDATE bus_rits SET direction = ${direction}
          WHERE bus_id = ${busId} AND ended_at IS NULL
          RETURNING *
        `;
        if (!rows[0]) return res.status(400).json({ error: "Tidak ada rit aktif untuk bus ini" });
        return res.status(200).json({ rit: rows[0] });
      }

      return res.status(400).json({ error: "action harus 'start', 'end', atau 'set_direction'" });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method tidak didukung" });
  } catch (err) {
    console.error("Error di /api/rit:", err);
    return res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
};
