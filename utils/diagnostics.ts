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
  const googleVisionKey = Constants.expoConfig?.extra?.googleVisionApiKey;
  const mindeeKey = Constants.expoConfig?.extra?.mindeeApiKey;

  logger.info('📦 Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ MANQUANT');
  logger.info('🔑 Supabase Anon Key:', supabaseAnonKey ? '✅ Configuré' : '❌ MANQUANT');
  logger.info('👁️ Google Vision Key:', googleVisionKey ? '✅ Configuré' : '❌ MANQUANT');
  logger.info('🧠 Mindee Key:', mindeeKey ? '✅ Configuré' : '❌ MANQUANT');

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
 * Teste la connexion à Mindee
 */
export async function testMindeeConnection(): Promise<boolean> {
  try {
    const mindeeKey = Constants.expoConfig?.extra?.mindeeApiKey;

    if (!mindeeKey) {
      logger.warn('⚠️ Clé API Mindee non configurée');
      return false;
    }

    logger.info('🔍 Test de connexion Mindee...');
    logger.info('🔑 Clé Mindee:', mindeeKey.substring(0, 15) + '...');

    // Test simple de connexion
    const response = await fetch('https://api.mindee.com', {
      method: 'GET',
    });

    if (response.ok || response.status === 404) {
      logger.info('✅ Connexion Mindee OK');
      return true;
    } else {
      logger.error('❌ Erreur connexion Mindee:', response.status);
      return false;
    }
  } catch (error: any) {
    logger.error('❌ Erreur test Mindee:', error.message);
    return false;
  }
}

/**
 * Affiche un diagnostic complet au démarrage de l'app
 */
export async function runStartupDiagnostics() {
  logConfigDiagnostics();
  await testSupabaseConnection();
  await testMindeeConnection();
}
