// Tipe baris database, selaras dengan supabase/schema.sql.
// Kalau kamu ubah schema.sql, update juga tipe-tipe ini.

export type Urgency = "low" | "medium" | "high";
export type RequestStatus = "open" | "accepted" | "completed";
export type NotificationType =
  | "request_accepted"
  | "karma_earned"
  | "panic_alert"
  | "reward_redeemed"
  | "identity_verified";

export interface ProfileRow {
  id: string;
  name: string;
  role: string;
  avatar_color: string;
  karma: number;
  verified: boolean;
  is_new: boolean;
  created_at: string;
}

export type ProfileSummary = Pick<ProfileRow, "id" | "name" | "avatar_color" | "verified">;

export interface HelpRequestRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  urgency: Urgency;
  reward: number;
  icon: string;
  distance_m: number;
  status: RequestStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface HelpRequestWithAuthor extends HelpRequestRow {
  author: ProfileSummary;
  acceptor: ProfileSummary | null;
}

export interface KarmaHistoryRow {
  id: string;
  user_id: string;
  request_id: string | null;
  title: string;
  karma_delta: number;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface RewardRow {
  id: string;
  label: string;
  cost: number;
  icon: string;
  created_at: string;
}

export interface RewardRedemptionRow {
  id: string;
  user_id: string;
  reward_id: string;
  cost: number;
  created_at: string;
}
