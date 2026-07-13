-- ============================================================
-- تحديث سياسات Row Level Security (RLS) لأمازون شاليه
-- ============================================================
-- 
-- ⚠️ تعليمات مهمة:
-- 1. اذهب إلى Supabase SQL Editor
-- 2. انسخ ولصق هذا الكود
-- 3. استبدل 'YOUR_ADMIN_UID_HERE' بـ UUID المسؤول الفعلي
--    (يمكنك الحصول عليه من Authentication > Users)
-- 4. اضغط Run

-- ============================================================
-- الخطوة 1: حذف السياسات القديمة (اختياري)
-- ============================================================
DROP POLICY IF EXISTS "admin_write_settings" ON settings;
DROP POLICY IF EXISTS "admin_write_gallery" ON gallery;
DROP POLICY IF EXISTS "admin_write_features" ON features;
DROP POLICY IF EXISTS "admin_write_packages" ON packages;
DROP POLICY IF EXISTS "admin_write_availability" ON availability;
DROP POLICY IF EXISTS "admin_upload_gallery_images" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_gallery_images" ON storage.objects;

-- ============================================================
-- الخطوة 2: إنشاء سياسات جديدة بناءً على UID
-- ============================================================

-- استبدل 'YOUR_ADMIN_UID_HERE' بـ UUID المسؤول الفعلي
-- مثال: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

CREATE POLICY "admin_write_settings" ON settings 
  FOR ALL 
  USING (auth.uid() = 'YOUR_ADMIN_UID_HERE')
  WITH CHECK (auth.uid() = 'YOUR_ADMIN_UID_HERE');

CREATE POLICY "admin_write_gallery" ON gallery 
  FOR ALL 
  USING (auth.uid() = 'YOUR_ADMIN_UID_HERE')
  WITH CHECK (auth.uid() = 'YOUR_ADMIN_UID_HERE');

CREATE POLICY "admin_write_features" ON features 
  FOR ALL 
  USING (auth.uid() = 'YOUR_ADMIN_UID_HERE')
  WITH CHECK (auth.uid() = 'YOUR_ADMIN_UID_HERE');

CREATE POLICY "admin_write_packages" ON packages 
  FOR ALL 
  USING (auth.uid() = 'YOUR_ADMIN_UID_HERE')
  WITH CHECK (auth.uid() = 'YOUR_ADMIN_UID_HERE');

CREATE POLICY "admin_write_availability" ON availability 
  FOR ALL 
  USING (auth.uid() = 'YOUR_ADMIN_UID_HERE')
  WITH CHECK (auth.uid() = 'YOUR_ADMIN_UID_HERE');

-- ============================================================
-- الخطوة 3: سياسات التخزين (Storage)
-- ============================================================

CREATE POLICY "admin_upload_gallery_images" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'gallery' 
    AND auth.uid() = 'YOUR_ADMIN_UID_HERE'
  );

CREATE POLICY "admin_delete_gallery_images" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'gallery' 
    AND auth.uid() = 'YOUR_ADMIN_UID_HERE'
  );

-- ============================================================
-- الخطوة 4: كيفية الحصول على UUID المسؤول
-- ============================================================
-- 
-- 1. اذهب إلى Supabase Dashboard
-- 2. اختر Authentication > Users
-- 3. ابحث عن المستخدم المسؤول
-- 4. انسخ الـ ID (UUID) من العمود الأول
-- 5. استبدله في السياسات أعلاه
--
-- ============================================================
