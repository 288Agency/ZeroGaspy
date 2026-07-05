import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import PressableScale from './PressableScale';
import {
  WeeklyChallengesState,
  ChallengeDefinition,
  getActiveChallenges,
  getDifficultyColor,
} from '../services/challengeService';

interface WeeklyChallengeCardProps {
  challengesState: WeeklyChallengesState | null;
}

// Emoji des défs → SF Symbol (cohérent avec le reste de l'app, rend partout).
const CHALLENGE_SYMBOLS: Record<string, SFSymbol> = {
  zero_waste_week: 'arrow.3.trianglepath',
  save_20:         'shield.fill',
  save_5:          'leaf.fill',
  add_15:          'shippingbox.fill',
  add_5:           'target',
  recipes_10:      'fork.knife',
  recipes_3:       'book.fill',
  daily_5:         'calendar',
  daily_7:         'figure.run',
  consume_10:      'fork.knife.circle.fill',
  consume_25:      'bolt.fill',
  add_varied_3:    'square.grid.2x2.fill',
  streak_5:        'flame.fill',
  no_throw_3:      'leaf.fill',
  all_actions:     'trophy.fill',
  add_varied_5:    'archivebox.fill',
  recipes_15:      'fork.knife',
  no_throw_7:      'diamond.fill',
  consume_5:       'fork.knife',
};
const CHALLENGE_SYMBOL_DEFAULT: SFSymbol = 'target';

export default function WeeklyChallengeCard({ challengesState }: WeeklyChallengeCardProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!challengesState) return null;

  const activeDefs = getActiveChallenges(challengesState.weekKey);
  const completedCount = challengesState.challenges.filter(c => c.completed).length;

  // Find first incomplete challenge to display
  const firstIncomplete = challengesState.challenges.find(c => !c.completed);
  const firstIncompleteDef = firstIncomplete
    ? activeDefs.find(d => d.id === firstIncomplete.challengeId)
    : null;

  const allCompleted = completedCount === 3;
  const iconSymbol: SFSymbol = allCompleted
    ? 'trophy.fill'
    : CHALLENGE_SYMBOLS[firstIncompleteDef?.id ?? ''] ?? CHALLENGE_SYMBOL_DEFAULT;

  return (
    <PressableScale
      onPress={() => navigation.navigate('Challenges')}
      style={styles.container}
      hapticType="light"
      accessibilityLabel={t('challenges.weeklyChallenge')}
      accessibilityRole="button"
    >
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <SymbolView name={iconSymbol} size={22} tintColor={COLORS.primary[600]} />
        </View>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.sectionLabel}>DÉFI DE LA SEMAINE</Text>
        <Text style={styles.title} numberOfLines={1}>
          {allCompleted
            ? t('challenges.allCompleted')
            : t(firstIncompleteDef?.nameKey ?? 'challenges.weeklyChallenge')
          }
        </Text>

        {!allCompleted && firstIncomplete && firstIncompleteDef && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, (firstIncomplete.currentValue / firstIncompleteDef.targetValue) * 100)}%`,
                    backgroundColor: getDifficultyColor(firstIncompleteDef.difficulty),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {firstIncomplete.currentValue}/{firstIncompleteDef.targetValue}
            </Text>
          </View>
        )}

        <Text style={styles.completionText}>
          {t('challenges.completedOf', { count: completedCount, total: 3 })}
        </Text>
      </View>

      <View style={styles.chevronContainer}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginTop: scaleSpacing(isSmallScreen ? 12 : 16),
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
    borderWidth: 1,
    borderColor: 'rgba(60, 110, 71, 0.15)',
    ...SHADOWS.sm,
  },
  leftSection: {
    marginRight: scaleSpacing(12),
  },
  iconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(60,110,71,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: scaleSize(22),
  },
  contentSection: {
    flex: 1,
  },
  title: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 15),
    fontWeight: '600',
    color: COLORS.primary[700],
    marginBottom: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(60, 110, 71, 0.15)',
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: COLORS.text.tertiary,
    minWidth: 30,
    textAlign: 'right',
  },
  completionText: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  chevronContainer: {
    marginLeft: SPACING.sm,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.primary[500],
    fontWeight: '300',
  },
  sectionLabel: {
    fontSize: scaleFontSize(9),
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
});
