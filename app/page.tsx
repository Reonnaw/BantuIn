"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LoaderCircle, Moon, Sun, TriangleAlert, X } from "lucide-react";
import { WelcomeScreen } from "./_components/WelcomeScreen";
import { LoginScreen } from "./_components/LoginScreen";
import { RegisterFlow } from "./_components/RegisterFlow";
import { BantuInApp } from "./_components/BantuInApp";
import { BORDER, PRESS, SHADOW_SM } from "./_lib/ui";
import { useIsDesktop } from "./_lib/useIsDesktop";
import { supabase } from "./_lib/supabase/client";
import { fetchProfile } from "./_lib/supabase/queries";
import { signOut } from "./_lib/supabase/mutations";
import { toAppUser } from "./_lib/supabase/adapters";
import { readAuthError } from "./_lib/authError";
import type { AppUser } from "./_lib/types";

type AuthView = "welcome" | "login" | "register";

const themeListeners = new Set<() => void>();
const subscribeTheme = (cb: () => void) => {
  themeListeners.add(cb);
  return () => {
    themeListeners.delete(cb);
  };
};
const isDark = () => document.documentElement.classList.contains("dark");

const hashListeners = new Set<() => void>();
const subscribeUrl = (cb: () => void) => {
  hashListeners.add(cb);
  window.addEventListener("hashchange", cb);
  return () => {
    hashListeners.delete(cb);
    window.removeEventListener("hashchange", cb);
  };
};
const urlAuthError = () => readAuthError(window.location.href);

export default function Page() {
  const [authView, setAuthView] = useState<AuthView>("welcome");
  const [user, setUser] = useState<AppUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const desktop = useIsDesktop();
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => false);
  const linkError = useSyncExternalStore(subscribeUrl, urlAuthError, () => null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Kalau penggunanya sudah masuk, kegagalan sesaat tadi tidak relevan lagi:
  // banner merah yang menempel di atas aplikasi yang jalan normal cuma bikin
  // bingung.
  const authError = user || dismissed ? null : sessionError ?? linkError;

  const dismissAuthError = () => {
    setDismissed(true);
    setSessionError(null);
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
      hashListeners.forEach((cb) => cb());
    }
  };

  const toggleDark = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    // Cookie, bukan localStorage, supaya server bisa ikut membacanya saat render
    // dan tidak perlu skrip inline anti-kedip di root layout.
    document.cookie = `theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    themeListeners.forEach((cb) => cb());
  };

  useEffect(() => {
    let active = true;

    async function loadFromSession(email: string | undefined, userId: string) {
      try {
        const profile = await fetchProfile(userId);
        if (active) {
          setUser(toAppUser(profile, email ?? ""));
          setSessionError(null);
        }
      } catch (err) {
        // Sebelumnya error di sini ditelan diam-diam, jadi sesi yang valid tapi
        // profilnya gagal dimuat tampak seperti akun yang tidak terdaftar.
        if (!active) return;
        setUser(null);
        setSessionError(
          err instanceof Error
            ? `Sesi kamu valid tapi profilnya gagal dimuat: ${err.message}`
            : "Sesi kamu valid tapi profilnya gagal dimuat."
        );
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session?.user) {
        loadFromSession(session.user.email, session.user.id).finally(() => {
          if (active) setCheckingSession(false);
        });
      } else if (active) {
        setCheckingSession(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setAuthView("welcome");
        return;
      }
      if (session?.user) {
        loadFromSession(session.user.email, session.user.id);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const showFloatingControls = !user;

  return (
    <div>
      <div className="min-h-dvh w-full bg-sky-100 dark:bg-slate-950">
        {showFloatingControls && (
          <div className="fixed top-12 right-4 z-[100] flex gap-2">
            <button
              onClick={toggleDark}
              aria-label="Ganti tema"
              className={`flex size-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-neutral-900 dark:text-neutral-50 ${BORDER} ${SHADOW_SM} ${PRESS}`}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        )}

        <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-neutral-50 dark:bg-slate-900">
          <div className="shrink-0 border-b-2 border-neutral-900 dark:border-neutral-100 bg-yellow-400 px-4 py-2 text-center">
            <p className="text-[11px] font-bold leading-snug text-neutral-900">
              MODE DEMO. JANGAN DIPAKAI UNTUK KEBUTUHAN SUNGGUHAN.
            </p>
            <p className="mt-0.5 text-[10px] font-medium leading-snug text-neutral-900">
              Verifikasi identitas dan tombol SOS masih simulasi, jadi tidak ada bantuan yang
              benar-benar dikerahkan. Untuk keadaan darurat hubungi 112. Lokasi memakai GPS asli
              perangkat kamu.
            </p>
          </div>
          {authError && (
            <div className="flex shrink-0 items-start gap-2 border-b-2 border-neutral-900 dark:border-neutral-100 bg-red-100 dark:bg-red-950/60 px-4 py-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-400" />
              <p className="flex-1 text-[11px] font-semibold leading-snug text-red-800 dark:text-red-300">
                {authError}
              </p>
              <button
                onClick={dismissAuthError}
                aria-label="Tutup peringatan"
                className="shrink-0 text-red-700 dark:text-red-400"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          {checkingSession ? (
            <div className="flex flex-1 items-center justify-center">
              <LoaderCircle className="size-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : user ? (
            <BantuInApp
              key={user.id}
              user={user}
              desktop={desktop}
              dark={dark}
              onToggleDark={toggleDark}
              onLogout={() => {
                signOut().finally(() => {
                  setUser(null);
                  setAuthView("welcome");
                });
              }}
            />
          ) : authView === "welcome" ? (
            <WelcomeScreen onLogin={() => setAuthView("login")} onRegister={() => setAuthView("register")} />
          ) : authView === "login" ? (
            <LoginScreen
              onBack={() => setAuthView("welcome")}
              onAuthenticated={setUser}
              onGoRegister={() => setAuthView("register")}
            />
          ) : (
            <RegisterFlow
              onBack={() => setAuthView("welcome")}
              onGoLogin={() => setAuthView("login")}
              onAuthenticated={setUser}
            />
          )}
        </div>
      </div>
    </div>
  );
}
