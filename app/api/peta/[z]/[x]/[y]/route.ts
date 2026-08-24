// Proxy tile OpenStreetMap lewat origin sendiri. Banyak pemblokir iklan dan
// proteksi pelacakan (Zen, Brave, uBlock) menahan permintaan ke
// tile.openstreetmap.org, dan hasilnya peta cuma tampak sebagai kotak kosong
// bergaris. Dari origin yang sama, permintaannya tidak lagi kena filter itu.

const UPSTREAM = "https://tile.openstreetmap.org";
const MAX_ZOOM = 19;

export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await context.params;
  const zoom = Number(z);
  const col = Number(x);
  const row = Number(y);

  // Hanya angka utuh dalam rentang yang sah yang dipakai menyusun URL upstream,
  // supaya rute ini tidak bisa dipakai mengambil alamat lain.
  const limit = 2 ** zoom;
  const valid =
    Number.isInteger(zoom) &&
    zoom >= 0 &&
    zoom <= MAX_ZOOM &&
    Number.isInteger(col) &&
    col >= 0 &&
    col < limit &&
    Number.isInteger(row) &&
    row >= 0 &&
    row < limit;

  if (!valid) return new Response("Tile tidak dikenal", { status: 404 });

  const upstream = await fetch(`${UPSTREAM}/${zoom}/${col}/${row}.png`, {
    headers: {
      // Kebijakan pemakaian tile OpenStreetMap mewajibkan User-Agent yang jelas.
      "User-Agent": "BantuIn/1.0 (aplikasi demo bantuan tetangga)",
    },
    cache: "force-cache",
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    return new Response("Tile tidak tersedia", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
