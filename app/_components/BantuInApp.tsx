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
import { URGENCY_META, category } from "../_lib/constants";
import { useGeolocation } from "../_lib/useGeolocation";
import { BORDER, PRESS, SHADOW, SHADOW_SM, chunkyButton, inputClass } from "../_lib/ui";
import { LogoMark } from "./Logo";
import { supabase } from "../_lib/supabase/client";
import {
  fetchNearbyRequests,
  fetchKarmaHistory,
  fetchMyRequests,
  fetchNotifications,
} from "../_lib/supabase/queries";
import {
  createHelpRequest,
  acceptHelpRequest,
  completeHelpRequest,
  deleteHelpRequest,
  reportUser,
  sendPanicAlert,
  markNotificationsRead,
  setMyLocation,
} from "../_lib/supabase/mutations";
import {
  toHelpRequest,
  toHistoryItem,
  toMyRequest,
  toNotificationItem,
} from "../_lib/supabase/adapters";
import type { NotificationRow } from "../_lib/supabase/types";
import type {
  AppUser,
  Category,
  HelpRequest,
  HistoryItem,
  MyRequest,
  NotificationItem,
  ReportReason,
  Tab,
  Urgency,
} from "../_lib/types";

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
  const { coords, error: locationError, loading: locatingUser } = useGeolocation();
  const [feedTick, setFeedTick] = useState(0);
  const [tab, setTab] = useState<Tab>("home");
  const [filter, setFilter] = useState<Category>("urgent");
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [karma, setKarma] = useState(user.karma);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isPanicOpen, setPanicOpen] = useState(false);
  const [panicStage, setPanicStage] = useState<"confirm" | "sending" | "sent" | "failed">("confirm");
  const [panicError, setPanicError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!coords) return;
    setMyLocation(coords.lat, coords.lng).catch(() => {});
  }, [coords]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchKarmaHistory(user.id), fetchNotifications(user.id), fetchMyRequests(user.id)])
      .then(([historyRows, notifRows, myRows]) => {
        if (!active) return;
        setHistory(historyRows.map(toHistoryItem));
        setNotifications(notifRows.map(toNotificationItem));
        setMyRequests(myRows.map(toMyRequest));
      })
      .catch(() => {
        if (active) showToast("Gagal memuat data. Coba refresh halaman.");
      });
    return () => {
      active = false;
    };
  }, [user.id, feedTick]);

  useEffect(() => {
    if (locatingUser) return;
    let active = true;
    fetchNearbyRequests(coords)
      .then((rows) => {
        if (active) setRequests(rows.map(toHelpRequest));
      })
      .catch(() => {
        if (active) showToast("Gagal memuat feed. Coba refresh halaman.");
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => {
      active = false;
    };
  }, [coords, locatingUser, feedTick]);

  useEffect(() => {
    const channel = supabase
      .channel(`help_requests-feed-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "help_requests" }, () => {
        setFeedTick((t) => t + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Izin notifikasi cuma boleh diminta dari gestur pengguna, jadi dititipkan ke
  // sentuhan pertama di dalam aplikasi. Tanpa ini, sinyal SOS tetangga cuma
  // muncul di panel notifikasi dan tidak membunyikan perangkat.
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    const ask = () => {
      Notification.requestPermission().catch(() => {});
    };
    window.addEventListener("pointerdown", ask, { once: true });
    return () => window.removeEventListener("pointerdown", ask);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          // Realtime dan refetch bisa membawa baris yang sama, dan id ganda
          // bikin React protes "two children with the same key".
          setNotifications((prev) =>
            prev.some((n) => n.id === row.id) ? prev : [toNotificationItem(row), ...prev]
          );
          // Karma penolong baru dibayar saat pembuat request menekan konfirmasi,
          // yang terjadi di sesi orang lain. Notifikasi ini pemicunya di sini.
          if (row.type === "panic_alert") {
            showToast(row.title);
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification("BantuIn: sinyal darurat", {
                  body: row.title,
                  tag: row.id,
                  icon: "/icon.svg",
                });
              } catch {}
            }
          }
          if (row.type === "karma_earned") {
            const earned = Number(row.data?.karma ?? 0);
            if (earned > 0) setKarma((k) => k + earned);
            setFeedTick((t) => t + 1);
          }
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
    if (!req || req.accepted || req.authorId === user.id) return;
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
      setMyRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "accepted", canDelete: false } : r))
      );
      setDetailRequest((cur) => (cur && cur.id === id ? updated : cur));
      showToast(
        `Semangat bantu ${req.authorName} ya. Karma masuk setelah dia konfirmasi selesai.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menerima request.");
    }
  };

  const completeQuest = async (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req || req.authorId !== user.id || !req.accepted || req.completed) return;
    try {
      await completeHelpRequest(id);
      const updated: HelpRequest = { ...req, status: "completed", completed: true };
      setRequests((prev) => upsertRequest(prev, updated));
      setMyRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "completed", canDelete: false } : r))
      );
      setDetailRequest((cur) => (cur && cur.id === id ? updated : cur));
      showToast(`Makasih! ${req.acceptorName ?? "Penolongmu"} dapat ${req.reward} Karma.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengonfirmasi bantuan selesai.");
    }
  };

  const submitReport = async (input: { reportedId: string; reason: ReportReason; detail: string }) => {
    try {
      await reportUser({
        reportedId: input.reportedId,
        reason: input.reason,
        detail: input.detail,
        requestId: detailRequest?.id ?? null,
      });
      showToast("Laporan terkirim. Terima kasih sudah menjaga komunitas.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    }
  };

  const removeRequest = async (id: string) => {
    try {
      await deleteHelpRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setMyRequests((prev) => prev.filter((r) => r.id !== id));
      setDetailRequest((cur) => (cur && cur.id === id ? null : cur));
      showToast("Request kamu sudah dihapus.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus request.");
    }
  };

  const resetCreateForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormUrgency("low");
  };

  const submitRequest = async () => {
    if (!formTitle.trim() || submitting) return;
    if (!coords) {
      showToast(locationError ?? "Lokasi belum aktif. Izinkan akses lokasi dulu ya.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createHelpRequest({
        title: formTitle.trim(),
        description: formDesc.trim(),
        urgency: formUrgency,
        lat: coords.lat,
        lng: coords.lng,
      });
      setFeedTick((t) => t + 1);
      setFilter(category(created.urgency));
      setCreateOpen(false);
      resetCreateForm();
      showToast("Request kamu tayang buat tetangga terdekat");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengirim request.");
    } finally {
      setSubmitting(false);
    }
  };

  const openPanic = () => {
    setPanicStage("confirm");
    setPanicError(null);
    setPanicOpen(true);
  };

  // SOS tetap berlabel simulasi, tapi notifikasinya sungguhan dikirim ke akun
  // dalam radius 1 km supaya perangkat di dekat kita benar-benar berbunyi.
  // Judul notifikasinya diberi awalan [SIMULASI] di send_panic_alert().
  const confirmPanic = async () => {
    setPanicStage("sending");
    try {
      setNeighborsNotified(await sendPanicAlert());
      setPanicStage("sent");
    } catch (err) {
      setPanicError(err instanceof Error ? err.message : "Gagal mengirim sinyal darurat.");
      setPanicStage("failed");
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
                locating={locatingUser}
                locationError={locationError}
              />
            )
          ) : (
            <ProfileScreen
              user={user}
              karma={karma}
              history={history}
              myRequests={myRequests}
              onDeleteRequest={removeRequest}
              onLogout={onLogout}
              desktop={desktop}
              dark={dark}
              onToggleDark={onToggleDark}
              onKarmaChange={(delta, message) => {
                if (delta !== 0) setKarma((k) => k + delta);
                showToast(message);
              }}
            />
          )}

          {!desktop && (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-slate-900 px-6 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
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
        onComplete={completeQuest}
        onDelete={removeRequest}
        onReport={submitReport}
        userCoords={coords}
      />

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
              Kirim ke Tetangga Terdekat
            </button>
          </div>
        </div>
      </div>

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
              <span className="mt-3 inline-block rounded-md bg-yellow-400 px-2.5 py-1 text-[10px] font-bold text-neutral-900 border-2 border-neutral-900">
                LATIHAN / SIMULASI
              </span>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                Notifikasinya benar-benar dikirim ke tetangga dalam radius 1 km, jadi perangkat
                mereka akan berbunyi. Isinya ditandai sebagai latihan, bukan darurat sungguhan.
                Bisa dikirim 1x tiap 5 menit. Kalau ini darurat beneran, hubungi 112.
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
                Mensimulasikan sinyal darurat...
              </p>
            </div>
          )}

          {panicStage === "sent" && (
            <>
              <div className={`relative mx-auto mb-4 flex size-20 items-center justify-center rounded-lg bg-emerald-500 ${BORDER}`}>
                <Check className="size-9 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-pixel text-sm text-neutral-900 dark:text-neutral-50">
                Sinyal Latihan Terkirim
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {neighborsNotified > 0
                  ? `${neighborsNotified} tetangga dalam radius 1 km sudah menerima notifikasi latihan ini di perangkat mereka.`
                  : "Belum ada tetangga dengan lokasi aktif dalam radius 1 km, jadi tidak ada yang dikabari. Kalau ini darurat sungguhan, hubungi 112."}
              </p>
              <button onClick={closePanic} className={`mt-5 w-full ${chunkyButton("bg-neutral-900 dark:bg-neutral-100", "text-white dark:text-neutral-900")}`}>
                Oke, Mengerti
              </button>
            </>
          )}

          {panicStage === "failed" && (
            <>
              <div className={`relative mx-auto mb-4 flex size-20 items-center justify-center rounded-lg bg-yellow-500 ${BORDER}`}>
                <Siren className="size-9 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-pixel text-sm text-neutral-900 dark:text-neutral-50">
                Sinyal Tidak Terkirim
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {panicError}
              </p>
              <button onClick={closePanic} className={`mt-5 w-full ${chunkyButton("bg-neutral-900 dark:bg-neutral-100", "text-white dark:text-neutral-900")}`}>
                Tutup
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
