create extension if not exists "pgcrypto";

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

create table if not exists public.identity_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'verified' check (status in ('pending', 'verified', 'rejected')),
  simulated boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.identity_verifications drop column if exists nik;
alter table public.identity_verifications drop column if exists ktp_path;
alter table public.identity_verifications drop column if exists selfie_path;
alter table public.identity_verifications add column if not exists simulated boolean not null default true;

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default 'Tidak ada detail tambahan.' check (char_length(description) <= 200),
  urgency text not null check (urgency in ('low', 'medium', 'high')),
  reward integer not null check (reward > 0),
  icon text not null default 'Sparkles',
  status text not null default 'open' check (status in ('open', 'accepted', 'completed')),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.help_requests drop column if exists distance_m;
alter table public.help_requests add column if not exists completed_at timestamptz;

alter table public.profiles add column if not exists home_lat double precision check (home_lat between -90 and 90);
alter table public.profiles add column if not exists home_lng double precision check (home_lng between -180 and 180);

create table if not exists public.help_request_locations (
  request_id uuid primary key references public.help_requests (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_at timestamptz not null default now()
);

create table if not exists public.user_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);

create table if not exists public.karma_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.help_requests (id) on delete set null,
  title text not null,
  karma_delta integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('request_accepted', 'karma_earned', 'panic_alert', 'reward_redeemed', 'identity_verified')),
  title text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.panic_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  cost integer not null check (cost > 0),
  icon text not null default 'Gift',
  created_at timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete restrict,
  cost integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.help_requests (id) on delete set null,
  reason text not null check (reason in ('spam', 'penipuan', 'pelecehan', 'identitas_palsu', 'lainnya')),
  detail text check (detail is null or char_length(detail) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint user_reports_no_self check (reporter_id <> reported_id)
);

create index if not exists idx_help_requests_status_created on public.help_requests (status, created_at desc);
create index if not exists idx_help_requests_author on public.help_requests (author_id);
create index if not exists idx_karma_history_user_created on public.karma_history (user_id, created_at desc);
create index if not exists idx_chat_messages_request_created on public.chat_messages (request_id, created_at asc);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_profiles_karma on public.profiles (karma desc);
create index if not exists idx_user_reports_reporter_created on public.user_reports (reporter_id, created_at desc);
create index if not exists idx_user_reports_reported on public.user_reports (reported_id, status);

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

create or replace function public.haversine_m(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

create or replace function public.set_my_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Koordinat tidak valid.';
  end if;

  insert into public.user_locations (user_id, lat, lng)
  values (v_uid, p_lat, p_lng)
  on conflict (user_id) do update
    set lat = excluded.lat,
        lng = excluded.lng,
        updated_at = now();
end;
$$;

create or replace function public.set_home_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Koordinat tidak valid.';
  end if;

  update public.profiles set home_lat = p_lat, home_lng = p_lng where id = v_uid;
  if not found then
    raise exception 'Profil tidak ditemukan.';
  end if;
end;
$$;

create or replace function public.clear_home_location()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;
  update public.profiles set home_lat = null, home_lng = null where id = v_uid;
end;
$$;

drop function if exists public.create_help_request(text, text, text, double precision, double precision);

create or replace function public.create_help_request(
  p_title text,
  p_description text,
  p_urgency text,
  p_lat double precision,
  p_lng double precision,
  p_use_home boolean default false
)
returns public.help_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_desc text := nullif(trim(coalesce(p_description, '')), '');
  v_recent integer;
  v_request public.help_requests;
  v_home_lat double precision;
  v_home_lng double precision;
  v_dist double precision;
  v_final_lat double precision;
  v_final_lng double precision;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  if char_length(v_title) < 3 or char_length(v_title) > 80 then
    raise exception 'Judul harus 3-80 karakter.';
  end if;

  if v_desc is not null and char_length(v_desc) > 200 then
    raise exception 'Deskripsi maksimal 200 karakter.';
  end if;

  if p_urgency is null or p_urgency not in ('low', 'medium', 'high') then
    raise exception 'Tingkat urgensi tidak dikenal.';
  end if;

  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Lokasi belum aktif. Izinkan akses lokasi dulu ya.';
  end if;

  if coalesce(p_use_home, false) then
    select home_lat, home_lng into v_home_lat, v_home_lng from public.profiles where id = v_uid;
    if v_home_lat is null or v_home_lng is null then
      raise exception 'Atur titik kos dulu di Profil ya (Titik Kos belum diatur).';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_home_lat, v_home_lng);
    if v_dist < 100 then
      raise exception 'Kamu lagi di kos (%.0m dari titik kos). Titik kos cuma bisa dipakai kalau kamu lagi jauh (>100m) dari kos.', v_dist;
    end if;
    v_final_lat := v_home_lat;
    v_final_lng := v_home_lng;
  else
    v_final_lat := p_lat;
    v_final_lng := p_lng;
  end if;

  select count(*) into v_recent
  from public.help_requests
  where author_id = v_uid and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'Maksimal 5 request per jam. Coba lagi nanti ya.';
  end if;

  insert into public.help_requests (author_id, title, description, urgency, reward, icon)
  values (
    v_uid,
    v_title,
    coalesce(v_desc, 'Tidak ada detail tambahan.'),
    p_urgency,
    case p_urgency when 'high' then 50 when 'medium' then 30 else 15 end,
    'Sparkles'
  )
  returning * into v_request;

  insert into public.help_request_locations (request_id, lat, lng)
  values (v_request.id, v_final_lat, v_final_lng);

  return v_request;
end;
$$;

drop function if exists public.nearby_help_requests(double precision, double precision, integer, integer);

create or replace function public.nearby_help_requests(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m integer default 3000,
  p_limit integer default 100
)
returns table (
  id uuid,
  author_id uuid,
  title text,
  description text,
  urgency text,
  reward integer,
  icon text,
  status text,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz,
  distance_m integer,
  request_lat double precision,
  request_lng double precision,
  author_name text,
  author_color text,
  author_verified boolean,
  acceptor_name text,
  acceptor_color text,
  acceptor_verified boolean
)
language sql
security definer
set search_path = public
as $$
  select
    hr.id,
    hr.author_id,
    hr.title,
    hr.description,
    hr.urgency,
    hr.reward,
    hr.icon,
    hr.status,
    hr.accepted_by,
    hr.accepted_at,
    hr.created_at,
    case
      when p_lat is null or p_lng is null or loc.lat is null then null
      else round(public.haversine_m(p_lat, p_lng, loc.lat, loc.lng))::integer
    end as distance_m,
    loc.lat as request_lat,
    loc.lng as request_lng,
    author.name,
    author.avatar_color,
    author.verified,
    acceptor.name,
    acceptor.avatar_color,
    acceptor.verified
  from public.help_requests hr
  join public.profiles author on author.id = hr.author_id
  left join public.profiles acceptor on acceptor.id = hr.accepted_by
  left join public.help_request_locations loc on loc.request_id = hr.id
  where auth.uid() is not null
    and (
      p_lat is null
      or p_lng is null
      or loc.lat is null
      or public.haversine_m(p_lat, p_lng, loc.lat, loc.lng) <= greatest(coalesce(p_radius_m, 3000), 100)
    )
  order by
    case
      when p_lat is null or p_lng is null or loc.lat is null then null
      else public.haversine_m(p_lat, p_lng, loc.lat, loc.lng)
    end asc nulls last,
    hr.created_at desc
  limit least(coalesce(p_limit, 100), 200);
$$;

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

  select name into v_acceptor_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, title, data)
  values (
    v_request.author_id,
    'request_accepted',
    v_acceptor_name || ' menerima request ''' || v_request.title || ''' kamu. Konfirmasi kalau bantuannya sudah selesai.',
    jsonb_build_object('request_id', v_request.id, 'acceptor_id', v_uid)
  );

  return v_request;
end;
$$;

create or replace function public.report_user(
  p_reported_id uuid,
  p_reason text,
  p_detail text default null,
  p_request_id uuid default null
)
returns public.user_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_detail text := nullif(trim(coalesce(p_detail, '')), '');
  v_recent integer;
  v_report public.user_reports;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  if p_reported_id is null or not exists (select 1 from public.profiles where id = p_reported_id) then
    raise exception 'Pengguna yang dilaporkan tidak ditemukan.';
  end if;

  if p_reported_id = v_uid then
    raise exception 'Tidak bisa melaporkan diri sendiri.';
  end if;

  if p_reason is null or p_reason not in ('spam', 'penipuan', 'pelecehan', 'identitas_palsu', 'lainnya') then
    raise exception 'Alasan laporan tidak dikenal.';
  end if;

  if v_detail is not null and char_length(v_detail) > 500 then
    raise exception 'Detail laporan maksimal 500 karakter.';
  end if;

  select count(*) into v_recent
  from public.user_reports
  where reporter_id = v_uid
    and reported_id = p_reported_id
    and created_at > now() - interval '24 hours';

  if v_recent > 0 then
    raise exception 'Kamu sudah melaporkan pengguna ini dalam 24 jam terakhir.';
  end if;

  insert into public.user_reports (reporter_id, reported_id, request_id, reason, detail)
  values (v_uid, p_reported_id, p_request_id, p_reason, v_detail)
  returning * into v_report;

  return v_report;
end;
$$;

create or replace function public.complete_help_request(p_request_id uuid)
returns public.help_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
  v_author_name text;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  select * into v_request from public.help_requests where id = p_request_id for update;

  if not found then
    raise exception 'Request tidak ditemukan.';
  end if;

  if v_request.author_id <> v_uid then
    raise exception 'Cuma pembuat request yang bisa mengonfirmasi bantuannya selesai.';
  end if;

  if v_request.status = 'completed' then
    raise exception 'Request ini sudah dikonfirmasi selesai.';
  end if;

  if v_request.status <> 'accepted' or v_request.accepted_by is null then
    raise exception 'Belum ada yang menerima request ini.';
  end if;

  update public.help_requests
  set status = 'completed', completed_at = now()
  where id = p_request_id
  returning * into v_request;

  insert into public.karma_history (user_id, request_id, title, karma_delta)
  values (v_request.accepted_by, v_request.id, v_request.title, v_request.reward);

  update public.profiles set karma = karma + v_request.reward where id = v_request.accepted_by;

  select name into v_author_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, title, data)
  values (
    v_request.accepted_by,
    'karma_earned',
    v_author_name || ' mengonfirmasi bantuanmu selesai. +' || v_request.reward || ' Karma',
    jsonb_build_object('request_id', v_request.id, 'karma', v_request.reward)
  );

  return v_request;
end;
$$;

create or replace function public.delete_help_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.help_requests;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  select * into v_request
  from public.help_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request tidak ditemukan.';
  end if;

  if v_request.author_id <> v_uid then
    raise exception 'Cuma pembuat request yang bisa menghapusnya.';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Request yang sudah diterima tidak bisa dihapus.';
  end if;

  delete from public.help_requests where id = p_request_id;
end;
$$;

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

create or replace function public.send_panic_alert(
  p_message text default null,
  p_radius_m integer default 1000
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_alert_id uuid;
  v_sender_name text;
  v_lat double precision;
  v_lng double precision;
  v_last timestamptz;
  v_radius integer := least(greatest(coalesce(p_radius_m, 1000), 100), 5000);
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Kamu harus login dulu.';
  end if;

  select lat, lng into v_lat, v_lng from public.user_locations where user_id = v_uid;
  if v_lat is null then
    raise exception 'Lokasi belum aktif. Izinkan akses lokasi dulu supaya tetangga terdekat bisa dikabari.';
  end if;

  select max(created_at) into v_last from public.panic_alerts where user_id = v_uid;
  if v_last is not null and v_last > now() - interval '5 minutes' then
    raise exception 'Sinyal darurat cuma bisa dikirim 1x per 5 menit. Coba lagi dalam % detik.',
      ceil(extract(epoch from (v_last + interval '5 minutes' - now())))::integer;
  end if;

  insert into public.panic_alerts (user_id, message)
  values (v_uid, nullif(trim(coalesce(p_message, '')), ''))
  returning id into v_alert_id;

  select name into v_sender_name from public.profiles where id = v_uid;

  insert into public.notifications (user_id, type, title, data)
  select
    ul.user_id,
    'panic_alert',
    '[SIMULASI] ' || v_sender_name || ' mengirim sinyal darurat latihan sekitar '
      || round(public.haversine_m(v_lat, v_lng, ul.lat, ul.lng))::integer || 'm dari kamu',
    jsonb_build_object('alert_id', v_alert_id, 'sender_id', v_uid, 'simulated', true)
  from public.user_locations ul
  where ul.user_id <> v_uid
    and ul.updated_at > now() - interval '24 hours'
    and public.haversine_m(v_lat, v_lng, ul.lat, ul.lng) <= v_radius;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

drop function if exists public.submit_identity_verification(text, text, text);

create or replace function public.submit_identity_verification()
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

  insert into public.identity_verifications (user_id, status, simulated)
  values (v_uid, 'verified', true)
  on conflict (user_id) do update
    set status = 'verified',
        simulated = true,
        created_at = now();

  update public.profiles set verified = true where id = v_uid
  returning * into v_profile;

  insert into public.notifications (user_id, type, title, data)
  values (v_uid, 'identity_verified', 'Verifikasi simulasi selesai. Selamat bergabung!', '{}'::jsonb);

  return v_profile;
end;
$$;

grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.identity_verifications to authenticated;
grant select on public.help_requests to authenticated;
grant select on public.karma_history to authenticated;
grant select on public.panic_alerts to authenticated;
grant select on public.rewards to authenticated;
grant select on public.reward_redemptions to authenticated;
grant select on public.user_reports to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant select, update on public.notifications to authenticated;

revoke all on public.help_request_locations from anon, authenticated;
revoke all on public.user_locations from anon, authenticated;

grant execute on function public.accept_help_request(uuid) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.send_panic_alert(text, integer) to authenticated;
grant execute on function public.submit_identity_verification() to authenticated;
grant execute on function public.set_my_location(double precision, double precision) to authenticated;
grant execute on function public.set_home_location(double precision, double precision) to authenticated;
grant execute on function public.clear_home_location() to authenticated;
grant execute on function public.create_help_request(text, text, text, double precision, double precision, boolean) to authenticated;
grant execute on function public.nearby_help_requests(double precision, double precision, integer, integer) to authenticated;
grant execute on function public.delete_help_request(uuid) to authenticated;
grant execute on function public.complete_help_request(uuid) to authenticated;
grant execute on function public.report_user(uuid, text, text, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.help_requests enable row level security;
alter table public.karma_history enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.panic_alerts enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.help_request_locations enable row level security;
alter table public.user_locations enable row level security;
alter table public.user_reports enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "identity_verifications_select_own" on public.identity_verifications;
create policy "identity_verifications_select_own" on public.identity_verifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "help_requests_select_all" on public.help_requests;
create policy "help_requests_select_all" on public.help_requests
  for select to authenticated
  using (true);

drop policy if exists "help_requests_insert_own" on public.help_requests;

drop policy if exists "user_reports_select_own" on public.user_reports;
create policy "user_reports_select_own" on public.user_reports
  for select to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "karma_history_select_own" on public.karma_history;
create policy "karma_history_select_own" on public.karma_history
  for select to authenticated
  using (user_id = auth.uid());

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

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "panic_alerts_select_own" on public.panic_alerts;
create policy "panic_alerts_select_own" on public.panic_alerts
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "rewards_select_all" on public.rewards;
create policy "rewards_select_all" on public.rewards
  for select to authenticated
  using (true);

drop policy if exists "reward_redemptions_select_own" on public.reward_redemptions;
create policy "reward_redemptions_select_own" on public.reward_redemptions
  for select to authenticated
  using (user_id = auth.uid());

do $realtime$
declare
  v_table text;
begin
  foreach v_table in array array['help_requests', 'chat_messages', 'notifications'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end;
$realtime$;

insert into public.rewards (label, cost, icon)
select * from (values
  ('Kopi Gratis di Kedai Kos', 500, 'Coffee'),
  ('Voucher Cuci Baju 1x', 800, 'Sparkles'),
  ('Badge Pahlawan Emas', 1500, 'Medal')
) as v(label, cost, icon)
where not exists (select 1 from public.rewards);

drop policy if exists "identity_docs_insert_own" on storage.objects;
drop policy if exists "identity_docs_select_own" on storage.objects;
drop policy if exists "identity_docs_update_own" on storage.objects;
