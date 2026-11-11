/* =========================================================
   Cloudflare Pages Function — dynamic Open Graph image
   ---------------------------------------------------------
   WhatsApp / Telegram / Facebook crawlers do NOT run JavaScript,
   so the preview image must already be inside the HTML they get.

   This function runs only for the home page (see _routes.json)
   and sets og:image / twitter:image to the SAME hero image the
   page itself displays (the <picture> inside .hero-media).
   Whenever the owner replaces the hero image, the preview follows
   automatically — no manual edit of any meta tag.

   A short version token (the file's ETag / Last-Modified) is added
   to the image URL so a changed hero is a NEW url for the crawlers.

   If this function is not deployed, the static og:image tag in
   index.html is used instead (it points at the same hero file).
   ========================================================= */

const VERSION_TTL_MS = 60 * 1000;
const versionCache = new Map(); // heroPath -> { v, t }

function findHeroSrc(html) {
  const block = html.match(/<div[^>]*class="[^"]*\bhero-media\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (!block) return null;
  const inner = block[1];
  // Prefer the wide (desktop) source — best fit for the 1.91:1 link preview
  const wide = inner.match(/<source[^>]*min-width[^>]*srcset="([^"]+)"/i);
  const img = inner.match(/<img[^>]*\ssrc="([^"]+)"/i);
  const raw = (wide && wide[1]) || (img && img[1]);
  return raw ? raw.trim().split(/\s+/)[0] : null;
}

async function assetVersion(context, absUrl) {
  const key = absUrl.pathname;
  const hit = versionCache.get(key);
  if (hit && Date.now() - hit.t < VERSION_TTL_MS) return hit.v;
  let v = '';
  try {
    const res = await context.env.ASSETS.fetch(new Request(absUrl.href));
    if (res.ok) {
      v = (res.headers.get('etag') || res.headers.get('last-modified') || res.headers.get('content-length') || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 20);
    }
    if (res.body) res.body.cancel();
  } catch (_) { /* no version token — still fine */ }
  versionCache.set(key, { v, t: Date.now() });
  return v;
}

function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, 'i');
  if (re.test(html)) return html.replace(re, `$1${value}$2`);
  return html.replace(/<\/head>/i, `  <meta ${attr}="${name}" content="${value}">\n</head>`);
}

function mimeFor(pathname) {
  const ext = (pathname.split('.').pop() || '').toLowerCase();
  return { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }[ext] || '';
}

export async function onRequest(context) {
  const response = await context.next();
  const url = new URL(context.request.url);

  const isHome = url.pathname === '/' || url.pathname === '/index.html';
  const isHtml = (response.headers.get('content-type') || '').includes('text/html');
  if (!isHome || !isHtml || context.request.method !== 'GET') return response;

  let html = await response.text();

  try {
    const heroSrc = findHeroSrc(html);
    if (heroSrc) {
      const abs = new URL(heroSrc, url.origin);
      const v = await assetVersion(context, abs);
      if (v) abs.searchParams.set('v', v);

      html = setMeta(html, 'property', 'og:image', abs.href);
      html = setMeta(html, 'name', 'twitter:image', abs.href);
      const type = mimeFor(abs.pathname);
      if (type) html = setMeta(html, 'property', 'og:image:type', type);
    }
  } catch (_) { /* on any problem, serve the page untouched */ }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
