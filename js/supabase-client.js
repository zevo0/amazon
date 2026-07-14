/* =========================================================
   Supabase connection + data-access layer
   Mobile-First Optimized with Enhanced Security
   ========================================================= */

const SUPABASE_URL = 'https://irnoymfihzlctxqfuhue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlybm95bWZpaHpsY3R4cWZ1aHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NTg1NDMsImV4cCI6MjA5OTUzNDU0M30.X0GtMJh6fa_YmeCwyFlf1b5ep4fDHmXSag9oZFFf1n0';

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
  SCHEMA & SECURITY: see FIX_RLS_SAFE.sql for the current,
  correct RLS policies actually applied to this project.

  Tables in use: settings, gallery, features, packages, availability.
  Write access: any authenticated user (auth.role() = 'authenticated').
  Public read: enabled on all tables.

  Do NOT use any older schema/policy snippet found elsewhere in this
  project's history — FIX_RLS_SAFE.sql is the single source of truth.
*/
