-- ============================================================================
-- Durcissement sécurité RPC (audit 2026-07)
-- 1) complete_referral / ensure_referral_code : n'autoriser que le user
--    authentifié à agir sur SON propre id (bloque l'abus anon de crédits/codes)
-- ============================================================================

-- 1a) complete_referral : garde auth.uid() = p_referee_id
CREATE OR REPLACE FUNCTION public.complete_referral(p_referee_id uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_referrer_id uuid;
  v_referrer_count integer;
  v_already_referred boolean;
BEGIN
  -- Sécurité : seul le filleul authentifié peut compléter SON parrainage
  IF auth.uid() IS NULL OR auth.uid() <> p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.referrals WHERE referee_id = p_referee_id
  ) INTO v_already_referred;

  IF v_already_referred THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_referred');
  END IF;

  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = upper(p_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_code');
  END IF;

  IF v_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_referral');
  END IF;

  SELECT count(*) INTO v_referrer_count
  FROM public.referrals
  WHERE referrer_id = v_referrer_id AND status = 'completed';

  IF v_referrer_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'referrer_limit_reached');
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, referral_code, status, completed_at)
  VALUES (v_referrer_id, p_referee_id, upper(p_code), 'completed', now());

  INSERT INTO public.bonus_scan_credits (user_id, credits_remaining, credits_earned_total)
  VALUES (p_referee_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET credits_remaining = bonus_scan_credits.credits_remaining + 1,
      credits_earned_total = bonus_scan_credits.credits_earned_total + 1,
      updated_at = now()
  WHERE bonus_scan_credits.credits_earned_total < 6;

  INSERT INTO public.bonus_scan_credits (user_id, credits_remaining, credits_earned_total)
  VALUES (v_referrer_id, 1, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET credits_remaining = bonus_scan_credits.credits_remaining + 1,
      credits_earned_total = bonus_scan_credits.credits_earned_total + 1,
      updated_at = now()
  WHERE bonus_scan_credits.credits_earned_total < 6;

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$function$;

-- 1b) ensure_referral_code : garde auth.uid() = p_user_id
CREATE OR REPLACE FUNCTION public.ensure_referral_code(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  existing_code text;
  new_code text;
  max_attempts integer := 10;
  attempt integer := 0;
BEGIN
  -- Sécurité : l'utilisateur ne peut gérer que SON propre code
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

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
$function$;
