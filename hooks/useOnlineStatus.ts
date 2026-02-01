import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface OnlineStatus {
  isOnline: boolean;
  isConnected: boolean | null;
  connectionType: string | null;
  isInternetReachable: boolean | null;
}

/**
 * Hook pour détecter le statut de connexion réseau
 */
export function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: true,
    isConnected: null,
    connectionType: null,
    isInternetReachable: null,
  });

  useEffect(() => {
    // Obtenir l'état initial
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isOnline: state.isConnected === true && state.isInternetReachable !== false,
        isConnected: state.isConnected,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });

    // S'abonner aux changements
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isOnline: state.isConnected === true && state.isInternetReachable !== false,
        isConnected: state.isConnected,
        connectionType: state.type,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}

/**
 * Hook simplifié qui retourne juste un boolean
 */
export function useIsOnline(): boolean {
  const { isOnline } = useOnlineStatus();
  return isOnline;
}

/**
 * Hook pour exécuter du code quand la connexion revient
 */
export function useOnReconnect(callback: () => void): void {
  const { isOnline } = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // On vient de se reconnecter
      callback();
      setWasOffline(false);
    }
  }, [isOnline, wasOffline, callback]);
}

export default useOnlineStatus;
