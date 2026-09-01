import * as Haptics from 'expo-haptics';
import type { ToastConfig } from '@/components/ds/Toast';
import type { BrandIconName } from '@/tokens/brandIcons';

type ShowToast = (config: ToastConfig) => void;

let showToast: ShowToast | null = null;

/** Branché par ToastProvider au montage — permet le feedback hors React tree. */
export function registerActionToast(show: ShowToast): void {
  showToast = show;
}

export function unregisterActionToast(): void {
  showToast = null;
}

function toast(config: ToastConfig): void {
  showToast?.(config);
}

export function feedbackFoodAdded(name?: string): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  toast({
    message: name ? `${name} ajouté au frigo` : 'Aliment ajouté',
    tone: 'success',
    duration: 2500,
  });
}

export function feedbackFoodConsumed(name?: string, beforeExpiration = true): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  toast({
    message: beforeExpiration
      ? (name ? `${name} sauvé du gaspi` : 'Bien joué, sauvé du gaspi')
      : (name ? `${name} consommé` : 'Marqué comme consommé'),
    tone: 'success',
    icon: 'checkCircle',
    duration: 2500,
  });
}

export function feedbackFoodThrown(name?: string): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  toast({
    message: name ? `${name} retiré du frigo` : 'Aliment jeté',
    tone: 'warning',
    icon: 'trash',
    duration: 2500,
  });
}

export function feedbackRecipeCooked(count: number): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  toast({
    message:
      count > 1
        ? `${count} ingrédients utilisés — bon appétit !`
        : 'Ingrédient utilisé — bon appétit !',
    tone: 'success',
    icon: 'flame',
    duration: 3000,
  });
}
