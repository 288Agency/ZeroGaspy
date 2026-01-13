import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';

interface FieldInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
}

export default function FieldInput({
  label,
  value,
  onChangeText,
  icon,
  hint,
  ...props
}: FieldInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [hexToRgba(COLORS.primary[500], 0.2), COLORS.primary[500]],
  });

  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.neutral.white, hexToRgba(COLORS.primary[50], 0.5)],
  });

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Input container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor,
          },
          isFocused && styles.inputFocused,
        ]}
      >
        {/* Icon */}
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={icon}
              size={20}
              color={isFocused ? COLORS.primary[500] : COLORS.text.secondary}
            />
          </View>
        )}

        {/* Text input */}
        <TextInput
          {...props}
          value={value}
          onChangeText={onChangeText}
          style={[styles.input, icon && { paddingLeft: 8 }]}
          placeholderTextColor={COLORS.text.muted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={COLORS.primary[500]}
        />
      </Animated.View>

      {/* Hint */}
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.brand,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    minHeight: 56,
    ...SHADOWS.sm,
  },
  inputFocused: {
    ...SHADOWS.md,
  },
  iconContainer: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '500',
    paddingVertical: 14,
  },
  hint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 6,
    paddingLeft: 4,
  },
});
