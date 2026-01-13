import React, { useRef } from 'react';
import { Text, ActivityIndicator, View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale from './PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';

interface ButtonProps {
  onPress: () => void;
  children?: React.ReactNode;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: any;
  accessibilityLabel?: string;
}

export default function Button({
  onPress,
  children,
  label,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const displayText = label || children;

  const sizeConfig = {
    sm: {
      paddingVertical: scaleSpacing(isSmallScreen ? 8 : 10),
      paddingHorizontal: scaleSpacing(isSmallScreen ? 12 : 16),
      minHeight: scaleSize(isSmallScreen ? 36 : 40),
      iconSize: scaleSize(isSmallScreen ? 14 : 16),
      fontSize: scaleFontSize(isSmallScreen ? 13 : 14),
      fontWeight: TYPOGRAPHY.buttonSm.fontWeight,
      letterSpacing: TYPOGRAPHY.buttonSm.letterSpacing,
      lineHeight: scaleFontSize(isSmallScreen ? 16 : 18),
    },
    md: {
      paddingVertical: scaleSpacing(isSmallScreen ? 10 : 14),
      paddingHorizontal: scaleSpacing(isSmallScreen ? 18 : 24),
      minHeight: scaleSize(isSmallScreen ? 44 : 52),
      iconSize: scaleSize(isSmallScreen ? 18 : 20),
      fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
      fontWeight: TYPOGRAPHY.button.fontWeight,
      letterSpacing: TYPOGRAPHY.button.letterSpacing,
      lineHeight: scaleFontSize(isSmallScreen ? 18 : 22),
    },
    lg: {
      paddingVertical: scaleSpacing(isSmallScreen ? 14 : 18),
      paddingHorizontal: scaleSpacing(isSmallScreen ? 24 : 32),
      minHeight: scaleSize(isSmallScreen ? 52 : 60),
      iconSize: scaleSize(isSmallScreen ? 20 : 22),
      fontSize: scaleFontSize(isSmallScreen ? 16 : 18),
      fontWeight: TYPOGRAPHY.button.fontWeight,
      letterSpacing: TYPOGRAPHY.button.letterSpacing,
      lineHeight: scaleFontSize(isSmallScreen ? 20 : 24),
    },
  };

  const variantConfig = {
    primary: {
      backgroundColor: COLORS.primary[500],
      textColor: COLORS.neutral.white,
      borderColor: 'transparent',
      shadow: SHADOWS.colored(COLORS.primary[500], 0.3),
    },
    secondary: {
      backgroundColor: COLORS.secondary.sage,
      textColor: COLORS.primary[500],
      borderColor: hexToRgba(COLORS.primary[500], 0.2),
      shadow: SHADOWS.sm,
    },
    danger: {
      backgroundColor: COLORS.semantic.danger,
      textColor: COLORS.neutral.white,
      borderColor: 'transparent',
      shadow: SHADOWS.colored(COLORS.semantic.danger, 0.3),
    },
    outline: {
      backgroundColor: 'transparent',
      textColor: COLORS.primary[500],
      borderColor: COLORS.primary[500],
      shadow: {},
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: COLORS.primary[500],
      borderColor: 'transparent',
      shadow: {},
    },
    gradient: {
      backgroundColor: 'transparent',
      textColor: COLORS.neutral.white,
      borderColor: 'transparent',
      shadow: SHADOWS.colored(COLORS.primary[500], 0.35),
    },
  };

  const currentSize = sizeConfig[size];
  const currentVariant = variantConfig[variant];

  const buttonContent = (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          color={currentVariant.textColor}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={[styles.iconContainer, { marginRight: scaleSpacing(6) }]}>
              <Ionicons
                name={icon}
                size={currentSize.iconSize}
                color={currentVariant.textColor}
              />
            </View>
          )}
          {displayText && (
            <Text
              style={[
                styles.text,
                {
                  fontSize: currentSize.fontSize,
                  fontWeight: currentSize.fontWeight,
                  letterSpacing: currentSize.letterSpacing,
                  color: currentVariant.textColor,
                },
              ]}
            >
              {displayText}
            </Text>
          )}
          {icon && iconPosition === 'right' && (
            <View style={[styles.iconContainer, { marginLeft: scaleSpacing(6) }]}>
              <Ionicons
                name={icon}
                size={currentSize.iconSize}
                color={currentVariant.textColor}
              />
            </View>
          )}
        </>
      )}
    </View>
  );

  const buttonStyle = [
    styles.button,
    {
      paddingVertical: currentSize.paddingVertical,
      paddingHorizontal: currentSize.paddingHorizontal,
      minHeight: currentSize.minHeight,
      backgroundColor: currentVariant.backgroundColor,
      borderColor: currentVariant.borderColor,
      borderWidth: variant === 'outline' ? 2 : 1,
      ...currentVariant.shadow,
    },
    !fullWidth && { alignSelf: 'flex-start' },
    (disabled || loading) && styles.disabled,
    style,
  ];

  if (variant === 'gradient') {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled || loading}
        hapticType="medium"
        activeScale={0.97}
        style={[!fullWidth && { alignSelf: 'flex-start' }]}
        accessibilityLabel={accessibilityLabel || (typeof displayText === 'string' ? displayText : undefined)}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[COLORS.primary[400], COLORS.primary[500], COLORS.primary[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            styles.gradient,
            {
              paddingVertical: currentSize.paddingVertical,
              paddingHorizontal: currentSize.paddingHorizontal,
              minHeight: currentSize.minHeight,
              ...currentVariant.shadow,
            },
            (disabled || loading) && styles.disabled,
          ]}
        >
          {buttonContent}
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      hapticType="medium"
      activeScale={0.97}
      style={buttonStyle}
      accessibilityLabel={accessibilityLabel || (typeof displayText === 'string' ? displayText : undefined)}
      accessibilityRole="button"
    >
      {buttonContent}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: scaleSize(isSmallScreen ? 16 : 20),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gradient: {
    borderWidth: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
