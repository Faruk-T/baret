-- Run once in Supabase SQL Editor
-- License absolute expiry + audit log + in-app notifications

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

  UPDATE public.stores
  SET license_expires_at = v_new_expiry
  WHERE id = v_store.id
  RETURNING * INTO v_store;

  RETURN v_store;
END;
$$;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_admin_all" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_all"
  ON public.admin_audit_logs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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

CREATE INDEX IF NOT EXISTS idx_app_notifications_user
  ON public.app_notifications(user_id, created_at DESC);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "app_notifications_insert_auth"
  ON public.app_notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (created_by = auth.uid())
  );

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_role TEXT
  CHECK (admin_role IS NULL OR admin_role IN ('super', 'support', 'finance'));

UPDATE public.users
SET admin_role = 'super'
WHERE role = 'admin' AND admin_role IS NULL;
