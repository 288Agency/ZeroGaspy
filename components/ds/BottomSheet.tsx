// ============================================================================
// ZeroGaspy Design System · BottomSheet
// ============================================================================
// Sheet iOS-style — grabber + radius top + backdrop blur + safe-area.
//
// NOTE PROD : pour des snap points dynamiques (medium/large) + gesture
// dismiss complet, recommander @gorhom/bottom-sheet. Cette impl couvre les
// cas simples (action menu, paywall single-snap) avec RN core + expo-blur.
//
// Usage :
//   const [open, setOpen] = useState(false);
//   <BottomSheet visible={open} onClose={() => setOpen(false)} title="Ajouter">
//     <SheetRow icon="barcode.viewfinder" label="Scanner code-barres" onPress={...} />
//     <SheetRow icon="camera" label="Photo de la date" onPress={...} />
//   </BottomSheet>
// ============================================================================

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Désactive le swipe-down + tap backdrop (paywall non-bloquant : laisser true) */
  dismissable?: boolean;
  children: React.ReactNode;
  /** Hauteur max en % de l'écran (par défaut 90%) */
  maxHeightPct?: number;
}

const { height: SCREEN_H } = Dimensions.get('window');

export default function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  dismissable = true,
  children,
  maxHeightPct = 0.9,
}: BottomSheetProps) {
  const { colors, typography, space, radius, componentRadius, elevation, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleBackdrop = () => {
    if (dismissable) onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 20 : 0}
          tint={scheme === 'dark' ? 'dark' : 'default'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          onPress={handleBackdrop}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg.overlay }]}
        />
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flexEnd}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg.surface,
              borderTopLeftRadius: componentRadius.sheet,
              borderTopRightRadius: componentRadius.sheet,
              paddingBottom: insets.bottom + space[4],
              maxHeight: SCREEN_H * maxHeightPct,
              transform: [{ translateY }],
              ...elevation[4],
            },
          ]}
        >
          {/* Grabber */}
          {dismissable && (
            <View style={[styles.grabberWrap, { paddingTop: space[3], paddingBottom: space[3] }]}>
              <View style={[styles.grabber, { backgroundColor: colors.border.strong }]} />
            </View>
          )}

          {/* Header */}
          {(title || subtitle) && (
            <View style={{ paddingHorizontal: space[5], marginBottom: space[4] }}>
              {title && (
                <Text style={[typography.title2, { color: colors.fg.primary }]}>{title}</Text>
              )}
              {subtitle && (
                <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: space[1] }]}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}

          {/* Content */}
          <View style={{ paddingHorizontal: space[5] }}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SheetRow — helper row pour menu d'actions
// ────────────────────────────────────────────────────────────────────────────

export interface SheetRowProps {
  icon?: SymbolViewProps['name'];
  label: string;
  trailing?: string;
  onPress?: () => void;
  destructive?: boolean;
  /** Cache le séparateur du bas (dernière row) */
  last?: boolean;
}

export function SheetRow({ icon, label, trailing, onPress, destructive, last }: SheetRowProps) {
  const { colors, typography, space, radius, componentRadius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.border.subtle,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          backgroundColor: pressed ? colors.bg.sunken : 'transparent',
          borderRadius: pressed ? radius.sm : 0,
          paddingVertical: space[3],
        },
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: destructive ? colors.feedback.danger.bg : colors.bg.sunken,
              borderRadius: radius.sm,
            },
          ]}
        >
          <SymbolView
            name={icon}
            size={18}
            tintColor={destructive ? colors.feedback.danger.fg : colors.fg.primary}
          />
        </View>
      )}
      <Text
        style={[
          typography.body,
          {
            color: destructive ? colors.feedback.danger.fg : colors.fg.primary,
            flex: 1,
            marginLeft: icon ? space[3] : 0,
          },
        ]}
      >
        {label}
      </Text>
      {trailing && (
        <Text style={[typography.footnote, { color: colors.fg.tertiary, marginRight: space[2] }]}>
          {trailing}
        </Text>
      )}
      <SymbolView name="chevron.right" size={14} tintColor={colors.fg.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flexEnd: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
  grabberWrap: {
    alignItems: 'center',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
