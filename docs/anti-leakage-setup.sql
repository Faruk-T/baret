-- Anti-disintermediation helpers (additive).
-- Run after docs/commission-setup.sql in Supabase SQL Editor.
-- 1) Store contact only via RPC after seller accepts order
-- 2) Buyer reports (leakage / off-platform)
-- 3) Intro + rating-based commission incentives

-- ─── Commission incentive columns ───────────────────────────────────────────
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS intro_commission_rate NUMERIC(5, 2)
    DEFAULT 5.00 CHECK (intro_commission_rate >= 0 AND intro_commission_rate <= 100);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS intro_order_limit INTEGER
    DEFAULT 10 CHECK (intro_order_limit >= 0);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS high_rating_discount NUMERIC(5, 2)
    DEFAULT 1.00 CHECK (high_rating_discount >= 0 AND high_rating_discount <= 100);

UPDATE public.platform_settings
SET
  intro_commission_rate = COALESCE(intro_commission_rate, 5.00),
  intro_order_limit = COALESCE(intro_order_limit, 10),
  high_rating_discount = COALESCE(high_rating_discount, 1.00)
WHERE id = 1;

-- Recreate commission trigger with incentive tiers
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

  -- Prior non-cancelled orders for this store (incentive: stay on platform early)
  SELECT COUNT(*) INTO v_prior_count
  FROM public.orders
  WHERE store_id = NEW.store_id
    AND id <> NEW.id
    AND status <> 'cancelled';

  IF v_prior_count < v_intro_limit THEN
    v_rate := LEAST(v_rate, v_intro);
  END IF;

  -- High rating discount (reward good in-app sellers)
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

-- ─── Contact unlock RPC (buyer only, after seller accepts) ──────────────────
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

-- ─── Platform reports ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_reports (
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

CREATE INDEX IF NOT EXISTS idx_platform_reports_status
  ON public.platform_reports(status, created_at DESC);

ALTER TABLE public.platform_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_reports_insert_own" ON public.platform_reports;
CREATE POLICY "platform_reports_insert_own"
  ON public.platform_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "platform_reports_select_own_or_admin" ON public.platform_reports;
CREATE POLICY "platform_reports_select_own_or_admin"
  ON public.platform_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "platform_reports_admin_update" ON public.platform_reports;
CREATE POLICY "platform_reports_admin_update"
  ON public.platform_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_platform_reports_updated_at ON public.platform_reports;
CREATE TRIGGER trg_platform_reports_updated_at
  BEFORE UPDATE ON public.platform_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
