-- Run once in Supabase Dashboard → SQL Editor
-- Per-seller commission ledger + collection (tahsilat) tracking for admins

CREATE TABLE IF NOT EXISTS public.commission_collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  order_count   INTEGER NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  note          TEXT,
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collected_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_collections_store
  ON public.commission_collections(store_id, collected_at DESC);

ALTER TABLE public.order_commissions
  ADD COLUMN IF NOT EXISTS collection_id UUID
    REFERENCES public.commission_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_commissions_collection
  ON public.order_commissions(collection_id);

CREATE INDEX IF NOT EXISTS idx_order_commissions_unsettled
  ON public.order_commissions(store_id)
  WHERE collection_id IS NULL;

ALTER TABLE public.commission_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_collections_admin_all" ON public.commission_collections;
CREATE POLICY "commission_collections_admin_all"
  ON public.commission_collections
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "commission_collections_seller_select" ON public.commission_collections;
CREATE POLICY "commission_collections_seller_select"
  ON public.commission_collections
  FOR SELECT
  TO authenticated
  USING (public.is_store_owner(store_id));

DROP POLICY IF EXISTS "order_commissions_admin_update" ON public.order_commissions;
CREATE POLICY "order_commissions_admin_update"
  ON public.order_commissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Mark all unsettled commissions for a store as collected
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
