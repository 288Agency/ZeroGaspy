import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

interface DateScannerButtonProps {
  onPress: () => void;
}

export default function DateScannerButton({ onPress }: DateScannerButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      style={styles.container}
      hapticType="medium"
      activeScale={0.97}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="camera-outline" size={24} color={COLORS.primary[500]} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Scanner la date</Text>
        <Text style={styles.subtitle}>
          Prendre une photo de la date de péremption
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
});
