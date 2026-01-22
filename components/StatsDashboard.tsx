import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, G } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { UserStats } from '../types';
import { calculateUserStats } from '../services/statsService';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba, SPACING } from '../utils/designSystem';
import PressableScale from './PressableScale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;

// Animated Circle Component for Progress Ring
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
}

function ProgressRing({ progress, size, strokeWidth, color, backgroundColor = hexToRgba(COLORS.neutral.gray300, 0.3) }: ProgressRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={hexToRgba(color, 0.7)} />
        </LinearGradient>
      </Defs>
      {/* Background circle */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#ringGradient)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

// Animated Counter Component
function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1500 }: { value: number; suffix?: string; prefix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(Math.floor(v * 100) / 100);
    });

    return () => animatedValue.removeListener(listener);
  }, [value]);

  const formattedValue = displayValue.toFixed(2).replace('.', ',');

  return (
    <Text style={styles.heroValue}>
      {prefix}{formattedValue}{suffix}
    </Text>
  );
}

// Flame Icon SVG
function FlameIcon({ size = 24, color = COLORS.accent.carrot }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 23c-3.866 0-7-3.134-7-7 0-2.5 1.5-4.5 3-6 .5-.5 1-1 1.5-2 1.5 1.5 2 3.5 2 5.5 0 .5.5 1 1 1s1-.5 1-1c0-2.5.5-4 2-6 2 2 3.5 4.5 3.5 7.5 0 3.866-3.134 7-7 7z" />
    </Svg>
  );
}

// Leaf Icon SVG for Environmental Impact
function LeafIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.accent.avocado} />
          <Stop offset="100%" stopColor={COLORS.primary[500]} />
        </LinearGradient>
      </Defs>
      <Path
        d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c4 0 8.5-4.5 9-8.5-.17 1.67-1 4-3 5.5 0-2.5-1-4-3-5.5.67 1.17 1 2.5 1 4-2-1.5-3.5-4-4-6.5 4-.5 9 1 12 4.5V8h-3z"
        fill="url(#leafGrad)"
      />
    </Svg>
  );
}

// Earth Icon SVG
function EarthIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="earthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#60A5FA" />
          <Stop offset="100%" stopColor="#3B82F6" />
        </LinearGradient>
      </Defs>
      <Circle cx="12" cy="12" r="10" fill="url(#earthGrad)" />
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
        fill={hexToRgba(COLORS.neutral.white, 0.4)}
      />
    </Svg>
  );
}

// Badge Component for Achievements
function AchievementBadge({ icon, label, unlocked, color }: { icon: string; label: string; unlocked: boolean; color: string }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.badge, { opacity, transform: [{ scale }] }]}>
      <View style={[
        styles.badgeIcon,
        {
          backgroundColor: unlocked ? hexToRgba(color, 0.15) : hexToRgba(COLORS.neutral.gray400, 0.1),
          borderColor: unlocked ? color : COLORS.neutral.gray300,
        }
      ]}>
        <Text style={[styles.badgeEmoji, !unlocked && styles.badgeEmojiLocked]}>{icon}</Text>
      </View>
      <Text style={[styles.badgeLabel, !unlocked && styles.badgeLabelLocked]}>{label}</Text>
    </Animated.View>
  );
}

// Impact Card Component
function ImpactCard({ icon, value, label, subtitle, color, delay = 0 }: {
  icon: React.ReactNode;
  value: string;
  label: string;
  subtitle?: string;
  color: string;
  delay?: number;
}) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        delay,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.impactCard, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.impactIconContainer, { backgroundColor: hexToRgba(color, 0.12) }]}>
        {icon}
      </View>
      <Text style={[styles.impactValue, { color }]}>{value}</Text>
      <Text style={styles.impactLabel}>{label}</Text>
      {subtitle && <Text style={styles.impactSubtitle}>{subtitle}</Text>}
    </Animated.View>
  );
}

// Monthly Goal Progress Bar
function GoalProgressBar({ current, goal, label }: { current: number; goal: number; label: string }) {
  const progress = Math.min((current / goal) * 100, 100);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 1200,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.goalContainer}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalLabel}>{label}</Text>
        <Text style={styles.goalProgress}>{current.toFixed(0)}€ / {goal}€</Text>
      </View>
      <View style={styles.goalBarBg}>
        <Animated.View style={[styles.goalBarFill, { width: animatedWidth }]}>
          <View style={styles.goalBarShine} />
        </Animated.View>
      </View>
      {progress >= 100 && (
        <View style={styles.goalAchieved}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.semantic.success} />
          <Text style={styles.goalAchievedText}>Objectif atteint !</Text>
        </View>
      )}
    </View>
  );
}

// Stat Mini Card
function StatMiniCard({ icon, value, label, color, delay = 0 }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  delay?: number;
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.miniCard, { opacity, transform: [{ scale }] }]}>
      <View style={[styles.miniCardIcon, { backgroundColor: hexToRgba(color, 0.12) }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.miniCardValue, { color }]}>{value}</Text>
      <Text style={styles.miniCardLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function StatsDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const heroScale = useRef(new Animated.Value(0.95)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (stats) {
      // Entrance animations
      Animated.parallel([
        Animated.spring(heroScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [stats]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userStats = await calculateUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Calcul de vos statistiques...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  // Calculate values
  const successRate = stats.itemsConsumed + stats.itemsThrown > 0
    ? Math.round((stats.itemsConsumed / (stats.itemsConsumed + stats.itemsThrown)) * 100)
    : 100;
  const monthlyGoal = 50; // Goal: 50€ savings per month

  // Determine streak badges
  const streakBadges = [
    { icon: '🌱', label: '3 jours', threshold: 3, color: COLORS.accent.avocado },
    { icon: '🔥', label: '7 jours', threshold: 7, color: COLORS.accent.carrot },
    { icon: '⭐', label: '14 jours', threshold: 14, color: COLORS.accent.lemon },
    { icon: '🏆', label: '30 jours', threshold: 30, color: COLORS.primary[500] },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section - Main Savings Card */}
      <Animated.View style={[
        styles.heroContainer,
        {
          opacity: heroOpacity,
          transform: [{ scale: heroScale }],
        }
      ]}>
        <View style={styles.heroCard}>
          {/* Glassmorphism background elements */}
          <View style={styles.heroGlassCircle1} />
          <View style={styles.heroGlassCircle2} />

          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="wallet" size={24} color={COLORS.neutral.white} />
              </View>
              <Text style={styles.heroLabel}>Economies totales</Text>
            </View>

            <AnimatedCounter value={stats.netSavings} suffix="€" duration={2000} />

            <View style={styles.heroSubStats}>
              <View style={styles.heroSubStat}>
                <Ionicons name="trending-up" size={16} color={COLORS.semantic.success} />
                <Text style={styles.heroSubStatText}>+{stats.totalSaved.toFixed(2)}€ sauvés</Text>
              </View>
              <View style={styles.heroSubStatDivider} />
              <View style={styles.heroSubStat}>
                <Ionicons name="trending-down" size={16} color={COLORS.accent.tomato} />
                <Text style={styles.heroSubStatText}>-{stats.totalWasted.toFixed(2)}€ perdus</Text>
              </View>
            </View>
          </View>

          {/* Decorative elements */}
          <View style={styles.heroDecoLeaf1}>
            <LeafIcon size={40} />
          </View>
        </View>
      </Animated.View>

      {/* Monthly Goal Progress */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <GoalProgressBar current={stats.netSavings} goal={monthlyGoal} label="Objectif mensuel" />
      </Animated.View>

      {/* Success Rate & Streak Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Performance</Text>

        <View style={styles.performanceRow}>
          {/* Success Rate Ring */}
          <View style={styles.successRateCard}>
            <View style={styles.ringContainer}>
              <ProgressRing
                progress={successRate}
                size={120}
                strokeWidth={12}
                color={successRate >= 80 ? COLORS.semantic.success : successRate >= 50 ? COLORS.accent.carrot : COLORS.accent.tomato}
              />
              <View style={styles.ringCenter}>
                <Text style={styles.ringValue}>{successRate}%</Text>
                <Text style={styles.ringLabel}>réussite</Text>
              </View>
            </View>
            <Text style={styles.successRateSubtext}>
              {stats.itemsConsumed} consommés sur {stats.itemsConsumed + stats.itemsThrown}
            </Text>
          </View>

          {/* Streak Card */}
          <View style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <FlameIcon size={28} color={stats.currentStreak >= 7 ? COLORS.accent.carrot : COLORS.neutral.gray400} />
              <Text style={styles.streakValue}>{stats.currentStreak}</Text>
            </View>
            <Text style={styles.streakLabel}>jours sans gaspillage</Text>
            <View style={styles.streakRecord}>
              <Ionicons name="trophy" size={14} color={COLORS.accent.lemon} />
              <Text style={styles.streakRecordText}>Record: {stats.longestStreak} jours</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Achievement Badges */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Badges de série</Text>
        <View style={styles.badgesRow}>
          {streakBadges.map((badge, index) => (
            <AchievementBadge
              key={badge.threshold}
              icon={badge.icon}
              label={badge.label}
              unlocked={stats.longestStreak >= badge.threshold}
              color={badge.color}
            />
          ))}
        </View>
      </Animated.View>

      {/* Environmental Impact */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Impact environnemental</Text>
        <View style={styles.impactRow}>
          <ImpactCard
            icon={<LeafIcon size={28} />}
            value={`${stats.foodSavedKg.toFixed(1)} kg`}
            label="Nourriture sauvée"
            color={COLORS.accent.avocado}
            delay={0}
          />
          <ImpactCard
            icon={<EarthIcon size={28} />}
            value={`${stats.co2AvoidedKg.toFixed(1)} kg`}
            label="CO2 évité"
            subtitle={`≈ ${Math.round(stats.co2AvoidedKg / 0.12)} km en voiture`}
            color="#3B82F6"
            delay={100}
          />
        </View>
      </Animated.View>

      {/* Activity Stats */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Activité</Text>
        <View style={styles.miniCardsRow}>
          <StatMiniCard
            icon="cube-outline"
            value={stats.itemsActive}
            label="En cours"
            color={COLORS.accent.blueberry}
            delay={0}
          />
          <StatMiniCard
            icon="checkmark-circle-outline"
            value={stats.itemsConsumed}
            label="Consommés"
            color={COLORS.semantic.success}
            delay={100}
          />
          <StatMiniCard
            icon="trash-outline"
            value={stats.itemsThrown}
            label="Jetés"
            color={COLORS.accent.tomato}
            delay={200}
          />
        </View>
      </Animated.View>

      {/* Motivation Card */}
      {(stats.currentStreak >= 7 || stats.netSavings >= 20) && (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <PressableScale style={styles.motivationCard} activeScale={0.98}>
            <View style={styles.motivationGlow} />
            <Text style={styles.motivationEmoji}>
              {stats.currentStreak >= 14 ? '🏆' : stats.netSavings >= 50 ? '💪' : '🎉'}
            </Text>
            <View style={styles.motivationContent}>
              <Text style={styles.motivationTitle}>
                {stats.currentStreak >= 14 ? 'Incroyable !' : stats.netSavings >= 50 ? 'Excellent !' : 'Bravo !'}
              </Text>
              <Text style={styles.motivationText}>
                {stats.currentStreak >= 14
                  ? `${stats.currentStreak} jours de suite sans gaspillage, tu es un champion !`
                  : stats.netSavings >= 50
                  ? `Tu as économisé ${stats.netSavings.toFixed(0)}€ en évitant le gaspillage !`
                  : `Continue comme ça, chaque geste compte pour la planète !`}
              </Text>
            </View>
          </PressableScale>
        </Animated.View>
      )}

      {/* Bottom spacing for tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  scrollContent: {
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondary.cream,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },

  // Hero Section
  heroContainer: {
    paddingHorizontal: CARD_PADDING,
    marginBottom: 8,
  },
  heroCard: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS['2xl'],
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.colored(COLORS.primary[500], 0.4),
  },
  heroGlassCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.1),
  },
  heroGlassCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.08),
  },
  heroContent: {
    zIndex: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroLabel: {
    ...TYPOGRAPHY.label,
    color: hexToRgba(COLORS.neutral.white, 0.9),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 52,
    fontWeight: '800',
    color: COLORS.neutral.white,
    letterSpacing: -2,
    marginBottom: 16,
  },
  heroSubStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.15),
    borderRadius: RADIUS.lg,
    padding: 12,
  },
  heroSubStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroSubStatText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.neutral.white,
    fontWeight: '600',
  },
  heroSubStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.3),
  },
  heroDecoLeaf1: {
    position: 'absolute',
    top: 20,
    right: 20,
    opacity: 0.3,
  },

  // Section
  section: {
    paddingHorizontal: CARD_PADDING,
    marginTop: 24,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    marginBottom: 16,
  },

  // Goal Progress
  goalContainer: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
  },
  goalProgress: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary[500],
    fontWeight: '700',
  },
  goalBarBg: {
    height: 12,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    borderRadius: 6,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  goalBarShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.3),
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  goalAchieved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  goalAchievedText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.semantic.success,
    fontWeight: '600',
  },

  // Performance Row
  performanceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  successRateCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  ringLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
  },
  successRateSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  streakCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakValue: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.text.primary,
  },
  streakLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  streakRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    backgroundColor: hexToRgba(COLORS.accent.lemon, 0.15),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  streakRecordText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    alignItems: 'center',
    flex: 1,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 8,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeEmojiLocked: {
    opacity: 0.3,
  },
  badgeLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  badgeLabelLocked: {
    color: COLORS.text.muted,
  },

  // Impact Cards
  impactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  impactCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  impactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  impactValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  impactLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  impactSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    marginTop: 4,
    textAlign: 'center',
    fontSize: 10,
  },

  // Mini Cards
  miniCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniCard: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  miniCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniCardValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  miniCardLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    marginTop: 2,
  },

  // Motivation Card
  motivationCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    ...SHADOWS.sm,
  },
  motivationGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
  },
  motivationEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  motivationContent: {
    flex: 1,
  },
  motivationTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary[500],
    marginBottom: 4,
  },
  motivationText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});
