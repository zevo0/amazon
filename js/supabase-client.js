/* =========================================================
   Supabase connection + data-access layer
   Mobile-First Optimized with Enhanced Security
   ========================================================= */

const SUPABASE_URL = 'https://txabrbzppfqnahasmhxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YWJyYnpwcGZxbmFoYXNtaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzY2NzMsImV4cCI6MjA5OTUxMjY3M30.zgUBQBKeqnTV3Vm8riMiy63vrjzz5UY1l47IpHzlX1Q';

let supabaseClient = null;

try {
  if (window.supabase && !SUPABASE_URL.includes('YOUR-PROJECT')) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase not configured yet, using demo data.', e);
}

const isSupabaseReady = () => !!supabaseClient;

/* ---- Storage: public image URL helper ---- */
function getPublicImageUrl(bucket, path) {
  if (!isSupabaseReady()) return null;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

/* ---- Settings (hero image, phone number, map coords, etc.) ---- */
async function fetchSiteSettings() {
  if (!isSupabaseReady()) return null;
  try {
    const { data, error } = await supabaseClient
      .from('settings')
      .select('*')
      .single();
    if (error) {
      console.warn('settings fetch failed', error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('settings fetch error', e);
    return null;
  }
}

/* ---- Gallery images ---- */
async function fetchGalleryImages() {
  if (!isSupabaseReady()) return null;
  try {
    const { data, error } = await supabaseClient
      .from('gallery')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.warn('gallery fetch failed', error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('gallery fetch error', e);
    return null;
  }
}

/* ---- Amenities (icon + short label only) ---- */
async function fetchFeatures() {
  if (!isSupabaseReady()) return null;
  try {
    const { data, error } = await supabaseClient
      .from('features')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.warn('features fetch failed', error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('features fetch error', e);
    return null;
  }
}

/* ---- Packages (booking package types + prices) ---- */
async function fetchPackages() {
  if (!isSupabaseReady()) return null;
  try {
    const { data, error } = await supabaseClient
      .from('packages')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.warn('packages fetch failed', error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('packages fetch error', e);
    return null;
  }
}

/* ---- Availability for a given month ---- */
async function fetchAvailability(year, month) {
  if (!isSupabaseReady()) return null;
  try {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    const { data, error } = await supabaseClient
      .from('availability')
      .select('*')
      .gte('date', start)
      .lte('date', end);
    if (error) {
      console.warn('availability fetch failed', error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('availability fetch error', e);
    return null;
  }
}

/*
  ---------------------------------------------------------
  SUPABASE SCHEMA + SECURITY POLICIES (SQL)
  ---------------------------------------------------------

  -- 1. Create tables
  create table if not exists settings (
    id int primary key default 1,
    hero_image text,
    whatsapp_number text not null default '96890992253',
    instagram_url text,
    map_embed_url text,
    location_name text,
    location_description text,
    weekend_surcharge numeric default 15,
    deposit_percent numeric default 0.4,
    full_payment_days int default 3,
    updated_at timestamp default now()
  );

  create table if not exists gallery (
    id uuid primary key default gen_random_uuid(),
    image_path text not null,
    media_type text default 'image',
    alt_text text,
    sort_order int default 0,
    created_at timestamp default now(),
    updated_at timestamp default now()
  );

  create table if not exists features (
    id uuid primary key default gen_random_uuid(),
    icon text not null,
    title text not null,
    sort_order int default 0,
    created_at timestamp default now(),
    updated_at timestamp default now()
  );

  create table if not exists packages (
    id uuid primary key default gen_random_uuid(),
    key text unique not null,
    name text not null,
    start_time time,
    end_time time,
    price numeric not null,
    sort_order int default 0,
    created_at timestamp default now(),
    updated_at timestamp default now()
  );

  create table if not exists availability (
    date date primary key,
    morning boolean default true,
    evening boolean default true,
    full_day boolean default true,
    overnight boolean default true,
    created_at timestamp default now(),
    updated_at timestamp default now()
  );

  -- 2. Enable Row Level Security (RLS)
  alter table settings enable row level security;
  alter table gallery enable row level security;
  alter table features enable row level security;
  alter table packages enable row level security;
  alter table availability enable row level security;

  -- 3. PUBLIC READ policies (anonymous users can read all data)
  create policy "public_read_settings" on settings for select using (true);
  create policy "public_read_gallery" on gallery for select using (true);
  create policy "public_read_features" on features for select using (true);
  create policy "public_read_packages" on packages for select using (true);
  create policy "public_read_availability" on availability for select using (true);

  -- 4. ADMIN WRITE policies (only authenticated admin users can write)
  -- Replace 'admin-user-id' with actual admin UUID from auth.users
  create policy "admin_write_settings" on settings 
    for all using (
      auth.role() = 'authenticated' 
      and exists (
        select 1 from auth.users 
        where id = auth.uid() 
        and email like '%@admin%'
      )
    );

  create policy "admin_write_gallery" on gallery 
    for all using (
      auth.role() = 'authenticated' 
      and exists (
        select 1 from auth.users 
        where id = auth.uid() 
        and email like '%@admin%'
      )
    );

  create policy "admin_write_features" on features 
    for all using (
      auth.role() = 'authenticated' 
      and exists (
        select 1 from auth.users 
        where id = auth.uid() 
        and email like '%@admin%'
      )
    );

  create policy "admin_write_packages" on packages 
    for all using (
      auth.role() = 'authenticated' 
      and exists (
        select 1 from auth.users 
        where id = auth.uid() 
        and email like '%@admin%'
      )
    );

  create policy "admin_write_availability" on availability 
    for all using (
      auth.role() = 'authenticated' 
      and exists (
        select 1 from auth.users 
        where id = auth.uid() 
        and email like '%@admin%'
      )
    );

  -- 5. Insert initial data
  insert into settings (id, whatsapp_number) 
  values (1, '96890992253') 
  on conflict do nothing;

  insert into packages (key, name, start_time, end_time, price, sort_order) 
  values 
    ('morning', 'صباحي', '08:00', '13:00', 25, 1),
    ('evening', 'مسائي', '16:00', '22:00', 30, 2),
    ('full_day', 'يوم كامل', '08:00', '22:00', 45, 3),
    ('overnight', 'مع المبيت', '16:00', '12:00', 65, 4)
  on conflict (key) do nothing;

  insert into features (icon, title, sort_order) 
  values 
    ('amenityPool', 'مسبح خاص', 1),
    ('amenityKids', 'ألعاب أطفال', 2),
    ('amenityCourt', 'ملعب كرة', 3),
    ('amenityBBQ', 'شواء', 4),
    ('amenityWifi', 'واي فاي', 5),
    ('amenityBed', 'غرف نوم', 6),
    ('amenityRelax', 'استرخاء', 7)
  on conflict do nothing;

  -- 6. Create storage bucket for images
  insert into storage.buckets (id, name, public)
  values ('gallery', 'gallery', true)
  on conflict do nothing;

  -- 7. Storage policies
  create policy "public_read_gallery_images" on storage.objects
    for select using (bucket_id = 'gallery');

  create policy "admin_upload_gallery_images" on storage.objects
    for insert with check (
      bucket_id = 'gallery' 
      and auth.role() = 'authenticated'
      and exists (
        select 1 from auth.users 
        where id = auth.uid() 
        and email like '%@admin%'
      )
    );

  create policy "admin_delete_gallery_images" on storage.objects
    for delete using (
      bucket_id = 'gallery' 
      and auth.role() = 'authenticated'
      and exists (
        select 1 from auth.users 
        where id = auth.uid() 
        and email like '%@admin%'
      )
    );
*/
