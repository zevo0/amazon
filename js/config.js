/* =========================================================
   Site configuration core
   ---------------------------------------------------------
   One file, two runtimes:
   • browser  → loaded right after site.config.js; applies the data-cfg
                bindings and re-applies them once the owner's settings
                (Supabase `settings` row) arrive. (Theme colors are baked
                into the HTML by the build script, so there is no flash.)
   • Node     → required by scripts/build.mjs to bake the very same
                values into the static HTML (SEO, no flash, no JS needed).

   Layers (later wins):   site.config.js  <  settings row (owner edits)

   Bindings (put them on any element of index.html / admin/index.html):
     data-cfg="brand.name"                    → textContent
     data-cfg-html="content.termsHtml"        → innerHTML (trusted values only)
     data-cfg-attr="href:links.whatsapp;alt:brand.name"   → attributes
     data-cfg-hide-empty="content.stats"      → [hidden] when the value is empty
     <!--cfg:name--> … <!--/cfg:name-->      → generated blocks (theme, stats), build time only
   ========================================================= */
(function (root) {
  'use strict';

  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const clone = v => JSON.parse(JSON.stringify(v));

  /* Deep merge. null / undefined / '' in `over` are ignored (empty field = keep the default). Arrays replace. */
  function merge(base, over) {
    if (!isObj(base) || !isObj(over)) return over === undefined || over === null || over === '' ? base : over;
    const out = { ...base };
    Object.keys(over).forEach(k => {
      const v = over[k];
      if (v === undefined || v === null || v === '') return;
      out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
    });
    return out;
  }

  function lookup(cfg, path) {
    return String(path).split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), cfg);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* "{brand.name}" inside any config string */
  function format(str, cfg) {
    return typeof str !== 'string' ? str : str.replace(/\{([\w.]+)\}/g, (m, p) => {
      const v = lookup(cfg, p);
      return v === undefined || v === null || typeof v === 'object' ? m : v;
    });
  }

  function formatDeep(value, cfg) {
    if (typeof value === 'string') return format(value, cfg);
    if (Array.isArray(value)) return value.map(v => formatDeep(v, cfg));
    if (isObj(value)) { const o = {}; Object.keys(value).forEach(k => { o[k] = formatDeep(value[k], cfg); }); return o; }
    return value;
  }

  /* settings row (snake_case columns the owner edits) → config shape */
  function settingsToConfig(s) {
    if (!s) return {};
    const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? undefined : Number(v));
    return {
      contact: { whatsapp: s.whatsapp_number, instagram: s.instagram_url },
      location: { mapEmbedUrl: s.map_embed_url, name: s.location_name, text: s.location_description },
      pricing: {
        weekendSurcharge: num(s.weekend_surcharge),
        depositPercent: num(s.deposit_percent),
        fullPaymentDays: num(s.full_payment_days),
      },
      content: { heroSubtitle: s.hero_subtitle, termsText: s.terms_text },
    };
  }

  /* Directions link built from the Google Maps embed URL's ?q= */
  function directionsFrom(embedUrl) {
    try {
      const q = new URL(embedUrl).searchParams.get('q');
      if (q) return 'https://maps.google.com/?q=' + encodeURIComponent(q);
    } catch (e) { /* not a URL */ }
    return embedUrl ? String(embedUrl) : '#location';
  }

  /* Everything the page needs that is computed from the raw config */
  function derive(raw) {
    const c = clone(raw);
    ['brand', 'site', 'contact', 'location', 'pricing', 'content', 'seo'].forEach(k => { c[k] = c[k] || {}; });
    c.packages = c.packages || [];
    c.features = c.features || [];
    c.gallery = c.gallery || [];

    const digits = String(c.contact.whatsapp || '').replace(/\D/g, '');
    c.contact.whatsapp = digits;
    const cc = String(c.brand.countryCode || '');
    c.contact.phoneDisplay = cc && digits.startsWith(cc) ? digits.slice(cc.length) : digits;
    c.brand.nameEnTitle = String(c.brand.nameEn || '').toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());   // "PALM CHALET" → "Palm Chalet"
    c.brand.logoAlt = c.brand.nameEn ? `${c.brand.name} — ${c.brand.nameEn}` : c.brand.name;

    c.admin = { title: `لوحة التحكم | ${c.brand.name}` };
    c.site.origin = String(c.site.url || '').replace(/\/+$/, '');
    c.site.home = c.site.origin + '/';
    c.pricing.currencyLabel = c.pricing.currencyLabel || c.pricing.currencyCode || '';
    c.pricing.weekendDays = Array.isArray(c.pricing.weekendDays) ? c.pricing.weekendDays : [];
    c.pricing.depositRatio = (Number(c.pricing.depositPercent) || 0) / 100;

    c.links = {
      whatsapp: digits ? 'https://wa.me/' + digits : '#',
      instagram: c.contact.instagram || '#',
      directions: directionsFrom(c.location.mapEmbedUrl),
    };

    // {brand.name}-style placeholders inside the texts
    ['content', 'location', 'seo', 'gallery', 'features'].forEach(k => { c[k] = formatDeep(c[k], c); });
    c.location.mapTitle = c.location.name || c.brand.name;

    // terms: the owner's plain text (escaped, one paragraph per line) wins over the developer's HTML list
    const termsText = String(c.content.termsText || '').trim();
    c.content.termsHtml = termsText
      ? termsText.split(/\n+/).map(l => `<p>${escapeHtml(l.trim())}</p>`).join('')
      : (c.content.terms || []).map(t => `<p>${t}</p>`).join('');

    // SEO values that are built from other values
    const prices = c.packages.map(p => Number(p.price)).filter(n => !isNaN(n));
    const cur = c.pricing.currencyCode || '';
    c.seo.imageUrl = c.site.origin + '/' + String(c.seo.image || '').replace(/^\/+/, '');
    c.seo.priceRange = prices.length ? `${cur} ${Math.min(...prices)} - ${cur} ${Math.max(...prices)}`.trim() : '';
    c.seo.jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': c.seo.businessType || 'LodgingBusiness',
      name: c.brand.nameEnTitle ? `${c.brand.name} (${c.brand.nameEnTitle})` : c.brand.name,
      description: c.seo.businessDescription || c.seo.description,
      image: c.seo.imageUrl,
      url: c.site.home,
      address: { '@type': 'PostalAddress', addressCountry: c.seo.country || undefined },
      ...(c.seo.priceRange ? { priceRange: c.seo.priceRange } : {}),
    }, null, 2).replace(/</g, '\\u003c');
    return c;
  }

  const THEME_VARS = {
    forest: '--forest', forestDeep: '--forest-deep', beige: '--beige', beigeSoft: '--beige-soft',
    charcoal: '--charcoal', amber: '--amber', amberSoft: '--amber-soft', aqua: '--aqua',
  };
  function themeVars(theme) {
    const out = {};
    Object.keys(THEME_VARS).forEach(k => { if (theme && theme[k]) out[THEME_VARS[k]] = theme[k]; });
    return out;
  }

  /* One binding resolver shared by the browser and the build script.
     getAttr(name) → the element's attribute value or null. */
  function resolveBinding(cfg, getAttr) {
    const out = { attrs: {} };
    const v = p => lookup(cfg, p);
    const text = getAttr('data-cfg');
    const html = getAttr('data-cfg-html');
    const attrs = getAttr('data-cfg-attr');
    const hideEmpty = getAttr('data-cfg-hide-empty');
    if (text) { const x = v(text); if (x !== undefined && x !== null) out.text = String(x); }
    if (html) { const x = v(html); if (x !== undefined && x !== null) out.html = String(x); }
    if (attrs) attrs.split(';').forEach(pair => {
      const i = pair.indexOf(':');
      if (i < 1) return;
      const x = v(pair.slice(i + 1).trim());
      if (x !== undefined && x !== null) out.attrs[pair.slice(0, i).trim()] = String(x);
    });
    if (hideEmpty) { const x = v(hideEmpty); out.hidden = x === undefined || x === null || x === '' || (Array.isArray(x) && x.length === 0); }
    return out;
  }

  /* Blocks that are generated rather than bound:  <!--cfg:name--> … <!--/cfg:name-->  (used by scripts/build.mjs) */
  const STAT_ICONS = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    star: '<path d="m12 3 2.6 5.34 5.9.86-4.27 4.16 1 5.88L12 16.4l-5.23 2.84 1-5.88L3.5 9.2l5.9-.86L12 3Z"/>',
    shield: '<path d="M12 2 4 5.5V11c0 5.2 3.4 9.7 8 11 4.6-1.3 8-5.8 8-11V5.5L12 2Z"/><path d="m9 12 2 2 4-4"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  };
  const regions = {
    theme(cfg) {
      const vars = themeVars(cfg.theme);
      return '\n<style>:root{' + Object.keys(vars).map(k => `${k}:${vars[k]}`).join(';') + '}</style>\n';
    },
    stats(cfg) {
      const items = (cfg.content.stats || []).map(s => `      <div class="hero-stat">
        <span class="hero-stat-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${STAT_ICONS[s.icon] || STAT_ICONS.star}</svg></span>
        <div class="hero-stat-text"><strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span></div>
      </div>`);
      return '\n' + items.join('\n      <div class="hero-stat-divider"></div>\n') + '\n      ';
    },
  };

  const api = { merge, lookup, format, escapeHtml, settingsToConfig, derive, themeVars, resolveBinding, regions, current: null };

  /* ---------------- browser glue ---------------- */
  if (root.document && root.SITE_CONFIG) {
    api.current = derive(root.SITE_CONFIG);

    api.apply = function (scope) {
      (scope || root.document).querySelectorAll('[data-cfg],[data-cfg-html],[data-cfg-attr],[data-cfg-hide-empty]').forEach(el => {
        const r = resolveBinding(api.current, n => el.getAttribute(n));
        // only touch what actually changed (re-setting an iframe's src would reload it)
        if (r.text !== undefined && el.textContent !== r.text) el.textContent = r.text;
        if (r.html !== undefined && el.innerHTML !== r.html) el.innerHTML = r.html;
        Object.keys(r.attrs).forEach(a => { if (el.getAttribute(a) !== r.attrs[a]) el.setAttribute(a, r.attrs[a]); });
        if (r.hidden !== undefined) el.hidden = r.hidden;
      });
    };

    /* Owner settings arrived (or changed): recompute and repaint */
    api.update = function (settingsRow) {
      api.current = derive(merge(root.SITE_CONFIG, settingsToConfig(settingsRow)));
      api.apply();
      root.document.dispatchEvent(new CustomEvent('siteconfig', { detail: api.current }));
    };

    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => api.apply());
    else api.apply();
  }

  root.SiteConfig = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
