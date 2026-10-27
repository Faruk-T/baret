-- =============================================================================
-- BARET V2 — TİCARİLEŞTİRME, B2B (RFQ / KADEMELİ FİYAT / ŞANTİYE) & APP STORE
-- Bu betik mevcut verileri SİLMEDEN (idempotent) canlı Supabase veritabanını
-- V2 kurumsal B2B + iOS App Store seviyesine yükseltir.
-- =============================================================================

-- 1. KRİTİK BUG DÜZELTMESİ: protect_store_admin_columns()
-- redeem_license_key() ve abonelik senkronu baret.allow_license_update = 'on'
-- yaptığında license_expires_at güncellemesine izin ver.
CREATE OR REPLACE FUNCTION public.protect_store_admin_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF current_setting('baret.allow_license_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Satıcı onay durumunu veya lisans süresini doğrudan değiştiremez
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
    NEW.is_approved := OLD.is_approved;
  END IF;

  IF OLD.license_expires_at IS DISTINCT FROM NEW.license_expires_at THEN
    NEW.license_expires_at := OLD.license_expires_at;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. ABONELİK (store_subscriptions) <-> LİSANS (stores.license_expires_at) OTOMATİK SENKRONU
CREATE OR REPLACE FUNCTION public.sync_store_license_from_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.ends_at > NOW() THEN
    PERFORM set_config('baret.allow_license_update', 'on', true);
    UPDATE public.stores
    SET license_expires_at = GREATEST(COALESCE(license_expires_at, NOW()), NEW.ends_at)
    WHERE id = NEW.store_id;
    PERFORM set_config('baret.allow_license_update', 'off', true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_license_from_sub ON public.store_subscriptions;
CREATE TRIGGER trg_sync_store_license_from_sub
  AFTER INSERT OR UPDATE ON public.store_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_store_license_from_subscription();

-- Mevcut aktif aboneliklerin license_expires_at tarihini hemen senkronize et
DO $$
BEGIN
  PERFORM set_config('baret.allow_license_update', 'on', true);
  UPDATE public.stores s
  SET license_expires_at = GREATEST(COALESCE(s.license_expires_at, NOW()), sub.ends_at)
  FROM public.store_subscriptions sub
  WHERE sub.store_id = s.id
    AND sub.status = 'active'
    AND sub.ends_at > NOW();
  PERFORM set_config('baret.allow_license_update', 'off', true);
END;
$$;

-- 3. ABONELİK MODELİNDE OTOMATİK SİPARİŞ KOMİSYONUNU DEVRE DIŞI BIRAK (%0)
UPDATE public.platform_settings
SET commission_rate = 0,
    intro_commission_rate = 0,
    min_commission_amount = 0
WHERE id = 1;

CREATE OR REPLACE FUNCTION public.create_order_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC(5, 2);
  v_commission NUMERIC(12, 2);
  v_net NUMERIC(12, 2);
BEGIN
  SELECT COALESCE(commission_rate, 0.00)
  INTO v_rate
  FROM public.platform_settings
  WHERE id = 1;

  IF v_rate IS NULL OR v_rate <= 0 THEN
    -- Abonelik modelinde siparişten komisyon kesilmez
    RETURN NEW;
  END IF;

  v_commission := ROUND(NEW.total_amount * v_rate / 100.0, 2);
  v_net := NEW.total_amount - v_commission;

  INSERT INTO public.order_commissions (
    order_id, store_id, order_amount, commission_rate, commission_amount, seller_net_amount
  ) VALUES (
    NEW.id, NEW.store_id, NEW.total_amount, v_rate, v_commission, v_net
  );

  RETURN NEW;
END;
$$;

-- 4. EKSİK OLAN get_order_pickup_code RPC FONKSİYONU
CREATE OR REPLACE FUNCTION public.get_order_pickup_code(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT sec.code INTO v_code
  FROM public.order_pickup_secrets sec
  JOIN public.orders o ON o.id = sec.order_id
  WHERE sec.order_id = p_order_id
    AND (o.buyer_id = auth.uid() OR public.is_admin());

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_pickup_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_pickup_code(UUID) TO authenticated;

-- 5. B2B ÜRÜN ALANLARI (KATEGORİ, BİRİM, TOPTAN KADEMELİ FİYAT, MARKA, SKU, KDV)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'adet',
  ADD COLUMN IF NOT EXISTS min_order_qty INTEGER NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  ADD COLUMN IF NOT EXISTS bulk_pricing JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS vat_rate INTEGER NOT NULL DEFAULT 20 CHECK (vat_rate IN (0, 1, 10, 20));

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 6. KULLANICI KURUMSAL FATURA ALANLARI
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_office TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT;

-- 7. TOPTAN KADEMELİ FİYAT DESTEKLİ FİYAT KİLİDİ (Price Lock Trigger V2)
CREATE OR REPLACE FUNCTION public.enforce_order_price_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_price NUMERIC(12, 2);
  v_product_active BOOLEAN;
  v_store_id UUID;
  v_bulk JSONB;
  v_tier RECORD;
  v_effective_price NUMERIC(12, 2);
BEGIN
  SELECT price, is_active, store_id, COALESCE(bulk_pricing, '[]'::jsonb)
  INTO v_product_price, v_product_active, v_store_id, v_bulk
  FROM public.products
  WHERE id = NEW.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sipariş verilen ürün bulunamadı.';
  END IF;

  IF NOT v_product_active THEN
    RAISE EXCEPTION 'Bu ürün şu anda satışta değil.';
  END IF;

  IF NEW.store_id <> v_store_id THEN
    RAISE EXCEPTION 'Ürün ile mağaza eşleşmiyor.';
  END IF;

  v_effective_price := v_product_price;

  -- Toptan kademeli fiyat varsa miktara uygun en avantajlı kademeyi bul
  IF jsonb_typeof(v_bulk) = 'array' AND jsonb_array_length(v_bulk) > 0 THEN
    FOR v_tier IN
      SELECT
        (elem->>'min_qty')::INTEGER AS min_qty,
        (elem->>'unit_price')::NUMERIC(12, 2) AS unit_price
      FROM jsonb_array_elements(v_bulk) AS elem
      WHERE (elem->>'min_qty') IS NOT NULL
        AND (elem->>'unit_price') IS NOT NULL
      ORDER BY (elem->>'min_qty')::INTEGER DESC
    LOOP
      IF NEW.quantity >= v_tier.min_qty AND v_tier.unit_price > 0 THEN
        v_effective_price := v_tier.unit_price;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  NEW.unit_price := v_effective_price;
  NEW.total_amount := v_effective_price * NEW.quantity;

  RETURN NEW;
END;
$$;

-- 8. ŞANTİYELERİM (buyer_sites) TABLOSU
CREATE TABLE IF NOT EXISTS public.buyer_sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  district        TEXT,
  address         TEXT NOT NULL,
  contact_name    TEXT,
  contact_phone   TEXT,
  logistics_note  TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_sites_user ON public.buyer_sites(user_id);
ALTER TABLE public.buyer_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer_sites_own_all" ON public.buyer_sites;
CREATE POLICY "buyer_sites_own_all"
  ON public.buyer_sites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 9. B2B TEKLİF USULÜ SATINALMA / ŞANTİYE İHALESİ (rfq_requests & rfq_quotes)
CREATE TABLE IF NOT EXISTS public.rfq_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  city             TEXT NOT NULL,
  district         TEXT,
  delivery_address TEXT NOT NULL,
  delivery_option  public.delivery_option NOT NULL DEFAULT 'aracla_teslim',
  needed_by        DATE,
  notes            TEXT,
  items            JSONB NOT NULL DEFAULT '[]'::jsonb,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'quoted', 'accepted', 'closed')),
  accepted_quote_id UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfq_requests_buyer ON public.rfq_requests(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_city_status ON public.rfq_requests(status, city, created_at DESC);

CREATE TABLE IF NOT EXISTS public.rfq_quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id          UUID NOT NULL REFERENCES public.rfq_requests(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  total_amount    NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  delivery_days   INTEGER NOT NULL DEFAULT 1 CHECK (delivery_days >= 0),
  valid_until     DATE,
  note            TEXT,
  line_prices     JSONB NOT NULL DEFAULT '[]'::jsonb,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rfq_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_quotes_rfq ON public.rfq_quotes(rfq_id, total_amount ASC);
CREATE INDEX IF NOT EXISTS idx_rfq_quotes_store ON public.rfq_quotes(store_id, created_at DESC);

ALTER TABLE public.rfq_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfq_requests_select" ON public.rfq_requests;
CREATE POLICY "rfq_requests_select"
  ON public.rfq_requests FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'seller'
    )
  );

DROP POLICY IF EXISTS "rfq_requests_insert_buyer" ON public.rfq_requests;
CREATE POLICY "rfq_requests_insert_buyer"
  ON public.rfq_requests FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "rfq_requests_update_buyer" ON public.rfq_requests;
CREATE POLICY "rfq_requests_update_buyer"
  ON public.rfq_requests FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR public.is_admin())
  WITH CHECK (buyer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "rfq_quotes_select" ON public.rfq_quotes;
CREATE POLICY "rfq_quotes_select"
  ON public.rfq_quotes FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_store_owner(store_id)
    OR EXISTS (
      SELECT 1 FROM public.rfq_requests r
      WHERE r.id = rfq_id AND r.buyer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "rfq_quotes_insert_seller" ON public.rfq_quotes;
CREATE POLICY "rfq_quotes_insert_seller"
  ON public.rfq_quotes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_store_owner(store_id)
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.is_approved = TRUE AND s.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "rfq_quotes_update" ON public.rfq_quotes;
CREATE POLICY "rfq_quotes_update"
  ON public.rfq_quotes FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.is_store_owner(store_id)
    OR EXISTS (
      SELECT 1 FROM public.rfq_requests r
      WHERE r.id = rfq_id AND r.buyer_id = auth.uid()
    )
  );

-- 10. APPLE APP STORE GUIDELINE 5.1.1(v) — UYGULAMA İÇİ HESAP SİLME RPC'Sİ
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_open_orders INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadı.';
  END IF;

  -- Kullanıcının açık (bekleyen/hazırlanan/yoldaki) siparişi varsa uyar
  SELECT COUNT(*) INTO v_open_orders
  FROM public.orders o
  LEFT JOIN public.stores s ON s.id = o.store_id
  WHERE (o.buyer_id = v_uid OR s.owner_id = v_uid)
    AND o.status IN ('pending', 'preparing', 'shipped');

  IF v_open_orders > 0 THEN
    RAISE EXCEPTION 'Açık (bekleyen, hazırlanan veya yoldaki) % adet siparişiniz bulunuyor. Hesabınızı silmeden önce açık siparişlerinizi tamamlamalı veya iptal etmelisiniz.', v_open_orders;
  END IF;

  -- Tamamlanmış/iptal edilmiş geçmiş sipariş kayıtlarını temizle (RESTRICT engeline takılmamak için)
  DELETE FROM public.order_commissions
  WHERE order_id IN (
    SELECT o.id FROM public.orders o
    LEFT JOIN public.stores s ON s.id = o.store_id
    WHERE o.buyer_id = v_uid OR s.owner_id = v_uid
  );

  DELETE FROM public.commission_collections
  WHERE store_id IN (SELECT id FROM public.stores WHERE owner_id = v_uid);

  DELETE FROM public.orders
  WHERE buyer_id = v_uid
     OR store_id IN (SELECT id FROM public.stores WHERE owner_id = v_uid);

  DELETE FROM public.license_keys
  WHERE created_by = v_uid;

  -- public.users ve bağlı mağaza/ürün/bildirimler ON DELETE CASCADE ile silinir
  DELETE FROM public.users WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;


-- 11. MİSAFİR MODU (GUEST MODE) VE WEB SEO İÇİN PUBLIC OKUMA YETKİLERİ
GRANT SELECT ON public.stores, public.products, public.reviews TO anon;

DROP POLICY IF EXISTS "stores_select_public_approved" ON public.stores;
CREATE POLICY "stores_select_public_approved"
  ON public.stores
  FOR SELECT
  TO anon, authenticated
  USING (
    is_approved = TRUE
    AND is_active = TRUE
    AND license_expires_at IS NOT NULL
    AND license_expires_at > NOW()
  );

DROP POLICY IF EXISTS "products_select_public_active" ON public.products;
CREATE POLICY "products_select_public_active"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND image_url IS NOT NULL
    AND btrim(image_url) <> ''
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = products.store_id
        AND s.is_approved = TRUE
        AND s.is_active = TRUE
        AND s.license_expires_at IS NOT NULL
        AND s.license_expires_at > NOW()
    )
  );

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);
