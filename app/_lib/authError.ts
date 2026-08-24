
const MESSAGES: Record<string, string> = {
  otp_expired: "Link konfirmasinya sudah kedaluwarsa. Daftar ulang atau minta link baru.",
  access_denied: "Link konfirmasinya ditolak. Kemungkinan sudah dipakai atau kedaluwarsa.",
  email_not_confirmed: "Emailmu belum dikonfirmasi. Buka link di email dulu, baru masuk.",
  server_error: "Server autentikasi sedang bermasalah. Coba lagi sebentar lagi.",
};

export function readAuthError(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = hash.get("error_code") ?? url.searchParams.get("error_code");
  const kind = hash.get("error") ?? url.searchParams.get("error");
  const description = hash.get("error_description") ?? url.searchParams.get("error_description");

  if (!code && !kind && !description) return null;
  return MESSAGES[code ?? ""] ?? MESSAGES[kind ?? ""] ?? description ?? "Link konfirmasi email gagal diproses.";
}
