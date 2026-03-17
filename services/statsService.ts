// ============================================
// STATS SERVICE
// Calcul des économies et statistiques utilisateur
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, List, UserStats, DailyStats, MonthlyStats } from '../types';
import { loadLists } from '../utils/localStorage';
import logger from '../utils/logger';

const STATS_CACHE_KEY = 'user_stats_cache';
const STREAK_KEY = 'waste_streak';

// Poids moyen estimé par catégorie (en kg)
const AVERAGE_WEIGHTS: Record<string, number> = {
  'fruits': 0.5,
  'légumes': 0.4,
  'viande': 0.3,
  'poisson': 0.3,
  'produits laitiers': 0.5,
  'boulangerie': 0.3,
  'épicerie': 0.5,
  'boissons': 1.0,
  'surgelés': 0.5,
  'conserves': 0.4,
  'default': 0.4,
};

// CO2 émis par kg de nourriture gaspillée (estimation moyenne)
const CO2_PER_KG = 2.5; // kg CO2 par kg de nourriture

/**
 * Retourne le prix réel d'un aliment (0 si non défini)
 * Seuls les aliments avec un prix défini sont comptés dans les stats d'argent
 */
function getActualPrice(item: FoodItem): number {
  // Ne compter que si un prix est explicitement défini
  if (item.price && item.price > 0) {
    return item.price;
  }
  return 0;
}

/**
 * Vérifie si un aliment a un prix défini
 */
function hasPrice(item: FoodItem): boolean {
  return !!(item.price && item.price > 0);
}

/**
 * Estime le poids d'un aliment en fonction de sa catégorie
 */
function estimateWeight(item: FoodItem): number {
  const category = item.category?.toLowerCase() || 'default';
  const baseWeight = AVERAGE_WEIGHTS[category] || AVERAGE_WEIGHTS.default;

  return baseWeight * (item.quantity || 1);
}

/**
 * Calcule les statistiques globales de l'utilisateur
 */
export async function calculateUserStats(): Promise<UserStats> {
  try {
    const lists = await loadLists();
    const allItems: FoodItem[] = lists.flatMap(list => list.items);

    // Séparer les items par statut
    const consumedItems = allItems.filter(item => item.status === 'consumed');
    const thrownItems = allItems.filter(item => item.status === 'thrown');
    const activeItems = allItems.filter(item => !item.status || item.status === 'active');

    // Calculer économies (aliments consommés AVEC prix défini uniquement)
    const consumedWithPrice = consumedItems.filter(hasPrice);
    const totalSaved = consumedWithPrice.reduce((sum, item) => sum + getActualPrice(item), 0);

    // Calculer pertes (aliments jetés AVEC prix défini uniquement)
    const thrownWithPrice = thrownItems.filter(hasPrice);
    const totalWasted = thrownWithPrice.reduce((sum, item) => sum + getActualPrice(item), 0);

    // Calculer impact environnemental
    const foodSavedKg = consumedItems.reduce((sum, item) => sum + estimateWeight(item), 0);
    const foodWastedKg = thrownItems.reduce((sum, item) => sum + estimateWeight(item), 0);
    const co2AvoidedKg = foodSavedKg * CO2_PER_KG;

    // Calculer séries (streaks)
    const { currentStreak, longestStreak, lastActivityDate } = await calculateStreaks(thrownItems, allItems);

    // Date de début = date du 1er aliment ajouté
    const periodStart = allItems.length > 0
      ? allItems.reduce((earliest, item) => {
          const itemDate = new Date(item.consumedAt || item.expirationDate);
          return itemDate < new Date(earliest) ? itemDate.toISOString() : earliest;
        }, new Date().toISOString())
      : new Date().toISOString();

    return {
      totalSaved: Math.round(totalSaved * 100) / 100,
      totalWasted: Math.round(totalWasted * 100) / 100,
      netSavings: Math.round((totalSaved - totalWasted) * 100) / 100,

      foodSavedKg: Math.round(foodSavedKg * 100) / 100,
      foodWastedKg: Math.round(foodWastedKg * 100) / 100,
      co2AvoidedKg: Math.round(co2AvoidedKg * 100) / 100,

      itemsConsumed: consumedItems.length,
      itemsThrown: thrownItems.length,
      itemsActive: activeItems.length,
      recipesUsed: 0, // À implémenter plus tard

      currentStreak,
      longestStreak,
      lastActivityDate,

      periodStart,
      periodEnd: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('Erreur calcul stats:', error.message);

    // Retourner des stats vides en cas d'erreur
    return {
      totalSaved: 0,
      totalWasted: 0,
      netSavings: 0,
      foodSavedKg: 0,
      foodWastedKg: 0,
      co2AvoidedKg: 0,
      itemsConsumed: 0,
      itemsThrown: 0,
      itemsActive: 0,
      recipesUsed: 0,
      currentStreak: 0,
      longestStreak: 0,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
    };
  }
}

/**
 * Calcule les séries (jours consécutifs sans gaspillage)
 */
async function calculateStreaks(thrownItems: FoodItem[], allItems: FoodItem[] = []): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
}> {
  try {
    // Récupérer la dernière série sauvegardée
    const savedStreak = await AsyncStorage.getItem(STREAK_KEY);
    let longestStreak = savedStreak ? parseInt(savedStreak) : 0;

    // Si aucun item jeté, la série court depuis le premier aliment ajouté
    if (thrownItems.length === 0) {
      // Trouver la date du premier item ajouté
      const firstItemDate = allItems.reduce((earliest, item) => {
        const d = new Date(item.consumedAt || item.expirationDate || Date.now());
        return d < earliest ? d : earliest;
      }, new Date());
      const daysSinceStart = Math.floor((Date.now() - firstItemDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentStreak = Math.max(0, daysSinceStart);
      longestStreak = Math.max(longestStreak, currentStreak);

      await AsyncStorage.setItem(STREAK_KEY, longestStreak.toString());

      return {
        currentStreak,
        longestStreak,
        lastActivityDate: new Date().toISOString(),
      };
    }

    // Trier items jetés par date
    const sortedThrown = thrownItems
      .filter(item => item.consumedAt)
      .sort((a, b) => new Date(a.consumedAt!).getTime() - new Date(b.consumedAt!).getTime());

    if (sortedThrown.length === 0) {
      return {
        currentStreak: 0,
        longestStreak,
      };
    }

    // Calculer la série actuelle (jours depuis dernier jet)
    const lastThrown = sortedThrown[sortedThrown.length - 1];
    const daysSinceLastThrown = Math.floor(
      (Date.now() - new Date(lastThrown.consumedAt!).getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentStreak = Math.max(0, daysSinceLastThrown);

    // Calculer la plus longue série historique
    let maxStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const item of sortedThrown) {
      const itemDate = new Date(item.consumedAt!);

      if (!lastDate) {
        tempStreak = Math.floor((itemDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      } else {
        const daysDiff = Math.floor((itemDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff > 1) {
          // Nouvelle série
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 0;
        } else {
          tempStreak += daysDiff;
        }
      }

      lastDate = itemDate;
    }

    maxStreak = Math.max(maxStreak, tempStreak, currentStreak);
    longestStreak = Math.max(longestStreak, maxStreak);

    await AsyncStorage.setItem(STREAK_KEY, longestStreak.toString());

    return {
      currentStreak,
      longestStreak,
      lastActivityDate: lastThrown.consumedAt,
    };
  } catch (error: any) {
    logger.error('Erreur calcul streaks:', error.message);
    return {
      currentStreak: 0,
      longestStreak: 0,
    };
  }
}

/**
 * Calcule les statistiques quotidiennes
 */
export async function calculateDailyStats(days: number = 30): Promise<DailyStats[]> {
  try {
    const lists = await loadLists();
    const allItems: FoodItem[] = lists.flatMap(list => list.items);

    const dailyStatsMap = new Map<string, DailyStats>();

    // Initialiser les X derniers jours
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      dailyStatsMap.set(dateKey, {
        date: dateKey,
        saved: 0,
        wasted: 0,
        itemsConsumed: 0,
        itemsThrown: 0,
      });
    }

    // Remplir avec les données réelles
    allItems.forEach(item => {
      if (!item.consumedAt) return;

      const dateKey = item.consumedAt.split('T')[0];
      const stats = dailyStatsMap.get(dateKey);

      if (stats) {
        if (item.status === 'consumed') {
          // Ne compter l'argent que si prix défini
          if (hasPrice(item)) {
            stats.saved += getActualPrice(item);
          }
          stats.itemsConsumed++;
        } else if (item.status === 'thrown') {
          // Ne compter l'argent que si prix défini
          if (hasPrice(item)) {
            stats.wasted += getActualPrice(item);
          }
          stats.itemsThrown++;
        }
      }
    });

    // Convertir en array et trier par date décroissante
    return Array.from(dailyStatsMap.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(stat => ({
        ...stat,
        saved: Math.round(stat.saved * 100) / 100,
        wasted: Math.round(stat.wasted * 100) / 100,
      }));
  } catch (error: any) {
    logger.error('Erreur calcul daily stats:', error.message);
    return [];
  }
}

/**
 * Calcule les statistiques mensuelles
 */
export async function calculateMonthlyStats(months: number = 12): Promise<MonthlyStats[]> {
  try {
    const lists = await loadLists();
    const allItems: FoodItem[] = lists.flatMap(list => list.items);

    const monthlyStatsMap = new Map<string, MonthlyStats>();

    // Initialiser les X derniers mois
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM

      monthlyStatsMap.set(monthKey, {
        month: monthKey,
        saved: 0,
        wasted: 0,
        itemsConsumed: 0,
        itemsThrown: 0,
        co2Avoided: 0,
        foodSavedKg: 0,
      });
    }

    // Remplir avec les données réelles
    allItems.forEach(item => {
      if (!item.consumedAt) return;

      const monthKey = item.consumedAt.substring(0, 7);
      const stats = monthlyStatsMap.get(monthKey);

      if (stats) {
        if (item.status === 'consumed') {
          // Ne compter l'argent que si prix défini
          if (hasPrice(item)) {
            stats.saved += getActualPrice(item);
          }
          stats.itemsConsumed++;
          const weight = estimateWeight(item);
          stats.foodSavedKg += weight;
          stats.co2Avoided += weight * CO2_PER_KG;
        } else if (item.status === 'thrown') {
          // Ne compter l'argent que si prix défini
          if (hasPrice(item)) {
            stats.wasted += getActualPrice(item);
          }
          stats.itemsThrown++;
        }
      }
    });

    // Convertir en array et trier par mois décroissant
    return Array.from(monthlyStatsMap.values())
      .sort((a, b) => b.month.localeCompare(a.month))
      .map(stat => ({
        ...stat,
        saved: Math.round(stat.saved * 100) / 100,
        wasted: Math.round(stat.wasted * 100) / 100,
        co2Avoided: Math.round(stat.co2Avoided * 100) / 100,
        foodSavedKg: Math.round(stat.foodSavedKg * 100) / 100,
      }));
  } catch (error: any) {
    logger.error('Erreur calcul monthly stats:', error.message);
    return [];
  }
}

/**
 * Met à jour la date de consommation/jet d'un item
 * À appeler quand on change le statut d'un item
 */
export function markItemWithTimestamp(item: FoodItem): FoodItem {
  return {
    ...item,
    consumedAt: new Date().toISOString(),
  };
}

/**
 * Cache les stats pour performance
 */
export async function cacheStats(stats: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
  } catch (error: any) {
    logger.error('Erreur cache stats:', error.message);
  }
}

/**
 * Récupère les stats du cache
 */
export async function getCachedStats(): Promise<UserStats | null> {
  try {
    const cached = await AsyncStorage.getItem(STATS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error: any) {
    logger.error('Erreur lecture cache stats:', error.message);
    return null;
  }
}

/**
 * Réinitialise les stats (pour testing ou nouveau départ)
 */
export async function resetStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_CACHE_KEY);
    await AsyncStorage.removeItem(STREAK_KEY);
    logger.info('Stats réinitialisées');
  } catch (error: any) {
    logger.error('Erreur reset stats:', error.message);
  }
}
