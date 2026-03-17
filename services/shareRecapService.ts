import { RefObject } from 'react';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot from 'react-native-view-shot';
import logger from '../utils/logger';
import { trackShareRecap } from './analytics';

/**
 * Capture le composant ShareRecapCard et ouvre le Share sheet natif
 */
export async function shareRecapImage(viewShotRef: RefObject<ViewShot | null>): Promise<void> {
  try {
    if (!viewShotRef.current?.capture) {
      throw new Error('ViewShot ref not ready');
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Le partage n\'est pas disponible sur cet appareil');
    }

    // Capture le composant en PNG
    const uri = await viewShotRef.current.capture();

    // Copie dans un fichier temporaire avec un nom propre
    const fileName = `ZeroGaspy_Recap_${Date.now()}.png`;
    const destUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.copyAsync({ from: uri, to: destUri });

    // Partage via le share sheet natif
    await Sharing.shareAsync(destUri, {
      mimeType: 'image/png',
      dialogTitle: 'Partager mon récap ZeroGaspy',
      UTI: 'public.png',
    });

    trackShareRecap();
    logger.info('Recap image shared successfully');
  } catch (error: any) {
    logger.error('Error sharing recap image:', error.message);
    throw error;
  }
}
