import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  requestATTPermission,
  initializeUMPConsent,
  loadAndShowConsentFormIfRequired,
  getConsentState,
  resetConsent as resetConsentService,
  ConsentState,
  ConsentStatus,
} from '../services/consentService';
import logger from '../utils/logger';

interface ConsentContextType {
  consentState: ConsentState | null;
  isInitialized: boolean;
  isLoading: boolean;
  attStatus: 'not_requested' | 'denied' | 'granted';
  umpStatus: ConsentStatus;
  canShowPersonalizedAds: boolean;
  refreshConsent: () => Promise<void>;
  resetConsent: () => Promise<void>;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consentState, setConsentState] = useState<ConsentState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize consent on app launch
  useEffect(() => {
    initializeConsent();
  }, []);

  const initializeConsent = async () => {
    try {
      setIsLoading(true);
      logger.info('Demarrage initialisation consentement...');

      // Step 1: Request ATT permission (iOS only) - MUST be first
      logger.info('Etape 1: Demande permission ATT...');
      const attResult = await requestATTPermission();
      logger.info(`ATT result: ${attResult}`);

      // Step 2: Initialize UMP consent
      logger.info('Etape 2: Initialisation UMP...');
      await initializeUMPConsent();

      // Step 3: Load and show consent form if required (EU users)
      logger.info('Etape 3: Affichage formulaire si necessaire...');
      await loadAndShowConsentFormIfRequired();

      // Step 4: Get final consent state
      logger.info('Etape 4: Recuperation etat final...');
      const state = await getConsentState();
      setConsentState(state);

      setIsInitialized(true);
      logger.info('Initialisation consentement terminee', state);
    } catch (error) {
      logger.error('Erreur initialisation consentement:', error);
      // Still mark as initialized to not block app
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConsent = useCallback(async () => {
    try {
      setIsLoading(true);
      await initializeConsent();
    } catch (error) {
      logger.error('Erreur refresh consentement:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResetConsent = useCallback(async () => {
    try {
      setIsLoading(true);
      await resetConsentService();
      setConsentState(null);
      setIsInitialized(false);
      // Re-initialize after reset
      await initializeConsent();
    } catch (error) {
      logger.error('Erreur reset consentement:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <ConsentContext.Provider
      value={{
        consentState,
        isInitialized,
        isLoading,
        attStatus: consentState?.attStatus || 'not_requested',
        umpStatus: consentState?.umpStatus || 'UNKNOWN',
        canShowPersonalizedAds: consentState?.canShowPersonalizedAds || false,
        refreshConsent,
        resetConsent: handleResetConsent,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
}
