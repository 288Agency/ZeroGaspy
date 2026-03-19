import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import { getBonusScansRemaining } from './referralService';
import { supabase } from '../config/supabase';

const RECEIPT_SCAN_CREDIT_KEY = 'receipt_scan_free_credit';
const SCAN_CREDIT_FUNCTION_NAME = 'validate-scan-credit';

interface ReceiptScanCredit {
  lastUsedDate: string;
  month: string;
}

export async function hasUsedFreeReceiptScanThisMonth(userId: string | null): Promise<boolean> {
  if (userId) {
    try {
      const { data, error } = await supabase.functions.invoke(SCAN_CREDIT_FUNCTION_NAME, {
        body: { action: 'check' },
      });
      if (!error && data) {
        return !data.allowed;
      }
    } catch (err) {
      logger.error('Edge function check failed, falling back to local:', err);
    }
  }

  try {
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);
    if (!creditData) return false;
    const credit: ReceiptScanCredit = JSON.parse(creditData);
    return credit.month === new Date().toISOString().slice(0, 7);
  } catch {
    return false;
  }
}

export async function markFreeReceiptScanAsUsed(userId: string | null): Promise<void> {
  if (userId) {
    try {
      await supabase.functions.invoke(SCAN_CREDIT_FUNCTION_NAME, {
        body: { action: 'consume' },
      });
    } catch (err) {
      logger.error('Edge function consume failed:', err);
    }
  }

  const now = new Date();
  const credit: ReceiptScanCredit = {
    lastUsedDate: now.toISOString(),
    month: now.toISOString().slice(0, 7),
  };
  await AsyncStorage.setItem(RECEIPT_SCAN_CREDIT_KEY, JSON.stringify(credit));
}

export async function resetFreeReceiptScanCredit(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECEIPT_SCAN_CREDIT_KEY);
    logger.info('Crédit gratuit scan ticket réinitialisé');
  } catch (error) {
    logger.error('Erreur réinitialisation crédit:', error);
  }
}

export async function getFreeReceiptScanInfo(userId: string | null): Promise<{
  hasUsed: boolean;
  lastUsedDate: Date | null;
  canUseAgainOn: Date | null;
}> {
  try {
    const hasUsed = await hasUsedFreeReceiptScanThisMonth(userId);
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);

    if (!creditData) {
      return { hasUsed, lastUsedDate: null, canUseAgainOn: null };
    }

    const credit: ReceiptScanCredit = JSON.parse(creditData);
    const lastUsedDate = new Date(credit.lastUsedDate);

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
    return { hasUsed: false, lastUsedDate: null, canUseAgainOn: null };
  }
}

export type ScanSource = 'premium' | 'monthly_free' | 'bonus';

export async function canScanReceipt(
  userId: string | null,
  isPremium: boolean,
): Promise<{ allowed: boolean; source: ScanSource | null }> {
  if (isPremium) return { allowed: true, source: 'premium' };

  const hasUsed = await hasUsedFreeReceiptScanThisMonth(userId);
  if (!hasUsed) return { allowed: true, source: 'monthly_free' };

  if (userId) {
    const bonus = await getBonusScansRemaining(userId);
    if (bonus > 0) return { allowed: true, source: 'bonus' };
  }

  return { allowed: false, source: null };
}
