import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

// ==================== TYPES ====================

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeCategory = 'saving' | 'adding' | 'recipes' | 'daily' | 'streak' | 'variety';
export type ChallengeTrackingType = 'count' | 'boolean_inverse' | 'unique_days' | 'unique_lists' | 'unique_actions' | 'streak';

export type ChallengeActionType =
  | 'food_added'
  | 'food_consumed'
  | 'food_thrown'
  | 'recipe_viewed'
  | 'list_created'
  | 'app_opened';

export interface ChallengeAction {
  type: ChallengeActionType;
  beforeExpiration?: boolean;
  listId?: string;
}

export interface ChallengeDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  xpReward: number;
  targetValue: number;
  trackingType: ChallengeTrackingType;
  relevantActions: ChallengeActionType[];
}

export interface ChallengeProgress {
  challengeId: string;
  currentValue: number;
  completed: boolean;
  completedAt?: string;
  // For unique tracking
  uniqueDays?: string[];
  uniqueLists?: string[];
  uniqueActions?: string[];
  // For streak tracking
  streakDays?: string[];
}

export interface WeeklyChallengesState {
  weekKey: string;
  challenges: ChallengeProgress[];
  history: WeeklyHistory[];
}

export interface WeeklyHistory {
  weekKey: string;
  completedCount: number;
  totalXpEarned: number;
}

export interface ChallengeCompletionResult {
  challengeId: string;
  xpReward: number;
  challengeName: string;
  challengeIcon: string;
}

// ==================== XP REWARDS ====================

const XP_REWARDS: Record<ChallengeDifficulty, number> = {
  easy: 75,
  medium: 150,
  hard: 300,
};

// ==================== CHALLENGE DEFINITIONS ====================

export const CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'zero_waste_week',
    nameKey: 'challenges.names.zeroWasteWeek',
    descriptionKey: 'challenges.descriptions.zeroWasteWeek',
    icon: '♻️',
    category: 'saving',
    difficulty: 'medium',
    xpReward: XP_REWARDS.medium,
    targetValue: 1,
    trackingType: 'boolean_inverse',
    relevantActions: ['food_thrown'],
  },
  {
    id: 'save_20',
    nameKey: 'challenges.names.save20',
    descriptionKey: 'challenges.descriptions.save20',
    icon: '🛡️',
    category: 'saving',
    difficulty: 'hard',
    xpReward: XP_REWARDS.hard,
    targetValue: 20,
    trackingType: 'count',
    relevantActions: ['food_consumed'],
  },
  {
    id: 'save_5',
    nameKey: 'challenges.names.save5',
    descriptionKey: 'challenges.descriptions.save5',
    icon: '🥗',
    category: 'saving',
    difficulty: 'easy',
    xpReward: XP_REWARDS.easy,
    targetValue: 5,
    trackingType: 'count',
    relevantActions: ['food_consumed'],
  },
  {
    id: 'add_15',
    nameKey: 'challenges.names.add15',
    descriptionKey: 'challenges.descriptions.add15',
    icon: '📦',
    category: 'adding',
    difficulty: 'medium',
    xpReward: XP_REWARDS.medium,
    targetValue: 15,
    trackingType: 'count',
    relevantActions: ['food_added'],
  },
  {
    id: 'add_5',
    nameKey: 'challenges.names.add5',
    descriptionKey: 'challenges.descriptions.add5',
    icon: '🎯',
    category: 'adding',
    difficulty: 'easy',
    xpReward: XP_REWARDS.easy,
    targetValue: 5,
    trackingType: 'count',
    relevantActions: ['food_added'],
  },
  {
    id: 'recipes_10',
    nameKey: 'challenges.names.recipes10',
    descriptionKey: 'challenges.descriptions.recipes10',
    icon: '👨‍🍳',
    category: 'recipes',
    difficulty: 'medium',
    xpReward: XP_REWARDS.medium,
    targetValue: 10,
    trackingType: 'count',
    relevantActions: ['recipe_viewed'],
  },
  {
    id: 'recipes_3',
    nameKey: 'challenges.names.recipes3',
    descriptionKey: 'challenges.descriptions.recipes3',
    icon: '📖',
    category: 'recipes',
    difficulty: 'easy',
    xpReward: XP_REWARDS.easy,
    targetValue: 3,
    trackingType: 'count',
    relevantActions: ['recipe_viewed'],
  },
  {
    id: 'daily_5',
    nameKey: 'challenges.names.daily5',
    descriptionKey: 'challenges.descriptions.daily5',
    icon: '📅',
    category: 'daily',
    difficulty: 'easy',
    xpReward: XP_REWARDS.easy,
    targetValue: 5,
    trackingType: 'unique_days',
    relevantActions: ['app_opened'],
  },
  {
    id: 'daily_7',
    nameKey: 'challenges.names.daily7',
    descriptionKey: 'challenges.descriptions.daily7',
    icon: '🏃',
    category: 'daily',
    difficulty: 'hard',
    xpReward: XP_REWARDS.hard,
    targetValue: 7,
    trackingType: 'unique_days',
    relevantActions: ['app_opened'],
  },
  {
    id: 'consume_10',
    nameKey: 'challenges.names.consume10',
    descriptionKey: 'challenges.descriptions.consume10',
    icon: '🍽️',
    category: 'saving',
    difficulty: 'medium',
    xpReward: XP_REWARDS.medium,
    targetValue: 10,
    trackingType: 'count',
    relevantActions: ['food_consumed'],
  },
  {
    id: 'consume_25',
    nameKey: 'challenges.names.consume25',
    descriptionKey: 'challenges.descriptions.consume25',
    icon: '⚡',
    category: 'saving',
    difficulty: 'hard',
    xpReward: XP_REWARDS.hard,
    targetValue: 25,
    trackingType: 'count',
    relevantActions: ['food_consumed'],
  },
  {
    id: 'add_varied_3',
    nameKey: 'challenges.names.addVaried3',
    descriptionKey: 'challenges.descriptions.addVaried3',
    icon: '🗂️',
    category: 'variety',
    difficulty: 'easy',
    xpReward: XP_REWARDS.easy,
    targetValue: 3,
    trackingType: 'unique_lists',
    relevantActions: ['food_added'],
  },
  {
    id: 'streak_5',
    nameKey: 'challenges.names.streak5',
    descriptionKey: 'challenges.descriptions.streak5',
    icon: '🔥',
    category: 'streak',
    difficulty: 'medium',
    xpReward: XP_REWARDS.medium,
    targetValue: 5,
    trackingType: 'streak',
    relevantActions: ['app_opened'],
  },
  {
    id: 'no_throw_3',
    nameKey: 'challenges.names.noThrow3',
    descriptionKey: 'challenges.descriptions.noThrow3',
    icon: '🌱',
    category: 'streak',
    difficulty: 'easy',
    xpReward: XP_REWARDS.easy,
    targetValue: 3,
    trackingType: 'streak',
    relevantActions: ['app_opened', 'food_thrown'],
  },
  {
    id: 'all_actions',
    nameKey: 'challenges.names.allActions',
    descriptionKey: 'challenges.descriptions.allActions',
    icon: '🏆',
    category: 'variety',
    difficulty: 'hard',
    xpReward: XP_REWARDS.hard,
    targetValue: 4,
    trackingType: 'unique_actions',
    relevantActions: ['food_added', 'food_consumed', 'recipe_viewed', 'list_created'],
  },
  {
    id: 'add_varied_5',
    nameKey: 'challenges.names.addVaried5',
    descriptionKey: 'challenges.descriptions.addVaried5',
    icon: '🗄️',
    category: 'variety',
    difficulty: 'hard',
    xpReward: XP_REWARDS.hard,
    targetValue: 5,
    trackingType: 'unique_lists',
    relevantActions: ['food_added'],
  },
  {
    id: 'recipes_15',
    nameKey: 'challenges.names.recipes15',
    descriptionKey: 'challenges.descriptions.recipes15',
    icon: '👨‍🍳',
    category: 'recipes',
    difficulty: 'hard',
    xpReward: XP_REWARDS.hard,
    targetValue: 15,
    trackingType: 'count',
    relevantActions: ['recipe_viewed'],
  },
  {
    id: 'no_throw_7',
    nameKey: 'challenges.names.noThrow7',
    descriptionKey: 'challenges.descriptions.noThrow7',
    icon: '💎',
    category: 'streak',
    difficulty: 'hard',
    xpReward: XP_REWARDS.hard,
    targetValue: 7,
    trackingType: 'streak',
    relevantActions: ['app_opened', 'food_thrown'],
  },
];

// ==================== WEEK UTILITIES ====================

/**
 * Get ISO week number and year for a given date.
 * Returns format "YYYY-WXX"
 */
export function getCurrentWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday (ISO week definition)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Get the Monday and Sunday dates for a week key
 */
export function getWeekDateRange(weekKey: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  // Monday of week 1
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  const start = new Date(mondayWeek1);
  start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { start, end };
}

// ==================== DETERMINISTIC SELECTION ====================

/**
 * Simple seeded random number generator (mulberry32)
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert week key to a numeric seed
 */
function weekKeyToSeed(weekKey: string): number {
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    const char = weekKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getPreviousWeekKey(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split('-W');
  let year = parseInt(yearStr, 10);
  let week = parseInt(weekStr, 10) - 1;
  if (week < 1) {
    year--;
    week = 52;
  }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Select 3 challenges for a given week: 1 easy, 1 medium, 1 hard.
 * Avoids repeating challenges from the previous week when the pool allows.
 */
export function getActiveChallenges(weekKey: string): ChallengeDefinition[] {
  const prevWeek = getPreviousWeekKey(weekKey);
  const prevSeed = weekKeyToSeed(prevWeek);
  const prevRng = seededRandom(prevSeed);

  const easyAll = CHALLENGES.filter(c => c.difficulty === 'easy');
  const mediumAll = CHALLENGES.filter(c => c.difficulty === 'medium');
  const hardAll = CHALLENGES.filter(c => c.difficulty === 'hard');

  const prevPicks = [
    easyAll[Math.floor(prevRng() * easyAll.length)],
    mediumAll[Math.floor(prevRng() * mediumAll.length)],
    hardAll[Math.floor(prevRng() * hardAll.length)],
  ];

  const seed = weekKeyToSeed(weekKey);
  const rng = seededRandom(seed);

  const pickAvoidingPrev = (pool: ChallengeDefinition[], prevId: string): ChallengeDefinition => {
    const filtered = pool.filter(c => c.id !== prevId);
    const arr = filtered.length > 0 ? filtered : pool;
    return arr[Math.floor(rng() * arr.length)];
  };

  return [
    pickAvoidingPrev(easyAll, prevPicks[0].id),
    pickAvoidingPrev(mediumAll, prevPicks[1].id),
    pickAvoidingPrev(hardAll, prevPicks[2].id),
  ];
}

// ==================== STORAGE ====================

const CHALLENGES_KEY = '@zerogaspy_challenges';

export async function getChallengesState(): Promise<WeeklyChallengesState | null> {
  try {
    const data = await AsyncStorage.getItem(CHALLENGES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Error reading challenges state:', error);
  }
  return null;
}

export async function saveChallengesState(state: WeeklyChallengesState): Promise<void> {
  try {
    await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Error saving challenges state:', error);
  }
}

// ==================== INITIALIZATION ====================

/**
 * Get or initialize the current week's challenges.
 * If the week has changed, archive the previous week and create new challenges.
 */
export interface InitChallengesResult {
  state: WeeklyChallengesState;
  autoCompleted: ChallengeCompletionResult[];
}

export async function getOrInitChallenges(): Promise<InitChallengesResult> {
  const currentWeek = getCurrentWeekKey();
  let state = await getChallengesState();
  const autoCompleted: ChallengeCompletionResult[] = [];

  if (!state || state.weekKey !== currentWeek) {
    const history: WeeklyHistory[] = state?.history ?? [];

    if (state && state.weekKey !== currentWeek) {
      const prevDefs = getActiveChallenges(state.weekKey);
      for (const progress of state.challenges) {
        if (progress.completed) continue;
        const def = prevDefs.find(d => d.id === progress.challengeId);
        if (def?.trackingType === 'boolean_inverse' && progress.currentValue === 1) {
          progress.completed = true;
          progress.completedAt = new Date().toISOString();
          autoCompleted.push({
            challengeId: def.id,
            xpReward: def.xpReward,
            challengeName: def.nameKey,
            challengeIcon: def.icon,
          });
        }
      }

      const completedCount = state.challenges.filter(c => c.completed).length;
      const totalXp = state.challenges
        .filter(c => c.completed)
        .reduce((sum, c) => {
          const def = CHALLENGES.find(d => d.id === c.challengeId);
          return sum + (def?.xpReward ?? 0);
        }, 0);

      history.unshift({
        weekKey: state.weekKey,
        completedCount,
        totalXpEarned: totalXp,
      });

      if (history.length > 10) {
        history.length = 10;
      }
    }

    const activeDefs = getActiveChallenges(currentWeek);
    const challenges: ChallengeProgress[] = activeDefs.map(def => {
      const progress: ChallengeProgress = {
        challengeId: def.id,
        currentValue: 0,
        completed: false,
      };

      if (def.trackingType === 'unique_days' || def.trackingType === 'streak') {
        progress.uniqueDays = [];
        progress.streakDays = [];
      }
      if (def.trackingType === 'unique_lists') {
        progress.uniqueLists = [];
      }
      if (def.trackingType === 'unique_actions') {
        progress.uniqueActions = [];
      }
      if (def.trackingType === 'boolean_inverse') {
        progress.currentValue = 1;
        progress.completed = false;
      }

      return progress;
    });

    state = {
      weekKey: currentWeek,
      challenges,
      history,
    };

    await saveChallengesState(state);
  }

  return { state, autoCompleted };
}

// ==================== PROGRESS TRACKING ====================

/**
 * Track challenge progress for a given action.
 * Returns an array of newly completed challenges (for toast notifications).
 */
export async function trackChallengeProgress(
  action: ChallengeAction
): Promise<ChallengeCompletionResult[]> {
  const { state } = await getOrInitChallenges();
  const activeDefs = getActiveChallenges(state.weekKey);
  const completedChallenges: ChallengeCompletionResult[] = [];
  const today = getLocalToday();

  for (let i = 0; i < state.challenges.length; i++) {
    const progress = state.challenges[i];
    const def = activeDefs.find(d => d.id === progress.challengeId);

    if (!def || progress.completed) continue;
    if (!def.relevantActions.includes(action.type)) continue;

    let justCompleted = false;

    switch (def.trackingType) {
      case 'count': {
        // For save_5 and save_20, only count if consumed before expiration
        if ((def.id === 'save_5' || def.id === 'save_20') && action.type === 'food_consumed') {
          if (action.beforeExpiration) {
            progress.currentValue++;
          }
        } else {
          progress.currentValue++;
        }
        if (progress.currentValue >= def.targetValue) {
          justCompleted = true;
        }
        break;
      }

      case 'boolean_inverse': {
        // food_thrown = fail the challenge
        if (action.type === 'food_thrown') {
          progress.currentValue = 0;
        }
        break;
      }

      case 'unique_days': {
        if (!progress.uniqueDays) progress.uniqueDays = [];
        if (!progress.uniqueDays.includes(today)) {
          progress.uniqueDays.push(today);
          progress.currentValue = progress.uniqueDays.length;
        }
        if (progress.currentValue >= def.targetValue) {
          justCompleted = true;
        }
        break;
      }

      case 'unique_lists': {
        if (!progress.uniqueLists) progress.uniqueLists = [];
        if (action.listId && !progress.uniqueLists.includes(action.listId)) {
          progress.uniqueLists.push(action.listId);
          progress.currentValue = progress.uniqueLists.length;
        }
        if (progress.currentValue >= def.targetValue) {
          justCompleted = true;
        }
        break;
      }

      case 'unique_actions': {
        if (!progress.uniqueActions) progress.uniqueActions = [];
        // Map action types to simple action names
        const actionName = getActionCategory(action.type);
        if (actionName && !progress.uniqueActions.includes(actionName)) {
          progress.uniqueActions.push(actionName);
          progress.currentValue = progress.uniqueActions.length;
        }
        if (progress.currentValue >= def.targetValue) {
          justCompleted = true;
        }
        break;
      }

      case 'streak': {
        if (!progress.streakDays) progress.streakDays = [];

        if (def.id === 'no_throw_3' || def.id === 'no_throw_7') {
          // Reset streak on food thrown
          if (action.type === 'food_thrown') {
            progress.streakDays = [];
            progress.currentValue = 0;
          } else if (action.type === 'app_opened') {
            if (!progress.streakDays.includes(today)) {
              // Check if yesterday is in the streak (or this is the first day)
              const yesterday = getYesterday(today);
              if (progress.streakDays.length === 0 || progress.streakDays.includes(yesterday)) {
                progress.streakDays.push(today);
                progress.currentValue = progress.streakDays.length;
              } else {
                // Streak broken, restart
                progress.streakDays = [today];
                progress.currentValue = 1;
              }
            }
          }
        } else {
          // streak_5: consecutive days of opening the app
          if (action.type === 'app_opened' && !progress.streakDays.includes(today)) {
            const yesterday = getYesterday(today);
            if (progress.streakDays.length === 0 || progress.streakDays.includes(yesterday)) {
              progress.streakDays.push(today);
              progress.currentValue = progress.streakDays.length;
            } else {
              progress.streakDays = [today];
              progress.currentValue = 1;
            }
          }
        }

        if (progress.currentValue >= def.targetValue) {
          justCompleted = true;
        }
        break;
      }
    }

    if (justCompleted) {
      progress.completed = true;
      progress.completedAt = new Date().toISOString();
      completedChallenges.push({
        challengeId: def.id,
        xpReward: def.xpReward,
        challengeName: def.nameKey,
        challengeIcon: def.icon,
      });
    }
  }

  // Check boolean_inverse challenge completion at end of week
  // For now, it stays "in progress" (currentValue=1) until food_thrown resets it
  // The actual completion check happens when the week ends (in getOrInitChallenges)
  // But we can also mark it completed if we reach Sunday
  const boolInverseProgress = state.challenges.find(p => {
    const def = activeDefs.find(d => d.id === p.challengeId);
    return def?.trackingType === 'boolean_inverse' && !p.completed && p.currentValue === 1;
  });

  if (boolInverseProgress) {
    const { end } = getWeekDateRange(state.weekKey);
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    if (today >= endStr) {
      boolInverseProgress.completed = true;
      boolInverseProgress.completedAt = new Date().toISOString();
      const def = activeDefs.find(d => d.id === boolInverseProgress.challengeId);
      if (def) {
        completedChallenges.push({
          challengeId: def.id,
          xpReward: def.xpReward,
          challengeName: def.nameKey,
          challengeIcon: def.icon,
        });
      }
    }
  }

  await saveChallengesState(state);
  return completedChallenges;
}

// ==================== HELPERS ====================

function getActionCategory(actionType: ChallengeActionType): string | null {
  switch (actionType) {
    case 'food_added': return 'add';
    case 'food_consumed': return 'consume';
    case 'recipe_viewed': return 'recipe';
    case 'list_created': return 'list';
    default: return null;
  }
}

function getLocalToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterday(todayStr: string): string {
  const [y, m, d] = todayStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getChallengeById(id: string): ChallengeDefinition | undefined {
  return CHALLENGES.find(c => c.id === id);
}

export function getDifficultyColor(difficulty: ChallengeDifficulty): string {
  switch (difficulty) {
    case 'easy': return '#4ADE80';
    case 'medium': return '#FB923C';
    case 'hard': return '#EF4444';
  }
}

export function getDifficultyBgColor(difficulty: ChallengeDifficulty): string {
  switch (difficulty) {
    case 'easy': return '#DCFCE7';
    case 'medium': return '#FFF7ED';
    case 'hard': return '#FEF2F2';
  }
}
