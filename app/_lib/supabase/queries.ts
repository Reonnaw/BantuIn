import { supabase } from "./client";
import type { ChatMessageRow, HelpRequestWithAuthor, KarmaHistoryRow, NotificationRow, ProfileRow, RewardRow } from "./types";

const REQUEST_SELECT =
  "*, author:profiles!help_requests_author_id_fkey(id, name, avatar_color, verified), acceptor:profiles!help_requests_accepted_by_fkey(id, name, avatar_color, verified)";

export async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function fetchRequests(): Promise<HelpRequestWithAuthor[]> {
  // Feed publik: semua request (open maupun sudah diterima) ditampilkan,
  // sama seperti perilaku board aslinya — request yang sudah diterima
  // tetap kelihatan dengan badge "Diterima", tidak hilang dari feed.
  const { data, error } = await supabase
    .from("help_requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as HelpRequestWithAuthor[];
}

export async function fetchRequestById(requestId: string): Promise<HelpRequestWithAuthor> {
  const { data, error } = await supabase.from("help_requests").select(REQUEST_SELECT).eq("id", requestId).single();
  if (error) throw error;
  return data as unknown as HelpRequestWithAuthor;
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
