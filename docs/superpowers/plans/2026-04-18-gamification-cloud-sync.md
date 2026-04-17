# Gamification Cloud Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persister XP, niveau, badges, streaks et challenges dans Supabase pour survivre à une réinstallation ou un changement de device.

**Architecture:** Local-first inchangé — `AsyncStorage` reste la source de vérité pour l'UX (pas de latence). Après chaque écriture locale, push asynchrone vers Supabase (fire-and-forget, non-bloquant). Au login, pull du cloud, merge avec local (on prend toujours le meilleur des deux pour ne jamais perdre de progression), puis save et push.

**Tech Stack:** React Native + TypeScript, Supabase (PostgreSQL + JSONB), AsyncStorage, Jest

---

## Vue d'ensemble des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260418_gamification_sync.sql` | Table `user_gamification` + RLS |
| `services/supabase/gamificationSyncService.ts` | push, pull, merge (gamification + challenges) |
| `__tests__/services/gamificationSyncService.test.ts` | Tests TDD du merge (logique critique) |
| `contexts/AuthContext.tsx` | Appel `syncGamificationOnLogin` dans le handler SIGNED_IN |
| `contexts/GamificationContext.tsx` | Push après chaque `handleResult()` |

---

## Task 1 — Migration SQL : table user_gamification

**Files:**
- Create: `supabase/migrations/20260418_gamification_sync.sql`

- [ ] **Étape 1 : Créer le fichier de migration**

Contenu exact de `supabase/migrations/20260418_gamification_sync.sql` :

```sql
-- Stockage cloud de la progression gamification
-- Un row par utilisateur (upsert, pas d'historique)

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  challenges  JSONB DEFAULT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour ORDER BY updated_at (logs admin futurs)
CREATE INDEX IF NOT EXISTS idx_user_gamification_updated
  ON user_gamification (updated_at DESC);

-- RLS : chaque utilisateur ne voit que sa propre ligne
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_gamification_self"
  ON user_gamification
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_user_gamification_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_gamification_updated_at
  BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_user_gamification_updated_at();
```

- [ ] **Étape 2 : Appliquer la migration**

Via le MCP Supabase :
```
mcp__plugin_supabase_supabase__apply_migration
  project_id: jiyhldfgztzknkccuidq
  name: gamification_sync
  query: [contenu SQL ci-dessus]
```

Expected : migration appliquée sans erreur, table visible dans Supabase.

- [ ] **Étape 3 : Vérifier la table**

```
mcp__plugin_supabase_supabase__execute_sql
  project_id: jiyhldfgztzknkccuidq
  query: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_gamification';
```

Expected : colonnes `user_id`, `data`, `challenges`, `updated_at`.

- [ ] **Étape 4 : Commit**

```bash
git add supabase/migrations/20260418_gamification_sync.sql
git commit -m "feat: migration SQL table user_gamification pour sync cloud"
```

---

## Task 2 — gamificationSyncService : push + pull

**Files:**
- Create: `services/supabase/gamificationSyncService.ts`
- Create: `__tests__/services/gamificationSyncService.test.ts` (tests push/pull uniquement)

- [ ] **Étape 1 : Créer le fichier de service**

Contenu exact de `services/supabase/gamificationSyncService.ts` :

> **Note :** Tous les imports du fichier sont définis ici dès le départ. Les Tasks 3 et 4 ajouteront du code (fonctions), pas de nouveaux imports.

```typescript
import { supabase } from '../../config/supabase';
import {
  UserGamification,
  UserBadge,
  getLevelFromXp,
  getGamificationData,
  saveGamificationData,
} from '../gamificationService';
import {
  WeeklyChallengesState,
  ChallengeProgress,
  WeeklyHistory,
  getOrInitChallenges,
  saveChallengesState,
} from '../challengeService';
import logger from '../../utils/logger';

/**
 * Pousse la progression gamification vers Supabase (upsert).
 * Fire-and-forget — ne jamais await dans l'UI.
 */
export async function pushGamificationToCloud(
  userId: string,
  data: UserGamification
): Promise<void> {
  const { error } = await supabase
    .from('user_gamification')
    .upsert(
      { user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    logger.warn('[GamificationSync] Push gamification error:', error.message);
  }
}

/**
 * Tire la progression gamification depuis Supabase.
 * Retourne null si pas de données cloud.
 */
export async function pullGamificationFromCloud(
  userId: string
): Promise<UserGamification | null> {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.warn('[GamificationSync] Pull gamification error:', error.message);
    return null;
  }

  return (data?.data as UserGamification) ?? null;
}

/**
 * Pousse l'état des challenges hebdomadaires vers Supabase.
 */
export async function pushChallengesStateToCloud(
  userId: string,
  state: WeeklyChallengesState
): Promise<void> {
  const { error } = await supabase
    .from('user_gamification')
    .upsert(
      { user_id: userId, challenges: state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    logger.warn('[GamificationSync] Push challenges error:', error.message);
  }
}

/**
 * Tire l'état des challenges hebdomadaires depuis Supabase.
 * Retourne null si pas de données cloud.
 */
export async function pullChallengesStateFromCloud(
  userId: string
): Promise<WeeklyChallengesState | null> {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('challenges')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.warn('[GamificationSync] Pull challenges error:', error.message);
    return null;
  }

  return (data?.challenges as WeeklyChallengesState) ?? null;
}
```

- [ ] **Étape 2 : Écrire les tests push/pull**

Créer `__tests__/services/gamificationSyncService.test.ts` :

```typescript
import {
  pushGamificationToCloud,
  pullGamificationFromCloud,
  pushChallengesStateToCloud,
  pullChallengesStateFromCloud,
} from '../../services/supabase/gamificationSyncService';
import { supabase } from '../../config/supabase';

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn() },
}));

describe('gamificationSyncService', () => {
  const userId = 'user-123';

  beforeEach(() => jest.clearAllMocks());

  describe('pullGamificationFromCloud', () => {
    it('retourne null si pas de donnees cloud', async () => {
      const result = await pullGamificationFromCloud(userId);
      expect(result).toBeNull();
    });

    it('retourne les donnees si presentes', async () => {
      const mockData = { totalXp: 500, level: 3 };
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { data: mockData },
              error: null,
            }),
          })),
        })),
      });

      const result = await pullGamificationFromCloud(userId);
      expect(result).toEqual(mockData);
    });

    it('retourne null en cas d erreur Supabase', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'network error' },
            }),
          })),
        })),
      });

      const result = await pullGamificationFromCloud(userId);
      expect(result).toBeNull();
    });
  });

  describe('pushGamificationToCloud', () => {
    it('appelle upsert avec user_id et data', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

      const data = { totalXp: 100 } as any;
      await pushGamificationToCloud(userId, data);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: userId, data }),
        { onConflict: 'user_id' }
      );
    });
  });
});
```

- [ ] **Étape 3 : Lancer les tests**

```bash
npx jest __tests__/services/gamificationSyncService.test.ts --no-coverage
```

Expected : PASS (4 tests).

- [ ] **Étape 4 : Commit**

```bash
git add services/supabase/gamificationSyncService.ts __tests__/services/gamificationSyncService.test.ts
git commit -m "feat: gamificationSyncService push/pull vers Supabase"
```

---

## Task 3 — mergeGamificationData : logique de fusion (TDD)

**Files:**
- Modify: `services/supabase/gamificationSyncService.ts` (ajouter `mergeGamificationData` et `mergeChallengesState`)
- Modify: `__tests__/services/gamificationSyncService.test.ts` (ajouter tests merge)

C'est la partie la plus critique : ne jamais perdre de progression.

**Règles de merge `UserGamification` :**
- `totalXp` → `Math.max(local.totalXp, cloud.totalXp)`
- `level`, `xp`, `xpToNextLevel` → recalculer depuis `totalXp` via `getLevelFromXp()`
- `badges` → union par `badgeId` (local gagne si doublon — plus récent)
- `stats.totalFoodsAdded/Consumed/Thrown/Saved/RecipesViewed/ListsCreated/daysActive` → `Math.max(local, cloud)` pour chaque champ
- `stats.lastActiveDate` → prendre la plus récente (comparaison ISO string)
- `streaks.longestNoWaste`, `streaks.longestDaily` → `Math.max`
- `streaks.currentNoWaste`, `streaks.currentDaily` → prendre local (calculé aujourd'hui)
- `streaks.lastNoWasteDate`, `streaks.lastDailyDate` → prendre la plus récente
- `streakFreezes` → prendre local (état le plus récent)

**Règles de merge `WeeklyChallengesState` :**
- Si `local.weekKey === cloud.weekKey` : merger les challenges (par `challengeId`, prendre `currentValue` max)
- Si weekKey différent : garder local (c'est la semaine active)
- `history` → union par weekKey, garder `completedCount` le plus élevé

- [ ] **Étape 1 : Écrire les tests de merge qui échouent**

Ajouter dans `__tests__/services/gamificationSyncService.test.ts` :

```typescript
import {
  // ... existing imports
  mergeGamificationData,
  mergeChallengesState,
} from '../../services/supabase/gamificationSyncService';
import { getLevelFromXp } from '../../services/gamificationService';

// Mock getLevelFromXp pour simplifier les assertions
jest.mock('../../services/gamificationService', () => ({
  getLevelFromXp: jest.fn((xp: number) => ({ level: 1, xp, xpToNextLevel: 100 })),
}));

describe('mergeGamificationData', () => {
  const makeGamification = (overrides: Partial<any> = {}): any => ({
    level: 1, xp: 0, xpToNextLevel: 100, totalXp: 0,
    badges: [],
    stats: {
      totalFoodsAdded: 0, totalFoodsConsumed: 0, totalFoodsThrown: 0,
      totalFoodsSaved: 0, totalRecipesViewed: 0, totalListsCreated: 0,
      daysActive: 0, lastActiveDate: '',
    },
    streaks: {
      currentNoWaste: 0, longestNoWaste: 0,
      currentDaily: 0, longestDaily: 0,
      lastNoWasteDate: '', lastDailyDate: '',
    },
    streakFreezes: { available: 0, lastWeeklyGrant: '', usedThisWeek: 0, totalUsed: 0 },
    ...overrides,
  });

  it('prend le totalXp maximum', () => {
    const local = makeGamification({ totalXp: 300 });
    const cloud = makeGamification({ totalXp: 500 });
    const merged = mergeGamificationData(local, cloud);
    expect(merged.totalXp).toBe(500);
  });

  it('ne diminue jamais le totalXp (local gagne si plus haut)', () => {
    const local = makeGamification({ totalXp: 800 });
    const cloud = makeGamification({ totalXp: 200 });
    const merged = mergeGamificationData(local, cloud);
    expect(merged.totalXp).toBe(800);
  });

  it('union les badges (local + cloud sans doublon)', () => {
    const local = makeGamification({
      badges: [{ badgeId: 'saver_10', unlockedAt: '2026-04-01T00:00:00Z', progress: 10, isNew: false }],
    });
    const cloud = makeGamification({
      badges: [
        { badgeId: 'saver_10', unlockedAt: '2026-03-01T00:00:00Z', progress: 10, isNew: false },
        { badgeId: 'explorer_5', unlockedAt: '2026-03-15T00:00:00Z', progress: 5, isNew: false },
      ],
    });
    const merged = mergeGamificationData(local, cloud);
    expect(merged.badges).toHaveLength(2);
    // local gagne pour saver_10 (plus récent)
    const saver = merged.badges.find((b: any) => b.badgeId === 'saver_10');
    expect(saver?.unlockedAt).toBe('2026-04-01T00:00:00Z');
    // explorer_5 récupéré depuis cloud
    expect(merged.badges.find((b: any) => b.badgeId === 'explorer_5')).toBeDefined();
  });

  it('prend le maximum pour chaque stat', () => {
    const local = makeGamification({ stats: { totalFoodsAdded: 10, totalFoodsConsumed: 5, totalFoodsThrown: 2, totalFoodsSaved: 3, totalRecipesViewed: 1, totalListsCreated: 0, daysActive: 7, lastActiveDate: '2026-04-18' } });
    const cloud = makeGamification({ stats: { totalFoodsAdded: 15, totalFoodsConsumed: 3, totalFoodsThrown: 1, totalFoodsSaved: 8, totalRecipesViewed: 4, totalListsCreated: 2, daysActive: 5, lastActiveDate: '2026-04-10' } });
    const merged = mergeGamificationData(local, cloud);
    expect(merged.stats.totalFoodsAdded).toBe(15);
    expect(merged.stats.totalFoodsConsumed).toBe(5);
    expect(merged.stats.totalFoodsSaved).toBe(8);
    expect(merged.stats.daysActive).toBe(7);
    expect(merged.stats.lastActiveDate).toBe('2026-04-18'); // plus récente
  });

  it('prend les longestStreaks maximum mais garde les currentStreaks locaux', () => {
    const local = makeGamification({
      streaks: { currentNoWaste: 5, longestNoWaste: 5, currentDaily: 3, longestDaily: 3, lastNoWasteDate: '2026-04-18', lastDailyDate: '2026-04-18' },
    });
    const cloud = makeGamification({
      streaks: { currentNoWaste: 0, longestNoWaste: 30, currentDaily: 0, longestDaily: 14, lastNoWasteDate: '2026-03-01', lastDailyDate: '2026-03-01' },
    });
    const merged = mergeGamificationData(local, cloud);
    expect(merged.streaks.longestNoWaste).toBe(30); // cloud a le meilleur record
    expect(merged.streaks.longestDaily).toBe(14);
    expect(merged.streaks.currentNoWaste).toBe(5); // local (aujourd'hui)
    expect(merged.streaks.currentDaily).toBe(3);   // local (aujourd'hui)
  });

  it('garde les streakFreezes locaux', () => {
    const local = makeGamification({ streakFreezes: { available: 2, lastWeeklyGrant: '2026-W16', usedThisWeek: 1, totalUsed: 3 } });
    const cloud = makeGamification({ streakFreezes: { available: 0, lastWeeklyGrant: '2026-W10', usedThisWeek: 0, totalUsed: 1 } });
    const merged = mergeGamificationData(local, cloud);
    expect(merged.streakFreezes.available).toBe(2);
    expect(merged.streakFreezes.lastWeeklyGrant).toBe('2026-W16');
  });
});

describe('mergeChallengesState', () => {
  const makeState = (weekKey: string, challenges: any[], history: any[] = []): any => ({
    weekKey,
    challenges,
    history,
  });

  it('garde local si weekKey different (cloud est perime)', () => {
    const local = makeState('2026-W16', [{ challengeId: 'save_5', currentValue: 3, completed: false }]);
    const cloud = makeState('2026-W15', [{ challengeId: 'save_5', currentValue: 5, completed: true }]);
    const merged = mergeChallengesState(local, cloud);
    expect(merged.weekKey).toBe('2026-W16');
    expect(merged.challenges[0].currentValue).toBe(3);
  });

  it('merge challenges si meme weekKey (prend currentValue max)', () => {
    const local = makeState('2026-W16', [
      { challengeId: 'save_5', currentValue: 3, completed: false },
      { challengeId: 'add_5', currentValue: 5, completed: true },
    ]);
    const cloud = makeState('2026-W16', [
      { challengeId: 'save_5', currentValue: 5, completed: true },
      { challengeId: 'add_5', currentValue: 2, completed: false },
    ]);
    const merged = mergeChallengesState(local, cloud);
    expect(merged.weekKey).toBe('2026-W16');
    const save5 = merged.challenges.find((c: any) => c.challengeId === 'save_5');
    expect(save5?.currentValue).toBe(5);
    expect(save5?.completed).toBe(true);
    const add5 = merged.challenges.find((c: any) => c.challengeId === 'add_5');
    expect(add5?.currentValue).toBe(5); // local gagne
  });

  it('union history avec completedCount max par weekKey', () => {
    const local = makeState('2026-W16', [], [
      { weekKey: '2026-W15', completedCount: 2, totalXpEarned: 300 },
    ]);
    const cloud = makeState('2026-W16', [], [
      { weekKey: '2026-W15', completedCount: 3, totalXpEarned: 450 },
      { weekKey: '2026-W14', completedCount: 1, totalXpEarned: 75 },
    ]);
    const merged = mergeChallengesState(local, cloud);
    expect(merged.history).toHaveLength(2);
    const w15 = merged.history.find((h: any) => h.weekKey === '2026-W15');
    expect(w15?.completedCount).toBe(3); // cloud a le meilleur
    expect(merged.history.find((h: any) => h.weekKey === '2026-W14')).toBeDefined();
  });
});
```

- [ ] **Étape 2 : Lancer les tests — vérifier FAIL**

```bash
npx jest __tests__/services/gamificationSyncService.test.ts --no-coverage
```

Expected : FAIL (mergeGamificationData et mergeChallengesState non définis).

- [ ] **Étape 3 : Implémenter `mergeGamificationData` et `mergeChallengesState`**

Ajouter à la fin de `services/supabase/gamificationSyncService.ts` (tous les imports sont déjà présents depuis Task 2) :

```typescript
/**
 * Fusionne deux objets UserGamification en prenant toujours le meilleur des deux.
 * Règle : on ne perd jamais de progression (XP, badges, records de streak).
 */
export function mergeGamificationData(
  local: UserGamification,
  cloud: UserGamification
): UserGamification {
  // XP : toujours le maximum
  const totalXp = Math.max(local.totalXp, cloud.totalXp);
  const levelInfo = getLevelFromXp(totalXp);

  // Badges : union par badgeId — local gagne si doublon (plus récent)
  const badgeMap = new Map<string, UserBadge>();
  for (const badge of cloud.badges) {
    badgeMap.set(badge.badgeId, badge);
  }
  for (const badge of local.badges) {
    badgeMap.set(badge.badgeId, badge); // local écrase cloud
  }
  const badges = Array.from(badgeMap.values());

  // Stats : max par champ
  const stats = {
    totalFoodsAdded:    Math.max(local.stats.totalFoodsAdded,    cloud.stats.totalFoodsAdded),
    totalFoodsConsumed: Math.max(local.stats.totalFoodsConsumed, cloud.stats.totalFoodsConsumed),
    totalFoodsThrown:   Math.max(local.stats.totalFoodsThrown,   cloud.stats.totalFoodsThrown),
    totalFoodsSaved:    Math.max(local.stats.totalFoodsSaved,    cloud.stats.totalFoodsSaved),
    totalRecipesViewed: Math.max(local.stats.totalRecipesViewed, cloud.stats.totalRecipesViewed),
    totalListsCreated:  Math.max(local.stats.totalListsCreated,  cloud.stats.totalListsCreated),
    daysActive:         Math.max(local.stats.daysActive,         cloud.stats.daysActive),
    lastActiveDate:     local.stats.lastActiveDate >= cloud.stats.lastActiveDate
      ? local.stats.lastActiveDate
      : cloud.stats.lastActiveDate,
  };

  // Streaks : records historiques = max, actuels = local (calculés aujourd'hui)
  const streaks = {
    currentNoWaste:  local.streaks.currentNoWaste,
    longestNoWaste:  Math.max(local.streaks.longestNoWaste, cloud.streaks.longestNoWaste),
    currentDaily:    local.streaks.currentDaily,
    longestDaily:    Math.max(local.streaks.longestDaily, cloud.streaks.longestDaily),
    lastNoWasteDate: local.streaks.lastNoWasteDate >= cloud.streaks.lastNoWasteDate
      ? local.streaks.lastNoWasteDate
      : cloud.streaks.lastNoWasteDate,
    lastDailyDate:   local.streaks.lastDailyDate >= cloud.streaks.lastDailyDate
      ? local.streaks.lastDailyDate
      : cloud.streaks.lastDailyDate,
  };

  return {
    ...levelInfo,
    totalXp,
    badges,
    stats,
    streaks,
    streakFreezes: local.streakFreezes, // local = état le plus récent
  };
}

/**
 * Fusionne deux états de challenges hebdomadaires.
 * Si weekKey différent, local gagne (c'est la semaine active).
 * Si même weekKey, merge challenges (progress max) + union history.
 */
export function mergeChallengesState(
  local: WeeklyChallengesState,
  cloud: WeeklyChallengesState
): WeeklyChallengesState {
  // Semaines différentes : cloud est périmé, garder local
  if (local.weekKey !== cloud.weekKey) {
    // Récupérer quand même l'historique du cloud
    const mergedHistory = mergeHistory(local.history, cloud.history);
    return { ...local, history: mergedHistory };
  }

  // Même semaine : merger les challenges (currentValue max)
  const challengeMap = new Map<string, ChallengeProgress>();
  for (const c of cloud.challenges) {
    challengeMap.set(c.challengeId, c);
  }
  for (const c of local.challenges) {
    const cloudC = challengeMap.get(c.challengeId);
    if (cloudC && cloudC.currentValue > c.currentValue) {
      challengeMap.set(c.challengeId, cloudC);
    } else {
      challengeMap.set(c.challengeId, c);
    }
  }
  const challenges = Array.from(challengeMap.values());

  return {
    weekKey: local.weekKey,
    challenges,
    history: mergeHistory(local.history, cloud.history),
  };
}

function mergeHistory(
  localHistory: WeeklyHistory[],
  cloudHistory: WeeklyHistory[]
): WeeklyHistory[] {
  const historyMap = new Map<string, WeeklyHistory>();
  for (const h of cloudHistory) {
    historyMap.set(h.weekKey, h);
  }
  for (const h of localHistory) {
    const cloudH = historyMap.get(h.weekKey);
    if (!cloudH || h.completedCount >= cloudH.completedCount) {
      historyMap.set(h.weekKey, h);
    }
  }
  return Array.from(historyMap.values()).sort((a, b) =>
    b.weekKey.localeCompare(a.weekKey)
  );
}
```

**Important :** L'import de `getLevelFromXp` et des types doit être ajouté en haut du fichier (pas en double — vérifier que l'import n'existe pas déjà). Ajouter à la ligne 2 :

```typescript
import { UserGamification, UserBadge, getLevelFromXp } from '../gamificationService';
import { WeeklyChallengesState, ChallengeProgress, WeeklyHistory } from '../challengeService';
```

- [ ] **Étape 4 : Lancer les tests — vérifier PASS**

```bash
npx jest __tests__/services/gamificationSyncService.test.ts --no-coverage
```

Expected : PASS (tous les tests).

- [ ] **Étape 5 : Commit**

```bash
git add services/supabase/gamificationSyncService.ts __tests__/services/gamificationSyncService.test.ts
git commit -m "feat: mergeGamificationData + mergeChallengesState (TDD)"
```

---

## Task 4 — AuthContext : pull + restore au login

**Files:**
- Modify: `contexts/AuthContext.tsx:91-110`

Au `SIGNED_IN`, après les syncs existants, pull la progression cloud, merge avec local, sauvegarder.

- [ ] **Étape 1 : Ajouter la fonction `syncGamificationOnLogin` dans gamificationSyncService.ts**

Ajouter à la fin de `services/supabase/gamificationSyncService.ts` (tous les imports sont déjà présents depuis Task 2) :

```typescript
/**
 * Sync complète au login :
 * 1. Pull cloud
 * 2. Merge avec local (on garde toujours le meilleur)
 * 3. Save local mergé
 * 4. Push le résultat vers cloud
 */
export async function syncGamificationOnLogin(userId: string): Promise<void> {
  try {
    // ─── Gamification (XP, badges, streaks) ───
    const [local, cloud] = await Promise.all([
      getGamificationData(),
      pullGamificationFromCloud(userId),
    ]);

    if (cloud) {
      const merged = mergeGamificationData(local, cloud);
      await saveGamificationData(merged);
      await pushGamificationToCloud(userId, merged);
    } else {
      // Première connexion : push local vers cloud
      await pushGamificationToCloud(userId, local);
    }

    // ─── Challenges (semaine en cours + historique) ───
    const [localChallengesResult, cloudChallenges] = await Promise.all([
      getOrInitChallenges(),
      pullChallengesStateFromCloud(userId),
    ]);

    if (cloudChallenges) {
      const mergedChallenges = mergeChallengesState(
        localChallengesResult.state,
        cloudChallenges
      );
      await saveChallengesState(mergedChallenges);
      await pushChallengesStateToCloud(userId, mergedChallenges);
    } else {
      await pushChallengesStateToCloud(userId, localChallengesResult.state);
    }

    logger.debug('[GamificationSync] Sync login terminée');
  } catch (err) {
    logger.warn('[GamificationSync] Erreur sync login:', err);
    // Silencieux — ne pas bloquer le login
  }
}
```

**Note :** `saveChallengesState` doit exister dans `challengeService.ts`. Vérifier avec :
```bash
grep -n "saveChallengesState\|setChallengesState\|AsyncStorage.setItem" services/challengeService.ts | head -5
```

Si la fonction s'appelle autrement, adapter le nom. Si elle n'est pas exportée, l'exporter.

- [ ] **Étape 2 : Vérifier/exporter `saveChallengesState` dans challengeService.ts**

Chercher dans `services/challengeService.ts` la fonction qui écrit `CHALLENGES_KEY` dans AsyncStorage (ligne ~429). Elle s'appelle probablement `saveChallengesState` ou similaire. Si pas exportée, l'exporter.

```bash
grep -n "async function\|export function\|export async" services/challengeService.ts | head -20
```

- [ ] **Étape 3 : Modifier AuthContext.tsx**

Dans `contexts/AuthContext.tsx`, dans le handler `SIGNED_IN` (lignes 91-110), ajouter l'import en haut du fichier :

```typescript
import { syncGamificationOnLogin } from '../services/supabase/gamificationSyncService';
```

Puis dans le `Promise.all` du `SIGNED_IN` handler, ajouter :

```typescript
// Remplacer :
await Promise.all([
  syncData(),
  syncRecipeData(),
  assignAndStoreVariant(userId),
  initCloudNotificationPrefs(userId),
  completeReferral(userId),
  syncBonusScanCredits(userId),
]);

// Par :
await Promise.all([
  syncData(),
  syncRecipeData(),
  assignAndStoreVariant(userId),
  initCloudNotificationPrefs(userId),
  completeReferral(userId),
  syncBonusScanCredits(userId),
  syncGamificationOnLogin(userId),
]);
```

- [ ] **Étape 4 : Lancer les tests existants pour détecter toute régression**

```bash
npx jest --no-coverage --testPathIgnorePatterns="\.worktrees" 2>&1 | grep -E "^(PASS|FAIL|Tests:)"
```

Expected : même résultat qu'avant (7 PASS, 3 FAIL pré-existants).

- [ ] **Étape 5 : Commit**

```bash
git add services/supabase/gamificationSyncService.ts services/challengeService.ts contexts/AuthContext.tsx
git commit -m "feat: syncGamificationOnLogin au SIGNED_IN (pull + merge + push)"
```

---

## Task 5 — GamificationContext : push après chaque action

**Files:**
- Modify: `contexts/GamificationContext.tsx`

Après chaque `handleResult()`, pousser la progression à jour vers Supabase (fire-and-forget).

- [ ] **Étape 1 : Ajouter l'import dans GamificationContext.tsx**

En haut de `contexts/GamificationContext.tsx`, ajouter :

```typescript
import {
  pushGamificationToCloud,
  pushChallengesStateToCloud,
} from '../services/supabase/gamificationSyncService';
```

- [ ] **Étape 2 : Modifier `handleResult` pour push async**

Dans `contexts/GamificationContext.tsx`, modifier la fonction `handleResult` (ligne ~116) :

```typescript
// AVANT :
const handleResult = async (result: GamificationResult) => {
  const data = await getGamificationData();
  setGamificationData(data);
  // ...
};

// APRÈS : ajouter le push après setGamificationData
const handleResult = async (result: GamificationResult) => {
  const data = await getGamificationData();
  setGamificationData(data);

  // Push cloud (fire-and-forget — ne jamais bloquer l'UI)
  if (user) {
    pushGamificationToCloud(user.id, data).catch((e: unknown) =>
      logger.warn('[GamificationContext] Push error:', e)
    );
  }

  // ... reste du code (toasts) inchangé
};
```

- [ ] **Étape 3 : Ajouter `logger` si pas déjà importé**

Vérifier que `logger` est importé dans `GamificationContext.tsx` :
```bash
grep -n "import logger" contexts/GamificationContext.tsx
```

Si absent, ajouter :
```typescript
import logger from '../utils/logger';
```

- [ ] **Étape 4 : Push challenges après `handleChallengeCompletions`**

Dans `contexts/GamificationContext.tsx`, dans le bloc `if (completions.length > 0)` de `handleChallengeCompletions` (ligne ~174), `getOrInitChallenges()` est déjà appelé (ligne ~178 : `const { state: cState } = await getOrInitChallenges()`). Réutiliser cette variable pour le push — ne pas appeler `getOrInitChallenges()` une seconde fois. Modifier ce bloc existant :

```typescript
  if (completions.length > 0) {
    const data = await getGamificationData();
    setGamificationData(data);

    const { state: cState } = await getOrInitChallenges();
    const allCompleted = cState.challenges.length === 3 &&
      cState.challenges.every(c => c.completed);
    if (allCompleted) {
      setShowConfetti(true);
    }

    // Push challenges cloud (fire-and-forget) — réutilise cState déjà chargé
    if (user) {
      pushChallengesStateToCloud(user.id, cState).catch((e: unknown) =>
        logger.warn('[GamificationContext] Push challenges error:', e)
      );
    }
  }
```

- [ ] **Étape 5 : Lancer tous les tests**

```bash
npx jest --no-coverage --testPathIgnorePatterns="\.worktrees" 2>&1 | grep -E "^(PASS|FAIL|Tests:)"
```

Expected : même résultat qu'avant (pas de régression).

- [ ] **Étape 6 : Commit**

```bash
git add contexts/GamificationContext.tsx
git commit -m "feat: push gamification/challenges cloud après chaque action (fire-and-forget)"
```

---

## Vérification finale

- [ ] **Lancer tous les tests**

```bash
npx jest --no-coverage --testPathIgnorePatterns="\.worktrees"
```

Expected : PASS sur tous les tests liés à ce sprint (gamificationSyncService), pas de nouvelle régression.

- [ ] **Test manuel : simuler une réinstallation**

1. Login sur l'app → générer de l'XP (ajouter un aliment)
2. Vérifier dans Supabase que la ligne `user_gamification` existe :
   ```
   mcp__plugin_supabase_supabase__execute_sql
     query: SELECT user_id, data->>'totalXp' as xp, updated_at FROM user_gamification LIMIT 5;
   ```
3. Effacer AsyncStorage (ou tester sur un second device)
4. Se reconnecter → vérifier que l'XP est restauré

---

## Résumé des commits attendus

```
feat: migration SQL table user_gamification pour sync cloud
feat: gamificationSyncService push/pull vers Supabase
feat: mergeGamificationData + mergeChallengesState (TDD)
feat: syncGamificationOnLogin au SIGNED_IN (pull + merge + push)
feat: push gamification/challenges cloud après chaque action (fire-and-forget)
```
