# موقع حجز شاليه (نسخة لكل عميل)

موقع عربي (RTL) لعرض وحجز شاليه — HTML/CSS/JavaScript خام + Supabase + لوحة تحكم. النشر على Cloudflare Pages بدون أمر build.
**كل شيء يخص العميل في ملف واحد: `site.config.js`.** نسخة لكل عميل، وكل عميل له مشروع Supabase خاص فيه.

## الفكرة

```
site.config.js  ──►  node scripts/build.mjs  ──►  index.html, admin/index.html, robots.txt,
 (الاسم، الألوان، الدومين،                         sitemap.xml, favicon.svg, supabase/seed.sql
  الباقات، النصوص، SEO)
```

القيم تُكتب داخل الملفات الجاهزة نفسها (SEO، الألوان، الاسم) فتظهر لأول لحظة بدون JavaScript وبدون وميض، ويُرفع الناتج كما هو. ما يعدّله **المالك** من لوحة التحكم (واتساب، خريطة، أسعار، شروط…) يُحفظ في قاعدة البيانات ويتغلّب على الافتراضي في `site.config.js`.

## إنشاء عميل جديد (دقيقتان)

```bash
node scripts/new-client.mjs ../clients/palm-chalet \
  --name "بالم شاليه" --name-en "Palm Chalet" \
  --url https://palm-chalet.pages.dev --whatsapp 96890000000 \
  --supabase-url https://xxxx.supabase.co --anon-key sb_publishable_xxx \
  --admin-email owner@example.com \
  --primary "#1f3a2e" --accent "#c89b5a"
```

اختياري: `--country-code 968 --currency-code OMR --currency-label "ر.ع"` (أي عملة غير OMR تظهر نصًا بدل رمز الريال العماني).

يطلع لك مجلد جاهز: نسخة نظيفة من المشروع، صور placeholder محايدة، كل الملفات المولّدة، وملف **`client-setup.sql`**. بعدها:

1. Supabase ▸ Authentication ▸ Users ▸ **Add user** (بريد المالك)، وعطّل **Allow new users to sign up**.
2. SQL Editor ▸ الصق `client-setup.sql` كامل ▸ Run (يمنح المالك دور admin، ينشئ الجداول والصلاحيات، ويضيف الباقات الافتراضية). آمن لإعادة التشغيل.
3. استبدل الصور في `assets/` (hero-desktop/mobile، logo، calendar-*). المالك يرفع المعرض من `/admin`.
4. عدّل نصوص `site.config.js` (الباقات، الشروط، SEO) ثم `node scripts/build.mjs`.
5. ارفع على Git واربط Cloudflare Pages (بدون build command، مجلد الإخراج `/`).

## ماذا يعدّل المطوّر وماذا يعدّل المالك

| | المطوّر (`site.config.js`) | المالك (`/admin`) |
|---|---|---|
| الهوية: الاسم، الشعار، الألوان، الدومين | ✔ | |
| مشروع Supabase | ✔ | |
| الباقات الافتراضية، المميزات، النصوص، SEO | ✔ (الافتراضي) | الباقات والمميزات والصور من اللوحة |
| واتساب، انستقرام، الخريطة، وصف الموقع | افتراضي | ✔ |
| زيادة نهاية الأسبوع، نسبة العربون، مهلة الدفع الكامل | افتراضي | ✔ |
| عبارة الواجهة الرئيسية، الشروط والأحكام | افتراضي | ✔ |

أي حقل يتركه المالك فاضي يرجع للقيمة الافتراضية في `site.config.js`.

الربط في الصفحة: `data-cfg="brand.name"` (نص)، `data-cfg-html="content.termsHtml"`، `data-cfg-attr="href:links.whatsapp"` (خصائص)، `data-cfg-hide-empty="content.stats"` (إخفاء عند الفراغ)، وكتل مولّدة `<!--cfg:stats-->…<!--/cfg:stats-->`. الألوان فقط تتغير بين العملاء؛ باقي التصميم مشترك.

## الباقات والتقويم

الباقة = `key` + اسم + أيقونة + وقت + سعر + **`closes`** (الباقات اللي تصير غير متاحة لما تُحجز). مثال: «يوم كامل» تقفل الصباحي والمسائي والمبيت. المالك يضيف ويعدّل ويحذف الباقات من اللوحة (لا يُحذف باقة عليها حجوزات قادمة).

التقويم دائمًا **محسوب** ولا يُكتب فيه من الحجوزات: `availability.closed` (إغلاق يدوي من المالك) + الحجوزات، عبر `resolveDaySlots()` في `js/supabase-bookings.js` — نفس الدالة للموقع واللوحة.

## دورة الحجز

1. الزبون يضغط «تأكيد الحجز عبر واتساب» ← حجز **بانتظار العربون** ويصير اليوم **برتقالي** والفترة «محجوز مبدئيًا (بانتظار الدفع)». لا مهلة تلقائية.
2. المالك من اللوحة: **تم الدفع** ← تنقفل الفترة والفترات المتداخلة معها. **سلة المحذوفات** ← «ملغاة» (تبقى في الإحصائيات) وتعود الفترة متاحة.

الزائر يقرأ الحجوزات النشطة فقط عبر الـ view `calendar_bookings` (تاريخ + فترة + حالة، بدون بيانات العميل).

## الصلاحيات

- **admin** = حساب `app_metadata.role = 'admin'` في Supabase. هو الوحيد الذي يكتب في أي جدول أو في Storage (دالة `public.is_admin()` في `schema.sql`). مجرد «مستخدم مسجّل دخول» ما عاد يكفي، واللوحة نفسها ترفض أي حساب بدون الدور.
- الزائر: يقرأ المحتوى العام، **ويضيف** حجزًا فقط (حالة «بانتظار العربون») ولا يقرأ جدول الحجوزات.
- المطوّر: يملك الكود ولوحة Supabase؛ المالك لا يلمس الاعدادات الفنية.

لمنح الدور يدويًا (يوضع في `client-setup.sql` تلقائيًا للعملاء الجدد):

```sql
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
 where email = 'owner@example.com';
```

الدور يُحمل داخل رمز الدخول، فيحتاج المالك يسجّل خروج ودخول بعدها.

## ملفات المشروع

```
├── site.config.js           ملف إعدادات العميل (المصدر الوحيد)
├── index.html               الموقع العام (قيمه مولّدة من الإعدادات)
├── css/style.css, dialog.css
├── js/
│   ├── config.js            دمج الإعدادات + ربط data-cfg (يعمل في المتصفح و Node)
│   ├── main.js              منطق الموقع (قائمة، معرض، تقويم، حجز واتساب)
│   ├── supabase-client.js   الاتصال + جلب البيانات + تطبيع الباقات
│   ├── supabase-bookings.js الحجوزات + resolveDaySlots
│   ├── dialog.js, icons.js, time-utils.js, lib/supabase.js
├── admin/                   لوحة التحكم (/admin)
├── assets/                  صور العميل (webp) + omr.svg
├── functions/_middleware.js og:image ديناميكي لمعاينة واتساب (Cloudflare)
├── supabase/schema.sql      الجداول + الصلاحيات (واحد لكل العملاء)
├── supabase/seed.sql        بيانات العميل الافتراضية (مولّد — لا يُعدّل يدويًا)
├── scripts/build.mjs        يولّد الملفات من site.config.js  (--check للتحقق)
├── scripts/new-client.mjs   ينشئ عميلًا جديدًا
├── template/                قالب العميل الجديد (إعدادات محايدة + صور placeholder)
└── robots.txt, sitemap.xml, favicon.svg  (مولّدة)
```

## التشغيل محليًا

```bash
npx serve .      # أو: python3 -m http.server 8000
node scripts/build.mjs --check   # هل الملفات المولّدة محدّثة؟
```

## ترقية قاعدة بيانات موجودة (مثل أمازون)

1. امنح المالك دور admin (الـ SQL أعلاه) — **قبل** تشغيل `schema.sql`، وإلا ينقفل عن الكتابة.
2. شغّل `supabase/schema.sql` ثم `supabase/seed.sql` (آمنان لإعادة التشغيل؛ يحوّلان `availability` من أعمدة منطقية إلى `closed[]` ولا يلمسان الأسعار الموجودة).
3. ارفع الكود الجديد مباشرة بعد الخطوة 2 (الكود القديم لا يفهم `closed[]`).
4. المالك يسجّل خروج ودخول.

## النشر (Cloudflare Pages)

اربط مستودع GitHub (بدون أمر build، مجلد الإخراج `/`). الرفع اليدوي بالسحب والإفلات **لا** يشغّل مجلد `functions`، فتبقى معاينة واتساب على وسم `og:image` الثابت.
