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

const AMENITY_ICON_CHOICES = [
  'amenityPool', 'amenityKids', 'amenityCourt', 'amenityBBQ', 
  'amenityWifi', 'amenityBed', 'amenityRelax', 'sparkles', 'gift', 'coffee'
];

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
  
  // ضبط الشهر الحالي قبل البدء
  calendarViewYear = new Date().getFullYear();
  calendarViewMonth = new Date().getMonth();
  
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
  const settings = await fetchSiteSettings() || {
    whatsapp_number: '96890000000',
    instagram_url: '',
    map_embed_url: '',
    location_name: 'أمازون شاليه'
  };

  document.getElementById('setWhatsapp').value = settings.whatsapp_number || '';
  document.getElementById('setInstagram').value = settings.instagram_url || '';
  document.getElementById('locMapUrl').value = settings.map_embed_url || '';
  document.getElementById('locName').value = settings.location_name || '';
  if (document.getElementById('locDesc')) document.getElementById('locDesc').value = settings.location_description || '';

  const saveBtn = document.getElementById('saveSettingsBtn');
  const saveLocBtn = document.getElementById('saveLocationBtn');
  
  const handleSave = async () => {
    const updated = {
      whatsapp_number: document.getElementById('setWhatsapp').value,
      instagram_url: document.getElementById('setInstagram').value,
      map_embed_url: document.getElementById('locMapUrl').value,
      location_name: document.getElementById('locName').value,
      location_description: document.getElementById('locDesc')?.value || ''
    };

    if (!DEMO_MODE) {
      const { error } = await supabaseClient.from('settings').update(updated).eq('id', 1);
      if (error) alert('خطأ في الحفظ: ' + error.message);
      else {
        const confirm = document.getElementById('saveConfirm');
        if (confirm) {
          confirm.textContent = '✅ تم الحفظ بنجاح';
          setTimeout(() => confirm.textContent = '', 3000);
        } else {
          alert('تم الحفظ بنجاح');
        }
      }
    } else {
      alert('وضع العرض التجريبي: لا يمكن الحفظ.');
    }
  };

  if (saveBtn) saveBtn.onclick = handleSave;
  if (saveLocBtn) saveLocBtn.onclick = handleSave;
}

/* =========================================================
   GALLERY ADMIN
   ========================================================= */
const galleryGrid = document.getElementById('galleryAdminGrid');

async function renderGalleryAdmin() {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = state.gallery.map(g => `
    <div class="admin-card" data-id="${g.id}">
      <div class="admin-card-media">
        ${g.image_path ? `<img src="${g.image_path}">` : `<div class="media-placeholder">${icon('image', 40)}</div>`}
      </div>
      <div class="admin-card-body">
        <div class="admin-card-title">${g.placeholder || 'صورة المعرض'}</div>
        <button class="btn-action" data-upload="${g.id}">${icon('edit', 14)} تغيير الصورة</button>
      </div>
    </div>
  `).join('');

  galleryGrid.querySelectorAll('[data-upload]').forEach(btn => {
    btn.addEventListener('click', () => uploadGalleryImage(btn.dataset.upload));
  });

  const addBtn = document.getElementById('addImageBtn');
  if (addBtn) addBtn.onclick = () => uploadGalleryImage(null);
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
    
    if (galleryId) {
      // تحديث صورة موجودة
      const item = state.gallery.find(g => g.id === galleryId);
      if (item) {
        item.image_path = publicUrl;
        await supabaseClient.from('gallery').update({ image_path: publicUrl }).eq('id', galleryId);
      }
    } else {
      // إضافة صورة جديدة
      const { data, error: insertError } = await supabaseClient.from('gallery').insert({
        image_path: publicUrl,
        placeholder: 'صورة جديدة',
        sort_order: state.gallery.length
      }).select();
      
      if (!insertError && data) {
        state.gallery.push({
          ...data[0],
          id: data[0].id
        });
      }
    }

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

async function renderFeaturesAdmin() {
  if (!featuresList) return;
  featuresList.innerHTML = state.features.map(f => `
    <div class="admin-list-item" data-id="${f.id}">
      <div class="li-left">
        <span class="li-icon">${icon(f.icon || 'gift', 18)}</span>
        <div class="li-title">${f.title}</div>
      </div>
      <button class="btn-action" data-pick="${f.id}">${icon('edit', 14)} تغيير الأيقونة</button>
    </div>
  `).join('');

  featuresList.querySelectorAll('[data-pick]').forEach(btn => {
    btn.addEventListener('click', () => openIconPicker(btn.dataset.pick));
  });

  const addBtn = document.getElementById('addFeatureBtn');
  if (addBtn) addBtn.onclick = () => alert('إضافة ميزة جديدة متاحة في النسخة الكاملة');
}

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
        <label>البداية
          <input type="time" data-start="${p.key}" value="${p.start_time || ''}">
        </label>
        <label>النهاية
          <input type="time" data-end="${p.key}" value="${p.end_time || ''}">
        </label>
      </div>
      <div class="li-right">
        <span class="li-price" data-price="${p.key}" title="اضغط للتعديل">${p.price} ر.ع</span>
        <button class="btn-action" data-price="${p.key}">${icon('edit', 14)}</button>
      </div>
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
  const titleEl = document.getElementById('adminCalendarTitle');
  const gridEl = document.getElementById('adminCalendarGrid');
  const dowRow = document.getElementById('adminDowRow');
  if (!gridEl) return;

  // تحميل التوفر للشهر الحالي
  if (!DEMO_MODE) {
    const data = await fetchAvailability(calendarViewYear, calendarViewMonth);
    if (data) {
      data.forEach(row => {
        state.availability[row.date] = {
          morning: row.morning,
          evening: row.evening,
          full_day: row.full_day,
          overnight: row.overnight
        };
      });
    }
  }

  const monthLabel = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][calendarViewMonth];
  if (titleEl) titleEl.textContent = `${monthLabel} ${calendarViewYear}`;

  if (dowRow && !dowRow.innerHTML) {
    const days = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    dowRow.innerHTML = days.map(d => `<div>${d}</div>`).join('');
  }

  const firstDay = new Date(calendarViewYear, calendarViewMonth, 1);
  const lastDay = new Date(calendarViewYear, calendarViewMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = firstDay.getDay();

  gridEl.innerHTML = '';
  for (let i = 0; i < startOffset; i++) {
    gridEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const avail = state.availability[dateStr] || { morning: true, evening: true, full_day: true, overnight: true };
    
    const isFullyBooked = !avail.morning && !avail.evening && !avail.full_day && !avail.overnight;
    const isPartial = !isFullyBooked && (!avail.morning || !avail.evening || !avail.full_day || !avail.overnight);
    const statusClass = isFullyBooked ? 'booked' : (isPartial ? 'partial' : 'available');

    const dayCell = document.createElement('div');
    dayCell.className = `admin-day-cell ${statusClass}`;
    dayCell.innerHTML = `
      <div class="day-num">${d}</div>
      <div class="day-slots">
        <span class="slot-dot ${avail.morning?'':'off'}" title="صباحي"></span>
        <span class="slot-dot ${avail.evening?'':'off'}" title="مسائي"></span>
        <span class="slot-dot ${avail.full_day?'':'off'}" title="يوم كامل"></span>
        <span class="slot-dot ${avail.overnight?'':'off'}" title="مبيت"></span>
      </div>
    `;
    dayCell.onclick = () => openDayPopover(dateStr, avail);
    gridEl.appendChild(dayCell);
  }

  document.getElementById('adminPrevMonth').onclick = () => {
    calendarViewMonth--;
    if (calendarViewMonth < 0) { calendarViewMonth = 11; calendarViewYear--; }
    renderCalendarAdmin();
  };
  document.getElementById('adminNextMonth').onclick = () => {
    calendarViewMonth++;
    if (calendarViewMonth > 11) { calendarViewMonth = 0; calendarViewYear++; }
    renderCalendarAdmin();
  };
}

function openDayPopover(dateStr, avail) {
  let popover = document.getElementById('dayPopover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'dayPopover';
    popover.className = 'day-popover';
    document.body.appendChild(popover);
  }

  popover.innerHTML = `
    <div class="day-popover-card">
      <h4>تعديل التوفر: ${dateStr}</h4>
      <div class="popover-slots">
        ${state.packages.map(p => `
          <label class="slot-toggle">
            <input type="checkbox" data-date="${dateStr}" data-slot="${p.key}" ${avail[p.key] ? 'checked' : ''}>
            <span>${p.name}</span>
          </label>
        `).join('')}
      </div>
      <div class="day-popover-actions">
        <button class="btn-save-pop" id="closePopover">إغلاق</button>
      </div>
    </div>
  `;
  
  popover.classList.add('open');
  popover.onclick = (e) => { if(e.target === popover) popover.classList.remove('open'); };
  document.getElementById('closePopover').onclick = () => popover.classList.remove('open');

  popover.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.onchange = async (e) => {
      const slot = e.target.dataset.slot;
      const checked = e.target.checked;
      
      // تهيئة البيانات لليوم إذا لم تكن موجودة
      state.availability[dateStr] = state.availability[dateStr] || { morning: true, evening: true, full_day: true, overnight: true };
      
      // تطبيق منطق التداخل التلقائي
      if (!checked) { // إذا تم "حجز" الفترة (إلغاء التوفر)
        if (slot === 'full_day') {
          // حجز اليوم الكامل يغلق كل شيء في نفس اليوم
          state.availability[dateStr].morning = false;
          state.availability[dateStr].evening = false;
          state.availability[dateStr].full_day = false;
          state.availability[dateStr].overnight = false;
        } else if (slot === 'overnight') {
          // حجز المبيت يغلق اليوم بالكامل (صباحي ومسائي ويوم كامل)
          state.availability[dateStr].overnight = false;
          state.availability[dateStr].full_day = false;
          state.availability[dateStr].morning = false;
          state.availability[dateStr].evening = false;
        } else if (slot === 'morning' || slot === 'evening') {
          // حجز الصباحي أو المسائي يغلق اليوم الكامل والمبيت
          state.availability[dateStr][slot] = false;
          state.availability[dateStr].full_day = false;
          state.availability[dateStr].overnight = false;
        }
      } else { // إذا تم جعل الفترة "متاحة"
        state.availability[dateStr][slot] = true;
        // إذا فتحنا اليوم الكامل، نفتح كل شيء معه
        if (slot === 'full_day') {
          state.availability[dateStr].morning = true;
          state.availability[dateStr].evening = true;
          state.availability[dateStr].overnight = true;
        }
      }

      // تحديث واجهة الـ Popover لتعكس التغييرات التلقائية
      popover.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = state.availability[dateStr][input.dataset.slot];
      });

      // حفظ التغييرات في قاعدة البيانات
      if (!DEMO_MODE) {
        const { error } = await supabaseClient.from('availability').upsert({
          date: dateStr,
          ...state.availability[dateStr]
        }, { onConflict: 'date' });
        
        if (error) console.error('Error updating availability:', error);
      }
      
      renderCalendarAdmin();
    };
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
