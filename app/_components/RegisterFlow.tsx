"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  FileCheck,
  IdCard,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { signUp, uploadIdentityDoc, submitIdentityVerification } from "../_lib/supabase/mutations";
import { fetchProfile } from "../_lib/supabase/queries";
import { toAppUser } from "../_lib/supabase/adapters";
import { BORDER, PRESS, SHADOW_SM, chunkyButton, inputClass } from "../_lib/ui";
import type { AppUser } from "../_lib/types";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Data Diri", "Verifikasi KTP", "Selesai"];

export function RegisterFlow({
  onBack,
  onGoLogin,
  onAuthenticated,
}: {
  onBack: () => void;
  onGoLogin: () => void;
  onAuthenticated: (user: AppUser) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 fields
  const [nik, setNik] = useState("");
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const ktpInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const ktpPreview = useMemo(() => (ktpFile ? URL.createObjectURL(ktpFile) : null), [ktpFile]);
  const selfiePreview = useMemo(
    () => (selfieFile ? URL.createObjectURL(selfieFile) : null),
    [selfieFile]
  );

  useEffect(() => {
    return () => {
      if (ktpPreview) URL.revokeObjectURL(ktpPreview);
    };
  }, [ktpPreview]);

  useEffect(() => {
    return () => {
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;

    (async () => {
      try {
        const { user: authUser, session } = await signUp(email.trim(), password, name.trim());
        if (!authUser) throw new Error("Registrasi gagal, coba lagi.");

        if (!session) {
          // Project Supabase-nya mewajibkan konfirmasi email, jadi belum
          // ada session aktif buat lanjut upload KTP sekarang.
          if (!cancelled) {
            setNeedsEmailConfirm(true);
            setStep(4);
          }
          return;
        }

        const ktpPath = await uploadIdentityDoc(authUser.id, "ktp", ktpFile as File);
        const selfiePath = await uploadIdentityDoc(authUser.id, "selfie", selfieFile as File);
        await submitIdentityVerification(nik, ktpPath, selfiePath);

        const profile = await fetchProfile(authUser.id);
        if (!cancelled) {
          setPendingUser(toAppUser(profile, authUser.email ?? email.trim()));
          setStep(4);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi.");
          setStep(2);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const step1Valid = name.trim().length > 1 && email.trim().length > 3 && password.length >= 6;
  const nikValid = /^\d{16}$/.test(nik);
  const step2Valid = nikValid && !!ktpFile && !!selfieFile;

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  const finish = () => {
    if (pendingUser) onAuthenticated(pendingUser);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-sky-50 dark:bg-slate-950 px-6 py-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (step === 1 ? onBack() : setStep((s) => (s - 1) as Step))}
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-neutral-700 dark:text-neutral-200 ${BORDER} ${SHADOW_SM} ${PRESS}`}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex-1">
            <div className={`h-2.5 w-full overflow-hidden rounded-md ${BORDER} bg-neutral-100 dark:bg-slate-800`}>
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
        {step < 4 && (
          <p className="mt-2.5 text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
            Langkah {step}/3: {STEP_LABELS[step - 1]}
          </p>
        )}

        {step === 1 && (
          <div className="mt-5">
            <h1 className="font-pixel text-base text-neutral-900 dark:text-neutral-50">
              Buat Akun BantuIn
            </h1>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Biar tetangga kos tau siapa yang minta dan ngasih bantuan.
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/50 border-2 border-red-600 dark:border-red-400 px-3 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-5 space-y-3.5">
              <Field label="Nama Lengkap">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth. Dinda Ayu"
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kamu@email.com"
                  type="email"
                  className={inputClass}
                />
              </Field>
              <Field label="Kata Sandi">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Minimal 6 karakter"
                  className={inputClass}
                />
              </Field>
            </div>

            <button
              onClick={() => {
                setError(null);
                if (step1Valid) setStep(2);
              }}
              disabled={!step1Valid}
              className={`mt-6 w-full ${chunkyButton("bg-blue-600")}`}
            >
              Lanjut ke Verifikasi KTP
            </button>
            <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
              Sudah punya akun?{" "}
              <button onClick={onGoLogin} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                Masuk
              </button>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5">
            <h1 className="font-pixel text-base text-neutral-900 dark:text-neutral-50">
              Verifikasi Identitas
            </h1>
            <div className={`mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-3 border-2 border-emerald-600 dark:border-emerald-400`}>
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                Verifikasi KTP membuat BantuIn lebih aman. Cuma anak kos asli yang bisa minta dan
                kasih bantuan di radius kamu.
              </p>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/50 border-2 border-red-600 dark:border-red-400 px-3 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-4 space-y-3.5">
              <Field label="NIK (Nomor Induk Kependudukan)">
                <input
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  placeholder="16 digit sesuai KTP"
                  inputMode="numeric"
                  className={inputClass}
                />
                <p
                  className={`mt-1 text-[11px] font-medium ${
                    nik.length === 0
                      ? "text-neutral-400"
                      : nikValid
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-yellow-700 dark:text-yellow-400"
                  }`}
                >
                  {nik.length}/16 digit
                </p>
              </Field>

              <UploadTile
                label="Foto KTP"
                hint="Pastikan foto jelas, semua tulisan terbaca"
                icon={IdCard}
                file={ktpFile}
                preview={ktpPreview}
                inputRef={ktpInputRef}
                onFile={setKtpFile}
              />
              <UploadTile
                label="Selfie Pegang KTP"
                hint="Wajah dan KTP kelihatan jelas dalam satu foto"
                icon={Camera}
                file={selfieFile}
                preview={selfiePreview}
                inputRef={selfieInputRef}
                onFile={setSelfieFile}
              />
            </div>

            <button
              onClick={() => {
                setError(null);
                if (step2Valid) setStep(3);
              }}
              disabled={!step2Valid}
              className={`mt-6 w-full ${chunkyButton("bg-blue-600")}`}
            >
              <ShieldCheck className="size-4" />
              Kirim Verifikasi
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <LoaderCircle className="size-12 animate-spin text-blue-600 dark:text-blue-400" strokeWidth={2} />
            <p className="mt-5 text-sm font-bold text-neutral-800 dark:text-neutral-100">
              Memverifikasi KTP kamu...
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Biasanya cuma butuh beberapa detik
            </p>
          </div>
        )}

        {step === 4 && needsEmailConfirm && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className={`flex size-20 items-center justify-center rounded-lg bg-blue-600 ${BORDER}`}>
              <Mail className="size-9 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="mt-4 font-pixel text-base text-neutral-900 dark:text-neutral-50">
              Cek Email Kamu
            </h1>
            <p className="mt-2.5 max-w-[26rem] text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Kami sudah kirim link konfirmasi ke {email.trim()}. Klik link itu dulu, baru masuk
              pakai email &amp; kata sandi kamu tadi.
            </p>
            <button onClick={onGoLogin} className={`mt-8 w-full ${chunkyButton("bg-blue-600")}`}>
              Ke Halaman Masuk
            </button>
          </div>
        )}

        {step === 4 && !needsEmailConfirm && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className={`flex size-20 items-center justify-center rounded-lg bg-emerald-500 ${BORDER}`}>
              <Check className="size-9 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="mt-4 font-pixel text-base text-neutral-900 dark:text-neutral-50">
              Akun Terverifikasi!
            </h1>
            <p className="mt-2.5 max-w-[26rem] text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Selamat datang, {name.trim() || "tetangga baru"}. Kamu sekarang bagian dari
              komunitas BantuIn di radius 500m.
            </p>

            <div className={`mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 border-2 border-emerald-600 dark:border-emerald-400`}>
              <ShieldCheck className="size-3.5 text-emerald-700 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Identitas Terverifikasi
              </span>
            </div>

            <button onClick={finish} className={`mt-8 w-full ${chunkyButton("bg-blue-600")}`}>
              Mulai Bantu Tetangga
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function UploadTile({
  label,
  hint,
  icon: Icon,
  file,
  preview,
  inputRef,
  onFile,
}: {
  label: string;
  hint: string;
  icon: typeof IdCard;
  file: File | null;
  preview: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File | null) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-neutral-400 dark:border-neutral-600 bg-neutral-50 dark:bg-slate-900 p-3.5 text-left transition-colors hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
        >
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-800 ${BORDER}`}>
            <Icon className="size-4.5 text-neutral-500 dark:text-neutral-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200">
              <Upload className="size-3" /> Unggah Foto
            </p>
            <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{hint}</p>
          </div>
        </button>
      ) : (
        <div className={`flex w-full items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-3 border-2 border-emerald-600 dark:border-emerald-400`}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={label}
              className={`size-10 shrink-0 rounded-md object-cover ${BORDER}`}
            />
          ) : (
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-md bg-white dark:bg-slate-800 ${BORDER}`}>
              <FileCheck className="size-4.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Check className="size-3" /> Terunggah
            </p>
            <p className="truncate text-[11px] text-emerald-700/80 dark:text-emerald-400/80">{file.name}</p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="shrink-0 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 underline underline-offset-2"
          >
            Ganti
          </button>
        </div>
      )}
    </div>
  );
}
