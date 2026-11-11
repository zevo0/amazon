/* =========================================================
   أمازون شاليه — Admin Bookings Management
   ========================================================= */

let bookingsData = [];
let bookingsInitialized = false;

/**
 * Render bookings list in admin dashboard
 */
async function renderBookingsAdmin() {
  if (bookingsInitialized && !DEMO_MODE) return;
  
  // Fetch bookings from Supabase
  if (!DEMO_MODE && typeof fetchAllBookings === 'function') {
    const result = await fetchAllBookings();
    if (result) bookingsData = result;
  } else {
    // Demo mode - use sample data
    bookingsData = [
      {
        id: 'b1',
        customer_name: 'محمد علي',
        phone: '96890123456',
        booking_date: new Date().toISOString().split('T')[0],
        period: 'full_day',
        price: 45,
        deposit_amount: 18,
        status: 'بانتظار العربون',
        created_at: new Date().toISOString()
      }
    ];
  }

  renderBookingsList();
  bookingsInitialized = true;
}

/**
 * Render bookings list table
 */
function renderBookingsList() {
  const container = document.getElementById('bookingsAdminList');
  if (!container) return;

  if (bookingsData.length === 0) {
    container.innerHTML = '<p class="empty-state">لا توجد حجوزات حتى الآن</p>';
    return;
  }

  const periodLabels = {
    'morning': 'صباحي',
    'evening': 'مسائي',
    'full_day': 'يوم كامل',
    'overnight': 'مع المبيت'
  };

  container.innerHTML = `
    <div class="bookings-table-wrapper">
      <table class="bookings-table">
        <thead>
          <tr>
            <th>العميل</th>
            <th>الهاتف</th>
            <th>التاريخ</th>
            <th>الفترة</th>
            <th>السعر</th>
            <th>العربون</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${bookingsData.map(booking => `
            <tr data-booking-id="${booking.id}">
              <td>${booking.customer_name}</td>
              <td dir="ltr">${booking.phone}</td>
              <td>${formatDate(booking.booking_date)}</td>
              <td>${periodLabels[booking.period] || booking.period}</td>
              <td>${booking.price}&nbsp;${omr()}</td>
              <td>${booking.deposit_amount}&nbsp;${omr()}</td>
              <td>
                <select class="status-select" data-booking-id="${booking.id}" onchange="handleBookingStatusChange('${booking.id}', this.value)">
                  <option value="بانتظار العربون" ${booking.status === 'بانتظار العربون' ? 'selected' : ''}>بانتظار العربون</option>
                  <option value="تم الدفع" ${booking.status === 'تم الدفع' ? 'selected' : ''}>تم الدفع</option>
                  <option value="ملغاة" ${booking.status === 'ملغاة' ? 'selected' : ''}>ملغاة</option>
                </select>
              </td>
              <td>
                <button class="btn-delete" onclick="handleBookingDelete('${booking.id}')" title="حذف الحجز">
                  ${icon('trash', 16)}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Update booking status (UI handler -> supabase-bookings.js#updateBookingStatus)
 */
async function handleBookingStatusChange(bookingId, newStatus) {
  if (DEMO_MODE) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (booking) booking.status = newStatus;
    renderBookingsList();
    return;
  }

  const result = await updateBookingStatus(bookingId, newStatus);
  if (result.error) {
    alert('خطأ في تحديث الحالة: ' + result.error.message);
  } else {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (booking) booking.status = newStatus;
  }
  renderBookingsList();
}

/**
 * Delete booking (UI handler -> supabase-bookings.js#deleteBooking)
 */
async function handleBookingDelete(bookingId) {
  if (!confirm('هل تريد حذف هذا الحجز؟')) return;

  if (!DEMO_MODE) {
    const result = await deleteBooking(bookingId);
    if (result.error) {
      alert('خطأ في حذف الحجز: ' + result.error.message);
      return;
    }
  }
  bookingsData = bookingsData.filter(b => b.id !== bookingId);
  renderBookingsList();
}

/**
 * Format date to Arabic format
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Export bookings to CSV
 */
function exportBookingsToCSV() {
  if (bookingsData.length === 0) {
    alert('لا توجد حجوزات لتصديرها');
    return;
  }

  const headers = ['العميل', 'الهاتف', 'التاريخ', 'الفترة', 'السعر', 'العربون', 'الحالة'];
  const periodLabels = {
    'morning': 'صباحي',
    'evening': 'مسائي',
    'full_day': 'يوم كامل',
    'overnight': 'مع المبيت'
  };

  const rows = bookingsData.map(b => [
    b.customer_name,
    b.phone,
    formatDate(b.booking_date),
    periodLabels[b.period] || b.period,
    b.price,
    b.deposit_amount,
    b.status
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `bookings-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get booking statistics
 */
function getBookingsStats() {
  const stats = {
    total: bookingsData.length,
    pending: bookingsData.filter(b => b.status === 'بانتظار العربون').length,
    paid: bookingsData.filter(b => b.status === 'تم الدفع').length,
    cancelled: bookingsData.filter(b => b.status === 'ملغاة').length,
    totalRevenue: bookingsData.filter(b => b.status === 'تم الدفع').reduce((sum, b) => sum + b.price, 0),
    totalDeposits: bookingsData.filter(b => b.status === 'بانتظار العربون').reduce((sum, b) => sum + b.deposit_amount, 0)
  };
  return stats;
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
        <div class="stat-label">بانتظار العربون</div>
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
