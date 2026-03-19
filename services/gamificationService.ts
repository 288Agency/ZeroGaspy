import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';

// ==================== TYPES ====================

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  tier: BadgeTier;
  requirement: number;
  xpReward: number;
}

export interface UserBadge {
  badgeId: string;
  unlockedAt: string;
  progress: number;
  isNew: boolean;
}

export interface StreakFreezes {
  available: number;
  lastWeeklyGrant: string; // ISO week key "2026-W12"
  usedThisWeek: number;
  totalUsed: number;
}

export interface UserGamification {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXp: number;
  badges: UserBadge[];
  stats: GamificationStats;
  streaks: Streaks;
  streakFreezes: StreakFreezes;
}

export interface GamificationStats {
  totalFoodsAdded: number;
  totalFoodsConsumed: number;
  totalFoodsThrown: number;
  totalFoodsSaved: number; // consumed avant expiration
  totalRecipesViewed: number;
  totalListsCreated: number;
  daysActive: number;
  lastActiveDate: string;
}

export interface Streaks {
  currentNoWaste: number; // jours sans gaspillage
  longestNoWaste: number;
  currentDaily: number; // jours consecutifs d'utilisation
  longestDaily: number;
  lastNoWasteDate: string;
  lastDailyDate: string;
}

export type BadgeCategory =
  | 'zero_waste'    // Zero gaspillage
  | 'saver'         // Aliments sauves
  | 'explorer'      // Recettes
  | 'organizer'     // Listes et organisation
  | 'streak'        // Series
  | 'milestone';    // Jalons

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// ==================== BADGES DEFINITIONS ====================

export const BADGES: Badge[] = [
  // === ZERO WASTE (Zero gaspillage) ===
  {
    id: 'zero_waste_7',
    name: 'Eco-Debutant',
    description: '7 jours sans gaspillage',
    icon: '🌱',
    category: 'zero_waste',
    tier: 'bronze',
    requirement: 7,
    xpReward: 100,
  },
  {
    id: 'zero_waste_14',
    name: 'Eco-Apprenti',
    description: '14 jours sans gaspillage',
    icon: '🌿',
    category: 'zero_waste',
    tier: 'silver',
    requirement: 14,
    xpReward: 250,
  },
  {
    id: 'zero_waste_30',
    name: 'Eco-Warrior',
    description: '30 jours sans gaspillage',
    icon: '🌳',
    category: 'zero_waste',
    tier: 'gold',
    requirement: 30,
    xpReward: 500,
  },
  {
    id: 'zero_waste_60',
    name: 'Eco-Champion',
    description: '60 jours sans gaspillage',
    icon: '🏆',
    category: 'zero_waste',
    tier: 'platinum',
    requirement: 60,
    xpReward: 1000,
  },
  {
    id: 'zero_waste_90',
    name: 'Eco-Legende',
    description: '90 jours sans gaspillage',
    icon: '💎',
    category: 'zero_waste',
    tier: 'diamond',
    requirement: 90,
    xpReward: 2000,
  },

  // === SAVER (Aliments sauves) ===
  {
    id: 'saver_10',
    name: 'Petit Sauveur',
    description: '10 aliments consommes avant expiration',
    icon: '🥗',
    category: 'saver',
    tier: 'bronze',
    requirement: 10,
    xpReward: 50,
  },
  {
    id: 'saver_50',
    name: 'Gardien du Frigo',
    description: '50 aliments sauves',
    icon: '🛡️',
    category: 'saver',
    tier: 'silver',
    requirement: 50,
    xpReward: 200,
  },
  {
    id: 'saver_100',
    name: 'Heros Anti-Gaspi',
    description: '100 aliments sauves',
    icon: '🦸',
    category: 'saver',
    tier: 'gold',
    requirement: 100,
    xpReward: 400,
  },
  {
    id: 'saver_250',
    name: 'Super Sauveur',
    description: '250 aliments sauves',
    icon: '⭐',
    category: 'saver',
    tier: 'platinum',
    requirement: 250,
    xpReward: 800,
  },
  {
    id: 'saver_500',
    name: 'Maitre du Zero Dechet',
    description: '500 aliments sauves',
    icon: '👑',
    category: 'saver',
    tier: 'diamond',
    requirement: 500,
    xpReward: 1500,
  },

  // === EXPLORER (Recettes) ===
  {
    id: 'explorer_5',
    name: 'Curieux',
    description: '5 recettes consultees',
    icon: '📖',
    category: 'explorer',
    tier: 'bronze',
    requirement: 5,
    xpReward: 30,
  },
  {
    id: 'explorer_25',
    name: 'Apprenti Chef',
    description: '25 recettes consultees',
    icon: '👨‍🍳',
    category: 'explorer',
    tier: 'silver',
    requirement: 25,
    xpReward: 150,
  },
  {
    id: 'explorer_50',
    name: 'Chef Confirme',
    description: '50 recettes consultees',
    icon: '🍳',
    category: 'explorer',
    tier: 'gold',
    requirement: 50,
    xpReward: 300,
  },
  {
    id: 'explorer_100',
    name: 'Chef Etoile',
    description: '100 recettes consultees',
    icon: '🌟',
    category: 'explorer',
    tier: 'platinum',
    requirement: 100,
    xpReward: 600,
  },

  // === ORGANIZER (Organisation) ===
  {
    id: 'first_list',
    name: 'Organisateur',
    description: 'Creer sa premiere liste',
    icon: '📋',
    category: 'organizer',
    tier: 'bronze',
    requirement: 1,
    xpReward: 25,
  },
  {
    id: 'organizer_5',
    name: 'Bien Range',
    description: '5 listes creees',
    icon: '🗂️',
    category: 'organizer',
    tier: 'silver',
    requirement: 5,
    xpReward: 100,
  },
  {
    id: 'organizer_10',
    name: 'Maitre de l\'Organisation',
    description: '10 listes creees',
    icon: '🏠',
    category: 'organizer',
    tier: 'gold',
    requirement: 10,
    xpReward: 250,
  },

  // === STREAK (Series) ===
  {
    id: 'streak_7',
    name: 'Regulier',
    description: '7 jours d\'utilisation consecutifs',
    icon: '🔥',
    category: 'streak',
    tier: 'bronze',
    requirement: 7,
    xpReward: 75,
  },
  {
    id: 'streak_14',
    name: 'Assidu',
    description: '14 jours d\'utilisation consecutifs',
    icon: '💪',
    category: 'streak',
    tier: 'silver',
    requirement: 14,
    xpReward: 200,
  },
  {
    id: 'streak_30',
    name: 'Inarretable',
    description: '30 jours d\'utilisation consecutifs',
    icon: '⚡',
    category: 'streak',
    tier: 'gold',
    requirement: 30,
    xpReward: 500,
  },
  {
    id: 'streak_60',
    name: 'Machine',
    description: '60 jours d\'utilisation consecutifs',
    icon: '🚀',
    category: 'streak',
    tier: 'platinum',
    requirement: 60,
    xpReward: 1000,
  },

  // === MILESTONE (Jalons) ===
  {
    id: 'first_food',
    name: 'Premier Pas',
    description: 'Ajouter son premier aliment',
    icon: '🎯',
    category: 'milestone',
    tier: 'bronze',
    requirement: 1,
    xpReward: 10,
  },
  {
    id: 'foods_100',
    name: 'Centenaire',
    description: '100 aliments ajoutes au total',
    icon: '💯',
    category: 'milestone',
    tier: 'silver',
    requirement: 100,
    xpReward: 200,
  },
  {
    id: 'foods_500',
    name: 'Veterant',
    description: '500 aliments ajoutes au total',
    icon: '🎖️',
    category: 'milestone',
    tier: 'gold',
    requirement: 500,
    xpReward: 500,
  },
  {
    id: 'foods_1000',
    name: 'Legendaire',
    description: '1000 aliments ajoutes au total',
    icon: '🏅',
    category: 'milestone',
    tier: 'diamond',
    requirement: 1000,
    xpReward: 1500,
  },
];

// ==================== LEVELS ====================

export const LEVEL_TITLES: { [key: number]: string } = {
  1: 'Debutant',
  2: 'Novice',
  3: 'Apprenti',
  4: 'Initie',
  5: 'Competent',
  6: 'Confirme',
  7: 'Expert',
  8: 'Maitre',
  9: 'Grand Maitre',
  10: 'Legende',
  11: 'Legende+',
  12: 'Legende++',
};

export function calculateXpForLevel(level: number): number {
  // Formule: 100 * niveau^1.5
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function getLevelFromXp(totalXp: number): { level: number; xp: number; xpToNextLevel: number } {
  let level = 1;
  let xpRequired = calculateXpForLevel(level);
  let accumulatedXp = 0;

  while (totalXp >= accumulatedXp + xpRequired) {
    accumulatedXp += xpRequired;
    level++;
    xpRequired = calculateXpForLevel(level);
  }

  return {
    level,
    xp: totalXp - accumulatedXp,
    xpToNextLevel: xpRequired,
  };
}

export function getLevelTitle(level: number): string {
  if (level >= 12) return LEVEL_TITLES[12];
  return LEVEL_TITLES[level] || 'Debutant';
}

// ==================== STORAGE ====================

const GAMIFICATION_KEY = '@zerogaspy_gamification';

export async function getGamificationData(): Promise<UserGamification> {
  try {
    const data = await AsyncStorage.getItem(GAMIFICATION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Erreur lecture gamification:', error);
  }
  return getDefaultGamification();
}

export async function saveGamificationData(data: UserGamification): Promise<void> {
  try {
    await AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error('Erreur sauvegarde gamification:', error);
  }
}

function getISOWeekKey(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getDefaultGamification(): UserGamification {
  return {
    level: 1,
    xp: 0,
    xpToNextLevel: calculateXpForLevel(1),
    totalXp: 0,
    badges: [],
    stats: {
      totalFoodsAdded: 0,
      totalFoodsConsumed: 0,
      totalFoodsThrown: 0,
      totalFoodsSaved: 0,
      totalRecipesViewed: 0,
      totalListsCreated: 0,
      daysActive: 0,
      lastActiveDate: '',
    },
    streaks: {
      currentNoWaste: 0,
      longestNoWaste: 0,
      currentDaily: 0,
      longestDaily: 0,
      lastNoWasteDate: '',
      lastDailyDate: '',
    },
    streakFreezes: {
      available: 0,
      lastWeeklyGrant: '',
      usedThisWeek: 0,
      totalUsed: 0,
    },
  };
}

// ==================== GAMIFICATION ACTIONS ====================

export interface GamificationResult {
  xpGained: number;
  newBadges: Badge[];
  levelUp: boolean;
  newLevel?: number;
  freezeUsed?: boolean;
}

async function updateGamification(
  updateFn: (data: UserGamification) => { data: UserGamification; xpGained: number; newBadges: Badge[]; freezeUsed?: boolean }
): Promise<GamificationResult> {
  const currentData = await getGamificationData();
  // Migrate old data without streakFreezes
  if (!currentData.streakFreezes) {
    currentData.streakFreezes = { available: 0, lastWeeklyGrant: '', usedThisWeek: 0, totalUsed: 0 };
  }
  const { data: updatedData, xpGained, newBadges, freezeUsed } = updateFn(currentData);

  const newTotalXp = updatedData.totalXp + xpGained;
  const levelInfo = getLevelFromXp(newTotalXp);
  const levelUp = levelInfo.level > updatedData.level;

  const finalData: UserGamification = {
    ...updatedData,
    totalXp: newTotalXp,
    level: levelInfo.level,
    xp: levelInfo.xp,
    xpToNextLevel: levelInfo.xpToNextLevel,
  };

  await saveGamificationData(finalData);

  return {
    xpGained,
    newBadges,
    levelUp,
    newLevel: levelUp ? levelInfo.level : undefined,
    freezeUsed,
  };
}

function checkAndUnlockBadges(
  data: UserGamification,
  category: BadgeCategory,
  currentValue: number
): { unlockedBadges: Badge[]; updatedBadges: UserBadge[] } {
  const categoryBadges = BADGES.filter(b => b.category === category);
  const unlockedBadges: Badge[] = [];
  const updatedBadges = [...data.badges];

  for (const badge of categoryBadges) {
    const existingBadge = updatedBadges.find(b => b.badgeId === badge.id);

    if (!existingBadge && currentValue >= badge.requirement) {
      // Nouveau badge debloque!
      updatedBadges.push({
        badgeId: badge.id,
        unlockedAt: new Date().toISOString(),
        progress: badge.requirement,
        isNew: true,
      });
      unlockedBadges.push(badge);
    } else if (existingBadge) {
      // Mettre a jour la progression
      existingBadge.progress = Math.min(currentValue, badge.requirement);
    } else {
      // Badge pas encore debloque, tracker la progression
      const progressBadge = updatedBadges.find(b => b.badgeId === badge.id);
      if (!progressBadge) {
        updatedBadges.push({
          badgeId: badge.id,
          unlockedAt: '',
          progress: currentValue,
          isNew: false,
        });
      }
    }
  }

  return { unlockedBadges, updatedBadges };
}

// ==================== PUBLIC API ====================

export async function onFoodAdded(): Promise<GamificationResult> {
  return updateGamification((data) => {
    data.stats.totalFoodsAdded++;

    const { unlockedBadges, updatedBadges } = checkAndUnlockBadges(
      data,
      'milestone',
      data.stats.totalFoodsAdded
    );

    const xpGained = 5 + unlockedBadges.reduce((sum, b) => sum + b.xpReward, 0);

    return {
      data: { ...data, badges: updatedBadges },
      xpGained,
      newBadges: unlockedBadges,
    };
  });
}

export async function onFoodConsumed(wasBeforeExpiration: boolean): Promise<GamificationResult> {
  return updateGamification((data) => {
    data.stats.totalFoodsConsumed++;

    let newBadges: Badge[] = [];
    let updatedBadges = [...data.badges];

    if (wasBeforeExpiration) {
      data.stats.totalFoodsSaved++;
      const saverResult = checkAndUnlockBadges(data, 'saver', data.stats.totalFoodsSaved);
      newBadges = [...newBadges, ...saverResult.unlockedBadges];
      updatedBadges = saverResult.updatedBadges;
    }

    const xpGained = (wasBeforeExpiration ? 10 : 3) + newBadges.reduce((sum, b) => sum + b.xpReward, 0);

    return {
      data: { ...data, badges: updatedBadges },
      xpGained,
      newBadges,
    };
  });
}

export async function onFoodThrown(): Promise<GamificationResult> {
  return updateGamification((data) => {
    data.stats.totalFoodsThrown++;

    if (data.streakFreezes.available > 0 && data.streaks.currentNoWaste > 0) {
      data.streakFreezes.available--;
      data.streakFreezes.usedThisWeek++;
      data.streakFreezes.totalUsed++;
      return { data, xpGained: 0, newBadges: [], freezeUsed: true };
    }

    data.streaks.currentNoWaste = 0;
    return { data, xpGained: 0, newBadges: [] };
  });
}

export async function onRecipeViewed(): Promise<GamificationResult> {
  return updateGamification((data) => {
    data.stats.totalRecipesViewed++;

    const { unlockedBadges, updatedBadges } = checkAndUnlockBadges(
      data,
      'explorer',
      data.stats.totalRecipesViewed
    );

    const xpGained = 2 + unlockedBadges.reduce((sum, b) => sum + b.xpReward, 0);

    return {
      data: { ...data, badges: updatedBadges },
      xpGained,
      newBadges: unlockedBadges,
    };
  });
}

export async function onListCreated(): Promise<GamificationResult> {
  return updateGamification((data) => {
    data.stats.totalListsCreated++;

    const { unlockedBadges, updatedBadges } = checkAndUnlockBadges(
      data,
      'organizer',
      data.stats.totalListsCreated
    );

    const xpGained = 15 + unlockedBadges.reduce((sum, b) => sum + b.xpReward, 0);

    return {
      data: { ...data, badges: updatedBadges },
      xpGained,
      newBadges: unlockedBadges,
    };
  });
}

export async function onDailyVisit(isPremium: boolean = false): Promise<GamificationResult> {
  return updateGamification((data) => {
    const today = new Date().toISOString().split('T')[0];

    if (data.stats.lastActiveDate === today) {
      return { data, xpGained: 0, newBadges: [] };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Auto-grant streak freeze: 1/week for free, replenish for premium
    const currentWeek = getISOWeekKey();
    if (data.streakFreezes.lastWeeklyGrant !== currentWeek) {
      data.streakFreezes.lastWeeklyGrant = currentWeek;
      data.streakFreezes.usedThisWeek = 0;
      if (isPremium) {
        data.streakFreezes.available = Math.max(data.streakFreezes.available, 3);
      } else {
        data.streakFreezes.available = Math.min(data.streakFreezes.available + 1, 1);
      }
    }

    if (data.stats.lastActiveDate === yesterdayStr) {
      data.streaks.currentDaily++;
    } else {
      data.streaks.currentDaily = 1;
    }

    if (data.streaks.currentDaily > data.streaks.longestDaily) {
      data.streaks.longestDaily = data.streaks.currentDaily;
    }

    data.streaks.lastDailyDate = today;
    data.stats.lastActiveDate = today;
    data.stats.daysActive++;

    // Mise a jour streak zero gaspillage (si pas de gaspillage hier)
    if (data.streaks.lastNoWasteDate === yesterdayStr || data.streaks.currentNoWaste === 0) {
      data.streaks.currentNoWaste++;
      data.streaks.lastNoWasteDate = today;

      if (data.streaks.currentNoWaste > data.streaks.longestNoWaste) {
        data.streaks.longestNoWaste = data.streaks.currentNoWaste;
      }
    }

    // Verifier les badges
    let allNewBadges: Badge[] = [];
    let updatedBadges = [...data.badges];

    // Badges streak quotidien
    const streakResult = checkAndUnlockBadges(
      { ...data, badges: updatedBadges },
      'streak',
      data.streaks.currentDaily
    );
    allNewBadges = [...allNewBadges, ...streakResult.unlockedBadges];
    updatedBadges = streakResult.updatedBadges;

    // Badges zero gaspillage
    const zeroWasteResult = checkAndUnlockBadges(
      { ...data, badges: updatedBadges },
      'zero_waste',
      data.streaks.currentNoWaste
    );
    allNewBadges = [...allNewBadges, ...zeroWasteResult.unlockedBadges];
    updatedBadges = zeroWasteResult.updatedBadges;

    const xpGained = 5 + allNewBadges.reduce((sum, b) => sum + b.xpReward, 0);

    return {
      data: { ...data, badges: updatedBadges },
      xpGained,
      newBadges: allNewBadges,
    };
  });
}

export async function markBadgeAsSeen(badgeId: string): Promise<void> {
  const data = await getGamificationData();
  const badge = data.badges.find(b => b.badgeId === badgeId);
  if (badge) {
    badge.isNew = false;
    await saveGamificationData(data);
  }
}

export async function markAllBadgesAsSeen(): Promise<void> {
  const data = await getGamificationData();
  data.badges.forEach(b => b.isNew = false);
  await saveGamificationData(data);
}

export function getBadgeById(badgeId: string): Badge | undefined {
  return BADGES.find(b => b.id === badgeId);
}

export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return BADGES.filter(b => b.category === category);
}

export function getTierColor(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#C0C0C0';
    case 'gold': return '#FFD700';
    case 'platinum': return '#E5E4E2';
    case 'diamond': return '#B9F2FF';
    default: return '#CD7F32';
  }
}

export function getTierBackgroundColor(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return '#FDF4E7';
    case 'silver': return '#F5F5F5';
    case 'gold': return '#FFFBEB';
    case 'platinum': return '#F8F8F8';
    case 'diamond': return '#F0FDFF';
    default: return '#FDF4E7';
  }
}

export function getCategoryName(category: BadgeCategory): string {
  switch (category) {
    case 'zero_waste': return 'Zero Gaspillage';
    case 'saver': return 'Aliments Sauves';
    case 'explorer': return 'Explorateur';
    case 'organizer': return 'Organisation';
    case 'streak': return 'Series';
    case 'milestone': return 'Jalons';
    default: return category;
  }
}

export function getCategoryIcon(category: BadgeCategory): string {
  switch (category) {
    case 'zero_waste': return '🌍';
    case 'saver': return '🛡️';
    case 'explorer': return '🍳';
    case 'organizer': return '📋';
    case 'streak': return '🔥';
    case 'milestone': return '🎯';
    default: return '🏆';
  }
}

export async function grantChallengeXp(amount: number): Promise<GamificationResult> {
  return updateGamification((data) => ({
    data,
    xpGained: amount,
    newBadges: [],
  }));
}
