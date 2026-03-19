import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Rect, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import { COLORS } from '../../utils/designSystem';
import { DEVICE } from '../../utils/responsive';

const { width } = { width: DEVICE.width };

// Stylized Carrot Illustration
export const CarrotIllustration = React.memo(function CarrotIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={120 * scale} height={140 * scale} viewBox="0 0 120 140">
      <Defs>
        <LinearGradient id="carrotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF8C42" />
          <Stop offset="100%" stopColor="#E85D04" />
        </LinearGradient>
        <LinearGradient id="leafGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#3C6E47" />
          <Stop offset="100%" stopColor="#6BBF59" />
        </LinearGradient>
      </Defs>
      <Path
        d="M60 35 C75 35 85 50 85 70 C85 100 70 130 60 135 C50 130 35 100 35 70 C35 50 45 35 60 35"
        fill="url(#carrotGrad)"
      />
      <Path d="M45 60 Q60 65 75 60" stroke="#E85D04" strokeWidth="2" fill="none" opacity="0.5" />
      <Path d="M42 80 Q60 85 78 80" stroke="#E85D04" strokeWidth="2" fill="none" opacity="0.5" />
      <Path d="M48 100 Q60 105 72 100" stroke="#E85D04" strokeWidth="2" fill="none" opacity="0.5" />
      <Path d="M60 35 C55 25 45 10 50 5 C55 0 65 15 60 35" fill="url(#leafGrad)" />
      <Path d="M60 35 C50 30 35 25 35 15 C35 10 55 20 60 35" fill="url(#leafGrad)" />
      <Path d="M60 35 C70 30 85 25 85 15 C85 10 65 20 60 35" fill="url(#leafGrad)" />
    </Svg>
  );
});

// Stylized Apple Illustration
export const AppleIllustration = React.memo(function AppleIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={110 * scale} height={130 * scale} viewBox="0 0 110 130">
      <Defs>
        <RadialGradient id="appleGrad" cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FF6B6B" />
          <Stop offset="100%" stopColor="#C0392B" />
        </RadialGradient>
        <LinearGradient id="stemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#8B5A2B" />
          <Stop offset="100%" stopColor="#5D4E37" />
        </LinearGradient>
      </Defs>
      <Path
        d="M55 25 C30 25 10 50 10 80 C10 110 30 125 55 125 C80 125 100 110 100 80 C100 50 80 25 55 25"
        fill="url(#appleGrad)"
      />
      <Path d="M45 25 Q55 35 65 25" fill="#C0392B" />
      <Rect x="52" y="8" width="6" height="20" rx="3" fill="url(#stemGrad)" />
      <Path d="M58 15 Q75 5 80 15 Q75 25 58 20" fill="#3C6E47" />
      <Ellipse cx="35" cy="55" rx="12" ry="18" fill="white" opacity="0.2" />
    </Svg>
  );
});

// Stylized Broccoli Illustration
export const BroccoliIllustration = React.memo(function BroccoliIllustration({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={120 * scale} height={140 * scale} viewBox="0 0 120 140">
      <Defs>
        <RadialGradient id="brocGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#6BBF59" />
          <Stop offset="100%" stopColor="#3C6E47" />
        </RadialGradient>
        <LinearGradient id="brocStem" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#5DAE50" />
          <Stop offset="100%" stopColor="#3C6E47" />
        </LinearGradient>
      </Defs>
      <Path d="M50 70 L45 130 Q60 135 75 130 L70 70" fill="url(#brocStem)" />
      <Circle cx="60" cy="45" r="30" fill="url(#brocGrad)" />
      <Circle cx="35" cy="55" r="22" fill="url(#brocGrad)" />
      <Circle cx="85" cy="55" r="22" fill="url(#brocGrad)" />
      <Circle cx="45" cy="35" r="18" fill="url(#brocGrad)" />
      <Circle cx="75" cy="35" r="18" fill="url(#brocGrad)" />
      <Circle cx="60" cy="25" r="15" fill="#6BBF59" />
      <Circle cx="50" cy="40" r="3" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="70" cy="45" r="3" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="60" cy="55" r="3" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="40" cy="60" r="2" fill="#4A9E3D" opacity="0.6" />
      <Circle cx="80" cy="58" r="2" fill="#4A9E3D" opacity="0.6" />
    </Svg>
  );
});

// Decorative Leaf Pattern
export const LeafPattern = React.memo(function LeafPattern({
  color = COLORS.primary[500],
  opacity = 0.1,
}: {
  color?: string;
  opacity?: number;
}) {
  return (
    <Svg width={width} height={300} viewBox={`0 0 ${width} 300`} style={{ position: 'absolute', top: 0 }}>
      <G opacity={opacity}>
        <Path d="M-20 100 Q30 50 80 100 Q30 150 -20 100" fill={color} transform="rotate(-30 30 100)" />
        <Path d="M100 50 Q150 0 200 50 Q150 100 100 50" fill={color} transform="rotate(15 150 50)" />
        <Path d="M250 120 Q300 70 350 120 Q300 170 250 120" fill={color} transform="rotate(-20 300 120)" />
        <Circle cx="50" cy="200" r="8" fill={color} />
        <Circle cx="150" cy="180" r="5" fill={color} />
        <Circle cx="280" cy="220" r="6" fill={color} />
        <Circle cx="350" cy="160" r="4" fill={color} />
      </G>
    </Svg>
  );
});

// Animated floating element wrapper
export function FloatingElement({
  children,
  delay = 0,
  duration = 3000,
  range = 15,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  range?: number;
  style?: any;
}) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const entranceAnimation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]);
    entranceAnimation.start();

    const loopAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loopAnimation.start();

    return () => {
      entranceAnimation.stop();
      loopAnimation.stop();
    };
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -range],
  });

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY }, { scale: scaleAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
