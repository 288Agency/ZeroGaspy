# Spec : PageHeader — dégradé vert sur tous les écrans

**Date :** 2026-03-22
**Statut :** Approuvé

---

## Objectif

Appliquer le design de la home (header dégradé vert foncé avec KPIs contextuels) à tous les écrans de l'application. Le contenu de chaque page (cartes, listes, etc.) ne change pas dans cette phase — seuls les headers sont concernés.

---

## Décisions de design

| Critère | Décision |
|---------|----------|
| Périmètre | Tous les écrans : onglets, imbriqués, formulaires, auth |
| Style header | Dégradé vert `#1A3020 → #2E5339 → #3C6E47` + KPIs contextuels en pills |
| Comportement | Header **fixe** — le contenu scroll en dessous (identique à la home) |
| Formulaires/auth | Header minimal : dégradé + titre + sous-titre, **sans pills** |

---

## Composant `PageHeader`

**Fichier :** `components/PageHeader.tsx`

### Props

```ts
interface PageHeaderProps {
  title: string
  subtitle?: string
  pills?: Array<{
    value: string | number
    label: string
    color?: string           // surcharge couleur de la valeur (défaut: #FFFFFF)
  }>
  backButton?: boolean       // défaut: false
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap
    onPress: () => void
    accessibilityLabel: string
  }
}
```

### Structure interne

Identique à `HeroSection` :
- `LinearGradient` colors `['#1A3020', '#2E5339', '#3C6E47']`, locations `[0, 0.55, 1]`, `start={{ x: 0.3, y: 0 }}`, `end={{ x: 1, y: 1 }}`
- `paddingTop: insets.top + 12`, `paddingHorizontal: 20`, `paddingBottom: 20`
- **Ligne du haut :** bouton retour (si `backButton`) + bloc titre/sous-titre + `rightAction` (sinon spacer)
- **Ligne des pills :** rendu uniquement si `pills` est fourni et non vide, même style que `HeroSection` (gap 8, flex 1, fond `rgba(255,255,255,0.09)`, border `rgba(255,255,255,0.11)`)

Le bouton retour utilise `navigation.goBack()` avec haptic `light`, même style que le feedback button de la home (`rgba(255,255,255,0.1)`, borderRadius 12).

---

## KPIs par écran

### Couleurs conditionnelles

La prop `color` d'une pill surcharge uniquement la couleur du texte de la valeur. Quand elle n'est pas fournie, la valeur s'affiche en blanc (`#FFFFFF`). Les conditions sont explicites dans le tableau ci-dessous — si aucune condition n'est mentionnée, la couleur est toujours appliquée.

### Onglets principaux (sans bouton retour)

| Écran | Pill 1 | Pill 2 |
|-------|--------|--------|
| **StatsScreen** | % aliments sauvés — toujours vert `#4ADE80` | Économies en € |
| **RecipesScreen** | Nb recettes suggérées | Nb ingrédients dispo |
| **ChallengesScreen** | Défis complétés `X/Y` — vert `#4ADE80` si `X === Y`, blanc sinon | XP gagnés cette semaine |
| **AccountScreen** | Niveau actuel `Lv.X` | XP total |

### Écrans de contenu imbriqués (avec bouton retour)

| Écran | Pill 1 | Pill 2 |
|-------|--------|--------|
| **ExpiringSoonScreen** | Nb items expirant ≤7j — toujours orange `#FB923C` | Nb items expirant demain |
| **ThrownFoodsScreen** | Total jetés | Valeur gaspillée estimée en € |
| **InventoryListScreen** | Total aliments dans la liste | Nb expirant bientôt — orange `#FB923C` si > 0, blanc sinon |
| **InventoryScreen** | Total aliments toutes listes | — (1 pill suffit) |
| **ListsScreen** | Nb listes | Nb listes partagées |

### Formulaires & auth (sans pills)

| Écran | Title | Subtitle |
|-------|-------|----------|
| **AddFoodScreen** | `"Ajouter"` | `"Nouvel aliment"` |
| **CreateListScreen** | `"Nouvelle liste"` | — |
| **LoginScreen** | `"ZeroGaspy"` | `"Connexion"` |
| **RegisterScreen** | `"ZeroGaspy"` | `"Créer un compte"` |
| **ForgotPasswordScreen** | `"Mot de passe"` | `"Réinitialisation"` |

---

## Intégration dans chaque écran

### Règle générale

Quel que soit le pattern actuel de l'écran (`SafeAreaView`, `useSafeAreaInsets`, `Header` component, ou header inline), **tout le markup de header/top-area existant est supprimé et remplacé par `<PageHeader>`**. `PageHeader` gère lui-même les insets via `useSafeAreaInsets`.

Chaque écran après migration :
1. Supprime tout markup d'en-tête existant : `<SafeAreaView>`, `useSafeAreaInsets` (pour le top uniquement), `<Header>`, ou blocs header inline
2. Le `View` racine : `flex: 1, backgroundColor: COLORS.secondary.cream`
3. `<PageHeader>` est le premier enfant du `View` racine
4. Le `ScrollView` / `FlatList` / contenu principal démarre directement après `PageHeader`, sans `paddingTop` supplémentaire

### Cas particulier : écrans avec `KeyboardAvoidingView`

`LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen` et `AddFoodScreen` utilisent `KeyboardAvoidingView` comme racine. Sur ces écrans, la structure devient :

```
View (flex:1, bg cream)
  PageHeader          ← fixe, hors du KeyboardAvoidingView
  KeyboardAvoidingView (flex:1)
    ScrollView / contenu du formulaire
```

`PageHeader` est placé **avant** le `KeyboardAvoidingView` pour éviter que le clavier ne décale le header. `KeyboardAvoidingView` n'enveloppe que le contenu du formulaire.

---

## Ce qui ne change pas

- Le composant `HeroSection` existant (home) reste inchangé
- Le composant `Header` existant reste disponible pour usage futur
- Le contenu sous le header (cartes, listes, formulaires) n'est pas modifié dans cette phase

---

## Phase suivante

Redesign du contenu (cartes, listes, sections) pour harmoniser l'ensemble de l'app — spec séparée.
