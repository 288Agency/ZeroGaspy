import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import PressableScale from './PressableScale';

interface HeroSectionProps {
  expiringSoonCount: number;
  thrownCount: number;
  freshCount: number;
  onExpiringSoonPress: () => void;
  onThrownPress: () => void;
  onFeedbackPress: () => void;
}

export default function HeroSection({
  expiringSoonCount,
  thrownCount,
  freshCount,
  onExpiringSoonPress,
  onThrownPress,
  onFeedbackPress,
}: HeroSectionProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#1A3020', '#2E5339', '#3C6E47']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 12 }]}
    >
      {/* Top row: greeting + feedback button */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Bonjour !</Text>
          <Text style={styles.appName}>ZeroGaspy</Text>
        </View>
        <PressableScale
          onPress={onFeedbackPress}
          style={styles.feedbackButton}
          hapticType="light"
          accessibilityLabel="Envoyer un feedback"
          accessibilityRole="button"
        >
          <Ionicons
            name="chatbubble-outline"
            size={scaleSize(isSmallScreen ? 18 : 22)}
            color="rgba(255,255,255,0.8)"
          />
        </PressableScale>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={onExpiringSoonPress}
          style={styles.statPill}
          activeOpacity={0.7}
          accessibilityLabel={`${expiringSoonCount} aliments expirent bientôt`}
          accessibilityRole="button"
        >
          <Text style={[styles.statNumber, expiringSoonCount > 0 && styles.statNumberUrgent]}>
            {expiringSoonCount}
          </Text>
          <Text style={styles.statLabel}>EXPIRENT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onThrownPress}
          style={styles.statPill}
          activeOpacity={0.7}
          accessibilityLabel={`${thrownCount} aliments jetés`}
          accessibilityRole="button"
        >
          <Text style={styles.statNumber}>{thrownCount}</Text>
          <Text style={styles.statLabel}>JETÉS</Text>
        </TouchableOpacity>

        <View style={styles.statPill}>
          <Text style={styles.statNumber}>{freshCount}</Text>
          <Text style={styles.statLabel}>FRAIS</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scaleSpacing(20),
    paddingBottom: scaleSpacing(20),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  greeting: {
    fontSize: scaleFontSize(14),
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  appName: {
    fontSize: scaleFontSize(32),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  feedbackButton: {
    width: scaleSize(isSmallScreen ? 40 : 44),
    height: scaleSize(isSmallScreen ? 40 : 44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(12),
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: scaleSpacing(4),
  },
  statsRow: {
    flexDirection: 'row',
    gap: scaleSpacing(8),
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 10,
    paddingVertical: scaleSpacing(10),
    paddingHorizontal: scaleSpacing(8),
  },
  statNumber: {
    fontSize: scaleFontSize(24),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: scaleFontSize(28),
  },
  statNumberUrgent: {
    color: COLORS.status.expiringSoon,
  },
  statLabel: {
    fontSize: scaleFontSize(9),
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginTop: 2,
  },
});
