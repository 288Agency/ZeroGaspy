import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ImageBackground, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

interface StatsCardsRowProps {
  expiringSoonCount: number;
  thrownCount: number;
  onExpiringSoonPress?: () => void;
  onThrownPress?: () => void;
}

interface StatCardProps {
  count: number;
  label: string;
  illustration?: React.ReactNode;
  gradientColors: string[];
  accentColor: string;
  onPress?: () => void;
  backgroundImage?: any;
  mascotImage?: any;
}

function StatCard({ count, label, illustration, gradientColors, accentColor, onPress, backgroundImage, mascotImage }: StatCardProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasBgOrMascot = backgroundImage || mascotImage;

  const cardContent = (
    <>
      {/* Background decoration - only if no background image */}
      {!hasBgOrMascot && (
        <View style={styles.decorationContainer}>
          <Svg width={120} height={120} viewBox="0 0 120 120" style={styles.decoration}>
            <Circle cx="100" cy="20" r="60" fill={hexToRgba(COLORS.neutral.white, 0.1)} />
            <Circle cx="-10" cy="100" r="40" fill={hexToRgba(COLORS.neutral.white, 0.08)} />
          </Svg>
        </View>
      )}

      {/* Mascot overlay */}
      {mascotImage && (
        <View style={styles.mascotContainer}>
          <Image
            source={mascotImage}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={[styles.cardContent, hasBgOrMascot && styles.cardContentWithBg]}>
        {/* Top: Illustration - only if no background image */}
        {illustration && !hasBgOrMascot && (
          <View style={styles.illustrationContainer}>
            {illustration}
          </View>
        )}

        {/* Bottom: Stats */}
        <View style={[styles.statsContainer, hasBgOrMascot && styles.statsContainerWithBg]}>
          <Text style={styles.countText}>{count}</Text>
          <Text style={styles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>

      {/* Arrow indicator */}
      <View style={styles.arrowContainer}>
        <View style={[styles.arrowCircle, hasBgOrMascot && styles.arrowCircleWithBg]}>
          <Ionicons name="chevron-forward" size={scaleSize(isSmallScreen ? 12 : 16)} color={hasBgOrMascot ? COLORS.neutral.white : accentColor} />
        </View>
      </View>
    </>
  );

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <PressableScale
        onPress={onPress}
        activeScale={0.96}
        hapticType="light"
        style={[
          styles.card,
          {
            backgroundColor: backgroundImage ? 'transparent' : gradientColors[0],
            ...SHADOWS.colored(accentColor, 0.35),
          },
        ]}
      >
        {backgroundImage ? (
          <ImageBackground
            source={backgroundImage}
            style={styles.backgroundImage}
            imageStyle={styles.backgroundImageStyle}
            resizeMode="cover"
          >
            {cardContent}
          </ImageBackground>
        ) : (
          cardContent
        )}
      </PressableScale>
    </Animated.View>
  );
}

export default function StatsCardsRow({
  expiringSoonCount,
  thrownCount,
  onExpiringSoonPress,
  onThrownPress,
}: StatsCardsRowProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <StatCard
        count={expiringSoonCount}
        label={t('home.expiringSoonTitle')}
        backgroundImage={require('../assets/Fond vert card.png')}
        mascotImage={require('../assets/perime.png')}
        gradientColors={[COLORS.primary[500], COLORS.primary[600]]}
        accentColor={COLORS.primary[500]}
        onPress={onExpiringSoonPress}
      />
      <StatCard
        count={thrownCount}
        label={t('stats.thrown')}
        backgroundImage={require('../assets/FOND ROUGE CARD.png')}
        mascotImage={require('../assets/Ben.png')}
        gradientColors={[COLORS.accent.carrot, COLORS.semantic.warningDark]}
        accentColor={COLORS.accent.carrot}
        onPress={onThrownPress}
      />
    </View>
  );
}

const arrowSize = scaleSize(isSmallScreen ? 22 : 28);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: scaleSpacing(isSmallScreen ? 14 : 20),
    marginBottom: scaleSpacing(isSmallScreen ? 16 : 24),
    gap: scaleSpacing(isSmallScreen ? 10 : 16),
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    borderRadius: scaleSize(isSmallScreen ? 18 : 24),
    overflow: 'hidden',
    minHeight: scaleSize(isSmallScreen ? 145 : 180),
    position: 'relative',
  },
  decorationContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  decoration: {
    position: 'absolute',
    top: scaleSize(-15),
    right: scaleSize(-25),
  },
  cardContent: {
    flex: 1,
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    justifyContent: 'space-between',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: scaleSpacing(isSmallScreen ? 4 : 8),
  },
  statsContainer: {
    paddingTop: scaleSpacing(isSmallScreen ? 4 : 8),
  },
  countText: {
    fontSize: scaleFontSize(isSmallScreen ? 32 : 42),
    fontWeight: '800',
    color: COLORS.neutral.white,
    letterSpacing: -2,
  },
  labelText: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 14),
    lineHeight: scaleFontSize(isSmallScreen ? 16 : 20),
    fontWeight: '600',
    color: hexToRgba(COLORS.neutral.white, 0.9),
    marginTop: scaleSpacing(2),
  },
  arrowContainer: {
    position: 'absolute',
    bottom: scaleSpacing(isSmallScreen ? 10 : 16),
    right: scaleSpacing(isSmallScreen ? 10 : 16),
  },
  arrowCircle: {
    width: arrowSize,
    height: arrowSize,
    borderRadius: arrowSize / 2,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowCircleWithBg: {
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.3),
  },
  backgroundImage: {
    flex: 1,
    minHeight: scaleSize(isSmallScreen ? 145 : 180),
  },
  backgroundImageStyle: {
    borderRadius: scaleSize(isSmallScreen ? 18 : 24),
  },
  cardContentWithBg: {
    justifyContent: 'flex-end',
  },
  statsContainerWithBg: {
    paddingTop: 0,
  },
  mascotContainer: {
    position: 'absolute',
    top: scaleSize(isSmallScreen ? -5 : -5),
    right: scaleSize(isSmallScreen ? -5 : 0),
    zIndex: 1,
  },
  mascotImage: {
    width: scaleSize(isSmallScreen ? 115 : 135),
    height: scaleSize(isSmallScreen ? 115 : 135),
  },
});
