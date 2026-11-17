-- =====================================================================
-- Booking site — Supabase schema (structure + permissions only)
-- =====================================================================
-- • Identical for every client. What differs per client is the DATA:
--   supabase/seed.sql is generated from site.config.js (run it after this file).
-- • Safe to re-run (idempotent): never drops a table or deletes data. It also upgrades
--   an older database (adds missing columns, migrates availability to the new format).
-- • Columns match what the code uses (js/*.js, admin/js/*.js).
--
-- ORDER FOR A NEW CLIENT / FIRST RUN OF THIS VERSION
--   1. Authentication ▸ Users: create the owner's account, then make it an admin (run once):
--        update auth.users
--           set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--         where email = 'owner@example.com';
--      (scripts/new-client.mjs writes this for you into client-setup.sql.)
--      The owner must sign in again afterwards — the role is carried in the login token.
--   2. Run this file.   3. Run supabase/seed.sql.
--
-- PERMISSIONS (RLS) — who can do what
--   public (visitors)  read: settings, gallery, features, packages, availability
--                      insert: bookings, status 'بانتظار العربون' only (can't read them back)
--                      read: the calendar_bookings view (date + period + status, no customer data)
--   admin (owner)      everything above + manage all tables and the 'gallery' storage bucket
--   Admin = a login whose token has app_metadata.role = 'admin'. A visitor who signs up
--   by himself does NOT get it (users can't edit app_metadata), so "any logged-in user"
--   is no longer enough to write.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Role helper
-- ---------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;


-- ---------------------------------------------------------------------
-- 2) Tables
-- ---------------------------------------------------------------------

-- settings: a single row (id = 1) — the owner's editable settings
create table if not exists public.settings (
  id                   integer primary key default 1 check (id = 1),
  whatsapp_number      text not null default '',
  instagram_url        text,
  map_embed_url        text,
  location_name        text,
  location_description text,
  hero_subtitle        text,
  terms_text           text,
  weekend_surcharge    numeric,
  deposit_percent      numeric,
  full_payment_days    integer,
  updated_at           timestamptz default now()
);

-- gallery: photos (image_path = public URL from Storage)
create table if not exists public.gallery (
  id         uuid primary key default gen_random_uuid(),
  image_path text not null,
  alt_text   text,
  media_type text default 'image',            -- 'image' | 'video'
  wide       boolean default false,
  sort_order integer,
  created_at timestamptz default now()
);

-- features: the amenities strip (icon = a name from js/icons.js)
create table if not exists public.features (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  icon       text,
  sort_order integer,
  created_at timestamptz default now()
);

-- packages: what can be booked. `closes` = keys that become unavailable when this one is booked.
create table if not exists public.packages (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  name       text not null,
  icon       text,
  start_time text,                            -- 'HH:MM'
  end_time   text,                            -- 'HH:MM'
  price      numeric not null,
  closes     text[] not null default '{}',
  sort_order integer,
  created_at timestamptz default now()
);

-- availability: package keys the owner closed by hand for a day (no row = everything open)
create table if not exists public.availability (
  id         uuid primary key default gen_random_uuid(),
  date       date unique not null,
  closed     text[] not null default '{}',
  updated_at timestamptz default now()
);

-- bookings
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null,
  phone          text not null,
  booking_date   date not null,
  period         text not null,               -- a package key
  price          numeric not null,
  deposit_amount numeric not null default 0,
  status         text not null default 'بانتظار العربون',  -- 'بانتظار العربون' | 'تم الدفع' | 'ملغاة'
  created_at     timestamptz default now()
);


-- ---------------------------------------------------------------------
-- 3) Upgrade older databases (no effect on new ones)
-- ---------------------------------------------------------------------

alter table public.settings add column if not exists instagram_url        text;
alter table public.settings add column if not exists map_embed_url        text;
alter table public.settings add column if not exists location_name        text;
alter table public.settings add column if not exists location_description text;
alter table public.settings add column if not exists hero_subtitle        text;
alter table public.settings add column if not exists terms_text           text;
alter table public.settings add column if not exists weekend_surcharge    numeric;
alter table public.settings add column if not exists deposit_percent      numeric;
alter table public.settings add column if not exists full_payment_days    integer;
alter table public.packages add column if not exists icon   text;
alter table public.packages add column if not exists closes text[] not null default '{}';
alter table public.availability add column if not exists closed text[] not null default '{}';
alter table public.bookings add column if not exists deposit_amount numeric not null default 0;

-- availability used to have one boolean column per period: move them into `closed`, then drop them
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'availability' and column_name = 'morning') then
    update public.availability
       set closed = array_remove(array[
             case when morning   = false then 'morning'   end,
             case when evening   = false then 'evening'   end,
             case when full_day  = false then 'full_day'  end,
             case when overnight = false then 'overnight' end], null)
     where closed = '{}';
    delete from public.availability where closed = '{}';
    alter table public.availability
      drop column morning, drop column evening, drop column full_day, drop column overnight;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 4) Row Level Security
--    Fixed policy names (public_read_* / admin_write_*); the known old names are dropped first,
--    so re-running gives the same result. Policies you created by hand are left alone.
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['settings','gallery','features','packages','availability'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', 'Admins can manage ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Public can view ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'admin_manage_' || t, t);
    execute format('drop policy if exists %I on public.%I', 'admin_write_'  || t, t);
    execute format('drop policy if exists %I on public.%I', 'public_read_'  || t, t);

    execute format('create policy %I on public.%I for select using (true)', 'public_read_' || t, t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
                   'admin_write_' || t, t);
  end loop;
end $$;

-- bookings: the owner manages everything, a visitor can only add
alter table public.bookings enable row level security;

drop policy if exists "Admins can view and manage all bookings" on public.bookings;
drop policy if exists "Authenticated users can insert bookings" on public.bookings;
drop policy if exists "Users can insert their own bookings"     on public.bookings;
drop policy if exists admin_manage_bookings                     on public.bookings;
drop policy if exists public_insert_bookings                    on public.bookings;

create policy admin_manage_bookings on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

create policy public_insert_bookings on public.bookings
  for insert to anon, authenticated
  with check (status = 'بانتظار العربون');

-- Public calendar: active bookings (pending / paid) with NO customer data.
-- Runs with its owner's rights on purpose (bypasses RLS on bookings) and exposes 3 columns only.
-- Cancelled bookings are not listed, so their period is available again by itself.
create or replace view public.calendar_bookings as
  select booking_date, period, status
  from public.bookings
  where status in ('بانتظار العربون', 'تم الدفع');

grant select on public.calendar_bookings to anon, authenticated;

-- Realtime: the dashboard sees new bookings at once, the site sees prices / closures / settings change
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['bookings', 'availability', 'packages', 'settings'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 5) Storage — the photo bucket (public read, admin write)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "Gallery images are publicly readable"          on storage.objects;
drop policy if exists "Admins can upload and manage gallery images"   on storage.objects;
drop policy if exists "admin_upload_gallery_images"                   on storage.objects;
drop policy if exists "admin_delete_gallery_images"                   on storage.objects;
drop policy if exists "gallery_admin_write"                           on storage.objects;
drop policy if exists "gallery_public_read"                           on storage.objects;

create policy gallery_public_read on storage.objects
  for select using (bucket_id = 'gallery');

create policy gallery_admin_write on storage.objects
  for all using (bucket_id = 'gallery' and public.is_admin())
  with check (bucket_id = 'gallery' and public.is_admin());


-- ---------------------------------------------------------------------
-- 6) Cleanup: the old `admins` table (empty, and it once broke the permissions)
-- ---------------------------------------------------------------------

drop table if exists public.admins cascade;
