/* =========================================================
   أمازون شاليه — Main site script
   Instant Render + Async Data Loading
   ========================================================= */

/* ---------- Config ---------- */
const WHATSAPP_NUMBER = '96890992253';
const CHALET_NAME = 'أمازون شاليه';
const WEEKEND_SURCHARGE = 15;
const WEEKEND_DAYS = [5, 6];
const DEPOSIT_PERCENT = 0.4;
const FULL_PAYMENT_THRESHOLD_DAYS = 3;

/* Demo data — rendered IMMEDIATELY */
const DEMO_AMENITIES = [
  { id: 'pool', icon: 'amenityPool', title: 'مسبح خاص' },
  { id: 'kids', icon: 'amenityKids', title: 'ألعاب أطفال' },
  { id: 'court', icon: 'amenityCourt', title: 'ملعب كرة' },
  { id: 'bbq', icon: 'amenityBBQ', title: 'شواء' },
  { id: 'wifi', icon: 'amenityWifi', title: 'واي فاي' },
  { id: 'bed', icon: 'amenityBed', title: 'غرف نوم' },
  { id: 'relax', icon: 'amenityRelax', title: 'استرخاء' },
];

const DEMO_GALLERY = [
  { src: 'assets/hero-photo-dusk.webp', alt: 'أمازون شاليه عند الغروب', wide: true },
  { src: 'assets/hero-photo-day.webp', alt: 'المسبح نهارًا', wide: true },
  { src: 'assets/gallery-pool.webp', alt: 'المسبح الخاص' },
  { src: 'assets/gallery-bedroom.webp', alt: 'غرفة النوم' },
  { src: 'assets/gallery-bbq.webp', alt: 'منطقة الشواء' },
  { src: 'assets/gallery-football.webp', alt: 'ملعب الكرة' },
  { src: 'assets/gallery-playground.webp', alt: 'ألعاب الأطفال' },
  { src: 'assets/calendar-accent.webp', alt: 'المسبح ليلاً' },
];

const DEMO_PACKAGES = [
  { key: 'morning', icon: 'sun', name: 'صباحي', start_time: '08:00', end_time: '13:00', price: 25 },
  { key: 'evening', icon: 'sunset', name: 'مسائي', start_time: '16:00', end_time: '22:00', price: 30 },
  { key: 'full_day', icon: 'home', name: 'يوم كامل', start_time: '08:00', end_time: '22:00', price: 45 },
  { key: 'overnight', icon: 'moon', name: 'مع المبيت', start_time: '16:00', end_time: '12:00', price: 65 },
];

const DEFAULT_AVAILABILITY = { morning: true, evening: true, full_day: true, overnight: true };

/* =========================================================
   HEADER SCROLL
   ========================================================= */
const header = document.getElementById('siteHeader');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* =========================================================
   MOBILE DRAWER
   ========================================================= */
const menuToggle = document.getElementById('menuToggle');
const mobileDrawer = document.getElementById('mobileDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const drawerClose = document.getElementById('drawerClose');

function openDrawer() {
  mobileDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
  menuToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  mobileDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

menuToggle?.addEventListener('click', openDrawer);
drawerClose?.addEventListener('click', closeDrawer);
drawerBackdrop?.addEventListener('click', closeDrawer);
mobileDrawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) closeDrawer();
});

/* =========================================================
   REVEAL ON SCROLL
   ========================================================= */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* =========================================================
   FOOTER
   ========================================================= */
document.getElementById('year').textContent = new Date().getFullYear();
const footerWhatsapp = document.getElementById('footerWhatsapp');
if (footerWhatsapp) footerWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}`;
const footerPhone = document.getElementById('footerPhone');
if (footerPhone) footerPhone.textContent = WHATSAPP_NUMBER.replace(/^968/, '');

/* =========================================================
   AMENITIES — RENDER IMMEDIATELY
   ========================================================= */
function renderAmenities(amenities = DEMO_AMENITIES) {
  const row = document.getElementById('amenitiesRow');
  row.innerHTML = amenities.map((a, i) => `
    <div class="amenity-item" style="animation-delay:${i * 60}ms">
      <div class="amenity-icon">${icon(a.icon || 'sparkles', 32)}</div>
      <span class="amenity-label">${a.title}</span>
    </div>
  `).join('');
}

// Render demo amenities IMMEDIATELY
renderAmenities();

// Update from Supabase in background (non-blocking)
if (typeof fetchFeatures === 'function') {
  fetchFeatures().then(data => {
    if (data && data.length) renderAmenities(data);
  }).catch(() => {});
}

/* =========================================================
   GALLERY
   ========================================================= */
let galleryItems = [];
let galleryInitialized = false;

function renderGallery(images = DEMO_GALLERY) {
  const grid = document.getElementById('galleryGrid');
  galleryItems = images;

  grid.innerHTML = galleryItems.map((item, i) => `
    <div class="gallery-grid-item${item.wide ? ' wide' : ''} reveal" data-index="${i}" style="transition-delay:${i * 30}ms">
      ${item.isVideo
        ? `<video src="${item.src}" muted playsinline preload="metadata"></video><span class="play-badge">${icon('play', 20)}</span>`
        : `<img src="${item.src}" alt="${item.alt}" loading="lazy" decoding="async">`}
    </div>
  `).join('');

  const galleryItems_els = grid.querySelectorAll('.gallery-grid-item');
  galleryItems_els.forEach(el => {
    revealObserver.observe(el);
    el.addEventListener('click', () => openLightbox(parseInt(el.dataset.index, 10)));
  });
  
  galleryInitialized = true;
}

// Lazy load gallery when needed
let realGalleryData = null;

const gallerySection = document.getElementById('gallery');
if (gallerySection) {
  const galleryObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !galleryInitialized) {
      renderGallery(realGalleryData || DEMO_GALLERY);
      galleryObserver.disconnect();
    }
  }, { threshold: 0.1 });
  galleryObserver.observe(gallerySection);
}

// Fetch real Supabase data independently of scroll timing — whichever
// happens first (fetch resolving, or the user scrolling into view)
// no longer causes the real data to be silently dropped.
if (typeof fetchGalleryImages === 'function') {
  fetchGalleryImages().then(images => {
    if (images && images.length) {
      realGalleryData = images.map(img => {
        let finalSrc = img.image_path;
        // الصفحة الرئيسية تحتاج المسار بدون ../ إذا كان محلياً
        if (finalSrc && !finalSrc.startsWith('http') && !finalSrc.startsWith('data:')) {
           finalSrc = finalSrc.replace(/^\.\.\//, ''); 
        }
        return {
          src: finalSrc,
          alt: img.alt_text || CHALET_NAME,
          wide: !!img.wide,
          isVideo: img.media_type === 'video',
        };
      });
      if (galleryInitialized) renderGallery(realGalleryData);
    }
  }).catch(() => {});
}

/* =========================================================
   LIGHTBOX
   ========================================================= */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxVideo = document.getElementById('lightboxVideo');
let currentLightboxIndex = 0;

function openLightbox(index) {
  const item = galleryItems[index];
  if (!item) return;
  currentLightboxIndex = index;

  if (item.isVideo) {
    lightboxVideo.src = item.src;
    lightboxVideo.style.display = 'block';
    lightboxImg.style.display = 'none';
  } else {
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    lightboxImg.style.display = 'block';
    lightboxVideo.style.display = 'none';
    lightboxVideo.pause();
    lightboxVideo.removeAttribute('src');
  }
  lightbox.classList.add('open');
}

function stepLightbox(dir) {
  if (!galleryItems.length) return;
  const i = (currentLightboxIndex + dir + galleryItems.length) % galleryItems.length;
  openLightbox(i);
}

document.getElementById('lightboxClose').addEventListener('click', () => {
  lightbox.classList.remove('open');
  lightboxVideo.pause();
});
document.getElementById('lightboxNext').addEventListener('click', () => stepLightbox(1));
document.getElementById('lightboxPrev').addEventListener('click', () => stepLightbox(-1));
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.classList.remove('open');
    lightboxVideo.pause();
  }
});
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') {
    lightbox.classList.remove('open');
    lightboxVideo.pause();
  }
  if (e.key === 'ArrowRight') stepLightbox(1);
  if (e.key === 'ArrowLeft') stepLightbox(-1);
});

/* =========================================================
   BOOKING CALENDAR
   ========================================================= */
const DOW_LABELS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTH_LABELS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let packagesData = DEMO_PACKAGES;
let availabilityMap = {};
let calendarInitialized = false;

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function isWeekendDate(y, m, d) { return WEEKEND_DAYS.includes(new Date(y, m, d).getDay()); }

function statusForDay(avail) {
  if (!avail) return 'available';
  const values = [avail.morning, avail.evening, avail.full_day, avail.overnight];
  const availableCount = values.filter(Boolean).length;
  if (availableCount === 0) return 'booked';
  if (availableCount === values.length) return 'available';
  return 'partial';
}

async function loadAvailabilityForMonth(year, month) {
  const fetched = await fetchAvailability(year, month);
  const map = {};
  if (fetched && fetched.length) fetched.forEach(row => { map[row.date] = row; });
  return map;
}

function renderCalendar(avMap = {}) {
  availabilityMap = avMap;
  document.getElementById('calendarTitle').textContent = `${MONTH_LABELS[viewMonth]} ${viewYear}`;

  const dowRow = document.getElementById('dowRow');
  dowRow.innerHTML = DOW_LABELS.map(d => `<div class="dow">${d}</div>`).join('');

  const grid = document.getElementById('calendarGrid');
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="day-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(viewYear, viewMonth, d);
    const cellDate = new Date(viewYear, viewMonth, d);
    const isPast = cellDate < today;

    let status;
    if (isPast) {
      status = 'past';
    } else {
      const avail = availabilityMap[key] || DEFAULT_AVAILABILITY;
      status = statusForDay(avail);
    }

    cells += `<div class="day-cell ${status}" data-date="${key}">${d}</div>`;
  }

  grid.innerHTML = cells;

  grid.querySelectorAll('.day-cell.available, .day-cell.partial').forEach(cell => {
    cell.addEventListener('click', () => openBookingModal(cell.dataset.date));
  });
  
  calendarInitialized = true;
}

// Render demo calendar immediately
renderCalendar();

// Update from Supabase in background
if (typeof fetchAvailability === 'function') {
  loadAvailabilityForMonth(viewYear, viewMonth).then(map => {
    renderCalendar(map);
  }).catch(() => {});
}

document.getElementById('prevMonth').addEventListener('click', () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar(availabilityMap);
});
document.getElementById('nextMonth').addEventListener('click', () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar(availabilityMap);
});

/* =========================================================
   STEPPER
   ========================================================= */
function setStep(stepNum) {
  document.querySelectorAll('.step-item').forEach(el => {
    const n = parseInt(el.dataset.step, 10);
    el.classList.toggle('done', n < stepNum);
    el.classList.toggle('active', n === stepNum);
  });
}

/* =========================================================
   BOOKING MODAL
   ========================================================= */
const modalOverlay = document.getElementById('modalOverlay');
const dayCardWeekday = document.getElementById('dayCardWeekday');
const dayCardNumber = document.getElementById('dayCardNumber');
const dayCardMonth = document.getElementById('dayCardMonth');
const dayCardStatus = document.getElementById('dayCardStatus');
const modalWeekendNote = document.getElementById('modalWeekendNote');
const packageList = document.getElementById('packageList');
const bookingSummary = document.getElementById('bookingSummary');
const depositNote = document.getElementById('depositNote');
const whatsappBtn = document.getElementById('whatsappBtn');

let selectedDateKey = null;
let selectedPackage = null;
let selectedIsWeekend = false;

function formatArabicDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ar-OM', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function priceWithWeekend(basePrice) {
  return selectedIsWeekend ? basePrice + WEEKEND_SURCHARGE : basePrice;
}

function displayTimeRange(pkg) {
  if (pkg.start_time && pkg.end_time) return formatTimeRange(pkg.start_time, pkg.end_time);
  return pkg.time_range || '';
}

function daysFromToday(key) {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

async function openBookingModal(key) {
  selectedDateKey = key;
  selectedPackage = null;

  document.querySelectorAll('.day-cell.selected').forEach(el => el.classList.remove('selected'));
  document.querySelector(`.day-cell[data-date="${key}"]`)?.classList.add('selected');

  const [y, m, d] = key.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dayCardWeekday.textContent = dateObj.toLocaleDateString('ar-OM', { weekday: 'long' });
  dayCardNumber.textContent = d;
  dayCardMonth.textContent = dateObj.toLocaleDateString('ar-OM', { month: 'long', year: 'numeric' });

  const avail = availabilityMap[key] || DEFAULT_AVAILABILITY;
  const dayStatus = statusForDay(avail);
  dayCardStatus.className = 'day-card-status' + (dayStatus === 'partial' ? ' partial' : '');
  dayCardStatus.innerHTML = `<i></i> ${dayStatus === 'partial' ? 'متاح جزئيًا' : 'متاح'}`;

  selectedIsWeekend = isWeekendDate(y, m - 1, d);
  modalWeekendNote.textContent = selectedIsWeekend
    ? `سعر عطلة نهاية الأسبوع: +${WEEKEND_SURCHARGE} ر.ع لكل الباقات`
    : '';
  modalWeekendNote.classList.toggle('weekend', selectedIsWeekend);

  let packages = packagesData;
  if (typeof fetchPackages === 'function') {
    const fetched = await fetchPackages();
    if (fetched && fetched.length) packages = fetched;
  }
  packagesData = packages;

  packageList.innerHTML = packagesData.map(pkg => {
    const isAvailable = avail[pkg.key] !== false;
    const finalPrice = priceWithWeekend(pkg.price);
    return `<div class="package-item ${isAvailable ? 'selectable' : 'disabled'}" data-key="${pkg.key}">
      <div class="package-info">
        <span class="package-icon">${icon(pkg.icon || 'sparkles', 20)}</span>
        <div>
          <div class="package-name">${pkg.name}</div>
          <div class="package-time">${displayTimeRange(pkg)}${isAvailable ? '' : ' · غير متاح'}</div>
        </div>
      </div>
      <div class="package-price">${finalPrice}<span class="price-unit">ر.ع</span></div>
    </div>`;
  }).join('');

  packageList.querySelectorAll('.package-item.selectable').forEach(item => {
    item.addEventListener('click', () => selectPackage(item.dataset.key));
  });

  bookingSummary.classList.remove('show');
  depositNote.classList.remove('show');
  whatsappBtn.classList.remove('active');
  setStep(2);
  modalOverlay.classList.add('open');
}

function selectPackage(key) {
  selectedPackage = packagesData.find(p => p.key === key);
  packageList.querySelectorAll('.package-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.key === key);
  });

  const finalPrice = priceWithWeekend(selectedPackage.price);

  bookingSummary.innerHTML = `
    <div><span class="sum-label">التاريخ</span><span class="sum-value">${formatArabicDate(selectedDateKey)}</span></div>
    <div><span class="sum-label">الباقة</span><span class="sum-value">${selectedPackage.name} (${displayTimeRange(selectedPackage)})</span></div>
    <div class="sum-total"><span class="sum-label">الإجمالي</span><span class="sum-value">${finalPrice} ر.ع</span></div>
  `;
  bookingSummary.classList.add('show');

  const daysAway = daysFromToday(selectedDateKey);
  const isFullPayment = daysAway < FULL_PAYMENT_THRESHOLD_DAYS;
  const requiredAmount = isFullPayment ? finalPrice : Math.round(finalPrice * DEPOSIT_PERCENT);

  depositNote.innerHTML = `
    <div class="deposit-note-title">${icon('sparkles', 14)} لتأكيد الحجز</div>
    <div class="deposit-note-text">
      إذا كان موعد الحجز بعد أكثر من ٣ أيام، يتم دفع عربون ٤٠٪. إذا كان موعد الحجز خلال أقل من ٣ أيام، يجب دفع قيمة الحجز كاملة.
    </div>
    <div class="deposit-note-amount">
      <span class="label">${isFullPayment ? 'المبلغ المطلوب (دفع كامل)' : 'العربون المطلوب (٤٠٪)'}</span>
      <span class="value">${requiredAmount} ر.ع</span>
    </div>
  `;
  depositNote.classList.add('show');

  whatsappBtn.classList.add('active');
  setStep(3);
}

whatsappBtn.addEventListener('click', () => {
  if (!selectedPackage) return;
  const finalPrice = priceWithWeekend(selectedPackage.price);
  const daysAway = daysFromToday(selectedDateKey);
  const isFullPayment = daysAway < FULL_PAYMENT_THRESHOLD_DAYS;
  const requiredAmount = isFullPayment ? finalPrice : Math.round(finalPrice * DEPOSIT_PERCENT);

  const msg = [
    `مرحبًا، أرغب بحجز ${CHALET_NAME}`,
    `التاريخ: ${formatArabicDate(selectedDateKey)}`,
    `الباقة: ${selectedPackage.name} (${displayTimeRange(selectedPackage)})`,
    `السعر الإجمالي: ${finalPrice} ر.ع${selectedIsWeekend ? ' (شامل سعر نهاية الأسبوع)' : ''}`,
    `${isFullPayment ? 'المبلغ المطلوب دفعه (كامل)' : 'العربون المطلوب (٤٠٪)'}: ${requiredAmount} ر.ع`,
  ].join('\n');
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
});

document.getElementById('modalClose').addEventListener('click', () => {
  modalOverlay.classList.remove('open');
  setStep(1);
});
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('open');
    setStep(1);
  }
});

/* =========================================================
   MAP
   ========================================================= */
document.getElementById('mapFrame').addEventListener('click', () => {
  window.open('https://maps.google.com/?q=Jabal+Akhdar+Oman', '_blank');
});
