/* =========================================================
   Supabase Bookings Module
   Handles booking creation and status management
   ========================================================= */

/**
 * Create a new booking in the database
 * Called when user confirms booking via WhatsApp
 * @param {Object} bookingData - Booking details
 * @returns {Promise<Object>} - Created booking or error
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
        status: 'بانتظار العربون'
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
 * Update booking status
 * @param {string} bookingId - Booking UUID
 * @param {string} newStatus - New status ('بانتظار العربون', 'تم الدفع', 'ملغاة')
 * @returns {Promise<Object>} - Updated booking or error
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

    return { data };
  } catch (e) {
    console.error('Status update error:', e);
    return { error: e };
  }
}

/**
 * Fetch all bookings (admin only)
 * @returns {Promise<Array>} - List of bookings
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

/**
 * Delete a booking (admin only)
 * @param {string} bookingId - Booking UUID
 * @returns {Promise<Object>} - Result
 */
async function deleteBooking(bookingId) {
  if (!isSupabaseReady()) {
    console.warn('Supabase not ready');
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabaseClient
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      console.error('Booking deletion failed:', error);
      return { error };
    }

    return { success: true };
  } catch (e) {
    console.error('Booking deletion error:', e);
    return { error: e };
  }
}

/**
 * Update availability when a booking is confirmed
 * If full_day is booked, close all periods for that date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} period - Period ('morning', 'evening', 'full_day', 'overnight')
 * @returns {Promise<Object>} - Result
 */
async function updateAvailabilityAfterBooking(date, period) {
  if (!isSupabaseReady()) {
    console.warn('Supabase not ready');
    return { error: 'Supabase not configured' };
  }

  try {
    // Fetch current availability for the date
    const { data: existingAvail, error: fetchError } = await supabaseClient
      .from('availability')
      .select('*')
      .eq('date', date)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.warn('Availability fetch failed:', fetchError);
      return { error: fetchError };
    }

    let updateData = {};

    if (period === 'full_day') {
      // Close all periods
      updateData = {
        morning: false,
        evening: false,
        full_day: false,
        overnight: false
      };
    } else if (period === 'morning') {
      updateData = { morning: false };
    } else if (period === 'evening') {
      updateData = { evening: false };
    } else if (period === 'overnight') {
      updateData = { overnight: false };
    }

    if (existingAvail) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from('availability')
        .update(updateData)
        .eq('date', date);

      if (updateError) {
        console.error('Availability update failed:', updateError);
        return { error: updateError };
      }
    } else {
      // Insert new record
      const newRecord = {
        date,
        morning: period !== 'morning' && period !== 'full_day',
        evening: period !== 'evening' && period !== 'full_day',
        full_day: period !== 'full_day',
        overnight: period !== 'overnight' && period !== 'full_day'
      };

      const { error: insertError } = await supabaseClient
        .from('availability')
        .insert([newRecord]);

      if (insertError) {
        console.error('Availability insert failed:', insertError);
        return { error: insertError };
      }
    }

    return { success: true };
  } catch (e) {
    console.error('Availability update error:', e);
    return { error: e };
  }
}
