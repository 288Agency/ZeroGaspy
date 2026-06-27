// ============================================================================
// ZeroGaspy · screens/ChallengesScreen.tsx (handoff port — "Défis")
// ============================================================================
// 3 défis hebdomadaires gamifiés. Summary card + cards par défi + history.
// Animation célébration quand 3/3 complétés. Port iso-features avec DS v2.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage } from '@/tokens';
import { Badge } from '@/components/ds';
import { SkeletonChallengesContent } from '@/components/Skeleton';
import { useGamification } from '@/contexts/GamificationContext';
import {
  getActiveChallenges,
  getWeekDateRange,
  getDifficultyColor,
  getDifficultyBgColor,
  ChallengeDefinition,
  ChallengeProgress,
  WeeklyHistory,
} from '@/services/challengeService';

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { challengesState, refreshChallenges } = useGamification();

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;

  const [activeDefs, setActiveDefs] = useState<ChallengeDefinition[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  useEffect(() => {
    if (challengesState) {
      setActiveDefs(getActiveChallenges(challengesState.weekKey));
      const range = getWeekDateRange(challengesState.weekKey);
      setDateRange({ start: formatDate(range.start), end: formatDate(range.end) });
    }
  }, [challengesState]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [headerFade, contentFade]);

  useEffect(() => {
    if (challengesState) {
      const allCompleted = challengesState.challenges.filter((c) => c.completed).length === 3;
      if (allCompleted) {
        Animated.spring(celebrationScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 6,
        }).start();
      }
    }
  }, [challengesState, celebrationScale]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshChallenges();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <Animated.View style={[styles.topbar, { opacity: headerFade }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.topbarBtn,
            { backgroundColor: colors.bg.surface, opacity: pressed ? 0.55 : 1 },
          ]}
        >
          <SymbolView name="chevron.left" size={20} tintColor={colors.fg.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.eyebrow, { color: colors.fg.secondary }]}>
            {challengesState
              ? t('challenges.dateRange', { start: dateRange.start, end: dateRange.end })
              : t('common.loading')}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('challenges.screenTitle')}
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 4,
          paddingBottom: 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Forest[600]}
          />
        }
      >
        {!challengesState ? (
          <SkeletonChallengesContent />
        ) : (
          <Animated.View style={{ opacity: contentFade }}>
            <SummaryCard
              completedCount={challengesState.challenges.filter((c) => c.completed).length}
              totalXp={challengesState.challenges
                .filter((c) => c.completed)
                .reduce((sum, c) => {
                  const def = activeDefs.find((d) => d.id === c.challengeId);
                  return sum + (def?.xpReward ?? 0);
                }, 0)}
            />

            {challengesState.challenges.filter((c) => c.completed).length === 3 && (
              <Animated.View
                style={[
                  styles.celebrationCard,
                  {
                    backgroundColor: Sage[100],
                    borderColor: Forest[600],
                    transform: [{ scale: celebrationScale }],
                  },
                ]}
              >
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={[styles.celebrationTitle, { color: colors.fg.primary }]}>
                  {t('challenges.allCompletedTitle')}
                </Text>
                <Text style={[styles.celebrationSub, { color: colors.fg.secondary }]}>
                  {t('challenges.allCompletedSubtitle', {
                    xp: challengesState.challenges
                      .filter((c) => c.completed)
                      .reduce((sum, c) => {
                        const def = activeDefs.find((d) => d.id === c.challengeId);
                        return sum + (def?.xpReward ?? 0);
                      }, 0),
                  })}
                </Text>
              </Animated.View>
            )}

            {challengesState.challenges.map((progress, index) => {
              const def = activeDefs.find((d) => d.id === progress.challengeId);
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

            {challengesState.history.length > 0 && (
              <View style={styles.historySection}>
                <Text style={[styles.historyTitle, { color: colors.fg.primary }]}>
                  {t('challenges.history')}
                </Text>
                <View
                  style={[
                    styles.historyCard,
                    { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
                  ]}
                >
                  {challengesState.history.slice(0, 5).map((entry, idx) => (
                    <HistoryRow
                      key={entry.weekKey}
                      entry={entry}
                      isLast={idx === Math.min(challengesState.history.length, 5) - 1}
                    />
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Atoms
// ============================================================================

function SummaryCard({ completedCount, totalXp }: { completedCount: number; totalXp: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
      ]}
    >
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Forest[600] }]}>
            {completedCount}/3
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.fg.tertiary }]}>
            {t('challenges.completed')}
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border.subtle }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#D4A017' }]}>+{totalXp}</Text>
          <Text style={[styles.summaryLabel, { color: colors.fg.tertiary }]}>XP</Text>
        </View>
      </View>
      <View style={styles.progressDots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < completedCount ? Forest[600] : colors.border.subtle,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

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
  const { colors } = useTheme();
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
  }, [fadeAnim, slideAnim, index]);

  const progressPercent =
    definition.trackingType === 'boolean_inverse'
      ? progress.currentValue === 1
        ? 100
        : 0
      : Math.min(100, (progress.currentValue / definition.targetValue) * 100);

  const diffColor = getDifficultyColor(definition.difficulty);
  const diffBgColor = getDifficultyBgColor(definition.difficulty);

  return (
    <Animated.View
      style={[
        styles.challengeCard,
        {
          backgroundColor: colors.bg.surface,
          borderColor: progress.completed ? Forest[600] : colors.border.subtle,
        },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.challengeHeader}>
        <View style={[styles.challengeIconBox, { backgroundColor: Sage[100] }]}>
          <Text style={styles.challengeIcon}>{definition.icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={[
              styles.challengeName,
              { color: progress.completed ? Forest[600] : colors.fg.primary },
            ]}
          >
            {t(definition.nameKey)}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            <View
              style={[
                styles.diffBadge,
                { backgroundColor: diffBgColor },
              ]}
            >
              <Text style={[styles.diffText, { color: diffColor }]}>
                {t(`challenges.difficulty.${definition.difficulty}`)}
              </Text>
            </View>
          </View>
        </View>
        <Badge tone="reward" variant="soft" dot={false}>
          +{definition.xpReward} XP
        </Badge>
      </View>

      <Text style={[styles.challengeDesc, { color: colors.fg.secondary }]}>
        {t(definition.descriptionKey)}
      </Text>

      <View style={styles.progressRow}>
        <View style={[styles.progressBg, { backgroundColor: colors.bg.sunken }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: progress.completed ? Forest[600] : diffColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.fg.secondary }]}>
          {definition.trackingType === 'boolean_inverse'
            ? progress.currentValue === 1
              ? '✓'
              : '✗'
            : `${progress.currentValue}/${definition.targetValue}`}
        </Text>
      </View>

      {progress.completed && (
        <View style={styles.completedRow}>
          <SymbolView name="checkmark.circle.fill" size={14} tintColor={Forest[600]} />
          <Text style={[styles.completedText, { color: Forest[600] }]}>
            {t('challenges.challengeCompleted')}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

function HistoryRow({ entry, isLast }: { entry: WeeklyHistory; isLast: boolean }) {
  const { colors } = useTheme();
  const { start, end } = getWeekDateRange(entry.weekKey);
  const label = `${formatDate(start)} - ${formatDate(end)}`;
  return (
    <View
      style={[
        styles.historyRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
      ]}
    >
      <Text style={[styles.historyWeek, { color: colors.fg.secondary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Text style={[styles.historyCompleted, { color: colors.fg.primary }]}>
          {entry.completedCount}/3
        </Text>
        {entry.totalXpEarned > 0 && (
          <Text style={[styles.historyXp, { color: '#D4A017' }]}>
            +{entry.totalXpEarned} XP
          </Text>
        )}
      </View>
    </View>
  );
}

function formatDate(date: Date): string {
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  topbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  celebrationCard: {
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  celebrationEmoji: {
    fontSize: 44,
    marginBottom: 6,
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  celebrationSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  challengeCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIcon: {
    fontSize: 22,
  },
  challengeName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historySection: {
    marginTop: 16,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  historyCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyWeek: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyCompleted: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyXp: {
    fontSize: 12,
    fontWeight: '700',
  },
});
