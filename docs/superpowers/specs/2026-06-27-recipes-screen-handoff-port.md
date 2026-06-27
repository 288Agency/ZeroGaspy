# RecipesScreen — Port handoff iso-features

**Date:** 2026-06-27
**Scope:** Restyle `screens/RecipesScreen.tsx` (1405 L) aux tokens DS v2 / palette handoff sage-forest-cream, en préservant 100% des features fonctionnelles. Aucune nouvelle feature produit.

## Motivation

- Dernier gros écran legacy encore actif dans la tab bar (1405 L).
- Consommateur de `ThemeContext.legacy.tsx` — le porter au DS v2 retire 1 des 3 consommateurs restants (RecipesScreen, GlassTabBar, App.tsx).
- Cohérence visuelle avec CookTonight v2 et RecipeDetail v2 déjà portés.

## Features préservées (14)

1. Header (custom, sans back — top-level tab)
2. Stats banner : "N ingrédients disponibles → M recettes possibles"
3. Filtres horizontaux : Toutes / Mes / Petit-déj / Plats / Entrées / Desserts / Snacks / Boissons (8)
4. Tri Anti-gaspi (urgencyScore) / Best match (matchPercentage)
5. Génération IA (Premium) depuis ingrédients qui expirent ≤7j
6. Liste RecipeCard : badges catégorie/difficulté/anti-gaspi/user, % match, ingrédients matching/missing/expiring
7. Long-press recette user → delete
8. Empty state : ChefIllustration + CTA
9. PremiumRecipeTeaser : aperçu limité aux non-Premium (2 recettes catalogue + recettes user)
10. Tap recette → **navigation vers `RecipeDetail` route v2** (remplace le modal interne)
11. FAB + → `AddRecipeModal`
12. PaywallSheet (trigger `recipes`)
13. RecipeOnboardingModal (premier passage)
14. Pull-to-refresh + deep-link ingredient highlight (route param boost)

## Changements vs version legacy

| # | Élément | Avant | Après |
|---|---|---|---|
| A | `RecipeDetailModal` interne (114 L) | Modal local | Supprimé — `navigation.navigate('RecipeDetail', { recipeId })` |
| B | ThemeContext | `ThemeContext.legacy` | `ThemeContext` (v2) — `useTheme().colors.bg.canvas` etc. |
| C | Bouton "Recette IA" | Gros bouton gradient pleine largeur sous tri | Icon pill ✨ dans header à côté du `+` |
| D | Header | `<Header title=... />` legacy | Topbar custom v2 (eyebrow + titre + actions sparkle/plus) |
| E | Stats banner | Card massive avec icône à gauche | Pill inline sous le titre |
| F | Sort toggle | 2 boutons libres | Segment control 2 segments (1 bloc) |
| G | RecipeCard | Layout horizontal avec emoji 70×70 à gauche | Layout cohérent CookTonight (cover gradient sage→forest + meta row clock/flame/dots) |

## Architecture / dépendances

**Importé :**
- `useTheme` de `@/contexts/ThemeContext`
- `Sage`, `Forest`, `Cream` de `@/tokens`
- `Badge`, `PaywallSheet` de `@/components/ds`
- `LinearGradient` (expo-linear-gradient), `SymbolView` (expo-symbols)
- `useSafeAreaInsets`

**Réutilisé tel quel :**
- `loadLists`, `findMatchingRecipesWithUser`, `RecipeMatch`, `Recipe`, `deleteUserRecipe`, `generateAIRecipe`
- `useGamification`, `useAuth`, `useSubscription`, `usePaywallSheetProps`
- `AddRecipeModal`, `RecipeOnboardingModal`, `RECIPE_ONBOARDING_KEY`
- `analyticsTrackRecipeViewed`

## Risques

- **Navigation modal → route** : si quelque chose passait des props au modal (analytics, gamification), s'assurer que RecipeDetail route les reçoit aussi. `trackRecipeViewed()` + `analyticsTrackRecipeViewed(id)` doivent être appelés avant le navigate.
- **SymbolView Android** : SF Symbols sont iOS-only — fallback Ionicons sur Android (pattern déjà utilisé par CookTonight v2).
- **`isUserRecipe` long-press delete** : doit rester actif sur les cards (pas perdu).
- **RecipeOnboardingModal** : premier passage, à conserver.

## Critères d'acceptation

- [x] `tsc --noEmit` vert
- [x] 14 features fonctionnelles préservées
- [x] Aucune référence à `ThemeContext.legacy` dans le fichier
- [x] `RecipeDetailModal` interne supprimé
- [x] Tap recette → `navigation.navigate('RecipeDetail', { recipeId })`
- [x] Génération IA accessible (header sparkle pill)
- [x] PremiumRecipeTeaser, PaywallSheet, AddRecipeModal, RecipeOnboardingModal toujours wired
- [x] Empty state, loading state, deep-link highlight, pull-to-refresh préservés

## Hors scope

- Restyle de RecipeDetailScreen (déjà portée commit `ebd7485`)
- Restyle de AddRecipeModal et RecipeOnboardingModal (composants, à porter plus tard si besoin)
- Recipes browse advanced search (n'existe pas aujourd'hui, pas la peine d'introduire)
