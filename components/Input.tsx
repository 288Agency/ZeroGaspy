import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: any;
}

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'filled',
  size = 'md',
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(props.value ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isFocused]);

  useEffect(() => {
    const animation = Animated.timing(labelAnim, {
      toValue: isFocused || props.value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isFocused, props.value]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const sizeConfig = {
    sm: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      fontSize: 14,
      iconSize: 18,
      minHeight: 44,
    },
    md: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      iconSize: 20,
      minHeight: 52,
    },
    lg: {
      paddingVertical: 18,
      paddingHorizontal: 20,
      fontSize: 18,
      iconSize: 22,
      minHeight: 60,
    },
  };

  const currentSize = sizeConfig[size];

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? COLORS.semantic.danger : hexToRgba(COLORS.primary[500], 0.2),
      error ? COLORS.semantic.danger : COLORS.primary[500],
    ],
  });

  const backgroundColor = variant === 'filled'
    ? COLORS.neutral.white
    : variant === 'outlined'
    ? 'transparent'
    : COLORS.secondary.cream;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, error && styles.labelError]}>
            {label}
          </Text>
        </View>
      )}

      {/* Input container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor,
            minHeight: currentSize.minHeight,
            paddingHorizontal: currentSize.paddingHorizontal,
          },
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {/* Left icon */}
        {leftIcon && (
          <View style={styles.iconLeft}>
            <Ionicons
              name={leftIcon}
              size={currentSize.iconSize}
              color={isFocused ? COLORS.primary[500] : COLORS.text.secondary}
            />
          </View>
        )}

        {/* Text input */}
        <TextInput
          {...props}
          style={[
            styles.input,
            {
              fontSize: currentSize.fontSize,
              paddingVertical: currentSize.paddingVertical,
            },
            leftIcon && { paddingLeft: SPACING.sm },
            rightIcon && { paddingRight: SPACING.sm },
          ]}
          placeholderTextColor={COLORS.text.muted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={COLORS.primary[500]}
        />

        {/* Right icon */}
        {rightIcon && (
          <View style={styles.iconRight}>
            {onRightIconPress ? (
              <Ionicons
                name={rightIcon}
                size={currentSize.iconSize}
                color={COLORS.text.secondary}
                onPress={onRightIconPress}
              />
            ) : (
              <Ionicons
                name={rightIcon}
                size={currentSize.iconSize}
                color={COLORS.text.secondary}
              />
            )}
          </View>
        )}
      </Animated.View>

      {/* Helper text */}
      {(error || hint) && (
        <View style={styles.helperContainer}>
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons
                name="alert-circle"
                size={14}
                color={COLORS.semantic.danger}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : hint ? (
            <Text style={styles.hintText}>{hint}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  labelContainer: {
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.brand,
  },
  labelError: {
    color: COLORS.semantic.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    ...SHADOWS.sm,
  },
  inputFocused: {
    ...SHADOWS.md,
  },
  inputError: {
    borderColor: COLORS.semantic.danger,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  iconLeft: {
    marginRight: SPACING.xs,
  },
  iconRight: {
    marginLeft: SPACING.xs,
  },
  helperContainer: {
    marginTop: 6,
    paddingHorizontal: SPACING.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.semantic.danger,
  },
  hintText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
});
