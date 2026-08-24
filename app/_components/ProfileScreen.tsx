"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ChevronRight,
  Clock3,
  Coins,
  Gift,
  History,
  LoaderCircle,
  LogOut,
  Medal,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { karmaTier, karmaTierByLevel } from "../_lib/constants";
import { DEFAULT_ICON, ICONS_BY_NAME } from "../_lib/icons";
import { fetchLeaderboard, fetchRewards } from "../_lib/supabase/queries";
import { redeemReward as redeemRewardMutation } from "../_lib/supabase/mutations";
import { toLeaderboardEntry, toRewardItem } from "../_lib/supabase/adapters";
import { BORDER, PANEL, PRESS, SHADOW, SHADOW_SM } from "../_lib/ui";
import type { AppUser, HistoryItem, LeaderboardEntry, RewardItem } from "../_lib/types";

export function ProfileScreen({
  user,
  karma,
  history,
  onLogout,
  desktop,
  onKarmaChange,
}: {
  user: AppUser;
  karma: number;
  history: HistoryItem[];
  onLogout: () => void;
  desktop?: boolean;
  onKarmaChange: (delta: number, message: string) => void;
}) {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchRewards(), fetchLeaderboard(user.id)]).then(([rewardRows, boardRows]) => {
      if (!active) return;
      setRewards(rewardRows.map(toRewardItem));
      setLeaderboard(boardRows.map(toLeaderboardEntry));
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  const tier = karmaTier(karma);
  const nextTier = karmaTierByLevel(tier.level + 1);
  const progressPct = Math.min(
    100,
    Math.round(((karma - tier.floor) / (tier.next - tier.floor)) * 100)
  );

  const board = useMemo(() => {
    const others = leaderboard.filter((p) => p.id !== user.id);
    return [...others, { id: user.id, name: "Kamu", karma, initial: user.initial, color: user.color }].sort(
      (a, b) => b.karma - a.karma
    );
  }, [leaderboard, karma, user]);

  const handleRedeem = async (reward: RewardItem) => {
    if (redeemingId || karma < reward.cost) return;
    setRedeemingId(reward.id);
    try {
      await redeemRewardMutation(reward.id);
      onKarmaChange(-reward.cost, `Ditukar! ${reward.label} siap dipakai.`);
    } catch (err) {
      onKarmaChange(0, err instanceof Error ? err.message : "Gagal menukar reward.");
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto px-5 ${desktop ? "pb-8" : "pb-28"} pt-6`}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-pixel text-base text-neutral-900 dark:text-neutral-50">Profil Kamu</h1>
        <button
          onClick={onLogout}
          className={`flex items-center gap-1 rounded-md bg-white dark:bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
        >
          <LogOut className="size-3" /> Keluar
        </button>
      </div>

      <div className={desktop ? "grid grid-cols-2 gap-5 items-start" : "space-y-6"}>
        <div className="space-y-4">
          <div className={`flex items-center gap-3 rounded-lg ${PANEL} p-3.5 ${SHADOW_SM}`}>
            <AvatarBadge initial={user.initial} color={user.color} size="size-12" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-50">
                  {user.name}
                </p>
                {user.verified && <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
              </div>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.role}</p>
            </div>
            {user.verified && (
              <span className="shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border-2 border-emerald-600 dark:border-emerald-400">
                Terverifikasi
              </span>
            )}
          </div>

          {/* Karma Tier Card */}
          <div className={`rounded-lg bg-blue-600 p-5 text-white ${BORDER} ${SHADOW}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-blue-100">Karma Baik</p>
                <p className="font-score mt-0.5 text-4xl leading-none">
                  {karma.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-blue-700 border-2 border-white/40 px-3 py-1.5">
                <Award className="size-3.5" />
                <span className="text-[11px] font-bold">Level {tier.level}</span>
              </div>
            </div>
            <p className="mt-2 text-sm font-bold">{tier.title} Kos</p>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-blue-100">
                <span>Menuju {nextTier.title}</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-md bg-blue-800 border border-blue-900">
                <div
                  className="h-full bg-yellow-400 transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-blue-100">
                {tier.next - karma > 0 ? `${tier.next - karma} Karma lagi` : "Level maksimal tercapai!"}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Misi Selesai", value: String(history.length), icon: Trophy },
              {
                label: "Peringkat",
                value: `#${board.findIndex((p) => p.id === user.id) + 1}`,
                icon: Medal,
              },
              { label: "Lencana", value: user.isNew ? "0" : "5", icon: Award },
            ].map((s) => (
              <div key={s.label} className={`flex flex-col items-center gap-1.5 rounded-lg ${PANEL} p-3.5 ${SHADOW_SM}`}>
                <s.icon className="size-4 text-blue-600 dark:text-blue-400" />
                <p className="font-score text-xl leading-none text-neutral-900 dark:text-neutral-50">
                  {s.value}
                </p>
                <p className="text-center text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* History */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Riwayat Bantuan</h2>
              <History className="size-4 text-neutral-400" />
            </div>
            {history.length === 0 ? (
              <div className={`rounded-lg ${PANEL} p-5 text-center ${SHADOW_SM}`}>
                <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Belum ada riwayat
                </p>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  Yuk mulai bantu tetangga kos kamu!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className={`flex items-center justify-between rounded-lg ${PANEL} p-3.5 ${SHADOW_SM}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-neutral-800 dark:text-neutral-100">
                        {h.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                        <Clock3 className="size-2.5" />
                        {h.date}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border-2 border-emerald-600 dark:border-emerald-400">
                      +{h.karma}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rewards */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Tukar Karma</h2>
              <Gift className="size-4 text-neutral-400" />
            </div>
            <div className="space-y-2">
              {rewards.map((r) => {
                const affordable = karma >= r.cost;
                const Icon = ICONS_BY_NAME[r.icon] ?? DEFAULT_ICON;
                const isRedeeming = redeemingId === r.id;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between rounded-lg ${PANEL} p-3.5 ${SHADOW_SM}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-md bg-yellow-50 dark:bg-yellow-950/50 border-2 border-yellow-500`}>
                        <Icon className="size-4.5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">{r.label}</p>
                        <p className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                          <Coins className="size-3 text-yellow-600 dark:text-yellow-400" />
                          {r.cost} Karma
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!affordable || redeemingId !== null}
                      className={`rounded-md px-3.5 py-1.5 text-[11px] font-bold ${BORDER} ${PRESS} ${
                        affordable
                          ? `bg-blue-600 text-white ${SHADOW_SM}`
                          : "bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {isRedeeming ? <LoaderCircle className="size-3.5 animate-spin" /> : "Tukar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                Papan Peringkat
              </h2>
              <ChevronRight className="size-4 text-neutral-400" />
            </div>
            <div className={`overflow-hidden rounded-lg ${PANEL} ${SHADOW_SM}`}>
              {board.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i !== board.length - 1 ? "border-b-2 border-neutral-200 dark:border-slate-700" : ""
                  } ${p.id === user.id ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold border ${
                      i === 0
                        ? "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-500"
                        : i === 1
                          ? "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 border-neutral-400"
                          : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <AvatarBadge initial={p.initial} color={p.color} size="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-neutral-800 dark:text-neutral-100">
                      {p.id === user.id ? "Kamu" : p.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="size-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                      {p.karma.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
