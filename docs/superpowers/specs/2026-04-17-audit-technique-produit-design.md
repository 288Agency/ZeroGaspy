# ZeroGaspy — Audit Technique & Produit
**Date :** 2026-04-17
**Statut :** Validé
**Périmètre :** Delta depuis les audits mars + avril 2026 + regard frais sur le code actuel

---

## Executive Summary

Depuis les deux audits précédents (mars 19 et avril 11), un volume significatif de features a été livré : widget iOS, recettes IA, calculateur d'économies, skeleton loading, notifications deep-linkées, home redesign, onboarding avec ancrage économies, et suppression des bannières AdMob. Le socle technique reste sain. Cependant, plusieurs bugs critiques introduits avec les nouvelles features requièrent une attention immédiate, et deux failles de sécurité — dont une haute — doivent être corrigées avant toute croissance de l'audience.

**Synthèse santé :**
- Code quality : **B+** (solid foundation, some god components)
- Sécurité : **C+** (2 issues importantes dont 1 haute priorité)
- Produit : **B** (bon progrès, gaps de rétention persistants)
- Features récentes : **B-** (livrées mais avec bugs dans les nouvelles additions)

---

## Section 1 — Ce qui a été fait (vs roadmaps précédentes)

### ✅ Livré depuis avril 11

| Feature | Statut |
|---|---|
| Suppression bannières AdMob | ✅ Fait (`AdContext`, `ConsentContext`, `ads.ts` supprimés) |
| Calculateur économies mensuelles (Home) | ✅ Fait (`MonthlySavingsCard`, `monthlySavingsService`) |
| Notification quotidienne "Ce soir, mange ça" | ✅ Fait (deep-link recette inclus) |
| Notification J+1 personnalisée | ✅ Fait (aliments expirants + deep-link) |
| Notification récap dimanche 20h | ✅ Fait (stats semaine) |
| Ancrage économies dans l'onboarding | ✅ Fait (`ActiveOnboardingScreen`) |
| Passer à 2 scans ticket gratuits/mois | ✅ Fait |
| Widget iOS (WidgetKit + SwiftUI) | ✅ Livré (avec réserves — voir Section 5) |
| Recettes IA (Edge Function + cache) | ✅ Livré (avec réserves — voir Section 5) |
| Skeleton loading | ✅ Fait (`Skeleton.tsx`, utilisé sur ExpiringSoon et ThrownFoods) |
| PostHog funnels onboarding + paywall + économies | ✅ Fait |
| Home redesign (carte économies mensuelles) | ✅ Fait |

### ❌ Non livré depuis les roadmaps précédentes

| Feature | Statut | Priorité |
|---|---|---|
| Shopping list depuis une recette | ❌ Pas fait | Haute |
| Migration recettes vers Supabase (dynamic) | ❌ Partiel (DB créée, double source of truth persistante) | Haute |
| 14-day premium trial | ❌ Pas fait | Moyenne |
| Rapport mensuel PDF partageable | ❌ Pas fait | Moyenne |
| Sync cloud gamification (XP/badges/streaks) | ❌ Pas fait | **Critique** |
| Referral visible depuis la Home | ❌ Pas fait | Moyenne |
| Streak freeze mechanic | ❌ Pas fait | Basse |
| React Query pour caching Supabase | ❌ Pas fait | Basse |
| Tests gamificationService + dateUtils | ❌ Pas fait | Moyenne |
| Fix production console.log (HomeScreen) | ❓ À vérifier | Haute |

---

## Section 2 — Bugs critiques

### 🔴 BUG-01 — `monthlySavingsService`: les items jetés retournent toujours 0 €

**Fichier :** `services/monthlySavingsService.ts` ligne 66

**Description :** `getMonthlyWasted()` filtre avec `isThisMonth(item.consumedAt)`. Le champ `consumedAt` n'est jamais renseigné pour les items jetés — seul `thrownAt` ou la date de dernière modification serait correct. Résultat : la carte `MonthlySavingsCard` affiche toujours "0 € gaspillés" même si l'utilisateur a jeté des aliments.

**Fix :** Utiliser `item.thrownAt` ou `item.updatedAt` pour les items avec `status === 'thrown'`.

---

### 🔴 BUG-02 — `GamificationContext`: stale closure sur `isPremium`

**Fichier :** `contexts/GamificationContext.tsx` ligne 105

**Description :** Le `useEffect` qui appelle `init()` a `[user, isLocalMode]` comme dépendances. `isPremium` est utilisé dans `onDailyVisit` (streak freeze logic) mais n'est pas dans le tableau de dépendances. Si l'utilisateur achète premium après le premier mount, la logique de streak freeze s'exécute avec `isPremium = false` jusqu'au prochain remount du contexte.

**Fix :** Ajouter `isPremium` aux dépendances du `useEffect`.

---

### 🟠 BUG-03 — `referralService`: code pending effacé avant confirmation du succès

**Fichier :** `services/referralService.ts` ligne 137

**Description :** `clearPendingReferralCode()` est appelé **avant** la vérification du résultat RPC Supabase. Si le RPC échoue transitoirement (réseau), le code est perdu et le referral ne peut plus jamais être complété.

**Fix :** Déplacer `clearPendingReferralCode()` dans le bloc de succès uniquement.

---

### 🟠 BUG-04 — `recipeSyncService`: UPDATE après DELETE dans la queue produit un état incohérent

**Fichier :** `services/supabase/recipeSyncService.ts` lignes 112–127

**Description :** La fusion UPDATE dans la queue gère le cas INSERT existant mais pas DELETE. Si une recette est dans la queue avec `DELETE`, puis que `addToRecipeSyncQueue('UPDATE', ...)` est appelé, la queue contiendra un DELETE suivi d'un UPDATE — le DELETE sera exécuté et l'UPDATE échouera silencieusement (row inexistante en cloud).

**Fix :** Vérifier l'existence d'un DELETE dans la queue pour la même recette avant d'ajouter un UPDATE ; si trouvé, transformer le DELETE en UPDATE.

---

### 🟡 BUG-05 — `PaywallModal`: animations qui tournent en arrière-plan

**Fichier :** `components/PaywallModal.tsx` lignes 80+

**Description :** Les animations `AnimatedLeaf` et `FloatingCircle` démarrent dans `useEffect([], [])` et tournent en boucle infinie. Quand le modal est fermé (`visible = false`) mais reste monté, les animations continuent à consommer du CPU/GPU inutilement.

**Fix :** Passer `visible` en dépendance et stopper/démarrer les animations en fonction de la visibilité.

---

### 🟡 BUG-06 — `challengeService`: semaines ISO 53 non gérées

**Fichier :** `services/challengeService.ts` lignes 365–374

**Description :** `getPreviousWeekKey` hardcode la semaine 52 comme dernière semaine de l'année. Certaines années ont une semaine ISO 53 (ex: 2020). Si le bug se produit, la continuité des challenges est corrompue en fin d'année.

**Fix :** Utiliser une librairie de dates (ex: `date-fns/getISOWeeksInYear`) pour calculer la vraie dernière semaine ISO de l'année.

---

## Section 3 — Sécurité

### 🔴 SEC-01 — `grant-referral-premium` Edge Function non authentifiée [HAUTE]

**Fichier :** `supabase/functions/grant-referral-premium/index.ts`

**Description :** La fonction accepte un `referrer_id` dans le body de la requête et accorde premium à cet utilisateur en utilisant le service role key (accès Supabase total). Il n'y a **aucune vérification d'authentification** du caller. N'importe qui connaissant l'URL de la fonction et un UUID utilisateur peut s'octroyer le premium gratuitement.

**Fix immédiat :** Vérifier le JWT Authorization header dans la fonction. Dériver le `referrer_id` depuis le JWT (`sub` claim) plutôt que le body. Ne jamais faire confiance à un `user_id` venant du client pour des opérations privilégiées.

```typescript
// Pattern correct
const authHeader = req.headers.get('Authorization')
const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
const referrerId = user.id  // depuis le JWT, pas du body
```

---

### 🟠 SEC-02 — RevenueCat Android non configuré en production

**Fichier :** `constants/subscription.ts` ligne 9

**Description :** `REVENUECAT_API_KEY_ANDROID = 'YOUR_ANDROID_API_KEY'`. Le `SubscriptionProvider` détecte cela (early-return) — les utilisateurs Android ne peuvent **pas acheter de premium**. Si l'app est distribuée sur Android, c'est une perte de revenu directe.

**Fix :** Configurer la clé API RevenueCat Android.

---

### 🟡 SEC-03 — `listSharingService`: limite "1 liste partagée" non enforced côté serveur

**Fichier :** `services/listSharingService.ts` ligne 246

**Description :** La limite freemium (1 liste partagée max) est vérifiée client-side uniquement. La RPC `invite_to_list` est `SECURITY DEFINER` et ne vérifie pas le quota. Un utilisateur avec accès API direct peut créer des listes partagées illimitées.

**Fix :** Ajouter la vérification du quota dans la RPC `invite_to_list` côté Supabase.

---

## Section 4 — Dette technique

### TD-01 — `InventoryListScreen.tsx` : god component confirmé [HAUTE]

20+ imports de services et composants différents. Responsabilités : local storage, sync Supabase, receipt scanner, bonus scans, list sharing (vérifications permissions, count membres, chargement listes partagées), gamification, analytics, deux modals paywall. Le fichier est le point de défaillance unique de la feature la plus critique de l'app. Tout bug dans l'un de ses systèmes peut bloquer l'accès à l'inventaire.

**Action recommandée :** Extraire des hooks custom (`useListSync`, `useListSharing`, `useScanCredits`) pour isoler les responsabilités. Le composant ne devrait orchestrer que le rendu.

---

### TD-02 — Double source of truth recettes

`RECIPES_DATABASE` existe à la fois dans `recipeService.ts` (tableau JS local) et dans `supabase/migrations/20260320_recipes.sql` (100 lignes seed). Mettre à jour une recette nécessite de modifier les deux. La table Supabase existe mais le client continue d'utiliser la copie locale pour le matching offline.

**Action recommandée :** Le local array peut rester comme fallback offline, mais tout update de recette doit passer par Supabase uniquement, avec une stratégie de cache local.

---

### TD-03 — Gamification 100% locale : perte totale à la réinstallation [CRITIQUE produit]

XP, badges, streaks, historique des challenges — tout est dans AsyncStorage. Une réinstallation ou un changement de device réinitialise entièrement la progression. Pour une app dont la rétention repose sur la gamification, c'est un problème majeur de durabilité.

**Action recommandée :** Sync cloud des données gamification vers Supabase (même en read-only cloud, write local-first). Priorité haute car la feature est déjà prominente dans l'app.

---

### TD-04 — Badges non localisés

**Fichier :** `services/gamificationService.ts` lignes 79+

Les noms et descriptions de badges sont des chaînes françaises hardcodées dans le service (`'Eco-Debutant'`, `'Gardien du Frigo'`). `challengeService.ts` utilise correctement des clés i18n (`nameKey`, `descriptionKey`). Incohérence qui rend la localisation des badges impossible sans refactoring.

**Action :** Migrer les badges vers des clés i18n, comme les challenges.

---

### TD-05 — `migrateLocalRecipesToCloud` : N requêtes Supabase au lieu d'un batch

**Fichier :** `services/supabase/recipeSyncService.ts` ligne 22

Insert one-by-one dans une boucle. `syncService.ts` fait un insert batch pour les food items. Inconsistance qui ralentit la migration initiale pour les utilisateurs avec beaucoup de recettes.

**Action :** Utiliser `supabase.from('user_recipes').insert(allRecipes)`.

---

### TD-06 — `react-native-default-preference` et `expo-av` : dépendances mortes possibles

**Fichier :** `package.json`

`react-native-default-preference` était utilisé pour le widget Android via SharedPreferences — remplacé selon les commits. `expo-av` (audio/vidéo) : aucun usage trouvé dans le code. Ces packages gonflent le bundle inutilement.

**Action :** Vérifier et supprimer si effectivement inutilisés.

---

## Section 5 — Nouvelles features : état des lieux

### Widget iOS

**Status :** Livré, fonctionnel en théorie.

**Réserves :**
- `plugins/withIOSWidget.js` ligne 45 : les fichiers Swift ne sont copiés que s'ils n'existent pas déjà. Tout changement dans les fichiers Swift nécessite une suppression manuelle du dossier `ios/ZeroGaspyWidget/` avant `expo prebuild`.
- L'attribut `RemoveHeadersOnCopy` (ligne 147) est incorrect pour une app extension — devrait être absent ou `CodeSignOnCopy`. Risque de problème à la soumission App Store.
- Aucun équivalent Android widget avec données réelles.

---

### Recettes IA

**Status :** Livré, fonctionnel.

**Réserves :**
- Pas de timeout sur l'appel `supabase.functions.invoke`. Si OpenAI est lent, l'UI se bloque indéfiniment.
- `i18n.language` peut retourner `"en-US"` au lieu de `"en"` — l'Edge Function ne vérifie que `=== 'fr'`, donc `"en-US"` passe comme anglais. Mais `"de"`, `"es"`, etc. donneraient une réponse en anglais sans avertissement.
- L'ID `ai_${Date.now()}` est éphémère et non persisté. Documenté dans le code mais non évident.

---

### Calculateur d'économies mensuelles

**Status :** Partiellement fonctionnel.

**Problème majeur :** BUG-01 ci-dessus — les items jetés retournent 0 € systématiquement. La colonne "gaspillé" est toujours vide, ce qui réduit l'impact émotionnel de la carte.

---

### Skeleton Loading

**Status :** ✅ Propre et correct. Aucune réserve technique. Bonne amélioration UX.

---

### Notifications deep-linkées

**Status :** ✅ Fonctionnel. Le handler de notification dans `App.tsx` navigue correctement vers les screens pertinents (le bug no-op de l'audit mars est bien corrigé).

---

## Section 6 — Produit (regard frais)

### P1 — La gamification sans cloud est une bombe à retardement

L'app est positionnée sur la gamification comme différenciateur. Un utilisateur qui change de téléphone perd 100% de ses badges, XP, streaks. Quand cela arrive (et cela arrivera), la réaction est "l'app a tout perdu" — un avis 1 étoile probable et un churn immédiat. C'est le gap produit le plus urgent.

### P2 — Le pool de challenges est trop petit

18 challenges au total (5 easy, 6 medium, 7 hard). Avec une sélection déterministe par semaine, les mêmes challenges réapparaissent toutes les 6–7 semaines. Un utilisateur actif depuis 2 mois verra déjà des répétitions. Objectif : 30+ challenges pour éviter la répétition perçue avant 3 mois d'usage.

### P3 — Pas de liste de courses depuis une recette

Identifié dans l'audit mars, toujours absent. C'est le loop le plus puissant : `recette → ingrédients manquants → liste de courses → achat → inventaire → recette`. Sans ce lien, l'app reste un outil de tracking plutôt qu'un assistant cuisine.

### P4 — Android : utilisateurs qui ne peuvent pas payer

Si des utilisateurs Android sont présents, ils voient un paywall mais ne peuvent pas acheter (RevenueCat non configuré). C'est une expérience très dégradée.

### P5 — Badges en français uniquement

Les badges ont des noms français hardcodés. Pour une expansion internationale (BE, CH, CA), c'est un blocage.

### P6 — `signOut` ne nettoie pas l'inventaire local

Si deux utilisateurs différents se connectent sur le même device, le second voit temporairement l'inventaire du premier jusqu'à la fin de la sync. Problème de confidentialité dans un scénario partagé (famille, test).

---

## Section 7 — Roadmap priorisée

### 🔴 Critique (faire cette semaine)

| # | Item | Fichier | Effort |
|---|---|---|---|
| C1 | **SEC-01** : Authentifier `grant-referral-premium` Edge Function | `supabase/functions/grant-referral-premium/` | 1h |
| C2 | **BUG-01** : Corriger `getMonthlyWasted` (champ `consumedAt` → `thrownAt`) | `services/monthlySavingsService.ts` | 30min |
| C3 | **BUG-02** : Ajouter `isPremium` aux dépendances du `useEffect` gamification | `contexts/GamificationContext.tsx` | 15min |
| C4 | **BUG-03** : Déplacer `clearPendingReferralCode()` après vérification succès | `services/referralService.ts` | 15min |

### 🟠 Haute (faire ce sprint)

| # | Item | Fichier | Effort |
|---|---|---|---|
| H1 | **SEC-02** : Configurer RevenueCat Android | `constants/subscription.ts` | 2h |
| H2 | **TD-03** : Sync cloud gamification (XP + badges + streaks) | Nouveau `gamificationSyncService.ts` | 3-5j |
| H3 | **BUG-04** : Gérer UPDATE après DELETE dans recipeSyncQueue | `services/supabase/recipeSyncService.ts` | 1h |
| H4 | **Widget iOS** : Corriger l'attribut `CodeSignOnCopy` + idempotence fichiers Swift | `plugins/withIOSWidget.js` | 2h |
| H5 | Ajouter timeout sur `supabase.functions.invoke` AI recipe | `services/aiRecipeService.ts` | 30min |

### 🟡 Normale (prochain sprint)

| # | Item | Effort |
|---|---|---|
| N1 | **SEC-03** : Enforcer limite liste partagée côté Supabase RPC | 1h |
| N2 | **BUG-05** : Stopper animations PaywallModal quand `visible=false` | 30min |
| N3 | **TD-01** : Extraire hooks custom de `InventoryListScreen` | 2-3j |
| N4 | **TD-04** : Migrer badges vers clés i18n | 1j |
| N5 | **P3** : Liste de courses depuis une recette | 3-5j |
| N6 | **P2** : Enrichir pool de challenges (objectif 30+) | 1j |
| N7 | Batch insert dans `migrateLocalRecipesToCloud` | 30min |
| N8 | Nettoyer inventaire local au `signOut` | 1h |
| N9 | Supprimer dépendances mortes (`react-native-default-preference`, `expo-av`) | 1h |
| N10 | **BUG-06** : Semaines ISO 53 dans `challengeService` | 1h |

### ⬇️ Basse (backlog)

| # | Item |
|---|---|
| B1 | Tests `gamificationService.ts` et `dateUtils.ts` |
| B2 | React Query pour caching Supabase |
| B3 | Localisation badges (expansion internationale) |
| B4 | 14-day premium trial |
| B5 | Rapport mensuel PDF partageable |
| B6 | Streak freeze mechanic |

---

## Annexe — Résumé delta vs audits précédents

**Taux de completion roadmap avril 11 :**
- Phase 0 (instrumentation) : ✅ 100%
- Phase 1 (rétention) : ✅ ~80% (manque sync gamification)
- Phase 2 (monétisation) : 🔄 30% (widget iOS livré, Android en attente, AI recipes livrées)
- Phase 3 (scale) : ⏳ 0% (normal, pas encore la priorité)

**Nouveaux problèmes introduits avec les nouvelles features :** 6 bugs, 1 faille sécurité haute, 1 faille sécurité moyenne.

**Évaluation globale :** Bon rythme de développement, qualité technique maintenue. Le risque principal à ce stade n'est pas technique mais produit : la gamification sans persistance cloud est incompatible avec une vraie rétention long terme.

---

*Audit rédigé le 2026-04-17. Basé sur lecture directe du code source et delta vs specs du 2026-03-19 et 2026-04-11.*
