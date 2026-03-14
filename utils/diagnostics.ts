/**
 * Utilitaires de diagnostic pour vérifier la configuration de l'app
 */

import Constants from 'expo-constants';
import { supabase } from '../config/supabase';
import logger from './logger';

/**
 * Affiche les diagnostics de configuration au démarrage
 */
export function logConfigDiagnostics() {
  logger.info('=== DIAGNOSTICS CONFIGURATION ===');

  // Vérifier les variables d'environnement
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

  logger.info('📦 Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ MANQUANT');
  logger.info('🔑 Supabase Anon Key:', supabaseAnonKey ? '✅ Configuré' : '❌ MANQUANT');
  // Note: Les clés OCR (Mindee/Google Vision) sont côté serveur via Edge Function

  // Vérifier la connexion Supabase
  if (!supabaseUrl || !supabaseAnonKey) {
    logger.error('❌ ERREUR CRITIQUE: Les clés Supabase ne sont pas configurées !');
    logger.error('💡 Solution:');
    logger.error('   1. Vérifiez que votre fichier .env existe et contient les clés');
    logger.error('   2. Redémarrez Expo avec: npx expo start --clear');
    logger.error('   3. Si le problème persiste, vérifiez que les clés dans .env commencent par EXPO_PUBLIC_');
  } else {
    logger.info('✅ Configuration Supabase OK');
  }

  logger.info('=================================');
}

/**
 * Teste la connexion à Supabase
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    logger.info('🔍 Test de connexion Supabase...');

    // Essayer de récupérer la session (retourne null si pas connecté, mais ne devrait pas throw)
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      logger.error('❌ Erreur connexion Supabase:', error.message);
      return false;
    }

    logger.info('✅ Connexion Supabase OK');
    return true;
  } catch (error: any) {
    logger.error('❌ Erreur test Supabase:', error.message);
    return false;
  }
}

/**
 * Affiche un diagnostic complet au démarrage de l'app
 */
export async function runStartupDiagnostics() {
  logConfigDiagnostics();
  await testSupabaseConnection();
}
