import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ENV } from './env';

// Récupérer les credentials depuis le système de configuration centralisé
const supabaseUrl = ENV.supabaseUrl;
const supabaseAnonKey = ENV.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials not configured!');
  console.error('supabaseUrl:', supabaseUrl);
  console.error('supabaseAnonKey:', supabaseAnonKey ? '***' : 'missing');
}

// SecureStore has a 2048 byte limit - use AsyncStorage for larger values
const SECURE_STORE_LIMIT = 2048;

// Adaptateur de stockage sécurisé pour Supabase
// Utilise expo-secure-store (chiffré) sur mobile quand possible, sinon AsyncStorage
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      // Try SecureStore first, fallback to AsyncStorage for large values
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue !== null) {
        return secureValue;
      }
      // Check AsyncStorage for large values
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      // Use SecureStore for small values, AsyncStorage for large ones
      if (value.length <= SECURE_STORE_LIMIT) {
        // Remove from AsyncStorage if it was previously stored there
        await AsyncStorage.removeItem(key);
        await SecureStore.setItemAsync(key, value);
      } else {
        // Remove from SecureStore if it was previously stored there
        await SecureStore.deleteItemAsync(key);
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      // Remove from both storages
      await SecureStore.deleteItemAsync(key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types pour les tables Supabase
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  notification_enabled: boolean;
  current_streak: number;
  longest_streak: number;
}

export interface CloudList {
  id: string;
  user_id: string;
  title: string;
  color: string;
  icon: string | null;
  local_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface CloudFoodItem {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
  expiration_date: string;
  quantity: number;
  weight: number | null;
  category: string | null;
  image_uri: string | null;
  price: number | null;
  status: 'active' | 'consumed' | 'thrown';
  is_opened: boolean;
  opened_date: string | null;
  days_after_opening: number | null;
  local_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}
