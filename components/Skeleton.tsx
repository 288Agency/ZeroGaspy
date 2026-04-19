/**
 * Skeleton placeholders — shimmer-style pulse for loading states.
 * Uses opacity animation (no extra deps). Marked accessible={false}.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

type SkeletonBoxProps = {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function SkeletonBox({
  width = '100%',
  height,
  borderRadius = RADIUS.md,
  style,
}: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: width as ViewStyle['width'],
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Card-shaped row for food / list item placeholders */
export function SkeletonListItemCard() {
  return (
    <View style={skeletonCardStyles.card} accessible={false}>
      <View style={skeletonCardStyles.row}>
        <View style={skeletonCardStyles.textCol}>
          <SkeletonBox height={20} width="70%" borderRadius={6} />
          {/* Badge pill row */}
          <SkeletonBox height={22} width={80} borderRadius={RADIUS.full} style={{ marginTop: SPACING.sm }} />
          <SkeletonBox height={13} width="55%" borderRadius={4} style={{ marginTop: SPACING.sm }} />
          <SkeletonBox height={12} width="45%" borderRadius={4} style={{ marginTop: SPACING.xs }} />
        </View>
        <SkeletonBox height={24} width={24} borderRadius={6} />
      </View>
    </View>
  );
}

const skeletonCardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textCol: {
    flex: 1,
    marginRight: SPACING.lg,
  },
});

/** Header + 4 list rows for ExpiringSoon / ThrownFoods loading */
export function SkeletonExpiringList() {
  return (
    <View style={skeletonScreenStyles.listPad} accessible={false}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonListItemCard key={i} />
      ))}
    </View>
  );
}

const skeletonScreenStyles = StyleSheet.create({
  listPad: {
    padding: SPACING.xl,
    paddingTop: 0,
  },
});

/** Challenges screen: summary strip + 3 challenge cards */
export function SkeletonChallengesContent() {
  return (
    <View style={chSkeleton.container} accessible={false}>
      <SkeletonBox height={110} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.lg }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={chSkeleton.card}>
          <View style={chSkeleton.cardHeader}>
            <SkeletonBox height={40} width={40} borderRadius={RADIUS.lg} />
            <View style={chSkeleton.cardHeaderText}>
              <SkeletonBox height={18} width="75%" borderRadius={6} />
              <SkeletonBox height={14} width="40%" borderRadius={4} style={{ marginTop: SPACING.sm }} />
            </View>
          </View>
          {/* Description line */}
          <SkeletonBox height={13} width="85%" borderRadius={4} style={{ marginTop: SPACING.md }} />
          <SkeletonBox height={8} width="100%" borderRadius={4} style={{ marginTop: SPACING.md }} />
        </View>
      ))}
    </View>
  );
}

const chSkeleton = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['3xl'],
  },
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});

/** Home: stat row + challenge + recipe card + grid placeholders */
export function SkeletonHomeContent() {
  return (
    <View style={homeSk.container} accessible={false}>
      {/* Stats cards */}
      <View style={homeSk.statsRow}>
        <SkeletonBox height={140} borderRadius={RADIUS.xl} style={{ flex: 1, marginRight: SPACING.sm }} />
        <SkeletonBox height={140} borderRadius={RADIUS.xl} style={{ flex: 1, marginLeft: SPACING.sm }} />
      </View>
      {/* Weekly challenge card */}
      <SkeletonBox height={76} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.md }} />
      {/* Proactive recipe card */}
      <SkeletonBox height={76} borderRadius={RADIUS.xl} style={{ marginBottom: SPACING.md }} />
      {/* Spaces grid */}
      <View style={homeSk.grid}>
        <SkeletonBox height={140} borderRadius={RADIUS.xl} style={{ flex: 1, marginRight: SPACING.sm }} />
        <SkeletonBox height={140} borderRadius={RADIUS.xl} style={{ flex: 1, marginLeft: SPACING.sm }} />
      </View>
    </View>
  );
}

const homeSk = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['3xl'],
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  grid: {
    flexDirection: 'row',
  },
});

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.neutral.gray200,
  },
});
