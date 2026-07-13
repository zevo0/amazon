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

async function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  
  // ✅ تحميل البيانات الحقيقية من Supabase عند فتح لوحة التحكم
  if (!DEMO_MODE) {
    await loadRealDataFromSupabase();
  }
  
  initDashboard();
}

/* ✅ دالة جديدة: تحميل البيانات الحقيقية من Supabase */
async function loadRealDataFromSupabase() {
  try {
    // تحميل الباقات
    const { data: packagesData } = await supabaseClient.from('packages').select('*').order('sort_order', { ascending: true });
    if (packagesData) {
      state.packages = packagesData.map((p, idx) => ({
        ...p,
        id: p.key, // استخدم key كـ id محلي للتوافق مع الكود الحالي
      }));
    }

    // تحميل المميزات
    const { data: featuresData } = await supabaseClient.from('features').select('*').order('sort_order', { ascending: true });
    if (featuresData) {
      state.features = featuresData.map((f, idx) => ({
        ...f,
        id: f.id || `f${idx}`,
      }));
    }

    // تحميل المعرض
    const { data: galleryData } = await supabaseClient.from('gallery').select('*').order('sort_order', { ascending: true });
    if (galleryData) {
      state.gallery = galleryData.map((g, idx) => ({
        ...g,
        id: g.id || `g${idx}`,
      }));
    }

    console.log('✅ تم تحميل البيانات الحقيقية من Supabase بنجاح');
  } catch (e) {
    console.warn('⚠️ خطأ في تحميل البيانات من Supabase:', e);
  }
}

/* =========================================================
   DASHBOARD INIT
   ========================================================= */
async function initDashboard() {
  renderStaticIcons();
  await renderSettingsAdmin();
  await renderGalleryAdmin();
  await renderFeaturesAdmin();
  await renderPackagesAdmin();
  await renderCalendarAdmin();
}

/* =========================================================
   SETTINGS ADMIN
   ========================================================= */
async function renderSettingsAdmin() {
  const sec = document.getElementById('sec-settings');
  if (!sec) return;

  sec.innerHTML = `
    <div class="admin-section-head">
      <h3>إعدادات الموقع</h3>
    </div>
    <div class="admin-form">
      <label>رقم الواتساب
        <input type="tel" id="settingsWhatsapp" placeholder="966XXXXXXXXX">
      </label>
      <label>رابط انستقرام
        <input type="url" id="settingsInstagram" placeholder="https://instagram.com/...">
      </label>
      <label>رابط الخريطة (Embed)
        <input type="url" id="settingsMapEmbed" placeholder="https://maps.google.com/...">
      </label>
      <label>اسم الموقع
        <input type="text" id="settingsLocationName" placeholder="جبل الأخضر، عمان">
      </label>
      <button class="btn btn-primary" id="saveSettingsBtn">حفظ الإعدادات</button>
    </div>
  `;

  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const settings = {
      whatsapp_number: document.getElementById('settingsWhatsapp').value,
      instagram_url: document.getElementById('settingsInstagram').value,
      map_embed_url: document.getElementById('settingsMapEmbed').value,
      location_name: document.getElementById('settingsLocationName').value,
    };

    if (!DEMO_MODE) {
      const { error } = await supabaseClient.from('settings').update(settings).eq('id', 1);
      if (error) alert('خطأ في الحفظ: ' + error.message);
      else alert('تم حفظ الإعدادات بنجاح');
    } else {
      alert('أنت في وضع العرض التجريبي. قم بتفعيل Supabase لحفظ البيانات.');
    }
  });
}

/* =========================================================
   GALLERY ADMIN
   ========================================================= */
const galleryList = document.getElementById('galleryAdminList');

async function renderGalleryAdmin() {
  if (!galleryList) return;
  galleryList.innerHTML = state.gallery.map(g => `
    <div class="admin-list-item" data-id="${g.id}">
      <div class="li-left">
        <div class="gallery-thumb" style="background: #ddd; width: 60px; height: 60px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999;">
          ${g.image_path ? `<img src="${g.image_path}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">` : '📷'}
        </div>
        <div>
          <div class="li-title">${g.placeholder || 'صورة'}</div>
          <div class="li-sub" style="font-size:0.85rem; color:#999;">${g.image_path ? 'محمّل' : 'لم يتم الرفع بعد'}</div>
        </div>
      </div>
      <button class="btn btn-small" data-upload="${g.id}">رفع صورة</button>
    </div>
  `).join('');

  galleryList.querySelectorAll('[data-upload]').forEach(btn => {
    btn.addEventListener('click', () => uploadGalleryImage(btn.dataset.upload));
  });
}

async function uploadGalleryImage(galleryId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (DEMO_MODE) {
      alert('أنت في وضع العرض التجريبي. قم بتفعيل Supabase لرفع الصور.');
      return;
    }

    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from('gallery').upload(fileName, file);
    if (uploadError) {
      alert('خطأ في الرفع: ' + uploadError.message);
      return;
    }

    const publicUrl = supabaseClient.storage.from('gallery').getPublicUrl(fileName).data.publicUrl;
    const item = state.gallery.find(g => g.id === galleryId);
    if (item) item.image_path = publicUrl;

    await renderGalleryAdmin();
    alert('تم رفع الصورة بنجاح');
  });
  input.click();
}

/* =========================================================
   FEATURES ADMIN
   ========================================================= */
const featuresList = document.getElementById('featuresAdminList');
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

async function renderFeaturesAdmin() {
  if (!featuresList) return;
  featuresList.innerHTML = state.features.map(f => `
    <div class="admin-list-item" data-id="${f.id}">
      <div class="li-left">
        <span class="li-icon">${icon(f.icon || 'gift', 18)}</span>
        <div class="li-title">${f.title}</div>
      </div>
      <button class="btn btn-small" data-pick="${f.id}">تغيير الأيقونة</button>
    </div>
  `).join('');

  featuresList.querySelectorAll('[data-pick]').forEach(btn => {
    btn.addEventListener('click', () => openIconPicker(btn.dataset.pick));
  });
}

/* =========================================================
   PACKAGES ADMIN (price editing)
   ✅ تم إصلاح: استخدام 'key' بدلاً من 'id' في التحديثات
   ========================================================= */
const packagesList = document.getElementById('packagesAdminList');

async function renderPackagesAdmin() {
  if (!packagesList) return;
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
          <input type="time" data-start="${p.key}" value="${p.start_time || ''}">
        </label>
        <span class="package-time-arrow">←</span>
        <label>وقت النهاية
          <input type="time" data-end="${p.key}" value="${p.end_time || ''}">
        </label>
      </div>
      <span class="li-price" data-price="${p.key}" title="اضغط للتعديل" style="cursor:pointer">${p.price} ر.ع</span>
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

// ✅ تم الإصلاح: استخدام 'key' بدلاً من 'id'
async function updatePackageTime(key, field, value) {
  const pkg = state.packages.find(p => p.key === key);
  if (!pkg || !value) return;
  pkg[field] = value;

  if (!DEMO_MODE) {
    await supabaseClient.from('packages').update({ [field]: value }).eq('key', key);
  }
  await renderPackagesAdmin();
}

// ✅ تم الإصلاح: استخدام 'key' بدلاً من 'id'
async function editPackagePrice(key) {
  const pkg = state.packages.find(p => p.key === key);
  const newPrice = prompt(`السعر الجديد لباقة "${pkg.name}" (ر.ع):`, pkg.price);
  if (newPrice === null || isNaN(parseFloat(newPrice))) return;
  pkg.price = parseFloat(newPrice);

  if (!DEMO_MODE) {
    await supabaseClient.from('packages').update({ price: pkg.price }).eq('key', key);
  }
  await renderPackagesAdmin();
}

/* =========================================================
   CALENDAR ADMIN
   ========================================================= */
const calendarContainer = document.getElementById('calendarAdminContainer');
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth();

async function renderCalendarAdmin() {
  if (!calendarContainer) return;

  const monthLabel = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][calendarViewMonth];
  const firstDay = new Date(calendarViewYear, calendarViewMonth, 1);
  const lastDay = new Date(calendarViewYear, calendarViewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  let html = `
    <div class="admin-section-head">
      <h3>التقويم والتوفر</h3>
    </div>
    <div class="calendar-nav">
      <button id="calendarPrevMonth">← الشهر السابق</button>
      <span>${monthLabel} ${calendarViewYear}</span>
      <button id="calendarNextMonth">الشهر التالي →</button>
    </div>
    <div class="admin-calendar-grid">
  `;

  const dayLabels = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  dayLabels.forEach(day => {
    html += `<div class="cal-day-header">${day}</div>`;
  });

  for (let i = 0; i < startingDayOfWeek; i++) {
    html += `<div class="cal-empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const avail = state.availability[dateStr] || { morning: true, evening: true, full_day: true, overnight: true };
    html += `
      <div class="cal-day" data-date="${dateStr}">
        <div class="cal-day-num">${day}</div>
        <div class="cal-day-status">
          <label><input type="checkbox" data-slot="morning" ${avail.morning ? 'checked' : ''}> ص</label>
          <label><input type="checkbox" data-slot="evening" ${avail.evening ? 'checked' : ''}> م</label>
          <label><input type="checkbox" data-slot="full_day" ${avail.full_day ? 'checked' : ''}> ك</label>
          <label><input type="checkbox" data-slot="overnight" ${avail.overnight ? 'checked' : ''}> ل</label>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  calendarContainer.innerHTML = html;

  document.getElementById('calendarPrevMonth').addEventListener('click', () => {
    calendarViewMonth--;
    if (calendarViewMonth < 0) { calendarViewMonth = 11; calendarViewYear--; }
    renderCalendarAdmin();
  });

  document.getElementById('calendarNextMonth').addEventListener('click', () => {
    calendarViewMonth++;
    if (calendarViewMonth > 11) { calendarViewMonth = 0; calendarViewYear++; }
    renderCalendarAdmin();
  });

  document.querySelectorAll('.cal-day input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const dayEl = e.target.closest('.cal-day');
      const dateStr = dayEl.dataset.date;
      const slot = e.target.dataset.slot;
      const isAvailable = e.target.checked;

      state.availability[dateStr] = state.availability[dateStr] || {};
      state.availability[dateStr][slot] = isAvailable;

      if (!DEMO_MODE) {
        const { error } = await supabaseClient.from('availability').upsert({
          date: dateStr,
          [slot]: isAvailable,
        }, { onConflict: 'date' });
        if (error) console.warn('خطأ في حفظ التوفر:', error);
      }
    });
  });
}

// ✅ تحميل البيانات عند فتح الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderStaticIcons();
  });
} else {
  renderStaticIcons();
}
