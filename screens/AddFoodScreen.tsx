import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { RootStackParamList } from '../types/navigation';
import { addItemToList } from '../utils/localStorage';
import Header from '../components/Header';
import ImagePickerButton from '../components/ImagePickerButton';
import FieldInput from '../components/FieldInput';
import DatePickerField from '../components/DatePickerField';
import CategorySelector from '../components/CategorySelector';
import BarcodeButton from '../components/BarcodeButton';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import PressableScale from '../components/PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';

type RoutePropType = RouteProp<RootStackParamList, 'AddFood'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddFood'>;

// Decorative background element
function BackgroundDecoration() {
  return (
    <View style={styles.decorationContainer}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <G opacity={0.05}>
          <Circle cx="150" cy="50" r="80" fill={COLORS.primary[500]} />
          <Circle cx="30" cy="180" r="60" fill={COLORS.secondary.sage} />
        </G>
      </Svg>
    </View>
  );
}

export default function AddFoodScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { listId } = route.params;

  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isOpened, setIsOpened] = useState(false);
  const [openedDate, setOpenedDate] = useState('');
  const [daysAfterOpening, setDaysAfterOpening] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Entry animations
  const formFade = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(formSlide, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
    ]).start();
  }, []);

  const handleAddFood = async () => {
    if (!foodName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom d\'aliment');
      return;
    }

    let finalExpirationDate = expirationDate.trim();

    if (isOpened && openedDate.trim() && daysAfterOpening.trim()) {
      const [day, month, year] = openedDate.trim().split('/').map(Number);
      const opened = new Date(year, month - 1, day);
      const days = parseInt(daysAfterOpening, 10);
      opened.setDate(opened.getDate() + days);
      finalExpirationDate = `${opened.getDate().toString().padStart(2, '0')}/${(opened.getMonth() + 1).toString().padStart(2, '0')}/${opened.getFullYear()}`;
    }

    setIsAdding(true);
    try {
      const newItem = {
        id: Date.now().toString(),
        name: foodName.trim(),
        expirationDate: finalExpirationDate || '',
        quantity: quantity.trim() ? parseInt(quantity, 10) : undefined,
        category: category.trim() || undefined,
        imageUri: imageUri || undefined,
        status: 'active' as const,
        isOpened: isOpened || undefined,
        openedDate: isOpened && openedDate.trim() ? openedDate.trim() : undefined,
        daysAfterOpening: isOpened && daysAfterOpening.trim() ? parseInt(daysAfterOpening, 10) : undefined,
      };

      await addItemToList(listId, newItem);
      navigation.goBack();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'aliment');
    } finally {
      setIsAdding(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à vos photos.'
        );
        return;
      }

      Alert.alert(
        'Sélectionner une image',
        'Choisissez une source',
        [
          {
            text: 'Caméra',
            onPress: async () => {
              const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraStatus.status === 'granted') {
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });

                if (!result.canceled && result.assets[0]) {
                  setImageUri(result.assets[0].uri);
                }
              }
            },
          },
          {
            text: 'Galerie',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
              }
            },
          },
          {
            text: imageUri ? 'Supprimer' : 'Annuler',
            style: imageUri ? 'destructive' : 'cancel',
            onPress: () => {
              if (imageUri) {
                setImageUri(null);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Erreur lors de la sélection d\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner une image');
    }
  };

  const handleBarcodeScan = () => {
    setScannerVisible(true);
  };

  const handleProductFound = (product: {
    name: string;
    quantity?: string;
    category?: string;
    imageUrl?: string;
    brand?: string;
  }) => {
    setFoodName(product.name);

    if (product.quantity) {
      const quantityMatch = product.quantity.match(/(\d+)/);
      if (quantityMatch) {
        setQuantity(quantityMatch[1]);
      }
    }

    if (product.category) {
      setCategory(product.category);
    }

    if (product.imageUrl) {
      setImageUri(product.imageUrl);
    }

    Alert.alert(
      'Produit trouvé !',
      `${product.name}${product.quantity ? `\nQuantité: ${product.quantity}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const isFormValid = foodName.trim().length > 0;

  return (
    <View style={styles.container}>
      <BackgroundDecoration />
      <Header title="Ajouter un aliment" showIcon={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Animated.View
          style={{
            opacity: formFade,
            transform: [{ translateY: formSlide }],
          }}
        >
          {/* Image picker */}
          <View style={styles.imageSection}>
            <ImagePickerButton
              onPress={handleImagePicker}
              imageUri={imageUri}
            />
          </View>

          {/* Form section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Informations</Text>

            <FieldInput
              label="Nom de l'aliment"
              value={foodName}
              onChangeText={setFoodName}
              placeholder="Ex: Tomates cerises"
              icon="restaurant-outline"
              autoFocus
            />

            <FieldInput
              label="Quantité"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Ex: 2"
              icon="layers-outline"
              keyboardType="numeric"
            />

            <CategorySelector
              selectedCategory={category}
              onCategorySelect={setCategory}
            />

            {!isOpened && (
              <DatePickerField
                label="Date d'expiration"
                value={expirationDate}
                onDateChange={setExpirationDate}
              />
            )}
          </View>

          {/* Opened section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>État du produit</Text>

            <PressableScale
              onPress={() => setIsOpened(!isOpened)}
              style={styles.toggleCard}
              hapticType="selection"
              activeScale={0.98}
            >
              <View
                style={[
                  styles.checkbox,
                  isOpened && styles.checkboxChecked,
                ]}
              >
                {isOpened && (
                  <Ionicons name="checkmark" size={16} color={COLORS.neutral.white} />
                )}
              </View>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>Produit déjà ouvert</Text>
                <Text style={styles.toggleSubtitle}>
                  Calcul automatique de la date de péremption
                </Text>
              </View>
              <Ionicons
                name={isOpened ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.text.secondary}
              />
            </PressableScale>

            {isOpened && (
              <Animated.View style={styles.openedFields}>
                <DatePickerField
                  label="Date d'ouverture"
                  value={openedDate}
                  onDateChange={setOpenedDate}
                />

                <FieldInput
                  label="À consommer sous"
                  value={daysAfterOpening}
                  onChangeText={setDaysAfterOpening}
                  placeholder="Nombre de jours"
                  icon="time-outline"
                  keyboardType="numeric"
                  hint="Nombre de jours après ouverture"
                />
              </Animated.View>
            )}
          </View>

          {/* Barcode section */}
          <View style={styles.barcodeSection}>
            <BarcodeButton onPress={handleBarcodeScan} />
          </View>

          {/* Submit button */}
          <View style={styles.submitSection}>
            <PressableScale
              onPress={handleAddFood}
              disabled={isAdding || !isFormValid}
              style={[
                styles.submitButton,
                !isFormValid && styles.submitButtonDisabled,
              ]}
              hapticType="medium"
              activeScale={0.97}
            >
              {isAdding ? (
                <Text style={styles.submitButtonText}>Ajout en cours...</Text>
              ) : (
                <>
                  <Ionicons
                    name="add-circle"
                    size={22}
                    color={isFormValid ? COLORS.neutral.white : COLORS.text.muted}
                  />
                  <Text
                    style={[
                      styles.submitButtonText,
                      !isFormValid && styles.submitButtonTextDisabled,
                    ]}
                  >
                    Ajouter l'aliment
                  </Text>
                </>
              )}
            </PressableScale>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal de scan */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onProductFound={handleProductFound}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  decorationContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageSection: {
    marginBottom: 32,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary[500],
    marginBottom: 16,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    ...SHADOWS.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: hexToRgba(COLORS.primary[500], 0.4),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  toggleSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  openedFields: {
    marginTop: 16,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  barcodeSection: {
    marginBottom: 24,
  },
  submitSection: {
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    paddingHorizontal: 32,
    ...SHADOWS.colored(COLORS.primary[500], 0.35),
  },
  submitButtonDisabled: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.6),
    shadowOpacity: 0,
  },
  submitButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
    marginLeft: 8,
  },
  submitButtonTextDisabled: {
    color: COLORS.text.muted,
  },
});
