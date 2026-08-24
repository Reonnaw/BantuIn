import { supabase } from "./client";
import type { HelpRequestRow, RewardRedemptionRow } from "./types";
import type { Urgency } from "../types";

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role: "Anggota Baru Kos" } },
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

export async function uploadIdentityDoc(userId: string, kind: "ktp" | "selfie", file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${kind}.${ext}`;
  const { error } = await supabase.storage.from("identity-docs").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function submitIdentityVerification(nik: string, ktpPath: string, selfiePath: string) {
  const { data, error } = await supabase.rpc("submit_identity_verification", {
    p_nik: nik,
    p_ktp_path: ktpPath,
    p_selfie_path: selfiePath,
  });
  if (error) throw error;
  return data;
}

export async function createHelpRequest(input: {
  authorId: string;
  title: string;
  description: string;
  urgency: Urgency;
  reward: number;
  distanceM: number;
}): Promise<HelpRequestRow> {
  const { data, error } = await supabase
    .from("help_requests")
    .insert({
      author_id: input.authorId,
      title: input.title,
      description: input.description,
      urgency: input.urgency,
      reward: input.reward,
      distance_m: input.distanceM,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function acceptHelpRequest(requestId: string) {
  const { data, error } = await supabase.rpc("accept_help_request", { p_request_id: requestId });
  if (error) throw error;
  return data as HelpRequestRow;
}

export async function redeemReward(rewardId: string): Promise<RewardRedemptionRow> {
  const { data, error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId });
  if (error) throw error;
  return data as RewardRedemptionRow;
}

export async function sendPanicAlert(message?: string): Promise<number> {
  const { data, error } = await supabase.rpc("send_panic_alert", { p_message: message ?? null });
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
