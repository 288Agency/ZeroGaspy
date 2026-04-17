import {
  pushGamificationToCloud,
  pullGamificationFromCloud,
  pushChallengesStateToCloud,
  pullChallengesStateFromCloud,
  mergeGamificationData,
  mergeChallengesState,
} from '../../services/supabase/gamificationSyncService';
import { supabase } from '../../config/supabase';

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock des dépendances de gamificationSyncService qui ne sont pas testées ici
jest.mock('../../services/gamificationService', () => ({
  getLevelFromXp: jest.fn((xp: number) => ({ level: 1, xp, xpToNextLevel: 100 })),
  getGamificationData: jest.fn(),
  saveGamificationData: jest.fn(),
}));

jest.mock('../../services/challengeService', () => ({
  getOrInitChallenges: jest.fn(),
  saveChallengesState: jest.fn(),
}));

describe('gamificationSyncService', () => {
  const userId = 'user-123';

  beforeEach(() => jest.clearAllMocks());

  describe('pullGamificationFromCloud', () => {
    it('retourne null si pas de donnees cloud', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });
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

  describe('pullChallengesStateFromCloud', () => {
    it('retourne null si pas de donnees challenges', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      });
      const result = await pullChallengesStateFromCloud(userId);
      expect(result).toBeNull();
    });
  });

  describe('pushChallengesStateToCloud', () => {
    it('appelle upsert avec user_id et challenges', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

      const state = { weekKey: '2026-W16', challenges: [], history: [] } as any;
      await pushChallengesStateToCloud(userId, state);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: userId, challenges: state }),
        { onConflict: 'user_id' }
      );
    });
  });
});

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
    const saver = merged.badges.find((b: any) => b.badgeId === 'saver_10');
    expect(saver?.unlockedAt).toBe('2026-04-01T00:00:00Z');
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
    expect(merged.stats.lastActiveDate).toBe('2026-04-18');
  });

  it('prend les longestStreaks maximum mais garde les currentStreaks locaux', () => {
    const local = makeGamification({
      streaks: { currentNoWaste: 5, longestNoWaste: 5, currentDaily: 3, longestDaily: 3, lastNoWasteDate: '2026-04-18', lastDailyDate: '2026-04-18' },
    });
    const cloud = makeGamification({
      streaks: { currentNoWaste: 0, longestNoWaste: 30, currentDaily: 0, longestDaily: 14, lastNoWasteDate: '2026-03-01', lastDailyDate: '2026-03-01' },
    });
    const merged = mergeGamificationData(local, cloud);
    expect(merged.streaks.longestNoWaste).toBe(30);
    expect(merged.streaks.longestDaily).toBe(14);
    expect(merged.streaks.currentNoWaste).toBe(5);
    expect(merged.streaks.currentDaily).toBe(3);
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
    expect(add5?.currentValue).toBe(5);
  });

  it('recupere un challenge present uniquement dans le cloud (meme weekKey)', () => {
    const local = makeState('2026-W16', [
      { challengeId: 'save_5', currentValue: 3, completed: false },
    ]);
    const cloud = makeState('2026-W16', [
      { challengeId: 'save_5', currentValue: 1, completed: false },
      { challengeId: 'cloud_only', currentValue: 4, completed: false },
    ]);
    const merged = mergeChallengesState(local, cloud);
    expect(merged.challenges).toHaveLength(2);
    expect(merged.challenges.find((c: any) => c.challengeId === 'cloud_only')).toBeDefined();
    // save_5 : local gagne (currentValue 3 > 1)
    expect(merged.challenges.find((c: any) => c.challengeId === 'save_5')?.currentValue).toBe(3);
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
    expect(w15?.completedCount).toBe(3);
    expect(merged.history.find((h: any) => h.weekKey === '2026-W14')).toBeDefined();
  });
});
