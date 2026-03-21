import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS } from '../utils/designSystem';

// ============================================
// TYPES
// ============================================

export type ToastType = 'success' | 'error' | 'info';

export interface ToastConfig {
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  visible: boolean;
  config: ToastConfig;
  onHide: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const TOAST_STYLES: Record<
  ToastType,
  { backgroundColor: string; borderColor: string; icon: string }
> = {
  success: {
    backgroundColor: '#e8f5eb',
    borderColor: '#a5d6a7',
    icon: '✅',
  },
  error: {
    backgroundColor: '#ffebee',
    borderColor: '#ef9a9a',
    icon: '❌',
  },
  info: {
    backgroundColor: '#e3f2fd',
    borderColor: '#90caf9',
    icon: '💾',
  },
};

// ============================================
// COMPONENT
// ============================================

const Toast: React.FC<ToastProps> = ({ visible, config, onHide }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Clear any pending auto-hide timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto-hide after duration
      const duration = config.duration ?? 3000;
      timerRef.current = setTimeout(() => {
        hide();
      }, duration);
    } else {
      // Slide out
      Animated.spring(translateY, {
        toValue: -120,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.spring(translateY, {
      toValue: -120,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start(() => {
      onHide();
    });
  };

  const toastStyle = TOAST_STYLES[config.type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: toastStyle.backgroundColor,
          borderColor: toastStyle.borderColor,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={styles.inner}
        onPress={hide}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>{toastStyle.icon}</Text>
        <Text style={styles.message} numberOfLines={3}>
          {config.message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: RADIUS['2xl'],
    borderWidth: 1,
    ...SHADOWS.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    lineHeight: 20,
  },
});

export default Toast;
