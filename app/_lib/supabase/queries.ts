import { supabase } from "./client";
import type {
  ChatMessageRow,
  HelpRequestRow,
  KarmaHistoryRow,
  NearbyRequestRow,
  NotificationRow,
  ProfileRow,
  RewardRow,
} from "./types";

export async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function fetchNearbyRequests(
  coords: { lat: number; lng: number } | null,
  radiusM = 3000
): Promise<NearbyRequestRow[]> {
  const { data, error } = await supabase.rpc("nearby_help_requests", {
    p_lat: coords?.lat ?? null,
    p_lng: coords?.lng ?? null,
    p_radius_m: radiusM,
  });
  if (error) throw error;
  return (data ?? []) as NearbyRequestRow[];
}

export async function fetchMyRequests(userId: string): Promise<HelpRequestRow[]> {
  const { data, error } = await supabase
    .from("help_requests")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchKarmaHistory(userId: string): Promise<KarmaHistoryRow[]> {
  const { data, error } = await supabase
    .from("karma_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRewards(): Promise<RewardRow[]> {
  const { data, error } = await supabase.from("rewards").select("*").order("cost", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeaderboard(currentUserId: string, limit = 5): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("karma", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];

  if (rows.some((r) => r.id === currentUserId)) return rows;

  const { data: mine, error: mineError } = await supabase.from("profiles").select("*").eq("id", currentUserId).single();
  if (mineError) throw mineError;
  return [...rows, mine];
}

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function fetchChatMessages(requestId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
