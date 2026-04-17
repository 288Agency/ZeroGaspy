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

/**
 * Fusionne deux objets UserGamification en prenant toujours le meilleur des deux.
 * Règle : on ne perd jamais de progression (XP, badges, records de streak).
 */
export function mergeGamificationData(
  local: UserGamification,
  cloud: UserGamification
): UserGamification {
  // XP : toujours le maximum
  const totalXp = Math.max(local.totalXp, cloud.totalXp);
  const levelInfo = getLevelFromXp(totalXp);

  // Badges : union par badgeId — local gagne si doublon (plus récent)
  const badgeMap = new Map<string, UserBadge>();
  for (const badge of cloud.badges) {
    badgeMap.set(badge.badgeId, badge);
  }
  for (const badge of local.badges) {
    badgeMap.set(badge.badgeId, badge); // local écrase cloud
  }
  const badges = Array.from(badgeMap.values());

  // Stats : max par champ
  const stats = {
    totalFoodsAdded:    Math.max(local.stats.totalFoodsAdded,    cloud.stats.totalFoodsAdded),
    totalFoodsConsumed: Math.max(local.stats.totalFoodsConsumed, cloud.stats.totalFoodsConsumed),
    totalFoodsThrown:   Math.max(local.stats.totalFoodsThrown,   cloud.stats.totalFoodsThrown),
    totalFoodsSaved:    Math.max(local.stats.totalFoodsSaved,    cloud.stats.totalFoodsSaved),
    totalRecipesViewed: Math.max(local.stats.totalRecipesViewed, cloud.stats.totalRecipesViewed),
    totalListsCreated:  Math.max(local.stats.totalListsCreated,  cloud.stats.totalListsCreated),
    daysActive:         Math.max(local.stats.daysActive,         cloud.stats.daysActive),
    lastActiveDate:     local.stats.lastActiveDate >= cloud.stats.lastActiveDate
      ? local.stats.lastActiveDate
      : cloud.stats.lastActiveDate,
  };

  // Streaks : records historiques = max, actuels = local (calculés aujourd'hui)
  const streaks = {
    currentNoWaste:  local.streaks.currentNoWaste,
    longestNoWaste:  Math.max(local.streaks.longestNoWaste, cloud.streaks.longestNoWaste),
    currentDaily:    local.streaks.currentDaily,
    longestDaily:    Math.max(local.streaks.longestDaily, cloud.streaks.longestDaily),
    lastNoWasteDate: local.streaks.lastNoWasteDate >= cloud.streaks.lastNoWasteDate
      ? local.streaks.lastNoWasteDate
      : cloud.streaks.lastNoWasteDate,
    lastDailyDate:   local.streaks.lastDailyDate >= cloud.streaks.lastDailyDate
      ? local.streaks.lastDailyDate
      : cloud.streaks.lastDailyDate,
  };

  return {
    ...levelInfo,
    totalXp,
    badges,
    stats,
    streaks,
    streakFreezes: local.streakFreezes, // local = état le plus récent
  };
}

/**
 * Fusionne deux états de challenges hebdomadaires.
 * Si weekKey différent, local gagne (c'est la semaine active).
 * Si même weekKey, merge challenges (progress max) + union history.
 */
export function mergeChallengesState(
  local: WeeklyChallengesState,
  cloud: WeeklyChallengesState
): WeeklyChallengesState {
  // Semaines différentes : cloud est périmé, garder local
  if (local.weekKey !== cloud.weekKey) {
    const mergedHistory = mergeHistory(local.history, cloud.history);
    return { ...local, history: mergedHistory };
  }

  // Même semaine : merger les challenges (currentValue max)
  const challengeMap = new Map<string, ChallengeProgress>();
  for (const c of cloud.challenges) {
    challengeMap.set(c.challengeId, c);
  }
  for (const c of local.challenges) {
    const cloudC = challengeMap.get(c.challengeId);
    if (cloudC && cloudC.currentValue > c.currentValue) {
      challengeMap.set(c.challengeId, cloudC);
    } else {
      challengeMap.set(c.challengeId, c);
    }
  }
  const challenges = Array.from(challengeMap.values());

  return {
    weekKey: local.weekKey,
    challenges,
    history: mergeHistory(local.history, cloud.history),
  };
}

function mergeHistory(
  localHistory: WeeklyHistory[],
  cloudHistory: WeeklyHistory[]
): WeeklyHistory[] {
  const historyMap = new Map<string, WeeklyHistory>();
  for (const h of cloudHistory) {
    historyMap.set(h.weekKey, h);
  }
  for (const h of localHistory) {
    const cloudH = historyMap.get(h.weekKey);
    if (!cloudH || h.completedCount >= cloudH.completedCount) {
      historyMap.set(h.weekKey, h);
    }
  }
  return Array.from(historyMap.values()).sort((a, b) =>
    b.weekKey.localeCompare(a.weekKey)
  );
}
