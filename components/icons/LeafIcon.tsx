import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../utils/designSystem';

interface LeafIconProps {
  size?: number;
}

const LeafIcon = React.memo(function LeafIcon({ size = 32 }: LeafIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.accent.avocado} />
          <Stop offset="100%" stopColor={COLORS.primary[500]} />
        </LinearGradient>
      </Defs>
      <Path
        d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20c4 0 8.5-4.5 9-8.5-.17 1.67-1 4-3 5.5 0-2.5-1-4-3-5.5.67 1.17 1 2.5 1 4-2-1.5-3.5-4-4-6.5 4-.5 9 1 12 4.5V8h-3z"
        fill="url(#leafGrad)"
      />
    </Svg>
  );
});

export default LeafIcon;
