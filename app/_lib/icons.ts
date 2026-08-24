import { BookOpen, Coffee, Dog, Flame, Gift, HelpCircle, Medal, Pill, Sparkles, Wifi } from "lucide-react";
import type { IconType } from "./types";

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
