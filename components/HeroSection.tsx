import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/designSystem';
import { scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

// One-off gradient values intentionally not in design system
const WARNING_GRADIENT = ['#C2410C', '#F97316'] as const;
const URGENT_GRADIENT = ['#7F1D1D', '#DC2626'] as const;
const CALM_GRADIENT = [COLORS.primary[700], '#2D5A38', COLORS.primary[500]] as const;

type HeroState = 'calm' | 'warning' | 'urgent';

interface HeroSectionProps {
  urgentCount: number;
  expiringSoonCount: number;
  thrownCount: number;
  freshCount: number;
  onExpiringSoonPress?: () => void;
  onThrownPress?: () => void;
}

export default function HeroSection({
  urgentCount,
  expiringSoonCount,
  thrownCount,
  freshCount,
  onExpiringSoonPress,
  onThrownPress,
}: HeroSectionProps) {
  const insets = useSafeAreaInsets();

  const state: HeroState =
    urgentCount >= 1 ? 'urgent' :
    expiringSoonCount >= 1 ? 'warning' :
    'calm';

  const gradient =
    state === 'urgent' ? URGENT_GRADIENT :
    state === 'warning' ? WARNING_GRADIENT :
    CALM_GRADIENT;

  const badge = {
    urgent: { label: 'URGENCE', dot: '#FCA5A5' },
    warning: { label: 'ATTENTION REQUISE', dot: '#FCD34D' },
    calm: { label: 'TOUT VA BIEN', dot: '#4ADE80' },
  }[state];

  const headline =
    state === 'urgent'
      ? `${urgentCount} aliment${urgentCount > 1 ? 's' : ''} périment aujourd'hui`
      : state === 'warning'
      ? `${expiringSoonCount} aliment${expiringSoonCount > 1 ? 's' : ''} expirent bientôt`
      : 'Frigo bien géré 🎉';

  return (
    <LinearGradient
      colors={gradient as readonly [string, string, ...string[]]}
      locations={state === 'calm' ? [0, 0.55, 1] : [0, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 12 }]}
    >
      {/* Decorative circle */}
      <View style={styles.decorCircle} pointerEvents="none" />

      {/* Status badge */}
      <View style={styles.badge}>
        <View style={[styles.badgeDot, { backgroundColor: badge.dot }]} />
        <Text style={styles.badgeLabel}>{badge.label}</Text>
      </View>

      {/* Headline */}
      <Text style={styles.headline}>{headline}</Text>

      {/* Stats inline */}
      <TouchableOpacity
        onPress={state !== 'calm' ? onExpiringSoonPress : undefined}
        activeOpacity={state !== 'calm' ? 0.7 : 1}
        style={styles.statsRow}
        accessibilityRole={state !== 'calm' ? 'button' : 'text'}
      >
        {state === 'calm' && (
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{freshCount}</Text>
            <Text style={styles.statUnit}> frais</Text>
          </Text>
        )}
        {state === 'warning' && (
          <>
            <StatItem value={expiringSoonCount} label="expirent" />
            <View style={styles.statDivider} />
            <StatItem value={thrownCount} label="jeté(s)" />
            <View style={styles.statDivider} />
            <StatItem value={freshCount} label="frais" />
          </>
        )}
        {state === 'urgent' && (
          <>
            <StatItem value={urgentCount} label="aujourd'hui" />
            <View style={styles.statDivider} />
            <StatItem value={expiringSoonCount} label="cette sem." />
          </>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statUnit}> {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scaleSpacing(20),
    paddingBottom: scaleSpacing(20),
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: scaleSpacing(10),
    paddingVertical: scaleSpacing(4),
    marginBottom: scaleSpacing(10),
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: scaleSpacing(5),
  },
  badgeLabel: {
    fontSize: scaleFontSize(9),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: scaleFontSize(isSmallScreen ? 20 : 24),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: scaleFontSize(isSmallScreen ? 26 : 30),
    marginBottom: scaleSpacing(12),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scaleSpacing(8),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statText: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statNumber: {
    fontSize: scaleFontSize(isSmallScreen ? 18 : 20),
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statUnit: {
    fontSize: scaleFontSize(9),
    color: 'rgba(255,255,255,0.65)',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
});
