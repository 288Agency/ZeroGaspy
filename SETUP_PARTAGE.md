# 🔧 Configuration du système de partage

## ⚠️ Problème actuel

Le système de partage ne peut pas fonctionner car **tes listes sont stockées localement** (AsyncStorage), pas dans Supabase. Pour que le partage fonctionne, il faut migrer tes données vers Supabase.

## 📋 Étapes de configuration

### 1️⃣ Vérifier la connexion Supabase

Assure-toi d'être connecté à ton compte Supabase dans l'app.

### 2️⃣ Exécuter les migrations SQL

Va dans ton dashboard Supabase : https://supabase.com/dashboard

#### A. Migration de base (si pas déjà fait)

```sql
-- Créer la table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer la table lists
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3C6E47',
  local_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer la table food_items
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  expiration_date DATE NOT NULL,
  quantity INTEGER DEFAULT 1,
  category TEXT,
  image_uri TEXT,
  price DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'thrown')),
  is_opened BOOLEAN DEFAULT FALSE,
  opened_date DATE,
  days_after_opening INTEGER,
  local_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Utilisateurs peuvent voir leur propre profil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies pour lists
CREATE POLICY "Utilisateurs peuvent voir leurs listes"
  ON public.lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent créer leurs listes"
  ON public.lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent modifier leurs listes"
  ON public.lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent supprimer leurs listes"
  ON public.lists FOR DELETE
  USING (auth.uid() = user_id);

-- Policies pour food_items
CREATE POLICY "Utilisateurs peuvent voir leurs aliments"
  ON public.food_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent créer leurs aliments"
  ON public.food_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent modifier leurs aliments"
  ON public.food_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent supprimer leurs aliments"
  ON public.food_items FOR DELETE
  USING (auth.uid() = user_id);
```

#### B. Migration pour le partage

Ensuite, exécute cette migration pour ajouter le système de partage:

```sql
-- Créer la table list_shares
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

-- Index pour performances
CREATE INDEX idx_list_shares_list_id ON public.list_shares(list_id);
CREATE INDEX idx_list_shares_invitation_code ON public.list_shares(invitation_code);
CREATE INDEX idx_list_shares_shared_with_user_id ON public.list_shares(shared_with_user_id);
CREATE INDEX idx_list_shares_status ON public.list_shares(status);

-- Activer RLS
ALTER TABLE public.list_shares ENABLE ROW LEVEL SECURITY;

-- Policies pour list_shares
CREATE POLICY "Propriétaires peuvent voir leurs invitations"
  ON public.list_shares FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Invités peuvent voir leurs invitations"
  ON public.list_shares FOR SELECT
  USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Propriétaires peuvent créer des invitations"
  ON public.list_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Invités peuvent accepter leurs invitations"
  ON public.list_shares FOR UPDATE
  USING (auth.uid() = shared_with_user_id OR auth.uid() = owner_id);

CREATE POLICY "Propriétaires peuvent supprimer des invitations"
  ON public.list_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- Mettre à jour les policies de lists pour inclure les listes partagées
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs listes" ON public.lists;
CREATE POLICY "Utilisateurs peuvent voir leurs listes et listes partagées"
  ON public.lists FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = lists.id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
    )
  );

-- Mettre à jour les policies de food_items pour inclure les listes partagées
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs aliments" ON public.food_items;
CREATE POLICY "Utilisateurs peuvent voir leurs aliments et aliments des listes partagées"
  ON public.food_items FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = food_items.list_id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Utilisateurs peuvent créer leurs aliments" ON public.food_items;
CREATE POLICY "Utilisateurs peuvent créer des aliments dans leurs listes et listes partagées avec permission edit/admin"
  ON public.food_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (SELECT 1 FROM public.lists WHERE lists.id = food_items.list_id AND lists.user_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.list_shares
        WHERE list_shares.list_id = food_items.list_id
        AND list_shares.shared_with_user_id = auth.uid()
        AND list_shares.status = 'accepted'
        AND list_shares.permission IN ('edit', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leurs aliments" ON public.food_items;
CREATE POLICY "Utilisateurs peuvent modifier les aliments de leurs listes et listes partagées avec permission edit/admin"
  ON public.food_items FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.lists WHERE lists.id = food_items.list_id AND lists.user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = food_items.list_id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
      AND list_shares.permission IN ('edit', 'admin')
    )
  );

DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer leurs aliments" ON public.food_items;
CREATE POLICY "Utilisateurs peuvent supprimer les aliments de leurs listes et listes partagées avec permission edit/admin"
  ON public.food_items FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.lists WHERE lists.id = food_items.list_id AND lists.user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.list_shares
      WHERE list_shares.list_id = food_items.list_id
      AND list_shares.shared_with_user_id = auth.uid()
      AND list_shares.status = 'accepted'
      AND list_shares.permission IN ('edit', 'admin')
    )
  );
```

### 3️⃣ Activer Realtime (pour la synchronisation en temps réel)

Dans ton dashboard Supabase:
1. Va dans **Database** > **Replication**
2. Active la réplication pour ces tables:
   - ✅ `food_items`
   - ✅ `lists`
   - ✅ `list_shares`

### 4️⃣ Migrer tes données locales vers Supabase

Une fois les migrations SQL exécutées:

1. **Assure-toi d'être connecté** dans l'app
2. La migration se fera **automatiquement** au prochain lancement
3. Le code vérifie si les données ont déjà été migrées (flag `supabase_data_migrated_{userId}`)
4. Tes listes locales seront copiées dans Supabase

Pour forcer une migration immédiate, tu peux:
```typescript
// Dans la console de l'app ou dans un useEffect temporaire
import { migrateLocalDataToCloud } from './services/supabase/syncService';
import { supabase } from './config/supabase';

const migrate = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await migrateLocalDataToCloud(user.id);
    console.log('Migration terminée!');
  }
};
migrate();
```

### 5️⃣ Vérifier que tout fonctionne

Après la migration:
1. Ouvre une liste
2. Clique sur l'icône 👥 en haut à droite
3. Tu devrais voir "Membres (1)" avec toi comme propriétaire
4. Le bouton **"Inviter un membre"** devrait maintenant apparaître en bas

## 🎯 Une fois configuré

Tu pourras:
- ✅ Inviter des membres par email
- ✅ Générer des codes d'invitation
- ✅ Rejoindre des listes partagées
- ✅ Voir les modifications en temps réel
- ✅ Gérer les permissions (voir/modifier/admin)

## 🔍 Debug

Si le bouton "Inviter un membre" n'apparaît toujours pas:

1. Vérifie dans la console:
```
Membres (0) ← Problème: aucun membre trouvé
Membres (1) ← OK: tu es détecté comme propriétaire
```

2. Vérifie que la liste existe dans Supabase:
   - Dashboard > **Table Editor** > **lists**
   - Tu devrais voir ta liste avec ton `user_id`

3. Vérifie ta connexion:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user?.id); // Doit afficher ton ID
```
