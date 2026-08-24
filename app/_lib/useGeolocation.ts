"use client";

import { useEffect, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  coords: Coords | null;
  error: string | null;
  loading: boolean;
}

const ERRORS: Record<number, string> = {
  1: "Akses lokasi ditolak. Izinkan lokasi di browser supaya feed bisa diurutkan dari yang terdekat.",
  2: "Lokasi tidak terbaca. Pastikan GPS atau layanan lokasi perangkat aktif.",
  3: "Pencarian lokasi kelamaan. Coba lagi di tempat dengan sinyal lebih baik.",
};

// Dibulatkan ke 4 desimal (sekitar 11 meter) supaya pergerakan kecil tidak
// memicu render ulang dan fetch feed terus menerus.
const key = (c: Coords) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;

const supported = () => typeof navigator !== "undefined" && "geolocation" in navigator;

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() =>
    typeof window !== "undefined" && !supported()
      ? { coords: null, error: "Browser ini tidak mendukung akses lokasi.", loading: false }
      : { coords: null, error: null, loading: true }
  );

  useEffect(() => {
    if (!supported()) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next: Coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setState((prev) =>
          prev.coords && key(prev.coords) === key(next)
            ? prev
            : { coords: next, error: null, loading: false }
        );
      },
      (error) => {
        setState({ coords: null, error: ERRORS[error.code] ?? "Gagal membaca lokasi.", loading: false });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
