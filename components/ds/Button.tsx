// ============================================================================
// ZeroGaspy Design System · Button
// ============================================================================
// 3 variants × 3 tailles × tous les états (default / pressed / disabled / loading).
// Icônes SF Symbols via expo-symbols (iOS 14+ natif, fallback Android).
//
// Usage :
//   <Button variant="primary" size="lg" onPress={...}>Ajouter au frigo</Button>
//   <Button variant="secondary" icon="barcode.viewfinder">Scanner</Button>
//   <Button variant="ghost" size="sm">Passer</Button>
//   <Button variant="primary" tone="destructive">Jeter</Button>
//   <Button loading>Envoi…</Button>
// ============================================================================

import React from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from 'react-native';
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import type { SemanticColors } from '@/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonTone = 'default' | 'destructive';

export interface ButtonProps {
  children?: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  /** SF Symbol name (ex: "plus", "barcode.viewfinder", "trash") */
  icon?: SymbolViewProps['name'];
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: Haptics.ImpactFeedbackStyle | null;
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
}

const SIZE = {
  sm: { height: 36, paddingH: 14, font: 13, icon: 14, radius: 12 },
  md: { height: 44, paddingH: 18, font: 15, icon: 16, radius: 14 },
  lg: { height: 52, paddingH: 22, font: 16, icon: 18, radius: 20 },
} as const;

function getVariantStyle(
  variant: ButtonVariant,
  tone: ButtonTone,
  colors: SemanticColors,
  pressed: boolean,
): { bg: string; fg: string; border: string } {
  const isDestructive = tone === 'destructive';

  switch (variant) {
    case 'primary':
      return {
        bg: isDestructive
          ? (pressed ? colors.feedback.danger.fg : colors.feedback.danger.solid)
          : (pressed ? colors.accent.hover : colors.accent.default),
        fg: isDestructive ? colors.feedback.danger.onSolid : colors.fg.onAccent,
        border: 'transparent',
      };
    case 'secondary':
      return {
        bg: pressed ? colors.bg.sunken : colors.bg.surface,
        fg: isDestructive ? colors.feedback.danger.solid : colors.fg.primary,
        border: isDestructive ? colors.feedback.danger.border : colors.border.default,
      };
    case 'ghost':
      return {
        bg: pressed ? colors.bg.sunken : 'transparent',
        fg: isDestructive ? colors.feedback.danger.solid : colors.fg.primary,
        border: 'transparent',
      };
  }
}

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  tone = 'default',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = true,
  haptic = Haptics.ImpactFeedbackStyle.Medium,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const sz = SIZE[size];
  const isInert = disabled || loading;

  const handlePress = (e: GestureResponderEvent) => {
    if (isInert) return;
    if (haptic) Haptics.impactAsync(haptic).catch(() => {});
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInert, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      testID={testID}
      style={({ pressed }) => {
        const v = getVariantStyle(variant, tone, colors, pressed && !isInert);
        return [
          styles.base,
          {
            height: sz.height,
            paddingHorizontal: sz.paddingH,
            borderRadius: sz.radius,
            backgroundColor: v.bg,
            borderColor: v.border,
            borderWidth: variant === 'secondary' ? 1 : 0,
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            opacity: disabled ? 0.4 : 1,
            transform: [{ scale: pressed && !isInert ? 0.97 : 1 }],
          },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const v = getVariantStyle(variant, tone, colors, pressed && !isInert);
        const textStyle: TextStyle = {
          color: v.fg,
          fontSize: sz.font,
          fontWeight: '600',
          letterSpacing: 0.1,
        };
        return (
          <View style={styles.row}>
            {loading ? (
              <ActivityIndicator color={v.fg} size="small" />
            ) : (
              <>
                {icon && iconPosition === 'left' && (
                  <SymbolView name={icon} size={sz.icon} tintColor={v.fg} style={styles.iconLeft} />
                )}
                {children != null && (
                  <Text style={textStyle} numberOfLines={1}>
                    {children}
                  </Text>
                )}
                {icon && iconPosition === 'right' && (
                  <SymbolView name={icon} size={sz.icon} tintColor={v.fg} style={styles.iconRight} />
                )}
              </>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
