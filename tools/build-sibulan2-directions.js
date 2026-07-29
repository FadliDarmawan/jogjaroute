// Bikin routes/SIBULAN2_stops_ordered.json: daftar halte SiBulan 2 terurut
// per arah, dipakai halaman /driver buat nentuin "posisi sekarang" yang
// bener sesuai arah rit (bukan cuma halte terdekat garis lurus).
//
// KENAPA SCRIPT TERPISAH, BUKAN DIITUNG DI BROWSER TIAP LOAD: halte SiBulan
// 2 jarang berubah, jadi lebih murah dihitung sekali di sini dan disimpan
// sebagai file statis, daripada proyeksi titik-ke-garis (885 titik x 74
// halte x 2 arah) diulang tiap driver buka halaman.
//
// PENDEKATAN (lihat percakapan sebelumnya buat konteks lengkap): geometri
// SIBULAN2.json itu satu garis PULANG-PERGI penuh (titik awal & akhir
// nyaris sama = Bandara Adisutjipto), bukan satu arah. Jadi:
//   1. Cari "titik wayback" -- titik di garis yang paling deket ke
//      Terminal Pakem (satu-satunya info yang kita PASTI tau: terminus
//      keduanya, sudah divalidasi di AUDIT-YOGYAKARTA.md).
//   2. Belah garis di titik itu -> separuh pertama = arah ke Pakem,
//      separuh kedua = arah balik ke Adisutjipto.
//   3. Proyeksikan tiap halte SiBulan 2 ke KEDUA separuh, halte itu masuk
//      ke arah mana pun yang jaraknya lebih deket (halte pasangan "-A"/"-B"
//      di sisi jalan berlawanan otomatis kepisah sendiri lewat ini, tanpa
//      perlu nebak-nebak makna suffix -A/-B).
//   4. Urutkan halte tiap arah berdasarkan posisinya di sepanjang garis.
//
// Jalankan: node tools/build-sibulan2-directions.js
// Cek hasilnya dulu sebelum dipakai -- script ini nge-print ringkasan di
// akhir, bukan cuma nulis file diam-diam.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const route = JSON.parse(fs.readFileSync(path.join(ROOT, "routes/SIBULAN2.json"), "utf8"));
const stopsAll = JSON.parse(fs.readFileSync(path.join(ROOT, "stops/stops.json"), "utf8"));

const coordinates = route.geometry.coordinates; // [[lon, lat, ele], ...]

// ---- Geometri, sama persis logikanya dengan build-route-shapes.js -------
const EARTH_RADIUS_M = 6371000;
const refLat = coordinates[Math.floor(coordinates.length / 2)][1];
const mPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
const mPerDegLon = mPerDegLat * Math.cos((refLat * Math.PI) / 180);

function toXY(lon, lat) {
  return [lon * mPerDegLon, lat * mPerDegLat];
}

function projectPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  return { t, x: ax + t * abx, y: ay + t * aby };
}

function distanceMeters(lon1, lat1, lon2, lat2) {
  const [x1, y1] = toXY(lon1, lat1);
  const [x2, y2] = toXY(lon2, lat2);
  return Math.hypot(x2 - x1, y2 - y1);
}

// Nearest point on coordinates[fromIdx..toIdx] (inclusive segment range),
// dengan jarak kumulatif SEPANJANG rentang itu dari fromIdx sampai ke
// titik proyeksinya -- ini yang dipakai buat ngurutin halte.
function nearestOnRange(lon, lat, fromIdx, toIdx) {
  const [px, py] = toXY(lon, lat);
  let best = null;
  let cumulative = 0;
  for (let i = fromIdx; i < toIdx; i++) {
    const [ax, ay] = toXY(coordinates[i][0], coordinates[i][1]);
    const [bx, by] = toXY(coordinates[i + 1][0], coordinates[i + 1][1]);
    const segLen = Math.hypot(bx - ax, by - ay);
    const proj = projectPointOnSegment(px, py, ax, ay, bx, by);
    const dx = px - proj.x, dy = py - proj.y;
    const dist = Math.hypot(dx, dy);
    if (!best || dist < best.dist) {
      best = { dist, distAlong: cumulative + proj.t * segLen };
    }
    cumulative += segLen;
  }
  return best;
}

// ---- 1. Cari titik wayback (paling deket ke Terminal Pakem) -------------
const pakem = stopsAll.find((s) => s.stop_name === "Terminal Pakem");
const adisutjipto = stopsAll.find((s) => s.stop_name === "Bandara Adisutjipto");
if (!pakem || !adisutjipto) {
  console.error("Halte Terminal Pakem / Bandara Adisutjipto tidak ketemu di stops.json");
  process.exit(1);
}
const [pakemLon, pakemLat] = pakem.point.split(" ").map(Number);

let waybackIdx = 0;
let waybackDist = Infinity;
for (let i = 0; i < coordinates.length; i++) {
  const d = distanceMeters(coordinates[i][0], coordinates[i][1], pakemLon, pakemLat);
  if (d < waybackDist) {
    waybackDist = d;
    waybackIdx = i;
  }
}

console.log(`Titik wayback: index ${waybackIdx} dari ${coordinates.length}, ${waybackDist.toFixed(1)}m dari Terminal Pakem`);
if (waybackDist > 60) {
  console.warn(
    `PERINGATAN: titik terdekat masih ${waybackDist.toFixed(1)}m dari Terminal Pakem -- ` +
    `lebih jauh dari toleransi wajar (~60m). Cek manual sebelum percaya hasil ini.`
  );
}

// ---- 2. Kumpulkan halte SiBulan 2 ----------------------------------------
const sibulan2Stops = stopsAll
  .filter((s) => s.services.some((svc) => svc.route === "SiBulan 2"))
  .map((s) => {
    const [lon, lat] = s.point.split(" ").map(Number);
    return { name: s.stop_name, lat, lng: lon };
  });

// ---- 3 & 4. Proyeksikan tiap halte ke kedua separuh, ambil yang paling
// deket, lalu urutkan berdasarkan distAlong -------------------------------
const toPakem = [];
const toAdisutjipto = [];

// (lon, lat) urutannya gampang ketuker -- pastikan konsisten: semua fungsi
// geometri di atas menerima (lon, lat) sesuai urutan asli GeoJSON.
for (const stop of sibulan2Stops) {
  const outbound = nearestOnRange(stop.lng, stop.lat, 0, waybackIdx);
  const inbound = nearestOnRange(stop.lng, stop.lat, waybackIdx, coordinates.length - 1);

  if (outbound.dist <= inbound.dist) {
    toPakem.push({ ...stop, distAlong: outbound.distAlong, matchDist: outbound.dist });
  } else {
    toAdisutjipto.push({ ...stop, distAlong: inbound.distAlong, matchDist: inbound.dist });
  }
}

toPakem.sort((a, b) => a.distAlong - b.distAlong);
toAdisutjipto.sort((a, b) => a.distAlong - b.distAlong);

// Peringatan kalau ada halte yang match-nya jauh banget (>60m) dari garis --
// biasanya artinya halte itu sebenarnya nggak match ke arah manapun dengan
// baik, perlu dicek manual.
const FAR_MATCH_M = 60;
for (const s of [...toPakem, ...toAdisutjipto]) {
  if (s.matchDist > FAR_MATCH_M) {
    console.warn(`PERINGATAN: halte "${s.name}" jaraknya ${s.matchDist.toFixed(1)}m dari garis rute -- cek manual.`);
  }
}

// ---- 5. Tulis hasil -------------------------------------------------------
const output = {
  routeId: "SiBulan 2",
  waybackIndex: waybackIdx,
  to_pakem: toPakem.map(({ name, lat, lng }) => ({ name, lat, lng })),
  to_adisutjipto: toAdisutjipto.map(({ name, lat, lng }) => ({ name, lat, lng })),
};

const outPath = path.join(ROOT, "routes/SIBULAN2_stops_ordered.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`\nDitulis ke ${outPath}`);
console.log(`\nArah ke Pakem (${toPakem.length} halte):`);
toPakem.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
console.log(`\nArah ke Adisutjipto (${toAdisutjipto.length} halte):`);
toAdisutjipto.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
