import {
  Bell,
  Check,
  Clock3,
  Coins,
  Flame,
  Hourglass,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Siren,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { URGENCY_META, distanceLabel, timeAgoLabel } from "../_lib/constants";
import { DEFAULT_ICON, ICONS_BY_NAME } from "../_lib/icons";
import { BORDER, PANEL, PRESS, SHADOW, SHADOW_SM } from "../_lib/ui";
import type { AppUser, Category, HelpRequest } from "../_lib/types";

export function HomeScreen({
  user,
  karma,
  filter,
  setFilter,
  requests,
  onAccept,
  onOpenDetail,
  onPanic,
  onOpenNotifications,
  hasUnread,
  desktop,
  locating,
  locationError,
}: {
  user: AppUser;
  karma: number;
  filter: Category;
  setFilter: (c: Category) => void;
  requests: HelpRequest[];
  onAccept: (id: string) => void;
  onOpenDetail: (r: HelpRequest) => void;
  onPanic: () => void;
  onOpenNotifications: () => void;
  hasUnread: boolean;
  desktop?: boolean;
  locating: boolean;
  locationError: string | null;
}) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b-2 border-neutral-900 dark:border-neutral-100 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarBadge initial={user.initial} color={user.color} size="size-11" />
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Halo,</p>
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-tight">
                  {user.name.split(" ")[0]}
                </p>
                {user.verified && <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-md bg-yellow-50 dark:bg-yellow-950/50 px-3 py-1.5 border-2 border-yellow-500`}>
              <Coins className="size-3.5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-score text-base leading-none text-yellow-800 dark:text-yellow-300">
                {karma.toLocaleString("id-ID")}
              </span>
            </div>
            <button
              onClick={onOpenNotifications}
              className={`relative flex size-9 items-center justify-center rounded-md bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
            >
              <Bell className="size-4" />
              {hasUnread && (
                <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-red-500 border border-neutral-900 dark:border-neutral-100" />
              )}
            </button>
          </div>
        </div>

        {locationError ? (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2.5 border-2 border-amber-600 dark:border-amber-400">
            <TriangleAlert className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{locationError}</p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/40 px-3.5 py-2.5 border-2 border-blue-600 dark:border-blue-400">
            {locating ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-blue-700 dark:text-blue-400" />
            ) : (
              <MapPin className="size-4 shrink-0 text-blue-700 dark:text-blue-400" />
            )}
            <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
              {locating ? (
                "Membaca lokasi kamu..."
              ) : (
                <>
                  Memantau bantuan dalam radius <span className="font-bold">3 km</span> dari lokasi
                  kamu sekarang
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 px-5 pt-4 pb-2">
        <div className={`grid grid-cols-2 gap-2 rounded-lg bg-neutral-100 dark:bg-slate-800 p-1 ${BORDER}`}>
          <button
            onClick={() => setFilter("urgent")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-bold transition-colors ${
              filter === "urgent"
                ? "bg-red-600 text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <Flame className="size-3.5" />
            Butuh Cepat
          </button>
          <button
            onClick={() => setFilter("daily")}
            className={`flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-bold transition-colors ${
              filter === "daily"
                ? "bg-emerald-600 text-white"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <Sparkles className="size-3.5" />
            Misi Harian
          </button>
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-5 pt-2 ${desktop ? "pb-8" : "pb-28"} ${
          desktop ? "grid grid-cols-2 gap-3 content-start" : "mx-auto w-full max-w-2xl space-y-3"
        }`}
      >
        {requests.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <div className={`mb-3 flex size-14 items-center justify-center rounded-lg bg-neutral-100 dark:bg-slate-800 ${BORDER}`}>
              <Users className="size-6 text-neutral-400" />
            </div>
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              Belum ada request di sini
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Jadi yang pertama minta bantuan yuk
            </p>
          </div>
        )}
        {requests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            isOwn={r.authorId === user.id}
            onAccept={onAccept}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      <button
        onClick={onPanic}
        className={`absolute ${desktop ? "bottom-6" : "bottom-24"} right-5 z-30 flex items-center gap-2 rounded-lg bg-red-600 pl-3.5 pr-4 py-3 text-white ${BORDER} ${SHADOW} ${PRESS}`}
        aria-label="Tombol darurat"
      >
        <span className="relative flex size-5 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
          <Siren className="relative size-5" strokeWidth={2.3} />
        </span>
        <span className="text-xs font-extrabold tracking-wide">SOS</span>
      </button>
    </div>
  );
}

function RequestCard({
  request,
  isOwn,
  onAccept,
  onOpenDetail,
}: {
  request: HelpRequest;
  isOwn: boolean;
  onAccept: (id: string) => void;
  onOpenDetail: (r: HelpRequest) => void;
}) {
  const meta = URGENCY_META[request.urgency];
  const Icon = ICONS_BY_NAME[request.icon] ?? DEFAULT_ICON;
  return (
    <div className={`rounded-lg ${PANEL} p-4 ${SHADOW_SM}`}>
      <button onClick={() => onOpenDetail(request)} className="flex w-full items-start gap-3 text-left">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-md ${meta.bg} border-2 ${meta.border}`}>
          <Icon className={`size-5 ${meta.text}`} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`flex items-center gap-1 rounded-md ${meta.bg} ${meta.text} px-2 py-0.5 text-[10px] font-bold border ${meta.border}`}
            >
              <span
                className={`size-1.5 rounded-full ${meta.dot} ${
                  request.urgency === "high" ? "animate-pulse" : ""
                }`}
              />
              {meta.label}
            </span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">·</span>
            <span className="flex items-center gap-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
              <Clock3 className="size-3" />
              {timeAgoLabel(request.postedMinAgo)}
            </span>
          </div>
          <h3 className="text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-50">
            {request.title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 line-clamp-2">
            {request.description}
          </p>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between border-t-2 border-neutral-200 dark:border-slate-700 pt-3">
        <div className="flex items-center gap-2">
          <AvatarBadge initial={request.authorInitial} color={request.authorColor} size="size-7" />
          <div>
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                {request.authorName}
              </p>
              {request.authorVerified && <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />}
            </div>
            <p className="flex items-center gap-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
              <MapPin className="size-2.5" />
              {distanceLabel(request.distanceM)}
            </p>
          </div>
        </div>
        <button
          onClick={() => onAccept(request.id)}
          disabled={request.accepted || isOwn}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold ${BORDER} ${PRESS} ${
            request.accepted
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
              : isOwn
                ? "bg-neutral-100 dark:bg-slate-800 text-neutral-500 dark:text-neutral-400"
                : `bg-blue-600 text-white ${SHADOW_SM}`
          }`}
        >
          {request.completed ? (
            <>
              <Check className="size-3.5" /> Selesai
            </>
          ) : request.accepted ? (
            <>
              <Hourglass className="size-3.5" /> Dibantu
            </>
          ) : isOwn ? (
            "Request Kamu"
          ) : (
            <>
              Terima
              <span className="opacity-80">+{request.reward}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
