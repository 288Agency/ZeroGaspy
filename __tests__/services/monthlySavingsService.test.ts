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
      expect(result).toBe(5.0);
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
      expect(result).toBeGreaterThan(0);
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
