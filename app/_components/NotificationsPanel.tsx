import { Bell, Coins, Gift, HeartHandshake, ShieldCheck, Siren, X } from "lucide-react";
import { BORDER, PRESS, SHADOW_SM } from "../_lib/ui";
import type { NotificationItem } from "../_lib/types";

const TYPE_META: Record<string, { icon: typeof Coins; color: string }> = {
  request_accepted: { icon: HeartHandshake, color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50" },
  karma_earned: { icon: Coins, color: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50" },
  panic_alert: { icon: Siren, color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50" },
  reward_redeemed: { icon: Gift, color: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50" },
  identity_verified: { icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50" },
};

export function NotificationsPanel({
  open,
  onClose,
  notifications,
}: {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}) {
  return (
    <div
      className={`absolute inset-0 z-40 flex justify-end transition-all duration-300 ${
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
        className={`relative flex h-full w-[85%] max-w-[320px] flex-col bg-white dark:bg-slate-900 border-l-4 border-neutral-900 dark:border-neutral-100 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-neutral-900 dark:border-neutral-100 px-5 py-4">
          <h2 className="font-pixel text-sm text-neutral-900 dark:text-neutral-50">Notifikasi</h2>
          <button
            onClick={onClose}
            className={`flex size-8 items-center justify-center rounded-md bg-white dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 ${BORDER} ${SHADOW_SM} ${PRESS}`}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Bell className="size-6 text-neutral-300 dark:text-neutral-600" />
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Belum ada notifikasi</p>
            </div>
          )}
          {notifications.map((n) => {
            const meta = TYPE_META[n.type] ?? { icon: Bell, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" };
            const Icon = meta.icon;
            return (
              <div key={n.id} className="flex items-start gap-3 rounded-lg px-1.5 py-3">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${BORDER} ${meta.color}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-neutral-700 dark:text-neutral-200">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">{n.time}</p>
                </div>
                {!n.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-600" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
