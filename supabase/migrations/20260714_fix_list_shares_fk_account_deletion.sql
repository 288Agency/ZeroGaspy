-- ============================================
-- FIX: suppression de compte bloquee par list_shares
-- ============================================
-- Les FK owner_id et shared_with_user_id pointaient vers auth.users
-- en ON DELETE NO ACTION. Consequence : un utilisateur destinataire
-- d'une liste partagee ne pouvait PAS supprimer son compte
-- (auth.admin.deleteUser levait une violation de cle etrangere),
-- ce qui viole l'exigence Apple App Store de suppression de compte.

-- owner_id (NOT NULL) : proprietaire supprime => partage supprime
ALTER TABLE public.list_shares
  DROP CONSTRAINT list_shares_owner_id_fkey,
  ADD CONSTRAINT list_shares_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- shared_with_user_id (nullable) : destinataire supprime => l'invitation
-- redevient "en attente" (shared_with_email + invitation_code conserves)
ALTER TABLE public.list_shares
  DROP CONSTRAINT list_shares_shared_with_user_id_fkey,
  ADD CONSTRAINT list_shares_shared_with_user_id_fkey
    FOREIGN KEY (shared_with_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
