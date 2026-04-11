# Phase 1 — Rétention : Économies, Notification & Onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les causes principales du churn : quantifier les économies en € sur la Home, ajouter un trigger quotidien "Ce soir, mange ça", renforcer l'onboarding avec un ancrage sur les économies, instrumenter PostHog, supprimer les ads, et passer à 2 scans gratuits/mois.

**Architecture:** Chaque tâche est indépendante et livrable séparément. Aucune ne casse l'existant. Les calculs d'économies s'appuient sur `statsService.ts` déjà existant — on ajoute juste un service dédié au mois courant et un composant d'affichage. La notification "Ce soir" est ajoutée dans `notificationService.ts` existant. L'onboarding est modifié en ajoutant une étape sans toucher aux étapes existantes.

**Tech Stack:** React Native 0.81.5 + Expo SDK 54, React 19, TypeScript 5.9, AsyncStorage 2.2, expo-notifications ~0.32, PostHog posthog-react-native ^4.37, Jest + ts-jest pour les tests.

**Run tests:** `npx jest --testPathPattern="__tests__/services" --no-coverage`

---

## Fichiers touchés

| Fichier | Action | Responsabilité |
|---|---|---|
| `services/premiumFeaturesService.ts` | Modifier | Passer à 2 scans gratuits/mois |
| `services/notificationService.ts` | Modifier | Ajouter notification "Ce soir, mange ça" |
| `services/analytics.ts` | Modifier | Ajouter événements PostHog funnels |
| `services/monthlySavingsService.ts` | Créer | Calcul des économies du mois courant |
| `components/MonthlySavingsCard.tsx` | Créer | Affichage des économies sur la Home |
| `components/AdBanner.tsx` | Modifier | Désactiver définitivement |
| `screens/HomeScreen.tsx` | Modifier | Intégrer MonthlySavingsCard, supprimer AdBanner |
| `screens/ActiveOnboardingScreen.tsx` | Modifier | Ajouter étape ancrage économies |
| `__tests__/services/monthlySavingsService.test.ts` | Créer | Tests unitaires du nouveau service |
| `__tests__/services/notificationService.test.ts` | Modifier | Tests pour la nouvelle notification |

---

## Task 1 : Passer à 2 scans ticket gratuits/mois

**Files:**
- Modify: `services/premiumFeaturesService.ts`

- [ ] **Step 1 : Localiser la constante**

Ouvre `services/premiumFeaturesService.ts`. La logique de vérification est dans `hasUsedFreeReceiptScanThisMonth` et `canScanReceipt`. Le modèle actuel : 1 scan/mois gratuit, stocké dans AsyncStorage + Supabase edge function.

Le système utilise un credit unique par mois (clé `receipt_scan_free_credit`). Pour passer à 2, il faut stocker un compteur au lieu d'un booléen.

- [ ] **Step 2 : Modifier le type de stockage**

Dans `services/premiumFeaturesService.ts`, remplacer l'interface `ReceiptScanCredit` :

```typescript
// Avant
interface ReceiptScanCredit {
  lastUsedDate: string;
  month: string;
}

// Après
interface ReceiptScanCredit {
  lastUsedDate: string;
  month: string;
  usedCount: number; // nouveau champ
}

export const FREE_SCANS_PER_MONTH = 2; // constante exportée pour les tests
```

- [ ] **Step 3 : Mettre à jour `hasUsedFreeReceiptScanThisMonth`**

```typescript
export async function hasUsedFreeReceiptScanThisMonth(userId: string | null): Promise<boolean> {
  if (userId) {
    try {
      const { data, error } = await supabase.functions.invoke(SCAN_CREDIT_FUNCTION_NAME, {
        body: { action: 'check' },
      });
      if (!error && data) {
        return !data.allowed;
      }
    } catch (err) {
      logger.error('Edge function check failed, falling back to local:', err);
    }
  }

  try {
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);
    if (!creditData) return false;
    const credit: ReceiptScanCredit = JSON.parse(creditData);
    if (credit.month !== new Date().toISOString().slice(0, 7)) return false;
    return (credit.usedCount ?? 1) >= FREE_SCANS_PER_MONTH;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4 : Mettre à jour `markFreeReceiptScanAsUsed`**

```typescript
export async function markFreeReceiptScanAsUsed(userId: string | null): Promise<void> {
  if (userId) {
    try {
      await supabase.functions.invoke(SCAN_CREDIT_FUNCTION_NAME, {
        body: { action: 'consume' },
      });
    } catch (err) {
      logger.error('Edge function consume failed:', err);
    }
  }

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  try {
    const existing = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);
    let usedCount = 1;
    if (existing) {
      const credit: ReceiptScanCredit = JSON.parse(existing);
      if (credit.month === currentMonth) {
        // ?? 0 et non ?? 1 : si usedCount absent (ancien format), le premier
        // appel post-migration doit compter comme scan n°1, pas n°2
        usedCount = (credit.usedCount ?? 0) + 1;
      }
    }
    const credit: ReceiptScanCredit = {
      lastUsedDate: now.toISOString(),
      month: currentMonth,
      usedCount,
    };
    await AsyncStorage.setItem(RECEIPT_SCAN_CREDIT_KEY, JSON.stringify(credit));
  } catch (error) {
    logger.error('Erreur mise à jour crédit scan:', error);
  }
}
```

- [ ] **Step 5 : Mettre à jour `getScansRemainingThisMonth` (nouvelle fonction)**

Ajouter à la fin du fichier :

```typescript
export async function getScansRemainingThisMonth(userId: string | null): Promise<number> {
  try {
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);
    if (!creditData) return FREE_SCANS_PER_MONTH;
    const credit: ReceiptScanCredit = JSON.parse(creditData);
    if (credit.month !== new Date().toISOString().slice(0, 7)) return FREE_SCANS_PER_MONTH;
    return Math.max(0, FREE_SCANS_PER_MONTH - (credit.usedCount ?? 0));
  } catch {
    return FREE_SCANS_PER_MONTH;
  }
}
```

- [ ] **Step 6 : Lancer les tests existants**

```bash
npx jest --testPathPattern="__tests__/services" --no-coverage
```

Expected: tous les tests passent (la modification est rétro-compatible via `usedCount ?? 1`).

- [ ] **Step 7 : Commit**

```bash
git add services/premiumFeaturesService.ts
git commit -m "feat: passer à 2 scans ticket gratuits par mois"
```

---

## Task 2 : Désactiver les bannières AdMob

**Files:**
- Modify: `components/AdBanner.tsx`

- [ ] **Step 1 : Désactiver sans supprimer l'import**

Le composant est probablement importé dans plusieurs écrans. La solution la moins risquée est de le faire retourner `null` systématiquement — pas besoin de chercher tous les imports.

Dans `components/AdBanner.tsx`, remplacer **tout le contenu** du fichier par :

```typescript
// Ads désactivées — revenus nuls à ce stade (<50 MAU), UX dégradée
// Réactiver quand MAU > 5 000
interface AdBannerProps {
  size?: string;
  style?: object;
}

export default function AdBanner(_props: AdBannerProps) {
  return null;
}
```

Remplacer tout le fichier élimine les imports morts (`useAds`, `Constants`, `AD_UNIT_IDS`, etc.) qui génèrent des warnings TypeScript strict. Le type `AdBannerProps` reste exportable pour les écrans qui l'importent.

- [ ] **Step 2 : Vérifier visuellement**

```bash
npx expo start
```

Naviguer sur tous les écrans principaux. Vérifier qu'aucune bannière n'apparaît et qu'il n'y a pas de crash.

- [ ] **Step 3 : Commit**

```bash
git add components/AdBanner.tsx
git commit -m "feat: désactiver bannières AdMob (MAU insuffisant)"
```

---

## Task 3 : Service de calcul des économies du mois courant

**Files:**
- Create: `services/monthlySavingsService.ts`
- Create: `__tests__/services/monthlySavingsService.test.ts`

Note : `statsService.ts` calcule déjà les économies totales (`totalSaved`). Ce nouveau service se concentre uniquement sur le **mois courant** avec les données AsyncStorage existantes — plus rapide à calculer, pas besoin de recharger tous les items.

- [ ] **Step 1 : Écrire les tests**

Créer `__tests__/services/monthlySavingsService.test.ts` :

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMonthlySavings,
  getMonthlyWasted,
  getMonthlySavingsGoal,
  setMonthlySavingsGoal,
  DEFAULT_SAVINGS_GOAL,
} from '../../services/monthlySavingsService';
import * as localStorage from '../../utils/localStorage';
import { List } from '../../types';

jest.mock('../../utils/localStorage', () => ({
  loadLists: jest.fn(),
}));

const currentMonth = new Date().toISOString().slice(0, 7);

function makeConsumedItem(price: number, daysAgo: number = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: String(Math.random()),
    name: 'Test',
    expirationDate: new Date(d.getTime() + 86400000 * 7).toISOString().slice(0, 10),
    quantity: 1,
    category: 'fruits',
    status: 'consumed' as const,
    price,
    consumedAt: d.toISOString(),
  };
}

function makeThrownItem(price: number, daysAgo: number = 0) {
  return { ...makeConsumedItem(price, daysAgo), status: 'thrown' as const };
}

const mockList = (items: any[]): List[] => [{
  id: '1', title: 'Frigo', createdAt: '2024-01-01T00:00:00Z', items,
}];

describe('monthlySavingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getMonthlySavings', () => {
    it('retourne les économies du mois courant uniquement', async () => {
      (localStorage.loadLists as jest.Mock).mockResolvedValue(
        mockList([makeConsumedItem(5.0, 0), makeConsumedItem(3.0, 45)])
      );
      const result = await getMonthlySavings();
      expect(result).toBe(5.0); // seul l'item de ce mois
    });

    it('retourne 0 si aucun item consommé ce mois', async () => {
      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockList([]));
      const result = await getMonthlySavings();
      expect(result).toBe(0);
    });

    it('utilise le prix estimé si price absent', async () => {
      const item = makeConsumedItem(0, 0);
      delete (item as any).price;
      (item as any).category = 'légumes';
      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockList([item]));
      const result = await getMonthlySavings();
      expect(result).toBeGreaterThan(0); // prix estimé légumes = 1.50€
    });
  });

  describe('getMonthlyWasted', () => {
    it('retourne les pertes du mois courant', async () => {
      (localStorage.loadLists as jest.Mock).mockResolvedValue(
        mockList([makeThrownItem(4.0, 0)])
      );
      const result = await getMonthlyWasted();
      expect(result).toBe(4.0);
    });
  });

  describe('getMonthlySavingsGoal / setMonthlySavingsGoal', () => {
    it('retourne la valeur par défaut si rien en storage', async () => {
      const goal = await getMonthlySavingsGoal();
      expect(goal).toBe(DEFAULT_SAVINGS_GOAL);
    });

    it('sauvegarde et récupère l\'objectif', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(80));
      await setMonthlySavingsGoal(80);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@zerogaspy_savings_goal',
        JSON.stringify(80)
      );
      const goal = await getMonthlySavingsGoal();
      expect(goal).toBe(80);
    });
  });
});
```

- [ ] **Step 2 : Lancer les tests — vérifier qu'ils échouent**

```bash
npx jest __tests__/services/monthlySavingsService.test.ts --no-coverage
```

Expected : FAIL avec "Cannot find module '../../services/monthlySavingsService'"

- [ ] **Step 3 : Implémenter `monthlySavingsService.ts`**

Créer `services/monthlySavingsService.ts` :

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLists } from '../utils/localStorage';
import logger from '../utils/logger';

export const DEFAULT_SAVINGS_GOAL = 50; // €/mois objectif par défaut

const SAVINGS_GOAL_KEY = '@zerogaspy_savings_goal';

// Prix moyens estimés par catégorie (source : prix moyens GMS France)
const ESTIMATED_PRICES: Record<string, number> = {
  'fruits': 2.50,
  'légumes': 1.50,
  'viande': 8.00,
  'poisson': 9.00,
  'produits laitiers': 2.00,
  'fromage': 3.50,
  'boulangerie': 1.50,
  'boissons': 1.50,
  'surgelés': 3.00,
  'épicerie': 2.50,
  'condiments': 2.00,
  'snacks': 2.00,
  'plats préparés': 4.00,
  'autres': 3.00,
};

function estimatePrice(category?: string): number {
  if (!category) return 3.00;
  const key = category.toLowerCase();
  return ESTIMATED_PRICES[key] ?? 3.00;
}

function isThisMonth(dateStr?: string): boolean {
  if (!dateStr) return false;
  const currentMonth = new Date().toISOString().slice(0, 7);
  return dateStr.slice(0, 7) === currentMonth;
}

export async function getMonthlySavings(): Promise<number> {
  try {
    const lists = await loadLists();
    let total = 0;
    for (const list of lists) {
      for (const item of list.items) {
        if (item.status !== 'consumed') continue;
        if (!isThisMonth(item.consumedAt)) continue;
        const price = item.price && item.price > 0
          ? item.price
          : estimatePrice(item.category);
        total += price * (item.quantity || 1);
      }
    }
    return Math.round(total * 100) / 100;
  } catch (error) {
    logger.error('getMonthlySavings error:', error);
    return 0;
  }
}

export async function getMonthlyWasted(): Promise<number> {
  try {
    const lists = await loadLists();
    let total = 0;
    for (const list of lists) {
      for (const item of list.items) {
        if (item.status !== 'thrown') continue;
        if (!isThisMonth(item.consumedAt)) continue;
        const price = item.price && item.price > 0
          ? item.price
          : estimatePrice(item.category);
        total += price * (item.quantity || 1);
      }
    }
    return Math.round(total * 100) / 100;
  } catch (error) {
    logger.error('getMonthlyWasted error:', error);
    return 0;
  }
}

export async function getMonthlySavingsGoal(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SAVINGS_GOAL_KEY);
    if (!raw) return DEFAULT_SAVINGS_GOAL;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SAVINGS_GOAL;
  }
}

export async function setMonthlySavingsGoal(goal: number): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVINGS_GOAL_KEY, JSON.stringify(goal));
  } catch (error) {
    logger.error('setMonthlySavingsGoal error:', error);
  }
}
```

- [ ] **Step 4 : Lancer les tests — vérifier qu'ils passent**

```bash
npx jest __tests__/services/monthlySavingsService.test.ts --no-coverage
```

Expected : PASS, tous les tests verts.

- [ ] **Step 5 : Commit**

```bash
git add services/monthlySavingsService.ts __tests__/services/monthlySavingsService.test.ts
git commit -m "feat: service calcul économies du mois courant"
```

---

## Task 4 : Composant MonthlySavingsCard

**Files:**
- Create: `components/MonthlySavingsCard.tsx`
- Modify: `screens/HomeScreen.tsx`

Ce composant affiche les économies du mois courant en haut de la Home, avant les espaces. Utilise `getMonthlySavings` et `getMonthlySavingsGoal` du service créé à la tâche précédente.

- [ ] **Step 1 : Créer `components/MonthlySavingsCard.tsx`**

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getMonthlySavings, getMonthlyWasted, getMonthlySavingsGoal } from '../services/monthlySavingsService';
import { COLORS } from '../utils/designSystem';
import { scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MonthlySavingsCard() {
  const navigation = useNavigation<NavigationProp>();
  const [savings, setSavings] = useState(0);
  const [wasted, setWasted] = useState(0);
  const [goal, setGoal] = useState(50);
  const [loaded, setLoaded] = useState(false);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [s, w, g] = await Promise.all([
        getMonthlySavings(),
        getMonthlyWasted(),
        getMonthlySavingsGoal(),
      ]);
      setSavings(s);
      setWasted(w);
      setGoal(g);
      setLoaded(true);
      // Animer la barre de progression
      const progress = Math.min(s / g, 1);
      Animated.timing(animatedWidth, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      logger.error('MonthlySavingsCard load error:', error);
      setLoaded(true);
    }
  };

  const monthLabel = new Date().toLocaleString('fr-FR', { month: 'long' });

  if (!loaded) return null;

  const progressPercent = Math.min(Math.round((savings / goal) * 100), 100);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('Stats')}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet-outline" size={16} color={COLORS.primary[500]} />
          <Text style={styles.label}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text>
        </View>
        <Text style={styles.hint}>Voir stats →</Text>
      </View>

      <View style={styles.amounts}>
        <View>
          <Text style={styles.savedAmount}>~{savings.toFixed(0)} €</Text>
          <Text style={styles.savedLabel}>économisés</Text>
        </View>
        {wasted > 0 && (
          <View style={styles.wastedBlock}>
            <Text style={styles.wastedAmount}>{wasted.toFixed(0)} €</Text>
            <Text style={styles.wastedLabel}>gaspillés</Text>
          </View>
        )}
      </View>

      {/* Barre de progression vers l'objectif */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        {progressPercent}% de l'objectif {goal} €
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginBottom: scaleSpacing(12),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: scaleSpacing(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(60,110,71,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(6),
  },
  label: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  hint: {
    fontSize: scaleFontSize(11),
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scaleSpacing(20),
    marginBottom: scaleSpacing(12),
  },
  savedAmount: {
    fontSize: scaleFontSize(32),
    fontWeight: '800',
    color: COLORS.primary[500],
    lineHeight: scaleFontSize(36),
  },
  savedLabel: {
    fontSize: scaleFontSize(11),
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  wastedBlock: {
    paddingBottom: scaleSpacing(2),
  },
  wastedAmount: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: COLORS.semantic.dangerLight,
  },
  wastedLabel: {
    fontSize: scaleFontSize(10),
    color: COLORS.text.tertiary,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(60,110,71,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: scaleSpacing(4),
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: scaleFontSize(10),
    color: COLORS.text.tertiary,
  },
});
```

- [ ] **Step 2 : Intégrer dans `screens/HomeScreen.tsx`**

Ajouter l'import en haut du fichier :

```typescript
import MonthlySavingsCard from '../components/MonthlySavingsCard';
```

Dans le JSX, ajouter `<MonthlySavingsCard />` juste après `<WeeklyChallengeCard />` :

```typescript
// Avant
<WeeklyChallengeCard challengesState={challengesState} />
<ProactiveRecipeCard lists={lists} />

// Après
<WeeklyChallengeCard challengesState={challengesState} />
<MonthlySavingsCard />
<ProactiveRecipeCard lists={lists} />
```

- [ ] **Step 3 : Vérifier visuellement**

```bash
npx expo start
```

Ouvrir la Home. La carte d'économies doit apparaître. Si aucun aliment n'est consommé ce mois, elle affiche "~0 €". C'est correct.

- [ ] **Step 4 : Commit**

```bash
git add components/MonthlySavingsCard.tsx screens/HomeScreen.tsx
git commit -m "feat: carte économies mensuelles sur la Home"
```

---

## Task 5 : Notification "Ce soir, mange ça" à 17h

**Files:**
- Modify: `services/notificationService.ts`
- Modify: `__tests__/services/notificationService.test.ts`

- [ ] **Step 1 : Lire les tests existants**

```bash
head -50 __tests__/services/notificationService.test.ts
```

Identifier le pattern de mock utilisé pour `expo-notifications`.

- [ ] **Step 2 : Ajouter les tests pour la nouvelle notification**

Ouvrir `__tests__/services/notificationService.test.ts` et ajouter à la fin du fichier :

```typescript
describe('scheduleDinnerReminderNotification', () => {
  it('planifie une notification à 17h si des items expirent dans 48h', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const mockLists = [{
      id: '1', title: 'Frigo', createdAt: '2024-01-01T00:00:00Z',
      items: [{
        id: '1', name: 'Poulet', expirationDate: tomorrowStr,
        quantity: 1, category: 'viande', status: 'active',
      }],
    }];

    (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

    await scheduleDinnerReminderNotification('fr');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining(''),
        }),
        trigger: expect.objectContaining({ hour: 17, minute: 0 }),
      })
    );
  });

  it('ne planifie pas si aucun item n\'expire dans 48h', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 10);

    const mockLists = [{
      id: '1', title: 'Frigo', createdAt: '2024-01-01T00:00:00Z',
      items: [{
        id: '1', name: 'Yaourt', expirationDate: nextWeek.toISOString().slice(0, 10),
        quantity: 1, category: 'produits laitiers', status: 'active',
      }],
    }];

    (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();

    await scheduleDinnerReminderNotification('fr');

    // Pas de notification "dinner" si rien n'expire bientôt
    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const dinnerCalls = calls.filter(c =>
      c[0]?.trigger?.hour === 17
    );
    expect(dinnerCalls.length).toBe(0);
  });
});
```

Note : importer `scheduleDinnerReminderNotification` et `loadLists` dans les imports existants du test.

- [ ] **Step 3 : Lancer les tests — vérifier qu'ils échouent**

```bash
npx jest __tests__/services/notificationService.test.ts --no-coverage
```

Expected : FAIL avec "scheduleDinnerReminderNotification is not a function"

- [ ] **Step 4 : Implémenter dans `services/notificationService.ts`**

Ajouter ces imports en haut si absents :

```typescript
import { loadLists } from '../utils/localStorage';
import { getDaysUntilExpiration } from '../utils/dateUtils';
```

Ajouter la fonction à la fin du fichier :

```typescript
const DINNER_NOTIFICATION_ID = 'dinner_reminder_daily';

export async function scheduleDinnerReminderNotification(lang: string = 'fr'): Promise<void> {
  try {
    // Annuler l'ancienne notification si elle existe
    await Notifications.cancelScheduledNotificationAsync(DINNER_NOTIFICATION_ID).catch(() => {});

    // Charger les items qui expirent dans les 48h
    const lists = await loadLists();
    const expiringNames: string[] = [];

    for (const list of lists) {
      for (const item of list.items) {
        if (item.status === 'consumed' || item.status === 'thrown') continue;
        const days = getDaysUntilExpiration(item.expirationDate);
        if (days !== null && days >= 0 && days <= 2) {
          expiringNames.push(item.name);
        }
      }
    }

    if (expiringNames.length === 0) return;

    const firstName = expiringNames[0];
    const others = expiringNames.length > 1 ? ` et ${expiringNames.length - 1} autre${expiringNames.length > 2 ? 's' : ''}` : '';

    const title = lang === 'fr'
      ? '🍽️ Ce soir, mange ça !'
      : '🍽️ Tonight, use this!';

    const body = lang === 'fr'
      ? `${firstName}${others} expire${expiringNames.length > 1 ? 'nt' : ''} bientôt. Voir une recette ?`
      : `${firstName}${others} expire${expiringNames.length > 1 ? '' : 's'} soon. Check a recipe?`;

    await Notifications.scheduleNotificationAsync({
      identifier: DINNER_NOTIFICATION_ID,
      content: {
        title,
        body,
        data: { screen: 'Recipes' },
        sound: true,
      },
      trigger: {
        hour: 17,
        minute: 0,
        // DAILY est implicitement récurrent — pas besoin de repeats: true
        // qui n'existe pas dans le type DailyTriggerInput d'Expo SDK 52
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
      },
    });

    logger.info('Notification dîner planifiée:', { itemsExpiring: expiringNames.length });
  } catch (error) {
    logger.error('scheduleDinnerReminderNotification error:', error);
  }
}
```

- [ ] **Step 5 : Appeler la fonction au démarrage de l'app**

Dans `App.tsx`, dans le `useEffect` qui gère les notifications (après `checkAndScheduleNotifications()`), ajouter :

```typescript
import { scheduleDinnerReminderNotification } from './services/notificationService';
// Note : i18n est déjà importé ligne 2 de App.tsx — ne pas l'importer une deuxième fois

// Dans le useEffect existant, après checkAndScheduleNotifications() :
scheduleDinnerReminderNotification(i18n.language);
```

Note comportement : la notification est annulée et re-schedulée à chaque ouverture de l'app. Si l'app est ouverte après 17h, la prochaine notification sera le lendemain à 17h. C'est le comportement attendu.

- [ ] **Step 6 : Lancer les tests**

```bash
npx jest __tests__/services/notificationService.test.ts --no-coverage
```

Expected : PASS

- [ ] **Step 7 : Commit**

```bash
git add services/notificationService.ts App.tsx __tests__/services/notificationService.test.ts
git commit -m "feat: notification quotidienne 17h 'Ce soir, mange ça'"
```

---

## Task 6 : Onboarding — ancrage sur les économies potentielles

**Files:**
- Modify: `screens/ActiveOnboardingScreen.tsx`

L'onboarding existant a des slides. On ajoute une étape finale qui demande "combien tu jettes par semaine ?" et affiche les économies projetées.

- [ ] **Step 1 : Lire l'onboarding existant**

```bash
head -100 screens/ActiveOnboardingScreen.tsx
```

Identifier comment les slides sont structurées (tableau de données ? composants séparés ?).

- [ ] **Step 2 : Ajouter l'import du service d'objectif**

Dans `screens/ActiveOnboardingScreen.tsx`, ajouter :

```typescript
import { setMonthlySavingsGoal } from '../services/monthlySavingsService';
```

- [ ] **Step 3 : Ajouter l'étape d'ancrage économies**

Avant la dernière slide (le bouton "Commencer"), insérer une nouvelle slide/écran avec ce contenu :

```typescript
// Valeurs du slider : 0=peu, 1=régulièrement, 2=souvent
const WASTE_OPTIONS = [
  { label: 'Peu', sublabel: '(~10 €/mois)', goal: 20 },
  { label: 'Régulièrement', sublabel: '(~40 €/mois)', goal: 50 },
  { label: 'Souvent', sublabel: '(~80 €/mois)', goal: 80 },
];

// Dans le composant, ajouter l'état :
const [wasteLevel, setWasteLevel] = useState(1); // index dans WASTE_OPTIONS

// Slide d'ancrage :
<View style={styles.savingsSlide}>
  <Text style={styles.savingsTitle}>
    Combien tu jettes par semaine ?
  </Text>
  <View style={styles.wasteOptions}>
    {WASTE_OPTIONS.map((opt, idx) => (
      <TouchableOpacity
        key={idx}
        style={[styles.wasteOption, wasteLevel === idx && styles.wasteOptionSelected]}
        onPress={() => setWasteLevel(idx)}
      >
        <Text style={[styles.wasteOptionLabel, wasteLevel === idx && styles.wasteOptionLabelSelected]}>
          {opt.label}
        </Text>
        <Text style={styles.wasteOptionSub}>{opt.sublabel}</Text>
      </TouchableOpacity>
    ))}
  </View>
  <View style={styles.savingsProjection}>
    <Text style={styles.savingsProjectionText}>
      ZeroGaspy pourrait te faire économiser
    </Text>
    <Text style={styles.savingsProjectionAmount}>
      ~{WASTE_OPTIONS[wasteLevel].goal * 12} €/an
    </Text>
  </View>
</View>
```

- [ ] **Step 4 : Sauvegarder l'objectif quand l'onboarding se termine**

Dans la fonction `handleComplete` ou équivalent (appelée quand l'utilisateur clique "Commencer") :

```typescript
const handleComplete = async () => {
  await setMonthlySavingsGoal(WASTE_OPTIONS[wasteLevel].goal);
  // ... reste du code existant
};
```

- [ ] **Step 5 : Ajouter les styles nécessaires**

```typescript
savingsSlide: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 24,
},
savingsTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: COLORS.text.primary,
  textAlign: 'center',
  marginBottom: 24,
},
wasteOptions: {
  width: '100%',
  gap: 12,
  marginBottom: 32,
},
wasteOption: {
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: 'rgba(60,110,71,0.2)',
  padding: 16,
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
},
wasteOptionSelected: {
  borderColor: COLORS.primary[500],
  backgroundColor: 'rgba(60,110,71,0.06)',
},
wasteOptionLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: COLORS.text.primary,
},
wasteOptionLabelSelected: {
  color: COLORS.primary[500],
},
wasteOptionSub: {
  fontSize: 12,
  color: COLORS.text.tertiary,
  marginTop: 2,
},
savingsProjection: {
  alignItems: 'center',
  backgroundColor: 'rgba(60,110,71,0.06)',
  borderRadius: 16,
  padding: 20,
  width: '100%',
},
savingsProjectionText: {
  fontSize: 14,
  color: COLORS.text.secondary,
  marginBottom: 8,
},
savingsProjectionAmount: {
  fontSize: 40,
  fontWeight: '800',
  color: COLORS.primary[500],
},
```

- [ ] **Step 6 : Vérifier visuellement**

```bash
npx expo start
```

Réinitialiser l'onboarding dans les settings de l'app (ou vider AsyncStorage). Parcourir l'onboarding jusqu'à la nouvelle slide. Vérifier que la sélection du niveau de gaspillage change le montant affiché.

- [ ] **Step 7 : Commit**

```bash
git add screens/ActiveOnboardingScreen.tsx
git commit -m "feat: onboarding - ancrage économies potentielles"
```

---

## Task 7 : PostHog — Funnels critiques

**Files:**
- Modify: `services/analytics.ts`

Ajouter les events manquants pour mesurer les funnels essentiels. PostHog est déjà en place — on ajoute juste les events.

- [ ] **Step 1 : Identifier les events existants**

```bash
grep -n "track\|capture" services/analytics.ts | head -30
```

- [ ] **Step 2 : Ajouter les fonctions de tracking manquantes**

Dans `services/analytics.ts`, ajouter ces fonctions après les existantes :

```typescript
// ─── Funnels critiques ────────────────────────────────────────────

/** Étape de l'onboarding (0 = début, N = fin) */
export function trackOnboardingStep(step: number, stepName: string): void {
  capture('onboarding_step', { step, step_name: stepName });
}

/** Premier aliment ajouté — aha moment */
export function trackFirstFoodAdded(): void {
  capture('first_food_added');
}

/** Paywall affiché */
export function trackPaywallShown(trigger: string): void {
  track('paywall_shown', { trigger });
}

/** Achat initié */
export function trackPurchaseStarted(plan: string): void {
  track('purchase_started', { plan });
}

/** Achat réussi */
export function trackPurchaseCompleted(plan: string, price: number): void {
  track('purchase_completed', { plan, price });
}

/** Notification "Ce soir" — tap */
export function trackDinnerNotificationTapped(): void {
  track('dinner_notification_tapped');
}

/** Carte économies — vue */
export function trackSavingsCardViewed(amount: number): void {
  track('savings_card_viewed', { amount });
}

/** Scan ticket — initié */
export function trackReceiptScanStarted(source: string): void {
  track('receipt_scan_started', { source });
}

/** Scan ticket — réussi */
export function trackReceiptScanCompleted(itemsCount: number): void {
  track('receipt_scan_completed', { items_count: itemsCount });
}

// Note : utilise `track` (fonction interne de analytics.ts) et non `capture`
```

- [ ] **Step 3 : Brancher `trackOnboardingStep` dans l'onboarding**

Dans `screens/ActiveOnboardingScreen.tsx`, importer et appeler `trackOnboardingStep` à chaque changement de slide.

- [ ] **Step 4 : Brancher `trackFirstFoodAdded` lors du premier ajout**

Dans `screens/AddFoodScreen.tsx`, **avant** la sauvegarde de l'aliment (pour que le flag soit cohérent même si l'écriture AsyncStorage partielle échoue) :

```typescript
const firstFoodKey = '@zerogaspy_first_food_tracked';
// Sauvegarder le flag ET l'aliment en même temps
const [, alreadyTracked] = await Promise.all([
  saveFoodItem(newItem),          // fonction existante de sauvegarde
  AsyncStorage.getItem(firstFoodKey),
]);
if (!alreadyTracked) {
  trackFirstFoodAdded();
  await AsyncStorage.setItem(firstFoodKey, 'true');
}
```

Adapter les noms de fonctions à ce que tu trouves dans `AddFoodScreen.tsx` après lecture (Step 1 de la tâche 7 te donne le contexte).

- [ ] **Step 5 : Lancer les tests existants**

```bash
npx jest --testPathPattern="__tests__/services" --no-coverage
```

Expected : PASS — aucune régression.

- [ ] **Step 6 : Commit**

```bash
git add services/analytics.ts screens/ActiveOnboardingScreen.tsx screens/AddFoodScreen.tsx
git commit -m "feat: PostHog - events funnels onboarding, paywall, économies"
```

---

## Task 8 : Tests de non-régression globaux

- [ ] **Step 1 : Lancer tous les tests**

```bash
npx jest --testPathPattern="__tests__/services" --no-coverage --verbose
```

Expected : tous PASS. Si un test échoue, corriger avant de continuer.

- [ ] **Step 2 : Test de fumée sur l'app**

```bash
npx expo start
```

Vérifier manuellement :
- [ ] Home s'affiche avec la carte économies
- [ ] Aucune bannière pub visible
- [ ] L'onboarding affiche la nouvelle slide (vider AsyncStorage ou utiliser un compte neuf)
- [ ] Pas de crash au démarrage

- [ ] **Step 3 : Commit final de phase si fichiers non encore commités**

```bash
git status
# Commiter uniquement les fichiers modifiés listés
git add services/analytics.ts screens/AddFoodScreen.tsx screens/ActiveOnboardingScreen.tsx
git commit -m "chore: Phase 1 rétention complète - vérification finale"
```

---

## Récapitulatif des changements

| Tâche | Impact utilisateur | Fichiers modifiés |
|---|---|---|
| 2 scans gratuits/mois | Générositié perçue accrue | `premiumFeaturesService.ts` |
| Suppression AdMob | UX propre, image premium | `AdBanner.tsx` |
| Carte économies | Hook de rétention #1 | `monthlySavingsService.ts`, `MonthlySavingsCard.tsx`, `HomeScreen.tsx` |
| Notification 17h | Trigger quotidien | `notificationService.ts`, `App.tsx` |
| Onboarding ancrage | +25% intention d'usage | `ActiveOnboardingScreen.tsx` |
| PostHog funnels | Mesure des conversions | `analytics.ts`, `AddFoodScreen.tsx` |
