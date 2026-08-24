import { category, formatHistoryDate, minutesSince, relativeTimeLabel } from "../constants";
import type {
  AppUser,
  ChatMessage,
  HelpRequest,
  HistoryItem,
  LeaderboardEntry,
  MyRequest,
  NotificationItem,
  RewardItem,
} from "../types";
import type {
  ChatMessageRow,
  HelpRequestRow,
  NearbyRequestRow,
  KarmaHistoryRow,
  NotificationRow,
  ProfileRow,
  RewardRow,
} from "./types";

export function toAppUser(profile: ProfileRow, email: string): AppUser {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    email,
    initial: profile.name.charAt(0).toUpperCase() || "?",
    color: profile.avatar_color,
    karma: profile.karma,
    verified: profile.verified,
    isNew: profile.is_new,
    homeLat: profile.home_lat ?? null,
    homeLng: profile.home_lng ?? null,
  };
}

export function toHelpRequest(row: NearbyRequestRow): HelpRequest {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description,
    urgency: row.urgency,
    category: category(row.urgency),
    distanceM: row.distance_m,
    lat: row.request_lat,
    lng: row.request_lng,
    postedMinAgo: minutesSince(row.created_at),
    authorName: row.author_name,
    authorColor: row.author_color,
    authorInitial: row.author_name.charAt(0).toUpperCase() || "?",
    authorVerified: row.author_verified,
    reward: row.reward,
    icon: row.icon,
    status: row.status,
    accepted: row.status !== "open",
    completed: row.status === "completed",
    acceptedBy: row.accepted_by,
    acceptorName: row.acceptor_name,
    acceptorColor: row.acceptor_color,
    acceptorInitial: row.acceptor_name ? row.acceptor_name.charAt(0).toUpperCase() || "?" : null,
    acceptorVerified: row.acceptor_verified,
  };
}

export function toMyRequest(row: HelpRequestRow): MyRequest {
  return {
    id: row.id,
    title: row.title,
    urgency: row.urgency,
    status: row.status,
    reward: row.reward,
    date: formatHistoryDate(row.created_at),
    canDelete: row.status === "open",
  };
}

export function toHistoryItem(row: KarmaHistoryRow): HistoryItem {
  return {
    id: row.id,
    title: row.title,
    date: formatHistoryDate(row.created_at),
    karma: row.karma_delta,
  };
}

export function toRewardItem(row: RewardRow): RewardItem {
  return { id: row.id, label: row.label, cost: row.cost, icon: row.icon };
}

export function toLeaderboardEntry(row: ProfileRow): LeaderboardEntry {
  return {
    id: row.id,
    name: row.name,
    karma: row.karma,
    initial: row.name.charAt(0).toUpperCase() || "?",
    color: row.avatar_color,
  };
}

export function toChatMessage(row: ChatMessageRow, currentUserId: string): ChatMessage {
  return { id: row.id, fromMe: row.sender_id === currentUserId, text: row.body };
}

const NOTIFICATION_TITLE_FALLBACK: Record<string, string> = {
  request_accepted: "Ada yang menerima requestmu",
  karma_earned: "Karma baru diterima",
  panic_alert: "Sinyal darurat dari tetangga",
  reward_redeemed: "Kamu menukar reward",
  identity_verified: "Identitasmu terverifikasi",
};

export function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title || NOTIFICATION_TITLE_FALLBACK[row.type] || "Notifikasi baru",
    time: relativeTimeLabel(row.created_at),
    read: row.read,
  };
}
