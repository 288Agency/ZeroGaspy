// ============================================================================
// ZeroGaspy Design System · Badge
// ============================================================================
// 2 styles × tones sémantiques. Pas de variant décoratif.
//
//   variant: 'soft' (par défaut) | 'solid'
//   tone:    'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'reward'
//
// Usage :
//   <Badge tone="success">Frais</Badge>
//   <Badge tone="danger" variant="solid" dot>Aujourd'hui</Badge>
//   <Badge tone="warning">Dans 3 jours</Badge>
//   <Badge>Frigo</Badge>                          // tone par défaut: neutral
//   <Badge tone="reward" icon="star">Premium</Badge>
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import type { SemanticColors } from '@/tokens';
import type { BrandIconName } from '@/tokens/brandIcons';
import { BrandIcon } from './BrandIcon';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'reward';
export type BadgeVariant = 'soft' | 'solid';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  /** Affiche un petit point coloré devant le texte */
  dot?: boolean;
  /** Icône Phosphor optionnelle devant le texte */
  icon?: BrandIconName;
  /** Texte barré (use case : périmé) */
  strikethrough?: boolean;
  style?: ViewStyle;
}

function getToneColors(
  tone: BadgeTone,
  variant: BadgeVariant,
  colors: SemanticColors,
): { bg: string; fg: string; border: string } {
  if (tone === 'neutral') {
    return variant === 'solid'
      ? { bg: colors.fg.primary, fg: colors.fg.inverse, border: colors.fg.primary }
      : { bg: colors.bg.sunken, fg: colors.fg.secondary, border: colors.border.default };
  }

  const f = colors.feedback[tone];
  return variant === 'solid'
    ? { bg: f.solid, fg: f.onSolid, border: f.solid }
    : { bg: f.bg, fg: f.fg, border: f.border };
}

export default function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  dot = false,
  icon,
  strikethrough = false,
  style,
}: BadgeProps) {
  const { colors, typography, componentRadius } = useTheme();
  const c = getToneColors(tone, variant, colors);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderRadius: componentRadius.badge,
        },
        style,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: c.fg }]} />
      )}
      {icon && (
        <View style={{ marginRight: 4 }}>
          <BrandIcon name={icon} size={10} color={c.fg} weight="fill" />
        </View>
      )}
      <Text
        style={[
          typography.caption,
          {
            color: c.fg,
            textTransform: 'uppercase',
            textDecorationLine: strikethrough ? 'line-through' : 'none',
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 24,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
