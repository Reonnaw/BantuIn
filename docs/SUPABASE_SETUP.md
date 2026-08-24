# Setup Backend BantuIn (Supabase)

Panduan ini buat menghubungkan aplikasi BantuIn ke database & backend
Supabase yang asli (bukan mock data lagi). Ikuti urutan di bawah dari
atas ke bawah.

## 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) > Sign in > **New project**.
2. Kasih nama bebas (misal `bantuin`), pilih region terdekat (Singapore),
   set password database (simpan baik-baik, jarang dipakai langsung).
3. Tunggu sampai project selesai di-provision (±2 menit).

## 2. Jalankan SQL schema

1. Di sidebar project, buka **SQL Editor** > **New query**.
2. Buka file [`supabase/schema.sql`](../supabase/schema.sql) di repo ini,
   copy **seluruh isinya**, paste ke SQL Editor.
3. Klik **Run**. Kalau sukses akan muncul "Success. No rows returned".
4. File ini aman di-run ulang kapan saja (idempotent) kalau kamu perlu
   apply perubahan lagi.

Script ini otomatis membuat:
- Semua tabel (`profiles`, `help_requests`, `karma_history`, `chat_messages`,
  `notifications`, `panic_alerts`, `rewards`, `reward_redemptions`,
  `identity_verifications`)
  serta dua tabel lokasi (`help_request_locations`, `user_locations`)
- Trigger yang otomatis bikin baris `profiles` tiap ada user baru daftar
- Function RPC (`create_help_request`, `nearby_help_requests`,
  `accept_help_request`, `redeem_reward`, `send_panic_alert`,
  `set_my_location`, `submit_identity_verification`) yang menjalankan logic
  karma, jarak, & notifikasi di server — jadi reward, status, dan koordinat
  tidak bisa dikarang dari client
- Row Level Security (RLS) di semua tabel. Dua tabel lokasi sengaja tanpa
  policy sama sekali: koordinat tidak pernah bisa dibaca client, yang keluar
  cuma jaraknya dalam meter
- Realtime publication buat `help_requests`, `chat_messages`, `notifications`
- Seed data katalog reward (Kopi Gratis, Voucher Cuci Baju, Badge Pahlawan Emas)

Kalau kamu pernah menjalankan versi lama schema ini (yang masih menyimpan
NIK & foto KTP), script sekarang otomatis membuang kolom-kolom itu. Hapus
juga bucket Storage `identity-docs` beserta isinya lewat **Dashboard >
Storage** supaya tidak ada sisa data KTP.

## 3. Matikan konfirmasi email (rekomendasi buat demo)

Default Supabase mewajibkan user klik link konfirmasi di email sebelum
bisa login. Untuk demo/development yang lebih mulus (langsung login
setelah daftar + verifikasi KTP instan), matikan ini:

1. **Authentication** > **Sign In / Providers** > **Email**.
2. Matikan toggle **Confirm email**.
3. Save.

Kalau kamu tetap mengaktifkan konfirmasi email, alur register di app
tetap jalan — user cuma akan diarahkan ke layar "Cek Email Kamu" dan
baru bisa login setelah klik link konfirmasi. Tapi kalau begitu, **URL
tujuan link konfirmasinya harus dibereskan dulu**, lihat bagian berikutnya.

## 3b. Atur URL redirect (wajib kalau konfirmasi email aktif)

Link di email konfirmasi mengarahkan pengguna kembali ke aplikasi. Kalau
alamat tujuannya salah, link-nya mendarat di halaman mati atau ditolak, dan
pengguna kelihatan seperti "tidak terdaftar" padahal akunnya ada.

Buka **Authentication** > **URL Configuration**, lalu:

1. Set **Site URL** ke alamat yang benar-benar kamu pakai, misalnya
   `http://localhost:3000` untuk development.
2. Tambahkan semua alamat yang dipakai ke **Redirect URLs**, satu per baris:
   ```
   http://localhost:3000/**
   https://domain-produksi-kamu/**
   ```
3. Save.

App mengirim `emailRedirectTo` berisi origin tempat kamu mendaftar (lihat
`signUp` di `app/_lib/supabase/mutations.ts`), jadi link konfirmasi selalu
kembali ke host yang sama. Origin itu tetap harus ada di daftar **Redirect
URLs** di atas, kalau tidak Supabase menolaknya.

Kalau link-nya gagal, aplikasi sekarang menampilkan banner merah berisi alasan
dari Supabase (kedaluwarsa, ditolak, dan seterusnya) di atas layar, bukan diam
saja seperti sebelumnya.

## 4. Ambil URL & anon key

1. **Project Settings** (ikon gear) > **API**.
2. Copy **Project URL** dan **anon public** key.
3. Di root repo, copy `.env.local.example` jadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
4. Isi `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   `.env.local` sudah ada di `.gitignore`, jadi aman tidak ke-commit.

## 5. Install dependency & jalankan

```bash
pnpm install
pnpm dev
```

Buka `http://localhost:3000`. Klik **Daftar Sekarang**, isi data diri, lalu
jalankan langkah verifikasi (simulasi — tidak ada NIK atau foto KTP yang
diminta). Setelah itu kamu masuk ke beranda dengan akun asli di Supabase.

Lokasi memakai **GPS asli perangkat**: hook `app/_lib/useGeolocation.ts`
memanggil `navigator.geolocation.watchPosition()`, jadi browser akan meminta izin
lokasi saat pertama kali masuk. Browser hanya mengizinkan geolocation di
*secure context*, yaitu `http://localhost` atau domain HTTPS — kalau app
di-deploy lewat HTTP biasa, izin lokasi akan selalu ditolak. Jarak antar user,
filter radius feed, dan radius sinyal darurat dihitung di server dari koordinat
itu.

Peta di panel detail request memakai Leaflet dengan tile OpenStreetMap. Titik
request dikirim lewat kolom `request_lat` / `request_lng`, posisi kamu diambil
dari GPS di browser, dan peta zoom otomatis ke kotak yang memuat keduanya. Isi
`user_locations`, yaitu posisi terakhir tiap pengguna, tetap tidak pernah keluar
dari database.

## 6. Cara kerja tiap fitur di balik layar

| Fitur di UI | Tabel / function Supabase |
| --- | --- |
| Daftar akun | `auth.users` (Supabase Auth) + trigger `handle_new_user` → `profiles` |
| Verifikasi identitas (simulasi) | RPC `submit_identity_verification` + tabel `identity_verifications` (tanpa data KYC apa pun) |
| Feed "Minta Bantuan" | RPC `nearby_help_requests` (hitung jarak dari titik lokasi kamu, filter radius 3 km, kirim `request_lat`/`request_lng` untuk peta) |
| Bikin request | RPC `create_help_request` (reward dihitung server, maksimal 5 request per jam, koordinat masuk `help_request_locations`) |
| Tombol "Terima" | RPC `accept_help_request` (ubah status jadi `accepted` dan kirim notifikasi ke pembuat request; Karma belum dibayar) |
| Tombol "Konfirmasi Bantuan Selesai" | RPC `complete_help_request` (atomik: status jadi `completed`, tambah karma penolong, catat histori, kirim notifikasi; cuma pembuat request, cuma sekali) |
| Tombol bendera "Laporkan" | RPC `report_user` + tabel `user_reports` (1 laporan per pasangan pengguna per 24 jam, cuma pelapor yang bisa membacanya) |
| Hapus request sendiri | RPC `delete_help_request` (cuma pemilik, cuma status `open`, lokasi & chat ikut cascade) |
| Daftar "Request Kamu" di Profil | query `help_requests` difilter `author_id` |
| Riwayat Bantuan | tabel `karma_history` |
| Tukar Karma | RPC `redeem_reward` (cek karma cukup, kurangi karma, catat `reward_redemptions`) |
| Papan Peringkat | query `profiles` diurutkan berdasarkan `karma` |
| Tombol SOS | RPC `send_panic_alert` (catat `panic_alerts`, fan-out cuma ke user dalam radius 1 km, cooldown 5 menit per user). Judul notifikasinya diawali `[SIMULASI]` karena fiturnya masih berupa latihan |
| Chat per request | tabel `chat_messages`, hanya bisa diakses pembuat request & yang menerima |
| Panel Notifikasi | tabel `notifications`, realtime + tombol buka = tandai semua dibaca |

Feed request, chat, dan notifikasi semuanya **live** lewat Supabase
Realtime — tidak perlu refresh halaman untuk lihat update dari user lain.

## 7. Mengelola katalog reward

Reward (Kopi Gratis, dll) sengaja **tidak** bisa ditambah dari client
demi keamanan (biar user tidak bisa insert reward murah sendiri). Kelola
lewat **Table Editor > rewards** di Supabase Dashboard — tambah baris
baru dengan kolom `label`, `cost`, `icon`. Nilai `icon` harus salah satu
nama di `app/_lib/icons.ts` (`Coffee`, `Sparkles`, `Medal`, `Gift`, `Pill`,
`Flame`, `Dog`, `BookOpen`, `Wifi`) — kalau mau ikon baru, tambahkan dulu
import-nya di file itu.

## 8. Yang simulasi & yang asli

**Simulasi:**
- **Verifikasi identitas.** Tidak ada NIK, foto KTP, atau selfie yang diminta
  maupun disimpan. Badge "terverifikasi" di UI adalah bagian dari simulasi
  produk, bukan hasil KYC. Kalau suatu saat mau jadi produk sungguhan, pakai
  penyedia verifikasi identitas resmi — jangan menampung KTP sendiri tanpa
  memenuhi kewajiban UU PDP.
- **Tombol SOS.** Notifikasinya nyata dan sampai ke perangkat tetangga dalam
  radius 1 km, tapi ditandai `[SIMULASI]`. Tidak ada eskalasi atau penanganan
  darurat sungguhan di baliknya.
- **Katalog reward.** Karma benar-benar terpotong saat ditukar, tapi belum ada
  alur klaim/fulfillment di dunia nyata.
- **Moderasi laporan.** Laporan tersimpan sungguhan di `user_reports`, tapi
  belum ada antarmuka untuk menindaklanjutinya. Baca lewat **Table Editor >
  user_reports** di Supabase Dashboard.

**Asli:**
- **Lokasi.** Koordinat diambil dari GPS perangkat lewat Geolocation API
  browser, lalu disimpan di `user_locations` / `help_request_locations` — dua
  tabel yang RLS-nya aktif tanpa policy sama sekali, jadi tidak ada client yang
  bisa membacanya.
- **Perhitungan jarak.** Server menghitung jarak (haversine) dari koordinat
  request. Yang dikirim ke browser adalah jaraknya dalam meter plus titik
  request itu sendiri untuk peta.
- **Keamanan.** RLS aktif di semua tabel, semua perubahan data lewat function
  `security definer` yang memvalidasi `auth.uid()`, reward dihitung server,
  ada rate limit request (5/jam) dan cooldown panic alert (5 menit).

**Belum ada (kalau mau lanjut ke publik beneran):** penyelesaian request
(karma masih dibayar saat request diterima, bukan saat selesai), laporan/blokir
user, moderasi konten, dan halaman syarat & kebijakan privasi.

## 9. Troubleshooting

- **Error saat `pnpm dev`/`pnpm build`: "NEXT_PUBLIC_SUPABASE_URL...
  belum diisi"** → `.env.local` belum diisi atau server dev belum
  di-restart setelah mengisi `.env.local` (env var cuma dibaca saat start).
- **Login berhasil tapi data kosong / error 401 di console** → pastikan
  `supabase/schema.sql` sudah di-Run (khususnya bagian RLS policies).
- **`permission denied for table profiles` (kode 42501, HTTP 403), atau banner
  "Sesi kamu valid tapi profilnya gagal dimuat"** → role `authenticated` belum
  punya privilege tabel. Row level security cuma menyaring baris; privilege
  tabelnya terpisah. Jalankan ulang `supabase/schema.sql` — bagian
  `grant select on public.profiles to authenticated;` dan seterusnya sekarang
  sudah termasuk di sana.
- **"new row violates row-level security policy"** saat bikin
  request/chat → pastikan kamu memanggil mutation dengan user yang lagi
  login (session aktif), bukan sebagai anon.
- **Jarak tidak muncul / bertuliskan "Lokasi belum aktif"** → baris request
  lama dibuat sebelum tabel `help_request_locations` ada. Bikin request baru,
  atau hapus request lama lewat Table Editor.
- **"Sinyal darurat cuma bisa dikirim 1x per 5 menit"** → itu memang
  cooldown-nya, bukan bug.
- **Habis daftar, klik link di email, tapi akunnya seolah tidak terdaftar** →
  hampir selalu soal URL. Cek **Authentication** > **URL Configuration**:
  **Site URL** harus alamat yang kamu pakai dan origin-nya harus ada di
  **Redirect URLs** (lihat bagian 3b). Banner merah di atas layar akan
  menyebutkan alasan persisnya.
- **"Email not confirmed" saat login** → akunnya ada, tapi link konfirmasinya
  belum diklik. Buka link di email, atau matikan **Confirm email** (bagian 3).
- **Link konfirmasi bilang kedaluwarsa** → link Supabase sekali pakai dan
  berumur pendek. Daftar ulang untuk mendapat link baru.
