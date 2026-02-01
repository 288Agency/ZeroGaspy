# Guide de Partage Simplifié - ZeroGaspy

## Modifications apportées

Le système de partage de listes a été simplifié pour permettre le partage par **code** ou par **lien**, sans avoir besoin de l'email du destinataire.

## Comment ça fonctionne

### Pour partager une liste

1. Ouvrez une liste existante
2. Cliquez sur le bouton de partage
3. Un code à 6 caractères est **généré automatiquement**
4. Vous avez deux options :
   - **"Copier le code"** : Copie le code (ex: ABC123) dans le presse-papiers
   - **"Partager le lien"** : Partage un lien cliquable `zerogaspy://join/ABC123`

5. Envoyez le code ou le lien par le moyen de votre choix (SMS, WhatsApp, email, etc.)

### Pour rejoindre une liste partagée

**Option 1 : Avec un lien**
1. Cliquez sur le lien reçu (ex: `zerogaspy://join/ABC123`)
2. L'application s'ouvre automatiquement avec le code pré-rempli
3. Validez pour rejoindre la liste

**Option 2 : Avec un code manuel**
1. Ouvrez l'application
2. Allez dans "Rejoindre une liste"
3. Entrez le code à 6 caractères
4. Validez pour rejoindre la liste

## Avantages

- ✅ Plus besoin de demander l'email
- ✅ Partage plus rapide et simple
- ✅ Fonctionne avec tous les moyens de communication
- ✅ Les liens sont cliquables et ouvrent directement l'app
- ✅ Possibilité de régénérer un nouveau code à tout moment

## Aspects techniques

### Architecture

- **local_id** : ID local de la liste (timestamp)
- **cloud_id** : UUID généré pour Supabase
- Le système gère automatiquement la correspondance entre les deux

### Synchronisation

- Les listes partagées sont automatiquement synchronisées
- Après avoir accepté une invitation, la liste apparaît dans votre app
- Les modifications sont synchronisées en temps réel entre tous les membres

### Deep Linking

- Schéma : `zerogaspy://`
- Format des liens : `zerogaspy://join/{CODE}`
- Configuré dans `app.json` avec le paramètre `scheme`

## Fichiers modifiés

1. **services/supabase/listSharingService.ts**
   - Fonction `generateInvitationCodeForList` : Génère un code sans email
   - Fonction `acceptInvitationByCode` : Accepte les codes universels

2. **services/supabase/syncService.ts**
   - Fonction `pullFromCloud` : Récupère aussi les listes partagées

3. **components/ShareListModal.tsx**
   - Suppression du champ email
   - Génération automatique du code
   - Boutons de partage du code et du lien

4. **components/AcceptInvitationModal.tsx**
   - Support du code pré-rempli depuis un deep link

5. **hooks/useInvitationDeepLink.ts**
   - Nouveau hook pour détecter les deep links d'invitation

6. **navigation/AppNavigator.tsx**
   - Intégration du modal d'invitation depuis deep link
   - Synchronisation automatique après acceptation

7. **App.tsx**
   - Configuration du deep linking
   - Ajout du schéma `zerogaspy://`

8. **app.json**
   - Ajout de `"scheme": "zerogaspy"`

## Installation

Le package `expo-linking` a été ajouté aux dépendances pour gérer les deep links.

```bash
npm install expo-linking
```

## Notes importantes

- Les codes d'invitation sont uniques et peuvent être utilisés par n'importe qui
- Un utilisateur ne peut pas rejoindre deux fois la même liste
- Les permissions sont configurées lors de la création du code (view, edit, admin)
- Les listes locales (non synchronisées) reçoivent un UUID lors du partage
