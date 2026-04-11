// Define global __DEV__ for React Native
global.__DEV__ = true;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Expo modules
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationPriority: { HIGH: 1 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', DAILY: 'daily' },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('react-native-url-polyfill/auto', () => {});
jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
  expoConfig: { extra: {} },
  appOwnership: null,
}));

// Global mock for localStorage — prevents loading supabase/widget chains
// Individual tests can override with jest.mock('../../utils/localStorage', factory)
jest.mock('./utils/localStorage', () => ({
  loadLists: jest.fn(() => Promise.resolve([])),
  saveLists: jest.fn(() => Promise.resolve()),
  saveList: jest.fn(() => Promise.resolve()),
  deleteList: jest.fn(() => Promise.resolve()),
  addFoodItem: jest.fn(() => Promise.resolve()),
  updateFoodItem: jest.fn(() => Promise.resolve()),
  deleteFoodItem: jest.fn(() => Promise.resolve()),
  markFoodAsConsumed: jest.fn(() => Promise.resolve()),
  markFoodAsThrown: jest.fn(() => Promise.resolve()),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn(() => Promise.resolve({ data: { user: null } })) },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null })),
      single: jest.fn(() => Promise.resolve({ data: null })),
    })),
    functions: { invoke: jest.fn(() => Promise.resolve({ data: null, error: null })) },
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

// Désactiver les logs en mode test
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
