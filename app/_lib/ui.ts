export const BORDER = "border-2 border-neutral-900 dark:border-neutral-100";
export const SHADOW = "shadow-[3px_3px_0_0_#171717] dark:shadow-[3px_3px_0_0_#f5f5f5]";
export const SHADOW_SM = "shadow-[2px_2px_0_0_#171717] dark:shadow-[2px_2px_0_0_#f5f5f5]";
export const PRESS =
  "transition-[transform,box-shadow] duration-100 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:active:translate-x-0 disabled:active:translate-y-0";

export const PANEL = `rounded-lg ${BORDER} bg-white dark:bg-slate-800`;

// textClass wajib bisa diganti: tombol berlatar putih perlu teks gelap. Dulu
// `text-white` selalu ikut dan bentrok dengan kelas warna yang ditambahkan di
// pemanggil, hasilnya teks putih di atas tombol putih alias tidak terbaca.
export function chunkyButton(color: string, textClass = "text-white") {
  return `inline-flex items-center justify-center gap-2 rounded-lg ${BORDER} ${color} px-4 py-3 text-sm font-bold ${textClass} ${SHADOW} ${PRESS} disabled:opacity-40 disabled:shadow-none`;
}

export const inputClass = `w-full rounded-lg ${BORDER} bg-neutral-50 dark:bg-slate-900 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-50 outline-none transition-colors focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500`;
