-- ============================================
-- SEC-03 : Enforce hard cap sur invite_to_list
-- ============================================
-- Empêche l'abus du RPC si un client bypass le check `canShare()`.
-- Cap généreux (10) pour ne pas bloquer les premium RevenueCat,
-- dont le statut n'est pas encore synchronisé en DB.
-- TODO : remplacer par un vrai check is_premium quand le webhook
-- RevenueCat → profiles.is_premium sera en place.

CREATE OR REPLACE FUNCTION public.invite_to_list(
  p_local_list_id text,
  p_email text,
  p_permission text DEFAULT 'edit'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_list_id UUID;
  v_owner_id UUID;
  v_target_user_id UUID;
  v_existing_share UUID;
  v_share_count INT;
  v_max_shares CONSTANT INT := 10;
BEGIN
  -- Get the calling user
  v_owner_id := auth.uid();
  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_AUTHENTICATED');
  END IF;

  -- Resolve list ID (support both UUID and local numeric ID)
  IF p_local_list_id ~ '^[0-9a-f]{8}-' THEN
    v_list_id := p_local_list_id::UUID;
  ELSE
    SELECT id INTO v_list_id FROM lists WHERE local_id = p_local_list_id AND user_id = v_owner_id;
  END IF;

  IF v_list_id IS NULL THEN
    RETURN jsonb_build_object('error', 'LIST_NOT_FOUND');
  END IF;

  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM lists WHERE id = v_list_id AND user_id = v_owner_id) THEN
    RETURN jsonb_build_object('error', 'NOT_OWNER');
  END IF;

  -- Enforce global share quota (hard cap anti-abuse).
  -- Compte les shares actifs (accepted + pending) créés par cet owner,
  -- tous lists confondues.
  SELECT COUNT(*) INTO v_share_count
  FROM list_shares
  WHERE owner_id = v_owner_id
    AND status IN ('accepted', 'pending');

  IF v_share_count >= v_max_shares THEN
    RETURN jsonb_build_object('error', 'QUOTA_EXCEEDED');
  END IF;

  -- Look up user by email
  SELECT id INTO v_target_user_id FROM auth.users WHERE email = LOWER(TRIM(p_email));
  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'USER_NOT_FOUND');
  END IF;

  -- Can't invite yourself
  IF v_target_user_id = v_owner_id THEN
    RETURN jsonb_build_object('error', 'OWN_LIST');
  END IF;

  -- Check if already shared
  SELECT id INTO v_existing_share FROM list_shares
  WHERE list_id = v_list_id AND shared_with_user_id = v_target_user_id AND status = 'accepted';
  IF v_existing_share IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'ALREADY_MEMBER');
  END IF;

  -- Create the share (status = accepted immediately — no pending step needed)
  INSERT INTO list_shares (list_id, owner_id, shared_with_user_id, shared_with_email, permission, status)
  VALUES (v_list_id, v_owner_id, v_target_user_id, LOWER(TRIM(p_email)), p_permission, 'accepted');

  RETURN jsonb_build_object('error', NULL);
END;
$function$;
