const { sql } = require("./_db");

// GET /api/admin-data?days=7 (default 1)
//   -> { rits: [...terbaru dulu, dengan totalNaik/totalTurun], events: [...naik+turun, dengan lat/lng] }
//
// Dipakai admin.html. "days" membatasi rentang waktu biar query & payload
// tidak membesar tanpa batas seiring waktu -- sesuaikan default kalau
// butuh histori lebih panjang.
module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method tidak didukung" });
    }

    const days = Number(req.query.days) > 0 ? Number(req.query.days) : 1;

    const rits = await sql`
      SELECT
        r.*,
        COALESCE(SUM(CASE WHEN e.action = 'naik' AND e.deleted_at IS NULL THEN e.count ELSE 0 END), 0) AS total_naik,
        COALESCE(SUM(CASE WHEN e.action = 'turun' AND e.deleted_at IS NULL THEN e.count ELSE 0 END), 0) AS total_turun
      FROM bus_rits r
      LEFT JOIN passenger_events e ON e.rit_id = r.id
      WHERE r.started_at >= now() - (${days} || ' days')::interval
      GROUP BY r.id
      ORDER BY r.started_at DESC
    `;

    const events = await sql`
      SELECT e.*, r.bus_id, r.rit_number, r.direction
      FROM passenger_events e
      JOIN bus_rits r ON r.id = e.rit_id
      WHERE e.deleted_at IS NULL AND e.created_at >= now() - (${days} || ' days')::interval
        AND e.lat IS NOT NULL AND e.lng IS NOT NULL
      ORDER BY e.created_at DESC
      LIMIT 2000
    `;

    return res.status(200).json({ rits, events });
  } catch (err) {
    console.error("Error di /api/admin-data:", err);
    return res.status(500).json({ error: "Terjadi kesalahan di server" });
  }
};
