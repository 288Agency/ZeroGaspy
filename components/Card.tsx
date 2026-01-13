import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, RADIUS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, isSmallScreen } from '../utils/responsive';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  color?: string;
  style?: any;
}

export default function Card({
  children,
  onPress,
  onLongPress,
  variant = 'default',
  padding = 'md',
  color,
  style,
  ...props
}: CardProps) {
  const paddingConfig = {
    none: 0,
    sm: scaleSpacing(isSmallScreen ? 10 : 12),
    md: scaleSpacing(isSmallScreen ? 12 : 16),
    lg: scaleSpacing(isSmallScreen ? 18 : 24),
  };

  const variantStyles = {
    default: {
      backgroundColor: COLORS.neutral.white,
      borderWidth: 1,
      borderColor: hexToRgba(COLORS.primary[500], 0.1),
      ...SHADOWS.sm,
    },
    elevated: {
      backgroundColor: COLORS.neutral.white,
      borderWidth: 0,
      borderColor: 'transparent',
      ...SHADOWS.lg,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: hexToRgba(COLORS.primary[500], 0.2),
    },
    filled: {
      backgroundColor: color ? hexToRgba(color, 0.15) : hexToRgba(COLORS.secondary.sage, 0.5),
      borderWidth: 1,
      borderColor: color ? hexToRgba(color, 0.25) : hexToRgba(COLORS.primary[500], 0.15),
      ...SHADOWS.sm,
    },
    glass: {
      backgroundColor: hexToRgba(COLORS.neutral.white, 0.85),
      borderWidth: 1,
      borderColor: hexToRgba(COLORS.neutral.white, 0.5),
      ...SHADOWS.md,
    },
    gradient: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      ...SHADOWS.md,
    },
  };

  const currentVariant = variantStyles[variant];
  const currentPadding = paddingConfig[padding];

  const cardStyle = [
    styles.card,
    {
      padding: currentPadding,
      ...currentVariant,
    },
    style,
  ];

  // Gradient variant
  if (variant === 'gradient') {
    const gradientColors = color
      ? [hexToRgba(color, 0.15), hexToRgba(color, 0.05)]
      : [hexToRgba(COLORS.primary[500], 0.12), hexToRgba(COLORS.primary[500], 0.04)];

    const content = (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          styles.gradientCard,
          { padding: currentPadding },
          {
            borderWidth: 1,
            borderColor: color ? hexToRgba(color, 0.2) : hexToRgba(COLORS.primary[500], 0.15),
            ...SHADOWS.sm,
          },
          style,
        ]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress || onLongPress) {
      return (
        <PressableScale
          onPress={onPress}
          onLongPress={onLongPress}
          hapticType="light"
          activeScale={0.98}
          style={styles.wrapper}
        >
          {content}
        </PressableScale>
      );
    }

    return <View style={styles.wrapper}>{content}</View>;
  }

  // Standard variants
  const content = (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        hapticType="light"
        activeScale={0.98}
        style={styles.wrapper}
      >
        {content}
      </PressableScale>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: scaleSpacing(isSmallScreen ? 10 : 12),
  },
  card: {
    borderRadius: scaleSize(isSmallScreen ? 16 : 20),
    overflow: 'hidden',
  },
  gradientCard: {
    overflow: 'hidden',
  },
});
