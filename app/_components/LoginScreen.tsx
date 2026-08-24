"use client";

import { useState } from "react";
import { AlertCircle, ChevronLeft, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { LogoMark } from "./Logo";
import { signIn } from "../_lib/supabase/mutations";
import { fetchProfile } from "../_lib/supabase/queries";
import { toAppUser } from "../_lib/supabase/adapters";
import { BORDER, PRESS, SHADOW_SM, chunkyButton, inputClass } from "../_lib/ui";
import type { AppUser } from "../_lib/types";

export function LoginScreen({
  onBack,
  onAuthenticated,
  onGoRegister,
}: {
  onBack: () => void;
  onAuthenticated: (user: AppUser) => void;
  onGoRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 2 && password.length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const { user: authUser } = await signIn(email.trim(), password);
      if (!authUser) throw new Error("Login gagal, coba lagi.");
      const profile = await fetchProfile(authUser.id);
      onAuthenticated(toAppUser(profile, authUser.email ?? email.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email atau kata sandi salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-sky-50 dark:bg-slate-950 px-6 py-6">
      <div className="mx-auto w-full max-w-sm flex-1">
        <button
          onClick={onBack}
          className={`flex size-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-200 ${BORDER} ${SHADOW_SM} ${PRESS}`}
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="mt-5 flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <h1 className="font-pixel text-base text-neutral-900 dark:text-neutral-50">
              Selamat Datang Kembali
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Masuk buat lanjut bantu tetangga kos
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3.5">
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/50 border-2 border-red-600 dark:border-red-400 px-3 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="dinda@kosmelati.id"
              type="email"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                type={showPassword ? "text" : "password"}
                placeholder="········"
                className={`${inputClass} pr-11`}
              />
              <button
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`mt-1 w-full ${chunkyButton("bg-blue-600")}`}
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : "Masuk"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Belum punya akun?{" "}
          <button onClick={onGoRegister} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Daftar di sini
          </button>
        </p>
      </div>
    </div>
  );
}
