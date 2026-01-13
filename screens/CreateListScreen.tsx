import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LIST_COLORS } from '../types';
import { createList } from '../utils/localStorage';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import ColorPicker from '../components/ColorPicker';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateList'>;

export default function CreateListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [listTitle, setListTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(LIST_COLORS[0].value);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!listTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre pour la liste');
      return;
    }

    setIsCreating(true);
    try {
      const newList = await createList(listTitle.trim(), selectedColor);
      
      // Réinitialiser la pile de navigation pour éviter de revenir à CreateListScreen
      // On remplace CreateListScreen par InventoryListScreen dans la pile
      // Cela permet de revenir directement à HomeScreen si on appuie sur retour
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Home' },
          {
            name: 'InventoryList',
            params: {
              listId: newList.id,
              listTitle: newList.title,
              listColor: newList.color,
            },
          },
        ],
      });
    } catch (error: any) {
      logger.error('Erreur lors de la création de la liste:', error.message);
      Alert.alert('Erreur', 'Impossible de créer la liste');
      setIsCreating(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F7F5E6] dark:bg-gray-900">
      <Header title="Nouvelle liste" showIcon={false} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text className="text-base text-gray-600 dark:text-gray-400 mb-6">
              Créez une nouvelle liste pour organiser vos aliments. Vous pourrez y ajouter des aliments avec leurs dates d'expiration.
            </Text>
          </View>

          <Input
            label="Titre de la liste"
            placeholder="Ex: Frigo, Épicerie, Congélateur..."
            value={listTitle}
            onChangeText={setListTitle}
            autoFocus
            onSubmitEditing={handleCreate}
            returnKeyType="done"
            maxLength={50}
          />

          <View className="mt-6">
            <ColorPicker
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
            />
          </View>

          <View className="mt-4">
            <Button
              onPress={handleCreate}
              label={isCreating ? 'Création...' : 'Créer la liste'}
              icon="add-circle-outline"
              variant="primary"
              disabled={isCreating || !listTitle.trim()}
              accessibilityLabel="Créer la liste"
            />
          </View>

          <View className="mt-4">
            <Button
              onPress={() => navigation.goBack()}
              label="Annuler"
              variant="outline"
              accessibilityLabel="Annuler la création"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

