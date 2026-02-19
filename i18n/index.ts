import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from './locales/fr.json';
import en from './locales/en.json';

const LANGUAGE_KEY = '@zerogaspy_language';

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
};

export const supportedLanguages = [
  { code: 'fr', name: 'Francais', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

// Detecter la langue du systeme
const getDeviceLanguage = (): string => {
  const locale = Localization.getLocales()[0]?.languageCode || 'fr';
  // Retourner 'fr' ou 'en', par defaut 'fr' si la langue n'est pas supportee
  return ['fr', 'en'].includes(locale) ? locale : 'fr';
};

// Sauvegarder la langue choisie
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Changer la langue
export const changeLanguage = async (language: string): Promise<void> => {
  await i18n.changeLanguage(language);
  await saveLanguage(language);
};

// Initialiser i18n de maniere synchrone avec la langue du systeme
i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  compatibilityJSON: 'v4',
});

// Charger la langue sauvegardee de maniere asynchrone et mettre a jour si differente
const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && ['fr', 'en'].includes(savedLanguage) && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
};

// Charger la langue sauvegardee au demarrage
loadSavedLanguage();

export default i18n;
