import { supabase } from '../../config/supabase';
import logger from '../../utils/logger';

// Leaf module — no imports from gamificationService / challengeService to avoid cycles.
// `saveGamificationData` and `saveChallengesState` call the queue after a successful local save;
// the push is fire-and-forget and silently no-ops when no user is logged in.

let currentUserId: string | null = null;

export function setCurrentSyncUserId(userId: string | null): void {
  currentUserId = userId;
}

export function getCurrentSyncUserId(): string | null {
  return currentUserId;
}

export function queueGamificationPush(data: unknown): void {
  const userId = currentUserId;
  if (!userId) return;
  void supabase
    .from('user_gamification')
    .upsert(
      { user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .then(({ error }) => {
      if (error) logger.warn('[CloudSyncQueue] Gamification push failed:', error.message);
    });
}

export function queueChallengesPush(state: unknown): void {
  const userId = currentUserId;
  if (!userId) return;
  void supabase
    .from('user_gamification')
    .upsert(
      { user_id: userId, challenges: state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .then(({ error }) => {
      if (error) logger.warn('[CloudSyncQueue] Challenges push failed:', error.message);
    });
}
