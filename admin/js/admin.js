/* =========================================================
   أمازون شاليه — Admin dashboard script
   ---------------------------------------------------------
   Works in two modes:
   1) DEMO MODE (default): no Supabase project configured yet.
      All changes are kept in memory only, so you can click
      through every screen. Refreshing resets the data.
   2) LIVE MODE: once SUPABASE_URL / SUPABASE_ANON_KEY are set
      in js/supabase-client.js, this file talks to your real
      tables (see the schema comment in that file) and to
      Supabase Auth for login.
   ========================================================= */

const DEMO_MODE = !isSupabaseReady();

/* Package icon mapping (kept in sync with js/main.js) */
const PACKAGE_ICON_MAP = { morning: 'sun', evening: 'sunset', full_day: 'home', overnight: 'moon' };

/* ---------- In-memory demo state (mirrors DEMO_* in main.js) ---------- */
let state = {
  gallery: [
    { id: 'g1', image_path: null, placeholder: 'المسبح الخاص' },
    { id: 'g2', image_path: null, placeholder: 'الجلسات الخارجية' },
    { id: 'g3', image_path: null, placeholder: 'غرف النوم' },
  ],
  features: [
    { id: 'f1', icon: 'amenityPool', title: 'مسبح خاص' },
    { id: 'f2', icon: 'amenityKids', title: 'ألعاب أطفال' },
    { id: 'f3', icon: 'amenityCourt', title: 'ملعب كرة' },
    { id: 'f4', icon: 'amenityBBQ', title: 'شواء' },
    { id: 'f5', icon: 'amenityWifi', title: 'واي فاي' },
    { id: 'f6', icon: 'amenityBed', title: 'غرف نوم' },
    { id: 'f7', icon: 'amenityRelax', title: 'استرخاء' },
  ],
  packages: [
    { id: 'p1', key: 'morning', name: 'صباحي', start_time: '08:00', end_time: '13:00', price: 25 },
    { id: 'p2', key: 'evening', name: 'مسائي', start_time: '16:00', end_time: '22:00', price: 30 },
    { id: 'p3', key: 'full_day', name: 'يوم كامل', start_time: '08:00', end_time: '22:00', price: 45 },
    { id: 'p4', key: 'overnight', name: 'مع المبيت', start_time: '16:00', end_time: '12:00', price: 65 },
  ],
  availability: {}, // key: 'YYYY-MM-DD' -> { morning, evening, full_day, overnight }
};

/* ---------- Render all data-icon placeholders (static markup) ---------- */
function renderStaticIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconDone) return;
    const name = el.dataset.icon;
    if (name && ICONS[name] && (el.classList.contains('nav-icon') || el.classList.contains('btn-icon-inline') || el.tagName === 'BUTTON')) {
      el.innerHTML = icon(name, 18);
    }
    el.dataset.iconDone = '1';
  });
  const logoutIcon = document.getElementById('logoutIcon');
  if (logoutIcon && !logoutIcon.dataset.filled) { logoutIcon.innerHTML = icon('logout', 17); logoutIcon.dataset.filled = '1'; }
}
renderStaticIcons();

/* =========================================================
   AUTH
   ========================================================= */
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

async function checkSession() {
  if (DEMO_MODE) return;
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) showDashboard();
}
checkSession();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  if (DEMO_MODE) {
    if (email && password) showDashboard();
    else loginError.textContent = 'الرجاء إدخال البريد وكلمة المرور';
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) loginError.textContent = 'بيانات الدخول غير صحيحة';
  else showDashboard();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (!DEMO_MODE) await supabaseClient.auth.signOut();
  dashboard.style.display = 'none';
  loginScreen.style.display = 'flex';
});

function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  initDashboard();
}

/* =========================================================
   INIT (runs once after login)
   ========================================================= */
let initialized = false;
async function initDashboard() {
  if (initialized) return;
  initialized = true;
  renderStaticIcons();
  await renderStats();
  await renderGalleryAdmin();
  await renderFeaturesAdmin();
  await renderPackagesAdmin();
  await renderAdminCalendar();
}

async function renderStats() {
  document.getElementById('statGallery').textContent = state.gallery.length;
  document.getElementById('statFeatures').textContent = state.features.length;
  document.getElementById('statPackages').textContent = state.packages.length;
  const bookedCount = Object.values(state.availability).filter(a =>
    !a.morning && !a.evening && !a.full_day && !a.overnight
  ).length;
  document.getElementById('statBooked').textContent = bookedCount;
}

/* =========================================================
   GALLERY ADMIN (site-wide gallery — used as fallback tiles)
   ========================================================= */
const galleryGrid = document.getElementById('galleryAdminGrid');
const imageUploadInput = document.getElementById('imageUploadInput');

async function renderGalleryAdmin() {
  galleryGrid.innerHTML = state.gallery.map(item => `
    <div class="admin-grid-item" data-id="${item.id}">
      ${item.media_type === 'video'
        ? `<video src="${item.image_path}" muted playsinline preload="metadata"></video><span class="media-badge">فيديو</span>`
        : item.image_path
          ? `<img src="${item.image_path}" alt="">`
          : `<div class="placeholder-tile">${item.placeholder || 'بانتظار الصورة'}</div>`}
      <button class="remove-btn" data-remove="${item.id}">${icon('trash', 13)}</button>
    </div>
  `).join('');

  galleryGrid.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => removeGalleryItem(btn.dataset.remove));
  });
}

document.getElementById('addImageBtn').addEventListener('click', () => imageUploadInput.click());

imageUploadInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  const localUrl = URL.createObjectURL(file);

  if (DEMO_MODE) {
    state.gallery.push({ id: 'g' + Date.now(), image_path: localUrl, media_type: isVideo ? 'video' : 'image' });
    await renderGalleryAdmin();
    await renderStats();
  } else {
    const path = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from('gallery').upload(path, file);
    if (uploadError) { alert('فشل رفع الملف'); return; }
    await supabaseClient.from('gallery').insert({
      image_path: path,
      media_type: isVideo ? 'video' : 'image',
      sort_order: state.gallery.length,
    });
    await renderGalleryAdmin();
  }
  imageUploadInput.value = '';
});

async function removeGalleryItem(id) {
  if (DEMO_MODE) {
    state.gallery = state.gallery.filter(g => g.id !== id);
  } else {
    await supabaseClient.from('gallery').delete().eq('id', id);
  }
  await renderGalleryAdmin();
  await renderStats();
}

/* =========================================================
   AMENITIES ADMIN (icon + one/two word label only)
   ========================================================= */
const featuresList = document.getElementById('featuresAdminList');
const AMENITY_ICON_CHOICES = ['amenityPool', 'amenityKids', 'amenityCourt', 'amenityBBQ', 'amenityWifi', 'amenityBed', 'amenityRelax', 'sparkles'];

async function renderFeaturesAdmin() {
  featuresList.innerHTML = state.features.map(f => `
    <div class="admin-list-item" data-id="${f.id}">
      <div class="li-left">
        <button class="li-icon" data-pick-icon="${f.id}" title="اضغط لتغيير الأيقونة" style="cursor:pointer">${icon(f.icon || 'sparkles', 18)}</button>
        <div class="li-title" data-edit-title="${f.id}" title="اضغط لتعديل الاسم" style="cursor:pointer">${f.title}</div>
      </div>
      <button class="remove-btn" data-remove-feature="${f.id}">${icon('trash', 13)}</button>
    </div>
  `).join('');

  featuresList.querySelectorAll('[data-remove-feature]').forEach(btn => {
    btn.addEventListener('click', () => removeFeature(btn.dataset.removeFeature));
  });
  featuresList.querySelectorAll('[data-pick-icon]').forEach(btn => {
    btn.addEventListener('click', () => openIconPicker(btn.dataset.pickIcon));
  });
  featuresList.querySelectorAll('[data-edit-title]').forEach(el => {
    el.addEventListener('click', () => editFeatureTitle(el.dataset.editTitle));
  });
}

document.getElementById('addFeatureBtn').addEventListener('click', async () => {
  const title = prompt('اسم الميزة (كلمة أو كلمتين):');
  if (!title) return;

  if (DEMO_MODE) {
    state.features.push({ id: 'f' + Date.now(), icon: 'sparkles', title });
  } else {
    await supabaseClient.from('features').insert({ icon: 'sparkles', title, sort_order: state.features.length });
  }
  await renderFeaturesAdmin();
  await renderStats();
});

async function editFeatureTitle(id) {
  const feature = state.features.find(f => f.id === id);
  const newTitle = prompt('اسم الميزة:', feature.title);
  if (!newTitle) return;
  feature.title = newTitle;
  if (!DEMO_MODE) await supabaseClient.from('features').update({ title: newTitle }).eq('id', id);
  await renderFeaturesAdmin();
}

async function removeFeature(id) {
  if (DEMO_MODE) {
    state.features = state.features.filter(f => f.id !== id);
  } else {
    await supabaseClient.from('features').delete().eq('id', id);
  }
  await renderFeaturesAdmin();
  await renderStats();
}

/* ---------- Icon picker popover ---------- */
let pickingFeatureId = null;

function buildIconPicker() {
  const overlay = document.createElement('div');
  overlay.className = 'day-popover';
  overlay.id = 'iconPickerModal';
  overlay.innerHTML = `
    <div class="day-popover-card" style="max-width:360px">
      <h4>اختر أيقونة</h4>
      <div class="icon-picker-grid" id="iconPickerGrid"></div>
      <div class="day-popover-actions">
        <button class="btn-close-pop" id="iconPickerClose">إغلاق</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  document.getElementById('iconPickerClose').addEventListener('click', () => overlay.classList.remove('open'));
  return overlay;
}
const iconPickerModal = buildIconPicker();

function openIconPicker(featureId) {
  pickingFeatureId = featureId;
  const grid = document.getElementById('iconPickerGrid');
  grid.innerHTML = AMENITY_ICON_CHOICES.map(key => `
    <button class="icon-picker-item" data-icon-choice="${key}">${icon(key, 26)}</button>
  `).join('');
  grid.querySelectorAll('[data-icon-choice]').forEach(btn => {
    btn.addEventListener('click', () => selectFeatureIcon(btn.dataset.iconChoice));
  });
  iconPickerModal.classList.add('open');
}

async function selectFeatureIcon(iconKey) {
  const feature = state.features.find(f => f.id === pickingFeatureId);
  feature.icon = iconKey;
  if (!DEMO_MODE) await supabaseClient.from('features').update({ icon: iconKey }).eq('id', pickingFeatureId);
  iconPickerModal.classList.remove('open');
  await renderFeaturesAdmin();
}

/* =========================================================
   PACKAGES ADMIN (price editing)
   ========================================================= */
const packagesList = document.getElementById('packagesAdminList');

async function renderPackagesAdmin() {
  packagesList.innerHTML = state.packages.map(p => `
    <div class="admin-list-item" data-id="${p.id}">
      <div class="li-left">
        <span class="li-icon">${icon(PACKAGE_ICON_MAP[p.key] || 'gift', 18)}</span>
        <div>
          <div class="li-title">${p.name}</div>
          <div class="li-sub">${typeof formatTimeRange === 'function' ? formatTimeRange(p.start_time, p.end_time) : ''}</div>
        </div>
      </div>
      <div class="package-time-fields">
        <label>وقت البداية
          <input type="time" data-start="${p.id}" value="${p.start_time || ''}">
        </label>
        <span class="package-time-arrow">←</span>
        <label>وقت النهاية
          <input type="time" data-end="${p.id}" value="${p.end_time || ''}">
        </label>
      </div>
      <span class="li-price" data-price="${p.id}" title="اضغط للتعديل" style="cursor:pointer">${p.price} ر.ع</span>
    </div>
  `).join('');

  packagesList.querySelectorAll('[data-price]').forEach(el => {
    el.addEventListener('click', () => editPackagePrice(el.dataset.price));
  });
  packagesList.querySelectorAll('[data-start]').forEach(el => {
    el.addEventListener('change', () => updatePackageTime(el.dataset.start, 'start_time', el.value));
  });
  packagesList.querySelectorAll('[data-end]').forEach(el => {
    el.addEventListener('change', () => updatePackageTime(el.dataset.end, 'end_time', el.value));
  });
}

async function updatePackageTime(id, field, value) {
  const pkg = state.packages.find(p => p.id === id);
  if (!pkg || !value) return;
  pkg[field] = value;

  if (!DEMO_MODE) {
    await supabaseClient.from('packages').update({ [field]: value }).eq('id', id);
  }
  await renderPackagesAdmin();
}

async function editPackagePrice(id) {
  const pkg = state.packages.find(p => p.id === id);
  const newPrice = prompt(`السعر الجديد لباقة "${pkg.name}" (ر.ع):`, pkg.price);
  if (newPrice === null || isNaN(parseFloat(newPrice))) return;
  pkg.price = parseFloat(newPrice);

  if (!DEMO_MODE) {
    await supabaseClient.from('packages').update({ price: pkg.price }).eq('id', id);
  }
  await renderPackagesAdmin();
}

/* =========================================================
   CALENDAR ADMIN
   ========================================================= */
const DOW_LABELS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTH_LABELS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

let adminYear = new Date().getFullYear();
let adminMonth = new Date().getMonth();

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function getDayAvailability(key) {
  return state.availability[key] || { morning: true, evening: true, full_day: true, overnight: true };
}

function statusForDay(avail) {
  const values = [avail.morning, avail.evening, avail.full_day, avail.overnight];
  const count = values.filter(Boolean).length;
  if (count === 0) return 'booked';
  if (count === values.length) return 'available';
  return 'partial';
}

async function renderAdminCalendar() {
  document.getElementById('adminCalendarTitle').textContent = `${MONTH_LABELS[adminMonth]} ${adminYear}`;
  document.getElementById('adminDowRow').innerHTML = DOW_LABELS.map(d => `<div>${d}</div>`).join('');
  renderStaticIcons();

  if (!DEMO_MODE) {
    const remote = await fetchAvailability(adminYear, adminMonth);
    if (remote) remote.forEach(row => { state.availability[row.date] = row; });
  }

  const firstDay = new Date(adminYear, adminMonth, 1).getDay();
  const daysInMonth = new Date(adminYear, adminMonth + 1, 0).getDate();

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="admin-day-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(adminYear, adminMonth, d);
    const status = statusForDay(getDayAvailability(key));
    cells += `<div class="admin-day-cell ${status}" data-date="${key}">${d}</div>`;
  }

  const grid = document.getElementById('adminCalendarGrid');
  grid.innerHTML = cells;
  grid.querySelectorAll('.admin-day-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => openDayPopover(cell.dataset.date));
  });
}

document.getElementById('adminPrevMonth').addEventListener('click', () => {
  adminMonth--; if (adminMonth < 0) { adminMonth = 11; adminYear--; }
  renderAdminCalendar();
});
document.getElementById('adminNextMonth').addEventListener('click', () => {
  adminMonth++; if (adminMonth > 11) { adminMonth = 0; adminYear++; }
  renderAdminCalendar();
});

/* ---------- Day popover ---------- */
let popoverKey = null;

function buildPopover() {
  const overlay = document.createElement('div');
  overlay.className = 'day-popover';
  overlay.id = 'dayPopover';
  overlay.innerHTML = `
    <div class="day-popover-card">
      <h4 id="popoverDate">—</h4>
      ${['morning','evening','full_day','overnight'].map(k => `
        <div class="toggle-row">
          <span>${{morning:'صباحي', evening:'مسائي', full_day:'يوم كامل', overnight:'مع المبيت'}[k]}</span>
          <label class="switch">
            <input type="checkbox" data-toggle="${k}">
            <span class="slider"></span>
          </label>
        </div>
      `).join('')}
      <div class="day-popover-actions">
        <button class="btn-close-pop" id="popoverClose">إلغاء</button>
        <button class="btn-save-pop" id="popoverSave">حفظ</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  document.getElementById('popoverClose').addEventListener('click', () => overlay.classList.remove('open'));
  document.getElementById('popoverSave').addEventListener('click', saveDayPopover);
  return overlay;
}

const dayPopover = buildPopover();

function openDayPopover(key) {
  popoverKey = key;
  const avail = getDayAvailability(key);
  document.getElementById('popoverDate').textContent = key;
  dayPopover.querySelectorAll('[data-toggle]').forEach(input => {
    input.checked = !!avail[input.dataset.toggle];
  });
  dayPopover.classList.add('open');
}

async function saveDayPopover() {
  const updated = {};
  dayPopover.querySelectorAll('[data-toggle]').forEach(input => {
    updated[input.dataset.toggle] = input.checked;
  });
  state.availability[popoverKey] = updated;

  if (!DEMO_MODE) {
    await supabaseClient.from('availability').upsert({ date: popoverKey, ...updated });
  }
  dayPopover.classList.remove('open');
  await renderAdminCalendar();
  await renderStats();
}

/* =========================================================
   LOCATION & SETTINGS
   ========================================================= */
document.getElementById('saveLocationBtn').addEventListener('click', async () => {
  const payload = {
    location_name: document.getElementById('locName').value,
    location_description: document.getElementById('locDesc').value,
    map_embed_url: document.getElementById('locMapUrl').value,
  };
  if (!DEMO_MODE) {
    await supabaseClient.from('settings').update(payload).eq('id', 1);
  }
  flashSaved('saveConfirm');
});

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const payload = {
    whatsapp_number: document.getElementById('setWhatsapp').value,
    instagram_url: document.getElementById('setInstagram').value,
  };
  if (!DEMO_MODE) {
    await supabaseClient.from('settings').update(payload).eq('id', 1);
  }
  flashSaved('saveConfirm');
});

function flashSaved(elId) {
  const el = document.getElementById(elId);
  el.textContent = '✓ تم الحفظ بنجاح';
  setTimeout(() => { el.textContent = ''; }, 2500);
}
