"use client";

import { useSyncExternalStore } from "react";

export function useIsDesktop(breakpointPx = 1024): boolean {
  const query = `(min-width: ${breakpointPx}px)`;

  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
