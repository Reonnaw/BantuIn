"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, MessageSquareOff, SendHorizontal, ShieldCheck } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { BORDER, PRESS, SHADOW_SM } from "../_lib/ui";
import { supabase } from "../_lib/supabase/client";
import { fetchChatMessages } from "../_lib/supabase/queries";
import { sendChatMessage } from "../_lib/supabase/mutations";
import { toChatMessage } from "../_lib/supabase/adapters";
import type { ChatMessageRow } from "../_lib/supabase/types";
import type { ChatMessage } from "../_lib/types";

interface OtherParty {
  name: string;
  initial: string;
  color: string;
}

export function ChatOverlay({
  open,
  onClose,
  requestId,
  currentUserId,
  otherParty,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  currentUserId: string;
  otherParty: OtherParty | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canChat = !!otherParty;

  useEffect(() => {
    if (!open || !canChat) return;
    let active = true;

    fetchChatMessages(requestId)
      .then((rows) => {
        if (active) setMessages(rows.map((r) => toChatMessage(r, currentUserId)));
      })
      .catch(() => {
        if (active) setMessages([]);
      });

    const channel = supabase
      .channel(`chat-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, toChatMessage(row, currentUserId)]));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [open, canChat, requestId, currentUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      const row = await sendChatMessage(requestId, currentUserId, text);
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, toChatMessage(row, currentUserId)]));
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[80] flex justify-center transition-all duration-300 ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`absolute inset-0 bg-neutral-900/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative flex h-full w-full max-w-[400px] flex-col bg-white dark:bg-slate-900 transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex shrink-0 items-center gap-3 border-b-2 border-neutral-900 dark:border-neutral-100 px-4 py-3.5">
          <button
            onClick={onClose}
            className={`flex size-8 items-center justify-center rounded-md bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
          >
            <ChevronLeft className="size-4" />
          </button>
          {otherParty ? (
            <>
              <AvatarBadge initial={otherParty.initial} color={otherParty.color} size="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-neutral-800 dark:text-neutral-100">{otherParty.name}</p>
                <p className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3" /> Chat aktif
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">Chat</p>
          )}
        </div>

        {!canChat ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
            <MessageSquareOff className="size-8 text-neutral-300 dark:text-neutral-600" />
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Chat aktif begitu ada yang menerima request ini.
            </p>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="mt-6 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
                  Belum ada pesan. Mulai obrolan yuk!
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg border-2 border-neutral-900 dark:border-neutral-100 px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.fromMe
                        ? "bg-blue-600 text-white"
                        : "bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-neutral-100"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t-2 border-neutral-900 dark:border-neutral-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Tulis pesan..."
                className={`flex-1 rounded-md ${BORDER} bg-neutral-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-neutral-900 dark:text-neutral-50 outline-none transition-colors focus:ring-2 focus:ring-blue-500`}
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className={`flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white ${BORDER} ${PRESS} disabled:opacity-40`}
              >
                <SendHorizontal className="size-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
