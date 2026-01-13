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
import * as Haptics from 'expo-haptics';
import {
  getProductByBarcode,
  extractMainCategory,
  OpenFoodFactsProduct,
} from '../services/openFoodFactsService';

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
        setError('Produit non trouvé dans la base de données');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Permettre de rescanner après 2 secondes
        setTimeout(() => {
          setScanned(false);
          setError(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Erreur lors du scan:', err);
      setError('Erreur lors de la recherche du produit');
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
        <View className="flex-1 items-center justify-center bg-black">
          <ActivityIndicator size="large" color="#A3C9A8" />
          <Text className="text-white mt-4">Chargement...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View className="flex-1 items-center justify-center bg-[#F7F5E6] px-8">
          <Ionicons name="camera-outline" size={64} color="#3C6E47" />
          <Text className="text-xl font-bold text-[#3C6E47] text-center mt-6 mb-4">
            Accès à la caméra requis
          </Text>
          <Text className="text-base text-[#6A8A6E] text-center mb-8">
            Pour scanner les codes-barres, nous avons besoin d'accéder à votre caméra.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-[#3C6E47] rounded-2xl px-8 py-4"
          >
            <Text className="text-white font-semibold text-base">
              Autoriser l'accès
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black">
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
        <View className="flex-1">
          {/* Zone du haut */}
          <View className="flex-1 bg-black/60" />
          
          <View className="flex-row">
            {/* Zone de gauche */}
            <View className="bg-black/60" style={{ width: (SCREEN_WIDTH - SCAN_AREA_SIZE) / 2 }} />
            
            {/* Zone de scan */}
            <View
              style={{
                width: SCAN_AREA_SIZE,
                height: SCAN_AREA_SIZE * 0.6,
              }}
              className="border-2 border-white rounded-3xl overflow-hidden"
            >
              {/* Coins décoratifs */}
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#A3C9A8] rounded-tl-2xl" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#A3C9A8] rounded-tr-2xl" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#A3C9A8] rounded-bl-2xl" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#A3C9A8] rounded-br-2xl" />
              
              {/* Ligne de scan animée */}
              {!loading && !error && (
                <View className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#A3C9A8]" />
              )}
            </View>
            
            {/* Zone de droite */}
            <View className="bg-black/60" style={{ width: (SCREEN_WIDTH - SCAN_AREA_SIZE) / 2 }} />
          </View>
          
          {/* Zone du bas */}
          <View className="flex-1 bg-black/60 items-center pt-8">
            {loading ? (
              <View className="items-center">
                <ActivityIndicator size="large" color="#A3C9A8" />
                <Text className="text-white mt-4 text-base">
                  Recherche du produit...
                </Text>
              </View>
            ) : error ? (
              <View className="items-center px-8">
                <Ionicons name="alert-circle" size={32} color="#ef4444" />
                <Text className="text-white mt-2 text-base text-center">
                  {error}
                </Text>
                <Text className="text-white/60 mt-2 text-sm">
                  Réessayez dans un instant...
                </Text>
              </View>
            ) : (
              <Text className="text-white text-base text-center px-8">
                Placez le code-barres dans le cadre
              </Text>
            )}
          </View>
        </View>

        {/* Bouton fermer */}
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-16 right-6 w-12 h-12 rounded-full bg-black/50 items-center justify-center"
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        {/* Titre */}
        <View className="absolute top-16 left-0 right-0 items-center">
          <Text className="text-white text-xl font-bold">
            Scanner le code-barres
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
