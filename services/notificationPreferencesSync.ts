import * as Localization from 'expo-localization';
import { supabase } from '../config/supabase';
import { loadNotificationSettings, NotificationSettings } from './notificationService';
import logger from '../utils/logger';

/**
 * Sync local notification settings to the cloud notification_preferences table.
 * Called whenever the user changes a notification setting.
 */
export async function syncNotificationPrefsToCloud(
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          enabled: settings.enabled,
          daily_reminder: settings.dailyReminder,
          daily_reminder_time: settings.dailyReminderTime,
          days_before_expiration: settings.daysBeforeExpiration,
          weekly_recap_enabled: true,
          timezone: Localization.getCalendars()[0]?.timeZone || 'Europe/Paris',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      logger.error('Error syncing notification prefs to cloud:', error.message);
    }
  } catch (error: any) {
    logger.error('Error in syncNotificationPrefsToCloud:', error.message);
  }
}

/**
 * Initialize cloud notification preferences on first login.
 * Reads local settings and pushes them to Supabase.
 */
export async function initCloudNotificationPrefs(userId: string): Promise<void> {
  try {
    const localSettings = await loadNotificationSettings();
    await syncNotificationPrefsToCloud(userId, localSettings);
  } catch (error: any) {
    logger.error('Error in initCloudNotificationPrefs:', error.message);
  }
}

/**
 * Pull notification preferences from the cloud (e.g., restoring on a new device).
 */
export async function pullNotificationPrefsFromCloud(
  userId: string
): Promise<NotificationSettings | null> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('enabled, daily_reminder, daily_reminder_time, days_before_expiration')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      enabled: data.enabled,
      dailyReminder: data.daily_reminder,
      dailyReminderTime: data.daily_reminder_time,
      daysBeforeExpiration: data.days_before_expiration,
    };
  } catch (error: any) {
    logger.error('Error in pullNotificationPrefsFromCloud:', error.message);
    return null;
  }
}
