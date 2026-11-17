#!/usr/bin/env node
/* =========================================================
   scripts/new-client.mjs — creates the site of a NEW client in one command
   ---------------------------------------------------------
   node scripts/new-client.mjs ../clients/palm-chalet \
     --name "بالم شاليه" --name-en "Palm Chalet" \
     --url https://palm-chalet.pages.dev \
     --whatsapp 96890000000 \
     --supabase-url https://xxxx.supabase.co --anon-key sb_publishable_xxx \
     --admin-email owner@example.com \
     [--primary "#1f3a2e"] [--accent "#c89b5a"] \
     [--country-code 968] [--currency-code OMR] [--currency-label "ر.ع"]

   What you get in <folder>:
     • a clean copy of the project (without this client's photos, without the template)
     • site.config.js filled with the client's data, neutral placeholder images
     • everything generated (index.html, robots.txt, sitemap.xml, favicon.svg, seed.sql)
     • client-setup.sql — ONE file for the client's Supabase SQL Editor:
       gives the owner the admin role, creates the tables + permissions, fills the defaults.
   ========================================================= */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- arguments ---------- */
const args = { _: [] };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
  else args._.push(argv[i]);
}

const required = ['name', 'name-en', 'url', 'whatsapp', 'supabase-url', 'anon-key', 'admin-email'];
const missing = required.filter(k => !args[k]);
if (!args._[0] || missing.length) {
  console.error(`Usage: node scripts/new-client.mjs <folder> ${required.map(k => `--${k} …`).join(' ')}\n` +
    `Optional: --primary "#hex" --accent "#hex" --country-code 968 --currency-code OMR --currency-label "ر.ع"\n` +
    (missing.length ? `\nMissing: ${missing.map(k => '--' + k).join(', ')}` : ''));
  process.exit(1);
}

const target = resolve(args._[0]);
if (existsSync(target) && readdirSync(target).length) {
  console.error(`"${target}" already exists and is not empty — pick a new folder.`);
  process.exit(1);
}
if (!/^https:\/\/.+\.supabase\.co\/?$/.test(args['supabase-url'])) console.warn('! --supabase-url does not look like https://<project>.supabase.co');
if (!/^\d{8,15}$/.test(args.whatsapp)) { console.error('--whatsapp must be digits only, with the country code (e.g. 96890000000)'); process.exit(1); }
if (!/^https?:\/\//.test(args.url)) { console.error('--url must start with https://'); process.exit(1); }
const email = args['admin-email'].replace(/'/g, "''");

/* ---------- colors ---------- */
const hex = c => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c || '');
  if (!m) { console.error(`"${c}" is not a #rrggbb color`); process.exit(1); }
  return m[1];
};
const mix = (c, to, t) => '#' + [0, 2, 4].map(i => {
  const a = parseInt(c.slice(i, i + 2), 16);
  return Math.round(a + (to - a) * t).toString(16).padStart(2, '0');
}).join('').toUpperCase();
const primary = hex(args.primary || '#2A2F4C');
const accent = hex(args.accent || '#C89B5A');

/* ---------- copy the project ---------- */
const skip = new Set(['template', 'node_modules', '.git', 'client-setup.sql', 'scripts/new-client.mjs']);
cpSync(root, target, {
  recursive: true,
  filter(src) {
    const rel = relative(root, src).split(sep).join('/');
    if (!rel) return true;
    if (skip.has(rel) || rel.endsWith('.zip')) return false;
    if (rel.startsWith('assets/') && rel !== 'assets/omr.svg') return false;   // the source client's photos stay behind
    return true;
  },
});
mkdirSync(join(target, 'assets'), { recursive: true });
cpSync(join(root, 'template/assets'), join(target, 'assets'), { recursive: true });

/* ---------- site.config.js ---------- */
const q = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const values = {
  name: args.name, nameEn: args['name-en'], countryCode: args['country-code'] || '968',
  url: args.url.replace(/\/+$/, ''), supabaseUrl: args['supabase-url'].replace(/\/+$/, ''), anonKey: args['anon-key'],
  primary: '#' + primary.toUpperCase(), primaryDeep: mix(primary, 0, 0.4),
  accent: '#' + accent.toUpperCase(), accentSoft: mix(accent, 255, 0.3),
  whatsapp: args.whatsapp, currencyCode: args['currency-code'] || 'OMR', currencyLabel: args['currency-label'] || 'ر.ع',
};
let config = readFileSync(join(root, 'template/site.config.js'), 'utf8')
  .replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in values)) throw new Error(`template token ${m} has no value`); return q(values[k]); });
writeFileSync(join(target, 'site.config.js'), config);

/* ---------- generate everything ---------- */
execFileSync(process.execPath, [join(target, 'scripts/build.mjs')], { cwd: target, stdio: 'inherit' });

/* ---------- client-setup.sql: grant + schema + seed in one paste ---------- */
const schema = readFileSync(join(target, 'supabase/schema.sql'), 'utf8');
const seed = readFileSync(join(target, 'supabase/seed.sql'), 'utf8');
writeFileSync(join(target, 'client-setup.sql'), `-- =====================================================================
-- Setup of ${values.name} — paste ALL of this into Supabase ▸ SQL Editor ▸ Run
-- Before that: Authentication ▸ Users ▸ Add user  →  ${args['admin-email']}  (the owner's account)
-- Safe to re-run.
-- =====================================================================

-- 1) the owner's account becomes the admin (the database only lets an admin write)
do $$
declare n integer;
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
   where email = '${email}';
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'No user with email ${email}. Create it first: Authentication > Users > Add user.';
  end if;
end $$;

-- 2) tables + permissions (supabase/schema.sql)
${schema}

-- 3) this client's defaults (supabase/seed.sql)
${seed}`);

/* ---------- checklist ---------- */
console.log(`
✔ ${values.name}  →  ${target}

Next steps
  1. Supabase (${values.supabaseUrl})
       Authentication ▸ Users ▸ Add user → ${args['admin-email']}
       SQL Editor ▸ paste client-setup.sql ▸ Run
       Authentication ▸ Providers ▸ Email: turn OFF "Allow new users to sign up"
  2. Replace the placeholder images in assets/ (hero-desktop.webp, hero-mobile.webp, logo.png, logo.webp,
     calendar-accent.webp, calendar-background.webp). The owner uploads the gallery from /admin.
  3. Review site.config.js (texts, packages, terms) then:  node scripts/build.mjs
  4. Push to Git and connect Cloudflare Pages (no build command, output folder "/").
  5. Open /admin and sign in as the owner.
`);
