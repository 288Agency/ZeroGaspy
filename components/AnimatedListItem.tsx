import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  staggerDelay?: number;
  animationType?: 'fade' | 'slide' | 'scale' | 'slideUp';
  style?: ViewStyle;
  className?: string;
}

export default function AnimatedListItem({
  children,
  index,
  staggerDelay = 50,
  animationType = 'slideUp',
  style,
  className,
}: AnimatedListItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(
    animationType === 'slide' ? -30 : animationType === 'slideUp' ? 20 : 0
  )).current;
  const scaleAnim = useRef(new Animated.Value(animationType === 'scale' ? 0.8 : 1)).current;

  useEffect(() => {
    const delay = index * staggerDelay;

    const animation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateAnim, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
    ]);

    animation.start();

    // Cleanup: Stop animation if component unmounts
    return () => animation.stop();
  }, [index]);

  const getTransform = () => {
    switch (animationType) {
      case 'slide':
        return [{ translateX: translateAnim }];
      case 'scale':
        return [{ scale: scaleAnim }];
      case 'slideUp':
      default:
        return [{ translateY: translateAnim }];
    }
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: getTransform(),
        },
        style,
      ]}
      className={className}
    >
      {children}
    </Animated.View>
  );
}
