# Design Spec — HomeScreen Redesign

**Date:** 2026-03-22
**Status:** Approved

---

## Objectif

Redesigner la HomeScreen pour qu'elle soit moins "générique IA" et plus distinctive.
Direction : contraste fort entre hero sombre et body clair, cards avec des identités visuelles fortes.

---

## Décisions de design validées

| Section | Choix retenu |
|---------|-------------|
| Hero | Gradient vert sombre, stats intégrées |
| Challenge card | Fond très sombre `#1F3A27` (vert nuit), texte blanc |
| Recipe card | Fond crème chaud `#F0EAD2`, texte vert foncé |
| Spaces cards | Grille 2×2, carrés (`aspectRatio: 1`), gradient coloré par liste |

---

## Architecture des composants

### Changements vs l'existant

```
AVANT                         APRÈS
─────────────────────         ─────────────────────
BackgroundDecoration          ~~supprimé~~
FeedbackButton (flottant)     intégré dans HeroSection
LogoSection                   ──┐
StatsCardsRow                 ──┴─► HeroSection (nouveau composant)
WeeklyChallengeCard           WeeklyChallengeCard (reskin)
ProactiveRecipeCard           ProactiveRecipeCard (reskin)
ReferralCard                  ReferralCard (inchangé)
SpacesGrid                    SpacesGrid (cards reskin)
```

---

## 1. HeroSection (nouveau composant)

**Fichier :** `components/HeroSection.tsx`

Fusionne `LogoSection` + `StatsCardsRow` en un seul bloc hero avec gradient sombre.

### Placement

Le `HeroSection` est placé **à l'intérieur du `ScrollView`** comme premier élément, avant le `contentFade` animated view. Il scrolle avec le contenu. L'animation `headerFade` qui animait le feedback button flottant est **supprimée** (le button est maintenant dans le hero).

### Layout

```
┌─────────────────────────────────────────┐
│  [gradient sombre]                      │
│                                         │
│  Bonjour !          [feedback btn]      │
│  ZeroGaspy                              │
│                                         │
│  ┌───────┐  ┌───────┐  ┌───────┐       │
│  │  5    │  │  2    │  │  18   │       │
│  │ expir.│  │ jetés │  │ frais │       │
│  └───────┘  └───────┘  └───────┘       │
└─────────────────────────────────────────┘
```

### Spécifications visuelles

**Background gradient :**
```typescript
import { LinearGradient } from 'expo-linear-gradient';
// colors: ['#1A3020', '#2E5339', '#3C6E47']
// Note: #1A3020 est intentionnellement plus sombre que COLORS.primary[800] (#152818)
// pour créer la profondeur voulue — valeur raw acceptable ici
// locations: [0, 0.55, 1]
// start: { x: 0.3, y: 0 }, end: { x: 1, y: 1 }
```

**Safe area :** utiliser `useSafeAreaInsets` de `react-native-safe-area-context` à l'intérieur du composant `HeroSection` :
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const insets = useSafeAreaInsets();
// paddingTop: insets.top + 12
```

**Padding :** `paddingTop: insets.top + 12`, `paddingHorizontal: 20`, `paddingBottom: 20`

**Titre "ZeroGaspy" :** `fontSize: scaleFontSize(32)`, `fontWeight: '900'`, `color: white`, `letterSpacing: -1`

**Sous-titre "Bonjour !" :** `fontSize: scaleFontSize(14)`, `fontWeight: '400'`, `color: rgba(255,255,255,0.6)`, affiché **au-dessus** du titre

**Feedback button :** aligné à droite de la même ligne que "Bonjour !" via `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'flex-start'`

**Stat pills :**
- Layout : `flexDirection: 'row'`, `gap: 8`, sous le titre
- Chaque pill : `flex: 1`, `background: rgba(255,255,255,0.09)`, `border: 1px rgba(255,255,255,0.11)`, `borderRadius: 10`, `padding: 10 8`
- Chiffre : `fontSize: scaleFontSize(24)`, `fontWeight: '900'`, `color: white`, `letterSpacing: -1`
- Chiffre "expirent" : `color: COLORS.status.expiringSoon` (`#FB923C`) si count > 0, sinon white
- Label : `fontSize: scaleFontSize(9)`, `color: rgba(255,255,255,0.45)`, `textTransform: 'uppercase'`, `letterSpacing: 1`
- Tappable : la stat pill "expirent" → `onExpiringSoonPress`, "jetés" → `onThrownPress`
- La stat pill "frais" n'est pas tappable

### Props

```typescript
interface HeroSectionProps {
  expiringSoonCount: number;
  thrownCount: number;
  freshCount: number;
  onExpiringSoonPress: () => void;
  onThrownPress: () => void;
  onFeedbackPress: () => void;
}
```

### Migration HomeScreen

Dans `HomeScreen.tsx` :

1. Supprimer `LogoSection` (composant + définition)
2. Supprimer `BackgroundDecoration` (composant + définition + imports SVG devenus inutiles)
3. Supprimer l'import et l'usage de `StatsCardsRow`
4. Supprimer le state/animation `headerFade` et le `Animated.View` du feedback button flottant
5. Ajouter `HeroSection` comme **premier enfant du ScrollView** (avant le `Animated.View` du content)
6. Calculer `freshCount` :
```typescript
const freshCount = useMemo(() => {
  return lists.reduce((sum, list) => {
    return sum + list.items.filter(item => {
      if (item.status === 'consumed' || item.status === 'thrown') return false;
      const days = getDaysUntilExpiration(item.expirationDate);
      return days === null || days > 7;
    }).length;
  }, 0);
}, [lists]);
```
7. Passer `expiringSoonCount`, `thrownCount`, `freshCount`, `onExpiringSoonPress`, `onThrownPress`, `() => setFeedbackModalVisible(true)` au `HeroSection`
8. Le `scrollContent` paddingTop peut être réduit ou supprimé car le safe area est géré dans HeroSection

---

## 2. WeeklyChallengeCard — reskin

**Fichier :** `components/WeeklyChallengeCard.tsx`

Changements de styles uniquement, structure JSX et logique inchangées.

| Propriété | Avant | Après |
|-----------|-------|-------|
| `backgroundColor` | `COLORS.surface.card` | `COLORS.primary[700]` (`#1F3A27`) |
| `borderWidth` | `1` | `0` |
| `borderColor` | (supprimé) | (supprimé) |
| `...SHADOWS.sm` | shadow légère | `...SHADOWS.colored(COLORS.primary[700], 0.4)` |
| Icon container `backgroundColor` | `hexToRgba(primary, 0.08)` | `rgba(74,222,128,0.15)` |
| `title` color | `COLORS.text.primary` | `white` |
| `progressBarBg` backgroundColor | `COLORS.neutral.gray200` | `rgba(255,255,255,0.12)` |
| `completionText` color | `COLORS.text.tertiary` | `rgba(255,255,255,0.5)` |
| `chevron` color | `COLORS.neutral.gray400` | `rgba(255,255,255,0.4)` |

---

## 3. ProactiveRecipeCard — reskin

**Fichier :** `components/ProactiveRecipeCard.tsx`

Changements de styles uniquement, structure JSX et logique inchangées.

Identifier le style du container principal de la card (celui qui porte `backgroundColor`) et modifier :

| Propriété | Avant | Après |
|-----------|-------|-------|
| `backgroundColor` | blanc ou crème existant | `#F0EAD2` |
| `borderWidth` | existant | `1` |
| `borderColor` | existant | `rgba(60,110,71,0.12)` |
| shadow | existant | `...SHADOWS.sm` |
| Titre recette | couleur existante | `COLORS.primary[700]` (`#1F3A27`) |
| Texte secondaire | couleur existante | `COLORS.text.tertiary` |

---

## 4. SpacesGrid — reskin des cards

**Fichier :** `components/SpacesGrid.tsx`

### Cards propres : carré coloré

**Style `card` :**

```typescript
// SUPPRIMER
minHeight: scaleSize(isSmallScreen ? 115 : 140),

// MODIFIER
aspectRatio: 1,                              // carré parfait
backgroundColor: hexToRgba(listColor, 0.18), // plus opaque
borderColor: hexToRgba(listColor, 0.3),
borderWidth: 1,                              // était 1.5
```

**Layout interne :** remplacer (icon → title → footer) par top/bottom :

```tsx
{/* Top row */}
<View style={styles.cardTop}>
  <View style={[styles.iconContainer, { backgroundColor: hexToRgba(listColor, 0.2) }]}>
    <Ionicons name={icon} size={scaleSize(isSmallScreen ? 20 : 24)} color={listColor} />
  </View>
  {urgentCount > 0 && (
    <View style={styles.urgentBadge}>
      <Text style={styles.urgentText}>{urgentCount} urgents</Text>
    </View>
  )}
</View>

{/* Spacer */}
<View style={{ flex: 1 }} />

{/* Bottom */}
<View>
  <Text style={[styles.cardTitle, { color: listColor }]} numberOfLines={2}>
    {list.title}
  </Text>
  <Text style={[styles.countLabel, { color: hexToRgba(listColor, 0.6) }]}>
    {activeCount} aliment{activeCount !== 1 ? 's' : ''}
  </Text>
</View>
```

**Supprimer** les styles : `cardFooter`, `countBadge`, `countText`, `arrowCircle`, `decorativeDot`.

**Modifier** le style `cardTitle` : supprimer `flex: 1` (il était là pour prendre l'espace dans l'ancien layout horizontal — inutile dans le nouveau layout vertical).

**Ajouter** les styles :

```typescript
cardTop: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
},
urgentBadge: {
  backgroundColor: 'rgba(251,146,60,0.2)',
  borderRadius: scaleSize(5),
  paddingHorizontal: scaleSpacing(5),
  paddingVertical: scaleSpacing(2),
},
urgentText: {
  fontSize: scaleFontSize(9),
  fontWeight: '700',
  color: '#E65100',
},
```

**Calcul urgentCount** — ajouter dans le composant :

```typescript
import { getDaysUntilExpiration } from '../utils/dateUtils';

const getUrgentItemsCount = (list: List) => {
  return list.items.filter(item => {
    if (item.status === 'consumed' || item.status === 'thrown') return false;
    const days = getDaysUntilExpiration(item.expirationDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;
};
```

Appeler au moment du rendu : `const urgentCount = getUrgentItemsCount(list);`

### Cards partagées (sharedLists)

Les cards de listes partagées reçoivent le **même reskin** (carré, layout top/bottom) avec les adaptations suivantes :

- Le `sharedIconBadge` (badge "people") reste positionné en `position: absolute` sur l'icon container — inchangé
- La zone top contient l'icône (avec son badge partagé) + optionnellement le badge `readOnly` (oeil) si `permission === 'view'`
- La zone bottom affiche `sl.listTitle` + `sl.ownerName` si disponible
- Pas de `urgentBadge` sur les listes partagées (on n'a pas leurs items localement)

```tsx
{/* Top row — shared list */}
<View style={styles.cardTop}>
  <View style={{ position: 'relative' }}>
    <View style={[styles.iconContainer, { backgroundColor: hexToRgba(slColor, 0.2) }]}>
      <Ionicons name={icon} size={scaleSize(isSmallScreen ? 20 : 24)} color={slColor} />
    </View>
    {/* Badge partagé — inchangé */}
    <View style={[styles.sharedIconBadge, { backgroundColor: slColor }]}>
      <Ionicons name="people" size={scaleSize(10)} color={COLORS.neutral.white} />
    </View>
  </View>
  {sl.permission === 'view' && (
    <View style={styles.readOnlyBadge}>
      <Ionicons name="eye-outline" size={10} color={COLORS.text.muted} />
    </View>
  )}
</View>

{/* Spacer */}
<View style={{ flex: 1 }} />

{/* Bottom */}
<View>
  <Text style={[styles.cardTitle, { color: slColor }]} numberOfLines={2}>
    {sl.listTitle}
  </Text>
  {sl.ownerName && (
    <Text style={[styles.countLabel, { color: hexToRgba(slColor, 0.6) }]} numberOfLines={1}>
      {sl.ownerName}
    </Text>
  )}
</View>
```

### Card "Nouveau" (bouton créer une liste)

Remplacer le 4e slot inline par un style dédié :

```typescript
newCard: {
  aspectRatio: 1,
  borderRadius: scaleSize(isSmallScreen ? 16 : 20),
  backgroundColor: '#F7F5F0',
  borderWidth: 1.5,
  borderColor: 'rgba(60,110,71,0.2)',
  borderStyle: 'dashed',
  alignItems: 'center',
  justifyContent: 'center',
},
newCardLabel: {
  fontSize: scaleFontSize(11),
  color: 'rgba(60,110,71,0.45)',
  fontWeight: '600',
  marginTop: scaleSpacing(4),
},
```

Contenu : `Ionicons name="add"`, `size: scaleSize(28)`, `color: rgba(60,110,71,0.4)` + Text "Nouveau".

> **Note Android :** `borderStyle: 'dashed'` avec `borderRadius` ne s'affiche pas correctement sur Android (le radius est ignoré ou la bordure disparaît). Accepter cette dégradation visuelle sur Android — la card reste fonctionnelle.

Le card "Nouveau" est affiché uniquement si l'utilisateur n'a pas encore de listes OU toujours en 4e position — comportement inchangé.

---

## 5. Suppression de BackgroundDecoration

Dans `HomeScreen.tsx` :
- Supprimer le composant `BackgroundDecoration` (avec son `useEffect`, ses `useRef`, et les imports `Svg`, `Path`, `Circle`, `G`, `Defs`, `LinearGradient`, `Stop` de `react-native-svg` si non utilisés ailleurs dans le fichier)
- Supprimer `<BackgroundDecoration />` du JSX

---

## Tokens design utilisés

| Usage | Valeur | Note |
|-------|--------|------|
| Hero gradient start | `#1A3020` | Raw intentionnel — plus sombre que primary[800] pour la profondeur |
| Hero gradient mid | `#2E5339` | = `COLORS.primary[600]` |
| Hero gradient end | `#3C6E47` | = `COLORS.primary[500]` |
| Challenge card bg | `#1F3A27` | = `COLORS.primary[700]` |
| Recipe card bg | `#F0EAD2` | Crème chaud |
| Urgent badge bg | `rgba(251,146,60,0.2)` | = `hexToRgba(COLORS.status.expiringSoon, 0.2)` |
| Urgent badge text | `#E65100` | Raw intentionnel |

---

## Fichiers impactés

| Fichier | Type de changement |
|---------|-------------------|
| `screens/HomeScreen.tsx` | Supprimer LogoSection, BackgroundDecoration, headerFade, StatsCardsRow ; ajouter HeroSection dans ScrollView ; calculer freshCount |
| `components/HeroSection.tsx` | Nouveau composant |
| `components/StatsCardsRow.tsx` | Non utilisé — garder le fichier (ne pas supprimer) |
| `components/WeeklyChallengeCard.tsx` | Reskin couleurs uniquement |
| `components/ProactiveRecipeCard.tsx` | Reskin couleurs uniquement |
| `components/SpacesGrid.tsx` | Cards carrées + layout top/bottom + badge urgents + shared list reskin |

---

## Hors scope

- Autres écrans — pas touchés
- Tab bar — pas touchée
- Onboarding — pas touché
- Animations d'entrée `contentFade` / `contentSlide` — conservées telles quelles
