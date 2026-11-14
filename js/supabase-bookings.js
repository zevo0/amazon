/* =========================================================
   Bookings module — shared by the site and the admin panel
   • Booking statuses + the rule "which periods does a booking close"
   • resolveDaySlots(): the ONE place that decides what a calendar day looks like
   • createBooking (site) / updateBookingStatus + fetchAllBookings (admin)

   Lifecycle:  بانتظار العربون (pending hold, orange)
                 ├─ تم الدفع  → period is locked in the calendar
                 └─ ملغاة     → period is released; kept for the stats
   Nothing here writes to the `availability` table: the calendar is
   always computed from `availability` (manual blocks by the owner)
   + bookings, so cancelling a booking re-opens its period by itself.
   ========================================================= */

const BOOKING_STATUS = {
  PENDING: 'بانتظار العربون',
  PAID: 'تم الدفع',
  CANCELLED: 'ملغاة',
};

const ALL_PERIODS = ['morning', 'evening', 'full_day', 'overnight'];

/* Periods that become unavailable when a booking takes the given period */
const PERIOD_CLOSES = {
  full_day: ALL_PERIODS,
  overnight: ALL_PERIODS,
  morning: ['morning', 'full_day', 'overnight'],
  evening: ['evening', 'full_day', 'overnight'],
};

/**
 * State of every period for one day.
 * @param {Object|null} manual  availability row (a period === false means closed by the owner)
 * @param {Array} holds         [{ period, status }] bookings of that day
 * @returns {{morning,evening,full_day,overnight}} each 'open' | 'pending' | 'closed'
 *   pending = held by a booking waiting for payment (not paid yet)
 *   closed  = unavailable (paid, closed by the owner, or overlapping a booking)
 */
function resolveDaySlots(manual, holds = []) {
  const slots = {};
  ALL_PERIODS.forEach(p => { slots[p] = manual && manual[p] === false ? 'closed' : 'open'; });

  const active = holds.filter(h => PERIOD_CLOSES[h.period]);
  const paid = active.filter(h => h.status === BOOKING_STATUS.PAID);
  const pending = active.filter(h => h.status === BOOKING_STATUS.PENDING);

  paid.forEach(h => PERIOD_CLOSES[h.period].forEach(p => { slots[p] = 'closed'; }));
  pending.forEach(h => PERIOD_CLOSES[h.period].forEach(p => {
    if (slots[p] !== 'open') return;
    slots[p] = p === h.period ? 'pending' : 'closed';
  }));
  return slots;
}

/** One status for the whole day: 'available' | 'partial' | 'pending' | 'booked' */
function summarizeDay(slots) {
  const values = ALL_PERIODS.map(p => slots[p]);
  if (values.includes('pending')) return 'pending';
  const open = values.filter(v => v === 'open').length;
  if (open === 0) return 'booked';
  return open === values.length ? 'available' : 'partial';
}

/** Group a flat list of bookings by date -> [{ period, status }] */
function groupHoldsByDate(rows) {
  const map = {};
  (rows || []).forEach(r => {
    (map[r.booking_date] = map[r.booking_date] || []).push({ period: r.period, status: r.status });
  });
  return map;
}

/**
 * Create a new booking (site). Starts as a pending hold.
 */
async function createBooking(bookingData) {
  if (!isSupabaseReady()) {
    console.warn('Supabase not ready, booking not saved');
    return { error: 'Supabase not configured' };
  }

  try {
    // No .select(): visitors may insert bookings but must not be able to read them back.
    const { error } = await supabaseClient
      .from('bookings')
      .insert([{
        customer_name: bookingData.customer_name,
        phone: bookingData.phone,
        booking_date: bookingData.booking_date,
        period: bookingData.period,
        price: bookingData.price,
        deposit_amount: bookingData.deposit_amount,
        status: BOOKING_STATUS.PENDING
      }]);

    if (error) {
      console.error('Booking creation failed:', error);
      return { error };
    }

    return { success: true };
  } catch (e) {
    console.error('Booking creation error:', e);
    return { error: e };
  }
}

/**
 * Update a booking's status (admin).
 * Fails loudly when 0 rows changed (e.g. blocked by RLS) instead of pretending it worked.
 */
async function updateBookingStatus(bookingId, newStatus) {
  if (!isSupabaseReady()) {
    console.warn('Supabase not ready');
    return { error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabaseClient
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)
      .select();

    if (error) {
      console.error('Status update failed:', error);
      return { error };
    }
    if (!data || data.length === 0) {
      return { error: { message: 'لم يتم تحديث أي حجز (تحقق من الصلاحيات)' } };
    }

    return { data };
  } catch (e) {
    console.error('Status update error:', e);
    return { error: e };
  }
}

/**
 * Fetch all bookings (admin only)
 */
async function fetchAllBookings() {
  if (!isSupabaseReady()) return null;

  try {
    const { data, error } = await supabaseClient
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Bookings fetch failed:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.warn('Bookings fetch error:', e);
    return null;
  }
}
