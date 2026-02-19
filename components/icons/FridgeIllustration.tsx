import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { COLORS } from '../../utils/designSystem';

interface FridgeIllustrationProps {
  size?: number;
}

const FridgeIllustration = React.memo(function FridgeIllustration({ size = 100 }: FridgeIllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>
        <Path
          d="M25 15 L75 15 C78 15 80 17 80 20 L80 85 C80 88 78 90 75 90 L25 90 C22 90 20 88 20 85 L20 20 C20 17 22 15 25 15"
          fill={COLORS.primary[100]}
          stroke={COLORS.primary[500]}
          strokeWidth="2"
        />
        <Path d="M20 45 L80 45" stroke={COLORS.primary[500]} strokeWidth="2" />
        <Path d="M70 30 L70 40" stroke={COLORS.primary[500]} strokeWidth="3" strokeLinecap="round" />
        <Path d="M70 55 L70 75" stroke={COLORS.primary[500]} strokeWidth="3" strokeLinecap="round" />
        <Circle cx="35" cy="30" r="6" fill={COLORS.accent.carrot} />
        <Circle cx="50" cy="32" r="5" fill={COLORS.accent.tomato} />
        <Circle cx="40" cy="60" r="7" fill={COLORS.accent.avocado} />
        <Circle cx="55" cy="65" r="5" fill={COLORS.accent.lemon} />
        <Path d="M85 20 L88 25 L93 22 L88 28 L92 33 L87 30 L85 35 L83 30 L78 33 L82 28 L77 22 L82 25 Z" fill={COLORS.accent.lemon} />
      </G>
    </Svg>
  );
});

export default FridgeIllustration;
