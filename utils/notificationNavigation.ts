import { RootStackParamList } from '../types/navigation';

// Only routes that require no params can be navigated to from a notification tap.
// ExpiringSoon and Home both have `undefined` params in RootStackParamList.
export type NotificationDestination = keyof Pick<RootStackParamList, 'ExpiringSoon' | 'Home'>;

/**
 * Maps notification data payload to a navigation screen name.
 * Return type is constrained to routes with no required params.
 */
export function getScreenFromNotificationData(
  data: Record<string, unknown> | null | undefined
): NotificationDestination {
  if (!data) return 'Home';
  const type = data.type as string | undefined;
  switch (type) {
    case 'expiration_today':
    case 'daily_reminder':
    case 'expiration_warning':
      return 'ExpiringSoon';
    default:
      return 'Home';
  }
}
