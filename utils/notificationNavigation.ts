import { RootStackParamList } from '../types/navigation';

export interface NotificationDestination {
  screen: keyof RootStackParamList;
  params?: RootStackParamList[keyof RootStackParamList];
}

/**
 * Maps notification data payload to a navigation destination (screen + optional params).
 * Expiration notifications deep-link to Recipes with the ingredient name.
 */
export function getScreenFromNotificationData(
  data: Record<string, unknown> | null | undefined
): NotificationDestination {
  if (!data) return { screen: 'Home' };

  const type = data.type as string | undefined;
  const foodName = data.foodName as string | undefined;

  switch (type) {
    case 'expiration_today':
    case 'expiration_urgent':
    case 'expiration_warning':
      return {
        screen: 'Recipes',
        params: foodName ? { ingredient: foodName } : undefined,
      };
    case 'daily_recipe':
      return {
        screen: 'Recipes',
        params: foodName ? { ingredient: foodName } : undefined,
      };
    case 'daily_reminder':
    case 'daily_summary':
      return { screen: 'ExpiringSoon' };
    case 'weekly_recap':
      return { screen: 'Home', params: { showWeeklyRecap: true } };
    case 're_engagement':
    default:
      return { screen: 'Home' };
  }
}
