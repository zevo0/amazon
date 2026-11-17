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
      name: '{{name}}',
      nameEn: '{{nameEn}}',
      countryCode: '{{countryCode}}',   // WhatsApp numbers start with it; the footer shows the number without it
    },

    /* ---------- Domain (canonical, sitemap, social preview) ---------- */
    site: {
      url: '{{url}}',
    },

    /* ---------- Supabase project (the anon / publishable key is public by design; RLS protects the data) ---------- */
    supabase: {
      url: '{{supabaseUrl}}',
      anonKey: '{{anonKey}}',
    },

    /* ---------- Theme: colors only (everything else is shared) ---------- */
    theme: {
      forest: '{{primary}}',          // primary dark
      forestDeep: '{{primaryDeep}}',  // darker shade (footer, overlays)
      beige: '#EDE6D7',               // section background
      beigeSoft: '#F8F4EB',           // page background
      charcoal: '#2B2A28',            // body text
      amber: '{{accent}}',            // accent / buttons
      amberSoft: '{{accentSoft}}',    // accent highlight
      aqua: '#2CA0BE',                // available-day accent
    },

    /* ---------- Contact (owner can change from /admin) ---------- */
    contact: {
      whatsapp: '{{whatsapp}}',
      instagram: '',
    },

    /* ---------- Location (owner can change from /admin) ---------- */
    location: {
      name: '{{name}}',
      mapEmbedUrl: 'https://maps.google.com/maps?q=Muscat%2C%20Oman&t=&z=10&ie=UTF8&iwloc=&output=embed',
      heading: 'موقعنا',
      text: 'يقع {brand.name} في موقع هادئ ومميز. تواصل معنا عبر واتساب لمعرفة الاتجاهات.',
    },

    /* ---------- Pricing rules (owner can change from /admin) ---------- */
    pricing: {
      currencyCode: '{{currencyCode}}',   // OMR shows the Omani rial symbol; any other code shows currencyLabel as text
      currencyLabel: '{{currencyLabel}}',
      weekendSurcharge: 0,                // added to every package on weekend days
      weekendDays: [5, 6],                // 0 = Sunday … 6 = Saturday  (Fri + Sat)
      depositPercent: 40,                 // % of the price for a booking made early enough
      fullPaymentDays: 3,                 // closer than this many days → pay everything
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
      { id: 'bbq',   icon: 'amenityBBQ',   title: 'شواء' },
      { id: 'wifi',  icon: 'amenityWifi',  title: 'واي فاي' },
      { id: 'bed',   icon: 'amenityBed',   title: 'غرف نوم' },
      { id: 'relax', icon: 'amenityRelax', title: 'استرخاء' },
    ],

    /* ---------- Gallery shown until the owner uploads photos from /admin ----------
       Empty = the gallery section stays hidden until the first photo is uploaded.
       [{ src: 'assets/photo.webp', alt: '…', wide: true }] to ship a starting gallery. */
    gallery: [],

    /* ---------- Page texts ---------- */
    content: {
      heroSubtitle: 'احجز يومك بسهولة عبر واتساب',      // owner can change from /admin
      heroImageAlt: '{brand.name}',
      galleryTitle: 'معرض الصور',
      gallerySub: 'جولة بصرية داخل {brand.name}',
      /* hero strip; icon: users | star | shield | home | clock — [] hides the strip.
         Only put numbers that are TRUE for this client. */
      stats: [],
      /* terms & conditions (HTML allowed here; the owner's plain-text version from /admin replaces it) */
      terms: [
        'الدخول والخروج في التوقيت الموضح تحت الفترة المختارة.',
        'يتوجب على المستأجر الالتزام بالوقت المحدد لتسليم المكان.',
        'يتم تأكيد الحجز بعد دفع العربون المطلوب.',
        '<strong>الإلغاء:</strong><br>تُحدَّد شروط استرجاع العربون من قِبل المالك — عدّل هذا النص من لوحة التحكم.',
      ],
    },

    /* ---------- SEO / social preview ---------- */
    seo: {
      title: '{brand.name} | {brand.nameEnTitle} — احجز مباشرة عبر واتساب',
      description: '{brand.name} — شاهد الأيام المتاحة واحجز مباشرة عبر واتساب.',
      keywords: '{brand.name}, حجز شاليه, شاليه للإيجار',
      shareTitle: '{brand.name} | {brand.nameEnTitle}',
      shareDescription: 'شاهد الأيام المتاحة واحجز مباشرة عبر واتساب.',
      twitterTitle: '{brand.name} | {brand.nameEnTitle}',
      twitterDescription: 'شاهد الأيام المتاحة واحجز مباشرة عبر واتساب.',
      locale: 'ar_OM',
      country: 'OM',
      businessType: 'LodgingBusiness',
      businessDescription: '{brand.name} — شاليه للإيجار اليومي.',
      image: 'assets/hero-desktop.webp',   // social preview image (same file as the hero)
    },
  };

  root.SITE_CONFIG = config;
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
})(typeof window !== 'undefined' ? window : globalThis);
