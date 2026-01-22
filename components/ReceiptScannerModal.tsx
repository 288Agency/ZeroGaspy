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
import * as Haptics from 'expo-haptics';
import { scanReceipt, ReceiptScanResult } from '../services/receiptScannerService';
import { COLORS, SHADOWS, RADIUS } from '../utils/designSystem';
import Constants from 'expo-constants';

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
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('Analyse en cours...');
  const cameraRef = useRef<CameraView>(null);

  // Récupérer la clé API depuis les variables d'environnement
  const apiKey = Constants.expoConfig?.extra?.googleVisionApiKey ||
                 process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '';

  const resetState = () => {
    setScanState('camera');
    setCapturedImage(null);
    setProcessingMessage('Analyse en cours...');
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
      console.error('Erreur prise de photo:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour acceder a vos photos.'
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
      console.error('Erreur selection image:', error);
      Alert.alert('Erreur', 'Impossible de selectionner l\'image');
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
            'Format non supporte',
            'Seules les images (JPG, PNG) sont supportees.\n\nPour un PDF, prenez une capture d\'ecran du ticket.',
            [{ text: 'OK' }]
          );
          return;
        }

        setCapturedImage(file.uri);
        setScanState('preview');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Erreur selection fichier:', error);
      Alert.alert('Erreur', 'Impossible de selectionner le fichier');
    }
  };

  const processReceipt = async () => {
    if (!capturedImage) return;

    if (!apiKey) {
      Alert.alert(
        'Configuration requise',
        'La clé API Google Cloud Vision n\'est pas configurée. Ajoutez EXPO_PUBLIC_GOOGLE_VISION_API_KEY dans votre fichier .env'
      );
      return;
    }

    setScanState('processing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setProcessingMessage('Lecture du ticket...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setProcessingMessage('Extraction du texte...');
      const result = await scanReceipt(capturedImage, apiKey);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (result.items.length === 0) {
          Alert.alert(
            'Aucun produit détecté',
            result.error || 'Le ticket n\'a pas pu être lu correctement. Essayez avec une meilleure qualité d\'image.',
            [
              { text: 'Réessayer', onPress: () => setScanState('camera') },
              { text: 'Annuler', onPress: handleClose },
            ]
          );
        } else {
          onScanComplete(result);
          handleClose();
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Erreur de scan',
          result.error || 'Impossible d\'analyser le ticket',
          [
            { text: 'Réessayer', onPress: () => setScanState('camera') },
            { text: 'Annuler', onPress: handleClose },
          ]
        );
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue',
        [
          { text: 'Réessayer', onPress: () => setScanState('camera') },
          { text: 'Annuler', onPress: handleClose },
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
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary[500]} />
          <Text style={styles.permissionTitle}>Accès à la caméra requis</Text>
          <Text style={styles.permissionText}>
            Pour scanner les tickets de caisse, nous avons besoin d'accéder à votre caméra.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
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
              Cadrez le ticket de caisse
            </Text>
            <Text style={styles.instructionSubtext}>
              Assurez-vous que le texte soit bien lisible
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
              accessibilityLabel="Choisir depuis la galerie"
              accessibilityRole="button"
            >
              <Ionicons name="images-outline" size={26} color="white" />
              <Text style={styles.sideButtonText}>Galerie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={takePicture}
              style={styles.captureButton}
              accessibilityLabel="Prendre une photo du ticket"
              accessibilityRole="button"
            >
              <View style={styles.captureButtonInner}>
                <Ionicons name="scan-outline" size={32} color={COLORS.primary[500]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickFromFiles}
              style={styles.sideButton}
              accessibilityLabel="Choisir depuis les fichiers"
              accessibilityRole="button"
            >
              <Ionicons name="document-outline" size={26} color="white" />
              <Text style={styles.sideButtonText}>Fichiers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton fermer */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          accessibilityLabel="Fermer le scanner"
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
        accessibilityLabel="Photo du ticket de caisse capturé"
        accessibilityRole="image"
      />

      <View style={styles.previewOverlay}>
        <Text style={styles.previewTitle}>Aperçu du ticket</Text>
        <Text style={styles.previewSubtext}>
          Vérifiez que le ticket est bien lisible
        </Text>
      </View>

      <View style={styles.previewActions}>
        <TouchableOpacity
          onPress={retakePicture}
          style={styles.retakeButton}
          accessibilityLabel="Reprendre la photo"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={24} color={COLORS.primary[500]} />
          <Text style={styles.retakeButtonText}>Reprendre</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={processReceipt}
          style={styles.analyzeButton}
          accessibilityLabel="Analyser le ticket"
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.analyzeButtonText}>Analyser</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeButton}
        accessibilityLabel="Fermer l'aperçu"
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
          Veuillez patienter, cela peut prendre quelques secondes...
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
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
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
    backgroundColor: '#000',
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
