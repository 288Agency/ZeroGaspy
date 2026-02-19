import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../utils/designSystem';

interface FoodIllustrationProps {
  size?: number;
}

const FoodIllustration = React.memo(function FoodIllustration({ size = 60 }: FoodIllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.secondary.sage} />
          <Stop offset="100%" stopColor={COLORS.primary[200]} />
        </LinearGradient>
      </Defs>
      <Circle cx="30" cy="35" rx="25" ry="12" fill="url(#plateGrad)" />
      <Circle cx="30" cy="35" rx="20" ry="9" fill={COLORS.neutral.white} opacity="0.5" />
      <Circle cx="22" cy="30" r="6" fill={COLORS.accent.tomato} />
      <Circle cx="35" cy="28" r="5" fill={COLORS.accent.avocado} />
      <Circle cx="30" cy="35" r="4" fill={COLORS.accent.carrot} />
      <Circle cx="18" cy="28" r="2" fill="white" opacity="0.6" />
    </Svg>
  );
});

export default FoodIllustration;
