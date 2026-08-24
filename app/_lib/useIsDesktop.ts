"use client";

import { useSyncExternalStore } from "react";

// Layar >= breakpointPx dianggap "desktop" (sidebar + layout grid).
// Di bawah itu dianggap "mobile" (kartu HP + bottom nav). Update otomatis
// tiap window di-resize lewat browser, tanpa perlu toggle manual.
export function useIsDesktop(breakpointPx = 1024): boolean {
  const query = `(min-width: ${breakpointPx}px)`;

  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false // snapshot server: default ke layout mobile saat SSR
  );
}
