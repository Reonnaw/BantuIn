-- =====================================================================
-- BantuIn — Supabase database schema
-- =====================================================================
-- Cara pakai:
--   1. Buka project Supabase kamu > SQL Editor > New query.
--   2. Copy-paste SELURUH isi file ini, lalu klik "Run".
--   3. Aman dijalankan ulang (idempotent) — pakai IF NOT EXISTS / DROP ... IF EXISTS
--      di beberapa bagian supaya tidak error kalau di-run dua kali.
--   4. Setelah ini jalan, buat bucket Storage "identity-docs" (lihat bagian
--      STORAGE di paling bawah) — bucket harus dibuat lewat Dashboard atau
--      lewat SQL storage.buckets seperti di bawah.
--
-- Lihat docs/SUPABASE_SETUP.md untuk panduan lengkap step-by-step.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- untuk gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

-- Profil publik tiap user. 1 baris dibuat otomatis oleh trigger setiap
-- ada user baru daftar lewat Supabase Auth (lihat bagian TRIGGERS).
-- Data di sini boleh dibaca siapa saja yang login (dipakai buat nampilin
-- nama/avatar penulis request, leaderboard, dll) — TIDAK ada data sensitif
-- di sini (email/NIK/KTP disimpan terpisah, lihat identity_verifications).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'Anggota Baru Kos',
  avatar_color text not null default 'bg-blue-500',
  karma integer not null default 0,
  verified boolean not null default false,
  is_new boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil publik user, 1:1 dengan auth.users. Dibuat otomatis oleh trigger on_auth_user_created.';

-- Data verifikasi identitas (KTP). Dipisah dari profiles supaya NIK &
-- path foto tidak ikut ke-expose lewat policy "profiles bisa dibaca semua
-- orang". Hanya pemiliknya sendiri yang bisa baca baris ini.
create table if not exists public.identity_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  nik text not null,
  ktp_path text not null,
  selfie_path text not null,
  status text not null default 'verified' check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

comment on table public.identity_verifications is 'Data KYC privat per user. Hanya bisa dibaca oleh pemiliknya sendiri.';

-- Request bantuan yang tampil di beranda (feed).
create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default 'Tidak ada detail tambahan.' check (char_length(description) <= 200),
  urgency text not null check (urgency in ('low', 'medium', 'high')),
  reward integer not null check (reward > 0),
  icon text not null default 'Sparkles',
  distance_m integer not null default 50,
  status text not null default 'open' check (status in ('open', 'accepted', 'completed')),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.help_requests is 'Feed permintaan tolong. category (urgent/daily) dihitung di client dari urgency, tidak disimpan di DB.';

-- Ledger karma: setiap kali user menerima karma (karena membantu),
-- 1 baris ditambahkan di sini. Ini juga yang jadi sumber data "Riwayat
-- Bantuan" di halaman profil.
create table if not exists public.karma_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.help_requests (id) on delete set null,
  title text not null,
  karma_delta integer not null,
  created_at timestamptz not null default now()
);

comment on table public.karma_history is 'Riwayat perolehan karma per user. Hanya diisi lewat function accept_help_request().';

-- Chat 1:1 per request, antara pembuat request & yang menerima bantuan.
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is 'Pesan chat per help_request. Hanya author & accepted_by request itu yang boleh baca/tulis.';

-- Notifikasi in-app per user.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('request_accepted', 'karma_earned', 'panic_alert', 'reward_redeemed', 'identity_verified')),
  title text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'Notifikasi in-app. Diisi otomatis oleh function-function di bawah.';

-- Sinyal darurat (panic button).
create table if not exists public.panic_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text,
  created_at timestamptz not null default now()
);

comment on table public.panic_alerts is 'Log sinyal darurat. Insert lewat function send_panic_alert().';

-- Katalog reward yang bisa ditukar pakai karma. Diisi manual oleh admin
-- (lewat SQL editor / dashboard table editor) — TIDAK ada policy insert
-- untuk role authenticated.
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  cost integer not null check (cost > 0),
  icon text not null default 'Gift',
  created_at timestamptz not null default now()
);

comment on table public.rewards is 'Katalog reward. Kelola isinya lewat Table Editor di Supabase Dashboard.';

-- Riwayat penukaran reward, sekaligus mencegah race condition double-spend
-- karma (dicek & di-insert dalam 1 transaction di function redeem_reward()).
create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete restrict,
  cost integer not null,
  created_at timestamptz not null default now()
);

comment on table public.reward_redemptions is 'Riwayat tukar karma. Insert lewat function redeem_reward().';

-- ---------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------
create index if not exists idx_help_requests_status_created on public.help_requests (status, created_at desc);
create index if not exists idx_help_requests_author on public.help_requests (author_id);
create index if not exists idx_karma_history_user_created on public.karma_history (user_id, created_at desc);
create index if not exists idx_chat_messages_request_created on public.chat_messages (request_id, created_at asc);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_profiles_karma on public.profiles (karma desc);

-- ---------------------------------------------------------------------
-- 3. TRIGGER: auto-create profile saat ada user baru daftar
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_colors text[] := array['bg-blue-500', 'bg-emerald-500', 'bg-red-500', 'bg-sky-500', 'bg-teal-600', 'bg-lime-600'];
begin
  insert into public.profiles (id, name, role, avatar_color)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'role'), ''), 'Anggota Baru Kos'),
    v_colors[1 + floor(random() * array_length(v_colors, 1))::int]
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. FUNCTIONS (RPC) — semua logic yang harus atomik & tervalidasi
--    dijalankan lewat SECURITY DEFINER function, dipanggil dari client
--    pakai supabase.rpc(...). Ini yang membuat karma/status tidak bisa
--    dimanipulasi langsung dari client meskipun anon key ke-expose.
-- ---------------------------------------------------------------------

-- Terima sebuah help_request: ubah status, kasih karma, catat histori,
-- kirim notifikasi ke pembuat request. Semua dalam 1 transaction.
create or replace function public.accept_help_request(p_request_id uuid)
returns public.help_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
  v_acceptor_name text;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  select * into v_request from public.help_requests where id = p_request_id for update;

  if not found then
    raise exception 'Request tidak ditemukan.';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Request ini sudah diterima orang lain.';
  end if;

  if v_request.author_id = v_uid then
    raise exception 'Tidak bisa menerima request buatan sendiri.';
  end if;

  update public.help_requests
  set status = 'accepted', accepted_by = v_uid, accepted_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.karma_history (user_id, request_id, title, karma_delta)
  values (v_uid, v_request.id, v_request.title, v_request.reward);

  update public.profiles set karma = karma + v_request.reward where id = v_uid;

  select name into v_acceptor_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, title, data)
  values (
    v_request.author_id,
    'request_accepted',
    v_acceptor_name || ' menerima request ''' || v_request.title || ''' kamu',
    jsonb_build_object('request_id', v_request.id, 'acceptor_id', v_uid)
  );

  return v_request;
end;
$$;

-- Tukar karma dengan reward dari katalog. Row lock di profiles mencegah
-- double-spend kalau user klik tukar berkali-kali dengan cepat.
create or replace function public.redeem_reward(p_reward_id uuid)
returns public.reward_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reward public.rewards;
  v_karma integer;
  v_redemption public.reward_redemptions;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  select * into v_reward from public.rewards where id = p_reward_id;
  if not found then
    raise exception 'Reward tidak ditemukan.';
  end if;

  select karma into v_karma from public.profiles where id = v_uid for update;

  if v_karma < v_reward.cost then
    raise exception 'Karma kamu tidak cukup.';
  end if;

  update public.profiles set karma = karma - v_reward.cost where id = v_uid;

  insert into public.reward_redemptions (user_id, reward_id, cost)
  values (v_uid, p_reward_id, v_reward.cost)
  returning * into v_redemption;

  insert into public.notifications (user_id, type, title, data)
  values (
    v_uid,
    'reward_redeemed',
    'Kamu menukar ' || v_reward.cost || ' Karma dengan ' || v_reward.label,
    jsonb_build_object('reward_id', p_reward_id)
  );

  return v_redemption;
end;
$$;

-- Kirim sinyal darurat, fan-out notifikasi ke semua tetangga (semua
-- profile lain). Return jumlah tetangga yang kena notifikasi.
create or replace function public.send_panic_alert(p_message text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alert_id uuid;
  v_sender_name text;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  insert into public.panic_alerts (user_id, message)
  values (v_uid, p_message)
  returning id into v_alert_id;

  select name into v_sender_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, title, data)
  select
    p.id,
    'panic_alert',
    v_sender_name || ' mengirim sinyal darurat! Cek sekitar kamu.',
    jsonb_build_object('alert_id', v_alert_id, 'sender_id', v_uid)
  from public.profiles p
  where p.id <> v_uid;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Submit hasil verifikasi KTP (dipanggil setelah client upload foto KTU
-- & selfie ke Storage). Demo ini langsung set verified = true, meniru
-- alur "verifikasi instan" yang ada di UI.
create or replace function public.submit_identity_verification(
  p_nik text,
  p_ktp_path text,
  p_selfie_path text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  if p_nik !~ '^\d{16}$' then
    raise exception 'NIK harus 16 digit angka.';
  end if;

  insert into public.identity_verifications (user_id, nik, ktp_path, selfie_path, status)
  values (v_uid, p_nik, p_ktp_path, p_selfie_path, 'verified')
  on conflict (user_id) do update
    set nik = excluded.nik,
        ktp_path = excluded.ktp_path,
        selfie_path = excluded.selfie_path,
        status = 'verified',
        created_at = now();

  update public.profiles set verified = true where id = v_uid
  returning * into v_profile;

  insert into public.notifications (user_id, type, title, data)
  values (v_uid, 'identity_verified', 'Identitasmu berhasil diverifikasi. Selamat bergabung!', '{}'::jsonb);

  return v_profile;
end;
$$;

-- Grant execute ke role authenticated (default Supabase sudah begini utk
-- function baru, tapi kita eksplisit-kan biar jelas & aman).
grant execute on function public.accept_help_request(uuid) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.send_panic_alert(text) to authenticated;
grant execute on function public.submit_identity_verification(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.help_requests enable row level security;
alter table public.karma_history enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.panic_alerts enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;

-- profiles: semua user login boleh baca (buat nampilin nama/avatar
-- penulis request & leaderboard). Tidak ada policy insert/update/delete
-- untuk role authenticated — satu-satunya jalan masuk data adalah trigger
-- on_auth_user_created & function-function di atas (jalan sebagai owner
-- tabel, jadi otomatis lolos RLS).
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated
  using (true);

-- identity_verifications: hanya pemilik baris yang boleh baca.
drop policy if exists "identity_verifications_select_own" on public.identity_verifications;
create policy "identity_verifications_select_own" on public.identity_verifications
  for select to authenticated
  using (user_id = auth.uid());

-- help_requests: feed publik buat semua user login. Insert hanya boleh
-- bikin request atas nama diri sendiri. Update status (accepted/completed)
-- HANYA lewat accept_help_request(), makanya tidak ada policy update di
-- sini untuk role authenticated.
drop policy if exists "help_requests_select_all" on public.help_requests;
create policy "help_requests_select_all" on public.help_requests
  for select to authenticated
  using (true);

drop policy if exists "help_requests_insert_own" on public.help_requests;
create policy "help_requests_insert_own" on public.help_requests
  for insert to authenticated
  with check (author_id = auth.uid());

-- karma_history: cuma pemilik baris yang boleh baca riwayatnya sendiri.
drop policy if exists "karma_history_select_own" on public.karma_history;
create policy "karma_history_select_own" on public.karma_history
  for select to authenticated
  using (user_id = auth.uid());

-- chat_messages: hanya author request & yang menerima (accepted_by) yang
-- boleh baca/kirim pesan di request tersebut.
drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.help_requests hr
      where hr.id = chat_messages.request_id
        and (hr.author_id = auth.uid() or hr.accepted_by = auth.uid())
    )
  );

drop policy if exists "chat_messages_insert_participant" on public.chat_messages;
create policy "chat_messages_insert_participant" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.help_requests hr
      where hr.id = request_id
        and (hr.author_id = auth.uid() or hr.accepted_by = auth.uid())
    )
  );

-- notifications: cuma pemilik yang boleh baca & tandai sudah dibaca.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- panic_alerts: cuma pemilik yang boleh baca alert miliknya. Insert hanya
-- lewat send_panic_alert().
drop policy if exists "panic_alerts_select_own" on public.panic_alerts;
create policy "panic_alerts_select_own" on public.panic_alerts
  for select to authenticated
  using (user_id = auth.uid());

-- rewards: katalog publik, semua user login boleh lihat. Tidak ada policy
-- insert/update/delete — kelola lewat Dashboard (pakai service role).
drop policy if exists "rewards_select_all" on public.rewards;
create policy "rewards_select_all" on public.rewards
  for select to authenticated
  using (true);

-- reward_redemptions: cuma pemilik yang boleh baca riwayat tukarnya.
drop policy if exists "reward_redemptions_select_own" on public.reward_redemptions;
create policy "reward_redemptions_select_own" on public.reward_redemptions
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6. REALTIME — biar feed, chat, & notifikasi update otomatis tanpa
--    refresh (dipakai lewat supabase.channel(...).on('postgres_changes', ...))
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.help_requests;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------
-- 7. SEED DATA — katalog reward default (boleh diubah/ditambah lewat
--    Table Editor kapan saja).
-- ---------------------------------------------------------------------
insert into public.rewards (label, cost, icon)
select * from (values
  ('Kopi Gratis di Kedai Kos', 500, 'Coffee'),
  ('Voucher Cuci Baju 1x', 800, 'Sparkles'),
  ('Badge Pahlawan Emas', 1500, 'Medal')
) as v(label, cost, icon)
where not exists (select 1 from public.rewards);

-- ---------------------------------------------------------------------
-- 8. STORAGE — bucket privat buat foto KTP & selfie verifikasi.
--    Path file wajib berformat "{user_id}/ktp.jpg" & "{user_id}/selfie.jpg"
--    supaya policy di bawah bisa cocokin folder = auth.uid().
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('identity-docs', 'identity-docs', false)
on conflict (id) do nothing;

drop policy if exists "identity_docs_insert_own" on storage.objects;
create policy "identity_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "identity_docs_select_own" on storage.objects;
create policy "identity_docs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "identity_docs_update_own" on storage.objects;
create policy "identity_docs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- SELESAI. Lanjut ke docs/SUPABASE_SETUP.md untuk isi .env.local & jalanin app.
-- =====================================================================
