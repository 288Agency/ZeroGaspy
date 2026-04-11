import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadLists } from '../utils/localStorage';
import logger from '../utils/logger';

export const DEFAULT_SAVINGS_GOAL = 50;

const SAVINGS_GOAL_KEY = '@zerogaspy_savings_goal';

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
