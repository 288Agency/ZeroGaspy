-- ============================================================================
-- Figer search_path sur les fonctions restantes (lint 0011 function_search_path_mutable).
-- ALTER FUNCTION ... SET ne modifie pas le corps → non-breaking. Les refs non
-- qualifiées vers le schéma public continuent de résoudre.
-- ============================================================================
ALTER FUNCTION public.assign_recipe_variant()                 SET search_path = public;
ALTER FUNCTION public.cleanup_expired_ai_recipe_cache()       SET search_path = public;
ALTER FUNCTION public.generate_referral_code()                SET search_path = public;
ALTER FUNCTION public.invite_to_list(text, text, text)        SET search_path = public;
ALTER FUNCTION public.set_updated_at()                        SET search_path = public;
ALTER FUNCTION public.update_list_shares_updated_at()         SET search_path = public;
ALTER FUNCTION public.update_list_timestamp()                 SET search_path = public;
ALTER FUNCTION public.update_user_gamification_updated_at()   SET search_path = public;
