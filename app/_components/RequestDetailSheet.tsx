"use client";

import { useState } from "react";
import { Check, Clock3, MapPin, MessageSquare, Radar, ShieldCheck, X } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { ChatOverlay } from "./ChatOverlay";
import { URGENCY_META, timeAgoLabel } from "../_lib/constants";
import { DEFAULT_ICON, ICONS_BY_NAME } from "../_lib/icons";
import { BORDER, PRESS, SHADOW_SM, chunkyButton } from "../_lib/ui";
import type { AppUser, HelpRequest } from "../_lib/types";

export function RequestDetailSheet({
  request,
  currentUser,
  onClose,
  onAccept,
}: {
  request: HelpRequest | null;
  currentUser: AppUser;
  onClose: () => void;
  onAccept: (id: string) => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const open = !!request;
  const meta = request ? URGENCY_META[request.urgency] : URGENCY_META.low;
  const Icon = request ? ICONS_BY_NAME[request.icon] ?? DEFAULT_ICON : null;

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
          onClick={onClose}
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
                  onClick={onClose}
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
                  <MapPin className="size-3.5" /> {request.distanceM}m dari kamu
                </span>
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3.5" /> {timeAgoLabel(request.postedMinAgo)}
                </span>
              </div>

              {/* Mock radius map */}
              <div className={`relative mt-4 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-blue-50 dark:bg-blue-950/40 ${BORDER}`}>
                <div className="absolute size-44 rounded-full border-2 border-blue-300 dark:border-blue-700" />
                <div className="absolute size-28 rounded-full border-2 border-blue-400 dark:border-blue-600" />
                <div className="absolute size-12 rounded-full border-2 border-blue-500" />
                <div className="relative flex flex-col items-center gap-1">
                  <MapPin className="size-6 text-red-600 dark:text-red-400" fill="currentColor" />
                  <span className={`rounded-md bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 ${BORDER}`}>
                    {request.distanceM}m
                  </span>
                </div>
                <Radar className="absolute right-3 top-3 size-3.5 text-blue-500 dark:text-blue-400" />
              </div>

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
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-900 text-neutral-600 dark:text-neutral-300 ${BORDER} ${PRESS}`}
                  >
                    <MessageSquare className="size-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onAccept(request.id)}
                disabled={request.accepted}
                className={`mt-5 w-full ${chunkyButton(request.accepted ? "bg-emerald-600" : "bg-blue-600")}`}
              >
                {request.accepted ? (
                  <>
                    <Check className="size-4" /> {isAcceptor ? "Kamu Sudah Menerima" : "Sudah Diterima"}
                  </>
                ) : (
                  <>Terima Bantuan Ini (+{request.reward} Karma)</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

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
