import { useState, useCallback } from 'react';
import type { ToastType } from '../components/Toast';

// ============================================
// TYPES
// ============================================

interface ToastConfig {
  type: ToastType;
  title: string;
  subtitle?: string;
  duration?: number;
}

interface UseToastReturn {
  toastVisible: boolean;
  toastConfig: ToastConfig;
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: ToastConfig = {
  type: 'info',
  title: '',
  duration: 3000,
};

// ============================================
// HOOK
// ============================================

export const useToast = (): UseToastReturn => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState<ToastConfig>(DEFAULT_CONFIG);

  const showToast = useCallback((config: ToastConfig) => {
    setToastConfig({
      duration: 3000,
      ...config,
    });
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  return {
    toastVisible,
    toastConfig,
    showToast,
    hideToast,
  };
};
