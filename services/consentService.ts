import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import logger from '../utils/logger';

const CONSENT_STORAGE_KEY = '@zerogaspy_consent_status';
const isExpoGo = Constants.appOwnership === 'expo';

export type ConsentStatus = 'UNKNOWN' | 'REQUIRED' | 'NOT_REQUIRED' | 'OBTAINED';

export interface ConsentState {
  umpStatus: ConsentStatus;
  attStatus: 'not_requested' | 'denied' | 'granted';
  canShowPersonalizedAds: boolean;
  lastUpdated: number;
}

/**
 * Get current ATT tracking status (iOS only)
 */
export async function getATTStatus(): Promise<'not_requested' | 'denied' | 'granted'> {
  if (Platform.OS !== 'ios' || isExpoGo) {
    return 'granted'; // Android doesn't have ATT, Expo Go can't use it
  }

  try {
    const TrackingTransparency = require('expo-tracking-transparency');
    const { status } = await TrackingTransparency.getTrackingPermissionsAsync();

    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'not_requested';
    }
  } catch (error) {
    logger.error('Erreur recuperation statut ATT:', error);
    return 'not_requested';
  }
}

/**
 * Request ATT permission (iOS only)
 * MUST be called before UMP initialization
 */
export async function requestATTPermission(): Promise<'denied' | 'granted'> {
  if (Platform.OS !== 'ios' || isExpoGo) {
    return 'granted';
  }

  try {
    const TrackingTransparency = require('expo-tracking-transparency');
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();

    const result = status === 'granted' ? 'granted' : 'denied';
    logger.info(`Permission ATT: ${result}`);

    return result;
  } catch (error) {
    logger.error('Erreur demande permission ATT:', error);
    return 'denied';
  }
}

/**
 * Initialize UMP consent flow
 * Must be called AFTER ATT on iOS
 */
export async function initializeUMPConsent(): Promise<ConsentStatus> {
  if (isExpoGo) {
    logger.info('Expo Go - UMP consent skip');
    return 'NOT_REQUIRED';
  }

  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { AdsConsent, AdsConsentStatus } = adsModule;

    // Request consent info update (checks user location)
    const consentInfo = await AdsConsent.requestInfoUpdate();
    logger.info('UMP info update:', consentInfo);

    // Get current status
    const status = await AdsConsent.getStatus();
    logger.info(`UMP Consent Status: ${status}`);

    return mapConsentStatus(status);
  } catch (error) {
    logger.error('Erreur initialisation UMP:', error);
    return 'UNKNOWN';
  }
}

/**
 * Show UMP consent form if required
 */
export async function showUMPConsentFormIfNeeded(): Promise<boolean> {
  if (isExpoGo) {
    return false;
  }

  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { AdsConsent, AdsConsentStatus } = adsModule;

    const status = await AdsConsent.getStatus();

    // Show form only if consent is required but not yet obtained
    if (status === AdsConsentStatus.REQUIRED) {
      const formAvailable = await AdsConsent.getFormStatus();

      if (formAvailable === 'AVAILABLE') {
        await AdsConsent.showForm();
        logger.info('Formulaire UMP affiche');
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('Erreur affichage formulaire UMP:', error);
    return false;
  }
}

/**
 * Load and show UMP consent form
 */
export async function loadAndShowConsentFormIfRequired(): Promise<void> {
  if (isExpoGo) {
    return;
  }

  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { AdsConsent } = adsModule;

    // This will load and show form if required based on user's location
    await AdsConsent.loadAndShowConsentFormIfRequired();
    logger.info('UMP consent form loaded and shown if required');
  } catch (error) {
    logger.error('Erreur load/show UMP form:', error);
  }
}

/**
 * Check if user can see personalized ads
 */
export async function canShowPersonalizedAds(): Promise<boolean> {
  if (isExpoGo) {
    return false;
  }

  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { AdsConsent } = adsModule;

    const canShow = await AdsConsent.canRequestAds();
    logger.info(`Peut afficher des pubs personnalisees: ${canShow}`);

    return canShow;
  } catch (error) {
    logger.error('Erreur verification pubs personnalisees:', error);
    return false;
  }
}

/**
 * Get full consent state for ad configuration
 */
export async function getConsentState(): Promise<ConsentState> {
  const attStatus = await getATTStatus();

  if (isExpoGo) {
    return {
      umpStatus: 'NOT_REQUIRED',
      attStatus,
      canShowPersonalizedAds: false,
      lastUpdated: Date.now(),
    };
  }

  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { AdsConsent } = adsModule;

    const status = await AdsConsent.getStatus();
    const canPersonalize = await AdsConsent.canRequestAds();

    const state: ConsentState = {
      umpStatus: mapConsentStatus(status),
      attStatus,
      canShowPersonalizedAds: canPersonalize && attStatus === 'granted',
      lastUpdated: Date.now(),
    };

    // Store for offline access
    await storeConsentState(state);

    return state;
  } catch (error) {
    logger.error('Erreur recuperation etat consentement:', error);

    // Try to get stored state
    const stored = await getStoredConsentState();
    if (stored) return stored;

    return {
      umpStatus: 'UNKNOWN',
      attStatus,
      canShowPersonalizedAds: false,
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Reset all consent (for testing or user request)
 */
export async function resetConsent(): Promise<void> {
  if (isExpoGo) {
    await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);
    return;
  }

  try {
    const adsModule = require('react-native-google-mobile-ads');
    const { AdsConsent } = adsModule;

    await AdsConsent.reset();
    await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);

    logger.info('Consentement reinitialise');
  } catch (error) {
    logger.error('Erreur reinitialisation consentement:', error);
  }
}

/**
 * Store consent state locally
 */
async function storeConsentState(state: ConsentState): Promise<void> {
  try {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Erreur stockage etat consentement:', error);
  }
}

/**
 * Get stored consent state
 */
export async function getStoredConsentState(): Promise<ConsentState | null> {
  try {
    const stored = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    logger.error('Erreur recuperation consentement stocke:', error);
    return null;
  }
}

/**
 * Helper: Map Google consent status to our enum
 */
function mapConsentStatus(status: string): ConsentStatus {
  const statusStr = String(status).toUpperCase();
  if (statusStr.includes('REQUIRED')) return 'REQUIRED';
  if (statusStr.includes('OBTAINED')) return 'OBTAINED';
  if (statusStr.includes('NOT_REQUIRED')) return 'NOT_REQUIRED';
  return 'UNKNOWN';
}
