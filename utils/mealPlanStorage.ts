import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealPlanEntry, MealSlot } from '../types';
import logger from './logger';

const MEAL_PLANS_KEY = 'meal_plans';
const SHOPPING_CHECKED_KEY = 'shopping_list_checked';

export async function loadMealPlans(): Promise<MealPlanEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MEAL_PLANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    logger.error('Error loading meal plans:', error);
    return [];
  }
}

async function saveMealPlans(entries: MealPlanEntry[]): Promise<void> {
  await AsyncStorage.setItem(MEAL_PLANS_KEY, JSON.stringify(entries));
}

export async function addMealPlan(
  date: string,
  slot: MealSlot,
  recipeId: string
): Promise<MealPlanEntry> {
  const entries = await loadMealPlans();
  const entry: MealPlanEntry = {
    id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    slot,
    recipeId,
    createdAt: new Date().toISOString(),
  };
  // One recipe per slot per day — replace any existing entry for that slot
  const filtered = entries.filter(e => !(e.date === date && e.slot === slot));
  await saveMealPlans([...filtered, entry]);
  return entry;
}

export async function removeMealPlan(id: string): Promise<void> {
  const entries = await loadMealPlans();
  await saveMealPlans(entries.filter(e => e.id !== id));
}

export async function clearMealPlansBefore(isoDate: string): Promise<void> {
  const entries = await loadMealPlans();
  await saveMealPlans(entries.filter(e => e.date >= isoDate));
}

export async function loadCheckedShoppingItems(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SHOPPING_CHECKED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCheckedShoppingItems(ingredients: string[]): Promise<void> {
  await AsyncStorage.setItem(SHOPPING_CHECKED_KEY, JSON.stringify(ingredients));
}
