// ============================================
// EXPORT SERVICE
// Exportation des données en JSON/CSV
// ============================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { loadLists } from '../utils/localStorage';
import { calculateUserStats, calculateDailyStats, calculateMonthlyStats } from './statsService';
import { List, FoodItem } from '../types';
import logger from '../utils/logger';

export interface ExportData {
  exportDate: string;
  appVersion: string;
  lists: List[];
  stats: {
    user: Awaited<ReturnType<typeof calculateUserStats>>;
    daily: Awaited<ReturnType<typeof calculateDailyStats>>;
    monthly: Awaited<ReturnType<typeof calculateMonthlyStats>>;
  };
  totalItems: number;
  activeItems: number;
}

/**
 * Génère un nom de fichier avec la date actuelle
 */
function generateFileName(extension: 'json' | 'csv'): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `ZeroGaspy_Export_${dateStr}_${timeStr}.${extension}`;
}

/**
 * Compte le nombre total d'items et d'items actifs
 */
function countItems(lists: List[]): { total: number; active: number } {
  let total = 0;
  let active = 0;

  lists.forEach(list => {
    total += list.items.length;
    active += list.items.filter(item => item.status !== 'consumed' && item.status !== 'thrown').length;
  });

  return { total, active };
}

/**
 * Collecte toutes les données de l'application
 */
async function collectExportData(): Promise<ExportData> {
  try {
    const lists = await loadLists();
    const userStats = await calculateUserStats();
    const dailyStats = await calculateDailyStats(30); // 30 derniers jours
    const monthlyStats = await calculateMonthlyStats(6); // 6 derniers mois

    const { total, active } = countItems(lists);

    return {
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0', // TODO: Récupérer depuis app.json
      lists,
      stats: {
        user: userStats,
        daily: dailyStats,
        monthly: monthlyStats,
      },
      totalItems: total,
      activeItems: active,
    };
  } catch (error: any) {
    logger.error('Erreur lors de la collecte des données:', error.message);
    throw error;
  }
}

/**
 * Exporte les données en JSON
 */
export async function exportToJSON(): Promise<string> {
  try {
    const data = await collectExportData();
    const json = JSON.stringify(data, null, 2);

    const fileName = generateFileName('json');
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.info(`Export JSON créé: ${fileName}`);
    return fileUri;
  } catch (error: any) {
    logger.error('Erreur lors de l\'export JSON:', error.message);
    throw new Error('Impossible de créer l\'export JSON');
  }
}

/**
 * Convertit les données en format CSV
 */
function convertToCSV(lists: List[]): string {
  // En-têtes CSV
  const headers = [
    'Liste',
    'Nom de l\'aliment',
    'Date d\'expiration',
    'Quantité',
    'Catégorie',
    'Statut',
    'Prix (€)',
    'Date d\'ajout',
    'Date de consommation/jet',
    'Ouvert',
    'Date d\'ouverture',
    'Jours après ouverture',
  ];

  const rows: string[][] = [];

  // Ajouter les données
  lists.forEach(list => {
    list.items.forEach(item => {
      rows.push([
        list.title,
        item.name,
        item.expirationDate,
        item.quantity?.toString() || '1',
        item.category || '',
        item.status === 'consumed' ? 'Consommé' :
          item.status === 'thrown' ? 'Jeté' : 'Actif',
        item.price?.toFixed(2) || '',
        list.createdAt?.split('T')[0] || '',
        item.consumedAt?.split('T')[0] || '',
        item.isOpened ? 'Oui' : 'Non',
        item.openedDate || '',
        item.daysAfterOpening?.toString() || '',
      ]);
    });
  });

  // Construire le CSV
  const csvLines: string[] = [];

  // Ajouter les en-têtes
  csvLines.push(headers.map(h => `"${h}"`).join(','));

  // Ajouter les lignes de données
  rows.forEach(row => {
    csvLines.push(row.map(cell => `"${cell}"`).join(','));
  });

  return csvLines.join('\n');
}

/**
 * Exporte les données en CSV
 */
export async function exportToCSV(): Promise<string> {
  try {
    const lists = await loadLists();
    const csv = convertToCSV(lists);

    const fileName = generateFileName('csv');
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Ajouter BOM pour Excel UTF-8
    const bom = '\uFEFF';
    await FileSystem.writeAsStringAsync(fileUri, bom + csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.info(`Export CSV créé: ${fileName}`);
    return fileUri;
  } catch (error: any) {
    logger.error('Erreur lors de l\'export CSV:', error.message);
    throw new Error('Impossible de créer l\'export CSV');
  }
}

/**
 * Partage le fichier exporté
 */
export async function shareExportFile(fileUri: string): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      throw new Error('Le partage de fichiers n\'est pas disponible sur cet appareil');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: fileUri.endsWith('.json') ? 'application/json' : 'text/csv',
      dialogTitle: 'Exporter les données ZeroGaspy',
      UTI: fileUri.endsWith('.json') ? 'public.json' : 'public.comma-separated-values-text',
    });

    logger.info('Fichier partagé avec succès');
  } catch (error: any) {
    logger.error('Erreur lors du partage:', error.message);
    // Re-lancer l'erreur originale si c'est un message d'erreur connu
    if (error.message === 'Le partage de fichiers n\'est pas disponible sur cet appareil') {
      throw error;
    }
    throw new Error('Impossible de partager le fichier');
  }
}

/**
 * Exporte et partage les données en JSON
 */
export async function exportAndShareJSON(): Promise<void> {
  try {
    const fileUri = await exportToJSON();
    await shareExportFile(fileUri);
  } catch (error: any) {
    logger.error('Erreur export+partage JSON:', error.message);
    throw error;
  }
}

/**
 * Exporte et partage les données en CSV
 */
export async function exportAndShareCSV(): Promise<void> {
  try {
    const fileUri = await exportToCSV();
    await shareExportFile(fileUri);
  } catch (error: any) {
    logger.error('Erreur export+partage CSV:', error.message);
    throw error;
  }
}

/**
 * Supprime les anciens fichiers d'export (nettoyage)
 */
export async function cleanupOldExports(): Promise<number> {
  try {
    const directory = FileSystem.documentDirectory;
    if (!directory) return 0;

    const files = await FileSystem.readDirectoryAsync(directory);
    const exportFiles = files.filter(f => f.startsWith('ZeroGaspy_Export_'));

    let deleted = 0;
    for (const file of exportFiles) {
      try {
        await FileSystem.deleteAsync(`${directory}${file}`, { idempotent: true });
        deleted++;
      } catch (e) {
        // Ignorer les erreurs de suppression
      }
    }

    logger.info(`${deleted} fichiers d'export supprimés`);
    return deleted;
  } catch (error: any) {
    logger.error('Erreur lors du nettoyage:', error.message);
    return 0;
  }
}

/**
 * Obtient des statistiques sur l'export
 */
export async function getExportStats(): Promise<{
  totalLists: number;
  totalItems: number;
  activeItems: number;
  consumedItems: number;
  thrownItems: number;
  estimatedSize: string;
}> {
  try {
    const lists = await loadLists();

    let totalItems = 0;
    let activeItems = 0;
    let consumedItems = 0;
    let thrownItems = 0;

    lists.forEach(list => {
      list.items.forEach(item => {
        totalItems++;
        if (item.status === 'consumed') consumedItems++;
        else if (item.status === 'thrown') thrownItems++;
        else activeItems++;
      });
    });

    // Estimer la taille en JSON
    const data = await collectExportData();
    const json = JSON.stringify(data);
    const sizeInKB = Math.ceil(json.length / 1024);
    const estimatedSize = sizeInKB < 1024
      ? `${sizeInKB} KB`
      : `${(sizeInKB / 1024).toFixed(1)} MB`;

    return {
      totalLists: lists.length,
      totalItems,
      activeItems,
      consumedItems,
      thrownItems,
      estimatedSize,
    };
  } catch (error: any) {
    logger.error('Erreur lors du calcul des stats d\'export:', error.message);
    throw error;
  }
}
