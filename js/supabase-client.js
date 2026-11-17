/* =========================================================
   Supabase connection + data-access layer
   The project URL / anon key come from site.config.js
   ========================================================= */

let supabaseClient = null;

try {
  const { url, anonKey } = SiteConfig.current.supabase || {};
  if (window.supabase && url && anonKey) {
    supabaseClient = window.supabase.createClient(url, anonKey);
  }
} catch (e) {
  console.warn('Supabase not configured yet, using the defaults of site.config.js.', e);
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

/* Packages that become unavailable when `pkg` is booked (always includes itself) */
function closesOf(pkg) {
  return [...new Set([pkg.key, ...(pkg.closes || [])])];
}

/* DB rows → what the UI uses. Older rows without icon / closes fall back to the same package in site.config.js. */
function normalizePackages(rows) {
  const defaults = (window.SiteConfig && SiteConfig.current && SiteConfig.current.packages) || [];
  return (rows || []).map(p => {
    const d = defaults.find(x => x.key === p.key) || {};
    const closes = p.closes && p.closes.length ? p.closes : d.closes;
    return { ...p, price: Number(p.price), icon: p.icon || d.icon || 'sparkles', closes: closesOf({ key: p.key, closes }) };
  });
}

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
    return normalizePackages(data);
  } catch (e) {
    console.warn('packages fetch error', e);
    return null;
  }
}

/* ---- Month date range (YYYY-MM-DD .. last real day of the month) ---- */
function monthRange(year, month) {
  const mm = String(month + 1).padStart(2, '0');
  const last = new Date(year, month + 1, 0).getDate();
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(last).padStart(2, '0')}` };
}

/* ---- Availability (periods closed by hand — `closed` = package keys) for a given month ---- */
async function fetchAvailability(year, month) {
  if (!isSupabaseReady()) return null;
  try {
    const { start, end } = monthRange(year, month);
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

/* ---- Active bookings (pending / paid) for a month — date + period + status only.
        Reads the public view `calendar_bookings`, never the bookings table. ---- */
async function fetchCalendarBookings(year, month) {
  if (!isSupabaseReady()) return null;
  try {
    const { start, end } = monthRange(year, month);
    const { data, error } = await supabaseClient
      .from('calendar_bookings')
      .select('booking_date, period, status')
      .gte('booking_date', start)
      .lte('booking_date', end);
    if (error) {
      console.warn('calendar bookings fetch failed', error);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('calendar bookings fetch error', e);
    return null;
  }
}

/* Database schema + RLS policies: see supabase/schema.sql */
