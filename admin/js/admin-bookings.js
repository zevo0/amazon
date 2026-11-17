/* =========================================================
   Admin Bookings Management
   Status flow (see js/supabase-bookings.js):
     بانتظار العربون  →  [تم الدفع]  period locked in the calendar
                      →  [🗑]        status ملغاة: period released, counted in the stats
   ========================================================= */

let bookingsData = [];
let bookingsInitialized = false;

/**
 * Load bookings (Supabase or demo data) and render list + stats
 */
async function renderBookingsAdmin() {
  if (bookingsInitialized && !DEMO_MODE) return;

  if (!DEMO_MODE && typeof fetchAllBookings === 'function') {
    const result = await fetchAllBookings();
    if (result) bookingsData = result;
  } else {
    // Demo mode - use sample data
    bookingsData = [
      {
        id: 'b1',
        customer_name: 'عميل جديد',
        booking_date: new Date().toISOString().split('T')[0],
        period: 'full_day',
        price: 45,
        deposit_amount: 18,
        status: BOOKING_STATUS.PENDING,
        created_at: new Date().toISOString()
      }
    ];
  }

  renderBookingsList();
  bookingsInitialized = true;
}

/** Re-fetch from the database (new bookings arrive while the dashboard is open) */
async function reloadBookings() {
  if (DEMO_MODE) return;
  const result = await fetchAllBookings();
  if (!result) return;
  bookingsData = result;
  renderBookingsList();
  displayBookingsStats();
  renderCalendarAdmin();
}

/** Active bookings of the calendar: date -> [{ period, status }] */
function bookingHoldsByDate() {
  return groupHoldsByDate(bookingsData.filter(b => b.status !== BOOKING_STATUS.CANCELLED).map(b => ({
    booking_date: b.booking_date, period: b.period, status: b.status
  })));
}

function statusCell(booking) {
  if (booking.status === BOOKING_STATUS.PENDING) {
    return `
      <button class="btn-paid" onclick="handleBookingPaid('${booking.id}')">${icon('check', 15)} تم الدفع</button>
      <span class="status-sub">محجوز مبدئيًا · بانتظار الدفع</span>`;
  }
  if (booking.status === BOOKING_STATUS.PAID) {
    return `<span class="status-badge paid">${icon('check', 14)} تم الدفع</span>`;
  }
  return `<span class="status-badge cancelled">ملغاة</span>`;
}

/**
 * Render bookings list table (cancelled bookings go last)
 */
function renderBookingsList() {
  const container = document.getElementById('bookingsAdminList');
  if (!container) return;

  if (bookingsData.length === 0) {
    container.innerHTML = '<p class="empty-state">لا توجد حجوزات حتى الآن</p>';
    return;
  }

  const rank = b => (b.status === BOOKING_STATUS.CANCELLED ? 1 : 0);
  const rows = [...bookingsData].sort((a, b) => rank(a) - rank(b));

  container.innerHTML = `
    <div class="bookings-table-wrapper">
      <table class="bookings-table">
        <thead>
          <tr>
            <th>الحالة</th>
            <th>العميل</th>
            <th>التاريخ</th>
            <th>الفترة</th>
            <th>السعر</th>
            <th>العربون</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(booking => `
            <tr data-booking-id="${booking.id}" class="${booking.status === BOOKING_STATUS.CANCELLED ? 'is-cancelled' : ''}">
              <td class="status-cell">${statusCell(booking)}</td>
              <td>${uiEscape(booking.customer_name)}</td>
              <td>${formatDate(booking.booking_date)}</td>
              <td>${uiEscape(periodLabel(booking.period))}</td>
              <td>${booking.price}&nbsp;${omr()}</td>
              <td>${booking.deposit_amount}&nbsp;${omr()}</td>
              <td>
                ${booking.status === BOOKING_STATUS.CANCELLED ? '' : `
                <button class="btn-delete" onclick="handleBookingCancel('${booking.id}')" title="إلغاء الحجز">
                  ${icon('trash', 16)}
                </button>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Move a booking to a new status, then refresh list, stats and calendar
 */
async function setBookingStatus(bookingId, newStatus, successMessage) {
  const booking = bookingsData.find(b => b.id === bookingId);
  if (!booking) return;

  if (!DEMO_MODE) {
    const result = await updateBookingStatus(bookingId, newStatus);
    if (result.error) {
      uiAlert('تعذّر تحديث الحجز: ' + (result.error.message || result.error), { type: 'error' });
      return;
    }
  }

  booking.status = newStatus;
  renderBookingsList();
  displayBookingsStats();
  renderCalendarAdmin();
  uiToast(successMessage, { type: 'success' });
}

/** "تم الدفع": the booked period gets locked in the calendar */
function handleBookingPaid(bookingId) {
  return setBookingStatus(bookingId, BOOKING_STATUS.PAID, 'تم تسجيل الدفع وإقفال الفترة في التقويم');
}

/** Trash: the booking becomes "ملغاة" (kept for the stats) and its period is released */
async function handleBookingCancel(bookingId) {
  const booking = bookingsData.find(b => b.id === bookingId);
  if (!booking) return;

  const wasPaid = booking.status === BOOKING_STATUS.PAID;
  const ok = await uiConfirm(
    `${periodLabel(booking.period)} · ${formatDate(booking.booking_date)}\n` +
    (wasPaid ? 'هذا الحجز مدفوع. عند الإلغاء ستعود الفترة متاحة في التقويم.' : 'سيختفي الحجز المبدئي من التقويم وتعود الفترة متاحة.'),
    { title: 'إلغاء الحجز؟', confirmText: 'نعم، إلغاء الحجز', cancelText: 'تراجع', danger: true }
  );
  if (!ok) return;

  return setBookingStatus(bookingId, BOOKING_STATUS.CANCELLED, 'تم إلغاء الحجز وإعادة الفترة للتقويم');
}

/**
 * Format date to Arabic format
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Get booking statistics ("ملغاة" counts every cancelled booking, with no time limit)
 */
function getBookingsStats() {
  const by = status => bookingsData.filter(b => b.status === status);
  return {
    total: bookingsData.length,
    pending: by(BOOKING_STATUS.PENDING).length,
    paid: by(BOOKING_STATUS.PAID).length,
    cancelled: by(BOOKING_STATUS.CANCELLED).length,
    totalRevenue: by(BOOKING_STATUS.PAID).reduce((sum, b) => sum + b.price, 0),
    totalDeposits: by(BOOKING_STATUS.PENDING).reduce((sum, b) => sum + b.deposit_amount, 0)
  };
}

/**
 * Display booking statistics
 */
function displayBookingsStats() {
  const stats = getBookingsStats();
  const statsContainer = document.getElementById('bookingsStats');

  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">إجمالي الحجوزات</div>
        <div class="stat-value">${stats.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">محجوز مبدئيًا</div>
        <div class="stat-value pending">${stats.pending}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">مدفوعة</div>
        <div class="stat-value paid">${stats.paid}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">ملغاة</div>
        <div class="stat-value cancelled">${stats.cancelled}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">إجمالي الإيرادات</div>
        <div class="stat-value revenue">${stats.totalRevenue}&nbsp;${omr()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">إجمالي العربون المعلق</div>
        <div class="stat-value deposits">${stats.totalDeposits}&nbsp;${omr()}</div>
      </div>
    </div>
  `;
}
