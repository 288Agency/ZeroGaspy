import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { InteractionManager } from 'react-native';
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
  grantChallengeXp,
} from '../services/gamificationService';
import {
  WeeklyChallengesState,
  ChallengeCompletionResult,
  getOrInitChallenges,
  trackChallengeProgress,
} from '../services/challengeService';
import AchievementToast from '../components/AchievementToast';
import ConfettiBurst from '../components/ConfettiBurst';
import { useAuth } from './AuthContext';
import { useSubscription } from './SubscriptionContext';
import { maybeRequestReview } from '../services/reviewService';
import { setCurrentSyncUserId } from '../services/supabase/cloudSyncQueue';
import {
  syncGamificationOnLogin,
  syncChallengesOnLogin,
} from '../services/supabase/gamificationSyncService';

interface GamificationContextType {
  gamificationData: UserGamification | null;
  challengesState: WeeklyChallengesState | null;
  trackFoodAdded: (listId?: string) => void;
  trackFoodConsumed: (wasBeforeExpiration: boolean) => void;
  trackFoodThrown: () => void;
  trackRecipeViewed: () => void;
  trackListCreated: () => void;
  refreshData: () => Promise<void>;
  refreshChallenges: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

interface ToastState {
  visible: boolean;
  badge: Badge | null;
  xpGained: number;
  levelUp: boolean;
  newLevel?: number;
  challengeCompleted?: ChallengeCompletionResult;
  freezeUsed?: boolean;
}

interface GamificationProviderProps {
  children: ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const { user, isLocalMode } = useAuth();
  const { isPremium } = useSubscription();
  const [gamificationData, setGamificationData] = useState<UserGamification | null>(null);
  const [challengesState, setChallengesState] = useState<WeeklyChallengesState | null>(null);
  const [toastQueue, setToastQueue] = useState<ToastState[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastState>({
    visible: false,
    badge: null,
    xpGained: 0,
    levelUp: false,
  });
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Enregistre (ou efface) l'userId pour les pushes fire-and-forget
    // déclenchés depuis saveGamificationData / saveChallengesState.
    setCurrentSyncUserId(user?.id ?? null);

    // Charger les donnees et tracker la visite quotidienne
    const init = async () => {
      // Si connecté : pull cloud + merge avec local AVANT toute lecture/écriture locale,
      // pour que les états affichés et les visites quotidiennes partent du merged.
      if (user?.id) {
        await Promise.all([
          syncGamificationOnLogin(user.id),
          syncChallengesOnLogin(user.id),
        ]);
      }

      const data = await getGamificationData();
      setGamificationData(data);

      const { state: challengeState, autoCompleted } = await getOrInitChallenges();
      setChallengesState(challengeState);
      if (autoCompleted.length > 0) {
        handleChallengeCompletions(autoCompleted);
      }

      if (user || isLocalMode) {
        const result = await onDailyVisit(isPremium);
        handleResult(result);

        const updatedData = await getGamificationData();
        if (updatedData.streaks.currentDaily === 3) {
          maybeRequestReview(updatedData.stats.daysActive);
        }

        if (result.newBadges.length > 0) {
          maybeRequestReview(updatedData.stats.daysActive);
        }

        const completedChallenges = await trackChallengeProgress({ type: 'app_opened' });
        handleChallengeCompletions(completedChallenges);
        const { state: refreshed } = await getOrInitChallenges();
        setChallengesState(refreshed);
      }
    };

    if (user || isLocalMode) {
      init();
    }
  }, [user, isLocalMode, isPremium]);

  // Gerer la file d'attente des toasts
  useEffect(() => {
    if (!currentToast.visible && toastQueue.length > 0) {
      const [next, ...rest] = toastQueue;
      setCurrentToast({ ...next, visible: true });
      setToastQueue(rest);
    }
  }, [currentToast.visible, toastQueue]);

  const handleResult = async (result: GamificationResult) => {
    const data = await getGamificationData();
    setGamificationData(data);

    const newToasts: ToastState[] = [];

    if (result.freezeUsed) {
      newToasts.push({
        visible: false,
        badge: null,
        xpGained: 0,
        levelUp: false,
        freezeUsed: true,
      });
    }

    for (const badge of result.newBadges) {
      newToasts.push({
        visible: false,
        badge,
        xpGained: badge.xpReward,
        levelUp: false,
      });
    }

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

  const handleChallengeCompletions = async (completions: ChallengeCompletionResult[]) => {
    for (const c of completions) {
      const result = await grantChallengeXp(c.xpReward);
      const newToast: ToastState = {
        visible: false,
        badge: null,
        xpGained: c.xpReward,
        levelUp: result.levelUp,
        challengeCompleted: c,
      };
      setToastQueue(prev => [...prev, newToast]);

      if (result.levelUp) {
        const data = await getGamificationData();
        setGamificationData(data);
      }
    }

    if (completions.length > 0) {
      const data = await getGamificationData();
      setGamificationData(data);

      const { state: cState } = await getOrInitChallenges();
      const allCompleted = cState.challenges.length === 3 &&
        cState.challenges.every(c => c.completed);
      if (allCompleted) {
        setShowConfetti(true);
      }
    }
  };

  const hideToast = () => {
    setCurrentToast(prev => ({ ...prev, visible: false }));
  };

  const trackFoodAdded = (listId?: string) => {
    InteractionManager.runAfterInteractions(async () => {
      const result = await onFoodAdded();
      handleResult(result);

      const data = await getGamificationData();
      if (data.stats.totalFoodsAdded === 5 || result.newBadges.length > 0) {
        maybeRequestReview(data.stats.daysActive);
      }

      const completions = await trackChallengeProgress({ type: 'food_added', listId });
      handleChallengeCompletions(completions);
      setChallengesState((await getOrInitChallenges()).state);
    });
  };

  const trackFoodConsumed = (wasBeforeExpiration: boolean) => {
    InteractionManager.runAfterInteractions(async () => {
      const result = await onFoodConsumed(wasBeforeExpiration);
      handleResult(result);

      if (wasBeforeExpiration || result.newBadges.length > 0) {
        const data = await getGamificationData();
        maybeRequestReview(data.stats.daysActive);
      }

      const completions = await trackChallengeProgress({
        type: 'food_consumed',
        beforeExpiration: wasBeforeExpiration,
      });
      handleChallengeCompletions(completions);
      setChallengesState((await getOrInitChallenges()).state);
    });
  };

  const trackFoodThrown = () => {
    InteractionManager.runAfterInteractions(async () => {
      const result = await onFoodThrown();
      handleResult(result);

      const completions = await trackChallengeProgress({ type: 'food_thrown' });
      handleChallengeCompletions(completions);
      setChallengesState((await getOrInitChallenges()).state);
    });
  };

  const trackRecipeViewed = () => {
    InteractionManager.runAfterInteractions(async () => {
      const result = await onRecipeViewed();
      handleResult(result);

      const completions = await trackChallengeProgress({ type: 'recipe_viewed' });
      handleChallengeCompletions(completions);
      setChallengesState((await getOrInitChallenges()).state);
    });
  };

  const trackListCreated = () => {
    InteractionManager.runAfterInteractions(async () => {
      const result = await onListCreated();
      handleResult(result);

      const completions = await trackChallengeProgress({ type: 'list_created' });
      handleChallengeCompletions(completions);
      setChallengesState((await getOrInitChallenges()).state);
    });
  };

  const refreshData = async () => {
    const data = await getGamificationData();
    setGamificationData(data);
  };

  const refreshChallenges = async () => {
    const { state, autoCompleted } = await getOrInitChallenges();
    setChallengesState(state);
    if (autoCompleted.length > 0) {
      handleChallengeCompletions(autoCompleted);
    }
  };

  return (
    <GamificationContext.Provider
      value={{
        gamificationData,
        challengesState,
        trackFoodAdded,
        trackFoodConsumed,
        trackFoodThrown,
        trackRecipeViewed,
        trackListCreated,
        refreshData,
        refreshChallenges,
      }}
    >
      {children}
      <ConfettiBurst
        visible={showConfetti}
        onDone={() => setShowConfetti(false)}
      />
      <AchievementToast
        badge={currentToast.badge}
        xpGained={currentToast.xpGained}
        levelUp={currentToast.levelUp}
        newLevel={currentToast.newLevel}
        challengeCompleted={currentToast.challengeCompleted}
        freezeUsed={currentToast.freezeUsed}
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
