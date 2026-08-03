-- Commission tiers by order line amount (additive).
-- Run in Supabase SQL Editor after commission + anti-leakage setup.
--
-- Model:
--   · Sipariş satır tutarına göre dilim seçilir (ucuz çivi ≠ pahalı çimento)
--   · İlk sipariş / yüksek puan teşvikleri dilim oranının üstüne uygulanır
--   · min_commission_amount: çok ucuz satırda taban platform payı

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS tier1_max NUMERIC(12, 2) NOT NULL DEFAULT 100.00
    CHECK (tier1_max > 0);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS tier1_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00
    CHECK (tier1_rate >= 0 AND tier1_rate <= 100);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS tier2_max NUMERIC(12, 2) NOT NULL DEFAULT 1000.00
    CHECK (tier2_max > 0);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS tier2_rate NUMERIC(5, 2) NOT NULL DEFAULT 8.00
    CHECK (tier2_rate >= 0 AND tier2_rate <= 100);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS tier3_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00
    CHECK (tier3_rate >= 0 AND tier3_rate <= 100);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS min_commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 1.00
    CHECK (min_commission_amount >= 0);

-- Keep tier2 aligned with legacy commission_rate where null-ish
UPDATE public.platform_settings
SET
  tier1_max = COALESCE(tier1_max, 100.00),
  tier1_rate = COALESCE(tier1_rate, 10.00),
  tier2_max = COALESCE(tier2_max, 1000.00),
  tier2_rate = COALESCE(tier2_rate, commission_rate, 8.00),
  tier3_rate = COALESCE(tier3_rate, 5.00),
  min_commission_amount = COALESCE(min_commission_amount, 1.00)
WHERE id = 1;

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_tier_order;

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_tier_order
  CHECK (tier2_max > tier1_max);

CREATE OR REPLACE FUNCTION public.create_order_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier1_max NUMERIC(12, 2);
  v_tier1_rate NUMERIC(5, 2);
  v_tier2_max NUMERIC(12, 2);
  v_tier2_rate NUMERIC(5, 2);
  v_tier3_rate NUMERIC(5, 2);
  v_min_commission NUMERIC(12, 2);
  v_intro NUMERIC(5, 2);
  v_intro_limit INTEGER;
  v_discount NUMERIC(5, 2);
  v_rate NUMERIC(5, 2);
  v_prior_count INTEGER;
  v_avg NUMERIC;
  v_review_count INTEGER;
  v_commission NUMERIC(12, 2);
  v_net NUMERIC(12, 2);
BEGIN
  SELECT
    COALESCE(tier1_max, 100.00),
    COALESCE(tier1_rate, 10.00),
    COALESCE(tier2_max, 1000.00),
    COALESCE(tier2_rate, commission_rate, 8.00),
    COALESCE(tier3_rate, 5.00),
    COALESCE(min_commission_amount, 1.00),
    COALESCE(intro_commission_rate, 5.00),
    COALESCE(intro_order_limit, 10),
    COALESCE(high_rating_discount, 1.00)
  INTO
    v_tier1_max, v_tier1_rate, v_tier2_max, v_tier2_rate, v_tier3_rate,
    v_min_commission, v_intro, v_intro_limit, v_discount
  FROM public.platform_settings
  WHERE id = 1;

  -- 1) Amount tier (per order line total)
  IF NEW.total_amount < v_tier1_max THEN
    v_rate := v_tier1_rate;
  ELSIF NEW.total_amount < v_tier2_max THEN
    v_rate := v_tier2_rate;
  ELSE
    v_rate := v_tier3_rate;
  END IF;

  -- 2) Intro incentive (new stores stay on-platform)
  SELECT COUNT(*) INTO v_prior_count
  FROM public.orders
  WHERE store_id = NEW.store_id
    AND id <> NEW.id
    AND status <> 'cancelled';

  IF v_prior_count < v_intro_limit THEN
    v_rate := LEAST(v_rate, v_intro);
  END IF;

  -- 3) High-rating discount
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO v_avg, v_review_count
  FROM public.reviews
  WHERE store_id = NEW.store_id;

  IF v_review_count >= 5 AND v_avg >= 4.5 THEN
    v_rate := GREATEST(0, v_rate - v_discount);
  END IF;

  v_commission := ROUND(NEW.total_amount * v_rate / 100.0, 2);

  -- 4) Minimum platform cut (never exceed order amount)
  IF v_commission < v_min_commission THEN
    v_commission := LEAST(v_min_commission, NEW.total_amount);
  END IF;

  v_net := NEW.total_amount - v_commission;

  -- Store effective rate when min floor changed the cut
  IF NEW.total_amount > 0 THEN
    v_rate := ROUND((v_commission / NEW.total_amount) * 100.0, 2);
  END IF;

  INSERT INTO public.order_commissions (
    order_id, store_id, order_amount, commission_rate, commission_amount, seller_net_amount
  ) VALUES (
    NEW.id, NEW.store_id, NEW.total_amount, v_rate, v_commission, v_net
  );

  RETURN NEW;
END;
$$;
