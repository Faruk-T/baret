-- =============================================================================
-- Baret security hardening — run once in Supabase SQL Editor (after admin-ops-v2)
-- Fixes: price lock, store admin columns, status machine, license gate,
-- pickup secrecy, stock/commission cancel, notify RPC, realtime tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.store_has_valid_license(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = p_store_id
      AND s.license_expires_at IS NOT NULL
      AND s.license_expires_at > NOW()
  );
$$;

CREATE OR REPLACE FUNCTION public.store_is_sellable(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = p_store_id
      AND s.is_approved = TRUE
      AND s.is_active = TRUE
      AND s.license_expires_at IS NOT NULL
      AND s.license_expires_at > NOW()
  );
$$;

-- -----------------------------------------------------------------------------
-- 1) License keys: absolute expiry column + redeem (aligned with app)
-- -----------------------------------------------------------------------------
ALTER TABLE public.license_keys
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

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

  IF v_key.expires_at IS NOT NULL THEN
    IF v_key.expires_at <= NOW() THEN
      RAISE EXCEPTION 'Bu lisans anahtarının hedef tarihi geçmiş';
    END IF;
    v_new_expiry := v_key.expires_at;
  ELSE
    v_base := GREATEST(COALESCE(v_store.license_expires_at, NOW()), NOW());
    v_new_expiry := v_base + make_interval(days => v_key.duration_days);
  END IF;

  UPDATE public.license_keys
  SET
    redeemed_by = auth.uid(),
    redeemed_at = NOW(),
    store_id = v_store.id
  WHERE id = v_key.id;

  -- Bypass protect_store_admin_columns for license redeem only
  PERFORM set_config('baret.allow_license_update', 'on', true);

  UPDATE public.stores
  SET license_expires_at = v_new_expiry
  WHERE id = v_store.id
  RETURNING * INTO v_store;

  PERFORM set_config('baret.allow_license_update', 'off', true);

  RETURN v_store;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Force order prices from products (ignore client unit_price)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_order_price_from_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price NUMERIC(12, 2);
  v_active BOOLEAN;
  v_store UUID;
BEGIN
  SELECT p.price, p.is_active, p.store_id
  INTO v_price, v_active, v_store
  FROM public.products p
  WHERE p.id = NEW.product_id
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı';
  END IF;

  IF v_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Ürün satışta değil';
  END IF;

  IF NEW.store_id IS DISTINCT FROM v_store THEN
    RAISE EXCEPTION 'Mağaza / ürün uyuşmazlığı';
  END IF;

  IF NOT public.store_is_sellable(v_store) THEN
    RAISE EXCEPTION 'Mağaza onaylı değil, pasif veya lisansı yok/süresi dolmuş';
  END IF;

  NEW.unit_price := v_price;
  NEW.total_amount := ROUND(v_price * NEW.quantity, 2);
  NEW.status := 'pending';
  NEW.pickup_code := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_enforce_price ON public.orders;
CREATE TRIGGER trg_orders_enforce_price
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_price_from_product();

-- -----------------------------------------------------------------------------
-- 3) Lock admin-only store columns for sellers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_store_admin_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_approved := FALSE;
    -- sellers may create active shell; approval still required for catalog
    IF NEW.license_expires_at IS NOT NULL THEN
      NEW.license_expires_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'Mağaza onayını yalnızca admin değiştirebilir';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Mağaza aktifliğini yalnızca admin değiştirebilir';
  END IF;
  IF NEW.license_expires_at IS DISTINCT FROM OLD.license_expires_at THEN
    IF current_setting('baret.allow_license_update', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Lisans bitişini yalnızca admin / lisans anahtarı değiştirebilir';
    END IF;
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Mağaza sahibi değiştirilemez';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stores_protect_admin_cols ON public.stores;
CREATE TRIGGER trg_stores_protect_admin_cols
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_store_admin_columns();

-- -----------------------------------------------------------------------------
-- 4) Order status machine (+ block seller delivered / pickup_code tamper)
-- -----------------------------------------------------------------------------
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
    -- still protect pickup_code / money fields
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

  -- Never allow client to set/change pickup_code (trigger set_pickup_code handles it)
  IF NEW.pickup_code IS DISTINCT FROM OLD.pickup_code
     AND NOT (NEW.status = 'shipped' AND OLD.status = 'preparing') THEN
    IF NOT v_is_admin THEN
      NEW.pickup_code := OLD.pickup_code;
    END IF;
  END IF;

  IF NOT v_is_admin THEN
    NEW.unit_price := OLD.unit_price;
    NEW.total_amount := OLD.total_amount;
    NEW.quantity := OLD.quantity;
    NEW.product_id := OLD.product_id;
    NEW.store_id := OLD.store_id;
    NEW.buyer_id := OLD.buyer_id;
  END IF;

  -- Buyer: only pending → cancelled
  IF v_is_buyer AND NOT v_is_admin AND NOT v_is_seller THEN
    IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'Alıcı yalnızca bekleyen siparişi iptal edebilir';
    END IF;
    RETURN NEW;
  END IF;

  -- Seller (non-admin): pending→preparing, preparing→shipped only
  IF v_is_seller AND NOT v_is_admin THEN
    IF (OLD.status = 'pending' AND NEW.status = 'preparing')
       OR (OLD.status = 'preparing' AND NEW.status = 'shipped') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Geçersiz satıcı durum geçişi: % → %', OLD.status, NEW.status;
  END IF;

  -- Admin transitions
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
       OR (OLD.status = 'shipped' AND NEW.status IN ('delivered', 'cancelled', 'preparing'))
       OR (OLD.status = 'delivered' AND NEW.status = 'delivered') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Geçersiz admin durum geçişi: % → %', OLD.status, NEW.status;
  END IF;

  -- confirm_order_pickup is SECURITY DEFINER; auth.uid() is still seller.
  -- Allow shipped → delivered only when called from definer path via GUC flag.
  IF current_setting('baret.allow_deliver', true) = 'on'
     AND OLD.status = 'shipped'
     AND NEW.status = 'delivered' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sipariş durumu güncellenemedi';
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status_machine ON public.orders;
CREATE TRIGGER trg_orders_status_machine
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_transition();

-- Pickup code generation must run BEFORE status machine sees shipped,
-- and write secret to side table (not readable by seller).
CREATE TABLE IF NOT EXISTS public.order_pickup_secrets (
  order_id   UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_pickup_secrets_code
  ON public.order_pickup_secrets (upper(code));

ALTER TABLE public.order_pickup_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_secrets_buyer_admin_select" ON public.order_pickup_secrets;
CREATE POLICY "pickup_secrets_buyer_admin_select"
  ON public.order_pickup_secrets
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
  );

-- Migrate existing codes off orders.pickup_code
INSERT INTO public.order_pickup_secrets (order_id, code)
SELECT id, upper(trim(pickup_code))
FROM public.orders
WHERE pickup_code IS NOT NULL AND btrim(pickup_code) <> ''
ON CONFLICT (order_id) DO NOTHING;

UPDATE public.orders SET pickup_code = NULL WHERE pickup_code IS NOT NULL;

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
    LOOP
      candidate := public.generate_pickup_code();
      attempts := attempts + 1;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.order_pickup_secrets s WHERE upper(s.code) = candidate
      ) OR attempts > 20;
    END LOOP;

    INSERT INTO public.order_pickup_secrets (order_id, code)
    VALUES (NEW.id, candidate)
    ON CONFLICT (order_id) DO UPDATE SET code = EXCLUDED.code;

    -- Never expose on orders row (sellers select orders)
    NEW.pickup_code := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_pickup_code ON public.orders;
CREATE TRIGGER trg_orders_pickup_code
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pickup_code_on_shipped();

-- Ensure pickup trigger runs before status machine when both BEFORE UPDATE:
-- Postgres runs triggers alphabetically by name if same timing... 
-- Actually order is by name. Rename carefully:
-- trg_orders_pickup_code vs trg_orders_status_machine — 'pickup' < 'status' so pickup runs first. Good.

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
  JOIN public.order_pickup_secrets sec ON sec.order_id = o.id
  WHERE upper(sec.code) = v_normalized
    AND o.status = 'shipped'
    AND s.owner_id = auth.uid()
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kod bulunamadı veya sipariş teslime hazır değil';
  END IF;

  PERFORM set_config('baret.allow_deliver', 'on', true);

  UPDATE public.orders
  SET status = 'delivered'
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  PERFORM set_config('baret.allow_deliver', 'off', true);

  RETURN v_order;
END;
$$;

-- Buyer helper to read pickup code (secrets)
CREATE OR REPLACE FUNCTION public.get_order_pickup_code(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş gerekli';
  END IF;

  SELECT sec.code INTO v_code
  FROM public.order_pickup_secrets sec
  JOIN public.orders o ON o.id = sec.order_id
  WHERE o.id = p_order_id
    AND o.status = 'shipped'
    AND (o.buyer_id = auth.uid() OR public.is_admin());

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_pickup_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_pickup_code(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5) Catalog / order RLS: require valid license
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "stores_select_public_approved" ON public.stores;
CREATE POLICY "stores_select_public_approved"
  ON public.stores FOR SELECT TO anon, authenticated
  USING (
    is_approved = TRUE
    AND is_active = TRUE
    AND license_expires_at IS NOT NULL
    AND license_expires_at > NOW()
  );

DROP POLICY IF EXISTS "products_select_public_active" ON public.products;
CREATE POLICY "products_select_public_active"
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    is_active = TRUE
    AND image_url IS NOT NULL
    AND btrim(image_url) <> ''
    AND public.store_is_sellable(store_id)
  );

DROP POLICY IF EXISTS "products_insert_store_owner" ON public.products;
CREATE POLICY "products_insert_store_owner"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_store_owner(store_id)
      AND public.store_has_valid_license(store_id)
    )
  );

DROP POLICY IF EXISTS "products_update_store_owner" ON public.products;
CREATE POLICY "products_update_store_owner"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_store_owner(store_id) OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_store_owner(store_id)
      AND public.store_has_valid_license(store_id)
    )
  );

DROP POLICY IF EXISTS "orders_insert_buyer" ON public.orders;
CREATE POLICY "orders_insert_buyer"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'buyer'
    )
    AND EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_id
        AND p.store_id = orders.store_id
        AND p.is_active = TRUE
        AND p.stock >= orders.quantity
        AND p.image_url IS NOT NULL
        AND btrim(p.image_url) <> ''
        AND public.store_is_sellable(p.store_id)
    )
  );

-- Active products without photo: keep inactive for catalog compliance
UPDATE public.products
SET is_active = FALSE
WHERE is_active = TRUE
  AND (image_url IS NULL OR btrim(image_url) = '');

-- -----------------------------------------------------------------------------
-- 6) Stock restore on cancel from reserved states; commission void only unsettled
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.status = 'cancelled'
     AND OLD.status IN ('pending', 'preparing', 'shipped') THEN
    UPDATE public.products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_order_commission_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    IF EXISTS (
      SELECT 1 FROM public.order_commissions c
      WHERE c.order_id = NEW.id AND c.collection_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Tahsil edilmiş komisyonlu sipariş iptal edilemez';
    END IF;
    DELETE FROM public.order_commissions
    WHERE order_id = NEW.id
      AND collection_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Notifications: admin insert + SECURITY DEFINER notify RPC (no open spam)
-- -----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_role TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_admin_role_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_admin_role_check
      CHECK (admin_role IS NULL OR admin_role IN ('super', 'support', 'finance'));
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

UPDATE public.users
SET admin_role = 'super'
WHERE role = 'admin' AND admin_role IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_admin_all" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_all"
  ON public.admin_audit_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "app_notifications_select_own" ON public.app_notifications;
CREATE POLICY "app_notifications_select_own"
  ON public.app_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "app_notifications_update_own" ON public.app_notifications;
CREATE POLICY "app_notifications_update_own"
  ON public.app_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "app_notifications_admin_insert" ON public.app_notifications;
DROP POLICY IF EXISTS "app_notifications_insert_auth" ON public.app_notifications;
CREATE POLICY "app_notifications_admin_insert"
  ON public.app_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_kind TEXT DEFAULT 'info'
)
RETURNS public.app_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.app_notifications;
  v_uid UUID := auth.uid();
  v_ok BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Giriş gerekli';
  END IF;

  IF public.is_admin() THEN
    v_ok := TRUE;
  ELSIF EXISTS (
    -- Buyer notifying store owner of a recent order they placed
    SELECT 1
    FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE o.buyer_id = v_uid
      AND s.owner_id = p_user_id
      AND o.created_at > NOW() - INTERVAL '10 minutes'
  ) THEN
    v_ok := TRUE;
  ELSIF EXISTS (
    -- Seller notifying buyer of an order they own
    SELECT 1
    FROM public.orders o
    JOIN public.stores s ON s.id = o.store_id
    WHERE s.owner_id = v_uid
      AND o.buyer_id = p_user_id
  ) THEN
    v_ok := TRUE;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Bu kullanıcıya bildirim gönderme yetkin yok';
  END IF;

  INSERT INTO public.app_notifications (user_id, title, body, kind, created_by)
  VALUES (p_user_id, trim(p_title), trim(p_body), COALESCE(NULLIF(trim(p_kind), ''), 'info'), v_uid)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_user(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8) Realtime for admin pulse
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'platform_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_reports;
  END IF;
END;
$$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.platform_reports REPLICA IDENTITY FULL;
