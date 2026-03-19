import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import PressableScale from '../components/PressableScale';
import { useGamification } from '../contexts/GamificationContext';
import {
  getActiveChallenges,
  getWeekDateRange,
  getChallengeById,
  getDifficultyColor,
  getDifficultyBgColor,
  ChallengeDefinition,
  ChallengeProgress,
  WeeklyHistory,
} from '../services/challengeService';

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { challengesState, refreshChallenges } = useGamification();

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;

  const [activeDefs, setActiveDefs] = useState<ChallengeDefinition[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    refreshChallenges();
  }, []);

  useEffect(() => {
    if (challengesState) {
      const defs = getActiveChallenges(challengesState.weekKey);
      setActiveDefs(defs);

      const range = getWeekDateRange(challengesState.weekKey);
      setDateRange({
        start: formatDate(range.start),
        end: formatDate(range.end),
      });
    }
  }, [challengesState]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Celebration animation when all 3 completed
  useEffect(() => {
    if (challengesState) {
      const allCompleted = challengesState.challenges.filter(c => c.completed).length === 3;
      if (allCompleted) {
        Animated.spring(celebrationScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 6,
        }).start();
      }
    }
  }, [challengesState]);

  if (!challengesState) return null;

  const completedCount = challengesState.challenges.filter(c => c.completed).length;
  const totalXpEarned = challengesState.challenges
    .filter(c => c.completed)
    .reduce((sum, c) => {
      const def = activeDefs.find(d => d.id === c.challengeId);
      return sum + (def?.xpReward ?? 0);
    }, 0);
  const allCompleted = completedCount === 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hapticType="light"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
          </PressableScale>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{t('challenges.screenTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('challenges.dateRange', { start: dateRange.start, end: dateRange.end })}
            </Text>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: contentFade }}>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{completedCount}/3</Text>
                  <Text style={styles.summaryLabel}>{t('challenges.completed')}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.accent.gold }]}>
                    +{totalXpEarned}
                  </Text>
                  <Text style={styles.summaryLabel}>XP</Text>
                </View>
              </View>

              {/* Progress dots */}
              <View style={styles.progressDots}>
                {[0, 1, 2].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i < completedCount && styles.dotCompleted,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* All completed celebration */}
            {allCompleted && (
              <Animated.View
                style={[
                  styles.celebrationCard,
                  { transform: [{ scale: celebrationScale }] },
                ]}
              >
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={styles.celebrationTitle}>
                  {t('challenges.allCompletedTitle')}
                </Text>
                <Text style={styles.celebrationSubtitle}>
                  {t('challenges.allCompletedSubtitle', { xp: totalXpEarned })}
                </Text>
              </Animated.View>
            )}

            {/* Challenge cards */}
            {challengesState.challenges.map((progress, index) => {
              const def = activeDefs.find(d => d.id === progress.challengeId);
              if (!def) return null;

              return (
                <ChallengeCard
                  key={def.id}
                  definition={def}
                  progress={progress}
                  index={index}
                />
              );
            })}

            {/* History section */}
            {challengesState.history.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>{t('challenges.history')}</Text>
                {challengesState.history.slice(0, 5).map((entry, idx) => (
                  <HistoryRow key={entry.weekKey} entry={entry} index={idx} />
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ==================== SUB-COMPONENTS ====================

function ChallengeCard({
  definition,
  progress,
  index,
}: {
  definition: ChallengeDefinition;
  progress: ChallengeProgress;
  index: number;
}) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 100,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
    ]).start();
  }, []);

  const progressPercent = definition.trackingType === 'boolean_inverse'
    ? (progress.currentValue === 1 ? 100 : 0)
    : Math.min(100, (progress.currentValue / definition.targetValue) * 100);

  const diffColor = getDifficultyColor(definition.difficulty);
  const diffBgColor = getDifficultyBgColor(definition.difficulty);

  return (
    <Animated.View
      style={[
        styles.challengeCard,
        progress.completed && styles.challengeCardCompleted,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.challengeHeader}>
        <View style={styles.challengeIconContainer}>
          <Text style={styles.challengeIcon}>{definition.icon}</Text>
        </View>

        <View style={styles.challengeInfo}>
          <Text style={[styles.challengeName, progress.completed && styles.challengeNameCompleted]}>
            {t(definition.nameKey)}
          </Text>
          <View style={[styles.difficultyBadge, { backgroundColor: diffBgColor }]}>
            <Text style={[styles.difficultyText, { color: diffColor }]}>
              {t(`challenges.difficulty.${definition.difficulty}`)}
            </Text>
          </View>
        </View>

        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeText}>+{definition.xpReward} XP</Text>
        </View>
      </View>

      <Text style={styles.challengeDescription}>
        {t(definition.descriptionKey)}
      </Text>

      {/* Progress bar */}
      <View style={styles.challengeProgressContainer}>
        <View style={styles.challengeProgressBg}>
          <View
            style={[
              styles.challengeProgressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: progress.completed ? COLORS.semantic.success : diffColor,
              },
            ]}
          />
        </View>
        <Text style={styles.challengeProgressText}>
          {definition.trackingType === 'boolean_inverse'
            ? (progress.currentValue === 1 ? '✓' : '✗')
            : `${progress.currentValue}/${definition.targetValue}`
          }
        </Text>
      </View>

      {progress.completed && (
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.semantic.success} />
          <Text style={styles.completedText}>{t('challenges.challengeCompleted')}</Text>
        </View>
      )}
    </Animated.View>
  );
}

function HistoryRow({ entry, index }: { entry: WeeklyHistory; index: number }) {
  const { t } = useTranslation();
  const { start, end } = getWeekDateRange(entry.weekKey);
  const label = `${formatDate(start)} - ${formatDate(end)}`;

  return (
    <View style={[styles.historyRow, index > 0 && styles.historyRowBorder]}>
      <Text style={styles.historyWeek}>{label}</Text>
      <View style={styles.historyStats}>
        <Text style={styles.historyCompleted}>
          {entry.completedCount}/3
        </Text>
        {entry.totalXpEarned > 0 && (
          <Text style={styles.historyXp}>+{entry.totalXpEarned} XP</Text>
        )}
      </View>
    </View>
  );
}

// ==================== HELPERS ====================

function formatDate(date: Date): string {
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    paddingTop: scaleSpacing(isSmallScreen ? 8 : 12),
    paddingBottom: scaleSpacing(12),
  },
  backButton: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: RADIUS.md,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 22 : 26),
    fontWeight: '700',
    color: COLORS.primary[500],
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: scaleFontSize(12),
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    paddingBottom: scaleSpacing(40),
  },
  // Summary card
  summaryCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS['2xl'],
    padding: scaleSpacing(isSmallScreen ? 16 : 20),
    marginBottom: scaleSpacing(isSmallScreen ? 16 : 20),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.1),
    ...SHADOWS.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  summaryValue: {
    fontSize: scaleFontSize(28),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  summaryLabel: {
    fontSize: scaleFontSize(12),
    color: COLORS.text.tertiary,
    fontWeight: '500',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.neutral.gray200,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.neutral.gray200,
  },
  dotCompleted: {
    backgroundColor: COLORS.semantic.success,
  },
  // Celebration
  celebrationCard: {
    backgroundColor: COLORS.surface.successBg,
    borderRadius: RADIUS['2xl'],
    padding: scaleSpacing(20),
    alignItems: 'center',
    marginBottom: scaleSpacing(isSmallScreen ? 16 : 20),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.semantic.success, 0.2),
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  celebrationTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: COLORS.primary[500],
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  // Challenge card
  challengeCard: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(isSmallScreen ? 14 : 16),
    marginBottom: scaleSpacing(12),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.08),
    ...SHADOWS.xs,
  },
  challengeCardCompleted: {
    borderColor: hexToRgba(COLORS.semantic.success, 0.3),
    backgroundColor: hexToRgba(COLORS.semantic.success, 0.02),
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  challengeIconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: RADIUS.lg,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  challengeIcon: {
    fontSize: scaleSize(22),
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: scaleFontSize(isSmallScreen ? 15 : 16),
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  challengeNameCompleted: {
    color: COLORS.semantic.success,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  difficultyText: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpBadge: {
    backgroundColor: hexToRgba(COLORS.accent.gold, 0.1),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  xpBadgeText: {
    fontSize: scaleFontSize(12),
    fontWeight: '700',
    color: COLORS.accent.amber,
  },
  challengeDescription: {
    fontSize: scaleFontSize(13),
    color: COLORS.text.secondary,
    lineHeight: scaleFontSize(18),
    marginBottom: SPACING.md,
  },
  challengeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeProgressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.neutral.gray200,
    overflow: 'hidden',
    marginRight: SPACING.md,
  },
  challengeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  challengeProgressText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: COLORS.text.secondary,
    minWidth: 40,
    textAlign: 'right',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  completedText: {
    fontSize: scaleFontSize(12),
    color: COLORS.semantic.success,
    fontWeight: '600',
  },
  // History
  historySection: {
    marginTop: scaleSpacing(isSmallScreen ? 12 : 20),
  },
  historyTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 18 : 20),
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  historyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.gray200,
  },
  historyWeek: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  historyCompleted: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  historyXp: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: COLORS.accent.gold,
  },
});
