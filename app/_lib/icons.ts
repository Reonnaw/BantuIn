import { BookOpen, Coffee, Dog, Flame, Gift, HelpCircle, Medal, Pill, Sparkles, Wifi } from "lucide-react";
import type { IconType } from "./types";

// Nama-nama ini yang tersimpan di kolom help_requests.icon / rewards.icon
// (lihat supabase/schema.sql). Tambah entri di sini kalau butuh ikon baru.
export const ICONS_BY_NAME: Record<string, IconType> = {
  BookOpen,
  Coffee,
  Dog,
  Flame,
  Gift,
  Medal,
  Pill,
  Sparkles,
  Wifi,
};

export const DEFAULT_ICON: IconType = HelpCircle;
