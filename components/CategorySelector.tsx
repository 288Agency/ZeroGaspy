import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';
import logger from '../utils/logger';

interface CategorySelectorProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  style?: any;
}

const DEFAULT_CATEGORIES = [
  'Fruits',
  'Légumes',
  'Viande',
  'Charcuterie',
  'Poisson & Fruits de mer',
  'Produits laitiers',
  'Fromages',
  'Oeufs',
  'Boulangerie',
  'Plats préparés',
  'Épicerie',
  'Snacks & Biscuits',
  'Confiseries',
  'Condiments & Sauces',
  'Petit-déjeuner & Céréales',
  'Surgelés',
  'Boissons',
  'Autre',
];

const CATEGORIES_STORAGE_KEY = 'user_categories';

export default function CategorySelector({
  selectedCategory,
  onCategorySelect,
  style,
}: CategorySelectorProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    loadCustomCategories();
  }, []);

  const loadCustomCategories = async () => {
    try {
      const stored = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (stored) {
        setCustomCategories(JSON.parse(stored));
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des catégories:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger vos catégories personnalisées.',
        [{ text: 'OK' }]
      );
    }
  };

  const saveCustomCategories = async (categories: string[]) => {
    try {
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      setCustomCategories(categories);
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde des catégories:', error);
      Alert.alert(
        'Erreur',
        'Impossible de sauvegarder la catégorie.',
        [{ text: 'OK' }]
      );
    }
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const handleCategoryPress = (category: string) => {
    onCategorySelect(category);
    setShowModal(false);
  };

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      Alert.alert('Erreur', 'Veuillez entrer un nom');
      return;
    }

    if (allCategories.includes(trimmedName)) {
      Alert.alert('Erreur', 'Cette catégorie existe déjà');
      return;
    }

    setIsAddingCategory(true);
    try {
      const updated = [...customCategories, trimmedName];
      await saveCustomCategories(updated);
      setNewCategoryName('');
      onCategorySelect(trimmedName);
      setShowModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la catégorie');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const displayValue = selectedCategory || 'Sélectionner';

  return (
    <View style={[styles.container, style]}>
      <PressableScale
        onPress={() => setShowModal(true)}
        style={styles.trigger}
      >
        <Text style={styles.triggerLabel}>
          Catégorie
        </Text>
        <View style={styles.triggerValueRow}>
          <Text
            style={[
              styles.triggerValue,
              !selectedCategory && styles.triggerValuePlaceholder,
            ]}
          >
            {displayValue}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary[500]} />
        </View>
      </PressableScale>

      <AnimatedModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        position="center"
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <PressableScale
              onPress={() => setShowModal(false)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Fermer</Text>
            </PressableScale>

            <Text style={styles.headerTitle}>Catégories</Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Categories grid - compact */}
            <View style={styles.categoriesGrid}>
              {allCategories.map((category, index) => (
                <PressableScale
                  key={index}
                  onPress={() => handleCategoryPress(category)}
                  hapticType="selection"
                  style={[
                    styles.categoryItem,
                    selectedCategory === category
                      ? styles.categoryItemSelected
                      : styles.categoryItemUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category
                        ? styles.categoryLabelSelected
                        : styles.categoryLabelUnselected,
                    ]}
                  >
                    {category}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {/* Add new category - compact */}
            <View style={styles.addSection}>
              <View style={styles.addRow}>
                <TextInput
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder={t('categorySelector.newCategory')}
                  placeholderTextColor={COLORS.text.tertiary}
                  style={styles.addInput}
                  onSubmitEditing={handleAddCategory}
                  returnKeyType="done"
                />
                <PressableScale
                  onPress={handleAddCategory}
                  disabled={isAddingCategory || !newCategoryName.trim()}
                  hapticType="medium"
                  style={[
                    styles.addButton,
                    isAddingCategory || !newCategoryName.trim()
                      ? styles.addButtonDisabled
                      : styles.addButtonEnabled,
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={22}
                    color={isAddingCategory || !newCategoryName.trim() ? COLORS.text.tertiary : COLORS.neutral.white}
                  />
                </PressableScale>
              </View>
            </View>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING['2xl'],
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary.sage,
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.3),
    minHeight: 60,
  },
  triggerLabel: {
    color: COLORS.primary[500],
    fontWeight: '500',
    fontSize: 16,
    marginRight: SPACING.lg,
    minWidth: 100,
  },
  triggerValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  triggerValue: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: SPACING.sm,
    color: COLORS.primary[500],
  },
  triggerValuePlaceholder: {
    color: COLORS.text.tertiary,
  },
  modalContainer: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  headerButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  headerButtonText: {
    color: COLORS.primary[500],
    fontWeight: '500',
    fontSize: 16,
  },
  headerTitle: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  headerSpacer: {
    width: 64,
  },
  content: {
    padding: SPACING.lg,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoryItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  categoryItemSelected: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  categoryItemUnselected: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  categoryLabel: {
    fontWeight: '500',
    fontSize: 14,
  },
  categoryLabelSelected: {
    color: COLORS.neutral.white,
  },
  categoryLabelUnselected: {
    color: COLORS.primary[500],
  },
  addSection: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  addRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addInput: {
    flex: 1,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    color: COLORS.primary[500],
    fontSize: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
  },
  addButtonEnabled: {
    backgroundColor: COLORS.primary[500],
  },
});
