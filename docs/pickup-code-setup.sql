-- Pickup / delivery confirmation codes (additive).
-- When seller marks order as shipped (= ready / out for delivery), a 6-char code is set.
-- Buyer shows the code; seller enters it → order becomes delivered.
-- Run in Supabase SQL Editor.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_pickup_code_active
  ON public.orders (pickup_code)
  WHERE pickup_code IS NOT NULL AND status = 'shipped';

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

DROP TRIGGER IF EXISTS trg_orders_pickup_code ON public.orders;
CREATE TRIGGER trg_orders_pickup_code
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pickup_code_on_shipped();

-- Seller confirms buyer showed the code → delivered
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
