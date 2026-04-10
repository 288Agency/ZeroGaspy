# HomeScreen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le HomeScreen pour éliminer les stats dupliquées, rendre le hero dynamique (3 états couleur), afficher les espaces en scroll horizontal, et différencier visuellement les cards secondaires.

**Architecture:** 4 composants modifiés indépendamment — HeroSection (refonte complète), WeeklyChallengeCard (style), ProactiveRecipeCard (style), HomeScreen (nouveaux memos + scroll espaces). Les tâches sont séquentielles car HomeScreen dépend de la nouvelle interface HeroSection.

**Tech Stack:** React Native, Expo SDK 54, expo-linear-gradient (déjà installé), TypeScript, utils/designSystem.ts

**Spec:** `docs/superpowers/specs/2026-04-10-homescreen-redesign-design.md`

---

## File Map

| Fichier | Rôle dans ce plan |
|---------|------------------|
| `components/HeroSection.tsx` | Refonte complète — 3 états dynamiques, nouvelles props |
| `screens/HomeScreen.tsx` | Nouveaux memos urgentCount/expiringSoonCount, retrait StatsCardsRow + FeedbackModal, scroll espaces |
| `components/WeeklyChallengeCard.tsx` | Fond vert clair, mise à jour textes |
| `components/ProactiveRecipeCard.tsx` | Bordure ambre, chevron visible |

---

## Task 1: Refonte HeroSection — hero dynamique

**Files:**
- Modify: `components/HeroSection.tsx`

Remplacer entièrement le composant par une version à 3 états (calm/warning/urgent) basée sur les données réelles.

- [ ] **Étape 1 : Lire le fichier actuel**

  ```bash
  # Déjà lu — 156 lignes, interface à 6 props dont onFeedbackPress
  ```

- [ ] **Étape 2 : Réécrire HeroSection.tsx**

  Remplacer tout le contenu du fichier par :

  ```tsx
  import React from 'react';
  import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
  import { LinearGradient } from 'expo-linear-gradient';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import { COLORS } from '../utils/designSystem';
  import { scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

  // One-off gradient values intentionally not in design system
  const WARNING_GRADIENT = ['#C2410C', '#F97316'] as const;
  const URGENT_GRADIENT = ['#7F1D1D', '#DC2626'] as const;
  const CALM_GRADIENT = [COLORS.primary[700], '#2D5A38', COLORS.primary[500]] as const;

  type HeroState = 'calm' | 'warning' | 'urgent';

  interface HeroSectionProps {
    urgentCount: number;
    expiringSoonCount: number;
    thrownCount: number;
    freshCount: number;
    onExpiringSoonPress?: () => void;
    onThrownPress?: () => void;
  }

  export default function HeroSection({
    urgentCount,
    expiringSoonCount,
    thrownCount,
    freshCount,
    onExpiringSoonPress,
    onThrownPress,
  }: HeroSectionProps) {
    const insets = useSafeAreaInsets();

    const state: HeroState =
      urgentCount >= 1 ? 'urgent' :
      expiringSoonCount >= 1 ? 'warning' :
      'calm';

    const gradient =
      state === 'urgent' ? URGENT_GRADIENT :
      state === 'warning' ? WARNING_GRADIENT :
      CALM_GRADIENT;

    const badge = {
      urgent: { label: 'URGENCE', dot: '#FCA5A5' },
      warning: { label: 'ATTENTION REQUISE', dot: '#FCD34D' },
      calm: { label: 'TOUT VA BIEN', dot: '#4ADE80' },
    }[state];

    const headline =
      state === 'urgent'
        ? `${urgentCount} aliment${urgentCount > 1 ? 's' : ''} périment aujourd'hui`
        : state === 'warning'
        ? `${expiringSoonCount} aliment${expiringSoonCount > 1 ? 's' : ''} expirent bientôt`
        : 'Frigo bien géré 🎉';

    return (
      <LinearGradient
        colors={gradient as unknown as string[]}
        locations={state === 'calm' ? [0, 0.55, 1] : [0, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { paddingTop: insets.top + 12 }]}
      >
        {/* Decorative circle */}
        <View style={styles.decorCircle} pointerEvents="none" />

        {/* Status badge */}
        <View style={styles.badge}>
          <View style={[styles.badgeDot, { backgroundColor: badge.dot }]} />
          <Text style={styles.badgeLabel}>{badge.label}</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>{headline}</Text>

        {/* Stats inline */}
        <TouchableOpacity
          onPress={state !== 'calm' ? onExpiringSoonPress : undefined}
          activeOpacity={state !== 'calm' ? 0.7 : 1}
          style={styles.statsRow}
          accessibilityRole={state !== 'calm' ? 'button' : 'text'}
        >
          {state === 'calm' && (
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>{freshCount}</Text>
              <Text style={styles.statUnit}> frais</Text>
            </Text>
          )}
          {state === 'warning' && (
            <>
              <StatItem value={expiringSoonCount} label="expirent" />
              <View style={styles.statDivider} />
              <StatItem value={thrownCount} label="jeté(s)" />
              <View style={styles.statDivider} />
              <StatItem value={freshCount} label="frais" />
            </>
          )}
          {state === 'urgent' && (
            <>
              <StatItem value={urgentCount} label="aujourd'hui" />
              <View style={styles.statDivider} />
              <StatItem value={expiringSoonCount} label="cette sem." />
            </>
          )}
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  function StatItem({ value, label }: { value: number; label: string }) {
    return (
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{value}</Text>
        <Text style={styles.statUnit}> {label}</Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: scaleSpacing(20),
      paddingBottom: scaleSpacing(20),
      overflow: 'hidden',
    },
    decorCircle: {
      position: 'absolute',
      right: -20,
      top: -20,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 20,
      paddingHorizontal: scaleSpacing(10),
      paddingVertical: scaleSpacing(4),
      marginBottom: scaleSpacing(10),
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: scaleSpacing(5),
    },
    badgeLabel: {
      fontSize: scaleFontSize(9),
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.6,
    },
    headline: {
      fontSize: scaleFontSize(isSmallScreen ? 20 : 24),
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      lineHeight: scaleFontSize(isSmallScreen ? 26 : 30),
      marginBottom: scaleSpacing(12),
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: scaleSpacing(8),
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    statText: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    statNumber: {
      fontSize: scaleFontSize(isSmallScreen ? 18 : 20),
      fontWeight: '900',
      color: '#FFFFFF',
    },
    statUnit: {
      fontSize: scaleFontSize(9),
      color: 'rgba(255,255,255,0.65)',
    },
    statDivider: {
      width: 1,
      height: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignSelf: 'center',
    },
  });
  ```

- [ ] **Étape 3 : Vérifier TypeScript**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  Attendu : erreurs sur `HomeScreen.tsx` uniquement (onFeedbackPress manquant et urgentCount manquant) — c'est normal, sera corrigé dans Task 2.

- [ ] **Étape 4 : Commit**

  ```bash
  git add components/HeroSection.tsx
  git commit -m "feat: hero dynamique — 3 états calm/warning/urgent"
  ```

---

## Task 2: Mise à jour HomeScreen — memos + call site + scroll espaces

**Files:**
- Modify: `screens/HomeScreen.tsx`

- [ ] **Étape 1 : Mettre à jour les imports**

  Dans `screens/HomeScreen.tsx`, ligne 24 : supprimer l'import de `FeedbackModal`.
  Ligne 22 : supprimer l'import de `SpacesGrid`.
  Ajouter l'import de `LinearGradient` et `FlatList` :

  ```tsx
  import { FlatList } from 'react-native';
  import { LinearGradient } from 'expo-linear-gradient';
  ```

  L'import `StatsCardsRow` n'existe pas (il n'est pas importé dans HomeScreen — vérifier ligne 1–35).

- [ ] **Étape 2 : Supprimer le state feedbackModalVisible**

  Ligne 44, supprimer :
  ```tsx
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  ```

- [ ] **Étape 3 : Remplacer expiringSoonCount et ajouter urgentCount**

  Remplacer le memo `expiringSoonCount` existant (lignes 124–133) par les deux nouveaux memos :

  ```tsx
  const urgentCount = useMemo(() => {
    return lists.reduce((sum, list) => {
      return sum + list.items.filter(item => {
        if (item.status === 'consumed' || item.status === 'thrown') return false;
        const days = getDaysUntilExpiration(item.expirationDate);
        return days !== null && days >= 0 && days <= 1;
      }).length;
    }, 0);
  }, [lists]);

  const expiringSoonCount = useMemo(() => {
    return lists.reduce((sum, list) => {
      return sum + list.items.filter(item => {
        if (item.status === 'consumed' || item.status === 'thrown') return false;
        const days = getDaysUntilExpiration(item.expirationDate);
        return days !== null && days >= 2 && days <= 3;
      }).length;
    }, 0);
  }, [lists]);
  ```

- [ ] **Étape 4 : Mettre à jour le call site HeroSection**

  Remplacer le bloc HeroSection (lignes 159–166) par :

  ```tsx
  <HeroSection
    urgentCount={urgentCount}
    expiringSoonCount={expiringSoonCount}
    thrownCount={thrownCount}
    freshCount={freshCount}
    onExpiringSoonPress={onExpiringSoonPress}
    onThrownPress={onThrownPress}
  />
  ```

- [ ] **Étape 5 : Retirer FeedbackModal du JSX**

  Supprimer les lignes 209–213 :
  ```tsx
  {/* Feedback modal */}
  <FeedbackModal
    visible={feedbackModalVisible}
    onClose={() => setFeedbackModalVisible(false)}
  />
  ```

- [ ] **Étape 6 : Remplacer SpacesGrid par le scroll horizontal**

  Remplacer le bloc `<SpacesGrid ... />` (lignes 199–203) par le composant inline ci-dessous.

  Ajouter également l'import `getDaysUntilExpiration` est déjà présent (ligne 19).

  ```tsx
  {/* Spaces scroll horizontal */}
  <View style={styles.spacesSection}>
    <Text style={styles.sectionLabel}>MES ESPACES</Text>
    {lists.length === 0 ? (
      <TouchableOpacity
        onPress={onCreateList}
        style={styles.createSpaceButton}
        activeOpacity={0.7}
      >
        <Text style={styles.createSpaceText}>Créer un espace →</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.spacesScrollContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[...lists].sort((a, b) => {
            const urgentA = a.items.filter(i =>
              i.status !== 'consumed' && i.status !== 'thrown' &&
              (() => { const d = getDaysUntilExpiration(i.expirationDate); return d !== null && d <= 1; })()
            ).length;
            const urgentB = b.items.filter(i =>
              i.status !== 'consumed' && i.status !== 'thrown' &&
              (() => { const d = getDaysUntilExpiration(i.expirationDate); return d !== null && d <= 1; })()
            ).length;
            if (urgentA !== urgentB) return urgentB - urgentA;
            const warnA = a.items.filter(i =>
              i.status !== 'consumed' && i.status !== 'thrown' &&
              (() => { const d = getDaysUntilExpiration(i.expirationDate); return d !== null && d >= 2 && d <= 3; })()
            ).length;
            const warnB = b.items.filter(i =>
              i.status !== 'consumed' && i.status !== 'thrown' &&
              (() => { const d = getDaysUntilExpiration(i.expirationDate); return d !== null && d >= 2 && d <= 3; })()
            ).length;
            return warnB - warnA;
          })}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.spacesScrollContent}
          renderItem={({ item: list }) => {
            const spaceUrgent = list.items.filter(i =>
              i.status !== 'consumed' && i.status !== 'thrown' &&
              (() => { const d = getDaysUntilExpiration(i.expirationDate); return d !== null && d <= 1; })()
            ).length;
            const spaceWarn = list.items.filter(i =>
              i.status !== 'consumed' && i.status !== 'thrown' &&
              (() => { const d = getDaysUntilExpiration(i.expirationDate); return d !== null && d >= 2 && d <= 3; })()
            ).length;
            const spaceState = spaceUrgent > 0 ? 'urgent' : spaceWarn > 0 ? 'warning' : 'calm';
            const borderColor =
              spaceState === 'urgent' ? 'rgba(220,38,38,0.25)' :
              spaceState === 'warning' ? 'rgba(251,146,60,0.35)' :
              'rgba(60,110,71,0.12)';
            const barColor =
              spaceState === 'urgent' ? '#DC2626' :
              spaceState === 'warning' ? '#FB923C' :
              COLORS.status.fresh;
            const subText =
              spaceState === 'urgent' ? `${spaceUrgent} périment 🚨` :
              spaceState === 'warning' ? `${spaceWarn} expirent ⚠️` :
              `${list.items.filter(i => i.status !== 'consumed' && i.status !== 'thrown').length} alim.`;
            const subColor =
              spaceState === 'urgent' ? '#DC2626' :
              spaceState === 'warning' ? '#FB923C' :
              COLORS.text.tertiary;

            return (
              <TouchableOpacity
                style={[styles.spaceCard, { borderColor }]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('InventoryList', { listId: list.id })}
              >
                <Text style={styles.spaceCardName} numberOfLines={1}>
                  {list.emoji ? `${list.emoji} ` : ''}{list.name}
                </Text>
                <Text style={[styles.spaceCardSub, { color: subColor }]} numberOfLines={1}>
                  {subText}
                </Text>
                <View style={styles.spaceCardBar}>
                  <View style={[styles.spaceCardBarFill, { backgroundColor: barColor }]} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <LinearGradient
          colors={['transparent', COLORS.surface.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.spacesFade, { pointerEvents: 'none' }]}
        />
      </View>
    )}
  </View>
  ```

- [ ] **Étape 7 : Ajouter les styles manquants**

  Dans le `StyleSheet.create({...})` de HomeScreen, ajouter :

  ```tsx
  spacesSection: {
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  sectionLabel: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    color: COLORS.primary[500],
    letterSpacing: 0.5,
    marginBottom: scaleSpacing(8),
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
  },
  spacesScrollContainer: {
    position: 'relative',
  },
  spacesScrollContent: {
    gap: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    paddingRight: scaleSpacing(isSmallScreen ? 48 : 56), // extra right padding for fade hint
  },
  spaceCard: {
    width: scaleSpacing(120),
    height: scaleSpacing(64),
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    padding: scaleSpacing(10),
    justifyContent: 'space-between',
  },
  spaceCardName: {
    fontSize: scaleFontSize(11),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  spaceCardSub: {
    fontSize: scaleFontSize(9),
  },
  spaceCardBar: {
    height: 2,
    backgroundColor: 'rgba(60,110,71,0.12)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  spaceCardBarFill: {
    height: '100%',
    width: '60%',
    borderRadius: 1,
  },
  spacesFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
  },
  createSpaceButton: {
    paddingVertical: scaleSpacing(10),
  },
  createSpaceText: {
    fontSize: scaleFontSize(13),
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  ```

  Aussi ajouter `TouchableOpacity` aux imports React Native si pas déjà présent.

- [ ] **Étape 8 : Vérifier TypeScript**

  ```bash
  npx tsc --noEmit 2>&1 | head -30
  ```

  Attendu : 0 erreur.

- [ ] **Étape 9 : Commit**

  ```bash
  git add screens/HomeScreen.tsx
  git commit -m "feat: HomeScreen — urgentCount, scroll espaces horizontal, retrait FeedbackModal"
  ```

---

## Task 3: WeeklyChallengeCard — fond vert clair

**Files:**
- Modify: `components/WeeklyChallengeCard.tsx`

- [ ] **Étape 1 : Mettre à jour les styles**

  Dans `WeeklyChallengeCard.tsx`, modifier les styles suivants :

  **`container`** — remplacer `backgroundColor` et shadow :
  ```tsx
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginTop: scaleSpacing(isSmallScreen ? 12 : 16),
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
    borderWidth: 1,
    borderColor: 'rgba(60, 110, 71, 0.15)',
    ...SHADOWS.sm,
  },
  ```

  **`iconContainer`** — changer le background :
  ```tsx
  iconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(60,110,71,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ```

  **`title`** — changer la couleur :
  ```tsx
  title: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 15),
    fontWeight: '600',
    color: COLORS.primary[700],
    marginBottom: 2,
  },
  ```

  **`progressBarBg`** :
  ```tsx
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(60, 110, 71, 0.15)',
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  ```

  **`progressText`** :
  ```tsx
  progressText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: COLORS.text.tertiary,
    minWidth: 30,
    textAlign: 'right',
  },
  ```

  **`completionText`** :
  ```tsx
  completionText: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  ```

  **`chevron`** — changer la couleur :
  ```tsx
  chevron: {
    fontSize: 24,
    color: COLORS.primary[500],
    fontWeight: '300',
  },
  ```

  **Ajouter le label "DÉFI DE LA SEMAINE"** dans le JSX, juste avant `<Text style={styles.title}>` (ligne ~55) :
  ```tsx
  <Text style={styles.sectionLabel}>DÉFI DE LA SEMAINE</Text>
  <Text style={styles.title} numberOfLines={1}>
    {allCompleted ? ... : ...}
  </Text>
  ```

  Ajouter le style correspondant :
  ```tsx
  sectionLabel: {
    fontSize: scaleFontSize(9),
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  ```

- [ ] **Étape 2 : Vérifier TypeScript**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```

  Attendu : 0 erreur.

- [ ] **Étape 3 : Commit**

  ```bash
  git add components/WeeklyChallengeCard.tsx
  git commit -m "feat: WeeklyChallengeCard — fond vert clair, textes sombres"
  ```

---

## Task 4: ProactiveRecipeCard — accent ambre

**Files:**
- Modify: `components/ProactiveRecipeCard.tsx`

- [ ] **Étape 1 : Mettre à jour les styles**

  Dans `ProactiveRecipeCard.tsx`, modifier :

  **`container`** :
  ```tsx
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    ...SHADOWS.sm,
  },
  ```

  **`sectionTitle`** (label "RECETTE SUGGÉRÉE") :
  ```tsx
  sectionTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  ```

  **`chevronContainer`** — ajouter un fond visible :
  ```tsx
  chevronContainer: {
    marginLeft: scaleSpacing(8),
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.sm,
    padding: scaleSpacing(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ```

  Mettre à jour la couleur de l'icône chevron dans le JSX (ligne 134) :
  ```tsx
  <Ionicons name="chevron-forward" size={scaleSize(18)} color="#92400E" />
  ```

- [ ] **Étape 2 : Vérifier TypeScript**

  ```bash
  npx tsc --noEmit 2>&1 | head -20
  ```

  Attendu : 0 erreur.

- [ ] **Étape 3 : Commit**

  ```bash
  git add components/ProactiveRecipeCard.tsx
  git commit -m "feat: ProactiveRecipeCard — bordure ambre, chevron visible"
  ```

---

## Task 5: Vérification finale

- [ ] **Étape 1 : TypeScript clean**

  ```bash
  npx tsc --noEmit
  ```

  Attendu : aucune sortie (0 erreur).

- [ ] **Étape 2 : Checklist de succès**

  Vérifier visuellement dans le simulateur ou via Expo Go :

  - [ ] Hero vert quand 0 expirations imminentes
  - [ ] Hero orange quand ≥1 aliment expire dans 2–3 jours
  - [ ] Hero rouge quand ≥1 aliment expire aujourd'hui ou demain
  - [ ] Stats non dupliquées (StatsCardsRow absent)
  - [ ] Scroll horizontal espaces fonctionne
  - [ ] Card urgente apparaît en premier dans le scroll
  - [ ] WeeklyChallengeCard : fond vert clair, texte lisible
  - [ ] ProactiveRecipeCard : bordure ambre visible
  - [ ] 0 crash TypeScript

- [ ] **Étape 3 : Démarrer Expo pour vérification visuelle**

  ```bash
  npx expo start
  ```

- [ ] **Étape 4 : Commit final si ajustements**

  ```bash
  git add -p
  git commit -m "fix: ajustements visuels homescreen redesign"
  ```
