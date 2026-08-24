"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, TriangleAlert } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { BORDER } from "../_lib/ui";

function pin(color: string, label: string) {
  return `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;border:2px solid #171717;background:${color};color:#fff;font-size:10px;font-weight:800;box-shadow:2px 2px 0 0 #171717">${label}</span>`;
}

export function RequestMap({
  lat,
  lng,
  userLat,
  userLng,
}: {
  lat: number | null;
  lng: number | null;
  userLat: number | null;
  userLng: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilesBlocked, setTilesBlocked] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || lat === null || lng === null) return;

    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      map = L.map(element, { scrollWheelZoom: false, zoomControl: true });
      const tiles = L.tileLayer("/api/peta/{z}/{x}/{y}", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      tiles.on("tileerror", () => setTilesBlocked(true));
      tiles.on("tileload", () => setTilesBlocked(false));
      tiles.addTo(map);

      const requestPoint: [number, number] = [lat, lng];
      L.marker(requestPoint, {
        icon: L.divIcon({ html: pin("#dc2626", "!"), className: "", iconSize: [22, 22], iconAnchor: [11, 11] }),
        title: "Lokasi request",
      }).addTo(map);

      if (userLat !== null && userLng !== null) {
        const userPoint: [number, number] = [userLat, userLng];
        L.marker(userPoint, {
          icon: L.divIcon({ html: pin("#2563eb", "K"), className: "", iconSize: [22, 22], iconAnchor: [11, 11] }),
          title: "Lokasi kamu",
        }).addTo(map);
        L.polyline([userPoint, requestPoint], {
          color: "#171717",
          weight: 2,
          dashArray: "5 5",
        }).addTo(map);
        map.fitBounds(L.latLngBounds([userPoint, requestPoint]), { padding: [34, 34], maxZoom: 17 });
      } else {
        map.setView(requestPoint, 16);
      }

      setTimeout(() => map?.invalidateSize(), 250);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, userLat, userLng]);

  if (lat === null || lng === null) {
    return (
      <div
        className={`mt-4 flex h-44 items-center justify-center gap-2 rounded-lg bg-neutral-50 dark:bg-slate-800 ${BORDER}`}
      >
        <MapPin className="size-4 text-neutral-400" />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Lokasi request belum tersedia</p>
      </div>
    );
  }

  const hasUser = userLat !== null && userLng !== null;

  return (
    <div className="mt-4">
      <div
        ref={containerRef}
        className={`h-52 w-full overflow-hidden rounded-lg ${BORDER} z-0 dark:[&_.leaflet-tile-pane]:invert dark:[&_.leaflet-tile-pane]:hue-rotate-180`}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm border border-neutral-900 bg-red-600 dark:border-neutral-100" />
          Titik request
        </span>
        {hasUser ? (
          <span className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm border border-neutral-900 bg-blue-600 dark:border-neutral-100" />
            Lokasi kamu
          </span>
        ) : (
          <span>Lokasi kamu belum aktif, peta cuma menampilkan titik request.</span>
        )}
      </div>
      {tilesBlocked && (
        <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2.5 py-2 border-2 border-amber-600 dark:border-amber-400">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
          <p className="text-[10px] font-medium leading-snug text-amber-800 dark:text-amber-300">
            Gambar peta gagal dimuat. Penanda dan jaraknya tetap benar.
          </p>
        </div>
      )}
    </div>
  );
}
