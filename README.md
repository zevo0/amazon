# أمازون شاليه | Amazon Chalet

موقع فاخر بلغة عربية (RTL) لعرض وحجز شاليه واحد في عُمان، مبني بالكامل بـ **HTML/CSS/JavaScript خام** (بدون React أو Tailwind) مع لوحة تحكم كاملة، وجاهز للربط مع **Supabase**.

## البنية

```
amazon-chalet/
├── index.html              الصفحة الرئيسية العامة
├── css/style.css           تصميم الموقع
├── js/main.js              تفاعل الموقع (القائمة، المعرض، التقويم، الحجز)
├── js/supabase-client.js   إعداد Supabase + دوال جلب البيانات + مخطط قاعدة البيانات
├── assets/                 الشعار وصورة الغلاف
└── admin/                  لوحة التحكم (صفحة واحدة)
    ├── index.html
    ├── css/admin.css
    └── js/admin.js
```

## التشغيل محليًا

لا يحتاج المشروع أي بناء (build) — افتح `index.html` مباشرة، أو شغّل خادمًا بسيطًا:

```bash
npx serve .
# أو
python3 -m http.server 8000
```

## ربط Supabase (لتفعيل الوضع الحقيقي)

حاليًا الموقع يعمل في **وضع تجريبي (Demo Mode)**: بيانات المميزات، الباقات، والتوفر معروضة من بيانات محلية داخل `main.js`/`admin.js` حتى تربط مشروعك الحقيقي.

1. أنشئ مشروعًا في [supabase.com](https://supabase.com)
2. من SQL Editor، شغّل الأوامر الموجودة في أسفل ملف `js/supabase-client.js` (تعليق `SUGGESTED SUPABASE SCHEMA`) لإنشاء الجداول:
   - `settings`, `gallery`, `features`, `packages`, `availability`
3. أنشئ Bucket باسم `gallery` في Storage (Public) لصور المعرض
4. افتح `js/supabase-client.js` وعدّل:
   ```js
   const SUPABASE_URL = 'https://xxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbG....';
   ```
5. فعّل Supabase Auth (Email/Password) وأنشئ مستخدم أدمن واحد من لوحة Supabase — هذا هو حساب الدخول للوحة `/admin`
6. عدّل رقم الواتساب في `js/main.js`:
   ```js
   const WHATSAPP_NUMBER = '96890000000';
   ```

بمجرد إضافة القيم الحقيقية، سيتحول الموقع تلقائيًا من الوضع التجريبي إلى الوضع الحي (Live)، ولوحة التحكم ستحفظ كل تعديل مباشرة في قاعدة البيانات.

## النشر (GitHub → Vercel)

1. ارفع المجلد إلى مستودع GitHub جديد
2. من [vercel.com](https://vercel.com) اختر "Add New Project" واربط المستودع
3. لا حاجة لأي إعدادات Build (Framework: **Other**، Output Directory: الجذر `.`)
4. اضغط Deploy — الموقع سيكون متاحًا خلال دقيقة

## ملاحظات

- صور معرض الصور حاليًا بها بلاطات (Placeholders) بعناوين — استبدلها بصور حقيقية من لوحة التحكم ▸ الصور بعد ربط Supabase Storage
- خريطة Google Maps تستخدم حاليًا موقعًا تقريبيًا في جبل الأخضر — عدّل رابط الـ embed داخل `index.html` (قسم `#location`) بموقع الشاليه الفعلي
- أوقات كل باقة (البداية/النهاية) قابلة للتعديل من لوحة التحكم ▸ الباقات، وتُعرض تلقائيًا بصيغة عربية (مثل ٨ص - ١ظ) في واجهة الحجز — لا حاجة لتعديل الكود
