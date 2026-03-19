import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { shareReferralLink, getReferralInfo } from '../services/referralService';

const DISMISS_KEY = '@referral_card_dismissed_at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface ReferralCardProps {
  userId: string;
  hasBadges: boolean;
}

export default function ReferralCard({ userId, hasBadges }: ReferralCardProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!hasBadges) return;

    (async () => {
      const dismissedAt = await AsyncStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION_MS) {
        return;
      }

      const info = await getReferralInfo(userId);
      if (info?.code) {
        setCode(info.code);
        setReferralCount(info.referralCount);
        setVisible(true);
      }
    })();
  }, [userId, hasBadges]);

  const handleDismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const handleShare = () => {
    if (code) shareReferralLink(code);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <PressableScale onPress={handleShare} style={styles.card} hapticType="light">
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="gift-outline" size={scaleSize(24)} color={COLORS.primary[500]} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{t('referral.homeTitle')}</Text>
          <Text style={styles.subtitle}>{t('referral.homeSubtitle')}</Text>
          <Text style={styles.progress}>{referralCount}/5</Text>
        </View>

        <View style={styles.rightSection}>
          <PressableScale
            onPress={handleDismiss}
            style={styles.closeButton}
            hapticType="light"
            hitSlop={12}
          >
            <Ionicons name="close" size={scaleSize(16)} color={COLORS.text.tertiary} />
          </PressableScale>
          <PressableScale onPress={handleShare} style={styles.ctaButton} hapticType="medium">
            <Text style={styles.ctaText}>{t('referral.homeCta')}</Text>
          </PressableScale>
        </View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.1),
    ...SHADOWS.sm,
  },
  leftSection: {
    marginRight: scaleSpacing(12),
  },
  iconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: RADIUS.lg,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 15),
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  progress: {
    fontSize: scaleFontSize(11),
    color: COLORS.primary[500],
    fontWeight: '600',
    marginTop: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: scaleSpacing(8),
  },
  closeButton: {
    padding: 4,
  },
  ctaButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: scaleSpacing(14),
    paddingVertical: scaleSpacing(6),
    borderRadius: RADIUS.lg,
  },
  ctaText: {
    color: COLORS.neutral.white,
    fontSize: scaleFontSize(12),
    fontWeight: '700',
  },
});
