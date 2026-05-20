# Migration vers Design System v2 — Design Doc

**Date** : 2026-05-20
**Source DS** : `C:\Users\Quentin\Downloads\ZeroGaspy Design System.zip` (extrait temporaire dans `.design-system-v2-tmp/`)
**Status** : Spec validé, prêt pour writing-plans

---

## Contexte

Le designer a livré un Design System v2 complet (tokens + 12 composants + 9 écrans v2 + docs). Il vit dans `.design-system-v2-tmp/` à la racine du projet en attendant intégration.

L'app actuelle (`main` branch, v2.1.0 build 14) a été migrée en Feb 2026 vers StyleSheet + `utils/designSystem.ts` (cf MEMORY.md). Dark mode supprimé entièrement. Le DS v2 réintroduit l'API tokens sémantiques (`colors.fg.primary`, `colors.accent.default`) et un toggle light/dark.

**Objectif** : intégrer le DS v2 sans casser la prod, écran par écran, en privilégiant les écrans à impact business (paywall, onboarding) qui sont identifiés comme killers métriques.

---

## Décisions stratégiques (validées avec utilisateur)

| # | Question | Décision |
|---|---|---|
| Q1 | Dark mode | **B** — force `light` dans `ThemeContext`, `darkColors` reste exporté mais dormant |
| Q2 | Migration mode | **A** — progressive, `ThemeContext.legacy` cohabite, `utils/designSystem.ts` intact |
| Q3 | Icônes | **A** — SF Symbols (`expo-symbols`) dans le neuf, Ionicons reste dans le legacy |
| Q4 | Ordre | **B** — business d'abord (Paywall + Onboarding), puis golden path, puis le reste |

---

## Section 1 — Architecture & file layout

```
tokens/                        ← NOUVEAU (copié depuis DS v2)
  colors.ts                    ← exports Ink, Sap, Signal, lightColors, darkColors
  typography.ts
  spacing.ts
  shadows.ts
  radius.ts
  index.ts

contexts/
  ThemeContext.tsx             ← REMPLACÉ par DS v2 + patch : force scheme='light'
  ThemeContext.legacy.tsx      ← l'ancien renommé (si existe)

utils/
  designSystem.ts              ← RESTE en place, intact pendant la migration

components/
  ds/                          ← NOUVEAU (12 composants)
    Button.tsx, Input.tsx, Badge.tsx, ProductCard.tsx,
    SwipeableProductCard.tsx, BottomSheet.tsx, Modal.tsx, Toast.tsx,
    TabBar.tsx, PaywallSheet.tsx, DeferredAuthSheet.tsx, OnboardingFlow.tsx,
    index.ts
  PressableScale.tsx           ← inchangé (legacy)
  icons/                       ← inchangé (legacy)

screens/                       ← legacy, inchangé tant que pas migré
screens/v2/                    ← NOUVEAU (9 écrans)
  HomeScreen.tsx, InventoryListScreen.tsx, AddFoodScreen.tsx,
  ProductDetailScreen.tsx, SettingsScreen.tsx, BarcodeScannerScreen.tsx,
  StatsScreen.tsx, RecipesScreen.tsx, MealPlannerScreen.tsx,
  index.ts
```

### Règle de coexistence stricte

- `screens/v2/` + `components/ds/` consomment **uniquement** `tokens/` + nouveau `useTheme()`
- Tout le reste consomme **uniquement** `utils/designSystem.ts` (ancien)
- **Pas de cross-import** entre les deux mondes. Besoin d'un composant legacy dans v2 ? On le réécrit dans `components/ds/`.
- Quand un écran legacy est remplacé, son fichier est supprimé.
- À la fin de toutes les phases : `utils/designSystem.ts` + `ThemeContext.legacy.tsx` supprimés.

### Patch initial du nouveau `ThemeContext.tsx`

```ts
// Force light mode permanently (decision Q1-B)
const [scheme] = useState<ColorScheme>('light');
// Pas de useColorScheme système, pas de toggle Settings
```

### App.tsx wrapping requis

```
GestureHandlerRootView
  └─ ThemeProvider (nouveau)
     └─ AuthProvider (existant)
        └─ SubscriptionProvider (existant)
           └─ GamificationProvider (existant)
              └─ ToastProvider bottomOffset={49}
                 └─ NavigationContainer (dans RootNavigator)
```

### Dep à installer

```bash
npx expo install expo-symbols
```

(`expo-blur`, `expo-haptics`, `expo-camera`, `react-native-gesture-handler` déjà présents.)

---

## Section 2 — Phases de migration

### Phase 0 — Infrastructure DS (1 session, 30-60 min)

1. `npx expo install expo-symbols`
2. Copier `tokens/` depuis `.design-system-v2-tmp/` vers racine
3. Renommer `contexts/ThemeContext.tsx` actuel en `ThemeContext.legacy.tsx`
   - **Consumers actuels confirmés** (à mettre à jour vers le legacy) : `App.tsx`, `screens/InventoryListScreen.tsx`, `screens/RecipesScreen.tsx`, `components/GlassTabBar.tsx` (4 fichiers seulement — impact très limité)
4. Copier le nouveau `ThemeContext.tsx` + patcher `scheme = 'light'` figé
5. Copier `components/ds/` (12 composants)
6. Wrapper `App.tsx` avec `GestureHandlerRootView` + `ThemeProvider` + `ToastProvider`
7. Build & smoke test : **aucun écran n'a changé**, golden path actuel marche identiquement

**Gate Phase 0** : `npm run ios` démarre, Home → Inventory → AddFood → Scanner identique à avant.

---

### Phase 1 — Business killers (1-2 sessions)

**1a. PaywallSheet** (remplace `components/PaywallModal.tsx`)
- Grep tous les triggers actuels du paywall
- Remplacer chaque `<PaywallModal>` par `<PaywallSheet>` du DS
- Câbler `savedThisMonthEUR` depuis `gamificationService`
- Tester chaque trigger : limite scans, share liste, meal planner J+3, recipes IA

**1b. Onboarding refondu**
- Wirer `<OnboardingFlow>` du DS comme nouveau onboarding (5 steps, 0 signup)
- Retirer `RegisterScreen` du flux onboarding (reste accessible depuis Settings)
- Câbler `<DeferredAuthSheet>` sur premières actions cloud-dependent (share, sync)
- DeferredAuthSheet doit être **non-bloquant** ("garder en local" = action OK)
- Garder `ActiveOnboardingScreen` legacy temporairement pour fallback

**Gate Phase 1** :
- Paywall : chaque trigger fonctionne, dismiss + purchase via RevenueCat OK
- Onboarding : new install simulator → 5 steps → arrive sur Home sans compte
- PostHog events `paywall_shown` et `onboarding_completed` toujours captés

---

### Phase 2 — Golden path (2-3 sessions)

| Ordre | Écran legacy | Remplacement | Routes |
|---|---|---|---|
| 1 | `HomeScreen.tsx` | `screens/v2/HomeScreen.tsx` | `Tabs/Frigo` |
| 2 | `InventoryListScreen.tsx` ou `InventoryScreen.tsx` | `screens/v2/InventoryListScreen.tsx` | `InventoryList` (param `listId`) |
| 3 | nouveau | `screens/v2/ProductDetailScreen.tsx` | `ProductDetail` (à ajouter au stack) |
| 4 | `AddFoodScreen.tsx` | `screens/v2/AddFoodScreen.tsx` | `AddFood` (presentation modal) |
| 5 | nouveau | `screens/v2/BarcodeScannerScreen.tsx` | `BarcodeScanner` (fullScreenModal) + TabBar custom FAB central |

**Procédure par écran** : changer import dans `AppNavigator.tsx` → tester simulator → supprimer l'ancien fichier → commit.

**Extension requise de `utils/localStorage.ts`** :
```ts
markItemConsumed(listId: string, itemId: string): Promise<void>
markItemThrown(listId: string, itemId: string): Promise<void>
restoreItem(listId: string, itemId: string): Promise<void>
```

**Gate Phase 2** : Smoke tests INTEGRATION.md §10 passent (urgent strip, swipe consommé/jeté, toast undo, FAB scanner).

---

### Phase 3 — Le reste (2 sessions)

| Écran legacy | Remplacement |
|---|---|
| `AccountScreen.tsx` | `screens/v2/SettingsScreen.tsx` |
| `StatsScreen.tsx` | `screens/v2/StatsScreen.tsx` |
| `RecipesScreen.tsx` | `screens/v2/RecipesScreen.tsx` |
| `MealPlannerScreen.tsx` | `screens/v2/MealPlannerScreen.tsx` |

### Cleanup final Phase 3

- Grep usages restants de `utils/designSystem.ts` → supprimer s'il n'y en a plus
- Supprimer `ThemeContext.legacy.tsx`
- Grep usages de `components/icons/` → supprimer si plus consommé
- Grep usages de `components/PressableScale.tsx` → supprimer si plus consommé
- Update `MEMORY.md` : "Migrated to DS v2, designSystem.ts removed"

**Estimation totale** : 5-8 sessions. Chaque phase est indépendamment shippable.

---

## Section 3 — Validation par phase & routes navigation

### Routes attendues par les écrans v2 (`navigation/AppNavigator.tsx`)

| Route | Composant | Presentation | Notes |
|---|---|---|---|
| `Tabs` | Tab.Navigator avec `<TabBar>` custom | default | 5 tabs : Frigo, Listes, Scanner (FAB), Stats, Profil |
| `InventoryList` | `screens/v2/InventoryListScreen` | card | params: `listId`, `listTitle` |
| `ProductDetail` | `screens/v2/ProductDetailScreen` | card | params: `itemId`, `listId` — **nouvelle route** |
| `AddFood` | `screens/v2/AddFoodScreen` | `modal` | params: `listId?`, presets |
| `BarcodeScanner` | `screens/v2/BarcodeScannerScreen` | `fullScreenModal` | au stack racine, hors Tabs |
| `ExpiringSoon`, `ThrownFoods`, `CreateList`, `EditFood`, `Language`, `Privacy`, `Feedback`, `Export` | legacy | inchangé | restent en place |

### Tab Scanner = FAB central (trick navigation)

```tsx
<Tab.Screen
  name="Scanner"
  component={EmptyScannerScreen}  // returns null
  listeners={({ navigation }) => ({
    tabPress: (e) => {
      e.preventDefault();
      navigation.getParent()?.navigate('BarcodeScanner');
    },
  })}
/>
```

### Smoke tests par phase

**Phase 0** (infrastructure)
- [ ] `npm run ios` build sans erreur
- [ ] Pas de warning console au démarrage
- [ ] Home actuel s'ouvre, golden path identique à avant
- [ ] Aucun écran n'a changé visuellement
- [ ] Test Android emulator (validation `expo-symbols` Android)

**Phase 1a** (PaywallSheet)
- [ ] Trigger paywall depuis "Recipes IA" → bottom sheet (pas modal fullscreen)
- [ ] Trigger paywall depuis "Share liste" → bottom sheet
- [ ] Trigger paywall depuis "Meal planner J+3" → bottom sheet
- [ ] Trigger paywall depuis "Limite scans" → bottom sheet
- [ ] Proof point chiffré (`savedThisMonthEUR`) affiché
- [ ] Swipe down ferme le sheet (dismiss)
- [ ] Tap "S'abonner" → flow RevenueCat → entitlement actif (sandbox test)
- [ ] PostHog event `paywall_shown` capté avec source

**Phase 1b** (Onboarding)
- [ ] New install simulator → OnboardingFlow (5 steps)
- [ ] Aucun écran signup dans le flow
- [ ] Fin onboarding → Home, user non-authentifié, fonctionnel
- [ ] AsyncStorage `onboarding_completed = true`
- [ ] **Upgrade path** : user existant (onboarding_completed = true) ne revoit pas onboarding
- [ ] Tap "Partager liste" → DeferredAuthSheet
- [ ] Tap "Garder en local" sur DeferredAuthSheet → action poursuit (non-bloquant)
- [ ] Tap "Créer un compte" → RegisterScreen (toujours accessible hors flow)

**Phase 2** (golden path) — INTEGRATION.md §10
- [ ] Frigo : urgent strip si items J-1
- [ ] TabBar : 5 tabs, FAB Scanner central, hairline + vibrancy
- [ ] FAB Scanner → camera fullscreen, viseur + laser
- [ ] Tap produit urgent → ProductDetail, 3 boutons (Consommé/Modifier/Jeter)
- [ ] Swipe droite → toast "X consommé · Annuler", item disparaît
- [ ] Tap "Annuler" → item revient (`restoreItem` OK)
- [ ] Swipe gauche → AlertModal "Jeter ?", confirm → toast danger + undo
- [ ] AddFood : saisie manuelle + presets → retour InventoryList avec item
- [ ] Supabase sync : items créés/marqués remontent cloud (via `syncService` + `getCloudListId()`)

**Phase 3** (reste)
- [ ] Settings : toggles, langue, logout
- [ ] Stats : KPI, trends, categories, savings cohérents avec gamificationService
- [ ] Recipes : suggestions IA, paywall gate
- [ ] MealPlanner : 7×3 slots, paywall J+3 free

---

## Section 4 — Risques, mitigations, rollback

### Risques techniques identifiés

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Cross-import accidentel legacy↔v2 (écran v2 importe `COLORS` de `designSystem.ts`) | Moyenne | UI cassée + dette | Grep auto fin de phase : `grep -r "designSystem" screens/v2/ components/ds/` doit être vide |
| R2 | `expo-symbols` rend mal sur Android | Faible (statique) | Visuel Android dégradé | Test Phase 0 Android emulator. Si KO : wrapper Icon avec fallback Ionicons Android |
| R3 | `GestureHandlerRootView` mal placé → Swipeable silently broken | Faible | Phase 2 swipe HS | Wrapper le plus externe dans `App.tsx`. Smoke test swipe Phase 2 |
| R4 | iOS deployment target < 17 → SF Symbols récents manquent (`refrigerator.fill`) | Moyenne | Icônes manquantes vieux iPhones | Vérifier `app.config.ts` → `ios.deploymentTarget`. Bump à 17 ou remplacer icônes |
| R5 | Onboarding régression : users existants relogués dans nouveau onboarding | Moyenne | Catastrophe UX prod | Le flag `onboarding_completed` doit être lu par nouveau flow. Tester upgrade path en simulator |
| R6 | `markItemConsumed/Thrown/restoreItem` n'existent pas dans `utils/localStorage.ts` | Inconnue | HomeScreen v2 crashe | Phase 0 : grep + ajouter wrappers de `updateItem` |
| R7 | Supabase sync : nouveaux écrans ignorent `getCloudListId()` → comparaisons local/UUID cassées | Moyenne | Sync silently broken | Code review obligatoire avant supprimer ancien screen : grep `listId ===` dans v2 |
| R8 | RevenueCat purchase flow casse avec `PaywallSheet` (callbacks différents) | Moyenne | Phase 1a : revenue à zéro | Tester chaque produit sandbox avant supprimer `PaywallModal.tsx`. Garder ancien stand-by 1 release |
| R9 | i18n manquant dans écrans v2 (strings en dur français) | Élevée | Pas de bascule langue | Phase 0 : audit strings v2, créer clés i18n, remplacer avant migration |
| R10 | Types `List`/`FoodItem` v2 supposent `image`/`addedAt`/`quantity` optionnels | Faible | TS errors | Vérifier shape `types/` avant Phase 2. Aligner si besoin |

### Stratégie de rollback

**Granularité** : 1 commit par phase. Chaque phase indépendante.

- Phase 0 plante → `git revert <phase-0-commit>` → retour à main, aucun écran touché
- Phase 1 plante → revert → infra Phase 0 reste, legacy PaywallModal/Onboarding réactivés
- Phase 2 plante au milieu d'un écran → revert ce commit, l'ancien écran reste actif (anciens fichiers supprimés seulement quand tous v2 OK)

**Convention commits** :
- `feat(ds): phase 0 — install tokens + ThemeContext + ds components`
- `feat(ds): phase 1a — replace PaywallModal with PaywallSheet`
- `feat(ds): phase 1b — new OnboardingFlow + DeferredAuthSheet`
- `feat(ds): phase 2 — migrate HomeScreen to v2`
- (un commit par écran ensuite)

**Branche** : `feat/design-system-v2`. Merge dans `main` par phase. EAS build dev/preview à chaque fin de phase pour valider sur device.

### Définition of Done (projet entier)

- [ ] `utils/designSystem.ts` supprimé
- [ ] `ThemeContext.legacy.tsx` supprimé
- [ ] `components/PressableScale.tsx`, `components/icons/` supprimés si inutilisés
- [ ] `components/PaywallModal.tsx` supprimé
- [ ] Grep `'@/utils/designSystem'` vide
- [ ] Grep `Ionicons` dans `screens/` et `components/` non-legacy vide
- [ ] `screens/v2/` renommé en `screens/` (anciens supprimés, v2 déplacé à la place)
- [ ] `MEMORY.md` mis à jour : "DS v2 migration complete"
- [ ] Smoke tests INTEGRATION.md §10 passent sur iOS device réel (pas que simulator)

---

## Annexe — Fichiers DS livrés (référence)

Le zip a été extrait dans `.design-system-v2-tmp/` à la racine du projet (à supprimer après Phase 0).

- `README.md` — Guidelines complètes (voix, palette, typo, iconographie)
- `INTEGRATION.md` — Guide d'intégration officiel du designer
- `SKILL.md` — Skill metadata Claude Code
- `tokens/` — 6 fichiers TS
- `components/ds/` — 12 composants TSX
- `screens/v2/` — 9 écrans assemblés
- `assets/` — logo, icon, splash (à comparer avec assets actuels)
- `Wireframe.html`, `Tokens.html`, `Components.html`, `Screens.html` — previews visuels

### Caveats du designer (cf README.md § Caveats)

- iOS-first, Android pas testé pixel-perfect
- `BottomSheet.tsx` single-snap (pas multi-snap medium/large)
- `@gorhom/bottom-sheet` recommandé si besoin multi-snap futur
- Ancien `ThemeContext` API change complètement

