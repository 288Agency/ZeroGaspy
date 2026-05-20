// ============================================================================
// ZeroGaspy Design System · Input
// ============================================================================
// 1 variant + tous les états (default / focused / filled / error / disabled).
// Label statique au-dessus (pas de floating label — moins de magie, plus clair).
// Hint OU error sous le champ.
//
// Usage :
//   <Input label="Nom de l'aliment" value={v} onChangeText={set} placeholder="Yaourt…" />
//   <Input label="Date" leftIcon="calendar" value={d} onChangeText={setD} hint="JJ/MM/AAAA" />
//   <Input label="Code-barres" value={c} editable={false} disabled />
//   <Input label="Date" value={d} onChangeText={setD} error="Date invalide" />
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: SymbolViewProps['name'];
  rightIcon?: SymbolViewProps['name'];
  onRightIconPress?: () => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const { colors, typography, componentRadius, space } = useTheme();
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback(
    (e: any) => { setFocused(true); onFocus?.(e); },
    [onFocus],
  );
  const handleBlur = useCallback(
    (e: any) => { setFocused(false); onBlur?.(e); },
    [onBlur],
  );

  const borderColor = error
    ? colors.feedback.danger.solid
    : focused
    ? colors.border.focus
    : colors.border.default;

  const bgColor = disabled ? colors.bg.sunken : colors.bg.surface;

  return (
    <View style={[{ marginBottom: space[5] }, containerStyle]}>
      {label && (
        <Text
          style={[
            typography.caption,
            {
              color: error ? colors.feedback.danger.fg : colors.fg.secondary,
              textTransform: 'uppercase',
              marginBottom: space[2],
              paddingHorizontal: space[1],
            },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.field,
          {
            borderRadius: componentRadius.input,
            borderColor,
            backgroundColor: bgColor,
            borderWidth: focused ? 2 : 1,
            paddingHorizontal: focused ? space[4] - 1 : space[4],
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        {leftIcon && (
          <SymbolView
            name={leftIcon}
            size={18}
            tintColor={focused ? colors.fg.primary : colors.fg.tertiary}
            style={{ marginRight: space[3] }}
          />
        )}

        <TextInput
          {...rest}
          editable={!disabled && rest.editable !== false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.fg.muted}
          selectionColor={colors.accent.default}
          style={[
            typography.body,
            styles.input,
            { color: colors.fg.primary, paddingVertical: 0 },
          ]}
        />

        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            hitSlop={8}
            disabled={!onRightIconPress}
            style={{ marginLeft: space[3] }}
          >
            <SymbolView
              name={rightIcon}
              size={18}
              tintColor={colors.fg.tertiary}
            />
          </Pressable>
        )}
      </View>

      {(error || hint) && (
        <View style={{ marginTop: space[2], paddingHorizontal: space[1], flexDirection: 'row', alignItems: 'center' }}>
          {error ? (
            <>
              <SymbolView
                name="exclamationmark.circle.fill"
                size={12}
                tintColor={colors.feedback.danger.fg}
                style={{ marginRight: 4 }}
              />
              <Text style={[typography.footnote, { color: colors.feedback.danger.fg }]}>
                {error}
              </Text>
            </>
          ) : (
            <Text style={[typography.footnote, { color: colors.fg.tertiary }]}>
              {hint}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
});
