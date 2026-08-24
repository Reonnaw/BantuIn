import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

export type IconType = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>
>;

export type Urgency = "low" | "medium" | "high";
export type RequestStatus = "open" | "accepted" | "completed";
export type ReportReason = "spam" | "penipuan" | "pelecehan" | "identitas_palsu" | "lainnya";
export type Category = "urgent" | "daily";
export type Tab = "home" | "profile";

export interface HelpRequest {
  id: string;
  authorId: string;
  title: string;
  description: string;
  urgency: Urgency;
  category: Category;
  distanceM: number | null;
  /** Titik tempat request dibuat, dipakai untuk peta. */
  lat: number | null;
  lng: number | null;
  postedMinAgo: number;
  authorName: string;
  authorColor: string;
  authorInitial: string;
  authorVerified: boolean;
  reward: number;
  icon: string;
  status: RequestStatus;
  accepted: boolean;
  completed: boolean;
  acceptedBy: string | null;
  acceptorName: string | null;
  acceptorColor: string | null;
  acceptorInitial: string | null;
  acceptorVerified: boolean | null;
}

export interface MyRequest {
  id: string;
  title: string;
  urgency: Urgency;
  status: RequestStatus;
  reward: number;
  date: string;
  canDelete: boolean;
}

export interface HistoryItem {
  id: string;
  title: string;
  date: string;
  karma: number;
}

export interface AppUser {
  id: string;
  name: string;
  role: string;
  email: string;
  initial: string;
  color: string;
  karma: number;
  verified: boolean;
  isNew: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  karma: number;
  initial: string;
  color: string;
}

export interface RewardItem {
  id: string;
  label: string;
  cost: number;
  icon: string;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  time: string;
  read: boolean;
}
