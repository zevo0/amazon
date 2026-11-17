/* =========================================================
   Admin dashboard script
   ---------------------------------------------------------
   Works in two modes:
   1) DEMO MODE: no Supabase project configured in site.config.js.
      Changes are kept in memory only, so every screen can be clicked
      through. Refreshing resets the data.
   2) LIVE MODE: talks to the real tables (see supabase/schema.sql)
      and to Supabase Auth. Only an account with the "admin" role
      (app_metadata.role = 'admin') gets in — and the database
      enforces the same rule, whatever this page does.
   ========================================================= */

const DEMO_MODE = !isSupabaseReady();
const cfg = () => SiteConfig.current;

const AMENITY_ICON_CHOICES = [
  'amenityPool', 'amenityKids', 'amenityCourt', 'amenityBBQ',
  'amenityWifi', 'amenityBed', 'amenityRelax', 'sparkles', 'gift', 'coffee'
];

/* Icons a package can use */
const PACKAGE_ICON_CHOICES = ['sun', 'sunset', 'moon', 'fullDay', 'home', 'bed', 'pool', 'sparkles'];

/* ---------- State (demo mode starts from site.config.js; live mode loads the database) ---------- */
let state = {
  gallery: [],
  features: cfg().features.map(f => ({ ...f })),
  packages: normalizePackages(cfg().packages).map(p => ({ ...p, id: p.key })),
  availability: {}, // 'YYYY-MM-DD' -> { closed: [package keys closed by hand] }
};

/** Package name for a booking's period (falls back to the raw key for a deleted package) */
function periodLabel(key) {
  const p = state.packages.find(x => x.key === key);
  return p ? p.name : key;
}

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

/* Only the owner's account (role "admin" in the JWT) may use the panel; the database enforces the same rule */
const isAdminSession = session => session?.user?.app_metadata?.role === 'admin';

async function rejectNonAdmin() {
  await supabaseClient.auth.signOut();
  loginError.textContent = 'هذا الحساب ليس حساب إدارة لهذا الموقع';
}

async function checkSession() {
  if (DEMO_MODE) return;
  const { data } = await supabaseClient.auth.getSession();
  if (!data?.session) return;
  if (isAdminSession(data.session)) showDashboard();
  else await supabaseClient.auth.signOut();
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

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) loginError.textContent = 'بيانات الدخول غير صحيحة';
  else if (!isAdminSession(data.session)) await rejectNonAdmin();
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
    const packagesData = await fetchPackages();
    if (packagesData) state.packages = packagesData.map(p => ({ ...p, id: p.key }));

    // تحميل المميزات
    const { data: featuresData } = await supabaseClient.from('features').select('*').order('sort_order', { ascending: true });
    if (featuresData) {
      state.features = featuresData;
    }

    // تحميل المعرض
    const { data: galleryData } = await supabaseClient.from('gallery').select('*').order('sort_order', { ascending: true });
    if (galleryData) {
      state.gallery = galleryData.map(img => {
        let finalPath = img.image_path;
        // لوحة التحكم تحتاج ../ للوصول لـ assets إذا كان المسار محلياً
        if (finalPath && !finalPath.startsWith('http') && !finalPath.startsWith('data:') && finalPath.startsWith('assets/')) {
           finalPath = '../' + finalPath;
        }
        return { ...img, image_path: finalPath };
      });
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
  await renderBookingsAdmin();
  displayBookingsStats();
  await renderSettingsAdmin();
  await renderGalleryAdmin();
  await renderFeaturesAdmin();
  await renderPackagesAdmin();
  await renderCalendarAdmin();

  // New bookings arrive while the dashboard is open: refresh live, and when the tab comes back
  if (!DEMO_MODE) {
    try {
      supabaseClient.channel('admin-bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, reloadBookings)
        .subscribe();
    } catch (e) {
      console.warn('Realtime bookings unavailable', e);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reloadBookings(); });
  }
}

/* =========================================================
   SETTINGS ADMIN
   ========================================================= */
async function renderSettingsAdmin() {
  const settings = await fetchSiteSettings() || {};
  const d = cfg();                       // the defaults of site.config.js show as placeholders
  const el = id => document.getElementById(id);
  const val = (id, v) => { el(id).value = v ?? ''; };

  val('setWhatsapp', settings.whatsapp_number);
  val('setInstagram', settings.instagram_url);
  val('setHeroSubtitle', settings.hero_subtitle);
  val('setWeekend', settings.weekend_surcharge);
  val('setDeposit', settings.deposit_percent);
  val('setFullDays', settings.full_payment_days);
  val('setTerms', settings.terms_text);
  val('locMapUrl', settings.map_embed_url);
  val('locName', settings.location_name);
  val('locDesc', settings.location_description);

  el('setWhatsapp').placeholder = d.contact.whatsapp;
  el('setHeroSubtitle').placeholder = d.content.heroSubtitle;
  el('setWeekend').placeholder = d.pricing.weekendSurcharge;
  el('setDeposit').placeholder = d.pricing.depositPercent;
  el('setFullDays').placeholder = d.pricing.fullPaymentDays;
  el('locDesc').placeholder = d.location.text;

  const text = id => el(id).value.trim();
  const number = id => (text(id) === '' ? null : Number(text(id)));

  const handleSave = async () => {
    const updated = {
      whatsapp_number: text('setWhatsapp').replace(/\D/g, ''),
      instagram_url: text('setInstagram'),
      hero_subtitle: text('setHeroSubtitle'),
      weekend_surcharge: number('setWeekend'),
      deposit_percent: number('setDeposit'),
      full_payment_days: number('setFullDays'),
      terms_text: text('setTerms'),
      map_embed_url: text('locMapUrl'),
      location_name: text('locName'),
      location_description: text('locDesc'),
    };

    const bad = ['weekend_surcharge', 'deposit_percent', 'full_payment_days'].find(k => updated[k] !== null && (isNaN(updated[k]) || updated[k] < 0));
    if (bad || (updated.deposit_percent !== null && updated.deposit_percent > 100)) {
      uiAlert('تأكد من الأرقام: يجب أن تكون صفرًا أو أكثر، والعربون لا يزيد عن ١٠٠٪.', { type: 'error' });
      return;
    }
    if (!updated.whatsapp_number) {
      uiAlert('رقم الواتساب مطلوب لأن الحجوزات تصل إليه.', { type: 'error' });
      return;
    }

    if (DEMO_MODE) {
      uiAlert('وضع العرض التجريبي: لا يمكن الحفظ.');
      return;
    }
    // empty fields are stored as NULL: the site then falls back to the defaults of site.config.js
    Object.keys(updated).forEach(k => { if (updated[k] === '') updated[k] = null; });
    const { error } = await supabaseClient.from('settings').upsert({ id: 1, ...updated, updated_at: new Date().toISOString() });
    if (error) uiAlert('خطأ في الحفظ: ' + error.message, { type: 'error' });
    else uiToast('تم الحفظ بنجاح', { type: 'success' });
  };

  el('saveSettingsBtn').onclick = handleSave;
  el('saveLocationBtn').onclick = handleSave;
}

/* =========================================================
   GALLERY ADMIN
   ========================================================= */
const galleryGrid = document.getElementById('galleryAdminGrid');

async function renderGalleryAdmin() {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = state.gallery.map(g => {
    const imgSrc = g.image_path || '';
    return `
      <div class="admin-card" data-id="${g.id}">
        <div class="admin-card-media">
          ${imgSrc ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">` : `<div class="media-placeholder">${icon('image', 40)}</div>`}
        </div>
        <div class="admin-card-body">
          <div class="admin-card-title">${g.alt_text || 'صورة المعرض'}</div>
          <div class="admin-card-actions">
            <button class="btn-action" data-upload="${g.id}">${icon('edit', 14)} تغيير</button>
            <button class="btn-action btn-danger" data-delete-gallery="${g.id}">${icon('trash', 14)}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  galleryGrid.querySelectorAll('[data-upload]').forEach(btn => {
    btn.addEventListener('click', () => uploadGalleryImage(btn.dataset.upload));
  });

  galleryGrid.querySelectorAll('[data-delete-gallery]').forEach(btn => {
    btn.addEventListener('click', () => deleteGalleryItem(btn.dataset.deleteGallery));
  });

  const addBtn = document.getElementById('addImageBtn');
  if (addBtn) addBtn.onclick = () => uploadGalleryImage(null);
}

async function deleteGalleryItem(id) {
  if (!await uiConfirm('سيتم حذف الصورة من المعرض نهائيًا.', { title: 'حذف الصورة؟', confirmText: 'نعم، احذف', cancelText: 'تراجع', danger: true })) return;
  if (!DEMO_MODE) {
    const { error } = await supabaseClient.from('gallery').delete().eq('id', id);
    if (error) {
      uiAlert('خطأ في الحذف: ' + error.message, { type: 'error' });
      return;
    }
  }
  state.gallery = state.gallery.filter(g => g.id != id);
  renderGalleryAdmin();
}

async function convertToWebP(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }));
        }, 'image/webp', 0.8); // الجودة 80%
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadGalleryImage(galleryId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    if (DEMO_MODE) {
      uiAlert('أنت في وضع العرض التجريبي. قم بتفعيل Supabase لرفع الصور.');
      return;
    }

    // تحويل تلقائي إلى WebP إذا كانت صورة
    if (file.type.startsWith('image/')) {
      console.log('Converting to WebP...');
      file = await convertToWebP(file);
    }

    // تنظيف اسم الملف
    const cleanFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    try {
      // الرفع إلى Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('gallery')
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Storage Error: ${uploadError.message}. تأكد من وجود Bucket باسم 'gallery' وأنه Public.`);
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabaseClient.storage.from('gallery').getPublicUrl(cleanFileName);
      const publicUrl = urlData.publicUrl;
      
      if (galleryId) {
        // تحديث صورة موجودة في جدول gallery
        const { error: updateError } = await supabaseClient.from('gallery')
          .update({ image_path: publicUrl })
          .eq('id', galleryId);
        
        if (updateError) throw updateError;
        
        const item = state.gallery.find(g => g.id == galleryId);
        if (item) item.image_path = publicUrl;
      } else {
        // إضافة سجل جديد في جدول gallery
        const { data: insertData, error: insertError } = await supabaseClient.from('gallery').insert({
          image_path: publicUrl,
          alt_text: 'صورة جديدة',
          sort_order: state.gallery.length
        }).select();
        
        if (insertError) throw insertError;
        if (insertData) state.gallery.push(insertData[0]);
      }

      await renderGalleryAdmin();
      uiToast('تم الرفع والحفظ بنجاح', { type: 'success' });
    } catch (err) {
      uiAlert('فشل العملية: ' + err.message, { type: 'error' });
      console.error(err);
    }
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
      <div class="li-actions">
        <button class="btn-action" data-pick="${f.id}">${icon('edit', 14)}</button>
        <button class="btn-action btn-danger" data-delete-feature="${f.id}">${icon('trash', 14)}</button>
      </div>
    </div>
  `).join('');

  featuresList.querySelectorAll('[data-pick]').forEach(btn => {
    btn.addEventListener('click', () => openIconPicker(btn.dataset.pick));
  });

  featuresList.querySelectorAll('[data-delete-feature]').forEach(btn => {
    btn.addEventListener('click', () => deleteFeature(btn.dataset.deleteFeature));
  });

  const addBtn = document.getElementById('addFeatureBtn');
  if (addBtn) addBtn.onclick = () => addNewFeature();
}

async function addNewFeature() {
  const title = (await uiPrompt('أدخل اسم الميزة الجديدة', { title: 'ميزة جديدة', placeholder: 'مثال: مسبح خاص', confirmText: 'إضافة' }) || '').trim();
  if (!title) return;
  
  const newFeature = {
    title,
    icon: 'sparkles',
    sort_order: state.features.length
  };

  if (!DEMO_MODE) {
    const { data, error } = await supabaseClient.from('features').insert(newFeature).select();
    if (!error && data) {
      state.features.push(data[0]);
    } else {
      uiAlert('خطأ في الإضافة: ' + (error?.message || 'فشل الاتصال'), { type: 'error' });
    }
  } else {
    state.features.push({ ...newFeature, id: Date.now() });
  }
  renderFeaturesAdmin();
}

async function deleteFeature(id) {
  if (!await uiConfirm('ستختفي هذه الميزة من الموقع.', { title: 'حذف الميزة؟', confirmText: 'نعم، احذف', cancelText: 'تراجع', danger: true })) return;
  
  if (!DEMO_MODE) {
    const { error } = await supabaseClient.from('features').delete().eq('id', id);
    if (error) {
      uiAlert('خطأ في الحذف: ' + error.message, { type: 'error' });
      return;
    }
  }
  state.features = state.features.filter(f => f.id != id);
  renderFeaturesAdmin();
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
   PACKAGES ADMIN — add / edit / delete. A package is identified by its
   `key` (bookings point at it), which never changes after creation.
   `closes` = the packages that become unavailable when it is booked.
   ========================================================= */
const packagesList = document.getElementById('packagesAdminList');

async function renderPackagesAdmin() {
  if (!packagesList) return;
  packagesList.innerHTML = state.packages.map(p => {
    const closes = closesOf(p).filter(k => k !== p.key);
    return `
    <div class="admin-list-item" data-id="${p.key}">
      <div class="li-left">
        <span class="li-icon">${icon(p.icon || 'sparkles', 18)}</span>
        <div>
          <div class="li-title">${uiEscape(p.name)}</div>
          <div class="li-sub">${formatTimeRange(p.start_time, p.end_time)}</div>
          ${closes.length ? `<div class="pkg-closes"><span class="li-sub">تُقفل عند حجزها:</span>${closes.map(k => `<em class="slot-tag">${uiEscape(periodLabel(k))}</em>`).join('')}</div>` : ''}
        </div>
      </div>
      <div class="li-right">
        <span class="li-price">${p.price}&nbsp;${omr()}</span>
        <button class="btn-action" data-edit-package="${p.key}" title="تعديل">${icon('edit', 14)}</button>
        <button class="btn-action btn-danger" data-delete-package="${p.key}" title="حذف">${icon('trash', 14)}</button>
      </div>
    </div>`;
  }).join('') || '<p class="empty-state">لا توجد باقات — أضف باقة ليتمكن الزوار من الحجز</p>';

  packagesList.querySelectorAll('[data-edit-package]').forEach(b => b.addEventListener('click', () => openPackageEditor(b.dataset.editPackage)));
  packagesList.querySelectorAll('[data-delete-package]').forEach(b => b.addEventListener('click', () => deletePackage(b.dataset.deletePackage)));
  const addBtn = document.getElementById('addPackageBtn');
  if (addBtn) addBtn.onclick = () => openPackageEditor(null);
}

let packageEditor = null;

function openPackageEditor(key) {
  const existing = key ? state.packages.find(p => p.key === key) : null;
  const pkg = existing || { name: '', icon: 'sparkles', start_time: '', end_time: '', price: '', closes: [] };
  const others = state.packages.filter(p => p.key !== key);
  let chosenIcon = pkg.icon || 'sparkles';

  if (!packageEditor) {
    packageEditor = document.createElement('div');
    packageEditor.className = 'day-popover';
    document.body.appendChild(packageEditor);
    packageEditor.addEventListener('click', e => { if (e.target === packageEditor) packageEditor.classList.remove('open'); });
  }

  packageEditor.innerHTML = `
    <div class="day-popover-card" style="max-width:420px">
      <h4>${existing ? 'تعديل الباقة' : 'باقة جديدة'}</h4>
      <div class="pkg-form">
        <label>اسم الباقة <input type="text" id="pkgName" value="${uiEscape(pkg.name)}" placeholder="مثال: صباحي" maxlength="40"></label>
        <div class="row2">
          <label>البداية <input type="time" id="pkgStart" value="${pkg.start_time || ''}"></label>
          <label>النهاية <input type="time" id="pkgEnd" value="${pkg.end_time || ''}"></label>
        </div>
        <label>السعر <input type="number" id="pkgPrice" min="0" step="any" value="${pkg.price}" placeholder="0"></label>
        <fieldset><legend>الأيقونة</legend>
          <div class="icon-picker-grid" id="pkgIcons">${PACKAGE_ICON_CHOICES.map(k => `<button type="button" class="icon-picker-item${k === chosenIcon ? ' selected' : ''}" data-pkg-icon="${k}">${icon(k, 24)}</button>`).join('')}</div>
        </fieldset>
        ${others.length ? `<fieldset><legend>تُقفل عند حجزها (غير نفسها)</legend>
          ${others.map(o => `<label class="slot-toggle"><input type="checkbox" data-closes="${o.key}" ${closesOf(pkg).includes(o.key) ? 'checked' : ''}><span>${uiEscape(o.name)}</span></label>`).join('')}
        </fieldset>` : ''}
      </div>
      <div class="day-popover-actions">
        <button class="btn-close-pop" id="pkgCancel">إلغاء</button>
        <button class="btn-save-pop" id="pkgSave">حفظ</button>
      </div>
    </div>`;
  packageEditor.classList.add('open');

  packageEditor.querySelectorAll('[data-pkg-icon]').forEach(b => b.addEventListener('click', () => {
    chosenIcon = b.dataset.pkgIcon;
    packageEditor.querySelectorAll('[data-pkg-icon]').forEach(x => x.classList.toggle('selected', x === b));
  }));
  document.getElementById('pkgCancel').onclick = () => packageEditor.classList.remove('open');
  document.getElementById('pkgSave').onclick = async () => {
    const name = document.getElementById('pkgName').value.trim();
    const start = document.getElementById('pkgStart').value;
    const end = document.getElementById('pkgEnd').value;
    const price = parseFloat(document.getElementById('pkgPrice').value);
    if (!name || !start || !end || isNaN(price) || price < 0) {
      uiAlert('اكتب الاسم والسعر وحدد وقت البداية والنهاية.', { type: 'error' });
      return;
    }
    const newKey = key || 'pkg_' + Date.now().toString(36);
    const closes = [newKey, ...[...packageEditor.querySelectorAll('[data-closes]:checked')].map(c => c.dataset.closes)];
    const row = { name, icon: chosenIcon, start_time: start, end_time: end, price, closes };
    if (await savePackage(newKey, row, !existing)) packageEditor.classList.remove('open');
  };
}

async function savePackage(key, row, isNew) {
  if (!DEMO_MODE) {
    const sort_order = isNew ? Math.max(0, ...state.packages.map(p => p.sort_order || 0)) + 1 : undefined;
    const q = isNew
      ? supabaseClient.from('packages').insert({ key, ...row, sort_order })
      : supabaseClient.from('packages').update(row).eq('key', key).select();
    const { data, error } = await q;
    if (error || (!isNew && (!data || !data.length))) {
      uiAlert('تعذّر حفظ الباقة: ' + (error?.message || 'لم يتم تحديث أي صف (تحقق من الصلاحيات)'), { type: 'error' });
      return false;
    }
  }
  if (isNew) state.packages.push({ id: key, key, sort_order: state.packages.length + 1, ...row });
  else Object.assign(state.packages.find(p => p.key === key), row);
  await renderPackagesAdmin();
  renderCalendarAdmin();
  renderBookingsList();
  uiToast('تم حفظ الباقة', { type: 'success' });
  return true;
}

async function deletePackage(key) {
  const pkg = state.packages.find(p => p.key === key);
  const today = new Date().toISOString().slice(0, 10);
  const live = (typeof bookingsData !== 'undefined' ? bookingsData : []).filter(b =>
    b.period === key && b.status !== BOOKING_STATUS.CANCELLED && b.booking_date >= today);
  if (live.length) {
    uiAlert(`لا يمكن حذف «${pkg.name}»: عليها ${live.length} حجز قادم. ألغِ الحجوزات أولًا.`, { title: 'الباقة مستخدمة', type: 'error' });
    return;
  }
  if (!await uiConfirm('ستختفي هذه الباقة من واجهة الحجز.', { title: `حذف باقة «${pkg.name}»؟`, confirmText: 'نعم، احذف', cancelText: 'تراجع', danger: true })) return;
  if (!DEMO_MODE) {
    const { error } = await supabaseClient.from('packages').delete().eq('key', key);
    if (error) { uiAlert('خطأ في الحذف: ' + error.message, { type: 'error' }); return; }
  }
  state.packages = state.packages.filter(p => p.key !== key);
  await renderPackagesAdmin();
  renderCalendarAdmin();
}

/* =========================================================
   CALENDAR ADMIN
   ========================================================= */
let calendarViewYear = new Date().getFullYear();
let calendarViewMonth = new Date().getMonth();

async function renderCalendarAdmin() {
  const titleEl = document.getElementById('adminCalendarTitle');
  const gridEl = document.getElementById('adminCalendarGrid');
  const dowRow = document.getElementById('adminDowRow');
  if (!gridEl) return;

  // load the closures of the month on screen
  if (!DEMO_MODE) {
    const data = await fetchAvailability(calendarViewYear, calendarViewMonth);
    if (data) {
      const prefix = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-`;
      Object.keys(state.availability).filter(k => k.startsWith(prefix)).forEach(k => delete state.availability[k]);
      data.forEach(row => { state.availability[row.date] = { closed: row.closed || [] }; });
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

  const holdsByDate = bookingHoldsByDate();
  const dotClass = st => (st === 'open' ? '' : st === 'pending' ? 'pending' : 'off');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const avail = state.availability[dateStr] || { closed: [] };
    // same rule as the public calendar: manual closures + bookings (pending = orange, paid = closed)
    const slots = resolveDaySlots(avail, holdsByDate[dateStr] || [], state.packages);
    const statusClass = summarizeDay(slots);

    const dayCell = document.createElement('div');
    dayCell.className = `admin-day-cell ${statusClass}`;
    dayCell.innerHTML = `
      <div class="day-num">${d}</div>
      <div class="day-slots">
        ${state.packages.map(p => `<span class="slot-dot ${dotClass(slots[p.key])}" title="${uiEscape(p.name)}"></span>`).join('')}
      </div>
    `;
    dayCell.onclick = () => openDayPopover(dateStr);
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

function openDayPopover(dateStr) {
  let popover = document.getElementById('dayPopover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'dayPopover';
    popover.className = 'day-popover';
    document.body.appendChild(popover);
  }

  const dayHolds = bookingHoldsByDate()[dateStr] || [];
  const lockedByPaid = resolveDaySlots(null, dayHolds.filter(h => h.status === BOOKING_STATUS.PAID), state.packages);
  const pendingSlots = resolveDaySlots(null, dayHolds.filter(h => h.status === BOOKING_STATUS.PENDING), state.packages);
  const closedNow = () => (state.availability[dateStr] || { closed: [] }).closed;

  popover.innerHTML = `
    <div class="day-popover-card">
      <h4>تعديل التوفر: ${dateStr}</h4>
      <div class="popover-slots">
        ${state.packages.map(p => {
          const locked = lockedByPaid[p.key] === 'closed';
          const pending = pendingSlots[p.key] === 'pending';
          return `
          <label class="slot-toggle ${locked ? 'locked' : ''}">
            <input type="checkbox" data-slot="${p.key}" ${!closedNow().includes(p.key) && !locked ? 'checked' : ''} ${locked ? 'disabled' : ''}>
            <span>${uiEscape(p.name)}</span>
            ${locked ? '<em class="slot-tag paid">محجوز · تم الدفع</em>' : pending ? '<em class="slot-tag pending">محجوز مبدئيًا</em>' : ''}
          </label>`;
        }).join('')}
      </div>
      <div class="day-popover-actions">
        <button class="btn-save-pop" id="closePopover">إغلاق</button>
      </div>
    </div>
  `;

  popover.classList.add('open');
  popover.onclick = (e) => { if (e.target === popover) popover.classList.remove('open'); };
  document.getElementById('closePopover').onclick = () => popover.classList.remove('open');

  popover.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.onchange = async (e) => {
      const pkg = state.packages.find(p => p.key === e.target.dataset.slot);
      const closed = new Set(closedNow());

      if (!e.target.checked) {
        // closing a package closes everything it overlaps with
        closesOf(pkg).forEach(k => closed.add(k));
      } else {
        closed.delete(pkg.key);
        // a package that closes ALL the others (e.g. the full day) reopens them together with itself
        if (closesOf(pkg).length >= state.packages.length) closesOf(pkg).forEach(k => closed.delete(k));
      }
      const row = [...closed].filter(k => state.packages.some(p => p.key === k));
      state.availability[dateStr] = { closed: row };

      popover.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(input => {
        input.checked = !closed.has(input.dataset.slot);
      });

      if (!DEMO_MODE) {
        const q = row.length
          ? supabaseClient.from('availability').upsert({ date: dateStr, closed: row, updated_at: new Date().toISOString() }, { onConflict: 'date' })
          : supabaseClient.from('availability').delete().eq('date', dateStr);   // nothing closed → no row needed
        const { error } = await q;
        if (error) uiAlert('تعذّر حفظ التوفر: ' + error.message, { type: 'error' });
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
