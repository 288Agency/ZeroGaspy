import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Badge,
  GamificationResult,
  UserGamification,
  getGamificationData,
  onDailyVisit,
  onFoodAdded,
  onFoodConsumed,
  onFoodThrown,
  onRecipeViewed,
  onListCreated,
} from '../services/gamificationService';
import AchievementToast from '../components/AchievementToast';
import { useAuth } from './AuthContext';

interface GamificationContextType {
  gamificationData: UserGamification | null;
  trackFoodAdded: () => Promise<void>;
  trackFoodConsumed: (wasBeforeExpiration: boolean) => Promise<void>;
  trackFoodThrown: () => Promise<void>;
  trackRecipeViewed: () => Promise<void>;
  trackListCreated: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

interface ToastState {
  visible: boolean;
  badge: Badge | null;
  xpGained: number;
  levelUp: boolean;
  newLevel?: number;
}

interface GamificationProviderProps {
  children: ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const { user, isLocalMode } = useAuth();
  const [gamificationData, setGamificationData] = useState<UserGamification | null>(null);
  const [toastQueue, setToastQueue] = useState<ToastState[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastState>({
    visible: false,
    badge: null,
    xpGained: 0,
    levelUp: false,
  });

  useEffect(() => {
    // Charger les donnees et tracker la visite quotidienne
    const init = async () => {
      const data = await getGamificationData();
      setGamificationData(data);

      // Tracker la visite quotidienne
      if (user || isLocalMode) {
        const result = await onDailyVisit();
        handleResult(result);
      }
    };

    if (user || isLocalMode) {
      init();
    }
  }, [user, isLocalMode]);

  // Gerer la file d'attente des toasts
  useEffect(() => {
    if (!currentToast.visible && toastQueue.length > 0) {
      const [next, ...rest] = toastQueue;
      setCurrentToast({ ...next, visible: true });
      setToastQueue(rest);
    }
  }, [currentToast.visible, toastQueue]);

  const handleResult = async (result: GamificationResult) => {
    // Rafraichir les donnees
    const data = await getGamificationData();
    setGamificationData(data);

    // Ajouter les toasts a la queue
    const newToasts: ToastState[] = [];

    // Toast pour chaque nouveau badge
    for (const badge of result.newBadges) {
      newToasts.push({
        visible: false,
        badge,
        xpGained: badge.xpReward,
        levelUp: false,
      });
    }

    // Toast pour level up
    if (result.levelUp && result.newLevel) {
      newToasts.push({
        visible: false,
        badge: null,
        xpGained: 0,
        levelUp: true,
        newLevel: result.newLevel,
      });
    }

    if (newToasts.length > 0) {
      setToastQueue(prev => [...prev, ...newToasts]);
    }
  };

  const hideToast = () => {
    setCurrentToast(prev => ({ ...prev, visible: false }));
  };

  const trackFoodAdded = async () => {
    const result = await onFoodAdded();
    handleResult(result);
  };

  const trackFoodConsumed = async (wasBeforeExpiration: boolean) => {
    const result = await onFoodConsumed(wasBeforeExpiration);
    handleResult(result);
  };

  const trackFoodThrown = async () => {
    const result = await onFoodThrown();
    handleResult(result);
  };

  const trackRecipeViewed = async () => {
    const result = await onRecipeViewed();
    handleResult(result);
  };

  const trackListCreated = async () => {
    const result = await onListCreated();
    handleResult(result);
  };

  const refreshData = async () => {
    const data = await getGamificationData();
    setGamificationData(data);
  };

  return (
    <GamificationContext.Provider
      value={{
        gamificationData,
        trackFoodAdded,
        trackFoodConsumed,
        trackFoodThrown,
        trackRecipeViewed,
        trackListCreated,
        refreshData,
      }}
    >
      {children}
      <AchievementToast
        badge={currentToast.badge}
        xpGained={currentToast.xpGained}
        levelUp={currentToast.levelUp}
        newLevel={currentToast.newLevel}
        visible={currentToast.visible}
        onHide={hideToast}
      />
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification doit etre utilise dans un GamificationProvider');
  }
  return context;
}
