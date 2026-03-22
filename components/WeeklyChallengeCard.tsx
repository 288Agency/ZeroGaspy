import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
          <Text style={styles.icon}>
            {allCompleted ? '🏆' : (firstIncompleteDef?.icon ?? '🎯')}
          </Text>
        </View>
      </View>

      <View style={styles.contentSection}>
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
    backgroundColor: COLORS.primary[700],
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginTop: scaleSpacing(isSmallScreen ? 12 : 16),
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
    borderWidth: 0,
    ...SHADOWS.colored(COLORS.primary[700], 0.4),
  },
  leftSection: {
    marginRight: scaleSpacing(12),
  },
  iconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(74,222,128,0.15)',
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
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    color: COLORS.text.secondary,
    minWidth: 30,
    textAlign: 'right',
  },
  completionText: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  chevronContainer: {
    marginLeft: SPACING.sm,
  },
  chevron: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '300',
  },
});
