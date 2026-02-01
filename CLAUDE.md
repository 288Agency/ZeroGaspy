# ZeroGaspy - Instructions Claude Code

## Projet
Application React Native anti-gaspillage alimentaire avec Expo.

## Stack technique
- **Frontend:** React Native + Expo SDK 52
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **State:** React Context + AsyncStorage

## Supabase
- **Project ID:** `jiyhldfgztzknkccuidq`
- **Region:** eu-west-1

---

## NOTION - Synchronisation automatique

### QG ZeroGaspy (page principale)
- **URL:** https://www.notion.so/2fa467688300817bb931d522f2c1863a
- **Page ID:** `2fa46768-8300-817b-b931-d522f2c1863a`

### Bases de données Notion

| Base | ID | Usage |
|------|-----|-------|
| **Tâches** | `3c1c4626-505c-45ec-8d01-919eb7163507` | Gestion des tâches du projet |
| **Bugs** | `5dd6b6f7-80ca-444f-8b2a-ba868904efb4` | Signalement de bugs |
| **Versions** | `d8d437ae-7599-48b1-913e-61a54ebbfef8` | Historique des releases |
| **Utilisateurs** | `23fece21-2c30-4f69-9f9a-4e803b4b0482` | Sync auto depuis Supabase |
| **Documentation** | `e88a5b8f-29e2-46bd-a703-9a71fc6d535e` | Docs techniques |
| **Analytics** | `9de21e77-d576-471f-a2aa-c57dcc579faa` | KPIs et métriques |

---

## RÈGLES DE SYNCHRONISATION NOTION

> **OBLIGATOIRE:** À chaque fin de session ou après une modification significative, Claude DOIT mettre à jour Notion pour garder le suivi en temps réel.

### Quand synchroniser Notion ?

| Événement | Action Notion |
|-----------|---------------|
| Feature terminée | Marquer la tâche "Terminé" |
| Bug corrigé | Marquer le bug "Résolu" |
| Commit effectué | Vérifier si une tâche correspond → la mettre à jour |
| Nouveau bug découvert | Créer une entrée dans Bugs |
| Nouvelle version | Ajouter dans Historique des versions |
| Fin de session | Récap de ce qui a été fait + mise à jour Notion |

### Comment trouver la bonne tâche ?
1. Chercher dans Notion avec `mcp__plugin_Notion_notion__notion-search`
2. Query: le nom de la feature/bug
3. Mettre à jour avec l'ID trouvé

### Après chaque modification de code significative :

1. **Nouvelle feature développée** → Mettre à jour la tâche correspondante dans Notion (Statut: "Terminé")
   ```
   mcp__plugin_Notion_notion__notion-update-page
   page_id: [ID de la tâche]
   properties: {"Statut": "Terminé"}
   ```

2. **Bug corrigé** → Mettre à jour le bug dans Notion (Statut: "Résolu")
   ```
   mcp__plugin_Notion_notion__notion-update-page
   page_id: [ID du bug]
   properties: {"Statut": "Résolu"}
   ```

3. **Nouvelle version/release** → Ajouter une entrée dans Historique des versions
   ```
   mcp__plugin_Notion_notion__notion-create-pages
   data_source_id: d8d437ae-7599-48b1-913e-61a54ebbfef8
   properties: {"Version": "vX.X.X", "Type": "Feature|Fix", "Description": "...", "date:Date:start": "YYYY-MM-DD"}
   ```

4. **Nouveau bug découvert** → Créer une entrée dans Bugs & Issues
   ```
   mcp__plugin_Notion_notion__notion-create-pages
   data_source_id: 5dd6b6f7-80ca-444f-8b2a-ba868904efb4
   properties: {"Titre": "...", "Statut": "Nouveau", "Priorité": "🔴 Critique|🟠 Haute|🟡 Moyenne|🟢 Basse", "Plateforme": "iOS|Android|Les deux", "Version": "vX.X.X"}
   ```

5. **Documentation modifiée** → Mettre à jour la doc dans Notion
   ```
   mcp__plugin_Notion_notion__notion-update-page
   Mettre à jour "Dernière MAJ" et "Statut" si nécessaire
   ```

### Schémas des bases

#### Tâches
- `Tâche` (title)
- `Statut`: À faire | En cours | Terminé | Bloqué
- `Phase`: MVP | Features principales | Gamification | Monétisation | Technique
- `Priorité`: 🔥 Critique | ⚡ Haute | ➡️ Normale | ⬇️ Basse
- `Sprint` (checkbox)
- `Date limite` (date)

#### Bugs
- `Titre` (title)
- `Statut`: Nouveau | En cours | Résolu | Won't fix
- `Priorité`: 🔴 Critique | 🟠 Haute | 🟡 Moyenne | 🟢 Basse
- `Plateforme`: iOS | Android | Les deux
- `Version` (text)
- `Date signalé` (date)
- `Rapporté par` (text)

#### Versions
- `Version` (title)
- `Type`: Feature | Fix | Test | Docs
- `Description` (text)
- `Date` (date)

---

## Commandes utiles

```bash
# Build
npx expo start
eas build --platform ios --profile production
eas build --platform android --profile production

# Supabase
npx supabase functions deploy [function-name]
```

---

## Automatisations actives

| Trigger | Action |
|---------|--------|
| Nouvel utilisateur Supabase | → Auto sync vers Notion (Edge Function) |
| Modification code par Claude | → Mise à jour manuelle Notion (voir règles ci-dessus) |
