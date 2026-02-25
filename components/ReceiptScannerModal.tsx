import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { scanReceipt, ReceiptScanResult } from '../services/receiptScannerService'; // Google Vision (fallback)
import { scanReceiptWithMindee } from '../services/mindeeReceiptService'; // Mindee (prioritaire)
import { COLORS, SHADOWS, RADIUS } from '../utils/designSystem';
import { ENV } from '../config/env';
import logger from '../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReceiptScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete: (result: ReceiptScanResult) => void;
}

type ScanState = 'camera' | 'preview' | 'processing';

export default function ReceiptScannerModal({
  visible,
  onClose,
  onScanComplete,
}: ReceiptScannerModalProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const resetState = () => {
    setScanState('camera');
    setCapturedImage(null);
    setProcessingMessage(t('receiptScanner.processing'));
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        setScanState('preview');
      }
    } catch (error) {
      logger.error('Erreur prise de photo:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('receiptScanner.photoError'));
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired'),
          t('feedback.permissionText')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setScanState('preview');
      }
    } catch (error) {
      logger.error('Erreur selection image:', error);
      Alert.alert(t('common.error'), t('receiptScanner.imageSelectError'));
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];

        // Verifier le type de fichier
        const isImage = file.mimeType?.startsWith('image/') ||
                        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name || '');

        if (!isImage) {
          Alert.alert(
            t('receiptScanner.formatNotSupported'),
            t('receiptScanner.pdfNotSupported'),
            [{ text: t('common.ok') }]
          );
          return;
        }

        setCapturedImage(file.uri);
        setScanState('preview');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      logger.error('Erreur selection fichier:', error);
      Alert.alert(t('common.error'), t('receiptScanner.fileSelectError'));
    }
  };

  const processReceipt = async () => {
    if (!capturedImage) return;

    setScanState('processing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setProcessingMessage(t('receiptScanner.reading'));
      await new Promise(resolve => setTimeout(resolve, 500));

      let result: ReceiptScanResult;

      // Stratégie : Mindee en priorité, fallback sur Google Vision
      const hasMindeeKey = ENV.mindeeApiKey && ENV.mindeeApiKey.length > 10;
      const hasGoogleVisionKey = ENV.googleVisionApiKey && ENV.googleVisionApiKey.length > 10;

      if (hasMindeeKey) {
        // Tenter Mindee d'abord (meilleure précision)
        logger.info('🧠 Tentative avec Mindee Receipt OCR...');
        setProcessingMessage('Analyse avec Mindee...');
        result = await scanReceiptWithMindee(capturedImage);

        // Si Mindee échoue, fallback sur Google Vision
        if (!result.success && hasGoogleVisionKey) {
          logger.warn('⚠️ Mindee a échoué, fallback sur Google Vision');
          setProcessingMessage(t('receiptScanner.extractingText'));
          result = await scanReceipt(capturedImage, ENV.googleVisionApiKey);
        }
      } else if (hasGoogleVisionKey) {
        // Pas de clé Mindee, utiliser Google Vision directement
        logger.info('👁️ Utilisation de Google Vision (Mindee non configuré)');
        setProcessingMessage(t('receiptScanner.extractingText'));
        result = await scanReceipt(capturedImage, ENV.googleVisionApiKey);
      } else {
        // Aucune clé API configurée
        Alert.alert(
          t('receiptScanner.configRequired'),
          'Aucune clé API (Mindee ou Google Vision) configurée. Vérifiez votre .env'
        );
        setScanState('preview');
        return;
      }

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (result.items.length === 0) {
          Alert.alert(
            t('receiptScanner.noProductDetected'),
            result.error || t('receiptScanner.readError'),
            [
              { text: t('common.retry'), onPress: () => setScanState('camera') },
              { text: t('common.cancel'), onPress: handleClose },
            ]
          );
        } else {
          onScanComplete(result);
          handleClose();
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          t('receiptScanner.scanError'),
          result.error || t('receiptScanner.analyzeError'),
          [
            { text: t('common.retry'), onPress: () => setScanState('camera') },
            { text: t('common.cancel'), onPress: handleClose },
          ]
        );
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('common.error'),
        error.message || t('errors.generic'),
        [
          { text: t('common.retry'), onPress: () => setScanState('camera') },
          { text: t('common.cancel'), onPress: handleClose },
        ]
      );
    }
  };

  const retakePicture = () => {
    Haptics.selectionAsync();
    setScanState('camera');
    setCapturedImage(null);
  };

  const renderCamera = () => {
    if (!permission) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.sage} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary[500]} />
          <Text style={styles.permissionTitle}>{t('receiptScanner.cameraRequired')}</Text>
          <Text style={styles.permissionText}>
            {t('receiptScanner.cameraDescription')}
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>{t('receiptScanner.allowAccess')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
        />

        {/* Overlay avec guide */}
        <View style={styles.overlay}>
          {/* Zone du haut */}
          <View style={styles.overlayTop}>
            <Text style={styles.instructionText}>
              {t('receiptScanner.frameReceipt')}
            </Text>
            <Text style={styles.instructionSubtext}>
              {t('receiptScanner.textReadable')}
            </Text>
          </View>

          {/* Zone centrale - cadre de guidage */}
          <View style={styles.overlayMiddle}>
            <View style={styles.scanFrame}>
              {/* Coins */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          {/* Zone du bas - boutons */}
          <View style={styles.overlayBottom}>
            <TouchableOpacity
              onPress={pickFromGallery}
              style={styles.sideButton}
              accessibilityLabel={t('receiptScanner.galleryLabel')}
              accessibilityRole="button"
            >
              <Ionicons name="images-outline" size={26} color="white" />
              <Text style={styles.sideButtonText}>{t('receiptScanner.gallery')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={takePicture}
              style={styles.captureButton}
              accessibilityLabel={t('receiptScanner.photoLabel')}
              accessibilityRole="button"
            >
              <View style={styles.captureButtonInner}>
                <Ionicons name="scan-outline" size={32} color={COLORS.primary[500]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickFromFiles}
              style={styles.sideButton}
              accessibilityLabel={t('receiptScanner.filesLabel')}
              accessibilityRole="button"
            >
              <Ionicons name="document-outline" size={26} color="white" />
              <Text style={styles.sideButtonText}>{t('receiptScanner.files')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton fermer */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityLabel={t('receiptScanner.closeScanner')}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <Image
        source={{ uri: capturedImage! }}
        style={styles.previewImage}
        resizeMode="contain"
        accessibilityLabel={t('receiptScanner.capturedPhoto')}
        accessibilityRole="image"
      />

      <View style={styles.previewOverlay}>
        <Text style={styles.previewTitle}>{t('receiptScanner.previewTitle')}</Text>
        <Text style={styles.previewSubtext}>
          {t('receiptScanner.previewCheck')}
        </Text>
      </View>

      <View style={styles.previewActions}>
        <TouchableOpacity
          onPress={retakePicture}
          style={styles.retakeButton}
          accessibilityLabel={t('receiptScanner.retakePhoto')}
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={24} color={COLORS.primary[500]} />
          <Text style={styles.retakeButtonText}>{t('receiptScanner.retake')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={processReceipt}
          style={styles.analyzeButton}
          accessibilityLabel={t('receiptScanner.analyzeReceipt')}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.analyzeButtonText}>{t('receiptScanner.analyze')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeButton}
        accessibilityLabel={t('receiptScanner.closePreview')}
        accessibilityRole="button"
      >
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingCard}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text style={styles.processingTitle}>{processingMessage}</Text>
        <Text style={styles.processingSubtext}>
          {t('receiptScanner.pleaseWait')}
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (scanState) {
      case 'camera':
        return renderCamera();
      case 'preview':
        return renderPreview();
      case 'processing':
        return renderProcessing();
      default:
        return renderCamera();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>{renderContent()}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.black,
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.cream,
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary[500],
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayTop: {
    paddingTop: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  instructionSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayMiddle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scanFrame: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: RADIUS.xl,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: COLORS.secondary.sage,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: RADIUS.xl,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: RADIUS.xl,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: RADIUS.xl,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: RADIUS.xl,
  },
  overlayBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  sideButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    minWidth: 70,
  },
  sideButtonText: {
    color: 'white',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewActions: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    gap: 8,
    ...SHADOWS.md,
  },
  retakeButtonText: {
    color: COLORS.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    gap: 8,
    ...SHADOWS.colored(COLORS.primary[500], 0.4),
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.cream,
    paddingHorizontal: 32,
  },
  processingCard: {
    backgroundColor: 'white',
    borderRadius: RADIUS.xl,
    padding: 40,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary[500],
    marginTop: 24,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
