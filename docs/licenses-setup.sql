-- Seller license keys (additive). Run once in Supabase Dashboard → SQL Editor.
-- Admin creates one-time codes; sellers redeem to extend stores.license_expires_at.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.license_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  duration_days   INTEGER NOT NULL CHECK (duration_days > 0),
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  redeemed_at     TIMESTAMPTZ,
  store_id        UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  CHECK (
    (redeemed_by IS NULL AND redeemed_at IS NULL AND store_id IS NULL)
    OR (redeemed_by IS NOT NULL AND redeemed_at IS NOT NULL AND store_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_license_keys_created_at
  ON public.license_keys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_license_keys_unused
  ON public.license_keys(redeemed_at)
  WHERE redeemed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stores_license_expires
  ON public.stores(license_expires_at);

ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "license_keys_admin_all" ON public.license_keys;
CREATE POLICY "license_keys_admin_all"
  ON public.license_keys
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "license_keys_select_own_redeemed" ON public.license_keys;
CREATE POLICY "license_keys_select_own_redeemed"
  ON public.license_keys
  FOR SELECT
  TO authenticated
  USING (redeemed_by = auth.uid());

-- Atomic redeem: seller enters code → mark used + extend store license.
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

  v_base := GREATEST(COALESCE(v_store.license_expires_at, NOW()), NOW());
  v_new_expiry := v_base + make_interval(days => v_key.duration_days);

  UPDATE public.license_keys
  SET
    redeemed_by = auth.uid(),
    redeemed_at = NOW(),
    store_id = v_store.id
  WHERE id = v_key.id;

  UPDATE public.stores
  SET license_expires_at = v_new_expiry
  WHERE id = v_store.id
  RETURNING * INTO v_store;

  RETURN v_store;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_license_key(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_license_key(TEXT) TO authenticated;
