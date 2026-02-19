import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../utils/designSystem';

interface FlameIconProps {
  size?: number;
  color?: string;
}

const FlameIcon = React.memo(function FlameIcon({ size = 24, color = COLORS.accent.carrot }: FlameIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 23c-3.866 0-7-3.134-7-7 0-2.5 1.5-4.5 3-6 .5-.5 1-1 1.5-2 1.5 1.5 2 3.5 2 5.5 0 .5.5 1 1 1s1-.5 1-1c0-2.5.5-4 2-6 2 2 3.5 4.5 3.5 7.5 0 3.866-3.134 7-7 7z" />
    </Svg>
  );
});

export default FlameIcon;
