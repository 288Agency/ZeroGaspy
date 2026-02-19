import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import {
  getProductByBarcode,
  extractMainCategory,
  OpenFoodFactsProduct,
} from '../services/openFoodFactsService';
import logger from '../utils/logger';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: {
    name: string;
    quantity?: string;
    category?: string;
    imageUrl?: string;
    brand?: string;
  }) => void;
}

export default function BarcodeScannerModal({
  visible,
  onClose,
  onProductFound,
}: BarcodeScannerModalProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setError(null);
      setLoading(false);
    }
  }, [visible]);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);
    setError(null);

    // Vibration de feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const product = await getProductByBarcode(result.data);

      if (product) {
        const category = extractMainCategory(product.categories);

        onProductFound({
          name: product.brand ? `${product.name} - ${product.brand}` : product.name,
          quantity: product.quantity,
          category,
          imageUrl: product.imageUrl,
          brand: product.brand,
        });
        onClose();
      } else {
        setError(t('barcodeScanner.productNotFound'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Permettre de rescanner apres 2 secondes
        setTimeout(() => {
          setScanned(false);
          setError(null);
        }, 2000);
      }
    } catch (err) {
      logger.error('Erreur lors du scan:', err);
      setError(t('barcodeScanner.searchError'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        setScanned(false);
        setError(null);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!permission) {
      return (
        <View style={styles.centeredBlack}>
          <ActivityIndicator size="large" color={COLORS.secondary.sage} />
          <Text style={styles.loadingText}>{t('barcodeScanner.loading')}</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary[500]} />
          <Text style={styles.permissionTitle}>
            {t('barcodeScanner.cameraRequired')}
          </Text>
          <Text style={styles.permissionDesc}>
            {t('barcodeScanner.cameraDesc')}
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>
              {t('barcodeScanner.allowAccess')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code128',
              'code39',
              'code93',
              'itf14',
              'codabar',
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        {/* Overlay avec zone de scan */}
        <View style={styles.overlay}>
          {/* Zone du haut */}
          <View style={styles.overlayTop} />

          <View style={styles.overlayMiddleRow}>
            {/* Zone de gauche */}
            <View style={[styles.overlaySide, { width: (SCREEN_WIDTH - SCAN_AREA_SIZE) / 2 }]} />

            {/* Zone de scan */}
            <View style={styles.scanArea}>
              {/* Coins decoratifs */}
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />

              {/* Ligne de scan animee */}
              {!loading && !error && (
                <View style={styles.scanLine} />
              )}
            </View>

            {/* Zone de droite */}
            <View style={[styles.overlaySide, { width: (SCREEN_WIDTH - SCAN_AREA_SIZE) / 2 }]} />
          </View>

          {/* Zone du bas */}
          <View style={styles.overlayBottom}>
            {loading ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary.sage} />
                <Text style={styles.statusText}>
                  {t('barcodeScanner.searching')}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={32} color={COLORS.semantic.danger} />
                <Text style={styles.errorText}>
                  {error}
                </Text>
                <Text style={styles.retryText}>
                  {t('barcodeScanner.retryingSoon')}
                </Text>
              </View>
            ) : (
              <Text style={styles.instructionText}>
                {t('barcodeScanner.placeBarcode')}
              </Text>
            )}
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
            {t('barcodeScanner.scanBarcode')}
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
  overlayMiddleRow: {
    flexDirection: 'row',
  },
  overlaySide: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.6,
    borderWidth: 2,
    borderColor: COLORS.neutral.white,
    borderRadius: RADIUS['3xl'],
    overflow: 'hidden',
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
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: SPACING.lg,
    right: SPACING.lg,
    height: 2,
    backgroundColor: COLORS.secondary.sage,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    color: COLORS.neutral.white,
    marginTop: SPACING.lg,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  errorText: {
    color: COLORS.neutral.white,
    marginTop: SPACING.sm,
    fontSize: 16,
    textAlign: 'center',
  },
  retryText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: SPACING.sm,
    fontSize: 14,
  },
  instructionText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: SPACING['3xl'],
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
