-- =============================================================================
-- Product-capacity subscription plans (replaces commission monetization)
-- Run once in Supabase SQL Editor
-- =============================================================================

-- 1) Disable commission on new orders (keep historical rows if any)
CREATE OR REPLACE FUNCTION public.create_order_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Monetization moved to seller subscription plans — no per-order cut.
  RETURN NEW;
END;
$$;

-- 2) Plans catalog (admin-editable)
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

-- 3) Per-store subscription
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES public.seller_plans(id) ON DELETE RESTRICT,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  -- For custom plan overrides (nullable = use plan defaults)
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

-- One active subscription per store (partial unique)
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

-- Public (landing) can read active plans via anon if needed
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

-- 4) Helpers
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

-- 5) Enforce product capacity on insert (sellers)
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

-- Catalog sellable gate stays license-based (existing). Product CREATE needs active plan.
-- (Do not tighten store_is_sellable here — assign plans gradually without killing catalog.)

