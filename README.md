# أمازون شاليه | Amazon Chalet

موقع عربي (RTL) لعرض وحجز شاليه في عُمان — HTML/CSS/JavaScript خام (بدون build) + Supabase + لوحة تحكم. النشر على Cloudflare Pages.

## هيكل المشروع

```
├── index.html               الموقع العام
├── css/style.css            تصميم الموقع
├── js/
│   ├── main.js              منطق الموقع (قائمة، معرض، تقويم، حجز واتساب)
│   ├── supabase-client.js   الاتصال بـ Supabase + جلب البيانات
│   ├── supabase-bookings.js إنشاء/إدارة الحجوزات وتحديث التوفر
│   ├── icons.js             الأيقونات + رمز الريال العماني omr()
│   ├── time-utils.js        تحويل الأوقات إلى صيغة عربية (٨ص - ١ظ)
│   └── lib/supabase.js      مكتبة supabase-js (نسخة محلية)
├── admin/                   لوحة التحكم (/admin) — صفحة واحدة
│   ├── index.html
│   ├── css/admin.css
│   └── js/admin.js, admin-bookings.js
├── assets/                  الصور (webp) + logo.png احتياطي + omr.svg
├── functions/_middleware.js Cloudflare Function: og:image ديناميكي لمعاينة واتساب
├── _routes.json             يحصر الـ Function على الصفحة الرئيسية
├── supabase/schema.sql      الجداول + الصلاحيات + البيانات الابتدائية
├── robots.txt, sitemap.xml
```

## التشغيل محليًا

```bash
npx serve .      # أو: python3 -m http.server 8000
```

## Supabase

1. شغّل `supabase/schema.sql` كاملاً من SQL Editor (آمن لإعادة التشغيل، ما يحذف بيانات).
2. أنشئ مستخدم الأدمن من Authentication ▸ Users — هو حساب الدخول لـ `/admin`.
3. مفاتيح الاتصال في أول `js/supabase-client.js`.

الصلاحيات: القراءة عامة، الكتابة لأي مستخدم مسجّل دخول (الأدمن)، والزائر يقدر **يضيف** حجز فقط ولا يقرأ الحجوزات.

## الإعدادات داخل الكود

| ماذا | أين |
|---|---|
| رقم الواتساب، سعر نهاية الأسبوع (15 ر.ع)، العربون (40%)، حد الدفع الكامل (3 أيام) | أول `js/main.js` |
| رابط الخريطة | قسم `#location` في `index.html` |
| رابط الموقع (canonical / og:url) | `index.html` + `robots.txt` + `sitemap.xml` |

أوقات وأسعار الباقات تتعدل من لوحة التحكم، بدون تعديل كود.

## النشر (Cloudflare Pages)

اربط مستودع GitHub مع Cloudflare Pages (بدون أمر build، مجلد الإخراج `/`). الرفع اليدوي بالسحب والإفلات **لا** يشغّل مجلد `functions`، فتبقى معاينة واتساب على وسم `og:image` الثابت.
