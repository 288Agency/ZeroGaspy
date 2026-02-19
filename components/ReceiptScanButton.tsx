import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';

interface ReceiptScanButtonProps {
  onPress: () => void;
}

export default function ReceiptScanButton({ onPress }: ReceiptScanButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      activeScale={0.98}
      hapticType="light"
      style={styles.button}
      accessible={true}
      accessibilityLabel="Scanner un ticket de caisse"
      accessibilityRole="button"
    >
      {/* Icone de scan */}
      <View style={styles.iconContainer}>
        <Ionicons name="receipt-outline" size={24} color={COLORS.neutral.white} />
      </View>

      {/* Texte */}
      <View style={styles.textContainer}>
        <Text style={styles.buttonText}>
          Scanner un ticket de caisse
        </Text>
        <Text style={styles.subtitleText}>
          Ajout auto de plusieurs produits
        </Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={hexToRgba(COLORS.neutral.white, 0.7)} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.status.indigo,
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING['2xl'],
    paddingVertical: SPACING.lg,
    ...SHADOWS.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xl,
    backgroundColor: hexToRgba(COLORS.neutral.white, 0.2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  buttonText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
    fontSize: 16,
  },
  subtitleText: {
    color: hexToRgba(COLORS.neutral.white, 0.7),
    fontSize: 14,
  },
});
