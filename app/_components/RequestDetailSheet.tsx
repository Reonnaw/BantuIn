"use client";

import { useState } from "react";
import { Check, Clock3, Flag, Hourglass, MapPin, MessageSquare, ShieldCheck, Trash2, X } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { ChatOverlay } from "./ChatOverlay";
import { RequestMap } from "./RequestMap";
import { ReportSheet } from "./ReportSheet";
import { URGENCY_META, distanceLabel, timeAgoLabel } from "../_lib/constants";
import { DEFAULT_ICON, ICONS_BY_NAME } from "../_lib/icons";
import { BORDER, PRESS, SHADOW_SM, chunkyButton } from "../_lib/ui";
import type { AppUser, HelpRequest, ReportReason } from "../_lib/types";

export function RequestDetailSheet({
  request,
  currentUser,
  onClose,
  onAccept,
  onComplete,
  onDelete,
  onReport,
  userCoords,
}: {
  request: HelpRequest | null;
  currentUser: AppUser;
  onClose: () => void;
  onAccept: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (input: { reportedId: string; reason: ReportReason; detail: string }) => Promise<void>;
  userCoords: { lat: number; lng: number } | null;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const open = !!request;
  const meta = request ? URGENCY_META[request.urgency] : URGENCY_META.low;
  const Icon = request ? ICONS_BY_NAME[request.icon] ?? DEFAULT_ICON : null;

  const confirmDelete = confirmFor !== null && confirmFor === request?.id;
  const close = () => {
    setConfirmFor(null);
    onClose();
  };

  const isAuthor = request?.authorId === currentUser.id;
  const isAcceptor = request?.acceptedBy === currentUser.id;
  const otherParty =
    request && isAuthor && request.acceptorName
      ? { name: request.acceptorName, initial: request.acceptorInitial ?? "?", color: request.acceptorColor ?? "bg-blue-500" }
      : request && isAcceptor
        ? { name: request.authorName, initial: request.authorInitial, color: request.authorColor }
        : null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[55] flex items-end justify-center transition-all duration-300 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          onClick={close}
          className={`absolute inset-0 bg-neutral-900/50 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`relative max-h-[85%] w-full max-w-[400px] overflow-y-auto rounded-t-2xl bg-white dark:bg-slate-900 border-t-4 border-neutral-900 dark:border-neutral-100 transition-transform duration-300 ease-out ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {request && Icon && (
            <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <div className="flex items-start justify-between">
                <span
                  className={`flex items-center gap-1 rounded-md ${meta.bg} ${meta.text} px-2.5 py-1 text-[10px] font-bold border-2 ${meta.border}`}
                >
                  <span className={`size-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                <button
                  onClick={close}
                  className={`flex size-8 items-center justify-center rounded-md bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className={`flex size-11 items-center justify-center rounded-lg ${meta.bg} border-2 ${meta.border}`}>
                  <Icon className={`size-5 ${meta.text}`} />
                </div>
                <h2 className="text-base font-extrabold leading-snug text-neutral-900 dark:text-neutral-50">
                  {request.title}
                </h2>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {request.description}
              </p>

              <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" /> {distanceLabel(request.distanceM)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3.5" /> {timeAgoLabel(request.postedMinAgo)}
                </span>
              </div>

              <RequestMap
                lat={request.lat}
                lng={request.lng}
                userLat={userCoords?.lat ?? null}
                userLng={userCoords?.lng ?? null}
              />

              <div className={`mt-4 flex items-center gap-3 rounded-lg bg-neutral-50 dark:bg-slate-800 p-3 ${BORDER}`}>
                <AvatarBadge initial={request.authorInitial} color={request.authorColor} size="size-10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs font-bold text-neutral-800 dark:text-neutral-100">
                      {request.authorName}
                    </p>
                    {request.authorVerified && (
                      <ShieldCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {request.authorVerified ? "Identitas terverifikasi" : "Belum terverifikasi"}
                  </p>
                </div>
                {(isAuthor || isAcceptor) && (
                  <button
                    onClick={() => setChatOpen(true)}
                    aria-label="Buka chat"
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-900 text-neutral-600 dark:text-neutral-300 ${BORDER} ${PRESS}`}
                  >
                    <MessageSquare className="size-4" />
                  </button>
                )}
                {!isAuthor && (
                  <button
                    onClick={() => setReportTarget({ id: request.authorId, name: request.authorName })}
                    aria-label={`Laporkan ${request.authorName}`}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 ${BORDER} ${PRESS}`}
                  >
                    <Flag className="size-4" />
                  </button>
                )}
              </div>

              {request.completed ? (
                <div className={`mt-5 w-full ${chunkyButton("bg-emerald-600")} pointer-events-none`}>
                  <Check className="size-4" /> Bantuan Selesai (+{request.reward} Karma)
                </div>
              ) : isAuthor && request.accepted ? (
                <button
                  onClick={() => onComplete(request.id)}
                  className={`mt-5 w-full ${chunkyButton("bg-emerald-600")}`}
                >
                  <Check className="size-4" /> Konfirmasi Bantuan Selesai
                </button>
              ) : request.accepted ? (
                <div
                  className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 px-4 py-3 text-sm font-bold text-yellow-800 dark:text-yellow-300 ${BORDER}`}
                >
                  <Hourglass className="size-4" />
                  {isAcceptor
                    ? `Menunggu ${request.authorName} konfirmasi selesai`
                    : "Sudah diterima tetangga lain"}
                </div>
              ) : (
                <button
                  onClick={() => onAccept(request.id)}
                  disabled={isAuthor}
                  className={`mt-5 w-full ${chunkyButton(
                    isAuthor ? "bg-neutral-400 dark:bg-slate-600" : "bg-blue-600"
                  )}`}
                >
                  {isAuthor ? (
                    <>Ini Request Kamu Sendiri</>
                  ) : (
                    <>Terima Bantuan Ini ({request.reward} Karma setelah dikonfirmasi)</>
                  )}
                </button>
              )}

              {isAuthor && request.accepted && !request.completed && request.acceptorName && (
                <button
                  onClick={() =>
                    setReportTarget({ id: request.acceptedBy!, name: request.acceptorName! })
                  }
                  className={`mt-2.5 w-full ${chunkyButton(
                    "bg-white dark:bg-slate-800",
                    "text-red-600 dark:text-red-400"
                  )}`}
                >
                  <Flag className="size-4" /> Laporkan {request.acceptorName}
                </button>
              )}

              {isAuthor && !request.accepted && (
                <button
                  onClick={() => (confirmDelete ? onDelete(request.id) : setConfirmFor(request.id))}
                  className={`mt-2.5 w-full ${
                    confirmDelete
                      ? chunkyButton("bg-red-700")
                      : chunkyButton("bg-white dark:bg-slate-800", "text-red-600 dark:text-red-400")
                  }`}
                >
                  <Trash2 className="size-4" />
                  {confirmDelete ? "Yakin hapus? Tekan lagi" : "Hapus Request Ini"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ReportSheet
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={onReport}
      />

      {request && (
        <ChatOverlay
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          requestId={request.id}
          currentUserId={currentUser.id}
          otherParty={otherParty}
        />
      )}
    </>
  );
}
