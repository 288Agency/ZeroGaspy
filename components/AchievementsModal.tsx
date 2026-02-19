import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  UserGamification,
  Badge,
  BadgeCategory,
  BADGES,
  getGamificationData,
  getBadgeById,
  getTierColor,
  getTierBackgroundColor,
  getCategoryName,
  getCategoryIcon,
  getLevelTitle,
  markAllBadgesAsSeen,
} from '../services/gamificationService';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

interface AchievementsModalProps {
  visible: boolean;
  onClose: () => void;
}

type ViewMode = 'overview' | 'badges' | 'stats';

const CATEGORIES: BadgeCategory[] = [
  'zero_waste',
  'saver',
  'streak',
  'explorer',
  'organizer',
  'milestone',
];

export default function AchievementsModal({ visible, onClose }: AchievementsModalProps) {
  const { t } = useTranslation();
  const [gamificationData, setGamificationData] = useState<UserGamification | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    const data = await getGamificationData();
    setGamificationData(data);
  };

  const handleClose = async () => {
    await markAllBadgesAsSeen();
    setViewMode('overview');
    setSelectedCategory(null);
    onClose();
  };

  const getUnlockedBadgesCount = (category?: BadgeCategory): number => {
    if (!gamificationData) return 0;
    const badges = category
      ? BADGES.filter(b => b.category === category)
      : BADGES;
    return badges.filter(b =>
      gamificationData.badges.some(ub => ub.badgeId === b.id && ub.unlockedAt)
    ).length;
  };

  const getTotalBadgesCount = (category?: BadgeCategory): number => {
    return category
      ? BADGES.filter(b => b.category === category).length
      : BADGES.length;
  };

  const getBadgeProgress = (badge: Badge): number => {
    if (!gamificationData) return 0;
    const userBadge = gamificationData.badges.find(b => b.badgeId === badge.id);
    if (!userBadge) return 0;
    return Math.min(userBadge.progress / badge.requirement, 1);
  };

  const isBadgeUnlocked = (badge: Badge): boolean => {
    if (!gamificationData) return false;
    const userBadge = gamificationData.badges.find(b => b.badgeId === badge.id);
    return userBadge?.unlockedAt ? true : false;
  };

  const isBadgeNew = (badge: Badge): boolean => {
    if (!gamificationData) return false;
    const userBadge = gamificationData.badges.find(b => b.badgeId === badge.id);
    return userBadge?.isNew || false;
  };

  const xpProgress = gamificationData
    ? gamificationData.xp / gamificationData.xpToNextLevel
    : 0;

  const renderOverview = () => (
    <View>
      {/* Niveau et XP */}
      <View style={styles.levelBox}>
        <View style={styles.levelHeader}>
          <View>
            <Text style={styles.levelLabel}>{t('achievements.level', { level: gamificationData?.level })}</Text>
            <Text style={styles.levelTitle}>
              {getLevelTitle(gamificationData?.level || 1)}
            </Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              {gamificationData?.level || 1}
            </Text>
          </View>
        </View>

        {/* Barre XP */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabels}>
            <Text style={styles.xpLabel}>XP</Text>
            <Text style={styles.xpLabel}>
              {gamificationData?.xp || 0} / {gamificationData?.xpToNextLevel || 100}
            </Text>
          </View>
          <View style={styles.xpBarBg}>
            <View
              style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]}
            />
          </View>
        </View>

        <Text style={styles.totalXpText}>
          {t('achievements.totalXp', { xp: gamificationData?.totalXp || 0 })}
        </Text>
      </View>

      {/* Streaks */}
      <View style={styles.streaksRow}>
        <View style={styles.streakCardOrange}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakValueOrange}>
            {gamificationData?.streaks.currentDaily || 0}
          </Text>
          <Text style={styles.streakLabelOrange}>{t('achievements.consecutiveDays')}</Text>
        </View>
        <View style={styles.streakCardGreen}>
          <Text style={styles.streakEmoji}>🌱</Text>
          <Text style={styles.streakValueGreen}>
            {gamificationData?.streaks.currentNoWaste || 0}
          </Text>
          <Text style={styles.streakLabelGreen}>{t('achievements.zeroWaste')}</Text>
        </View>
      </View>

      {/* Badges Resume */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>{t('achievements.badges')}</Text>
        <TouchableOpacity onPress={() => setViewMode('badges')}>
          <Text style={styles.sectionHeaderLink}>{t('achievements.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.badgesGrid}>
        {BADGES.filter(b => isBadgeUnlocked(b)).slice(0, 8).map(badge => (
          <View
            key={badge.id}
            style={[styles.badgeThumb, { backgroundColor: getTierBackgroundColor(badge.tier) }]}
          >
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
            {isBadgeNew(badge) && (
              <View style={styles.newDot} />
            )}
          </View>
        ))}
        {getUnlockedBadgesCount() === 0 && (
          <Text style={styles.noBadgesText}>
            {t('achievements.noBadges')}
          </Text>
        )}
      </View>

      {/* Statistiques Resume */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>{t('achievements.statistics')}</Text>
        <TouchableOpacity onPress={() => setViewMode('stats')}>
          <Text style={styles.sectionHeaderLink}>{t('achievements.details')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsSummaryBox}>
        <View style={styles.statsRowMb}>
          <Text style={styles.statsLabel}>{t('achievements.foodSaved')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.totalFoodsSaved || 0}
          </Text>
        </View>
        <View style={styles.statsRowMb}>
          <Text style={styles.statsLabel}>{t('achievements.foodAdded')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.totalFoodsAdded || 0}
          </Text>
        </View>
        <View style={styles.statsRowLast}>
          <Text style={styles.statsLabel}>{t('achievements.daysActive')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.daysActive || 0}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBadges = () => (
    <View>
      <TouchableOpacity
        onPress={() => {
          if (selectedCategory) {
            setSelectedCategory(null);
          } else {
            setViewMode('overview');
          }
        }}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        <Text style={styles.backText}>{t('achievements.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>
        {selectedCategory ? getCategoryName(selectedCategory) : t('achievements.allBadges')}
      </Text>
      <Text style={styles.pageSubtitle}>
        {t('achievements.unlockedCount', { unlocked: getUnlockedBadgesCount(selectedCategory || undefined), total: getTotalBadgesCount(selectedCategory || undefined) })}
      </Text>

      {selectedCategory ? (
        // Afficher les badges de la categorie
        <View style={styles.gap3}>
          {BADGES.filter(b => b.category === selectedCategory).map(badge => {
            const unlocked = isBadgeUnlocked(badge);
            const progress = getBadgeProgress(badge);
            const userBadge = gamificationData?.badges.find(b => b.badgeId === badge.id);

            return (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked,
                ]}
              >
                <View style={styles.badgeCardRow}>
                  <View
                    style={[
                      styles.badgeCardIcon,
                      !unlocked && styles.badgeCardIconLocked,
                      { backgroundColor: unlocked ? getTierBackgroundColor(badge.tier) : COLORS.surface.disabledBg },
                    ]}
                  >
                    <Text style={styles.badgeIcon}>{unlocked ? badge.icon : '🔒'}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <View style={styles.badgeNameRow}>
                      <Text style={[styles.badgeName, unlocked ? styles.badgeNameUnlocked : styles.badgeNameLocked]}>
                        {badge.name}
                      </Text>
                      {isBadgeNew(badge) && (
                        <View style={styles.newBadgeTag}>
                          <Text style={styles.newBadgeTagText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.badgeDesc, unlocked ? styles.badgeDescUnlocked : styles.badgeDescLocked]}>
                      {badge.description}
                    </Text>
                    {!unlocked && (
                      <View style={styles.progressSection}>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {userBadge?.progress || 0} / {badge.requirement}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.badgeXpCol}>
                    <View
                      style={[styles.tierDot, { backgroundColor: getTierColor(badge.tier) }]}
                    />
                    <Text style={styles.xpRewardText}>+{badge.xpReward} XP</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        // Afficher les categories
        <View style={styles.gap3}>
          {CATEGORIES.map(category => (
            <PressableScale
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={styles.categoryCard}
              hapticType="light"
            >
              <View style={styles.categoryIcon}>
                <Text style={styles.badgeIcon}>{getCategoryIcon(category)}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.categoryName}>{getCategoryName(category)}</Text>
                <Text style={styles.categoryCount}>
                  {t('achievements.badgesCount', { unlocked: getUnlockedBadgesCount(category), total: getTotalBadgesCount(category) })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );

  const renderStats = () => (
    <View>
      <TouchableOpacity
        onPress={() => setViewMode('overview')}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        <Text style={styles.backText}>{t('achievements.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.statsPageTitle}>
        {t('achievements.detailedStats')}
      </Text>

      {/* Streaks */}
      <Text style={styles.statsSectionLabel}>{t('achievements.streaks')}</Text>
      <View style={styles.statsCard}>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.currentStreak')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.streaks.currentDaily || 0}
          </Text>
        </View>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.streakRecord')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.streaks.longestDaily || 0}
          </Text>
        </View>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.currentNoWaste')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.streaks.currentNoWaste || 0} {t('achievements.days')}
          </Text>
        </View>
        <View style={styles.statsItemLast}>
          <Text style={styles.statsLabel}>{t('achievements.noWasteRecord')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.streaks.longestNoWaste || 0} {t('achievements.days')}
          </Text>
        </View>
      </View>

      {/* Aliments */}
      <Text style={styles.statsSectionLabel}>{t('achievements.food')}</Text>
      <View style={styles.statsCard}>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.totalAdded')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.totalFoodsAdded || 0}
          </Text>
        </View>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.consumed')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.totalFoodsConsumed || 0}
          </Text>
        </View>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.savedBeforeExpiry')}</Text>
          <Text style={styles.statsValueGreen}>
            {gamificationData?.stats.totalFoodsSaved || 0}
          </Text>
        </View>
        <View style={styles.statsItemLast}>
          <Text style={styles.statsLabel}>{t('achievements.thrown')}</Text>
          <Text style={styles.statsValueRed}>
            {gamificationData?.stats.totalFoodsThrown || 0}
          </Text>
        </View>
      </View>

      {/* Activite */}
      <Text style={styles.statsSectionLabel}>{t('achievements.activitySection')}</Text>
      <View style={styles.statsCard}>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.totalDaysActive')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.daysActive || 0}
          </Text>
        </View>
        <View style={styles.statsItemBorder}>
          <Text style={styles.statsLabel}>{t('achievements.recipesViewed')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.totalRecipesViewed || 0}
          </Text>
        </View>
        <View style={styles.statsItemLast}>
          <Text style={styles.statsLabel}>{t('achievements.listsCreated')}</Text>
          <Text style={styles.statsValue}>
            {gamificationData?.stats.totalListsCreated || 0}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'badges':
        return renderBadges();
      case 'stats':
        return renderStats();
      default:
        return renderOverview();
    }
  };

  if (!gamificationData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>{t('achievements.title')}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerCloseButton}>
            <Ionicons name="close" size={24} color={COLORS.primary[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  headerCloseButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  flex1: {
    flex: 1,
  },

  // Overview - Level Box
  levelBox: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS['2xl'],
    padding: SPACING.xl,
    marginBottom: SPACING['2xl'],
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  levelLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  levelTitle: {
    color: COLORS.neutral.white,
    fontSize: 24,
    fontWeight: '700',
  },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    color: COLORS.neutral.white,
    fontSize: 24,
    fontWeight: '700',
  },
  xpSection: {
    marginBottom: SPACING.sm,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  xpLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  xpBarBg: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondary.sage,
    borderRadius: RADIUS.full,
  },
  totalXpText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },

  // Streaks
  streaksRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING['2xl'],
  },
  streakCardOrange: {
    flex: 1,
    backgroundColor: COLORS.surface.achievementBg,
    borderWidth: 1,
    borderColor: COLORS.surface.achievementBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  streakCardGreen: {
    flex: 1,
    backgroundColor: COLORS.surface.successBg,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 30,
    marginBottom: SPACING.xs,
  },
  streakValueOrange: {
    color: COLORS.text.achievement,
    fontSize: 24,
    fontWeight: '700',
  },
  streakLabelOrange: {
    color: 'rgba(234, 88, 12, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  streakValueGreen: {
    color: COLORS.semantic.success,
    fontSize: 24,
    fontWeight: '700',
  },
  streakLabelGreen: {
    color: 'rgba(76, 175, 80, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  sectionHeaderTitle: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  sectionHeaderLink: {
    color: COLORS.primary[500],
    fontWeight: '500',
  },

  // Badges Grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING['2xl'],
  },
  badgeThumb: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 24,
  },
  newDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    backgroundColor: COLORS.semantic.danger,
    borderRadius: RADIUS.full,
  },
  noBadgesText: {
    color: COLORS.text.tertiary,
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Stats Summary
  statsSummaryBox: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  statsRowMb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statsRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsLabel: {
    color: COLORS.text.tertiary,
  },
  statsValue: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  statsValueGreen: {
    color: COLORS.semantic.success,
    fontWeight: '600',
  },
  statsValueRed: {
    color: COLORS.semantic.danger,
    fontWeight: '600',
  },

  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  // Badges page
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING.sm,
  },
  pageSubtitle: {
    color: COLORS.text.tertiary,
    marginBottom: SPACING['2xl'],
  },
  gap3: {
    gap: SPACING.md,
  },

  // Badge card
  badgeCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  badgeCardUnlocked: {
    backgroundColor: COLORS.neutral.white,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  badgeCardLocked: {
    backgroundColor: COLORS.neutral.gray50,
    borderColor: COLORS.surface.disabledBg,
  },
  badgeCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeCardIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  badgeCardIconLocked: {
    opacity: 0.4,
  },
  badgeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeName: {
    fontWeight: '600',
  },
  badgeNameUnlocked: {
    color: COLORS.primary[500],
  },
  badgeNameLocked: {
    color: COLORS.neutral.grayDisabled,
  },
  newBadgeTag: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.semantic.danger,
    borderRadius: RADIUS.full,
  },
  newBadgeTagText: {
    color: COLORS.neutral.white,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeDesc: {
    fontSize: 14,
  },
  badgeDescUnlocked: {
    color: COLORS.text.tertiary,
  },
  badgeDescLocked: {
    color: COLORS.neutral.grayDisabled,
  },
  progressSection: {
    marginTop: SPACING.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.surface.disabledBg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondary.sage,
    borderRadius: RADIUS.full,
  },
  progressText: {
    color: COLORS.neutral.grayDisabled,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  badgeXpCol: {
    alignItems: 'flex-end',
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  xpRewardText: {
    color: COLORS.text.tertiary,
    fontSize: 12,
  },

  // Category cards
  categoryCard: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  categoryName: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  categoryCount: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },

  // Stats page
  statsPageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING['2xl'],
  },
  statsSectionLabel: {
    color: COLORS.primary[500],
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  statsCard: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  statsItemBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  statsItemLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
