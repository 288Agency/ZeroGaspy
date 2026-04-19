import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, getBadgeName, getTierBackgroundColor, getTierColor } from '../services/gamificationService';
import { ChallengeCompletionResult } from '../services/challengeService';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/designSystem';

interface AchievementToastProps {
  badge: Badge | null;
  xpGained: number;
  levelUp: boolean;
  newLevel?: number;
  challengeCompleted?: ChallengeCompletionResult;
  freezeUsed?: boolean;
  visible: boolean;
  onHide: () => void;
}

const { width } = Dimensions.get('window');

export default function AchievementToast({
  badge,
  xpGained,
  levelUp,
  newLevel,
  challengeCompleted,
  freezeUsed,
  visible,
  onHide,
}: AchievementToastProps) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entree
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();

      // Auto-hide apres 4 secondes
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        zIndex: 9999,
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    >
      <View
        style={[
          styles.toastContainer,
          {
            backgroundColor: freezeUsed
              ? '#E8F4FD'
              : challengeCompleted
                ? COLORS.surface.achievementBg
                : badge
                  ? getTierBackgroundColor(badge.tier)
                  : COLORS.surface.successBg,
            borderWidth: 2,
            borderColor: freezeUsed
              ? '#64B5F6'
              : challengeCompleted
                ? COLORS.surface.achievementBorder
                : badge
                  ? getTierColor(badge.tier)
                  : COLORS.semantic.successLight,
          },
        ]}
      >
        {freezeUsed ? (
          <View style={styles.row}>
            <View style={[styles.badgeIconContainer, { backgroundColor: '#E8F4FD' }]}>
              <Text style={styles.emojiText}>🛡️</Text>
            </View>
            <View style={styles.contentFlex}>
              <Text style={[styles.badgeLabelText, { color: '#2196F3' }]}>
                Streak Freeze
              </Text>
              <Text style={styles.titleText}>
                {t('gamification.streakFreezeUsed')}
              </Text>
            </View>
            <Text style={styles.emojiText}>❄️</Text>
          </View>
        ) : challengeCompleted ? (
          // Challenge Completed Toast
          <View style={styles.row}>
            <View style={styles.badgeIconContainer}>
              <Text style={styles.emojiText}>{challengeCompleted.challengeIcon}</Text>
            </View>
            <View style={styles.contentFlex}>
              <Text style={styles.badgeLabelText}>
                {t('achievementToast.challengeCompleted')}
              </Text>
              <Text style={styles.titleText}>
                {t(challengeCompleted.challengeName)}
              </Text>
              <Text style={styles.xpText}>
                +{challengeCompleted.xpReward} XP
              </Text>
            </View>
            <Text style={styles.emojiText}>🏆</Text>
          </View>
        ) : levelUp && newLevel ? (
          // Level Up Toast
          <View style={styles.row}>
            <View style={styles.levelCircle}>
              <Text style={styles.levelText}>{newLevel}</Text>
            </View>
            <View style={styles.contentFlex}>
              <Text style={styles.titleText}>
                {t('achievementToast.levelUp')}
              </Text>
              <Text style={styles.subtitleText}>
                {t('achievementToast.nowLevel', { level: newLevel })}
              </Text>
            </View>
            <Text style={styles.emojiText}>🎉</Text>
          </View>
        ) : badge ? (
          // Badge Toast
          <View style={styles.row}>
            <View style={styles.badgeIconContainer}>
              <Text style={styles.emojiText}>{badge.icon}</Text>
            </View>
            <View style={styles.contentFlex}>
              <Text style={styles.badgeLabelText}>
                {t('achievementToast.newBadge')}
              </Text>
              <Text style={styles.titleText}>
                {getBadgeName(badge, t)}
              </Text>
              <Text style={styles.xpText}>
                +{badge.xpReward} XP
              </Text>
            </View>
          </View>
        ) : xpGained > 0 ? (
          // XP Toast
          <View style={styles.xpRow}>
            <Text style={styles.xpGainedText}>
              +{xpGained} XP
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelCircle: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  levelText: {
    color: COLORS.neutral.white,
    fontSize: 20,
    fontWeight: '700',
  },
  contentFlex: {
    flex: 1,
  },
  titleText: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  subtitleText: {
    color: COLORS.text.tertiary,
  },
  emojiText: {
    fontSize: 30,
  },
  badgeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
    backgroundColor: COLORS.neutral.white,
  },
  badgeLabelText: {
    color: COLORS.primary[500],
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  xpText: {
    color: COLORS.text.tertiary,
    fontSize: 14,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpGainedText: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
});
