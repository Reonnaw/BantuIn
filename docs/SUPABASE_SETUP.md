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
- Trigger yang otomatis bikin baris `profiles` tiap ada user baru daftar
- 4 function RPC (`accept_help_request`, `redeem_reward`,
  `send_panic_alert`, `submit_identity_verification`) yang menjalankan
  logic karma & notifikasi secara atomik di server (jadi tidak bisa
  dimanipulasi dari client)
- Row Level Security (RLS) di semua tabel
- Realtime publication buat `help_requests`, `chat_messages`, `notifications`
- Bucket Storage privat `identity-docs` buat foto KTP/selfie
- Seed data katalog reward (Kopi Gratis, Voucher Cuci Baju, Badge Pahlawan Emas)

## 3. Matikan konfirmasi email (rekomendasi buat demo)

Default Supabase mewajibkan user klik link konfirmasi di email sebelum
bisa login. Untuk demo/development yang lebih mulus (langsung login
setelah daftar + verifikasi KTP instan), matikan ini:

1. **Authentication** > **Sign In / Providers** > **Email**.
2. Matikan toggle **Confirm email**.
3. Save.

Kalau kamu tetap mengaktifkan konfirmasi email, alur register di app
tetap jalan — user cuma akan diarahkan ke layar "Cek Email Kamu" dan
baru bisa login setelah klik link konfirmasi.

## 4. Ambil URL & anon key

1. **Project Settings** (ikon gear) > **API**.
2. Copy **Project URL** dan **anon public** key.
3. Di root repo, copy `.env.example` jadi `.env.local`:
   ```bash
   cp .env.example .env.local
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

Buka `http://localhost:3000`. Klik **Daftar Sekarang**, isi data diri +
upload foto KTP & selfie apa saja (untuk demo, sistem tidak benar-benar
membaca isi foto — auto "terverifikasi" setelah upload). Setelah itu
kamu otomatis masuk ke beranda dengan akun asli tersimpan di Supabase.

## 6. Cara kerja tiap fitur di balik layar

| Fitur di UI | Tabel / function Supabase |
| --- | --- |
| Daftar akun | `auth.users` (Supabase Auth) + trigger `handle_new_user` → `profiles` |
| Verifikasi KTP | Storage bucket `identity-docs` + `identity_verifications` + RPC `submit_identity_verification` |
| Feed "Minta Bantuan" | tabel `help_requests` (baca semua, insert punya sendiri) |
| Tombol "Terima" | RPC `accept_help_request` (atomik: ubah status, tambah karma, catat histori, kirim notifikasi ke pembuat request) |
| Riwayat Bantuan | tabel `karma_history` |
| Tukar Karma | RPC `redeem_reward` (cek karma cukup, kurangi karma, catat `reward_redemptions`) |
| Papan Peringkat | query `profiles` diurutkan berdasarkan `karma` |
| Tombol SOS | RPC `send_panic_alert` (catat `panic_alerts`, fan-out ke semua `notifications`) |
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

## 8. Keterbatasan yang disengaja (simplifikasi demo)

- **Jarak (`distanceM`)**: masih angka acak seperti versi mock, belum
  pakai geolocation asli. Kalau mau serius, tambah kolom `lat`/`lng` di
  `help_requests` & `profiles`, lalu hitung jarak pakai PostGIS
  (`earth_distance`) atau di client pakai Haversine formula.
- **Login demo cepat** (tombol pilih akun dummy) dihapus karena tidak ada
  lagi data dummy — semua user sekarang harus daftar beneran lewat
  Supabase Auth.
- **Verifikasi KTP** bersifat instan/kosmetik (tidak ada OCR/pengecekan
  isi foto sungguhan), sama seperti perilaku versi mock aslinya — cuma
  sekarang datanya benar-benar tersimpan di Storage & tabel
  `identity_verifications`.

## 9. Troubleshooting

- **Error saat `pnpm dev`/`pnpm build`: "NEXT_PUBLIC_SUPABASE_URL...
  belum diisi"** → `.env.local` belum diisi atau server dev belum
  di-restart setelah mengisi `.env.local` (env var cuma dibaca saat start).
- **Login berhasil tapi data kosong / error 401 di console** → pastikan
  `supabase/schema.sql` sudah di-Run (khususnya bagian RLS policies).
- **"new row violates row-level security policy"** saat bikin
  request/chat → pastikan kamu memanggil mutation dengan user yang lagi
  login (session aktif), bukan sebagai anon.
- **Upload foto KTP gagal / 403** → cek bucket `identity-docs` sudah
  terbuat (bagian 8 di `schema.sql`) dan policy storage sudah ke-apply.
