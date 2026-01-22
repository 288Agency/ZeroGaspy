-- ============================================
-- TABLES POUR LE PARTAGE DE LISTES
-- ============================================

-- Table pour les partages de listes
CREATE TABLE IF NOT EXISTS public.list_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  invitation_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_list_shares_list_id ON public.list_shares(list_id);
CREATE INDEX IF NOT EXISTS idx_list_shares_email ON public.list_shares(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_list_shares_user_id ON public.list_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_list_shares_code ON public.list_shares(invitation_code);
CREATE INDEX IF NOT EXISTS idx_list_shares_status ON public.list_shares(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_list_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_list_shares_updated_at
  BEFORE UPDATE ON public.list_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_list_shares_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS
ALTER TABLE public.list_shares ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres invitations
CREATE POLICY "Users can view their own invitations"
  ON public.list_shares
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR auth.uid() = shared_with_user_id
    OR auth.email() = shared_with_email
  );

-- Politique: Les propriétaires peuvent créer des invitations
CREATE POLICY "Owners can create invitations"
  ON public.list_shares
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.lists
      WHERE lists.id = list_shares.list_id
      AND lists.user_id = auth.uid()
    )
  );

-- Politique: Les propriétaires et destinataires peuvent modifier
CREATE POLICY "Owners and recipients can update invitations"
  ON public.list_shares
  FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR auth.uid() = shared_with_user_id
    OR auth.email() = shared_with_email
  );

-- Politique: Les propriétaires peuvent supprimer des invitations
CREATE POLICY "Owners can delete invitations"
  ON public.list_shares
  FOR DELETE
  USING (
    auth.uid() = owner_id
    OR auth.uid() = shared_with_user_id
  );

-- ============================================
-- MODIFIER LES POLITIQUES DES LISTES
-- ============================================

-- Supprimer l'ancienne politique de lecture des listes
DROP POLICY IF EXISTS "Users can view their own lists" ON public.lists;

-- Nouvelle politique: Les utilisateurs peuvent voir leurs propres listes ET celles partagées avec eux
CREATE POLICY "Users can view own and shared lists"
  ON public.lists
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = lists.id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
    )
  );

-- ============================================
-- MODIFIER LES POLITIQUES DES ITEMS
-- ============================================

-- Supprimer l'ancienne politique de lecture des items
DROP POLICY IF EXISTS "Users can view their own items" ON public.food_items;

-- Nouvelle politique: Les utilisateurs peuvent voir les items de leurs listes ET des listes partagées
CREATE POLICY "Users can view own and shared items"
  ON public.food_items
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = food_items.list_id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
    )
  );

-- Supprimer l'ancienne politique de mise à jour des items
DROP POLICY IF EXISTS "Users can update their own items" ON public.food_items;

-- Nouvelle politique: Les utilisateurs peuvent modifier les items s'ils ont la permission edit ou admin
CREATE POLICY "Users can update items with edit permission"
  ON public.food_items
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = food_items.list_id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
      AND list_shares.permission IN ('edit', 'admin')
    )
  );

-- Nouvelle politique: Les utilisateurs peuvent insérer des items s'ils ont la permission edit ou admin
DROP POLICY IF EXISTS "Users can insert their own items" ON public.food_items;

CREATE POLICY "Users can insert items with edit permission"
  ON public.food_items
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = food_items.list_id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
      AND list_shares.permission IN ('edit', 'admin')
    )
  );

-- Nouvelle politique: Les utilisateurs peuvent supprimer des items s'ils ont la permission edit ou admin
DROP POLICY IF EXISTS "Users can delete their own items" ON public.food_items;

CREATE POLICY "Users can delete items with edit permission"
  ON public.food_items
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = food_items.list_id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
      AND list_shares.permission IN ('edit', 'admin')
    )
  );

-- ============================================
-- FONCTION POUR NETTOYER LES INVITATIONS EXPIRÉES
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  -- Supprimer les invitations en attente de plus de 30 jours
  DELETE FROM public.list_shares
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue pour obtenir facilement les membres d'une liste
CREATE OR REPLACE VIEW public.list_members_view AS
SELECT
  l.id as list_id,
  l.user_id,
  p.email,
  p.full_name,
  p.avatar_url,
  'owner' as permission,
  l.created_at as joined_at
FROM public.lists l
JOIN public.profiles p ON l.user_id = p.id

UNION ALL

SELECT
  ls.list_id,
  ls.shared_with_user_id as user_id,
  p.email,
  p.full_name,
  p.avatar_url,
  ls.permission,
  ls.accepted_at as joined_at
FROM public.list_shares ls
JOIN public.profiles p ON ls.shared_with_user_id = p.id
WHERE ls.status = 'accepted';

-- Accorder les permissions sur la vue
GRANT SELECT ON public.list_members_view TO authenticated;
