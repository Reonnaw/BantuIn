"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  House,
  LoaderCircle,
  LogOut,
  Moon,
  PartyPopper,
  Plus,
  Send,
  Siren,
  Sun,
  User,
  X,
} from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HomeScreen } from "./HomeScreen";
import { ProfileScreen } from "./ProfileScreen";
import { NotificationsPanel } from "./NotificationsPanel";
import { RequestDetailSheet } from "./RequestDetailSheet";
import { URGENCY_META, category, rewardForUrgency } from "../_lib/constants";
import { BORDER, PRESS, SHADOW, SHADOW_SM, chunkyButton, inputClass } from "../_lib/ui";
import { LogoMark } from "./Logo";
import { supabase } from "../_lib/supabase/client";
import { fetchRequests, fetchRequestById, fetchKarmaHistory, fetchNotifications } from "../_lib/supabase/queries";
import { createHelpRequest, acceptHelpRequest, sendPanicAlert, markNotificationsRead } from "../_lib/supabase/mutations";
import { toHelpRequest, toHistoryItem, toNotificationItem } from "../_lib/supabase/adapters";
import type { NotificationRow } from "../_lib/supabase/types";
import type { AppUser, Category, HelpRequest, HistoryItem, NotificationItem, Tab, Urgency } from "../_lib/types";

function upsertRequest(list: HelpRequest[], next: HelpRequest): HelpRequest[] {
  const idx = list.findIndex((r) => r.id === next.id);
  if (idx === -1) return [next, ...list];
  const copy = [...list];
  copy[idx] = next;
  return copy;
}

export function BantuInApp({
  user,
  desktop,
  dark,
  onToggleDark,
  onLogout,
}: {
  user: AppUser;
  desktop: boolean;
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("home");
  const [filter, setFilter] = useState<Category>("urgent");
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [karma, setKarma] = useState(user.karma);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isPanicOpen, setPanicOpen] = useState(false);
  const [panicStage, setPanicStage] = useState<"confirm" | "sending" | "sent">("confirm");
  const [neighborsNotified, setNeighborsNotified] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<HelpRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formUrgency, setFormUrgency] = useState<Urgency>("low");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnread = notifications.some((n) => !n.read);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Initial load
  useEffect(() => {
    let active = true;
    Promise.all([fetchRequests(), fetchKarmaHistory(user.id), fetchNotifications(user.id)])
      .then(([reqRows, historyRows, notifRows]) => {
        if (!active) return;
        setRequests(reqRows.map(toHelpRequest));
        setHistory(historyRows.map(toHistoryItem));
        setNotifications(notifRows.map(toNotificationItem));
      })
      .catch(() => {
        if (active) showToast("Gagal memuat data. Coba refresh halaman.");
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  // Realtime: feed request baru / status berubah (diterima orang lain)
  useEffect(() => {
    const channel = supabase
      .channel(`help_requests-feed-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "help_requests" }, async (payload) => {
        try {
          const full = await fetchRequestById((payload.new as { id: string }).id);
          setRequests((prev) => upsertRequest(prev, toHelpRequest(full)));
        } catch {
          // request mungkin sudah tidak bisa dibaca lagi, abaikan.
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "help_requests" }, async (payload) => {
        try {
          const full = await fetchRequestById((payload.new as { id: string }).id);
          setRequests((prev) => upsertRequest(prev, toHelpRequest(full)));
        } catch {
          // ignore
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Realtime: notifikasi masuk buat user ini
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [toNotificationItem(payload.new as NotificationRow), ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const filteredRequests = useMemo(
    () => requests.filter((r) => r.category === filter),
    [requests, filter]
  );

  const acceptQuest = async (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req || req.accepted) return;
    try {
      await acceptHelpRequest(id);
      const updated: HelpRequest = {
        ...req,
        accepted: true,
        acceptedBy: user.id,
        acceptorName: user.name,
        acceptorColor: user.color,
        acceptorInitial: user.initial,
        acceptorVerified: user.verified,
      };
      setRequests((prev) => upsertRequest(prev, updated));
      setKarma((k) => k + req.reward);
      setHistory((prev) => [
        { id: `h-${req.id}-${Date.now()}`, title: req.title, date: "Hari ini", karma: req.reward },
        ...prev,
      ]);
      setDetailRequest((cur) => (cur && cur.id === id ? updated : cur));
      showToast(`+${req.reward} Karma Baik! Semangat bantu ${req.authorName} ya`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menerima request.");
    }
  };

  const resetCreateForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormUrgency("low");
  };

  const submitRequest = async () => {
    if (!formTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const reward = rewardForUrgency(formUrgency);
      const distanceM = Math.floor(20 + Math.random() * 150);
      const created = await createHelpRequest({
        authorId: user.id,
        title: formTitle.trim(),
        description: formDesc.trim() || "Tidak ada detail tambahan.",
        urgency: formUrgency,
        reward,
        distanceM,
      });
      const newRequest: HelpRequest = {
        id: created.id,
        authorId: user.id,
        title: created.title,
        description: created.description,
        urgency: created.urgency,
        category: category(created.urgency),
        distanceM: created.distance_m,
        postedMinAgo: 0,
        authorName: user.name,
        authorColor: user.color,
        authorInitial: user.initial,
        authorVerified: user.verified,
        reward: created.reward,
        icon: created.icon || "Sparkles",
        accepted: false,
        acceptedBy: null,
        acceptorName: null,
        acceptorColor: null,
        acceptorInitial: null,
        acceptorVerified: null,
      };
      setRequests((prev) => upsertRequest(prev, newRequest));
      setFilter(newRequest.category);
      setCreateOpen(false);
      resetCreateForm();
      showToast("Request kamu tayang di radius 500m");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengirim request.");
    } finally {
      setSubmitting(false);
    }
  };

  const openPanic = () => {
    setPanicStage("confirm");
    setPanicOpen(true);
  };

  const confirmPanic = async () => {
    setPanicStage("sending");
    try {
      const count = await sendPanicAlert();
      setNeighborsNotified(count);
      setPanicStage("sent");
    } catch {
      setNeighborsNotified(0);
      setPanicStage("sent");
    }
  };

  const closePanic = () => {
    setPanicOpen(false);
    setTimeout(() => setPanicStage("confirm"), 300);
  };

  const openNotifications = () => {
    setNotifOpen(true);
    if (hasUnread) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      markNotificationsRead(user.id).catch(() => {});
    }
  };

  return (
    <>
      {/* Toast */}
      <div
        className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className={`flex items-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium px-4 py-2.5 ${BORDER} ${SHADOW_SM}`}>
          <PartyPopper className="size-4 text-yellow-400" />
          <span>{toast}</span>
        </div>
      </div>

      <div className="flex h-full flex-1 overflow-hidden">
        {desktop && (
          <Sidebar
            user={user}
            tab={tab}
            setTab={setTab}
            onLogout={onLogout}
            onCreate={() => setCreateOpen(true)}
            dark={dark}
            onToggleDark={onToggleDark}
          />
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          {tab === "home" ? (
            loadingRequests ? (
              <div className="flex flex-1 items-center justify-center">
                <LoaderCircle className="size-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              <HomeScreen
                user={user}
                karma={karma}
                filter={filter}
                setFilter={setFilter}
                requests={filteredRequests}
                onAccept={acceptQuest}
                onOpenDetail={setDetailRequest}
                onPanic={openPanic}
                onOpenNotifications={openNotifications}
                hasUnread={hasUnread}
                desktop={desktop}
              />
            )
          ) : (
            <ProfileScreen
              user={user}
              karma={karma}
              history={history}
              onLogout={onLogout}
              desktop={desktop}
              onKarmaChange={(delta, message) => {
                if (delta !== 0) setKarma((k) => k + delta);
                showToast(message);
              }}
            />
          )}

          {!desktop && (
            <div className="relative shrink-0 border-t-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-slate-900 px-6 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <NavButton active={tab === "home"} icon={House} label="Beranda" onClick={() => setTab("home")} />
                <button
                  onClick={() => setCreateOpen(true)}
                  className={`relative -mt-7 flex size-12 items-center justify-center rounded-lg bg-blue-600 text-white ${BORDER} ${SHADOW} ${PRESS}`}
                  aria-label="Buat request"
                >
                  <Plus className="size-6" strokeWidth={2.5} />
                </button>
                <NavButton active={tab === "profile"} icon={User} label="Profil" onClick={() => setTab("profile")} />
              </div>
            </div>
          )}
        </div>
      </div>

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} />
      <RequestDetailSheet
        request={detailRequest}
        currentUser={user}
        onClose={() => setDetailRequest(null)}
        onAccept={acceptQuest}
      />

      {/* Create Request Sheet */}
      <div
        className={`fixed inset-0 z-[60] flex items-end justify-center transition-all duration-300 ${
          isCreateOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setCreateOpen(false)}
          className={`absolute inset-0 bg-neutral-900/50 transition-opacity duration-300 ${
            isCreateOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`relative w-full max-w-[400px] rounded-t-2xl bg-white dark:bg-slate-900 border-t-4 border-neutral-900 dark:border-neutral-100 px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
            isCreateOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-pixel text-base text-neutral-900 dark:text-neutral-50">Minta Bantuan</h2>
            <button
              onClick={() => setCreateOpen(false)}
              className={`flex size-8 items-center justify-center rounded-md bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Judul Bantuan
              </label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="cth. Tolong angkatin jemuran"
                maxLength={80}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Detail (opsional)
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Kasih tau lokasi atau info tambahan..."
                rows={3}
                maxLength={200}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Tingkat Urgensi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as Urgency[]).map((level) => {
                  const meta = URGENCY_META[level];
                  const isActive = formUrgency === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setFormUrgency(level)}
                      className={`rounded-md border-2 px-2 py-2.5 text-xs font-semibold transition-colors ${
                        isActive
                          ? `${meta.bg} ${meta.text} ${meta.border}`
                          : "border-neutral-300 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 hover:border-neutral-400"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={submitRequest}
              disabled={!formTitle.trim() || submitting}
              className={`mt-2 w-full ${chunkyButton("bg-blue-600")}`}
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              Kirim ke Radius 500m
            </button>
          </div>
        </div>
      </div>

      {/* Panic Modal */}
      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center px-6 transition-all duration-300 ${
          isPanicOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-neutral-900/60 transition-opacity duration-300 ${
            isPanicOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`relative w-full max-w-[340px] rounded-lg bg-white dark:bg-slate-900 p-6 text-center ${BORDER} ${SHADOW} transition-all duration-300 ${
            isPanicOpen ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          {panicStage === "confirm" && (
            <>
              <div className="relative mx-auto mb-4 flex size-20 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-950/50 animate-ping" />
                <div className={`relative flex size-16 items-center justify-center rounded-lg bg-red-600 ${BORDER}`}>
                  <Siren className="size-8 text-white" strokeWidth={2} />
                </div>
              </div>
              <h3 className="font-pixel text-sm text-neutral-900 dark:text-neutral-50">
                Kirim Sinyal Darurat?
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                Semua tetangga dalam radius 500m akan langsung diberi notifikasi prioritas.
                Gunakan hanya untuk kondisi darurat sungguhan.
              </p>
              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={closePanic}
                  className={`flex-1 rounded-lg bg-white dark:bg-slate-800 py-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200 ${BORDER} ${SHADOW_SM} ${PRESS}`}
                >
                  Batal
                </button>
                <button onClick={confirmPanic} className={`flex-1 ${chunkyButton("bg-red-600")}`}>
                  Kirim Sekarang
                </button>
              </div>
            </>
          )}

          {panicStage === "sending" && (
            <div className="py-4">
              <LoaderCircle className="mx-auto size-12 animate-spin text-red-600 dark:text-red-400" strokeWidth={2} />
              <p className="mt-4 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Mengirim sinyal darurat...
              </p>
            </div>
          )}

          {panicStage === "sent" && (
            <>
              <div className={`relative mx-auto mb-4 flex size-20 items-center justify-center rounded-lg bg-emerald-500 ${BORDER}`}>
                <Check className="size-9 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-pixel text-sm text-neutral-900 dark:text-neutral-50">
                Bantuan Segera Datang
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {neighborsNotified} tetangga sudah menerima sinyalmu. Tetap tenang, kamu nggak sendirian.
              </p>
              <button onClick={closePanic} className={`mt-5 w-full ${chunkyButton("bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900")}`}>
                Oke, Mengerti
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Sidebar({
  user,
  tab,
  setTab,
  onLogout,
  onCreate,
  dark,
  onToggleDark,
}: {
  user: AppUser;
  tab: Tab;
  setTab: (t: Tab) => void;
  onLogout: () => void;
  onCreate: () => void;
  dark: boolean;
  onToggleDark: () => void;
}) {
  return (
    <div className="flex w-56 shrink-0 flex-col border-r-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <p className="font-pixel text-sm text-neutral-900 dark:text-neutral-50">
            Bantu<span className="text-blue-600 dark:text-blue-400">In</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onToggleDark}
            aria-label="Ganti tema"
            className={`flex size-8 items-center justify-center rounded-md bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-200 ${BORDER} ${PRESS}`}
          >
            {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
        </div>
      </div>

      <button onClick={onCreate} className={`mt-6 w-full ${chunkyButton("bg-blue-600")}`}>
        <Plus className="size-4" />
        Minta Bantuan
      </button>

      <nav className="mt-6 flex flex-col gap-1.5">
        <SidebarLink active={tab === "home"} icon={House} label="Beranda" onClick={() => setTab("home")} />
        <SidebarLink active={tab === "profile"} icon={User} label="Profil" onClick={() => setTab("profile")} />
      </nav>

      <div className="mt-auto space-y-2">
        <div className={`flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-slate-800 p-2.5 ${BORDER}`}>
          <AvatarBadge initial={user.initial} color={user.color} size="size-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-neutral-800 dark:text-neutral-100">{user.name}</p>
            <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
        >
          <LogOut className="size-3.5" /> Keluar
        </button>
      </div>
    </div>
  );
}

function SidebarLink({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof House;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
        active
          ? "bg-blue-600 text-white border-2 border-neutral-900 dark:border-neutral-100"
          : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 border-2 border-transparent"
      }`}
    >
      <Icon className="size-4" strokeWidth={active ? 2.4 : 2} />
      {label}
    </button>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof House;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
        active ? "text-blue-600 dark:text-blue-400" : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
      }`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </button>
  );
}
