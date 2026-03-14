/**
 * Service pour gérer l'accès aux fonctionnalités premium via rewarded ads
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

const RECEIPT_SCAN_CREDIT_KEY = 'receipt_scan_free_credit';

interface ReceiptScanCredit {
  lastUsedDate: string; // Format ISO
  month: string; // Format YYYY-MM pour identifier le mois
}

/**
 * Vérifie si l'utilisateur a déjà utilisé son crédit gratuit ce mois-ci
 */
export async function hasUsedFreeReceiptScanThisMonth(): Promise<boolean> {
  try {
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);

    if (!creditData) {
      return false; // Jamais utilisé
    }

    const credit: ReceiptScanCredit = JSON.parse(creditData);
    const currentMonth = new Date().toISOString().slice(0, 7); // Format YYYY-MM

    // Vérifier si le crédit a été utilisé ce mois-ci
    return credit.month === currentMonth;

  } catch (error) {
    logger.error('Erreur vérification crédit gratuit:', error);
    return false; // En cas d'erreur, autoriser l'utilisation
  }
}

/**
 * Marque le crédit gratuit comme utilisé pour ce mois
 */
export async function markFreeReceiptScanAsUsed(): Promise<void> {
  try {
    const now = new Date();
    const credit: ReceiptScanCredit = {
      lastUsedDate: now.toISOString(),
      month: now.toISOString().slice(0, 7), // Format YYYY-MM
    };

    await AsyncStorage.setItem(RECEIPT_SCAN_CREDIT_KEY, JSON.stringify(credit));
    logger.info('✅ Crédit gratuit scan ticket marqué comme utilisé pour', credit.month);

  } catch (error) {
    logger.error('Erreur sauvegarde crédit gratuit:', error);
  }
}

/**
 * Réinitialise le crédit gratuit (pour les tests ou le changement de mois)
 */
export async function resetFreeReceiptScanCredit(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECEIPT_SCAN_CREDIT_KEY);
    logger.info('🔄 Crédit gratuit scan ticket réinitialisé');
  } catch (error) {
    logger.error('Erreur réinitialisation crédit:', error);
  }
}

/**
 * Obtient les informations sur le crédit gratuit
 */
export async function getFreeReceiptScanInfo(): Promise<{
  hasUsed: boolean;
  lastUsedDate: Date | null;
  canUseAgainOn: Date | null;
}> {
  try {
    const hasUsed = await hasUsedFreeReceiptScanThisMonth();
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);

    if (!creditData) {
      return {
        hasUsed: false,
        lastUsedDate: null,
        canUseAgainOn: null,
      };
    }

    const credit: ReceiptScanCredit = JSON.parse(creditData);
    const lastUsedDate = new Date(credit.lastUsedDate);

    // Calculer la date du prochain crédit (1er jour du mois suivant)
    const nextMonth = new Date(lastUsedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    return {
      hasUsed,
      lastUsedDate,
      canUseAgainOn: hasUsed ? nextMonth : null,
    };

  } catch (error) {
    logger.error('Erreur récupération info crédit:', error);
    return {
      hasUsed: false,
      lastUsedDate: null,
      canUseAgainOn: null,
    };
  }
}
