
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
