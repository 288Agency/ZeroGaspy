// ============================================================================
// ZeroGaspy Design System · Toast
// ============================================================================
// Toast bottom avec undo action. Pour feedback après action irréversible
// (consommé, jeté, supprimé) — pattern Apple Mail / Inbox.
//
// IMPORTANT : monter <ToastProvider> AU-DESSUS de la TabBar dans App.tsx
// pour que le toast apparaisse au-dessus de celle-ci :
//
//   <ToastProvider bottomOffset={80 /* tabbar height */}>
//     <NavigationContainer>…</NavigationContainer>
//   </ToastProvider>
//
// Usage :
//   const { show } = useToast();
//   show({
//     message: 'Yaourt marqué consommé',
//     tone: 'success',
//     action: { label: 'Annuler', onPress: () => undoConsume(itemId) },
//   });
// ============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView, SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface ToastConfig {
  message: string;
  tone?: ToastTone;
  /** SF Symbol — défaut dérivé du tone */
  icon?: SymbolViewProps['name'];
  /** Durée avant auto-dismiss, défaut 4000ms */
  duration?: number;
  /** Action inline (généralement "Annuler" pour undo) */
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
  };
}

interface ToastCtx {
  show: (config: ToastConfig) => void;
  hide: () => void;
}

const Ctx = createContext<ToastCtx | undefined>(undefined);

export function useToast(): ToastCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast requires <ToastProvider> at app root');
  return c;
}

interface ToastProviderProps {
  children: ReactNode;
  /** Décalage depuis le bas (utile pour positionner au-dessus d'une TabBar). Défaut: 0. */
  bottomOffset?: number;
}

export function ToastProvider({ children, bottomOffset = 0 }: ToastProviderProps) {
  const { colors, typography, space, radius, componentRadius, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const translateY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 120, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [translateY, opacity]);

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity]);

  const show = useCallback(
    (config: ToastConfig) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast(config);
      requestAnimationFrame(animateIn);
      timeoutRef.current = setTimeout(() => animateOut(), config.duration ?? 4000);
    },
    [animateIn, animateOut],
  );

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    animateOut();
  }, [animateOut]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // ── Tone styling ─────────────────────────────────────────────────────────
  const tone = toast?.tone ?? 'neutral';
  const toneStyle = {
    neutral: { iconBg: colors.bg.sunken, iconFg: colors.fg.primary },
    success: { iconBg: colors.feedback.success.bg, iconFg: colors.feedback.success.fg },
    warning: { iconBg: colors.feedback.warning.bg, iconFg: colors.feedback.warning.fg },
    danger:  { iconBg: colors.feedback.danger.bg,  iconFg: colors.feedback.danger.fg },
  }[tone];

  const defaultIcon: SymbolViewProps['name'] =
    tone === 'success' ? 'checkmark.circle.fill' :
    tone === 'danger'  ? 'trash.fill' :
    tone === 'warning' ? 'exclamationmark.triangle.fill' :
                         'info.circle.fill';

  return (
    <Ctx.Provider value={{ show, hide }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              bottom: insets.bottom + bottomOffset + 12,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <View
            style={[
              styles.toast,
              {
                backgroundColor: scheme === 'dark' ? colors.bg.elevated : colors.bg.surface,
                borderColor: colors.border.subtle,
                borderRadius: radius.lg,
                paddingHorizontal: space[3],
                paddingVertical: space[3],
                shadowColor: '#0E0D0B',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: scheme === 'dark' ? 0.5 : 0.18,
                shadowRadius: 28,
                elevation: 12,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: toneStyle.iconBg, borderRadius: radius.sm }]}>
              <SymbolView
                name={toast.icon ?? defaultIcon}
                type="hierarchical"
                size={16}
                tintColor={toneStyle.iconFg}
              />
            </View>
            <Text
              style={[
                typography.body,
                {
                  color: colors.fg.primary,
                  flex: 1,
                  marginLeft: space[3],
                  marginRight: toast.action ? space[2] : 0,
                },
              ]}
              numberOfLines={2}
            >
              {toast.message}
            </Text>
            {toast.action && (
              <Pressable
                onPress={async () => {
                  hide();
                  await toast.action!.onPress();
                }}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: pressed ? colors.bg.sunken : 'transparent',
                    borderRadius: radius.sm,
                    paddingHorizontal: space[3],
                    paddingVertical: 6,
                  },
                ]}
              >
                <Text style={[typography.bodyEmphasis, { color: colors.accent.default }]}>
                  {toast.action.label}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flexShrink: 0,
  },
});
