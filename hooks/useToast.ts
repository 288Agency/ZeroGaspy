import { useState, useCallback } from 'react';
import type { ToastConfig } from '../components/Toast';

// ============================================
// TYPES
// ============================================

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
  message: '',
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
