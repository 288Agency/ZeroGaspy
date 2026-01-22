import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import logger from '../utils/logger';

/**
 * Hook pour gérer les deep links d'invitation
 * Détecte les liens du type zerogaspy://join/CODE
 */
export function useInvitationDeepLink() {
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const url = Linking.useURL();

  useEffect(() => {
    // Vérifier l'URL initiale au démarrage
    Linking.getInitialURL().then((initialUrl: string | null) => {
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    });
  }, []);

  useEffect(() => {
    if (url) {
      handleDeepLink(url);
    }
  }, [url]);

  const handleDeepLink = (linkUrl: string) => {
    try {
      const parsed = Linking.parse(linkUrl);

      // Vérifier si c'est un lien d'invitation
      // Format attendu: zerogaspy://join/CODE
      if (parsed.path === 'join' && parsed.hostname) {
        const code = parsed.hostname;
        logger.info('Code d\'invitation reçu:', code);
        setInvitationCode(code);
      } else if (parsed.hostname === 'join' && parsed.path) {
        // Alternative: zerogaspy://join/CODE où CODE est dans le path
        const code = parsed.path.replace('/', '');
        logger.info('Code d\'invitation reçu:', code);
        setInvitationCode(code);
      }
    } catch (error) {
      logger.error('Erreur parsing deep link:', error);
    }
  };

  const clearInvitationCode = () => {
    setInvitationCode(null);
  };

  return {
    invitationCode,
    clearInvitationCode,
  };
}
