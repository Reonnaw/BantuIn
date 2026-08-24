
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
  status: RequestStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface NearbyRequestRow {
  id: string;
  author_id: string;
  title: string;
  description: string;
  urgency: Urgency;
  reward: number;
  icon: string;
  status: RequestStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  distance_m: number | null;
  request_lat: number | null;
  request_lng: number | null;
  author_name: string;
  author_color: string;
  author_verified: boolean;
  acceptor_name: string | null;
  acceptor_color: string | null;
  acceptor_verified: boolean | null;
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
