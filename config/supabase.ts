import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.');
}

// Adaptateur de stockage sécurisé pour Supabase
// Utilise expo-secure-store (chiffré) sur mobile, localStorage sur web
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
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
      await SecureStore.setItemAsync(key, value);
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
      await SecureStore.deleteItemAsync(key);
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

export interface ListShare {
  id: string;
  list_id: string;
  owner_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  permission: 'view' | 'edit' | 'admin';
  status: 'pending' | 'accepted' | 'declined';
  invitation_code: string;
  created_at: string;
  accepted_at: string | null;
  updated_at: string;
}
