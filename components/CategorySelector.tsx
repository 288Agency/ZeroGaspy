import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { cn } from '../utils/cn';

interface CategorySelectorProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  className?: string;
}

const DEFAULT_CATEGORIES = [
  'Légumes',
  'Fruits',
  'Viande',
  'Poisson',
  'Laitiers',
  'Épicerie',
  'Surgelés',
  'Boissons',
  'Pain',
  'Autre',
];

const CATEGORIES_STORAGE_KEY = 'user_categories';

export default function CategorySelector({
  selectedCategory,
  onCategorySelect,
  className,
}: CategorySelectorProps) {
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
      console.error('Erreur lors du chargement des catégories:', error);
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
      console.error('Erreur lors de la sauvegarde des catégories:', error);
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
    <View className={cn('mb-6', className)}>
      <PressableScale
        onPress={() => setShowModal(true)}
        className="flex-row items-center bg-[#A3C9A8] rounded-2xl px-5 py-4 border border-[#3C6E47]/30 min-h-[60px]"
      >
        <Text className="text-[#3C6E47] font-medium text-base mr-4 min-w-[100px]">
          Catégorie
        </Text>
        <View className="flex-1 flex-row items-center justify-end">
          <Text
            className={cn(
              'text-base font-medium mr-2',
              selectedCategory ? 'text-[#3C6E47]' : 'text-[#6A8A6E]'
            )}
          >
            {displayValue}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#3C6E47" />
        </View>
      </PressableScale>

      <AnimatedModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        position="center"
      >
        <View className="bg-[#F7F5E6] rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-[#3C6E47]/20">
            <PressableScale
              onPress={() => setShowModal(false)}
              className="px-3 py-2 rounded-xl"
            >
              <Text className="text-[#3C6E47] font-medium text-base">Fermer</Text>
            </PressableScale>

            <Text className="text-[#3C6E47] font-bold text-lg">Catégories</Text>

            <View className="w-16" />
          </View>

          {/* Content */}
          <View className="p-4">
            {/* Categories grid - compact */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {allCategories.map((category, index) => (
                <PressableScale
                  key={index}
                  onPress={() => handleCategoryPress(category)}
                  hapticType="selection"
                  className={cn(
                    'px-3 py-2 rounded-xl border',
                    selectedCategory === category
                      ? 'bg-[#3C6E47] border-[#3C6E47]'
                      : 'bg-[#A3C9A8]/40 border-[#3C6E47]/20'
                  )}
                >
                  <Text
                    className={cn(
                      'font-medium text-sm',
                      selectedCategory === category ? 'text-white' : 'text-[#3C6E47]'
                    )}
                  >
                    {category}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {/* Add new category - compact */}
            <View className="pt-3 border-t border-[#3C6E47]/20">
              <View className="flex-row gap-2">
                <TextInput
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Nouvelle catégorie..."
                  placeholderTextColor="#6A8A6E"
                  className="flex-1 bg-[#A3C9A8]/40 rounded-xl px-4 py-3 border border-[#3C6E47]/20 text-[#3C6E47] text-sm"
                  style={{ fontSize: 14 }}
                  onSubmitEditing={handleAddCategory}
                  returnKeyType="done"
                />
                <PressableScale
                  onPress={handleAddCategory}
                  disabled={isAddingCategory || !newCategoryName.trim()}
                  hapticType="medium"
                  className={cn(
                    'w-11 h-11 rounded-xl items-center justify-center',
                    isAddingCategory || !newCategoryName.trim()
                      ? 'bg-[#A3C9A8]/40'
                      : 'bg-[#3C6E47]'
                  )}
                >
                  <Ionicons
                    name="add"
                    size={22}
                    color={isAddingCategory || !newCategoryName.trim() ? '#6A8A6E' : 'white'}
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
