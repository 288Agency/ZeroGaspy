import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import { COLORS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';

interface ShareRecapCardProps {
  itemsConsumed: number;
  itemsThrown: number;
  netSavings: number;
  co2AvoidedKg: number;
  currentStreak: number;
  isPremium: boolean;
}

const CARD_WIDTH = 390;
const CARD_HEIGHT = 520;

const ShareRecapCard = forwardRef<ViewShot, ShareRecapCardProps>(
  ({ itemsConsumed, itemsThrown, netSavings, co2AvoidedKg, currentStreak, isPremium }, ref) => {
    const { t } = useTranslation();

    const total = itemsConsumed + itemsThrown;
    const successRate = total > 0 ? Math.round((itemsConsumed / total) * 100) : 100;

    return (
      <View style={styles.offScreen} pointerEvents="none">
        <ViewShot
          ref={ref}
          options={{ format: 'png', quality: 1, width: CARD_WIDTH, height: CARD_HEIGHT }}
          style={styles.card}
        >
          {/* Gradient background */}
          <View style={StyleSheet.absoluteFill}>
            <Svg width={CARD_WIDTH} height={CARD_HEIGHT}>
              <Defs>
                <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={COLORS.primary[500]} />
                  <Stop offset="50%" stopColor={COLORS.primary[600]} />
                  <Stop offset="100%" stopColor={COLORS.primary[700]} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#bgGrad)" />
            </Svg>
          </View>

          {/* Decorative circles */}
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />

          {/* Content */}
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>🌿 ZeroGaspy</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('stats.shareCardTitle')}</Text>

            {/* Stats grid 2x2 */}
            <View style={styles.grid}>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🍎</Text>
                <Text style={styles.statValue}>{itemsConsumed}</Text>
                <Text style={styles.statLabel}>{t('stats.shareCardSaved')}</Text>
              </View>

              {isPremium ? (
                <View style={styles.statBox}>
                  <Text style={styles.statEmoji}>💰</Text>
                  <Text style={styles.statValue}>{netSavings.toFixed(0)}€</Text>
                  <Text style={styles.statLabel}>{t('stats.shareCardSavings')}</Text>
                </View>
              ) : (
                <View style={styles.statBox}>
                  <Text style={styles.statEmoji}>🗑️</Text>
                  <Text style={styles.statValue}>{itemsThrown}</Text>
                  <Text style={styles.statLabel}>{t('stats.thrown')}</Text>
                </View>
              )}

              {isPremium ? (
                <View style={styles.statBox}>
                  <Text style={styles.statEmoji}>🌍</Text>
                  <Text style={styles.statValue}>{co2AvoidedKg.toFixed(1)}kg</Text>
                  <Text style={styles.statLabel}>{t('stats.shareCardCo2')}</Text>
                </View>
              ) : (
                <View style={styles.statBox}>
                  <Text style={styles.statEmoji}>✅</Text>
                  <Text style={styles.statValue}>{successRate}%</Text>
                  <Text style={styles.statLabel}>{t('stats.shareCardSuccessRate')}</Text>
                </View>
              )}

              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statValue}>{currentStreak}</Text>
                <Text style={styles.statLabel}>{t('stats.shareCardStreak')}</Text>
              </View>
            </View>

            {/* Success rate progress bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${successRate}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {successRate}% {t('stats.shareCardSuccessRate')}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('stats.shareCardFooter')}</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }
);

ShareRecapCard.displayName = 'ShareRecapCard';

export default ShareRecapCard;

const styles = StyleSheet.create({
  offScreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.08),
  },
  decoCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.06),
  },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.neutral.white,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.neutral.white,
    textAlign: 'center',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  statBox: {
    width: (CARD_WIDTH - 56 - 12) / 2,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.15),
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.neutral.white, 0.1),
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.neutral.white,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: hexToRgba(COLORS.neutral.white, 0.8),
    marginTop: 2,
    textAlign: 'center',
  },
  progressSection: {
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.2),
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.neutral.white,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: hexToRgba(COLORS.neutral.white, 0.9),
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neutral.white,
    letterSpacing: 0.3,
  },
});
