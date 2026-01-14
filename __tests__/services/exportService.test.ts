/**
 * Tests pour exportService
 * Service d'exportation des données en JSON/CSV
 */

import {
  exportToJSON,
  exportToCSV,
  shareExportFile,
  exportAndShareJSON,
  exportAndShareCSV,
  cleanupOldExports,
  getExportStats,
  ExportData,
} from '../../services/exportService';
import { List, FoodItem } from '../../types';

// Mock du logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock de expo-file-system
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  EncodingType: {
    UTF8: 'utf8',
  },
  writeAsStringAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Mock de expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

// Mock de react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock de localStorage
jest.mock('../../utils/localStorage', () => ({
  loadLists: jest.fn(),
}));

// Mock de statsService
jest.mock('../../services/statsService', () => ({
  calculateUserStats: jest.fn(),
  calculateDailyStats: jest.fn(),
  calculateMonthlyStats: jest.fn(),
}));

describe('exportService', () => {
  const FileSystem = require('expo-file-system/legacy');
  const Sharing = require('expo-sharing');
  const { loadLists } = require('../../utils/localStorage');
  const { calculateUserStats, calculateDailyStats, calculateMonthlyStats } = require('../../services/statsService');

  // Données de test
  const mockLists: List[] = [
    {
      id: 'list-1',
      title: 'Frigo',
      color: '#3B82F6',
      createdAt: '2024-01-01T00:00:00.000Z',
      items: [
        {
          id: 'item-1',
          name: 'Lait',
          expirationDate: '2024-02-01',
          status: 'active',
          quantity: 1,
          category: 'produits laitiers',
          price: 1.5,
          isOpened: false,
        } as FoodItem,
        {
          id: 'item-2',
          name: 'Yaourt',
          expirationDate: '2024-01-25',
          status: 'consumed',
          quantity: 4,
          category: 'produits laitiers',
          price: 2.8,
          consumedAt: '2024-01-24T12:00:00.000Z',
          isOpened: false,
        } as FoodItem,
      ],
    },
    {
      id: 'list-2',
      title: 'Congélateur',
      color: '#10B981',
      createdAt: '2024-01-02T00:00:00.000Z',
      items: [
        {
          id: 'item-3',
          name: 'Pizza',
          expirationDate: '2024-12-31',
          status: 'thrown',
          quantity: 1,
          price: 5.0,
          consumedAt: '2024-01-15T12:00:00.000Z',
          isOpened: false,
        } as FoodItem,
      ],
    },
  ];

  const mockUserStats = {
    totalSavings: 150.5,
    itemsSaved: 45,
    itemsThrown: 8,
    averageSavingsPerDay: 5.2,
  };

  const mockDailyStats = [
    { date: '2024-01-01', saved: 10, thrown: 1, savings: 15.0 },
    { date: '2024-01-02', saved: 8, thrown: 0, savings: 12.5 },
  ];

  const mockMonthlyStats = [
    { month: '2024-01', saved: 45, thrown: 8, savings: 150.5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration par défaut des mocks
    loadLists.mockResolvedValue(mockLists);
    calculateUserStats.mockResolvedValue(mockUserStats);
    calculateDailyStats.mockResolvedValue(mockDailyStats);
    calculateMonthlyStats.mockResolvedValue(mockMonthlyStats);
    FileSystem.writeAsStringAsync.mockResolvedValue(undefined);
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue(undefined);
  });

  describe('exportToJSON', () => {
    it('devrait créer un fichier JSON avec toutes les données', async () => {
      const fileUri = await exportToJSON();

      expect(fileUri).toMatch(/^file:\/\/\/documents\/ZeroGaspy_Export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        fileUri,
        expect.any(String),
        { encoding: 'utf8' }
      );

      // Vérifier que le JSON contient les bonnes données
      const jsonCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const jsonData = JSON.parse(jsonCall[1]);

      expect(jsonData.lists).toHaveLength(2);
      expect(jsonData.totalItems).toBe(3);
      expect(jsonData.activeItems).toBe(1);
      expect(jsonData.stats.user).toEqual(mockUserStats);
      expect(jsonData.stats.daily).toEqual(mockDailyStats);
      expect(jsonData.stats.monthly).toEqual(mockMonthlyStats);
    });

    it('devrait charger les listes depuis localStorage', async () => {
      await exportToJSON();

      expect(loadLists).toHaveBeenCalledTimes(1);
    });

    it('devrait calculer les statistiques', async () => {
      await exportToJSON();

      expect(calculateUserStats).toHaveBeenCalledTimes(1);
      expect(calculateDailyStats).toHaveBeenCalledWith(30);
      expect(calculateMonthlyStats).toHaveBeenCalledWith(6);
    });

    it('devrait inclure la date d\'export et la version de l\'app', async () => {
      await exportToJSON();

      const jsonCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const jsonData = JSON.parse(jsonCall[1]);

      expect(jsonData.exportDate).toBeDefined();
      expect(jsonData.appVersion).toBe('1.0.0');
    });

    it('devrait gérer une erreur lors de l\'écriture du fichier', async () => {
      FileSystem.writeAsStringAsync.mockRejectedValueOnce(new Error('Write failed'));

      await expect(exportToJSON()).rejects.toThrow('Impossible de créer l\'export JSON');
    });

    it('devrait gérer une erreur lors du chargement des données', async () => {
      loadLists.mockRejectedValueOnce(new Error('Load failed'));

      await expect(exportToJSON()).rejects.toThrow();
    });
  });

  describe('exportToCSV', () => {
    it('devrait créer un fichier CSV avec les données', async () => {
      const fileUri = await exportToCSV();

      expect(fileUri).toMatch(/^file:\/\/\/documents\/ZeroGaspy_Export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        fileUri,
        expect.any(String),
        { encoding: 'utf8' }
      );
    });

    it('devrait inclure le BOM UTF-8 pour Excel', async () => {
      await exportToCSV();

      const csvCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const csvContent = csvCall[1];

      expect(csvContent).toMatch(/^\uFEFF/); // BOM
    });

    it('devrait inclure les en-têtes CSV', async () => {
      await exportToCSV();

      const csvCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const csvContent = csvCall[1];

      expect(csvContent).toContain('Liste');
      expect(csvContent).toContain('Nom de l\'aliment');
      expect(csvContent).toContain('Date d\'expiration');
      expect(csvContent).toContain('Quantité');
      expect(csvContent).toContain('Statut');
    });

    it('devrait inclure tous les items de toutes les listes', async () => {
      await exportToCSV();

      const csvCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const csvContent = csvCall[1];
      const lines = csvContent.split('\n');

      // 1 ligne d'en-têtes + 3 items
      expect(lines.length).toBeGreaterThanOrEqual(4);
      expect(csvContent).toContain('Lait');
      expect(csvContent).toContain('Yaourt');
      expect(csvContent).toContain('Pizza');
    });

    it('devrait formater correctement les statuts', async () => {
      await exportToCSV();

      const csvCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const csvContent = csvCall[1];

      expect(csvContent).toContain('Actif');
      expect(csvContent).toContain('Consommé');
      expect(csvContent).toContain('Jeté');
    });

    it('devrait formater correctement les prix', async () => {
      await exportToCSV();

      const csvCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const csvContent = csvCall[1];

      expect(csvContent).toContain('1.50');
      expect(csvContent).toContain('2.80');
      expect(csvContent).toContain('5.00');
    });

    it('devrait gérer les valeurs optionnelles', async () => {
      const listWithMissingData: List[] = [
        {
          id: 'list-1',
          title: 'Test',
          color: '#000000',
          createdAt: '2024-01-01T00:00:00.000Z',
          items: [
            {
              id: 'item-1',
              name: 'Test Item',
              expirationDate: '2024-02-01',
              status: 'active',
              // Pas de quantity, category, price
              isOpened: false,
            } as FoodItem,
          ],
        },
      ];

      loadLists.mockResolvedValueOnce(listWithMissingData);

      await exportToCSV();

      const csvCall = FileSystem.writeAsStringAsync.mock.calls[0];
      const csvContent = csvCall[1];

      // Devrait avoir des valeurs par défaut ou vides
      expect(csvContent).toContain('"1"'); // quantité par défaut
    });

    it('devrait gérer une erreur lors de l\'écriture du fichier', async () => {
      FileSystem.writeAsStringAsync.mockRejectedValueOnce(new Error('Write failed'));

      await expect(exportToCSV()).rejects.toThrow('Impossible de créer l\'export CSV');
    });
  });

  describe('shareExportFile', () => {
    it('devrait partager un fichier JSON', async () => {
      const fileUri = 'file:///documents/ZeroGaspy_Export_2024-01-01_12-00-00.json';

      await shareExportFile(fileUri);

      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        fileUri,
        expect.objectContaining({
          mimeType: 'application/json',
          dialogTitle: 'Exporter les données ZeroGaspy',
          UTI: 'public.json',
        })
      );
    });

    it('devrait partager un fichier CSV', async () => {
      const fileUri = 'file:///documents/ZeroGaspy_Export_2024-01-01_12-00-00.csv';

      await shareExportFile(fileUri);

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        fileUri,
        expect.objectContaining({
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
        })
      );
    });

    it('devrait gérer le cas où le partage n\'est pas disponible', async () => {
      Sharing.isAvailableAsync.mockResolvedValueOnce(false);

      await expect(shareExportFile('file:///test.json')).rejects.toThrow(
        'Le partage de fichiers n\'est pas disponible sur cet appareil'
      );
    });

    it('devrait gérer une erreur lors du partage', async () => {
      Sharing.shareAsync.mockRejectedValueOnce(new Error('Share failed'));

      await expect(shareExportFile('file:///test.json')).rejects.toThrow(
        'Impossible de partager le fichier'
      );
    });
  });

  describe('exportAndShareJSON', () => {
    it('devrait exporter et partager un fichier JSON', async () => {
      await exportAndShareJSON();

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalled();

      const shareCall = Sharing.shareAsync.mock.calls[0];
      expect(shareCall[0]).toMatch(/\.json$/);
    });

    it('devrait propager les erreurs', async () => {
      FileSystem.writeAsStringAsync.mockRejectedValueOnce(new Error('Export failed'));

      await expect(exportAndShareJSON()).rejects.toThrow();
    });
  });

  describe('exportAndShareCSV', () => {
    it('devrait exporter et partager un fichier CSV', async () => {
      await exportAndShareCSV();

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalled();

      const shareCall = Sharing.shareAsync.mock.calls[0];
      expect(shareCall[0]).toMatch(/\.csv$/);
    });

    it('devrait propager les erreurs', async () => {
      Sharing.shareAsync.mockRejectedValueOnce(new Error('Share failed'));

      await expect(exportAndShareCSV()).rejects.toThrow();
    });
  });

  describe('cleanupOldExports', () => {
    it('devrait supprimer les anciens fichiers d\'export', async () => {
      FileSystem.readDirectoryAsync.mockResolvedValueOnce([
        'ZeroGaspy_Export_2024-01-01_12-00-00.json',
        'ZeroGaspy_Export_2024-01-02_12-00-00.csv',
        'other_file.txt',
      ]);

      FileSystem.deleteAsync.mockResolvedValue(undefined);

      const deleted = await cleanupOldExports();

      expect(deleted).toBe(2);
      expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///documents/ZeroGaspy_Export_2024-01-01_12-00-00.json',
        { idempotent: true }
      );
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        'file:///documents/ZeroGaspy_Export_2024-01-02_12-00-00.csv',
        { idempotent: true }
      );
    });

    it('ne devrait pas supprimer les autres fichiers', async () => {
      FileSystem.readDirectoryAsync.mockResolvedValueOnce([
        'other_file.txt',
        'another_file.json',
      ]);

      const deleted = await cleanupOldExports();

      expect(deleted).toBe(0);
      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it('devrait continuer même si une suppression échoue', async () => {
      FileSystem.readDirectoryAsync.mockResolvedValueOnce([
        'ZeroGaspy_Export_2024-01-01_12-00-00.json',
        'ZeroGaspy_Export_2024-01-02_12-00-00.csv',
      ]);

      FileSystem.deleteAsync
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined);

      const deleted = await cleanupOldExports();

      // Devrait compter seulement le fichier supprimé avec succès
      expect(deleted).toBe(1);
    });

    it('devrait retourner 0 si le répertoire est indéfini', async () => {
      const originalDocDir = FileSystem.documentDirectory;
      FileSystem.documentDirectory = undefined;

      const deleted = await cleanupOldExports();

      expect(deleted).toBe(0);

      FileSystem.documentDirectory = originalDocDir;
    });

    it('devrait gérer une erreur lors de la lecture du répertoire', async () => {
      FileSystem.readDirectoryAsync.mockRejectedValueOnce(new Error('Read failed'));

      const deleted = await cleanupOldExports();

      expect(deleted).toBe(0);
    });
  });

  describe('getExportStats', () => {
    it('devrait calculer les statistiques d\'export', async () => {
      const stats = await getExportStats();

      expect(stats.totalLists).toBe(2);
      expect(stats.totalItems).toBe(3);
      expect(stats.activeItems).toBe(1);
      expect(stats.consumedItems).toBe(1);
      expect(stats.thrownItems).toBe(1);
      expect(stats.estimatedSize).toBeDefined();
    });

    it('devrait estimer la taille en KB pour les petits exports', async () => {
      loadLists.mockResolvedValueOnce([
        {
          id: 'list-1',
          title: 'Test',
          color: '#000000',
          createdAt: '2024-01-01T00:00:00.000Z',
          items: [],
        },
      ]);

      const stats = await getExportStats();

      expect(stats.estimatedSize).toMatch(/KB$/);
    });

    it('devrait formater la taille avec la bonne unité (KB ou MB)', async () => {
      const stats = await getExportStats();

      // Devrait être soit en KB soit en MB
      expect(stats.estimatedSize).toMatch(/\d+(\.\d+)?\s*(KB|MB)$/);
    });

    it('devrait compter correctement les items par statut', async () => {
      const stats = await getExportStats();

      expect(stats.activeItems).toBe(1); // Lait
      expect(stats.consumedItems).toBe(1); // Yaourt
      expect(stats.thrownItems).toBe(1); // Pizza
    });

    it('devrait gérer une erreur', async () => {
      loadLists.mockRejectedValueOnce(new Error('Load failed'));

      await expect(getExportStats()).rejects.toThrow();
    });
  });

  describe('Noms de fichiers', () => {
    it('devrait générer des noms de fichiers avec la date et l\'heure', async () => {
      const fileUri1 = await exportToJSON();
      const fileUri2 = await exportToCSV();

      expect(fileUri1).toMatch(/ZeroGaspy_Export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
      expect(fileUri2).toMatch(/ZeroGaspy_Export_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
    });

    it('devrait générer des noms de fichiers uniques', async () => {
      const fileUri1 = await exportToJSON();

      // Attendre 1 seconde pour avoir un timestamp différent (la précision est à la seconde)
      await new Promise(resolve => setTimeout(resolve, 1100));

      const fileUri2 = await exportToJSON();

      expect(fileUri1).not.toBe(fileUri2);
    });
  });
});
