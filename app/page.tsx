"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Moon, Sun } from "lucide-react";
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
import type { AppUser } from "./_lib/types";

type AuthView = "welcome" | "login" | "register";

export default function Page() {
  const [authView, setAuthView] = useState<AuthView>("welcome");
  const [user, setUser] = useState<AppUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [dark, setDark] = useState(false);
  const desktop = useIsDesktop();

  const toggleDark = () => setDark((d) => !d);

  useEffect(() => {
    let active = true;

    async function loadFromSession(email: string | undefined, userId: string) {
      try {
        const profile = await fetchProfile(userId);
        if (active) setUser(toAppUser(profile, email ?? ""));
      } catch {
        if (active) setUser(null);
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

  // Once logged in and in desktop mode, the frame goes fullscreen and the
  // sidebar takes over these controls, so the floating corner buttons would
  // just collide with the in-app header.
  const showFloatingControls = !user || !desktop;

  return (
    <div className={dark ? "dark" : ""}>
      <div
        className={`min-h-dvh w-full bg-sky-100 dark:bg-slate-950 flex items-center justify-center ${
          desktop ? "p-0" : "p-4 sm:p-8"
        }`}
      >
        {showFloatingControls && (
          <div className="fixed top-4 right-4 z-[100] flex gap-2">
            <button
              onClick={toggleDark}
              aria-label="Ganti tema"
              className={`flex size-10 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-neutral-900 dark:text-neutral-50 ${BORDER} ${SHADOW_SM} ${PRESS}`}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        )}

        <div
          className={`relative w-full overflow-hidden bg-neutral-50 dark:bg-slate-900 flex flex-col ${
            desktop
              ? "h-dvh rounded-none border-0 shadow-none"
              : "max-w-[400px] min-h-dvh sm:min-h-[860px] sm:max-h-[860px] rounded-none sm:rounded-2xl border-0 sm:border-4 border-neutral-900 dark:border-neutral-100 sm:shadow-[8px_8px_0_0_#171717] dark:sm:shadow-[8px_8px_0_0_#f5f5f5]"
          }`}
        >
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
