-- ============================================================================
-- Couper l'accès anon (PUBLIC) aux fonctions SECURITY DEFINER.
-- EXECUTE est accordé à PUBLIC par défaut → anon/authenticated en héritent.
-- On révoque PUBLIC, puis on re-grant à `authenticated` uniquement les
-- fonctions réellement appelées en RPC par l'app.
-- ============================================================================

-- RPC applicatives (validées en interne par auth.uid()) → authenticated OK, anon KO
REVOKE EXECUTE ON FUNCTION public.complete_referral(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_referral(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_referral_code(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.ensure_referral_code(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.invite_to_list(text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.invite_to_list(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_share_code(text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_share_code(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_by_share_code(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.join_by_share_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_shared_list_ids() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_shared_list_ids() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lookup_share_code(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.lookup_share_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_recipe_variant() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.assign_recipe_variant() TO authenticated;

-- Fonctions trigger / internes : aucun accès RPC (les triggers s'exécutent sans EXECUTE côté appelant)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_notion_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_list_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_ai_recipe_cache() FROM PUBLIC, anon, authenticated;
