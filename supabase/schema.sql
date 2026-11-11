-- =====================================================================
-- Amazon Chalet — Supabase schema (single source of truth)
-- =====================================================================
-- يستبدل الملفات القديمة: supabase_schema.sql / create_bookings_table.sql / FIX_RLS_SAFE.sql
--
-- • آمن لإعادة التشغيل (idempotent): لا يحذف أي جدول ولا أي بيانات.
-- • ينفع على قاعدة بيانات جديدة، وعلى قاعدة موجودة (يضيف الناقص ويعيد بناء السياسات فقط).
-- • الأعمدة مطابقة لما يستخدمه الكود فعليًا (js/*.js و admin/js/*.js).
--
-- طريقة التشغيل: Supabase Dashboard ▸ SQL Editor ▸ الصق الملف كامل ▸ Run
--
-- الصلاحيات (RLS):
--   - القراءة العامة: settings, gallery, features, packages, availability
--   - الكتابة: أي مستخدم مسجّل دخول (الأدمن الوحيد) — auth.role() = 'authenticated'
--   - bookings: الزائر يقدر يضيف حجز فقط (INSERT) ولا يقدر يقرأ الحجوزات؛ الأدمن يدير الكل
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------

-- settings: صف واحد فقط (id = 1) — admin.js يحفظ بـ .eq('id', 1)
create table if not exists public.settings (
  id                   integer primary key default 1 check (id = 1),
  whatsapp_number      text not null default '',
  instagram_url        text,
  map_embed_url        text,
  location_name        text,
  location_description text,
  updated_at           timestamptz default now()
);

-- gallery: صور المعرض (image_path = رابط الصورة العام من Storage)
create table if not exists public.gallery (
  id         uuid primary key default gen_random_uuid(),
  image_path text not null,
  alt_text   text,
  media_type text default 'image',            -- 'image' | 'video'
  wide       boolean default false,
  sort_order integer,
  created_at timestamptz default now()
);

-- features: المميزات (icon = اسم أيقونة من js/icons.js)
create table if not exists public.features (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  icon       text,
  sort_order integer,
  created_at timestamptz default now()
);

-- packages: الباقات والأسعار
create table if not exists public.packages (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,            -- morning | evening | full_day | overnight
  name       text not null,
  start_time text,                            -- 'HH:MM'
  end_time   text,                            -- 'HH:MM'
  price      numeric not null,
  sort_order integer,
  created_at timestamptz default now()
);

-- availability: توفر الفترات لكل يوم (غير الموجود = متاح)
create table if not exists public.availability (
  id         uuid primary key default gen_random_uuid(),
  date       date unique not null,
  morning    boolean default true,
  evening    boolean default true,
  full_day   boolean default true,
  overnight  boolean default true,
  updated_at timestamptz default now()
);

-- bookings: الحجوزات
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null,
  phone          text not null,
  booking_date   date not null,
  period         text not null,               -- morning | evening | full_day | overnight
  price          numeric not null,
  deposit_amount numeric not null default 0,
  status         text not null default 'بانتظار العربون',  -- 'بانتظار العربون' | 'تم الدفع' | 'ملغاة'
  created_at     timestamptz default now()
);

-- قواعد بيانات قديمة: أضف الأعمدة الناقصة إن لزم (لا تؤثر على الجديدة)
alter table public.settings add column if not exists instagram_url        text;
alter table public.settings add column if not exists map_embed_url        text;
alter table public.settings add column if not exists location_name        text;
alter table public.settings add column if not exists location_description text;
alter table public.bookings add column if not exists deposit_amount numeric not null default 0;


-- ---------------------------------------------------------------------
-- 2) Seed (لا يكتب فوق بيانات موجودة)
-- ---------------------------------------------------------------------

insert into public.settings (whatsapp_number, location_name)
select '96890992253', 'أمازون شاليه - جبل الأخضر'
where not exists (select 1 from public.settings);

insert into public.packages (key, name, start_time, end_time, price, sort_order) values
  ('morning',   'صباحي',     '08:00', '13:00', 25, 1),
  ('evening',   'مسائي',     '16:00', '22:00', 30, 2),
  ('full_day',  'يوم كامل',  '08:00', '22:00', 45, 3),
  ('overnight', 'مع المبيت', '16:00', '12:00', 65, 4)
on conflict (key) do nothing;


-- ---------------------------------------------------------------------
-- 3) Row Level Security
--    نسمّي السياسات بنمط ثابت (public_read_* / admin_write_*) ونحذف
--    الأسماء القديمة المعروفة فقط قبلها، فالتشغيل المتكرر يعطي نفس النتيجة.
--    أي سياسة أخرى أنشأتها يدويًا من اللوحة ما تنحذف.
-- ---------------------------------------------------------------------

-- أسماء السياسات القديمة اللي كانت في الملفات السابقة (تُحذف إن وُجدت، ثم نعيد بناءها)
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

    -- قراءة للكل
    execute format('create policy %I on public.%I for select using (true)', 'public_read_' || t, t);
    -- كتابة للأدمن (أي مستخدم مسجّل دخول)
    execute format(
      'create policy %I on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      'admin_write_' || t, t);
  end loop;
end $$;

-- bookings: الأدمن يدير الكل، والزائر يضيف فقط (بدون قراءة)
alter table public.bookings enable row level security;

drop policy if exists "Admins can view and manage all bookings" on public.bookings;
drop policy if exists "Authenticated users can insert bookings" on public.bookings;
drop policy if exists "Users can insert their own bookings"     on public.bookings;
drop policy if exists admin_manage_bookings                     on public.bookings;
drop policy if exists public_insert_bookings                    on public.bookings;

create policy admin_manage_bookings on public.bookings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy public_insert_bookings on public.bookings
  for insert to anon, authenticated
  with check (status = 'بانتظار العربون');


-- ---------------------------------------------------------------------
-- 4) Storage — bucket الصور (عام للقراءة، الرفع للأدمن فقط)
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
  for all using (bucket_id = 'gallery' and auth.role() = 'authenticated')
  with check (bucket_id = 'gallery' and auth.role() = 'authenticated');


-- ---------------------------------------------------------------------
-- 5) تنظيف: جدول admins القديم (كان فاضي وكسر الصلاحيات سابقًا)
-- ---------------------------------------------------------------------

drop table if exists public.admins cascade;
