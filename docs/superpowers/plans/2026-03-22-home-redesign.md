# HomeScreen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesigner la HomeScreen avec un hero gradient sombre, des cards challenge/recipe reskinées, et des spaces cards carrées colorées.

**Architecture:** Création d'un composant `HeroSection` qui fusionne `LogoSection` + `StatsCardsRow`. Reskin pur (couleurs/layout) sur `WeeklyChallengeCard`, `ProactiveRecipeCard`, et `SpacesGrid` sans modifier leur logique.

**Tech Stack:** React Native + Expo SDK 52, `expo-linear-gradient` (déjà installé), `react-native-safe-area-context` (déjà disponible), `StyleSheet` + `designSystem.ts`

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `components/HeroSection.tsx` | Créer |
| `screens/HomeScreen.tsx` | Modifier — supprimer LogoSection/BackgroundDecoration/StatsCardsRow/headerFade, ajouter HeroSection + freshCount |
| `components/WeeklyChallengeCard.tsx` | Modifier — reskin couleurs |
| `components/ProactiveRecipeCard.tsx` | Modifier — reskin couleurs |
| `components/SpacesGrid.tsx` | Modifier — cards carrées, layout top/bottom, badge urgents, shared list reskin |

**Spec de référence :** `docs/superpowers/specs/2026-03-22-home-redesign-design.md`

---

## Task 1 : Créer HeroSection

**Fichiers :**
- Créer : `components/HeroSection.tsx`

- [ ] **Étape 1 : Créer le fichier `components/HeroSection.tsx`**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import PressableScale from './PressableScale';

interface HeroSectionProps {
  expiringSoonCount: number;
  thrownCount: number;
  freshCount: number;
  onExpiringSoonPress: () => void;
  onThrownPress: () => void;
  onFeedbackPress: () => void;
}

export default function HeroSection({
  expiringSoonCount,
  thrownCount,
  freshCount,
  onExpiringSoonPress,
  onThrownPress,
  onFeedbackPress,
}: HeroSectionProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#1A3020', '#2E5339', '#3C6E47']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 12 }]}
    >
      {/* Top row: greeting + feedback button */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Bonjour !</Text>
          <Text style={styles.appName}>ZeroGaspy</Text>
        </View>
        <PressableScale
          onPress={onFeedbackPress}
          style={styles.feedbackButton}
          hapticType="light"
          accessibilityLabel="Envoyer un feedback"
          accessibilityRole="button"
        >
          <Ionicons
            name="chatbubble-outline"
            size={scaleSize(isSmallScreen ? 18 : 22)}
            color="rgba(255,255,255,0.8)"
          />
        </PressableScale>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <PressableScale
          onPress={onExpiringSoonPress}
          style={styles.statPill}
          hapticType="light"
          accessibilityLabel={`${expiringSoonCount} aliments expirent bientôt`}
          accessibilityRole="button"
        >
          <Text style={[styles.statNumber, expiringSoonCount > 0 && styles.statNumberUrgent]}>
            {expiringSoonCount}
          </Text>
          <Text style={styles.statLabel}>EXPIRENT</Text>
        </PressableScale>

        <PressableScale
          onPress={onThrownPress}
          style={styles.statPill}
          hapticType="light"
          accessibilityLabel={`${thrownCount} aliments jetés`}
          accessibilityRole="button"
        >
          <Text style={styles.statNumber}>{thrownCount}</Text>
          <Text style={styles.statLabel}>JETÉS</Text>
        </PressableScale>

        <View style={styles.statPill}>
          <Text style={styles.statNumber}>{freshCount}</Text>
          <Text style={styles.statLabel}>FRAIS</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scaleSpacing(20),
    paddingBottom: scaleSpacing(20),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  greeting: {
    fontSize: scaleFontSize(14),
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  appName: {
    fontSize: scaleFontSize(32),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  feedbackButton: {
    width: scaleSize(isSmallScreen ? 40 : 44),
    height: scaleSize(isSmallScreen ? 40 : 44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(12),
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: scaleSpacing(4),
  },
  statsRow: {
    flexDirection: 'row',
    gap: scaleSpacing(8),
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 10,
    paddingVertical: scaleSpacing(10),
    paddingHorizontal: scaleSpacing(8),
  },
  statNumber: {
    fontSize: scaleFontSize(24),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: scaleFontSize(28),
  },
  statNumberUrgent: {
    color: COLORS.status.expiringSoon,
  },
  statLabel: {
    fontSize: scaleFontSize(9),
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginTop: 2,
  },
});
```

- [ ] **Étape 2 : Vérifier qu'il n'y a pas d'erreur TypeScript**

```bash
cd C:/Users/Quentin/Application/Zerogaspy/ZeroGaspyLocal
npx tsc --noEmit 2>&1 | head -30
```

Attendu : aucune erreur sur `HeroSection.tsx`

- [ ] **Étape 3 : Commit**

```bash
git add components/HeroSection.tsx
git commit -m "feat: add HeroSection with dark gradient hero and integrated stats"
```

---

## Task 2 : Mettre à jour HomeScreen

**Fichiers :**
- Modifier : `screens/HomeScreen.tsx`

- [ ] **Étape 1 : Supprimer `BackgroundDecoration`**

Dans `HomeScreen.tsx`, supprimer :
- Le composant `BackgroundDecoration` entier (lignes 45-104)
- L'usage `<BackgroundDecoration />` dans le JSX (ligne 283)
- Les imports SVG qui ne sont plus utilisés : `Svg`, `Path`, `Circle`, `G`, `Defs`, `LinearGradient`, `Stop` de `react-native-svg`

Vérifier que `react-native-svg` n'est plus importé nulle part dans ce fichier après suppression.

- [ ] **Étape 2 : Supprimer `LogoSection`**

Supprimer :
- Le composant `LogoSection` entier (lignes 107-158)
- L'usage `<LogoSection colors={colors} />` dans le JSX (ligne 312)
- L'import `Image` de `react-native` s'il n'est plus utilisé ailleurs dans le fichier

- [ ] **Étape 3 : Supprimer `StatsCardsRow` et le feedback button flottant**

Supprimer :
- L'import `StatsCardsRow` (ligne 24)
- L'usage `<StatsCardsRow ... />` dans le JSX
- L'animation `headerFade` : la ref `useRef(new Animated.Value(0))` (ligne 201), les deux `Animated.timing(headerFade ...)` dans la séquence d'animation (ligne 209), et le `Animated.View` wrappant le feedback button flottant (lignes 286-296)

Résultat : la séquence d'animation ne contient plus que le `parallel([contentFade, contentSlide])` — supprimer le `Animated.sequence` et lancer directement le `parallel`.

- [ ] **Étape 4 : Ajouter `freshCount` et `HeroSection`**

Ajouter l'import :
```typescript
import HeroSection from '../components/HeroSection';
```

Ajouter le `useMemo` pour `freshCount` après `thrownCount` :
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

Dans le JSX, ajouter `<HeroSection>` comme **premier enfant du ScrollView**, avant le `<Animated.View>` du content :
```tsx
<ScrollView ...>
  <HeroSection
    expiringSoonCount={expiringSoonCount}
    thrownCount={thrownCount}
    freshCount={freshCount}
    onExpiringSoonPress={onExpiringSoonPress}
    onThrownPress={onThrownPress}
    onFeedbackPress={() => setFeedbackModalVisible(true)}
  />
  <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}>
    ...
  </Animated.View>
</ScrollView>
```

- [ ] **Étape 5 : Ajuster le `scrollContent` paddingTop**

Dans `styles.scrollContent`, le `paddingTop` était là pour laisser la place au logo et au feedback button flottant. Maintenant que le hero est dans le scroll, réduire ou supprimer ce paddingTop :

```typescript
scrollContent: {
  paddingBottom: scaleSpacing(isSmallScreen ? 100 : 120),
  // paddingTop supprimé — géré par HeroSection via insets.top
},
```

- [ ] **Étape 6 : Nettoyer les imports et variables inutilisées**

Vérifier et supprimer :
- `useTheme` / `colors` si `HomeScreen` n'y fait plus référence (le hero gère ses propres couleurs)
- `Dimensions` / `width` si non utilisés
- `Image` de react-native si non utilisé

- [ ] **Étape 7 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Attendu : aucune erreur

- [ ] **Étape 8 : Lancer l'app et vérifier visuellement**

```bash
npx expo start
```

Vérifier :
- Le hero gradient sombre s'affiche en haut
- "Bonjour !" + "ZeroGaspy" + bouton feedback visibles
- 3 pills stats visibles avec les bons chiffres
- Les pills "Expirent" et "Jetés" naviguent au tap
- Le contenu défile normalement en dessous
- Pas de double safe area (pas d'espace blanc en haut)

- [ ] **Étape 9 : Commit**

```bash
git add screens/HomeScreen.tsx
git commit -m "feat: integrate HeroSection into HomeScreen, remove legacy LogoSection and StatsCardsRow"
```

---

## Task 3 : Reskin WeeklyChallengeCard

**Fichiers :**
- Modifier : `components/WeeklyChallengeCard.tsx`

- [ ] **Étape 1 : Modifier les styles du container**

Dans `styles.container` :
```typescript
container: {
  // backgroundColor: COLORS.surface.card  →  remplacer par :
  backgroundColor: COLORS.primary[700],   // #1F3A27
  // borderWidth: 1  →  supprimer
  // borderColor: ...  →  supprimer
  // ...SHADOWS.sm  →  remplacer par :
  ...SHADOWS.colored(COLORS.primary[700], 0.4),
  // reste inchangé (borderRadius, padding, marginHorizontal, marginBottom)
},
```

- [ ] **Étape 2 : Modifier les styles des éléments internes**

```typescript
iconContainer: {
  // backgroundColor: hexToRgba(COLORS.primary[500], 0.08)  →
  backgroundColor: 'rgba(74,222,128,0.15)',
},
title: {
  // color: COLORS.text.primary  →
  color: '#FFFFFF',
},
progressBarBg: {
  // backgroundColor: COLORS.neutral.gray200  →
  backgroundColor: 'rgba(255,255,255,0.12)',
},
completionText: {
  // color: COLORS.text.tertiary  →
  color: 'rgba(255,255,255,0.5)',
},
chevron: {
  // color: COLORS.neutral.gray400  →
  color: 'rgba(255,255,255,0.4)',
},
```

Note : `progressText` (le "6/10" de la progress bar) n'est pas dans la liste — laisser sa couleur actuelle (`COLORS.text.secondary`). Si le contraste est trop faible sur le fond sombre, changer en `rgba(255,255,255,0.6)`.

- [ ] **Étape 3 : Vérifier visuellement dans l'app**

La card doit afficher :
- Fond vert très sombre
- Icône challenge dans un container vert menthe transparent
- Titre et textes en blanc/blanc translucide
- Barre de progression sur fond blanc transparent

- [ ] **Étape 4 : Commit**

```bash
git add components/WeeklyChallengeCard.tsx
git commit -m "style: reskin WeeklyChallengeCard with dark green theme"
```

---

## Task 4 : Reskin ProactiveRecipeCard

**Fichiers :**
- Modifier : `components/ProactiveRecipeCard.tsx`

- [ ] **Étape 1 : Modifier le style `container`**

```typescript
container: {
  // backgroundColor: COLORS.surface.card  →
  backgroundColor: '#F0EAD2',
  // borderColor: hexToRgba(COLORS.primary[500], 0.1)  →
  borderColor: 'rgba(60,110,71,0.12)',
  // borderWidth reste 1, SHADOWS.sm reste
},
```

- [ ] **Étape 2 : Modifier les couleurs des textes**

```typescript
recipeName: {
  // color: COLORS.text.primary  →
  color: COLORS.primary[700],  // #1F3A27
},
metaText: {
  // couleur existante  →
  color: COLORS.text.tertiary,
},
```

Laisser `sectionTitle` (orange "CE SOIR ON CUISINE") inchangé — il fait partie de l'identité de la card.

- [ ] **Étape 3 : Modifier le chevron**

```typescript
// Dans le JSX, le chevron est un Ionicons avec color={COLORS.neutral.gray400}
// →  changer en :
color={COLORS.text.tertiary}
```

- [ ] **Étape 4 : Vérifier visuellement**

La card doit afficher :
- Fond crème chaud `#F0EAD2`
- Label orange en haut (inchangé)
- Nom de la recette en vert foncé

- [ ] **Étape 5 : Commit**

```bash
git add components/ProactiveRecipeCard.tsx
git commit -m "style: reskin ProactiveRecipeCard with warm cream background"
```

---

## Task 5 : Reskin SpacesGrid — cards carrées

**Fichiers :**
- Modifier : `components/SpacesGrid.tsx`

- [ ] **Étape 1 : Ajouter l'import `getDaysUntilExpiration`**

```typescript
import { getDaysUntilExpiration } from '../utils/dateUtils';
```

Vérifier que cet import n'existe pas déjà dans le fichier avant de l'ajouter.

- [ ] **Étape 2 : Ajouter la fonction `getUrgentItemsCount`**

Dans le corps du composant `SpacesGrid`, après `getActiveItemsCount` :

```typescript
const getUrgentItemsCount = (list: List) => {
  return list.items.filter(item => {
    if (item.status === 'consumed' || item.status === 'thrown') return false;
    const days = getDaysUntilExpiration(item.expirationDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;
};
```

- [ ] **Étape 3 : Modifier le style `card`**

Le style `card` est défini statiquement mais `backgroundColor` et `borderColor` sont appliqués dynamiquement via inline styles sur `<PressableScale style={[styles.card, { backgroundColor: ..., borderColor: ... }]}>`. Il faut modifier **les deux** :

Style statique dans `StyleSheet` :
```typescript
card: {
  borderRadius: scaleSize(isSmallScreen ? 16 : 20),
  padding: scaleSpacing(isSmallScreen ? 12 : 16),
  aspectRatio: 1,              // remplace minHeight
  borderWidth: 1,              // était 1.5
  position: 'relative',
  overflow: 'hidden',
  // minHeight: supprimé
},
```

Inline styles dynamiques sur `<PressableScale>` (dans le `.map`) — modifier les valeurs :
```tsx
style={[
  styles.card,
  {
    backgroundColor: hexToRgba(listColor, 0.18),  // était 0.12
    borderColor: hexToRgba(listColor, 0.3),       // était 0.25
  },
]}
```

Faire la même chose pour les cards partagées (même changement de 0.12→0.18 et 0.25→0.3).

- [ ] **Étape 4 : Remplacer le layout interne des cards propres**

Remplacer le JSX interne de la card propre (tout ce qui est entre `<PressableScale>` et `</PressableScale>` pour les listes propres) :

```tsx
{/* Icon + badge urgents */}
<View style={styles.cardTop}>
  <View
    style={[
      styles.iconContainer,
      { backgroundColor: hexToRgba(listColor, 0.2), marginBottom: 0 },
    ]}
  >
    <Ionicons name={icon} size={scaleSize(isSmallScreen ? 20 : 24)} color={listColor} />
  </View>
  {getUrgentItemsCount(list) > 0 && (
    <View style={styles.urgentBadge}>
      <Text style={styles.urgentText}>{getUrgentItemsCount(list)} urgents</Text>
    </View>
  )}
</View>

{/* Spacer */}
<View style={{ flex: 1 }} />

{/* Titre + count */}
<View>
  <Text style={[styles.cardTitle, { color: listColor }]} numberOfLines={2}>
    {list.title}
  </Text>
  <Text style={[styles.countLabel, { color: hexToRgba(listColor, 0.6) }]}>
    {activeCount} aliment{activeCount !== 1 ? 's' : ''}
  </Text>
</View>
```

Note : `getUrgentItemsCount(list)` est appelé deux fois ici. Pour éviter la double computation, extraire en variable locale avant le return du map : `const urgentCount = getUrgentItemsCount(list);`

- [ ] **Étape 5 : Remplacer le layout interne des cards partagées**

Remplacer le JSX interne de la card partagée :

```tsx
{/* Icon avec badge partagé + badge readOnly */}
<View style={styles.cardTop}>
  <View style={{ position: 'relative' }}>
    <View
      style={[
        styles.iconContainer,
        { backgroundColor: hexToRgba(slColor, 0.2), marginBottom: 0 },
      ]}
    >
      <Ionicons name={icon} size={scaleSize(isSmallScreen ? 20 : 24)} color={slColor} />
    </View>
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

{/* Titre + owner */}
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

- [ ] **Étape 6 : Remplacer la card "Nouveau"**

Actuellement le 4e slot est une `PressableScale` avec styles inline. Garder le `PressableScale` mais remplacer son style et son contenu :

```tsx
<AnimatedListItem
  key="new-list"
  index={lists.length + sharedLists.length}
  animationType="scale"
  style={styles.cardWrapper}
>
  <PressableScale
    onPress={onCreateList}
    style={styles.newCard}
    hapticType="medium"
    accessibilityLabel={t('lists.createNewList')}
    accessibilityRole="button"
  >
    <Ionicons name="add" size={scaleSize(28)} color="rgba(60,110,71,0.4)" />
    <Text style={styles.newCardLabel}>Nouveau</Text>
  </PressableScale>
</AnimatedListItem>
```

- [ ] **Étape 7 : Mettre à jour les styles**

**Supprimer** : `cardFooter`, `countBadge`, `countText`, `arrowCircle`, `decorativeDot`

**Modifier** `cardTitle` : supprimer `flex: 1`
```typescript
cardTitle: {
  fontSize: scaleFontSize(isSmallScreen ? 13 : 15),
  lineHeight: scaleFontSize(isSmallScreen ? 18 : 20),
  fontWeight: '800',
  marginBottom: scaleSpacing(2),
  // flex: 1  →  supprimer
},
```

**Ajouter** :
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

- [ ] **Étape 8 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Attendu : aucune erreur

- [ ] **Étape 9 : Vérifier visuellement**

Vérifier dans l'app :
- Cards en carrés parfaits dans la grille 2×2
- Couleur de fond plus opaque (dérivée de la couleur de la liste)
- Icône en haut à gauche, badge orange en haut à droite si urgents
- Nom de la liste + compteur en bas
- Card "Nouveau" avec bordure pointillée
- Listes partagées : badge "people" sur l'icône + badge oeil si lecture seule

- [ ] **Étape 10 : Commit**

```bash
git add components/SpacesGrid.tsx
git commit -m "style: reskin SpacesGrid cards to square colored layout with urgent badge"
```

---

## Vérification finale

- [ ] Lancer l'app et naviguer sur la HomeScreen
- [ ] Vérifier le scroll complet : hero → challenge → recipe → spaces
- [ ] Vérifier sur petit écran (`isSmallScreen`)
- [ ] Vérifier avec 0 listes (empty state SpacesGrid)
- [ ] Vérifier avec listes partagées si disponibles
- [ ] Vérifier le pull-to-refresh (doit toujours fonctionner)
