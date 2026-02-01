# Configuration du Partage de Listes

## ✅ Ce qui a été créé

### 1. Service Backend (`services/supabase/listSharingService.ts`)
- ✅ Invitation par email avec génération de code
- ✅ Acceptation d'invitation via code
- ✅ Gestion des membres (ajout, suppression, permissions)
- ✅ Vérification des permissions
- ✅ Fonctions pour quitter une liste partagée

### 2. Schéma de Base de Données (`supabase/migrations/002_list_sharing.sql`)
- ✅ Table `list_shares` pour les partages
- ✅ Index pour performances
- ✅ Row Level Security (RLS) pour sécurité
- ✅ Triggers pour `updated_at`
- ✅ Politiques de sécurité mises à jour pour listes et items
- ✅ Vue `list_members_view` pour faciliter les requêtes

### 3. Composants UI
- ✅ `ShareListModal` - Modal pour inviter des utilisateurs
- ✅ `AcceptInvitationModal` - Modal pour rejoindre via code
- ✅ `ListMembersScreen` - Écran de gestion des membres

### 4. Navigation
- ✅ Route `ListMembers` ajoutée
- ✅ Types TypeScript mis à jour

## 🚧 À faire pour finaliser

### 1. Exécuter la migration SQL
Dans votre dashboard Supabase (https://app.supabase.com):
1. Aller dans **SQL Editor**
2. Copier le contenu de `supabase/migrations/002_list_sharing.sql`
3. Exécuter le script
4. Vérifier que les tables sont créées

### 2. Ajouter les boutons dans l'interface

#### Sur `InventoryListScreen`:
Ajouter un bouton "Membres" dans le header pour accéder à la gestion des membres.

```tsx
// Dans InventoryListScreen, ajouter dans useEffect pour navigation.setOptions:
useEffect(() => {
  navigation.setOptions({
    headerTitle: listTitle,
    headerStyle: { backgroundColor: COLORS.secondary.cream },
    headerTintColor: listColor,
    headerRight: () => (
      <View style={{ flexDirection: 'row', gap: 8, marginRight: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ListMembers', {
            listId,
            listTitle,
            listColor
          })}
        >
          <Ionicons name="people" size={24} color={listColor} />
        </TouchableOpacity>
      </View>
    ),
  });
}, [listTitle, listColor, listId]);
```

#### Sur `HomeScreen`:
Ajouter un bouton FAB ou dans le header pour rejoindre une liste via code.

```tsx
// Ajouter un état
const [acceptInvitationModalVisible, setAcceptInvitationModalVisible] = useState(false);

// Ajouter le modal
<AcceptInvitationModal
  visible={acceptInvitationModalVisible}
  onClose={() => setAcceptInvitationModalVisible(false)}
  userId={currentUserId}
  onSuccess={(listId) => {
    // Recharger les listes
    loadLists();
  }}
/>
```

### 3. Synchronisation temps réel (Optionnel mais recommandé)

Ajouter dans `InventoryListScreen` pour écouter les changements en temps réel:

```tsx
useEffect(() => {
  // S'abonner aux changements de la liste
  const channel = supabase
    .channel(`list_${listId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'food_items',
      filter: `list_id=eq.${listId}`
    }, (payload) => {
      // Recharger les données
      loadListData();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [listId]);
```

## 📋 Permissions

### Types de permissions:
- **owner**: Propriétaire (peut tout faire)
- **admin**: Administrateur (peut gérer les membres)
- **edit**: Modification (peut ajouter/modifier/supprimer des aliments)
- **view**: Lecture seule (peut uniquement voir)

## 🔐 Sécurité

### Row Level Security (RLS)
Toutes les tables utilisent RLS pour garantir que:
- Les utilisateurs ne voient que leurs propres listes ET les listes partagées avec eux
- Les modifications sont limitées selon les permissions
- Les invitations sont protégées

### Codes d'invitation
- 6 caractères alphanumériques
- Uniques dans la base de données
- Peuvent être révoqués en supprimant l'invitation

## 🧪 Tests à effectuer

1. **Invitation**:
   - Inviter un utilisateur par email
   - Vérifier que le code est généré
   - Partager le code

2. **Acceptation**:
   - Se connecter avec le compte invité
   - Entrer le code d'invitation
   - Vérifier l'accès à la liste

3. **Permissions**:
   - Tester chaque niveau de permission
   - Vérifier que les restrictions fonctionnent

4. **Synchronisation**:
   - Modifier un aliment depuis un compte
   - Vérifier que l'autre compte voit le changement

5. **Gestion**:
   - Changer la permission d'un membre
   - Retirer un membre
   - Quitter une liste partagée

## 🚀 Fonctionnalités futures

- [ ] Notifications push pour les invitations
- [ ] Historique des modifications par membre
- [ ] Partage par lien (au lieu de code)
- [ ] Groupes de listes
- [ ] Chat dans les listes partagées
