-- =============================================================================
-- Flat %10 commission on every order line (no tiers / intro / rating discount)
-- Run once in Supabase SQL Editor
-- =============================================================================

UPDATE public.platform_settings
SET
  commission_rate = 10.00,
  tier1_rate = 10.00,
  tier2_rate = 10.00,
  tier3_rate = 10.00,
  intro_commission_rate = 10.00,
  intro_order_limit = 0,
  high_rating_discount = 0,
  min_commission_amount = 0,
  updated_at = NOW()
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
  SELECT COALESCE(commission_rate, 10.00)
  INTO v_rate
  FROM public.platform_settings
  WHERE id = 1;

  IF v_rate IS NULL THEN
    v_rate := 10.00;
  END IF;

  -- Pure percent cut — no min floor, no tiers, no intro
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

-- Seller may reject (cancel) pending / preparing orders so stock is restored
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := public.is_admin();
  v_is_seller BOOLEAN := public.is_store_owner(OLD.store_id);
  v_is_buyer BOOLEAN := (OLD.buyer_id = auth.uid());
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    IF NOT v_is_admin THEN
      NEW.unit_price := OLD.unit_price;
      NEW.total_amount := OLD.total_amount;
      NEW.quantity := OLD.quantity;
      NEW.product_id := OLD.product_id;
      NEW.store_id := OLD.store_id;
      NEW.buyer_id := OLD.buyer_id;
      NEW.pickup_code := OLD.pickup_code;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT v_is_admin THEN
    NEW.unit_price := OLD.unit_price;
    NEW.total_amount := OLD.total_amount;
    NEW.quantity := OLD.quantity;
    NEW.product_id := OLD.product_id;
    NEW.store_id := OLD.store_id;
    NEW.buyer_id := OLD.buyer_id;
  END IF;

  IF v_is_buyer AND NOT v_is_admin AND NOT v_is_seller THEN
    IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'Alıcı yalnızca bekleyen siparişi iptal edebilir';
    END IF;
    RETURN NEW;
  END IF;

  IF v_is_seller AND NOT v_is_admin THEN
    IF (OLD.status = 'pending' AND NEW.status = 'preparing')
       OR (OLD.status = 'preparing' AND NEW.status = 'shipped')
       OR (OLD.status IN ('pending', 'preparing') AND NEW.status = 'cancelled') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Geçersiz satıcı durum geçişi: % → %', OLD.status, NEW.status;
  END IF;

  IF v_is_admin THEN
    IF NEW.status = 'cancelled' THEN
      IF OLD.status = 'delivered' THEN
        RAISE EXCEPTION 'Teslim edilmiş sipariş iptal edilemez';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.order_commissions c
        WHERE c.order_id = OLD.id AND c.collection_id IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'Tahsil edilmiş komisyonlu sipariş iptal edilemez';
      END IF;
      RETURN NEW;
    END IF;
    IF (OLD.status = 'pending' AND NEW.status IN ('preparing', 'cancelled'))
       OR (OLD.status = 'preparing' AND NEW.status IN ('shipped', 'cancelled', 'pending'))
       OR (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'cancelled', 'preparing')) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Geçersiz admin durum geçişi: % → %', OLD.status, NEW.status;
  END IF;

  IF current_setting('baret.allow_deliver', true) = 'on'
     AND OLD.status = 'shipped'
     AND NEW.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sipariş durumu güncellenemedi';
END;
$$;
