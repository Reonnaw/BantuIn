import { Flame, MapPin, Siren, Target, Trophy } from "lucide-react";
import { LogoLockup } from "./Logo";
import { BORDER, PANEL, PRESS, SHADOW, chunkyButton } from "../_lib/ui";

export function WelcomeScreen({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center overflow-y-auto bg-sky-50 dark:bg-slate-950 px-7 py-10">
      <div className="mx-auto w-full max-w-sm">
        <LogoLockup size={52} tagline="Bantuan sejauh 500 meter" />

        <div className="mt-10 space-y-3">
          <h1 className="font-pixel text-2xl leading-[1.4] tracking-tight text-neutral-900 dark:text-neutral-50">
            Anak kos nggak harus sendirian.
          </h1>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Minta tolong hal-hal kecil, kirim sinyal darurat, dan kumpulin Karma
            Baik dari tetangga kos sekitarmu.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2.5">
          <FeaturePill icon={MapPin} label="Radius 500m" color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50" />
          <FeaturePill icon={Siren} label="Panic Button" color="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50" />
          <FeaturePill icon={Trophy} label="Karma Baik" color="text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50" />
        </div>

        <div className="mt-10">
          <div className="mb-5 flex items-center justify-center">
            <div className={`flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 border-2 border-emerald-600 dark:border-emerald-400`}>
              <Target className="size-3 text-emerald-700 dark:text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                Didukung semangat SDG 11: Kota &amp; Komunitas Berkelanjutan
              </span>
            </div>
          </div>
          <button onClick={onRegister} className={`w-full ${chunkyButton("bg-blue-600")}`}>
            <Flame className="size-4" />
            Daftar Sekarang
          </button>
          <button
            onClick={onLogin}
            className={`mt-3 flex w-full items-center justify-center rounded-lg ${PANEL} py-3.5 text-sm font-bold text-neutral-800 dark:text-neutral-100 ${SHADOW} ${PRESS}`}
          >
            Sudah Punya Akun? Masuk
          </button>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({
  icon: Icon,
  label,
  color,
}: {
  icon: typeof MapPin;
  label: string;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-lg ${PANEL} p-3 text-center`}>
      <div className={`flex size-8 items-center justify-center rounded-md ${BORDER} ${color}`}>
        <Icon className="size-4" />
      </div>
      <span className="text-[10px] font-semibold leading-tight text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
    </div>
  );
}
