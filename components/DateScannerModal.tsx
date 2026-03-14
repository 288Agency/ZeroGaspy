import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DateScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onDateScanned: (date: string) => void;
}

export default function DateScannerModal({
  visible,
  onClose,
  onDateScanned,
}: DateScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [cameraRef, setCameraRef] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      setLoading(false);
    }
  }, [visible]);

  const extractDateFromText = (text: string): string | null => {
    // Nettoyer le texte
    const cleanText = text.replace(/\s+/g, ' ').trim();

    logger.info('🔍 Texte OCR brut:', cleanText);

    // Patterns de dates couramment utilisées sur les emballages
    const patterns = [
      // Format DD/MM/YYYY ou DD/MM/YY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
      // Format YYYY-MM-DD
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
      // Format "25 DEC 2026" ou "25 DEC 26"
      /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANV|FÉV|MARS|AVR|MAI|JUIN|JUIL|AOÛT|SEPT|OCT|NOV|DÉC)\s+(\d{2,4})/i,
      // Format "DEC 25 2026"
      /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JANV|FÉV|MARS|AVR|MAI|JUIN|JUIL|AOÛT|SEPT|OCT|NOV|DÉC)\s+(\d{1,2})\s+(\d{2,4})/i,
      // Format DDMMYY ou DDMMYYYY (sans séparateur)
      /(\d{2})(\d{2})(\d{2,4})/,
    ];

    const monthMap: Record<string, string> = {
      'JAN': '01', 'JANV': '01',
      'FEB': '02', 'FÉV': '02', 'FEV': '02',
      'MAR': '03', 'MARS': '03',
      'APR': '04', 'AVR': '04',
      'MAY': '05', 'MAI': '05',
      'JUN': '06', 'JUIN': '06',
      'JUL': '07', 'JUIL': '07',
      'AUG': '08', 'AOÛT': '08', 'AOUT': '08',
      'SEP': '09', 'SEPT': '09',
      'OCT': '10',
      'NOV': '11',
      'DEC': '12', 'DÉC': '12',
    };

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        logger.info('✅ Date trouvée avec pattern:', pattern);

        let day, month, year;

        // Pattern avec mois en lettres (index 2 ou 1)
        if (match[0].match(/[A-Z]/i)) {
          const monthText = match.filter(m => m && m.match(/[A-Z]/i))[0];
          const numbers = match.filter(m => m && m.match(/^\d+$/));

          month = monthMap[monthText.toUpperCase()];

          if (numbers.length === 2) {
            // Format "25 DEC 2026" ou "DEC 25 2026"
            if (parseInt(numbers[0]) > 31) {
              // C'est probablement l'année en premier
              year = numbers[0];
              day = numbers[1];
            } else {
              day = numbers[0];
              year = numbers[1];
            }
          }
        }
        // Pattern DD/MM/YYYY ou similaire
        else if (match[1] && match[2] && match[3]) {
          // Détecter si c'est YYYY-MM-DD ou DD/MM/YYYY
          if (match[1].length === 4) {
            year = match[1];
            month = match[2];
            day = match[3];
          } else {
            day = match[1];
            month = match[2];
            year = match[3];
          }
        }

        // Normaliser l'année (2 chiffres → 4 chiffres)
        if (year && year.length === 2) {
          const currentYear = new Date().getFullYear();
          const century = Math.floor(currentYear / 100) * 100;
          year = (century + parseInt(year)).toString();
        }

        // Formater au format DD/MM/YYYY
        if (day && month && year) {
          const formattedDay = day.padStart(2, '0');
          const formattedMonth = month.padStart(2, '0');

          // Valider la date
          const dateValue = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (dateValue && dateValue.getFullYear() == parseInt(year)) {
            const finalDate = `${formattedDay}/${formattedMonth}/${year}`;
            logger.info('📅 Date formatée:', finalDate);
            return finalDate;
          }
        }
      }
    }

    return null;
  };

  const handleCapture = async () => {
    if (!cameraRef || loading) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      logger.info('📸 Capture photo pour OCR date...');

      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo || !photo.uri) {
        throw new Error('Photo capture failed');
      }

      logger.info('✅ Photo capturée:', photo.uri);

      // Redimensionner l'image pour améliorer la performance OCR
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipResult.base64) {
        throw new Error('Image manipulation failed');
      }

      logger.info('🌐 Appel Edge Function pour OCR date...');

      // Appeler l'Edge Function pour OCR
      const { data, error } = await supabase.functions.invoke('ocr-scan', {
        body: {
          imageBase64: manipResult.base64,
          preferredProvider: 'google-vision', // Google Vision est meilleur pour les dates
          scanType: 'date', // Nouveau paramètre pour indiquer qu'on veut juste une date
        },
      });

      if (error) {
        logger.error('❌ Erreur Edge Function:', error);
        throw new Error(error.message || 'Erreur OCR');
      }

      logger.info('📄 Réponse OCR:', data);

      // Extraire la date du texte OCR
      const rawText = data.rawText || '';
      const extractedDate = extractDateFromText(rawText);

      if (extractedDate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onDateScanned(extractedDate);
        onClose();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Aucune date trouvée',
          'Impossible de détecter une date sur la photo. Assurez-vous que la date est claire et lisible.',
          [{ text: 'Réessayer' }]
        );
      }
    } catch (error: any) {
      logger.error('❌ Erreur scan date:', error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Erreur',
        'Impossible de scanner la date. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!permission) {
      return (
        <View style={styles.centeredBlack}>
          <ActivityIndicator size="large" color={COLORS.secondary.sage} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary[500]} />
          <Text style={styles.permissionTitle}>
            Accès à la caméra requis
          </Text>
          <Text style={styles.permissionDesc}>
            Pour scanner la date de péremption, nous avons besoin d'accéder à votre caméra
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>
              Autoriser l'accès
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={setCameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
        />

        {/* Overlay avec zone de scan */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />

          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              {/* Coins décoratifs */}
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
          </View>

          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              Cadrez la date de péremption
            </Text>

            <TouchableOpacity
              onPress={handleCapture}
              disabled={loading}
              style={styles.captureButton}
            >
              {loading ? (
                <ActivityIndicator size="large" color={COLORS.neutral.white} />
              ) : (
                <Ionicons name="camera" size={40} color={COLORS.neutral.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton fermer */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={28} color={COLORS.neutral.white} />
        </TouchableOpacity>

        {/* Titre */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>
            Scanner la date
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {renderContent()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredBlack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.black,
  },
  loadingText: {
    color: COLORS.neutral.white,
    marginTop: SPACING.lg,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.cream,
    paddingHorizontal: SPACING['3xl'],
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    textAlign: 'center',
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.lg,
  },
  permissionDesc: {
    fontSize: 16,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
  },
  permissionButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING['3xl'],
    paddingVertical: SPACING.lg,
  },
  permissionButtonText: {
    color: COLORS.neutral.white,
    fontWeight: '600',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanAreaContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: SPACING['2xl'],
  },
  scanArea: {
    width: SCREEN_WIDTH * 0.85,
    height: 120,
    borderWidth: 2,
    borderColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.secondary.sage,
    borderTopLeftRadius: RADIUS['2xl'],
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.secondary.sage,
    borderTopRightRadius: RADIUS['2xl'],
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.secondary.sage,
    borderBottomLeftRadius: RADIUS['2xl'],
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.secondary.sage,
    borderBottomRightRadius: RADIUS['2xl'],
  },
  overlayBottom: {
    flex: 1.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
  },
  instructionText: {
    color: COLORS.neutral.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: SPACING['3xl'],
    marginBottom: SPACING['3xl'],
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.neutral.white,
  },
  closeButton: {
    position: 'absolute',
    top: 64,
    right: SPACING['2xl'],
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    color: COLORS.neutral.white,
    fontSize: 20,
    fontWeight: '700',
  },
});
