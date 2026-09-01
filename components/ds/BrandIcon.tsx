// ============================================================================
// ZeroGaspy Design System · BrandIcon (Phosphor — Brand Bible §06)
// ============================================================================

import React from 'react';
import type { IconProps } from 'phosphor-react-native';

import { BRAND_ICONS, type BrandIconName } from '@/tokens/brandIcons';

export type { BrandIconName };

export interface BrandIconProps {
  name: BrandIconName;
  size?: number;
  color?: string;
  weight?: IconProps['weight'];
}

export function BrandIcon({
  name,
  size = 20,
  color = '#000000',
  weight = 'regular',
}: BrandIconProps) {
  const Icon = BRAND_ICONS[name];
  return <Icon size={size} color={color} weight={weight} />;
}
