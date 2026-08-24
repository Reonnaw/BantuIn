import type { Category, Urgency } from "./types";

export const URGENCY_META: Record<
  Urgency,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  low: {
    label: "Santai",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-600 dark:border-emerald-400",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Sedang",
    text: "text-yellow-800 dark:text-yellow-300",
    bg: "bg-yellow-50 dark:bg-yellow-950/50",
    border: "border-yellow-500 dark:border-yellow-400",
    dot: "bg-yellow-500",
  },
  high: {
    label: "Darurat",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-600 dark:border-red-400",
    dot: "bg-red-500",
  },
};

export const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-red-500",
  "bg-sky-500",
  "bg-teal-600",
  "bg-lime-600",
];

export function distanceLabel(m: number | null): string {
  if (m === null) return "Lokasi belum aktif";
  if (m < 1000) return `${m}m dari kamu`;
  return `${(m / 1000).toFixed(1)} km dari kamu`;
}

export function timeAgoLabel(min: number): string {
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  return `${Math.floor(min / 60)} jam lalu`;
}

export function relativeTimeLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

export function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TIERS = [
  { level: 1, title: "Anak Baik Kos", floor: 0, next: 300 },
  { level: 2, title: "Tetangga Andalan", floor: 300, next: 800 },
  { level: 3, title: "Pahlawan Kos", floor: 800, next: 2000 },
  { level: 4, title: "Legenda Komplek", floor: 2000, next: 5000 },
];

export function karmaTier(karma: number) {
  return [...TIERS].reverse().find((t) => karma >= t.floor) ?? TIERS[0];
}

export function karmaTierByLevel(level: number) {
  return TIERS.find((t) => t.level === level) ?? TIERS[TIERS.length - 1];
}

export function randomAvatarColor(seed: string): string {
  const idx = seed.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export const category = (u: Urgency): Category => (u === "low" ? "daily" : "urgent");
