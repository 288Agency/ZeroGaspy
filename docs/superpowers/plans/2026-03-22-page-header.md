# PageHeader — Dégradé vert sur tous les écrans

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un composant `PageHeader` (dégradé vert, KPIs contextuels, fixe) et migrer tous les écrans de l'app pour remplacer leurs headers actuels.

**Architecture:** Nouveau composant `components/PageHeader.tsx` identique visuellement à `HeroSection` mais générique (title, subtitle, pills optionnelles, backButton, rightAction). Chaque écran supprime son header actuel (SafeAreaView / Header / inline) et le remplace par `<PageHeader>`. Le composant gère lui-même les insets.

**Tech Stack:** React Native, Expo SDK 52, `expo-linear-gradient`, `react-native-safe-area-context`, `@expo/vector-icons`, `expo-haptics`

---

## Fichiers concernés

| Action | Fichier | Changement |
|--------|---------|------------|
| Créer | `components/PageHeader.tsx` | Nouveau composant |
| Modifier | `screens/StatsScreen.tsx` | SafeAreaView + Header → PageHeader |
| Modifier | `screens/RecipesScreen.tsx` | Header → PageHeader |
| Modifier | `screens/ChallengesScreen.tsx` | SafeAreaView + inline header → PageHeader |
| Modifier | `screens/AccountScreen.tsx` | useSafeAreaInsets + inline header → PageHeader |
| Modifier | `screens/ListsScreen.tsx` | header inline → PageHeader |
| Modifier | `screens/ExpiringSoonScreen.tsx` | useSafeAreaInsets + inline header → PageHeader |
| Modifier | `screens/ThrownFoodsScreen.tsx` | useSafeAreaInsets + inline header → PageHeader |
| Modifier | `screens/InventoryListScreen.tsx` | inline header → PageHeader |
| Modifier | `screens/InventoryScreen.tsx` | (pas de header actuellement) → PageHeader |
| Modifier | `screens/AddFoodScreen.tsx` | Header → PageHeader (sans pills) |
| Modifier | `screens/CreateListScreen.tsx` | Header → PageHeader (sans pills) |
| Modifier | `screens/auth/LoginScreen.tsx` | inline header → PageHeader (sans pills, KeyboardAvoidingView) |
| Modifier | `screens/auth/RegisterScreen.tsx` | inline header → PageHeader (sans pills, KeyboardAvoidingView) |
| Modifier | `screens/auth/ForgotPasswordScreen.tsx` | inline header → PageHeader (sans pills) |

---

## Task 1 : Créer `PageHeader`

**Fichiers :**
- Créer : `components/PageHeader.tsx`

- [ ] **Étape 1 : Créer le composant**

```tsx
// components/PageHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

interface PageHeaderPill {
  value: string | number;
  label: string;
  color?: string; // surcharge couleur du texte de la valeur (défaut: #FFFFFF)
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  pills?: PageHeaderPill[];
  backButton?: boolean; // défaut: false
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel: string;
  };
}

export default function PageHeader({
  title,
  subtitle,
  pills,
  backButton = false,
  rightAction,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={['#1A3020', '#2E5339', '#3C6E47']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 12 }]}
    >
      {/* Ligne du haut */}
      <View style={styles.topRow}>
        {backButton ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconButton}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back"
              size={scaleSize(isSmallScreen ? 18 : 22)}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.iconButton}
            accessibilityLabel={rightAction.accessibilityLabel}
            accessibilityRole="button"
          >
            <Ionicons
              name={rightAction.icon}
              size={scaleSize(isSmallScreen ? 18 : 22)}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* Ligne des pills */}
      {pills && pills.length > 0 && (
        <View style={styles.pillsRow}>
          {pills.map((pill, i) => (
            <View key={i} style={styles.pill}>
              <Text style={[styles.pillValue, pill.color ? { color: pill.color } : null]}>
                {pill.value}
              </Text>
              <Text style={styles.pillLabel}>{pill.label}</Text>
            </View>
          ))}
        </View>
      )}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  iconButton: {
    width: scaleSize(isSmallScreen ? 40 : 44),
    height: scaleSize(isSmallScreen ? 40 : 44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(12),
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: scaleSpacing(4),
  },
  spacer: {
    width: scaleSize(isSmallScreen ? 40 : 44),
  },
  titleBlock: {
    flex: 1,
    paddingHorizontal: scaleSpacing(8),
  },
  title: {
    fontSize: scaleFontSize(32),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '400',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: scaleSpacing(8),
  },
  pill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: scaleSize(10),
    paddingVertical: scaleSpacing(10),
    paddingHorizontal: scaleSpacing(8),
  },
  pillValue: {
    fontSize: scaleFontSize(24),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: scaleFontSize(28),
  },
  pillLabel: {
    fontSize: scaleFontSize(9),
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginTop: 2,
  },
});
```

- [ ] **Étape 2 : Vérifier visuellement**

Lance `npx expo start` et teste sur un émulateur. Le composant ne sera pas encore utilisé mais doit compiler sans erreur TypeScript.

```bash
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

```bash
git add components/PageHeader.tsx
git commit -m "feat: add PageHeader component — green gradient with contextual pills"
```

---

## Task 2 : Migrer les onglets principaux

**Fichiers :**
- Modifier : `screens/StatsScreen.tsx`
- Modifier : `screens/RecipesScreen.tsx`
- Modifier : `screens/ChallengesScreen.tsx`
- Modifier : `screens/AccountScreen.tsx`

### StatsScreen

Pattern actuel : `SafeAreaView` + `Header` (sans back button, avec rightIcon "share")

- [ ] **Étape 1 : Remplacer dans `StatsScreen.tsx`**

Supprimer l'import `SafeAreaView` et `Header`. Ajouter `PageHeader`, `calculateUserStats`, `loadLists`.

`shareHandlerRef` est déjà déclaré ligne 17 : `const shareHandlerRef = useRef<(() => void) | null>(null);` — le conserver tel quel, il sera passé à `PageHeader.rightAction.onPress`.

```tsx
// Ajouter ces imports
import PageHeader from '../components/PageHeader';
import { calculateUserStats } from '../services/statsService';
import { loadLists } from '../utils/localStorage';

// Ajouter state dans le composant
const [savedPercent, setSavedPercent] = useState(0);
const [totalSaved, setTotalSaved] = useState(0);

useEffect(() => {
  (async () => {
    const stats = await calculateUserStats();
    const lists = await loadLists();
    const allItems = lists.flatMap(l => l.items);
    const consumed = allItems.filter(i => i.status === 'consumed').length;
    const thrown = allItems.filter(i => i.status === 'thrown').length;
    const total = consumed + thrown;
    setSavedPercent(total > 0 ? Math.round((consumed / total) * 100) : 100);
    setTotalSaved(stats.totalSaved);
  })();
}, []);

// Remplacer le JSX : supprimer <SafeAreaView> et <Header>, garder le reste
// Structure finale :
return (
  <View style={styles.container}>
    <PageHeader
      title={t('stats.impactTitle')}
      pills={[
        { value: `${savedPercent}%`, label: 'SAUVÉ', color: COLORS.status.fresh },
        { value: `${totalSaved.toFixed(0)}€`, label: 'ÉCONOMISÉ' },
      ]}
      rightAction={{
        icon: 'share-social-outline',
        onPress: () => shareHandlerRef.current?.(),
        accessibilityLabel: 'Partager',
      }}
    />
    <StatsDashboard
      onOpenPaywall={() => setShowPaywall(true)}
      shareRef={shareHandlerRef}
    />
    <PaywallModal
      visible={showPaywall}
      onClose={() => setShowPaywall(false)}
      feature="general"
    />
  </View>
);
```

Dans `styles.container` : `flex: 1, backgroundColor: COLORS.secondary.cream`. Supprimer le wrapper `SafeAreaView`.

- [ ] **Étape 2 : Vérifier visuellement**

Ouvrir l'onglet Stats dans l'app. Header vert avec les deux pills % et €.

- [ ] **Étape 3 : Commit**

```bash
git add screens/StatsScreen.tsx
git commit -m "feat: migrate StatsScreen to PageHeader with saved% and € pills"
```

---

### RecipesScreen

Pattern actuel : `Header` (sans back button, line 552)

- [ ] **Étape 1 : Remplacer dans `RecipesScreen.tsx`**

Supprimer l'import `Header`. Ajouter `PageHeader`.

```tsx
import PageHeader from '../components/PageHeader';

// Dans le JSX (ligne ~552), remplacer :
// <Header title={t('recipes.ideasTitle')} showBackButton={false} />
// par :
<PageHeader
  title={t('recipes.ideasTitle')}
  pills={[
    { value: filteredRecipes.length, label: 'IDÉES' },
    {
      value: lists.flatMap(l => l.items.filter(i =>
        i.status !== 'consumed' && i.status !== 'thrown'
      )).length,
      label: 'INGRÉD.',
    },
  ]}
/>
```

Note : `filteredRecipes` et `lists` sont déjà dans le state de `RecipesScreen`. Vérifier leurs noms exacts dans le fichier avant d'implémenter.

- [ ] **Étape 2 : Vérifier visuellement**

Ouvrir l'onglet Recettes. Header vert avec nb recettes et nb ingrédients.

- [ ] **Étape 3 : Commit**

```bash
git add screens/RecipesScreen.tsx
git commit -m "feat: migrate RecipesScreen to PageHeader with recipe and ingredient pills"
```

---

### ChallengesScreen

Pattern actuel : `SafeAreaView` + inline `Animated.View` header avec back button (ligne 104 et 143).

Note : le composant a deux branches de rendu (loading et loaded), les deux ont un header inline. Remplacer les deux.

- [ ] **Étape 1 : Remplacer dans `ChallengesScreen.tsx`**

Supprimer `SafeAreaView`. Ajouter `PageHeader`.

```tsx
import PageHeader from '../components/PageHeader';

// Les valeurs completedCount, activeDefs.length, totalXpEarned, allCompleted
// sont déjà calculées aux lignes 130-137 (branche loaded)
// Pour la branche loading, utiliser des valeurs neutres

// Branche loading (ligne ~100) — remplacer SafeAreaView + Animated.View header par :
return (
  <View style={styles.container}>
    <PageHeader title={t('challenges.screenTitle')} subtitle={t('common.loading')} />
    <ScrollView ...>
      <SkeletonChallengesContent />
    </ScrollView>
  </View>
);

// Branche loaded (ligne ~139) — remplacer SafeAreaView + Animated.View header par :
return (
  <View style={styles.container}>
    <PageHeader
      title={t('challenges.screenTitle')}
      subtitle={dateRange.start && dateRange.end ? `${dateRange.start} — ${dateRange.end}` : undefined}
      pills={[
        {
          value: `${completedCount}/${activeDefs.length}`,
          label: 'COMPLÉTÉS',
          color: allCompleted ? COLORS.status.fresh : undefined,
        },
        { value: `+${totalXpEarned}`, label: 'XP' },
      ]}
    />
    {/* contenu existant */}
  </View>
);
```

Dans les styles, `safeArea` n'est plus nécessaire. Le `View` racine : `flex: 1, backgroundColor: COLORS.secondary.cream`.

- [ ] **Étape 2 : Vérifier visuellement**

Ouvrir l'onglet Défis. Header vert avec les pills `X/3` et `+XP`.

- [ ] **Étape 3 : Commit**

```bash
git add screens/ChallengesScreen.tsx
git commit -m "feat: migrate ChallengesScreen to PageHeader with challenge progress pills"
```

---

### AccountScreen

Pattern actuel : `useSafeAreaInsets` + inline `View` header avec `paddingTop: headerPaddingTop` (ligne 256–261).

- [ ] **Étape 1 : Remplacer dans `AccountScreen.tsx`**

Supprimer `useSafeAreaInsets` (si utilisé uniquement pour le header). Ajouter `PageHeader`. Le niveau et XP viennent de `useGamification()` → `gamificationData`.

```tsx
import PageHeader from '../components/PageHeader';

// Vérifier que gamificationData est déjà dans le composant via useGamification()
// Il l'est déjà : const { gamificationData } = useGamification();

// Remplacer <View style={[styles.header, { paddingTop: headerPaddingTop }]}>...</View>
// (lignes 256-261) par :
<PageHeader
  title={t('account.title')}
  pills={[
    { value: `Lv.${gamificationData?.level ?? 1}`, label: 'NIVEAU' },
    { value: gamificationData?.totalXp ?? 0, label: 'XP' },
  ]}
/>
```

Supprimer les styles `header` et `headerTitle` devenus inutiles (vérifier qu'ils ne sont utilisés nulle part ailleurs dans le fichier). Supprimer `useSafeAreaInsets` si non utilisé ailleurs.

- [ ] **Étape 2 : Vérifier visuellement**

Ouvrir l'onglet Compte. Header vert avec niveau et XP.

- [ ] **Étape 3 : Commit**

```bash
git add screens/AccountScreen.tsx
git commit -m "feat: migrate AccountScreen to PageHeader with level and XP pills"
```

---

## Task 3 : Migrer les écrans de contenu imbriqués

**Fichiers :**
- Modifier : `screens/ExpiringSoonScreen.tsx`
- Modifier : `screens/ThrownFoodsScreen.tsx`
- Modifier : `screens/InventoryListScreen.tsx`
- Modifier : `screens/InventoryScreen.tsx`
- Modifier : `screens/ListsScreen.tsx`

### ExpiringSoonScreen

Pattern actuel : `useSafeAreaInsets` + inline header (à chercher dans le fichier : bloc avec paddingTop insets).

- [ ] **Étape 1 : Remplacer dans `ExpiringSoonScreen.tsx`**

```tsx
import PageHeader from '../components/PageHeader';
import { COLORS } from '../utils/designSystem'; // déjà importé

// Calculer "demain" (0 ou 1 jour) dans le state ou en dérivé
const tomorrowCount = expiringItems.filter(item => {
  const days = getDaysUntilExpiration(item.expirationDate);
  return days !== null && days <= 1;
}).length;

// Remplacer le header inline par :
<PageHeader
  title="Expirent bientôt"
  backButton
  pills={[
    {
      value: expiringItems.length,
      label: 'CETTE SEMAINE',
      color: COLORS.status.expiringSoon,  // #FB923C
    },
    { value: tomorrowCount, label: 'DEMAIN' },
  ]}
/>
```

Supprimer `useSafeAreaInsets` si non utilisé ailleurs dans le fichier.

- [ ] **Étape 2 : Vérifier visuellement**

Naviguer sur un écran "Expirent bientôt". Header vert avec les deux pills, bouton retour.

- [ ] **Étape 3 : Commit**

```bash
git add screens/ExpiringSoonScreen.tsx
git commit -m "feat: migrate ExpiringSoonScreen to PageHeader"
```

---

### ThrownFoodsScreen

Pattern actuel : `useSafeAreaInsets` + inline header.

- [ ] **Étape 1 : Remplacer dans `ThrownFoodsScreen.tsx`**

```tsx
import PageHeader from '../components/PageHeader';

// Calculer la valeur gaspillée
const wastedValue = thrownItems
  .filter(item => item.price && item.price > 0)
  .reduce((sum, item) => sum + (item.price ?? 0), 0);

// Remplacer le header inline par :
<PageHeader
  title="Aliments jetés"
  backButton
  pills={[
    { value: thrownItems.length, label: 'TOTAL' },
    {
      value: wastedValue > 0 ? `${wastedValue.toFixed(0)}€` : '—',
      label: 'GASPILLÉ',
    },
  ]}
/>
```

Supprimer `useSafeAreaInsets`.

- [ ] **Étape 2 : Vérifier visuellement**

- [ ] **Étape 3 : Commit**

```bash
git add screens/ThrownFoodsScreen.tsx
git commit -m "feat: migrate ThrownFoodsScreen to PageHeader"
```

---

### InventoryListScreen

Pattern actuel : inline header (chercher le bloc header dans le rendu principal, pas dans les modales).

- [ ] **Étape 1 : Remplacer dans `InventoryListScreen.tsx`**

```tsx
import PageHeader from '../components/PageHeader';
import { COLORS } from '../utils/designSystem'; // déjà importé
// getDaysUntilExpiration est déjà importé (ligne 45)

// Le state contenant la liste est : const [list, setList] = useState<List | null>(null);
// Les items de la liste sont dans list?.items
const activeItems = (list?.items ?? []).filter(
  i => i.status !== 'consumed' && i.status !== 'thrown'
);
const expiringCount = activeItems.filter(i => {
  const days = getDaysUntilExpiration(i.expirationDate);
  return days !== null && days <= 7;
}).length;

// Remplacer le header inline par :
<PageHeader
  title={list?.title ?? 'Inventaire'}
  backButton
  pills={[
    { value: activeItems.length, label: 'ALIMENTS' },
    {
      value: expiringCount,
      label: 'À SURVEILLER',
      color: expiringCount > 0 ? COLORS.status.expiringSoon : undefined,
    },
  ]}
/>
```

- [ ] **Étape 2 : Vérifier visuellement**

- [ ] **Étape 3 : Commit**

```bash
git add screens/InventoryListScreen.tsx
git commit -m "feat: migrate InventoryListScreen to PageHeader"
```

---

### InventoryScreen

Pattern actuel : pas de header existant (chercher dans le fichier — s'il n'y en a pas, ajouter PageHeader en premier enfant du View racine).

- [ ] **Étape 1 : Remplacer dans `InventoryScreen.tsx`**

```tsx
import PageHeader from '../components/PageHeader';

// Le state `inventory` est de type FoodItem[]
// Remplacer le View racine par :
return (
  <View style={styles.container}>
    <PageHeader
      title="Inventaire"
      backButton
      pills={[
        { value: inventory.length, label: 'ALIMENTS' },
      ]}
    />
    {/* contenu existant */}
  </View>
);
```

- [ ] **Étape 2 : Vérifier visuellement**

- [ ] **Étape 3 : Commit**

```bash
git add screens/InventoryScreen.tsx
git commit -m "feat: migrate InventoryScreen to PageHeader"
```

---

### ListsScreen

Pattern actuel : inline header (chercher dans le fichier).

- [ ] **Étape 1 : Remplacer dans `ListsScreen.tsx`**

```tsx
import PageHeader from '../components/PageHeader';

// `lists` et `sharedLists` sont déjà dans le state
<PageHeader
  title="Mes Listes"
  pills={[
    { value: lists.length, label: 'LISTES' },
    { value: sharedLists.length, label: 'PARTAGÉES' },
  ]}
/>
```

- [ ] **Étape 2 : Vérifier visuellement**

- [ ] **Étape 3 : Commit**

```bash
git add screens/ListsScreen.tsx
git commit -m "feat: migrate ListsScreen to PageHeader"
```

---

## Task 4 : Migrer les écrans formulaires et auth

**Fichiers :**
- Modifier : `screens/AddFoodScreen.tsx`
- Modifier : `screens/CreateListScreen.tsx`
- Modifier : `screens/auth/LoginScreen.tsx`
- Modifier : `screens/auth/RegisterScreen.tsx`
- Modifier : `screens/auth/ForgotPasswordScreen.tsx`

Ces écrans reçoivent un header **minimal** : dégradé + titre + sous-titre optionnel, **sans pills**.

### AddFoodScreen

Pattern actuel : `Header` component (ligne 295). La racine est un `View` — vérifié, pas de `KeyboardAvoidingView` dans ce fichier. La structure standard (sans wrapping KAV) s'applique.

- [ ] **Étape 1 : Remplacer dans `AddFoodScreen.tsx`**

```tsx
import PageHeader from '../components/PageHeader';
// Supprimer import Header

// Remplacer <Header title={...} showIcon={...} ... />
// par :
<PageHeader
  title={isEditMode ? t('addFood.editTitle') : t('addFood.title')}
  subtitle="Nouvel aliment"
  backButton
  rightAction={isFormValid && !isAdding ? {
    icon: 'checkmark-circle',
    onPress: handleAddFood,
    accessibilityLabel: 'Valider',
  } : undefined}
/>
```

- [ ] **Étape 2 : Vérifier visuellement**

- [ ] **Étape 3 : Commit**

```bash
git add screens/AddFoodScreen.tsx
git commit -m "feat: migrate AddFoodScreen to PageHeader"
```

---

### CreateListScreen

Pattern actuel : `Header` component. Racine est un `View`.

- [ ] **Étape 1 : Remplacer dans `CreateListScreen.tsx`**

```tsx
import PageHeader from '../components/PageHeader';
// Supprimer import Header

// Remplacer <Header title={t('lists.newList')} showIcon={false} />
// par :
<PageHeader title={t('lists.newList')} backButton />
```

- [ ] **Étape 2 : Vérifier visuellement**

- [ ] **Étape 3 : Commit**

```bash
git add screens/CreateListScreen.tsx
git commit -m "feat: migrate CreateListScreen to PageHeader"
```

---

### LoginScreen, RegisterScreen, ForgotPasswordScreen

Pattern actuel : ces écrans ont un inline header dans leur JSX + `KeyboardAvoidingView`. Appliquer la structure spécifique KeyboardAvoidingView (spec section "Cas particulier").

Structure cible pour chacun :
```
View (flex:1, bg cream)
  PageHeader          ← avant le KeyboardAvoidingView
  KeyboardAvoidingView (flex:1)
    ScrollView / contenu
```

- [ ] **Étape 1 : Migrer `LoginScreen.tsx`**

```tsx
import PageHeader from '../../components/PageHeader';

// Identifier le inline header (import de l'écran : ligne ~75 commentaire "{/* Header */}")
// Supprimer ce bloc header inline.
// Ajouter un View racine (flex:1) si pas déjà là.
// Placer PageHeader avant KeyboardAvoidingView :

return (
  <View style={styles.container}>
    <PageHeader title="ZeroGaspy" subtitle="Connexion" />
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView ...>
        {/* contenu existant */}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);
```

Dans les styles, `container`: `flex: 1, backgroundColor: COLORS.secondary.cream`.

- [ ] **Étape 2 : Migrer `RegisterScreen.tsx`**

Même pattern :
```tsx
<PageHeader title="ZeroGaspy" subtitle="Créer un compte" />
```

- [ ] **Étape 3 : Migrer `ForgotPasswordScreen.tsx`**

```tsx
<PageHeader title="Mot de passe" subtitle="Réinitialisation" backButton />
```

- [ ] **Étape 4 : Vérifier visuellement les 3 écrans**

Vérifier que le clavier ne pousse pas le header vers le haut.

- [ ] **Étape 5 : Commit**

```bash
git add screens/auth/LoginScreen.tsx screens/auth/RegisterScreen.tsx screens/auth/ForgotPasswordScreen.tsx
git commit -m "feat: migrate auth screens to PageHeader (KeyboardAvoidingView pattern)"
```

---

## Vérification finale

- [ ] `npx tsc --noEmit` — aucune erreur TypeScript
- [ ] Parcourir tous les écrans dans l'app — chaque écran a le header vert
- [ ] Sur iOS et Android : vérifier les insets (notch, status bar)
- [ ] Sur les formulaires : taper dans un champ et vérifier que le clavier ne fait pas remonter le header
