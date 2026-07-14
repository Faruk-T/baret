-- 1. ADIM: TAM TEMİZLİK (Eski Kalıntıları Siliyoruz)
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
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

-- 5. ADIM: FONKSİYONLAR VE TRİGGERLAR
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
