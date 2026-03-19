import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

const EXPO_PROJECT_ID = '67db9e46-01d4-4c41-815b-237ba7f22681';

/**
 * Register the device's Expo push token in Supabase.
 * Called at app launch when user is authenticated.
 * Upserts on token to handle token refresh gracefully.
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) {
      logger.info('Push tokens only work on physical devices');
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });

    const token = tokenData;
    if (!token) return;

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS as 'ios' | 'android',
          device_name: Device.deviceName || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

    if (error) {
      logger.error('Error registering push token:', error.message);
    } else {
      logger.info('Push token registered successfully');
    }
  } catch (error: any) {
    logger.error('Error in registerPushToken:', error.message);
  }
}

/**
 * Deactivate all push tokens for a user (called at sign-out).
 */
export async function deactivatePushTokens(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deactivating push tokens:', error.message);
    }
  } catch (error: any) {
    logger.error('Error in deactivatePushTokens:', error.message);
  }
}

/**
 * Update profiles.last_opened_at to track user activity (for re-engagement notifications).
 */
export async function updateLastOpenedAt(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      logger.error('Error updating last_opened_at:', error.message);
    }
  } catch (error: any) {
    logger.error('Error in updateLastOpenedAt:', error.message);
  }
}
