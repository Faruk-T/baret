-- 1. ADIM: TAM TEMİZLİK (Eski Kalıntıları Siliyoruz)
DROP TABLE IF EXISTS public.store_subscriptions CASCADE;
DROP TABLE IF EXISTS public.seller_plans CASCADE;
DROP TABLE IF EXISTS public.app_notifications CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.platform_reports CASCADE;
DROP TABLE IF EXISTS public.order_commissions CASCADE;
DROP TABLE IF EXISTS public.commission_collections CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.license_keys CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.delivery_option CASCADE;

-- 2. ADIM: TİPLERİ OLUŞTUR
CREATE TYPE public.user_role AS ENUM ('admin', 'buyer', 'seller');
CREATE TYPE public.order_status AS ENUM ( 'pending', 'preparing', 'shipped', 'delivered', 'cancelled' );
CREATE TYPE public.delivery_option AS ENUM ( 'kargo', 'gel_al', 'aracla_teslim' );

-- 3. ADIM: TABLOLARI OLUŞTUR (Çakışan İsimler Kaldırıldı!)
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  role        public.user_role NOT NULL DEFAULT 'buyer',
  admin_role  TEXT CHECK (admin_role IS NULL OR admin_role IN ('super', 'support', 'finance')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  address      TEXT NOT NULL,
  city         TEXT NOT NULL,
  district     TEXT,
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  phone        TEXT NOT NULL,
  email        TEXT,
  logo_url     TEXT,
  is_approved  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  license_expires_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  image_url         TEXT,
  price             NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  delivery_options  public.delivery_option[] NOT NULL DEFAULT ARRAY['gel_al']::public.delivery_option[],
  expiry_date       DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  store_id         UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity         INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price       NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  total_amount     NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  status           public.order_status NOT NULL DEFAULT 'pending',
  delivery_option  public.delivery_option NOT NULL,
  delivery_address TEXT,
  notes            TEXT,
  pickup_code      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (total_amount = unit_price * quantity) 
);

CREATE TABLE public.reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, order_id)
);

CREATE TABLE public.license_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  duration_days   INTEGER NOT NULL CHECK (duration_days > 0),
  expires_at      TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  redeemed_at     TIMESTAMPTZ,
  store_id        UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  CHECK (
    (redeemed_by IS NULL AND redeemed_at IS NULL AND store_id IS NULL)
    OR (redeemed_by IS NOT NULL AND redeemed_at IS NOT NULL AND store_id IS NOT NULL)
  )
);

CREATE TABLE public.platform_settings (
  id                     INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission_rate        NUMERIC(5, 2) NOT NULL DEFAULT 8.00
                         CHECK (commission_rate >= 0 AND commission_rate <= 100),
  intro_commission_rate  NUMERIC(5, 2) NOT NULL DEFAULT 5.00
                         CHECK (intro_commission_rate >= 0 AND intro_commission_rate <= 100),
  intro_order_limit      INTEGER NOT NULL DEFAULT 10
                         CHECK (intro_order_limit >= 0),
  high_rating_discount   NUMERIC(5, 2) NOT NULL DEFAULT 1.00
                         CHECK (high_rating_discount >= 0 AND high_rating_discount <= 100),
  tier1_max              NUMERIC(12, 2) NOT NULL DEFAULT 100.00 CHECK (tier1_max > 0),
  tier1_rate             NUMERIC(5, 2) NOT NULL DEFAULT 10.00
                         CHECK (tier1_rate >= 0 AND tier1_rate <= 100),
  tier2_max              NUMERIC(12, 2) NOT NULL DEFAULT 1000.00 CHECK (tier2_max > 0),
  tier2_rate             NUMERIC(5, 2) NOT NULL DEFAULT 8.00
                         CHECK (tier2_rate >= 0 AND tier2_rate <= 100),
  tier3_rate             NUMERIC(5, 2) NOT NULL DEFAULT 5.00
                         CHECK (tier3_rate >= 0 AND tier3_rate <= 100),
  min_commission_amount  NUMERIC(12, 2) NOT NULL DEFAULT 1.00
                         CHECK (min_commission_amount >= 0),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CHECK (tier2_max > tier1_max)
);

INSERT INTO public.platform_settings (
  id, commission_rate, intro_commission_rate, intro_order_limit, high_rating_discount,
  tier1_max, tier1_rate, tier2_max, tier2_rate, tier3_rate, min_commission_amount
) VALUES (1, 10.00, 10.00, 0, 0, 100.00, 10.00, 1000.00, 10.00, 10.00, 0);

CREATE TABLE public.platform_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reason       TEXT NOT NULL,
  details      TEXT,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'reviewed', 'closed')),
  admin_note   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.commission_collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  order_count   INTEGER NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  note          TEXT,
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.order_commissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id           UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  order_amount       NUMERIC(12, 2) NOT NULL CHECK (order_amount >= 0),
  commission_rate    NUMERIC(5, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount  NUMERIC(12, 2) NOT NULL CHECK (commission_amount >= 0),
  seller_net_amount  NUMERIC(12, 2) NOT NULL CHECK (seller_net_amount >= 0),
  collection_id      UUID REFERENCES public.commission_collections(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (commission_amount + seller_net_amount = order_amount)
);

-- 4. ADIM: İNDEKSLER
CREATE INDEX idx_users_role            ON public.users(role);
CREATE INDEX idx_stores_owner_id       ON public.stores(owner_id);
CREATE INDEX idx_stores_approved       ON public.stores(is_approved) WHERE is_approved = TRUE;
CREATE INDEX idx_stores_city_district  ON public.stores(city, district);
CREATE INDEX idx_products_store_id     ON public.products(store_id);
CREATE INDEX idx_products_active       ON public.products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_orders_buyer_id       ON public.orders(buyer_id);
CREATE INDEX idx_orders_store_id       ON public.orders(store_id);
CREATE INDEX idx_orders_product_id     ON public.orders(product_id);
CREATE INDEX idx_orders_status         ON public.orders(status);
CREATE INDEX idx_reviews_store_id      ON public.reviews(store_id);
CREATE INDEX idx_reviews_buyer_id      ON public.reviews(buyer_id);
CREATE INDEX idx_license_keys_created_at ON public.license_keys(created_at DESC);
CREATE INDEX idx_license_keys_unused ON public.license_keys(redeemed_at) WHERE redeemed_at IS NULL;
CREATE INDEX idx_stores_license_expires ON public.stores(license_expires_at);
CREATE INDEX idx_order_commissions_store_id ON public.order_commissions(store_id);
CREATE INDEX idx_order_commissions_created_at ON public.order_commissions(created_at DESC);
CREATE INDEX idx_order_commissions_collection ON public.order_commissions(collection_id);
CREATE INDEX idx_commission_collections_store ON public.commission_collections(store_id, collected_at DESC);
CREATE INDEX idx_platform_reports_status ON public.platform_reports(status, created_at DESC);

-- 5. ADIM: FONKSİYONLAR VE TRİGGERLAR
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_platform_reports_updated_at BEFORE UPDATE ON public.platform_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'); safe_role public.user_role := 'buyer'; BEGIN IF requested_role IN ('buyer', 'seller') THEN safe_role := requested_role::public.user_role; END IF; INSERT INTO public.users (id, email, full_name, phone, role) VALUES ( NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'phone', ''), safe_role ); RETURN NEW; END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' ); $$;
CREATE OR REPLACE FUNCTION public.is_store_owner(p_store_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS ( SELECT 1 FROM public.stores WHERE id = p_store_id AND owner_id = auth.uid() ); $$;

-- 6. ADIM: ROW LEVEL SECURITY (RLS) POLİTİKALARI
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_or_admin" ON public.users FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK ( id = auth.uid() AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) );
CREATE POLICY "users_admin_update" ON public.users FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "stores_select_public_approved" ON public.stores FOR SELECT TO anon, authenticated USING (
  is_approved = TRUE AND is_active = TRUE
  AND license_expires_at IS NOT NULL AND license_expires_at > NOW()
);
CREATE POLICY "stores_select_own" ON public.stores FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "stores_insert_seller" ON public.stores FOR INSERT TO authenticated WITH CHECK ( owner_id = auth.uid() AND is_approved = FALSE AND EXISTS ( SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'seller' ) );
CREATE POLICY "stores_update_own_or_admin" ON public.stores FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "stores_delete_own_or_admin" ON public.stores FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "products_select_public_active" ON public.products FOR SELECT TO anon, authenticated USING (
  is_active = TRUE AND image_url IS NOT NULL AND btrim(image_url) <> ''
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = products.store_id AND s.is_approved = TRUE AND s.is_active = TRUE
      AND s.license_expires_at IS NOT NULL AND s.license_expires_at > NOW()
  )
);
CREATE POLICY "products_select_own_store" ON public.products FOR SELECT TO authenticated USING (public.is_store_owner(store_id) OR public.is_admin());
CREATE POLICY "products_insert_store_owner" ON public.products FOR INSERT TO authenticated WITH CHECK (
  public.is_admin() OR (
    public.is_store_owner(store_id)
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.license_expires_at IS NOT NULL AND s.license_expires_at > NOW()
    )
  )
);
CREATE POLICY "products_update_store_owner" ON public.products FOR UPDATE TO authenticated USING (public.is_store_owner(store_id) OR public.is_admin()) WITH CHECK (
  public.is_admin() OR (
    public.is_store_owner(store_id)
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.license_expires_at IS NOT NULL AND s.license_expires_at > NOW()
    )
  )
);
CREATE POLICY "products_delete_store_owner" ON public.products FOR DELETE TO authenticated USING (public.is_store_owner(store_id) OR public.is_admin());

CREATE POLICY "orders_select_buyer" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.is_admin());
CREATE POLICY "orders_select_seller" ON public.orders FOR SELECT TO authenticated USING (public.is_store_owner(store_id));
CREATE POLICY "orders_insert_buyer" ON public.orders FOR INSERT TO authenticated WITH CHECK (
  buyer_id = auth.uid()
  AND EXISTS ( SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'buyer' )
  AND EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND p.store_id = orders.store_id
      AND p.is_active = TRUE AND p.stock >= orders.quantity
      AND p.image_url IS NOT NULL AND btrim(p.image_url) <> ''
      AND s.is_approved = TRUE AND s.is_active = TRUE
      AND s.license_expires_at IS NOT NULL AND s.license_expires_at > NOW()
  )
);
CREATE POLICY "orders_update_buyer_cancel" ON public.orders FOR UPDATE TO authenticated USING (buyer_id = auth.uid() AND status = 'pending') WITH CHECK (buyer_id = auth.uid() AND status = 'cancelled');
CREATE POLICY "orders_update_seller" ON public.orders FOR UPDATE TO authenticated USING (public.is_store_owner(store_id)) WITH CHECK (public.is_store_owner(store_id));
CREATE POLICY "orders_update_admin" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "reviews_insert_buyer" ON public.reviews FOR INSERT TO authenticated WITH CHECK ( buyer_id = auth.uid() AND order_id IS NOT NULL AND EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_id = auth.uid() AND o.store_id = reviews.store_id AND o.status = 'delivered' ) );
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE TO authenticated USING (buyer_id = auth.uid() OR public.is_admin()) WITH CHECK (buyer_id = auth.uid() OR public.is_admin());
CREATE POLICY "reviews_delete_own_or_admin" ON public.reviews FOR DELETE TO authenticated USING (buyer_id = auth.uid() OR public.is_admin());

CREATE POLICY "license_keys_admin_all" ON public.license_keys FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "license_keys_select_own_redeemed" ON public.license_keys FOR SELECT TO authenticated USING (redeemed_by = auth.uid());

CREATE OR REPLACE FUNCTION public.redeem_license_key(p_code TEXT)
RETURNS public.stores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key public.license_keys;
  v_store public.stores;
  v_base TIMESTAMPTZ;
  v_new_expiry TIMESTAMPTZ;
  v_normalized TEXT := upper(trim(p_code));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş gerekli';
  END IF;

  IF v_normalized = '' THEN
    RAISE EXCEPTION 'Lisans anahtarı boş olamaz';
  END IF;

  SELECT * INTO v_store
  FROM public.stores
  WHERE owner_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Önce mağaza oluşturmalısın';
  END IF;

  SELECT * INTO v_key
  FROM public.license_keys
  WHERE upper(trim(code)) = v_normalized
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geçersiz lisans anahtarı';
  END IF;

  IF v_key.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bu anahtar daha önce kullanılmış';
  END IF;

  IF v_key.expires_at IS NOT NULL THEN
    IF v_key.expires_at <= NOW() THEN
      RAISE EXCEPTION 'Bu lisans anahtarının hedef tarihi geçmiş';
    END IF;
    v_new_expiry := v_key.expires_at;
  ELSE
    v_base := GREATEST(COALESCE(v_store.license_expires_at, NOW()), NOW());
    v_new_expiry := v_base + make_interval(days => v_key.duration_days);
  END IF;

  UPDATE public.license_keys
  SET
    redeemed_by = auth.uid(),
    redeemed_at = NOW(),
    store_id = v_store.id
  WHERE id = v_key.id;

  PERFORM set_config('baret.allow_license_update', 'on', true);

  UPDATE public.stores
  SET license_expires_at = v_new_expiry
  WHERE id = v_store.id
  RETURNING * INTO v_store;

  PERFORM set_config('baret.allow_license_update', 'off', true);

  RETURN v_store;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_license_key(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_key(TEXT) TO authenticated;

CREATE POLICY "platform_settings_select_auth" ON public.platform_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "platform_settings_admin_update" ON public.platform_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "platform_settings_admin_insert" ON public.platform_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "order_commissions_admin_select" ON public.order_commissions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "order_commissions_seller_select" ON public.order_commissions FOR SELECT TO authenticated USING (public.is_store_owner(store_id));
CREATE POLICY "order_commissions_admin_update" ON public.order_commissions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "commission_collections_admin_all" ON public.commission_collections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "commission_collections_seller_select" ON public.commission_collections FOR SELECT TO authenticated USING (public.is_store_owner(store_id));

CREATE POLICY "platform_reports_insert_own" ON public.platform_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "platform_reports_select_own_or_admin" ON public.platform_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_admin());
CREATE POLICY "platform_reports_admin_update" ON public.platform_reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

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
  -- Flat percent only (default %10). No tiers / intro / rating discount.
  SELECT COALESCE(commission_rate, 10.00)
  INTO v_rate
  FROM public.platform_settings
  WHERE id = 1;

  IF v_rate IS NULL THEN
    v_rate := 10.00;
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

CREATE TRIGGER trg_orders_create_commission
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_commission();

CREATE OR REPLACE FUNCTION public.void_order_commission_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    IF EXISTS (
      SELECT 1 FROM public.order_commissions c
      WHERE c.order_id = NEW.id AND c.collection_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Tahsil edilmiş komisyonlu sipariş iptal edilemez';
    END IF;
    DELETE FROM public.order_commissions
    WHERE order_id = NEW.id AND collection_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_void_commission
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.void_order_commission_on_cancel();

-- Pickup / delivery confirmation code
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

CREATE TABLE public.order_pickup_secrets (
  order_id   UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_order_pickup_secrets_code ON public.order_pickup_secrets (upper(code));
ALTER TABLE public.order_pickup_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pickup_secrets_buyer_admin_select" ON public.order_pickup_secrets
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_pickup_code_on_shipped()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  attempts INTEGER := 0;
BEGIN
  IF NEW.status = 'shipped' AND (OLD.status IS DISTINCT FROM 'shipped') THEN
    LOOP
      candidate := public.generate_pickup_code();
      attempts := attempts + 1;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.order_pickup_secrets s WHERE upper(s.code) = candidate
      ) OR attempts > 20;
    END LOOP;
    INSERT INTO public.order_pickup_secrets (order_id, code)
    VALUES (NEW.id, candidate)
    ON CONFLICT (order_id) DO UPDATE SET code = EXCLUDED.code;
    NEW.pickup_code := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_pickup_code
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pickup_code_on_shipped();

CREATE OR REPLACE FUNCTION public.confirm_order_pickup(p_code TEXT)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_normalized TEXT := upper(trim(p_code));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş gerekli';
  END IF;

  IF v_normalized = '' OR length(v_normalized) < 4 THEN
    RAISE EXCEPTION 'Geçersiz teslim kodu';
  END IF;

  SELECT o.* INTO v_order
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  JOIN public.order_pickup_secrets sec ON sec.order_id = o.id
  WHERE upper(sec.code) = v_normalized
    AND o.status = 'shipped'
    AND s.owner_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kod bulunamadı veya sipariş teslime hazır değil';
  END IF;

  PERFORM set_config('baret.allow_deliver', 'on', true);
  UPDATE public.orders
  SET status = 'delivered'
  WHERE id = v_order.id
  RETURNING * INTO v_order;
  PERFORM set_config('baret.allow_deliver', 'off', true);

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order_pickup(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_pickup(TEXT) TO authenticated;

-- Contact unlock after seller accepts (anti-leakage)
CREATE OR REPLACE FUNCTION public.get_order_store_contact(p_order_id UUID)
RETURNS TABLE (
  store_id UUID,
  store_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  district TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş gerekli';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.phone,
    s.email,
    s.address,
    s.city,
    s.district,
    s.latitude,
    s.longitude
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.id = p_order_id
    AND o.buyer_id = auth.uid()
    AND o.status IN ('preparing', 'shipped', 'delivered');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'İletişim bilgisi henüz açılamaz (satıcı siparişi kabul etmeli)';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_store_contact(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_store_contact(UUID) TO authenticated;

-- Stock sync: decrement on order insert, restore on pending → cancelled
CREATE OR REPLACE FUNCTION public.decrement_stock_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id
    AND stock >= NEW.quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stok yetersiz veya ürün bulunamadı (product_id=%)', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_decrement_stock ON public.orders;
CREATE TRIGGER trg_orders_decrement_stock
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_order();

CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.status = 'cancelled'
     AND OLD.status IN ('pending', 'preparing', 'shipped') THEN
    UPDATE public.products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_restore_stock ON public.orders;
CREATE TRIGGER trg_orders_restore_stock
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_cancel();

-- Live store approval updates for sellers
ALTER TABLE public.stores REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'stores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
  END IF;
END;
$$;

-- Admin: collect unsettled commissions for a store
CREATE OR REPLACE FUNCTION public.collect_store_commissions(
  p_store_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS public.commission_collections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_amount NUMERIC(12, 2);
  v_count INTEGER;
  v_row public.commission_collections;
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Sadece admin tahsilat yapabilir';
  END IF;

  SELECT COALESCE(SUM(commission_amount), 0), COUNT(*)
  INTO v_amount, v_count
  FROM public.order_commissions
  WHERE store_id = p_store_id
    AND collection_id IS NULL;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Bu mağaza için bekleyen komisyon yok';
  END IF;

  INSERT INTO public.commission_collections (
    store_id, amount, order_count, note, collected_by
  ) VALUES (
    p_store_id, v_amount, v_count, NULLIF(btrim(p_note), ''), v_admin
  )
  RETURNING * INTO v_row;

  UPDATE public.order_commissions
  SET collection_id = v_row.id
  WHERE store_id = p_store_id
    AND collection_id IS NULL;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.collect_store_commissions(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.collect_store_commissions(UUID, TEXT) TO authenticated;

-- =============================================================================
-- 10. ADIM: YÖNETİM, BİLDİRİMLER & PLAN ABONELİKLERİ
-- =============================================================================

-- 10.1 Admin Denetim Kayıtları (Audit Logs)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_admin_all" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_all"
  ON public.admin_audit_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10.2 Uygulama İçi Bildirimler (App Notifications)
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user
  ON public.app_notifications(user_id, created_at DESC);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_notifications_select_own" ON public.app_notifications;
CREATE POLICY "app_notifications_select_own"
  ON public.app_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "app_notifications_update_own" ON public.app_notifications;
CREATE POLICY "app_notifications_update_own"
  ON public.app_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "app_notifications_insert_auth" ON public.app_notifications;
CREATE POLICY "app_notifications_insert_auth"
  ON public.app_notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (created_by = auth.uid())
  );

-- Kullanıcıya bildirim gönderme RPC (güvenli)
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_kind TEXT DEFAULT 'info'
)
RETURNS public.app_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.app_notifications;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş gerekli';
  END IF;

  INSERT INTO public.app_notifications (
    user_id, title, body, kind, created_by
  ) VALUES (
    p_user_id, p_title, p_body, COALESCE(p_kind, 'info'), auth.uid()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 10.3 Satıcı Abonelik Planları Kataloğu (Seller Plans)
CREATE TABLE IF NOT EXISTS public.seller_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE
                  CHECK (code IN ('basic', 'pro', 'custom')),
  name            TEXT NOT NULL,
  description     TEXT,
  max_products    INTEGER NOT NULL CHECK (max_products > 0),
  price_monthly   NUMERIC(12, 2) NOT NULL CHECK (price_monthly >= 0),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.seller_plans (code, name, description, max_products, price_monthly, sort_order)
VALUES
  (
    'basic',
    'Basic',
    'Küçük nalburlar için başlangıç paketi. Aylık sabit ücret, sınırlı ürün kapasitesi.',
    20,
    4000.00,
    1
  ),
  (
    'pro',
    'Pro',
    'Orta ölçekli mağazalar için. Daha yüksek ürün kapasitesi, aylık sabit ücret.',
    100,
    7000.00,
    2
  ),
  (
    'custom',
    'Özel',
    'İşletmene özel kapasite ve fiyat. Admin ile birlikte belirlenir; yüksek hacim / özel ihtiyaç.',
    1000,
    0.00,
    3
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_products = EXCLUDED.max_products,
  price_monthly = EXCLUDED.price_monthly,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 10.4 Mağaza Abonelikleri (Store Subscriptions)
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES public.seller_plans(id) ON DELETE RESTRICT,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  custom_max_products  INTEGER CHECK (custom_max_products IS NULL OR custom_max_products > 0),
  custom_price_monthly NUMERIC(12, 2) CHECK (custom_price_monthly IS NULL OR custom_price_monthly >= 0),
  starts_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at              TIMESTAMPTZ NOT NULL,
  note                 TEXT,
  created_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_subscriptions_store
  ON public.store_subscriptions(store_id, status, ends_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_subscriptions_one_active
  ON public.store_subscriptions(store_id)
  WHERE status = 'active';

ALTER TABLE public.seller_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_plans_select_auth" ON public.seller_plans;
CREATE POLICY "seller_plans_select_auth"
  ON public.seller_plans FOR SELECT TO authenticated
  USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "seller_plans_admin_all" ON public.seller_plans;
CREATE POLICY "seller_plans_admin_all"
  ON public.seller_plans FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "seller_plans_select_anon" ON public.seller_plans;
CREATE POLICY "seller_plans_select_anon"
  ON public.seller_plans FOR SELECT TO anon
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "store_subscriptions_select_own" ON public.store_subscriptions;
CREATE POLICY "store_subscriptions_select_own"
  ON public.store_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_store_owner(store_id)
  );

DROP POLICY IF EXISTS "store_subscriptions_admin_all" ON public.store_subscriptions;
CREATE POLICY "store_subscriptions_admin_all"
  ON public.store_subscriptions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10.5 Plan Kapasitesi ve Kontrol Fonksiyonları
CREATE OR REPLACE FUNCTION public.store_product_limit(p_store_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(s.custom_max_products, p.max_products)
      FROM public.store_subscriptions s
      JOIN public.seller_plans p ON p.id = s.plan_id
      WHERE s.store_id = p_store_id
        AND s.status = 'active'
        AND s.ends_at > NOW()
      ORDER BY s.ends_at DESC
      LIMIT 1
    ),
    0
  );
$$;

CREATE OR REPLACE FUNCTION public.store_has_active_subscription(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_subscriptions s
    WHERE s.store_id = p_store_id
      AND s.status = 'active'
      AND s.ends_at > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_product_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NOT public.store_has_active_subscription(NEW.store_id) THEN
    RAISE EXCEPTION 'Aktif abonelik planı yok. Admin ile iletişime geç veya planını yenile.';
  END IF;

  v_limit := public.store_product_limit(NEW.store_id);
  SELECT COUNT(*) INTO v_count
  FROM public.products
  WHERE store_id = NEW.store_id;

  IF TG_OP = 'INSERT' AND v_count >= v_limit THEN
    RAISE EXCEPTION 'Ürün kapasitesi doldu (limit: %). Planını yükselt veya admin ile konuş.', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_plan_limit ON public.products;
CREATE TRIGGER trg_products_plan_limit
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_plan_limit();

-- =============================================================================
-- 11. ADIM: GÜVENLİK SERTLEŞTİRME TETİKLEYİCİLERİ (SECURITY HARDENING)
-- =============================================================================

-- 11.1 Fiyat Kilidi (Price Lock Trigger)
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
BEGIN
  SELECT price, is_active, store_id
  INTO v_product_price, v_product_active, v_store_id
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

  -- Alıcının gönderdiği fiyatı yoksay, ürünün gerçek fiyatını kilitle
  NEW.unit_price := v_product_price;
  NEW.total_amount := v_product_price * NEW.quantity;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_price_lock ON public.orders;
CREATE TRIGGER trg_order_price_lock
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_price_lock();

-- 11.2 Sipariş Durum Makinesi (Status Transition Machine)
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'İptal edilmiş bir siparişin durumu değiştirilemez.';
  END IF;

  IF OLD.status = 'delivered' THEN
    RAISE EXCEPTION 'Teslim edilmiş bir siparişin durumu değiştirilemez.';
  END IF;

  IF auth.uid() = OLD.buyer_id THEN
    IF NEW.status <> 'cancelled' OR OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Alıcı yalnızca bekleyen siparişini iptal edebilir.';
    END IF;
    RETURN NEW;
  END IF;

  IF public.is_store_owner(OLD.store_id) THEN
    IF OLD.status = 'pending' AND NEW.status NOT IN ('preparing', 'cancelled') THEN
      RAISE EXCEPTION 'Bekleyen sipariş yalnızca hazırlanıyor veya iptal edilebilir.';
    ELSIF OLD.status = 'preparing' AND NEW.status NOT IN ('shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Hazırlanan sipariş yalnızca kargoya/yola verilebilir veya iptal edilebilir.';
    ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Yoldaki sipariş yalnızca teslim edildi veya iptal edilebilir.';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Yetkisiz sipariş durum değişikliği.';
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_transition ON public.orders;
CREATE TRIGGER trg_order_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_transition();

-- 11.3 Mağaza Admin Sütunlarını Koruma (Store Column Protection)
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

  -- Satıcı onay durumunu veya lisans süresini kendi değiştiremez
  IF OLD.is_approved IS DISTINCT FROM NEW.is_approved THEN
    NEW.is_approved := OLD.is_approved;
  END IF;

  IF OLD.license_expires_at IS DISTINCT FROM NEW.license_expires_at THEN
    NEW.license_expires_at := OLD.license_expires_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_store_admin_columns ON public.stores;
CREATE TRIGGER trg_protect_store_admin_columns
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_store_admin_columns();

-- 11.4 Realtime Yayınları
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_subscriptions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;


