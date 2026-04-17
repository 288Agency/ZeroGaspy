import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';
import i18n from '../i18n';
import { trackReferralCompleted } from './analytics';

const PENDING_REFERRAL_KEY = '@zerogaspy_pending_referral';
const BONUS_SCANS_CACHE_KEY = '@zerogaspy_bonus_scans';

// ── Code parrain ─────────────────────────────────────────────

export async function getMyReferralCode(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('ensure_referral_code', {
      p_user_id: userId,
    });
    if (error) {
      logger.error('Error getting referral code:', error);
      return null;
    }
    return data as string;
  } catch (error) {
    logger.error('Error in getMyReferralCode:', error);
    return null;
  }
}

// ── Infos parrainage ─────────────────────────────────────────

export interface ReferralInfo {
  code: string | null;
  referralCount: number;
  bonusScansRemaining: number;
}

export async function getReferralInfo(userId: string): Promise<ReferralInfo> {
  try {
    const [code, referralCount, bonusScans] = await Promise.all([
      getMyReferralCode(userId),
      getReferralCount(userId),
      getBonusScansRemaining(userId),
    ]);

    return {
      code,
      referralCount,
      bonusScansRemaining: bonusScans,
    };
  } catch (error) {
    logger.error('Error in getReferralInfo:', error);
    return { code: null, referralCount: 0, bonusScansRemaining: 0 };
  }
}

async function getReferralCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', 'completed');

    if (error) {
      logger.error('Error getting referral count:', error);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    logger.error('Error in getReferralCount:', error);
    return 0;
  }
}

// ── Partage ──────────────────────────────────────────────────

export async function shareReferralLink(code: string): Promise<boolean> {
  try {
    const t = i18n.t.bind(i18n);
    const message = t('referral.shareMessage', { code });
    const url = `https://zerogaspy.fr/invite/${code}`;

    const result = await Share.share({
      message: `${message}\n${url}`,
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    logger.error('Error sharing referral link:', error);
    return false;
  }
}

// ── Code parrain pending (deep link / inscription) ───────────

export async function savePendingReferralCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_REFERRAL_KEY, code.toUpperCase());
    logger.info('Pending referral code saved:', code);
  } catch (error) {
    logger.error('Error saving pending referral code:', error);
  }
}

export async function getPendingReferralCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
  } catch (error) {
    logger.error('Error getting pending referral code:', error);
    return null;
  }
}

async function clearPendingReferralCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch (error) {
    logger.error('Error clearing pending referral code:', error);
  }
}

// ── Complétion du parrainage ─────────────────────────────────

export async function completeReferral(userId: string): Promise<{ success: boolean; reason?: string }> {
  try {
    const pendingCode = await getPendingReferralCode();
    if (!pendingCode) {
      return { success: false, reason: 'no_pending_code' };
    }

    const { data, error } = await supabase.rpc('complete_referral', {
      p_referee_id: userId,
      p_code: pendingCode,
    });

    if (error) {
      logger.error('Error completing referral:', error);
      // Ne PAS effacer le code — erreur réseau, on peut réessayer
      return { success: false, reason: error.message };
    }

    // Le RPC a répondu (succès ou échec business) : effacer le code pending
    // pour éviter les doubles appels
    await clearPendingReferralCode();

    const result = data as { success: boolean; reason?: string; referrer_id?: string };

    if (result.success) {
      await syncBonusScanCredits(userId);
      trackReferralCompleted(result.referrer_id ?? '');
      logger.info('Referral completed successfully');

      if (result.referrer_id) {
        supabase.functions.invoke('grant-referral-premium', {
          body: { referrer_id: result.referrer_id },
        }).then(({ error: grantError }) => {
          if (grantError) logger.warn('grant-referral-premium error:', grantError);
          else logger.info('Referral premium grant attempted for', result.referrer_id);
        }).catch((e: unknown) => logger.warn('grant-referral-premium threw:', e));
      }
    }

    return { success: result.success, reason: result.reason };
  } catch (error) {
    logger.error('Error in completeReferral:', error);
    return { success: false, reason: 'unknown_error' };
  }
}

// ── Bonus scans ──────────────────────────────────────────────

export async function getBonusScansRemaining(userId: string): Promise<number> {
  try {
    const cached = await AsyncStorage.getItem(BONUS_SCANS_CACHE_KEY);
    if (cached !== null) {
      return parseInt(cached, 10);
    }
    return await syncBonusScanCredits(userId);
  } catch (error) {
    logger.error('Error in getBonusScansRemaining:', error);
    return 0;
  }
}

export async function useBonusScan(userId: string): Promise<boolean> {
  try {
    const remaining = await getBonusScansRemaining(userId);
    if (remaining <= 0) return false;

    const { error } = await supabase
      .from('bonus_scan_credits')
      .update({
        credits_remaining: remaining - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      logger.error('Error using bonus scan:', error);
      return false;
    }

    await AsyncStorage.setItem(BONUS_SCANS_CACHE_KEY, String(remaining - 1));
    return true;
  } catch (error) {
    logger.error('Error in useBonusScan:', error);
    return false;
  }
}

export async function syncBonusScanCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('bonus_scan_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error syncing bonus scan credits:', error);
      return 0;
    }

    const credits = data?.credits_remaining ?? 0;
    await AsyncStorage.setItem(BONUS_SCANS_CACHE_KEY, String(credits));
    return credits;
  } catch (error) {
    logger.error('Error in syncBonusScanCredits:', error);
    return 0;
  }
}
