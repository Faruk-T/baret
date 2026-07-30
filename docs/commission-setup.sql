-- Platform commission (additive). Run once in Supabase Dashboard → SQL Editor.
-- Global rate in platform_settings; each new order gets an order_commissions snapshot.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  commission_rate  NUMERIC(5, 2) NOT NULL DEFAULT 8.00
                   CHECK (commission_rate >= 0 AND commission_rate <= 100),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES public.users(id) ON DELETE SET NULL
);

INSERT INTO public.platform_settings (id, commission_rate)
VALUES (1, 8.00)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.order_commissions (
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

CREATE INDEX IF NOT EXISTS idx_order_commissions_store_id
  ON public.order_commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_order_commissions_created_at
  ON public.order_commissions(created_at DESC);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_select_auth" ON public.platform_settings;
CREATE POLICY "platform_settings_select_auth"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "platform_settings_admin_update" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_update"
  ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "platform_settings_admin_insert" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_insert"
  ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "order_commissions_admin_select" ON public.order_commissions;
CREATE POLICY "order_commissions_admin_select"
  ON public.order_commissions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "order_commissions_seller_select" ON public.order_commissions;
CREATE POLICY "order_commissions_seller_select"
  ON public.order_commissions
  FOR SELECT
  TO authenticated
  USING (public.is_store_owner(store_id));

-- Snapshot commission when an order is placed
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
  SELECT commission_rate INTO v_rate
  FROM public.platform_settings
  WHERE id = 1;

  IF v_rate IS NULL THEN
    v_rate := 8.00;
  END IF;

  v_commission := ROUND(NEW.total_amount * v_rate / 100.0, 2);
  v_net := NEW.total_amount - v_commission;

  INSERT INTO public.order_commissions (
    order_id,
    store_id,
    order_amount,
    commission_rate,
    commission_amount,
    seller_net_amount
  )
  VALUES (
    NEW.id,
    NEW.store_id,
    NEW.total_amount,
    v_rate,
    v_commission,
    v_net
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_create_commission ON public.orders;
CREATE TRIGGER trg_orders_create_commission
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_commission();

-- Remove commission when a pending order is cancelled (no platform revenue)
CREATE OR REPLACE FUNCTION public.void_order_commission_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.status = 'cancelled' THEN
    DELETE FROM public.order_commissions WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_void_commission ON public.orders;
CREATE TRIGGER trg_orders_void_commission
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.void_order_commission_on_cancel();
