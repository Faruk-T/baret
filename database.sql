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
