-- =====================================================================
-- Default data of أمازون شاليه — GENERATED from site.config.js by scripts/build.mjs (do not edit by hand)
-- Safe to re-run: it only fills what is still empty, so the owner's edits are never overwritten.
-- Run it after supabase/schema.sql.
-- =====================================================================

insert into public.settings (id, whatsapp_number, instagram_url, map_embed_url, location_name,
                             weekend_surcharge, deposit_percent, full_payment_days)
values (1, '96890992253', 'https://instagram.com/amazon_chalet', 'https://maps.google.com/maps?q=Jabal%20Akhdar%2C%20Oman&t=&z=11&ie=UTF8&iwloc=&output=embed', 'أمازون شاليه - جبل الأخضر',
        15, 40, 3)
on conflict (id) do nothing;

insert into public.packages (key, name, icon, start_time, end_time, price, closes, sort_order) values
  ('morning', 'صباحي', 'sun', '08:00', '13:00', 25, array['morning', 'full_day', 'overnight']::text[], 1),
  ('evening', 'مسائي', 'moon', '16:00', '22:00', 30, array['evening', 'full_day', 'overnight']::text[], 2),
  ('full_day', 'يوم كامل', 'fullDay', '08:00', '22:00', 45, array['morning', 'evening', 'full_day', 'overnight']::text[], 3),
  ('overnight', 'مع المبيت', 'home', '16:00', '12:00', 65, array['morning', 'evening', 'full_day', 'overnight']::text[], 4)
on conflict (key) do update set      -- only fills the columns older databases don't have yet; never touches name / price / times
  icon   = coalesce(public.packages.icon, excluded.icon),
  closes = case when public.packages.closes = '{}' then excluded.closes else public.packages.closes end;

insert into public.features (title, icon, sort_order)
select v.title, v.icon, v.sort_order
from (values
  ('مسبح خاص', 'amenityPool', 1),
  ('ألعاب أطفال', 'amenityKids', 2),
  ('ملعب كرة', 'amenityCourt', 3),
  ('شواء', 'amenityBBQ', 4),
  ('واي فاي', 'amenityWifi', 5),
  ('غرف نوم', 'amenityBed', 6),
  ('استرخاء', 'amenityRelax', 7)
) as v(title, icon, sort_order)
where not exists (select 1 from public.features);
