import React, { useRef, useCallback, useMemo } from 'react';
import { Pressable, PressableProps, Animated, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  activeScale?: number;
  haptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection';
  style?: StyleProp<ViewStyle>;
  minHitSlop?: number;
}

const PressableScale = React.memo(function PressableScale({
  children,
  activeScale = 0.97,
  haptic = true,
  hapticType = 'light',
  onPressIn,
  onPressOut,
  onPress,
  onLongPress,
  style,
  disabled,
  minHitSlop = 8,
  hitSlop,
  ...props
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback((e: any) => {
    Animated.spring(scaleAnim, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    onPressIn?.(e);
  }, [scaleAnim, activeScale, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
    onPressOut?.(e);
  }, [scaleAnim, onPressOut]);

  const handlePress = useCallback((e: any) => {
    if (haptic && !disabled) {
      const feedbackStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
        selection: null,
      }[hapticType];

      if (feedbackStyle) {
        Haptics.impactAsync(feedbackStyle);
      } else {
        Haptics.selectionAsync();
      }
    }
    onPress?.(e);
  }, [haptic, disabled, hapticType, onPress]);

  const handleLongPress = useCallback((e: any) => {
    if (haptic && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    onLongPress?.(e);
  }, [haptic, disabled, onLongPress]);

  const computedHitSlop = useMemo(() => hitSlop ?? {
    top: minHitSlop,
    bottom: minHitSlop,
    left: minHitSlop,
    right: minHitSlop,
  }, [hitSlop, minHitSlop]);

  const animatedStyle = useMemo(
    () => [{ transform: [{ scale: scaleAnim }] }, style],
    [scaleAnim, style]
  );

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      disabled={disabled}
      hitSlop={computedHitSlop}
      {...props}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
});

export default PressableScale;
