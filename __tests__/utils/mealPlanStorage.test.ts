import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadMealPlans,
  addMealPlan,
  removeMealPlan,
  clearMealPlansBefore,
  loadCheckedShoppingItems,
  saveCheckedShoppingItems,
} from '../../utils/mealPlanStorage';

type AsyncStorageMock = {
  setItem: jest.Mock;
  getItem: jest.Mock;
};

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  const mock = AsyncStorage as unknown as AsyncStorageMock;
  mock.getItem.mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null));
  mock.setItem.mockImplementation((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  });
});

describe('mealPlanStorage', () => {
  describe('loadMealPlans', () => {
    it('returns empty array when key is missing', async () => {
      expect(await loadMealPlans()).toEqual([]);
    });

    it('returns empty array when stored value is corrupted JSON', async () => {
      store.set('meal_plans', '{not json');
      expect(await loadMealPlans()).toEqual([]);
    });

    it('returns empty array when stored value is not an array', async () => {
      store.set('meal_plans', JSON.stringify({ foo: 'bar' }));
      expect(await loadMealPlans()).toEqual([]);
    });
  });

  describe('addMealPlan', () => {
    it('stores a new entry with generated id and createdAt', async () => {
      const entry = await addMealPlan('2026-04-24', 'lunch', 'r1');
      expect(entry.id).toMatch(/^mp_/);
      expect(entry.date).toBe('2026-04-24');
      expect(entry.slot).toBe('lunch');
      expect(entry.recipeId).toBe('r1');
      expect(new Date(entry.createdAt).toString()).not.toBe('Invalid Date');

      const all = await loadMealPlans();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(entry.id);
    });

    it('replaces existing entry for same date + slot (one recipe per slot)', async () => {
      await addMealPlan('2026-04-24', 'lunch', 'r1');
      await addMealPlan('2026-04-24', 'lunch', 'r2');
      const all = await loadMealPlans();
      expect(all).toHaveLength(1);
      expect(all[0].recipeId).toBe('r2');
    });

    it('keeps entries for different slots or days', async () => {
      await addMealPlan('2026-04-24', 'lunch', 'r1');
      await addMealPlan('2026-04-24', 'dinner', 'r2');
      await addMealPlan('2026-04-25', 'lunch', 'r3');
      const all = await loadMealPlans();
      expect(all).toHaveLength(3);
    });
  });

  describe('removeMealPlan', () => {
    it('removes the matching entry and leaves others untouched', async () => {
      const a = await addMealPlan('2026-04-24', 'lunch', 'r1');
      await addMealPlan('2026-04-24', 'dinner', 'r2');
      await removeMealPlan(a.id);
      const all = await loadMealPlans();
      expect(all).toHaveLength(1);
      expect(all[0].recipeId).toBe('r2');
    });

    it('is a no-op when id does not exist', async () => {
      await addMealPlan('2026-04-24', 'lunch', 'r1');
      await removeMealPlan('does-not-exist');
      expect((await loadMealPlans())).toHaveLength(1);
    });
  });

  describe('clearMealPlansBefore', () => {
    it('drops entries strictly before the given iso date', async () => {
      await addMealPlan('2026-04-22', 'lunch', 'old');
      await addMealPlan('2026-04-24', 'lunch', 'today');
      await addMealPlan('2026-04-26', 'dinner', 'future');
      await clearMealPlansBefore('2026-04-24');
      const all = await loadMealPlans();
      const recipeIds = all.map(e => e.recipeId).sort();
      expect(recipeIds).toEqual(['future', 'today']);
    });
  });

  describe('checked shopping items', () => {
    it('round-trips an array of ingredient keys', async () => {
      await saveCheckedShoppingItems(['tomate', 'oignon']);
      expect(await loadCheckedShoppingItems()).toEqual(['tomate', 'oignon']);
    });

    it('returns empty array when nothing stored', async () => {
      expect(await loadCheckedShoppingItems()).toEqual([]);
    });

    it('returns empty array when stored value is not an array', async () => {
      store.set('shopping_list_checked', JSON.stringify('oops'));
      expect(await loadCheckedShoppingItems()).toEqual([]);
    });
  });
});
