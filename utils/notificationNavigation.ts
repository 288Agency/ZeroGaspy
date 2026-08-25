import { RootStackParamList } from '../types/navigation';

export interface NotificationDestination {
  screen: keyof RootStackParamList;
  params?: RootStackParamList[keyof RootStackParamList];
}

/**
 * Maps notification data payload to a navigation destination (screen + optional params).
 *
 * Priorité adoption :
 *   · expiration avec ids → ProductDetail (action consommer/jeter)
 *   · daily_recipe (dîner) → CookTonight (idée du soir)
 *   · rappels / réengagement → ExpiringSoon (liste urgente)
 */
export function getScreenFromNotificationData(
  data: Record<string, unknown> | null | undefined
): NotificationDestination {
  if (!data) return { screen: 'Home' };

  const type = data.type as string | undefined;
  const foodName = typeof data.foodName === 'string' ? data.foodName : undefined;
  const itemId = typeof data.itemId === 'string' ? data.itemId : undefined;
  const listId = typeof data.listId === 'string' ? data.listId : undefined;

  switch (type) {
    case 'expiration_today':
    case 'expiration_urgent':
    case 'expiration_warning':
      if (itemId && listId) {
        return { screen: 'ProductDetail', params: { itemId, listId } };
      }
      return { screen: 'ExpiringSoon' };

    case 'daily_recipe':
      return { screen: 'CookTonight' };

    case 'daily_reminder':
    case 'daily_summary':
    case 're_engagement':
      return { screen: 'ExpiringSoon' };

    case 'weekly_recap':
      return { screen: 'Home', params: { showWeeklyRecap: true } };

    default:
      // Legacy : certaines anciennes notifs pointaient Recipes avec foodName
      if (foodName) {
        return { screen: 'Recipes', params: { ingredient: foodName } };
      }
      return { screen: 'Home' };
  }
}
