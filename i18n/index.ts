// Hermes (iOS) n'expose PAS Intl.PluralRules : i18next retombe alors sur des
// regles anglaises et rend « 0 aliments » au lieu de « 0 aliment » en francais.
// Le polyfill doit etre charge AVANT i18n.init.
if (typeof (Intl as unknown as { PluralRules?: unknown }).PluralRules === 'undefined') {
  require('@formatjs/intl-pluralrules/polyfill-force');
  require('@formatjs/intl-pluralrules/locale-data/fr');
  require('@formatjs/intl-pluralrules/locale-data/en');
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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

// L'app est francaise de bout en bout : les 104 recettes, les statistiques de
// gaspillage citees dans l'onboarding et la tarification sont en francais/euros.
// Traduire l'UI seule donnerait une coquille anglaise sur du contenu francais,
// donc on assume le francais et on n'expose plus de selecteur de langue.
// Passer reellement a l'anglais = traduire le contenu, pas seulement l'UI.
const APP_LANGUAGE = 'fr';

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
  lng: APP_LANGUAGE,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  compatibilityJSON: 'v4',
});

// Purge d'un ancien choix de langue : le selecteur a ete retire, donc un
// utilisateur qui avait bascule en anglais resterait bloque sans moyen d'en sortir.
const clearSavedLanguage = async () => {
  try {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Error clearing saved language:', error);
  }
};

clearSavedLanguage();

export default i18n;
