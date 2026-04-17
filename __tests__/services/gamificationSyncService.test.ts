import {
  pushGamificationToCloud,
  pullGamificationFromCloud,
  pushChallengesStateToCloud,
  pullChallengesStateFromCloud,
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
});
