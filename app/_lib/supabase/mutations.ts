import { supabase } from "./client";
import type { HelpRequestRow, RewardRedemptionRow } from "./types";
import type { ReportReason, Urgency } from "../types";

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: "Anggota Baru Kos" },
      emailRedirectTo: typeof window === "undefined" ? undefined : window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function submitIdentityVerification() {
  const { data, error } = await supabase.rpc("submit_identity_verification");
  if (error) throw error;
  return data;
}

export async function setMyLocation(lat: number, lng: number) {
  const { error } = await supabase.rpc("set_my_location", { p_lat: lat, p_lng: lng });
  if (error) throw error;
}

export async function setHomeLocation(lat: number, lng: number) {
  const { error } = await supabase.rpc("set_home_location", { p_lat: lat, p_lng: lng });
  if (error) throw error;
}

export async function clearHomeLocation() {
  const { error } = await supabase.rpc("clear_home_location");
  if (error) throw error;
}

export async function createHelpRequest(input: {
  title: string;
  description: string;
  urgency: Urgency;
  lat: number;
  lng: number;
  useHome?: boolean;
}): Promise<HelpRequestRow> {
  const { data, error } = await supabase.rpc("create_help_request", {
    p_title: input.title,
    p_description: input.description,
    p_urgency: input.urgency,
    p_lat: input.lat,
    p_lng: input.lng,
    p_use_home: !!input.useHome,
  });
  if (error) throw error;
  return data as HelpRequestRow;
}

export async function acceptHelpRequest(requestId: string) {
  const { data, error } = await supabase.rpc("accept_help_request", { p_request_id: requestId });
  if (error) throw error;
  return data as HelpRequestRow;
}

export async function completeHelpRequest(requestId: string) {
  const { data, error } = await supabase.rpc("complete_help_request", { p_request_id: requestId });
  if (error) throw error;
  return data as HelpRequestRow;
}

export async function reportUser(input: {
  reportedId: string;
  reason: ReportReason;
  detail?: string;
  requestId?: string | null;
}) {
  const { error } = await supabase.rpc("report_user", {
    p_reported_id: input.reportedId,
    p_reason: input.reason,
    p_detail: input.detail?.trim() || null,
    p_request_id: input.requestId ?? null,
  });
  if (error) throw error;
}

export async function deleteHelpRequest(requestId: string) {
  const { error } = await supabase.rpc("delete_help_request", { p_request_id: requestId });
  if (error) throw error;
}

export async function redeemReward(rewardId: string): Promise<RewardRedemptionRow> {
  const { data, error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId });
  if (error) throw error;
  return data as RewardRedemptionRow;
}

export async function sendPanicAlert(message?: string, radiusM = 1000): Promise<number> {
  const { data, error } = await supabase.rpc("send_panic_alert", {
    p_message: message ?? null,
    p_radius_m: radiusM,
  });
  if (error) throw error;
  return data as number;
}

export async function sendChatMessage(requestId: string, senderId: string, body: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ request_id: requestId, sender_id: senderId, body })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function markNotificationsRead(userId: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
}
