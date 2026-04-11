import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import { getBonusScansRemaining } from './referralService';
import { supabase } from '../config/supabase';

const RECEIPT_SCAN_CREDIT_KEY = 'receipt_scan_free_credit';
const SCAN_CREDIT_FUNCTION_NAME = 'validate-scan-credit';

interface ReceiptScanCredit {
  lastUsedDate: string;
  month: string;
  usedCount: number;
}

export const FREE_SCANS_PER_MONTH = 2;

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
    if (credit.month !== new Date().toISOString().slice(0, 7)) return false;
    return (credit.usedCount ?? 1) >= FREE_SCANS_PER_MONTH;
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
  const currentMonth = now.toISOString().slice(0, 7);

  try {
    const existing = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);
    let usedCount = 1;
    if (existing) {
      const prev: ReceiptScanCredit = JSON.parse(existing);
      if (prev.month === currentMonth) {
        usedCount = (prev.usedCount ?? 0) + 1;
      }
    }
    const credit: ReceiptScanCredit = {
      lastUsedDate: now.toISOString(),
      month: currentMonth,
      usedCount,
    };
    await AsyncStorage.setItem(RECEIPT_SCAN_CREDIT_KEY, JSON.stringify(credit));
  } catch (error) {
    logger.error('Erreur mise à jour crédit scan:', error);
  }
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

export async function getScansRemainingThisMonth(_userId: string | null): Promise<number> {
  try {
    const creditData = await AsyncStorage.getItem(RECEIPT_SCAN_CREDIT_KEY);
    if (!creditData) return FREE_SCANS_PER_MONTH;
    const credit: ReceiptScanCredit = JSON.parse(creditData);
    if (credit.month !== new Date().toISOString().slice(0, 7)) return FREE_SCANS_PER_MONTH;
    return Math.max(0, FREE_SCANS_PER_MONTH - (credit.usedCount ?? 0));
  } catch {
    return FREE_SCANS_PER_MONTH;
  }
}
