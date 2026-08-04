-- =============================================================================
-- Baret: alıcı + satıcıları sil, admin’i koru, temiz test için sıfırla
-- Supabase SQL Editor’da çalıştır.
--
-- Siler: siparişler, ürünler, mağazalar, komisyonlar, şikayetler, lisans
--        anahtarları, alıcı/satıcı auth hesapları
-- Korur: role = 'admin' kullanıcılar + platform_settings
-- =============================================================================

-- 0) Önizleme (çalıştırıp sayılara bak)
SELECT role, count(*) AS n
FROM public.users
GROUP BY role
ORDER BY role;

SELECT
  (SELECT count(*) FROM public.stores) AS stores,
  (SELECT count(*) FROM public.products) AS products,
  (SELECT count(*) FROM public.orders) AS orders,
  (SELECT count(*) FROM public.license_keys) AS license_keys;

-- 1) Temizlik (hepsini seçip bir kerede çalıştır)
BEGIN;

-- Sipariş / finans yan tabloları
DELETE FROM public.order_commissions;
DELETE FROM public.commission_collections;

DO $$
BEGIN
  IF to_regclass('public.store_subscriptions') IS NOT NULL THEN
    DELETE FROM public.store_subscriptions;
  END IF;
  IF to_regclass('public.order_pickup_secrets') IS NOT NULL THEN
    DELETE FROM public.order_pickup_secrets;
  END IF;
END $$;

DELETE FROM public.reviews;
DELETE FROM public.platform_reports;
DELETE FROM public.orders;
DELETE FROM public.products;

-- Lisans anahtarları (test için baştan üretilecek)
DELETE FROM public.license_keys;

-- Mağazalar
DELETE FROM public.stores;

-- Bildirimler (admin hariç hedefler + hepsi temizlenebilir)
DO $$
BEGIN
  IF to_regclass('public.app_notifications') IS NOT NULL THEN
    DELETE FROM public.app_notifications;
  END IF;
  IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
    DELETE FROM public.admin_audit_logs;
  END IF;
END $$;

-- Auth hesapları: alıcı + satıcı (public.users CASCADE ile gider)
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.users WHERE role IN ('buyer', 'seller')
);

-- Orphan auth (public.users’ta olmayan) — admin değilse sil
DELETE FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);

COMMIT;

-- 2) Doğrulama
SELECT role, count(*) AS n
FROM public.users
GROUP BY role
ORDER BY role;

SELECT count(*) AS remaining_auth_users FROM auth.users;
SELECT count(*) AS remaining_stores FROM public.stores;
SELECT count(*) AS remaining_orders FROM public.orders;
