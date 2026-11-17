/* =========================================================
   site.config.js — THE ONE FILE THAT MAKES THIS SITE "THIS CLIENT'S SITE"
   ---------------------------------------------------------
   Everything that differs between two clients lives here (and nowhere else):
   name, colors, domain, Supabase project, packages, texts, SEO.

   After editing:      node scripts/build.mjs
   (bakes the values into index.html, robots.txt, sitemap.xml, favicon.svg
    and supabase/seed.sql — no build step on the host, just commit the result)

   What the OWNER can change later from /admin (stored in the DB, wins over
   the defaults below): WhatsApp, Instagram, map + location text, weekend
   surcharge, deposit %, full-payment window, hero subtitle, terms, plus
   packages / gallery / features / calendar.

   Texts may use placeholders:  {brand.name}  {brand.nameEn}  {site.url} …
   ========================================================= */
(function (root) {
  'use strict';

  const config = {
    /* ---------- Identity ---------- */
    brand: {
      name: 'أمازون شاليه',
      nameEn: 'AMAZON CHALET',
      countryCode: '968',            // WhatsApp numbers start with it; the footer shows the number without it
    },

    /* ---------- Domain (canonical, sitemap, social preview) ---------- */
    site: {
      url: 'https://amazon-3nm.pages.dev',
    },

    /* ---------- Supabase project (the anon key is public by design; RLS protects the data) ---------- */
    supabase: {
      url: 'https://ghnzdcxrrqoykswzmxuj.supabase.co',
      anonKey: 'sb_publishable_WQlEp2ETMNsSQFbuI8DXVg_xb45MR7L',
    },

    /* ---------- Theme: colors only (everything else is shared) ---------- */
    theme: {
      forest: '#2A2F4C',        // primary dark
      forestDeep: '#1B1E33',    // darker shade (footer, overlays)
      beige: '#EDE6D7',         // section background
      beigeSoft: '#F8F4EB',     // page background
      charcoal: '#2B2A28',      // body text
      amber: '#C89B5A',         // accent / buttons
      amberSoft: '#E2C48D',     // accent highlight
      aqua: '#2CA0BE',          // available-day / water accent
    },

    /* ---------- Contact (owner can change from /admin) ---------- */
    contact: {
      whatsapp: '96890992253',
      instagram: 'https://instagram.com/amazon_chalet',
    },

    /* ---------- Location (owner can change from /admin) ---------- */
    location: {
      name: 'أمازون شاليه - جبل الأخضر',
      mapEmbedUrl: 'https://maps.google.com/maps?q=Jabal%20Akhdar%2C%20Oman&t=&z=11&ie=UTF8&iwloc=&output=embed',
      heading: 'وسط الطبيعة، وقريب من كل شيء',
      text: 'يقع {brand.name} في قلب الطبيعة العُمانية، على بعد دقائق من الطريق الرئيسي، في محيط هادئ يحيط به الجبل والخضرة.',
    },

    /* ---------- Pricing rules (owner can change from /admin) ---------- */
    pricing: {
      currencyCode: 'OMR',           // OMR shows the Omani rial symbol; any other code shows currencyLabel as text
      currencyLabel: 'ر.ع',          // used in the WhatsApp message (and as the symbol for non-OMR)
      weekendSurcharge: 15,          // added to every package on weekend days
      weekendDays: [5, 6],           // 0 = Sunday … 6 = Saturday  (Fri + Sat)
      depositPercent: 40,            // % of the price for a booking made early enough
      fullPaymentDays: 3,            // closer than this many days → pay everything
    },

    /* ---------- Packages ----------
       The default list (also written to the DB by supabase/seed.sql; the owner edits them from /admin).
       key       unique id (letters / digits / _)
       icon      a name from js/icons.js
       closes    keys that become UNAVAILABLE when this package is booked (itself is always included) */
    packages: [
      { key: 'morning',   name: 'صباحي',      icon: 'sun',     start_time: '08:00', end_time: '13:00', price: 25, closes: ['morning', 'full_day', 'overnight'] },
      { key: 'evening',   name: 'مسائي',      icon: 'moon',    start_time: '16:00', end_time: '22:00', price: 30, closes: ['evening', 'full_day', 'overnight'] },
      { key: 'full_day',  name: 'يوم كامل',   icon: 'fullDay', start_time: '08:00', end_time: '22:00', price: 45, closes: ['morning', 'evening', 'full_day', 'overnight'] },
      { key: 'overnight', name: 'مع المبيت',  icon: 'home',    start_time: '16:00', end_time: '12:00', price: 65, closes: ['morning', 'evening', 'full_day', 'overnight'] },
    ],

    /* ---------- Amenities strip (owner can change from /admin) ---------- */
    features: [
      { id: 'pool',  icon: 'amenityPool',  title: 'مسبح خاص' },
      { id: 'kids',  icon: 'amenityKids',  title: 'ألعاب أطفال' },
      { id: 'court', icon: 'amenityCourt', title: 'ملعب كرة' },
      { id: 'bbq',   icon: 'amenityBBQ',   title: 'شواء' },
      { id: 'wifi',  icon: 'amenityWifi',  title: 'واي فاي' },
      { id: 'bed',   icon: 'amenityBed',   title: 'غرف نوم' },
      { id: 'relax', icon: 'amenityRelax', title: 'استرخاء' },
    ],

    /* ---------- Gallery shown until the owner uploads photos from /admin ---------- */
    gallery: [
      { src: 'assets/hero-photo-dusk.webp',   alt: '{brand.name} عند الغروب', wide: true },
      { src: 'assets/hero-photo-day.webp',    alt: 'المسبح نهارًا', wide: true },
      { src: 'assets/gallery-pool.webp',      alt: 'المسبح الخاص' },
      { src: 'assets/gallery-bedroom.webp',   alt: 'غرفة النوم' },
      { src: 'assets/gallery-bbq.webp',       alt: 'منطقة الشواء' },
      { src: 'assets/gallery-football.webp',  alt: 'ملعب الكرة' },
      { src: 'assets/gallery-playground.webp', alt: 'ألعاب الأطفال' },
      { src: 'assets/calendar-accent.webp',   alt: 'المسبح ليلاً' },
    ],

    /* ---------- Page texts ---------- */
    content: {
      heroSubtitle: 'ملاذك الفاخر وسط طبيعة عُمان',      // owner can change from /admin
      heroImageAlt: '{brand.name} — مسبح خاص وإطلالة فاخرة',
      galleryTitle: 'لحظات تستحق أن تُعاش',
      gallerySub: 'جولة بصرية داخل {brand.name}',
      /* hero strip; icon: users | star | shield | home | clock — use [] to hide the strip */
      stats: [
        { icon: 'users',  value: '+500', label: 'زيارة هذا العام' },
        { icon: 'star',   value: '4.9',  label: 'تقييم الضيوف' },
        { icon: 'shield', value: '100%', label: 'خصوصية تامة' },
      ],
      /* terms & conditions (HTML allowed here; the owner's plain-text version from /admin replaces it) */
      terms: [
        'الدخول والخروج في التوقيت الموضح تحت الفترة المختارة.',
        'يتوجب على المستأجر الالتزام بالوقت المحدد لتسليم الشاليه لعدم تأخير عملية التنظيف للزبون القادم.',
        'يتوجب دفع مبلغ للتأمين وقدره 20 ريالاً عمانياً.',
        'يتم استرداد مبلغ التأمين بالكامل خلال 24 ساعة من وقت الخروج، وذلك بعد فحص الشاليه والتأكد من عدم وجود أي أضرار أو تلفيات في الممتلكات.',
        '<strong>الإلغاء قبل 7 أيام من موعد الحجز:</strong><br>يتم استرجاع مبلغ العربون كاملاً.',
        '<strong>الإلغاء خلال أقل من 7 أيام من موعد الحجز:</strong><br>لا يحق للمستأجر استرجاع مبلغ العربون، ولكن يمكن تغيير تاريخ الحجز (لمرة واحدة فقط) في حال توفر موعد بديل خلال نفس الشهر.',
      ],
    },

    /* ---------- SEO / social preview ---------- */
    seo: {
      title: '{brand.name} | {brand.nameEnTitle} — شاليه فاخر خاص للإيجار في عُمان',
      description: '{brand.name}، شاليه فاخر خاص للإيجار اليومي في عُمان. مسبح خاص، جلسات خارجية، وهدوء تام بعيدًا عن الزحمة. شاهد الأيام المتاحة واحجز مباشرة عبر واتساب.',
      keywords: 'شاليهات للإيجار في عمان, شاليه خاص عمان, حجز شاليه, شاليه مسبح خاص, شاليهات جبل الأخضر, {brand.name}, استراحة عمان',
      shareTitle: '{brand.name} | {brand.nameEnTitle} — شاليه فاخر خاص للإيجار في عُمان',
      shareDescription: 'مسبح خاص، جلسات خارجية، وهدوء تام. شاهد الأيام المتاحة واحجز شاليهك مباشرة عبر واتساب.',
      twitterTitle: '{brand.name} | {brand.nameEnTitle}',
      twitterDescription: 'شاليه فاخر خاص للإيجار في عُمان — مسبح خاص وهدوء تام. احجز عبر واتساب.',
      locale: 'ar_OM',
      country: 'OM',
      businessType: 'LodgingBusiness',
      businessDescription: 'شاليه فاخر خاص للإيجار اليومي في عُمان، يضم مسبحًا خاصًا وجلسات خارجية.',
      image: 'assets/hero-desktop.webp',   // social preview image (same file as the hero)
    },
  };

  root.SITE_CONFIG = config;
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
})(typeof window !== 'undefined' ? window : globalThis);
