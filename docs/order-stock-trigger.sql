-- Optional but recommended for Day 16+: decrement product stock when an order is placed.
-- Run once in Supabase Dashboard → SQL Editor.
-- RLS already blocks INSERT when stock < quantity; this keeps stock in sync after insert.

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

-- Restore stock when buyer cancels a pending order (status → cancelled)
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
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
