import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

interface IndicatorBadgeProps {
  count: number;
  variant?: 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export default function IndicatorBadge({
  count,
  variant = 'warning',
  size = 'md',
  style,
}: IndicatorBadgeProps) {
  if (count === 0) return null;

  const variantStyles: Record<string, ViewStyle> = {
    warning: { backgroundColor: COLORS.semantic.warning },
    danger: { backgroundColor: COLORS.semantic.danger },
    info: { backgroundColor: COLORS.primary[500] },
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { minWidth: 18, height: 18, paddingHorizontal: 6 },
    md: { minWidth: 22, height: 22, paddingHorizontal: 8 },
    lg: { minWidth: 28, height: 28, paddingHorizontal: 10 },
  };

  const textSizeStyles: Record<string, TextStyle> = {
    sm: { fontSize: 10 },
    md: { fontSize: 12 },
    lg: { fontSize: 14 },
  };

  return (
    <View
      style={[
        styles.badge,
        variantStyles[variant],
        sizeStyles[size],
        style,
      ]}
      accessible={true}
      accessibilityLabel={`${count} élément${count > 1 ? 's' : ''} nécessitant attention`}
      accessibilityRole="text"
    >
      <Text
        style={[styles.text, textSizeStyles[size]]}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.neutral.white,
    fontWeight: '700',
  },
});
