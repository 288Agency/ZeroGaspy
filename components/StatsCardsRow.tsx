import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, Ellipse } from 'react-native-svg';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

interface StatsCardsRowProps {
  expiringSoonCount: number;
  thrownCount: number;
  onExpiringSoonPress?: () => void;
  onThrownPress?: () => void;
}

// Responsive illustration size
const illustrationSize = scaleSize(isSmallScreen ? 55 : 70);

// Animated Vegetable Illustration for "Expiring Soon" card
function VegetableIllustration() {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Svg width={illustrationSize} height={illustrationSize} viewBox="0 0 70 70">
        <Defs>
          <LinearGradient id="leafGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#3C6E47" />
            <Stop offset="100%" stopColor="#6BBF59" />
          </LinearGradient>
          <LinearGradient id="carrotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF9F43" />
            <Stop offset="100%" stopColor="#EE5A24" />
          </LinearGradient>
        </Defs>
        {/* Carrot */}
        <Path
          d="M35 20 C42 20 48 28 48 38 C48 52 40 62 35 65 C30 62 22 52 22 38 C22 28 28 20 35 20"
          fill="url(#carrotGrad)"
        />
        <Path d="M27 32 Q35 35 43 32" stroke="#EE5A24" strokeWidth="1.5" fill="none" opacity="0.5" />
        <Path d="M25 42 Q35 45 45 42" stroke="#EE5A24" strokeWidth="1.5" fill="none" opacity="0.5" />
        {/* Leaves */}
        <Path d="M35 20 C32 14 26 8 28 5 C32 2 38 10 35 20" fill="url(#leafGrad)" />
        <Path d="M35 20 C30 16 22 14 22 8 C22 4 32 12 35 20" fill="url(#leafGrad)" />
        <Path d="M35 20 C40 16 48 14 48 8 C48 4 38 12 35 20" fill="url(#leafGrad)" />
        {/* Clock indicator */}
        <Circle cx="52" cy="52" r="12" fill={COLORS.neutral.white} />
        <Circle cx="52" cy="52" r="10" fill={COLORS.semantic.warning} />
        <Path d="M52 47 L52 52 L56 54" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

// Animated Trash/Waste Illustration
function WasteIllustration() {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = shakeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-3deg', '3deg', '-3deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Svg width={illustrationSize} height={illustrationSize} viewBox="0 0 70 70">
        <Defs>
          <LinearGradient id="binGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#B8B8B8" />
            <Stop offset="100%" stopColor="#8E8E8E" />
          </LinearGradient>
          <LinearGradient id="appleGrad" x1="30%" y1="0%" x2="70%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B6B" />
            <Stop offset="100%" stopColor="#C0392B" />
          </LinearGradient>
        </Defs>
        {/* Trash bin */}
        <Path
          d="M20 25 L18 60 C18 63 21 65 25 65 L45 65 C49 65 52 63 52 60 L50 25 Z"
          fill="url(#binGrad)"
        />
        {/* Bin lid */}
        <Path
          d="M15 22 L55 22 L55 26 L15 26 Z"
          fill="#9E9E9E"
          rx="2"
        />
        <Path d="M30 18 L30 22 L40 22 L40 18 Z" fill="#9E9E9E" />
        {/* Bin lines */}
        <Path d="M28 32 L27 58" stroke="#757575" strokeWidth="2" fill="none" />
        <Path d="M35 32 L35 58" stroke="#757575" strokeWidth="2" fill="none" />
        <Path d="M42 32 L43 58" stroke="#757575" strokeWidth="2" fill="none" />
        {/* Sad apple being thrown */}
        <G transform="translate(42, 5) rotate(15)">
          <Ellipse cx="12" cy="15" rx="10" ry="12" fill="url(#appleGrad)" />
          <Path d="M12 5 L12 8" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" />
          <Path d="M13 7 Q18 3 20 6" fill="#6BBF59" />
          {/* Sad face */}
          <Circle cx="8" cy="14" r="1.5" fill="white" />
          <Circle cx="16" cy="14" r="1.5" fill="white" />
          <Path d="M8 20 Q12 18 16 20" stroke="white" strokeWidth="1.5" fill="none" />
        </G>
      </Svg>
    </Animated.View>
  );
}

interface StatCardProps {
  count: number;
  label: string;
  illustration: React.ReactNode;
  gradientColors: string[];
  accentColor: string;
  onPress?: () => void;
}

function StatCard({ count, label, illustration, gradientColors, accentColor, onPress }: StatCardProps) {
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
            backgroundColor: gradientColors[0],
            ...SHADOWS.colored(accentColor, 0.35),
          },
        ]}
      >
        {/* Background decoration */}
        <View style={styles.decorationContainer}>
          <Svg width={120} height={120} viewBox="0 0 120 120" style={styles.decoration}>
            <Circle cx="100" cy="20" r="60" fill={hexToRgba('#FFFFFF', 0.1)} />
            <Circle cx="-10" cy="100" r="40" fill={hexToRgba('#FFFFFF', 0.08)} />
          </Svg>
        </View>

        <View style={styles.cardContent}>
          {/* Top: Illustration */}
          <View style={styles.illustrationContainer}>
            {illustration}
          </View>

          {/* Bottom: Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.countText}>{count}</Text>
            <Text style={styles.labelText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>

        {/* Arrow indicator */}
        <View style={styles.arrowContainer}>
          <View style={styles.arrowCircle}>
            <Ionicons name="chevron-forward" size={scaleSize(isSmallScreen ? 12 : 16)} color={accentColor} />
          </View>
        </View>
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
  return (
    <View style={styles.container}>
      <StatCard
        count={expiringSoonCount}
        label="Bientôt périmés"
        illustration={<VegetableIllustration />}
        gradientColors={[COLORS.primary[500], COLORS.primary[600]]}
        accentColor={COLORS.primary[500]}
        onPress={onExpiringSoonPress}
      />
      <StatCard
        count={thrownCount}
        label="Aliments jetés"
        illustration={<WasteIllustration />}
        gradientColors={[COLORS.accent.carrot, '#D35400']}
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
});
