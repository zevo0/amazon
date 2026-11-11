/* =========================================================
   Supabase connection + data-access layer
   Mobile-First Optimized with Enhanced Security
   ========================================================= */

const SUPABASE_URL = 'https://ghnzdcxrrqoykswzmxuj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WQlEp2ETMNsSQFbuI8DXVg_xb45MR7L';

let supabaseClient = null;

try {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Supabase not configured yet, using demo data.', e);
}

const isSupabaseReady = () => !!supabaseClient;

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

/* Database schema + RLS policies: see supabase/schema.sql */
