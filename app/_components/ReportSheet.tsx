"use client";

import { useState } from "react";
import { Flag, LoaderCircle, X } from "lucide-react";
import { BORDER, PRESS, SHADOW_SM, chunkyButton, inputClass } from "../_lib/ui";
import type { ReportReason } from "../_lib/types";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam atau promosi" },
  { value: "penipuan", label: "Penipuan" },
  { value: "pelecehan", label: "Pelecehan atau kasar" },
  { value: "identitas_palsu", label: "Identitas palsu" },
  { value: "lainnya", label: "Lainnya" },
];

export function ReportSheet({
  target,
  onClose,
  onSubmit,
}: {
  target: { id: string; name: string } | null;
  onClose: () => void;
  onSubmit: (input: { reportedId: string; reason: ReportReason; detail: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const open = !!target;

  const close = () => {
    setReason("spam");
    setDetail("");
    onClose();
  };

  const submit = async () => {
    if (!target || sending) return;
    setSending(true);
    try {
      await onSubmit({ reportedId: target.id, reason, detail });
      close();
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[65] flex items-end justify-center transition-all duration-300 ${
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
        {target && (
          <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex size-9 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/50 border-2 border-red-600 dark:border-red-400`}>
                  <Flag className="size-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-neutral-900 dark:text-neutral-50">
                    Laporkan {target.name}
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Laporanmu tidak terlihat oleh yang dilaporkan.
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Tutup"
                className={`flex size-8 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full rounded-md px-3.5 py-2.5 text-left text-xs font-bold border-2 transition-colors ${
                    reason === r.value
                      ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-600 dark:border-red-400"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Detail (opsional)
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Ceritakan apa yang terjadi..."
                rows={3}
                maxLength={500}
                className={`${inputClass} resize-none`}
              />
            </div>

            <button
              onClick={submit}
              disabled={sending}
              className={`mt-4 w-full ${chunkyButton("bg-red-600")}`}
            >
              {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Flag className="size-4" />}
              Kirim Laporan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
