#!/usr/bin/env node
/* =========================================================
   scripts/build.mjs — bakes site.config.js into the static files
   ---------------------------------------------------------
   usage:   node scripts/build.mjs           write the files
            node scripts/build.mjs --check   exit 1 if a file is out of date (CI / tests)

   • index.html, admin/index.html   data-cfg* bindings, <!--cfg:…--> regions, theme colors in the critical CSS
   • robots.txt, sitemap.xml        the client's domain
   • favicon.svg                    brand initial in the theme colors
   • supabase/seed.sql              default settings, packages and features of this client

   It is idempotent: running it twice changes nothing. There is no build step on the host —
   the output is committed, so Cloudflare Pages / any static host just serves the files.
   ========================================================= */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const raw = require(join(root, 'site.config.js'));
const SiteConfig = require(join(root, 'js/config.js'));
const cfg = SiteConfig.derive(raw);
const check = process.argv.includes('--check');

const esc = SiteConfig.escapeHtml;
const sql = v => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const VOID = new Set(['meta', 'link', 'img', 'input', 'br', 'hr', 'source']);

/* ---------- tiny HTML binder (no dependencies) ---------- */

function parseAttrs(str) {
  const attrs = [];
  str.replace(/([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g, (m, name, a, b, c) => {
    attrs.push([name, a ?? b ?? c ?? null]);
    return m;
  });
  return attrs;
}

function buildOpenTag(tag, attrs, selfClose) {
  const parts = attrs.map(([n, v]) => (v === null ? n : `${n}="${String(v).replace(/"/g, '&quot;')}"`));
  return `<${tag}${parts.length ? ' ' + parts.join(' ') : ''}${selfClose ? ' /' : ''}>`;
}

/* index of the matching </tag> for an element whose content starts at `from` */
function findClose(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (!m[0].endsWith('/>') && depth === 0) return m.index;
  }
  return -1;
}

function bind(html) {
  const openRe = /<([a-zA-Z][\w-]*)\b((?:[^<>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let out = '', last = 0, m;
  while ((m = openRe.exec(html))) {
    if (!/\sdata-cfg[-\w]*=/.test(' ' + m[2])) continue;
    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2]);
    const get = n => (attrs.find(a => a[0] === n) || [null, null])[1];
    const r = SiteConfig.resolveBinding(cfg, get);

    Object.entries(r.attrs).forEach(([k, v]) => {
      const a = attrs.find(x => x[0] === k);
      if (a) a[1] = v; else attrs.push([k, v]);
    });
    if (r.hidden !== undefined) {
      const i = attrs.findIndex(a => a[0] === 'hidden');
      if (r.hidden && i < 0) attrs.push(['hidden', null]);
      if (!r.hidden && i >= 0) attrs.splice(i, 1);
    }

    out += html.slice(last, m.index) + buildOpenTag(m[1], attrs, !!m[3]);
    last = m.index + m[0].length;

    const content = r.html !== undefined ? r.html : r.text !== undefined ? esc(r.text) : null;
    if (content !== null && !VOID.has(tag) && !m[3]) {
      const close = findClose(html, tag, last);
      if (close < 0) throw new Error(`no closing </${tag}> for ${m[0].slice(0, 80)}`);
      out += content;
      last = close;                 // skip the old content; the closing tag is copied later
      openRe.lastIndex = close;
    }
  }
  return out + html.slice(last);
}

function fillRegions(html) {
  return html.replace(/<!--cfg:(\w+)-->[\s\S]*?<!--\/cfg:\1-->/g, (all, name) => {
    if (!SiteConfig.regions[name]) throw new Error(`unknown region "${name}"`);
    return `<!--cfg:${name}-->${SiteConfig.regions[name](cfg)}<!--/cfg:${name}-->`;
  });
}

/* the critical inline CSS repeats a few theme colors so the first paint already has them */
function fillCriticalCss(html) {
  const t = cfg.theme || {};
  return html
    .replace(/(\.btn-primary \{ background: )#[0-9a-fA-F]{3,8}/, `$1${t.amber}`)
    .replace(/(\.btn-primary:hover \{ background: )#[0-9a-fA-F]{3,8}/, `$1${t.amberSoft}`);
}

/* ---------- outputs ---------- */

const outputs = [];
const add = (file, content) => outputs.push([file, content]);

for (const file of ['index.html', 'admin/index.html']) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  let html = readFileSync(path, 'utf8');
  html = fillRegions(bind(html));
  if (file === 'index.html') html = fillCriticalCss(html);
  add(file, html);
}

add('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${cfg.site.origin}/sitemap.xml\n`);

const today = new Date().toISOString().slice(0, 10);
const sitemapPath = join(root, 'sitemap.xml');
const previous = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';
const keep = previous.includes(`<loc>${cfg.site.home}</loc>`) && previous.match(/<lastmod>([^<]*)<\/lastmod>/);
const lastmod = keep ? keep[1] : today;      // the date only moves when the domain changes
add('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${cfg.site.home}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);

const initial = esc(String(cfg.brand.nameEn || cfg.brand.name || 'A').trim().charAt(0).toUpperCase());
add('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="${cfg.theme.forest}"/><text x="50" y="66" font-size="52" font-weight="bold" fill="${cfg.theme.amber}" text-anchor="middle" font-family="Georgia, serif">${initial}</text></svg>
`);

/* supabase/seed.sql — defaults of this client. Never overwrites rows the owner already has. */
const pk = cfg.packages.map((p, i) =>
  `  (${sql(p.key)}, ${sql(p.name)}, ${sql(p.icon)}, ${sql(p.start_time)}, ${sql(p.end_time)}, ${Number(p.price)}, array[${(p.closes || [p.key]).map(sql).join(', ')}]::text[], ${i + 1})`);
const ft = cfg.features.map((f, i) => `  (${sql(f.title)}, ${sql(f.icon)}, ${i + 1})`);
add('supabase/seed.sql', `-- =====================================================================
-- Default data of ${cfg.brand.name} — GENERATED from site.config.js by scripts/build.mjs (do not edit by hand)
-- Safe to re-run: it only fills what is still empty, so the owner's edits are never overwritten.
-- Run it after supabase/schema.sql.
-- =====================================================================

insert into public.settings (id, whatsapp_number, instagram_url, map_embed_url, location_name,
                             weekend_surcharge, deposit_percent, full_payment_days)
values (1, ${sql(cfg.contact.whatsapp)}, ${sql(cfg.contact.instagram)}, ${sql(cfg.location.mapEmbedUrl)}, ${sql(cfg.location.name)},
        ${Number(cfg.pricing.weekendSurcharge) || 0}, ${Number(cfg.pricing.depositPercent) || 0}, ${Number(cfg.pricing.fullPaymentDays) || 0})
on conflict (id) do nothing;

insert into public.packages (key, name, icon, start_time, end_time, price, closes, sort_order) values
${pk.join(',\n')}
on conflict (key) do update set      -- only fills the columns older databases don't have yet; never touches name / price / times
  icon   = coalesce(public.packages.icon, excluded.icon),
  closes = case when public.packages.closes = '{}' then excluded.closes else public.packages.closes end;

insert into public.features (title, icon, sort_order)
select v.title, v.icon, v.sort_order
from (values
${ft.join(',\n')}
) as v(title, icon, sort_order)
where not exists (select 1 from public.features);
`);

/* ---------- write / check ---------- */

let stale = 0, changed = 0;
for (const [file, content] of outputs) {
  const path = join(root, file);
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (current === content) continue;
  if (check) { console.error(`out of date: ${file}`); stale++; continue; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`updated ${file}`);
  changed++;
}
if (check) {
  if (stale) { console.error(`\n${stale} file(s) out of date — run: node scripts/build.mjs`); process.exit(1); }
  console.log('all generated files are up to date');
} else if (!changed) {
  console.log('nothing to change — all generated files are up to date');
}
