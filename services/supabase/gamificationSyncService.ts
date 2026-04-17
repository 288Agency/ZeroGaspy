import { supabase } from '../../config/supabase';
import {
  UserGamification,
  // Les imports suivants sont utilisés par mergeGamificationData (Task 3)
  // et syncGamificationOnLogin (Task 4) qui seront ajoutés à ce fichier.
  UserBadge,
  getLevelFromXp,
  getGamificationData,
  saveGamificationData,
} from '../gamificationService';
import {
  WeeklyChallengesState,
  // Les imports suivants sont utilisés par mergeGamificationData (Task 3)
  // et syncGamificationOnLogin (Task 4) qui seront ajoutés à ce fichier.
  ChallengeProgress,
  WeeklyHistory,
  getOrInitChallenges,
  saveChallengesState,
} from '../challengeService';
import logger from '../../utils/logger';

/**
 * Pousse la progression gamification vers Supabase (upsert).
 * Fire-and-forget — ne jamais await dans l'UI.
 */
export async function pushGamificationToCloud(
  userId: string,
  data: UserGamification
): Promise<void> {
  const { error } = await supabase
    .from('user_gamification')
    .upsert(
      { user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    logger.warn('[GamificationSync] Push gamification error:', error.message);
  }
}

/**
 * Tire la progression gamification depuis Supabase.
 * Retourne null si pas de données cloud.
 */
export async function pullGamificationFromCloud(
  userId: string
): Promise<UserGamification | null> {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.warn('[GamificationSync] Pull gamification error:', error.message);
    return null;
  }

  const raw = data?.data;
  if (!raw || typeof raw !== 'object') return null;
  return raw as UserGamification;
}

/**
 * Pousse l'état des challenges hebdomadaires vers Supabase.
 */
export async function pushChallengesStateToCloud(
  userId: string,
  state: WeeklyChallengesState
): Promise<void> {
  const { error } = await supabase
    .from('user_gamification')
    .upsert(
      { user_id: userId, challenges: state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) {
    logger.warn('[GamificationSync] Push challenges error:', error.message);
  }
}

/**
 * Tire l'état des challenges hebdomadaires depuis Supabase.
 * Retourne null si pas de données cloud.
 */
export async function pullChallengesStateFromCloud(
  userId: string
): Promise<WeeklyChallengesState | null> {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('challenges')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.warn('[GamificationSync] Pull challenges error:', error.message);
    return null;
  }

  const raw = data?.challenges;
  if (!raw || typeof raw !== 'object') return null;
  return raw as WeeklyChallengesState;
}
