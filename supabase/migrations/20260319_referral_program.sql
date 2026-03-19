-- ============================================================
-- Programme de Parrainage ZeroGaspy
-- ============================================================

-- Table des codes parrain (1 code unique par utilisateur)
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table des parrainages
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referral_code text NOT NULL,
  status text DEFAULT 'completed' NOT NULL CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table des crédits bonus scan
CREATE TABLE IF NOT EXISTS public.bonus_scan_credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits_remaining integer DEFAULT 0 NOT NULL CHECK (credits_remaining >= 0),
  credits_earned_total integer DEFAULT 0 NOT NULL CHECK (credits_earned_total <= 6),
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON public.referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_bonus_scan_credits_user ON public.bonus_scan_credits(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_scan_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view own referrals as referee"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referee_id);

CREATE POLICY "Users can view own bonus credits"
  ON public.bonus_scan_credits FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Functions
-- ============================================================

-- Charset sans ambiguïté (pas de 0/O/1/I/L)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  charset text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := 'ZERO-';
  i integer;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(charset, floor(random() * length(charset) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Génère ou retourne le code parrain d'un utilisateur
CREATE OR REPLACE FUNCTION public.ensure_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_code text;
  new_code text;
  max_attempts integer := 10;
  attempt integer := 0;
BEGIN
  SELECT code INTO existing_code
  FROM public.referral_codes
  WHERE user_id = p_user_id;

  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  LOOP
    attempt := attempt + 1;
    new_code := public.generate_referral_code();

    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (p_user_id, new_code);
      RETURN new_code;
    EXCEPTION WHEN unique_violation THEN
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Unable to generate unique referral code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Valide un parrainage : crédite parrain et filleul
CREATE OR REPLACE FUNCTION public.complete_referral(p_referee_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id uuid;
  v_referrer_count integer;
  v_already_referred boolean;
BEGIN
  -- Vérifier que le filleul n'a pas déjà été parrainé
  SELECT EXISTS(
    SELECT 1 FROM public.referrals WHERE referee_id = p_referee_id
  ) INTO v_already_referred;

  IF v_already_referred THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_referred');
  END IF;

  -- Trouver le parrain via le code
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = upper(p_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  -- Pas d'auto-parrainage
  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_referral');
  END IF;

  -- Vérifier le plafond (5 parrainages max)
  SELECT count(*) INTO v_referrer_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id AND status = 'completed';

  IF v_referrer_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'referrer_limit_reached');
  END IF;

  -- Créer le parrainage
  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status, completed_at)
  VALUES (v_referrer_id, p_referee_id, upper(p_code), 'completed', now());

  -- Créditer le filleul (+1 scan bonus)
  INSERT INTO public.bonus_scan_credits (user_id, credits_remaining, credits_earned_total)
  VALUES (p_referee_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET credits_remaining = bonus_scan_credits.credits_remaining + 1,
      credits_earned_total = bonus_scan_credits.credits_earned_total + 1,
      updated_at = now()
  WHERE bonus_scan_credits.credits_earned_total < 6;

  -- Créditer le parrain (+1 scan bonus)
  INSERT INTO public.bonus_scan_credits (user_id, credits_remaining, credits_earned_total)
  VALUES (v_referrer_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET credits_remaining = bonus_scan_credits.credits_remaining + 1,
      credits_earned_total = bonus_scan_credits.credits_earned_total + 1,
      updated_at = now()
  WHERE bonus_scan_credits.credits_earned_total < 6;

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;
