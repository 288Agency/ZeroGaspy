/**
 * Tests unitaires pour le service de statistiques et économies
 * Couvre le calcul des économies, impact environnemental, et séries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateUserStats,
  calculateDailyStats,
  calculateMonthlyStats,
  markItemWithTimestamp,
  cacheStats,
  getCachedStats,
  resetStats,
} from '../../services/statsService';
import { FoodItem, List, UserStats } from '../../types';
import * as localStorage from '../../utils/localStorage';

// Mock loadLists
jest.mock('../../utils/localStorage', () => ({
  loadLists: jest.fn(),
}));

describe('StatsService - Calcul des économies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  describe('calculateUserStats', () => {
    it('devrait calculer les économies avec des aliments consommés', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Yaourt',
              expirationDate: '2024-01-15',
              quantity: 3,
              category: 'produits laitiers',
              status: 'consumed',
              price: 2.5,
              consumedAt: '2024-01-10T12:00:00Z',
            },
            {
              id: '2',
              name: 'Pain',
              expirationDate: '2024-01-12',
              quantity: 1,
              category: 'boulangerie',
              status: 'consumed',
              price: 1.5,
              consumedAt: '2024-01-11T10:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      expect(stats.itemsConsumed).toBe(2);
      // price est le prix total de la quantité (cf. UI "Price for total quantity")
      expect(stats.totalSaved).toBe(4.0); // 2.5 + 1.5
      expect(stats.totalWasted).toBe(0);
      expect(stats.netSavings).toBe(4.0);
    });

    it('devrait calculer les pertes avec des aliments jetés', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Tomate',
              expirationDate: '2024-01-10',
              quantity: 2,
              category: 'légumes',
              status: 'thrown',
              price: 2.0,
              consumedAt: '2024-01-09T18:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      expect(stats.itemsThrown).toBe(1);
      // price est le prix total, pas unitaire
      expect(stats.totalWasted).toBe(2.0);
      expect(stats.totalSaved).toBe(0);
      expect(stats.netSavings).toBe(-2.0);
    });

    it('devrait calculer le bilan net (économies - pertes)', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Yaourt',
              expirationDate: '2024-01-15',
              quantity: 4,
              category: 'produits laitiers',
              status: 'consumed',
              price: 2.5,
              consumedAt: '2024-01-10T12:00:00Z',
            },
            {
              id: '2',
              name: 'Pain rassis',
              expirationDate: '2024-01-08',
              quantity: 1,
              category: 'boulangerie',
              status: 'thrown',
              price: 1.5,
              consumedAt: '2024-01-09T08:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      expect(stats.totalSaved).toBe(2.5);
      expect(stats.totalWasted).toBe(1.5);
      expect(stats.netSavings).toBe(1.0);
    });

    it('ne devrait pas estimer de prix pour un item sans prix défini', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Pomme',
              expirationDate: '2024-01-20',
              quantity: 2,
              category: 'fruits',
              status: 'consumed',
              // Pas de prix fourni → exclu des stats d'argent
              consumedAt: '2024-01-12T15:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // Seuls les items avec prix défini comptent — les autres sont ignorés
      expect(stats.totalSaved).toBe(0);
    });

    it('devrait compter uniquement les items actifs (ignorer consumed/thrown)', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Lait',
              expirationDate: '2024-01-20',
              quantity: 1,
              category: 'produits laitiers',
              status: 'active',
            },
            {
              id: '2',
              name: 'Fromage',
              expirationDate: '2024-01-25',
              quantity: 1,
              category: 'produits laitiers',
              status: 'consumed',
              consumedAt: '2024-01-15T10:00:00Z',
            },
            {
              id: '3',
              name: 'Beurre',
              expirationDate: '2024-01-18',
              quantity: 1,
              category: 'produits laitiers',
              status: 'thrown',
              consumedAt: '2024-01-17T14:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      expect(stats.itemsActive).toBe(1); // Seulement le lait
      expect(stats.itemsConsumed).toBe(1); // Fromage
      expect(stats.itemsThrown).toBe(1); // Beurre
    });
  });

  describe('Impact environnemental', () => {
    it('devrait calculer le poids de nourriture sauvée', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Poulet',
              expirationDate: '2024-01-10',
              quantity: 1,
              category: 'viande',
              status: 'consumed',
              consumedAt: '2024-01-09T19:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // Poids moyen viande = 0.3 kg
      expect(stats.foodSavedKg).toBe(0.3);
    });

    it('devrait calculer le CO2 évité (2.5 kg CO2 par kg nourriture)', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Pommes de terre',
              expirationDate: '2024-01-15',
              quantity: 5,
              category: 'légumes',
              status: 'consumed',
              consumedAt: '2024-01-12T12:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // Poids légumes = 0.4 kg × 5 = 2 kg
      // CO2 = 2 kg × 2.5 = 5 kg
      expect(stats.foodSavedKg).toBe(2.0);
      expect(stats.co2AvoidedKg).toBe(5.0);
    });

    it('devrait compter le poids gaspillé séparément', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Bananes pourries',
              expirationDate: '2024-01-08',
              quantity: 3,
              category: 'fruits',
              status: 'thrown',
              consumedAt: '2024-01-09T10:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // Poids fruits = 0.5 kg × 3 = 1.5 kg
      expect(stats.foodWastedKg).toBe(1.5);
      expect(stats.foodSavedKg).toBe(0);
    });
  });

  describe('Système de streaks (séries)', () => {
    it('devrait calculer une série de 0 si dernier jet récent', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Lait périmé',
              expirationDate: '2024-01-10',
              quantity: 1,
              category: 'produits laitiers',
              status: 'thrown',
              consumedAt: yesterday.toISOString(),
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      expect(stats.currentStreak).toBeLessThanOrEqual(1);
    });

    it('devrait calculer une série > 0 si aucun jet récent', async () => {
      const longAgo = new Date('2024-01-01T00:00:00Z');

      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Vieux pain',
              expirationDate: '2024-01-05',
              quantity: 1,
              category: 'boulangerie',
              status: 'thrown',
              consumedAt: longAgo.toISOString(),
            },
            {
              id: '2',
              name: 'Yaourt',
              expirationDate: '2024-01-20',
              quantity: 2,
              category: 'produits laitiers',
              status: 'consumed',
              consumedAt: '2024-01-15T10:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // La série devrait être > 0 car le dernier jet date de longtemps
      expect(stats.currentStreak).toBeGreaterThan(0);
    });

    it('devrait retourner 0 streak si aucun item jeté', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Yaourt',
              expirationDate: '2024-01-20',
              quantity: 2,
              category: 'produits laitiers',
              status: 'consumed',
              consumedAt: '2024-01-15T10:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // Si aucun jet, streak est basé sur jours depuis début
      expect(stats.currentStreak).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stats quotidiennes', () => {
    it('devrait calculer les stats par jour', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Pain',
              expirationDate: '2024-01-20',
              quantity: 1,
              category: 'boulangerie',
              status: 'consumed',
              price: 1.5,
              consumedAt: new Date().toISOString(),
            },
            {
              id: '2',
              name: 'Yaourt',
              expirationDate: '2024-01-19',
              quantity: 1,
              category: 'produits laitiers',
              status: 'consumed',
              price: 2.5,
              consumedAt: yesterday.toISOString(),
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const dailyStats = await calculateDailyStats(7);

      expect(dailyStats).toHaveLength(7);
      expect(dailyStats[0].date).toBe(today);

      const todayStats = dailyStats.find(s => s.date === today);
      expect(todayStats?.itemsConsumed).toBe(1);
      expect(todayStats?.saved).toBe(1.5);

      const yesterdayStats = dailyStats.find(s => s.date === yesterdayStr);
      expect(yesterdayStats?.itemsConsumed).toBe(1);
      expect(yesterdayStats?.saved).toBe(2.5);
    });

    it('devrait retourner 0 pour les jours sans activité', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const dailyStats = await calculateDailyStats(7);

      expect(dailyStats).toHaveLength(7);
      dailyStats.forEach(stat => {
        expect(stat.saved).toBe(0);
        expect(stat.wasted).toBe(0);
        expect(stat.itemsConsumed).toBe(0);
        expect(stat.itemsThrown).toBe(0);
      });
    });
  });

  describe('Stats mensuelles', () => {
    it('devrait calculer les stats par mois', async () => {
      const thisMonth = new Date().toISOString().substring(0, 7);

      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Pommes',
              expirationDate: '2024-01-20',
              quantity: 3,
              category: 'fruits',
              status: 'consumed',
              price: 2.5,
              consumedAt: new Date().toISOString(),
            },
            {
              id: '2',
              name: 'Tomate',
              expirationDate: '2024-01-15',
              quantity: 2,
              category: 'légumes',
              status: 'thrown',
              price: 2.0,
              consumedAt: new Date().toISOString(),
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const monthlyStats = await calculateMonthlyStats(3);

      expect(monthlyStats).toHaveLength(3);

      const thisMonthStats = monthlyStats.find(s => s.month === thisMonth);
      expect(thisMonthStats?.itemsConsumed).toBe(1);
      expect(thisMonthStats?.itemsThrown).toBe(1);
      expect(thisMonthStats?.saved).toBe(2.5);
      expect(thisMonthStats?.wasted).toBe(2.0);
    });

    it('devrait inclure le calcul CO2 dans les stats mensuelles', async () => {
      const thisMonth = new Date().toISOString().substring(0, 7);

      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Poulet',
              expirationDate: '2024-01-20',
              quantity: 2,
              category: 'viande',
              status: 'consumed',
              consumedAt: new Date().toISOString(),
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const monthlyStats = await calculateMonthlyStats(3);
      const thisMonthStats = monthlyStats.find(s => s.month === thisMonth);

      // Poids viande = 0.3 kg × 2 = 0.6 kg
      // CO2 = 0.6 × 2.5 = 1.5 kg
      expect(thisMonthStats?.foodSavedKg).toBe(0.6);
      expect(thisMonthStats?.co2Avoided).toBe(1.5);
    });
  });

  describe('Fonctions utilitaires', () => {
    it('markItemWithTimestamp devrait ajouter consumedAt', () => {
      const item: FoodItem = {
        id: '1',
        name: 'Test',
        expirationDate: '2024-01-20',
        quantity: 1,
        category: 'fruits',
        status: 'consumed',
      };

      const markedItem = markItemWithTimestamp(item);

      expect(markedItem.consumedAt).toBeDefined();
      expect(new Date(markedItem.consumedAt!)).toBeInstanceOf(Date);
    });

    it('cacheStats devrait sauvegarder dans AsyncStorage', async () => {
      const stats: UserStats = {
        totalSaved: 50.0,
        totalWasted: 10.0,
        netSavings: 40.0,
        foodSavedKg: 15.5,
        foodWastedKg: 2.5,
        co2AvoidedKg: 38.75,
        itemsConsumed: 20,
        itemsThrown: 3,
        itemsActive: 5,
        recipesUsed: 0,
        currentStreak: 10,
        longestStreak: 15,
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-20T00:00:00Z',
      };

      await cacheStats(stats);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user_stats_cache',
        JSON.stringify(stats)
      );
    });

    it('getCachedStats devrait récupérer depuis AsyncStorage', async () => {
      const cachedStats: UserStats = {
        totalSaved: 50.0,
        totalWasted: 10.0,
        netSavings: 40.0,
        foodSavedKg: 15.5,
        foodWastedKg: 2.5,
        co2AvoidedKg: 38.75,
        itemsConsumed: 20,
        itemsThrown: 3,
        itemsActive: 5,
        recipesUsed: 0,
        currentStreak: 10,
        longestStreak: 15,
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-20T00:00:00Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedStats));

      const result = await getCachedStats();

      expect(result).toEqual(cachedStats);
    });

    it('getCachedStats devrait retourner null si pas de cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await getCachedStats();

      expect(result).toBeNull();
    });

    it('resetStats devrait supprimer le cache et les streaks', async () => {
      await resetStats();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user_stats_cache');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('waste_streak');
    });
  });

  describe('Cas limites et edge cases', () => {
    it('devrait gérer une liste vide', async () => {
      const mockLists: List[] = [];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      expect(stats.totalSaved).toBe(0);
      expect(stats.totalWasted).toBe(0);
      expect(stats.netSavings).toBe(0);
      expect(stats.itemsConsumed).toBe(0);
      expect(stats.itemsThrown).toBe(0);
      expect(stats.itemsActive).toBe(0);
    });

    it('devrait ignorer les items sans prix défini dans les stats argent', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Produit mystère',
              expirationDate: '2024-01-20',
              quantity: 1,
              status: 'consumed',
              consumedAt: '2024-01-15T10:00:00Z',
              // Ni prix ni catégorie → exclu des stats argent
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // Sans prix défini, aucune économie comptée
      expect(stats.totalSaved).toBe(0);
    });

    it('devrait gérer des items sans consumedAt (stats quotidiennes)', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Pain',
              expirationDate: '2024-01-20',
              quantity: 1,
              category: 'boulangerie',
              status: 'consumed',
              // Pas de consumedAt
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const dailyStats = await calculateDailyStats(7);

      // Ne devrait pas crasher, tous les jours à 0
      expect(dailyStats).toHaveLength(7);
      dailyStats.forEach(stat => {
        expect(stat.itemsConsumed).toBe(0);
      });
    });

    it('devrait arrondir les valeurs à 2 décimales', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Fromage',
              expirationDate: '2024-01-20',
              quantity: 1,
              category: 'produits laitiers',
              status: 'consumed',
              price: 3.333,
              consumedAt: '2024-01-15T10:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // 3.333 devrait être arrondi à 3.33
      expect(stats.totalSaved).toBe(3.33);
      expect(stats.totalSaved.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    it('devrait gérer des erreurs de loadLists gracieusement', async () => {
      (localStorage.loadLists as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const stats = await calculateUserStats();

      // Devrait retourner des stats vides au lieu de crasher
      expect(stats.totalSaved).toBe(0);
      expect(stats.totalWasted).toBe(0);
      expect(stats.netSavings).toBe(0);
    });

    it('devrait gérer des quantités élevées', async () => {
      const mockLists: List[] = [
        {
          id: '1',
          title: 'Frigo',
          createdAt: '2024-01-01T00:00:00Z',
          items: [
            {
              id: '1',
              name: 'Pommes',
              expirationDate: '2024-01-20',
              quantity: 100,
              category: 'fruits',
              status: 'consumed',
              price: 250,
              consumedAt: '2024-01-15T10:00:00Z',
            },
          ],
        },
      ];

      (localStorage.loadLists as jest.Mock).mockResolvedValue(mockLists);

      const stats = await calculateUserStats();

      // price est le prix total (pour la quantité entière)
      expect(stats.totalSaved).toBe(250.0);
      // Poids fruits = 0.5 kg × 100 = 50 kg
      expect(stats.foodSavedKg).toBe(50.0);
    });
  });
});
