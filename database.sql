-- 1. ADIM: TAM TEMİZLİK (Eski Kalıntıları Siliyoruz)
DROP TABLE IF EXISTS public.platform_reports CASCADE;
DROP TABLE IF EXISTS public.order_commissions CASCADE;
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
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES public.users(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (
  id, commission_rate, intro_commission_rate, intro_order_limit, high_rating_discount
) VALUES (1, 8.00, 5.00, 10, 1.00);

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

CREATE TABLE public.order_commissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id           UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  order_amount       NUMERIC(12, 2) NOT NULL CHECK (order_amount >= 0),
  commission_rate    NUMERIC(5, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount  NUMERIC(12, 2) NOT NULL CHECK (commission_amount >= 0),
  seller_net_amount  NUMERIC(12, 2) NOT NULL CHECK (seller_net_amount >= 0),
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
ALTER TABLE public.platform_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_or_admin" ON public.users FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK ( id = auth.uid() AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid()) );
CREATE POLICY "users_admin_update" ON public.users FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "stores_select_public_approved" ON public.stores FOR SELECT TO anon, authenticated USING (is_approved = TRUE AND is_active = TRUE);
CREATE POLICY "stores_select_own" ON public.stores FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "stores_insert_seller" ON public.stores FOR INSERT TO authenticated WITH CHECK ( owner_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'seller' ) );
CREATE POLICY "stores_update_own_or_admin" ON public.stores FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_admin()) WITH CHECK (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "stores_delete_own_or_admin" ON public.stores FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "products_select_public_active" ON public.products FOR SELECT TO anon, authenticated USING ( is_active = TRUE AND EXISTS ( SELECT 1 FROM public.stores s WHERE s.id = products.store_id AND s.is_approved = TRUE AND s.is_active = TRUE ) );
CREATE POLICY "products_select_own_store" ON public.products FOR SELECT TO authenticated USING (public.is_store_owner(store_id) OR public.is_admin());
CREATE POLICY "products_insert_store_owner" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_store_owner(store_id) OR public.is_admin());
CREATE POLICY "products_update_store_owner" ON public.products FOR UPDATE TO authenticated USING (public.is_store_owner(store_id) OR public.is_admin()) WITH CHECK (public.is_store_owner(store_id) OR public.is_admin());
CREATE POLICY "products_delete_store_owner" ON public.products FOR DELETE TO authenticated USING (public.is_store_owner(store_id) OR public.is_admin());

CREATE POLICY "orders_select_buyer" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.is_admin());
CREATE POLICY "orders_select_seller" ON public.orders FOR SELECT TO authenticated USING (public.is_store_owner(store_id));
CREATE POLICY "orders_insert_buyer" ON public.orders FOR INSERT TO authenticated WITH CHECK ( buyer_id = auth.uid() AND EXISTS ( SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'buyer' ) AND EXISTS ( SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND p.store_id = orders.store_id AND p.is_active = TRUE AND p.stock >= orders.quantity AND s.is_approved = TRUE AND s.is_active = TRUE ) );
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

  v_base := GREATEST(COALESCE(v_store.license_expires_at, NOW()), NOW());
  v_new_expiry := v_base + make_interval(days => v_key.duration_days);

  UPDATE public.license_keys
  SET
    redeemed_by = auth.uid(),
    redeemed_at = NOW(),
    store_id = v_store.id
  WHERE id = v_key.id;

  UPDATE public.stores
  SET license_expires_at = v_new_expiry
  WHERE id = v_store.id
  RETURNING * INTO v_store;

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
  v_intro NUMERIC(5, 2);
  v_intro_limit INTEGER;
  v_discount NUMERIC(5, 2);
  v_prior_count INTEGER;
  v_avg NUMERIC;
  v_review_count INTEGER;
  v_commission NUMERIC(12, 2);
  v_net NUMERIC(12, 2);
BEGIN
  SELECT
    commission_rate,
    COALESCE(intro_commission_rate, 5.00),
    COALESCE(intro_order_limit, 10),
    COALESCE(high_rating_discount, 1.00)
  INTO v_rate, v_intro, v_intro_limit, v_discount
  FROM public.platform_settings
  WHERE id = 1;

  IF v_rate IS NULL THEN
    v_rate := 8.00;
  END IF;

  SELECT COUNT(*) INTO v_prior_count
  FROM public.orders
  WHERE store_id = NEW.store_id
    AND id <> NEW.id
    AND status <> 'cancelled';

  IF v_prior_count < v_intro_limit THEN
    v_rate := LEAST(v_rate, v_intro);
  END IF;

  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO v_avg, v_review_count
  FROM public.reviews
  WHERE store_id = NEW.store_id;

  IF v_review_count >= 5 AND v_avg >= 4.5 THEN
    v_rate := GREATEST(0, v_rate - v_discount);
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
    DELETE FROM public.order_commissions WHERE order_id = NEW.id;
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
    IF NEW.pickup_code IS NULL OR btrim(NEW.pickup_code) = '' THEN
      LOOP
        candidate := public.generate_pickup_code();
        attempts := attempts + 1;
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM public.orders
          WHERE pickup_code = candidate AND status = 'shipped'
        ) OR attempts > 20;
      END LOOP;
      NEW.pickup_code := candidate;
    END IF;
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
  WHERE o.pickup_code = v_normalized
    AND o.status = 'shipped'
    AND s.owner_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kod bulunamadı veya sipariş teslime hazır değil';
  END IF;

  UPDATE public.orders
  SET status = 'delivered'
  WHERE id = v_order.id
  RETURNING * INTO v_order;

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

