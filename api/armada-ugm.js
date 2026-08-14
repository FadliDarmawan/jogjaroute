// GET /api/armada-ugm
//   -> { "<deviceId>": {deviceId,name,lat,lng,serverTime,updateTime,updatedAt}, ... }
//
// Proxy ke WebSocket GPS Armada Smart Campus UGM (bukan REST, jadi browser
// index.html TIDAK connect langsung ke sana -- lihat
// README_Reverse_Engineering_GPS_Armada_UGM.md untuk detail hasil reverse
// engineering-nya). Function ini yang jadi WebSocket client, sekali per
// request (dibatasi cache singkat di bawah), lalu balikin JSON biasa --
// jadi index.html cukup fetch() seperti /api/location punya SiBulan.
//
// KENAPA begini (bukan koneksi WS yang terus terbuka): Vercel Functions itu
// stateless/short-lived per invocation, tidak didesain buat nahan koneksi
// WebSocket lama. Pola paling cocok di sini: connect -> join -> tunggu 1
// pesan data -> putus -- bukan nahan koneksi terus-terusan.
//
// CATATAN: require("ws") sengaja DI DALAM handler (bukan di top-level file)
// dan dibungkus try/catch -- kalau paket "ws" gagal ke-load di server (misal
// belum ke-install beneran di build Vercel), ini akan balikin JSON error
// yang jelas ("Modul ws gagal di-load...") daripada function crash mentah2
// dan browser cuma dapat 500 polos tanpa keterangan.

const UGM_WS_URL = "wss://armada.smartcampus.ugm.ac.id/gps/ws";
const JOIN_PAYLOAD = { type: "join", username: "user1", room: "room1" };

// Mapping device ID -> nama bus, diambil dari source JS website lama UGM
// (hasil reverse engineering, BUKAN dokumentasi resmi). Device ID di luar
// daftar ini tetap ditampilkan (fallback "Bus <id>"), bukan disembunyikan,
// supaya bus baru/berubah tidak hilang diam-diam dari peta.
const DEVICE_NAMES = {
  "4": "Bus A",
  "11": "Bus B",
  "8": "Bus C",
  "10": "Bus D",
  "9": "Bus E",
};

// Cache module-scope -- cuma bertahan selama instance function ini masih
// "warm" (tidak dijamin Vercel, tapi kalau kena reuse ini nyegah tiap poll
// dari browser bikin koneksi WS baru ke server UGM tiap 5 detik). TTL
// sengaja di bawah interval poll frontend (5s) supaya data tetap terasa
// realtime, bukan buat ngirit traffic ke UGM secara agresif.
let cache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 4000;
const WS_TIMEOUT_MS = 8000;

function fetchFromUgmWs(WebSocket) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(UGM_WS_URL);
    let settled = false;

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.terminate(); } catch (_) {}
      fn(arg);
    };

    const timer = setTimeout(() => {
      finish(reject, new Error("Timeout menunggu data dari WebSocket UGM"));
    }, WS_TIMEOUT_MS);

    ws.on("open", () => {
      ws.send(JSON.stringify(JOIN_PAYLOAD));
    });

    ws.on("message", (raw) => {
      // Format asli: {"type":"message","message":"...JSON string..."} --
      // perlu double JSON.parse (lihat README section 5). Pesan lain yang
      // bukan type "message" diabaikan, bukan dianggap gagal, karena bisa
      // saja ada pesan non-data lain sebelum data pertama datang.
      try {
        const outer = JSON.parse(raw.toString());
        if (outer.type !== "message") return;
        const inner = JSON.parse(outer.message);
        finish(resolve, inner);
      } catch (_) {
        // Bukan fatal -- tunggu pesan berikutnya sampai timeout.
      }
    });

    ws.on("error", (err) => finish(reject, err));
    ws.on("close", () => finish(reject, new Error("Koneksi WebSocket UGM tertutup sebelum dapat data")));
  });
}

function normalize(inner) {
  const positions = Array.isArray(inner && inner["2"]) ? inner["2"] : [];
  const now = Date.now();
  const out = {};
  for (const p of positions) {
    if (!p || p.deviceid == null) continue;
    const id = String(p.deviceid);
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out[id] = {
      deviceId: id,
      name: DEVICE_NAMES[id] || `Bus ${id}`,
      lat,
      lng,
      serverTime: p.servertime ?? null,
      updateTime: p.inserttime1 ?? null,
      // `updatedAt` pakai jam server proxy ini, BUKAN servertime/inserttime1
      // dari UGM -- field itu cuma jam:menit tanpa tanggal & timezone-nya
      // belum diverifikasi (lihat README section 16), jadi tidak aman
      // dipakai buat hitung staleness di frontend.
      updatedAt: now,
    };
  }
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method tidak didukung" });
  }

  // require() di sini, bukan di top-level file -- lihat catatan di atas
  // kenapa. Kalau ini gagal, balas JSON yang jelas daripada crash mentah.
  let WebSocket;
  try {
    WebSocket = require("ws");
  } catch (err) {
    console.error("Gagal load modul 'ws':", err);
    return res.status(500).json({
      error: "Modul 'ws' gagal di-load di server",
      detail: err.message,
      hint: "Pastikan 'ws' ada di dependencies package.json DAN package-lock.json sudah diupdate (npm install lokal dulu), lalu redeploy.",
    });
  }

  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return res.status(200).json(cache.data);
  }

  try {
    const inner = await fetchFromUgmWs(WebSocket);
    const normalized = normalize(inner);
    cache = { data: normalized, fetchedAt: now };
    return res.status(200).json(normalized);
  } catch (err) {
    console.error("Gagal ambil data armada UGM:", err);
    // Kalau masih ada cache lama (walau sudah lewat TTL), lebih baik kasih
    // itu drpd error total -- marker di frontend jadi stale/pudar, bukan
    // hilang mendadak tiap kali sekali gagal connect.
    if (cache.data) {
      return res.status(200).json(cache.data);
    }
    return res.status(502).json({
      error: "Gagal terhubung ke sumber data armada UGM",
      detail: err.message,
    });
  }
};