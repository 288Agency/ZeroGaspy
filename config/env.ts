/**
 * Configuration des variables d'environnement
 *
 * Ce fichier fournit un fallback pour les variables d'environnement
 * dans les builds EAS où Constants.expoConfig.extra peut échouer
 */

import Constants from 'expo-constants';

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  feedbackEmail: string;
  // Note: mindeeApiKey et googleVisionApiKey sont maintenant côté serveur (Edge Function)
}

/**
 * Charge les variables d'environnement avec fallback
 */
function loadEnvConfig(): EnvConfig {
  // Essayer d'abord depuis Constants.expoConfig.extra
  const extra = Constants.expoConfig?.extra;

  const config: EnvConfig = {
    supabaseUrl: extra?.supabaseUrl || '',
    supabaseAnonKey: extra?.supabaseAnonKey || '',
    feedbackEmail: extra?.feedbackEmail || 'contact@288agency.com',
  };

  // Si les variables critiques manquent, essayer process.env (dev only)
  if (!config.supabaseUrl && typeof process !== 'undefined' && process.env) {
    config.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  }
  if (!config.supabaseAnonKey && typeof process !== 'undefined' && process.env) {
    config.supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  }

  return config;
}

// Exporter la configuration chargée
export const ENV = loadEnvConfig();

// Validation : logger les erreurs si des variables critiques manquent
if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
  console.error('❌ [ENV] Variables Supabase manquantes !');
  console.error('   supabaseUrl:', ENV.supabaseUrl ? 'SET' : 'MISSING');
  console.error('   supabaseAnonKey:', ENV.supabaseAnonKey ? 'SET' : 'MISSING');
  console.error('');
  console.error('💡 Solutions possibles:');
  console.error('   1. Vérifiez que eas.json contient les variables dans env');
  console.error('   2. Rebuilder avec: eas build --profile production --platform ios');
  console.error('   3. Vérifiez les logs de build EAS pour voir si les vars sont injectées');
}

export default ENV;
