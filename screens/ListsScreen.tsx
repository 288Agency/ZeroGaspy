import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  TouchableOpacity,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import {
  loadLists,
  createList,
  deleteList,
} from '../utils/localStorage';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import PaywallModal from '../components/PaywallModal';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FREE_LIMITS } from '../constants/subscription';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Lists'>;

export default function ListsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isPremium } = useSubscription();
  const [lists, setLists] = useState<List[]>([]);
  const [newListTitle, setNewListTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Charger les listes au démarrage
  useEffect(() => {
    loadListsData();
  }, []);

  // Recharger les listes quand l'écran est focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadListsData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadListsData = async () => {
    try {
      const data = await loadLists();
      setLists(data);
    } catch (error) {
      logger.error('Erreur lors du chargement des listes:', error);
      Alert.alert('Erreur', 'Impossible de charger les listes');
    }
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre pour la liste');
      return;
    }

    try {
      await createList(newListTitle);
      setNewListTitle('');
      setIsCreating(false);
      await loadListsData();
    } catch (error) {
      logger.error('Erreur lors de la création de la liste:', error);
      Alert.alert('Erreur', 'Impossible de créer la liste');
    }
  };

  const handleDeleteList = (id: string, title: string) => {
    Alert.alert(
      'Supprimer la liste',
      `Êtes-vous sûr de vouloir supprimer "${title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteList(id);
              await loadListsData();
            } catch (error) {
              logger.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la liste');
            }
          },
        },
      ]
    );
  };

  const handleSelectList = (list: List) => {
    navigation.navigate('InventoryList', {
      listId: list.id,
      listTitle: list.title,
      listColor: list.color,
    });
  };

  const handlePressCreate = () => {
    // Verifier la limite pour les utilisateurs gratuits
    if (!isPremium && lists.length >= FREE_LIMITS.MAX_LISTS) {
      setPaywallVisible(true);
      return;
    }
    navigation.navigate('CreateList');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderList = ({ item }: { item: List }) => {
    const listColor = item.color || '#3C6E47';

    return (
      <Card
        onPress={() => handleSelectList(item)}
        variant="elevated"
        className="p-5 overflow-hidden"
        style={{ backgroundColor: listColor + '20' }} // Couleur avec 12% opacité
      >
        {/* Bande de couleur à gauche */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            backgroundColor: listColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />

        <View className="flex-row items-center justify-between pl-2">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-2">
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: listColor,
                  marginRight: 8,
                }}
              />
              <Text className="text-xl font-bold text-gray-900">
                {item.title}
              </Text>
            </View>
            <View className="flex-row items-center ml-5">
              <Text className="text-sm text-gray-600 mr-3">
                {item.items.length} aliment{item.items.length > 1 ? 's' : ''}
              </Text>
              <Text className="text-sm text-gray-500">
                • Créée le {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteList(item.id, item.title);
            }}
            style={{ backgroundColor: listColor }}
            className="w-10 h-10 rounded-full items-center justify-center active:opacity-80"
            activeOpacity={0.7}
          >
            <Text className="text-white text-lg font-bold">✕</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-[#F7F5E6]">
      <View className="px-5 pt-16 pb-6 bg-[#F7F5E6] border-b border-gray-200">
        <Text className="text-3xl font-bold text-gray-900 text-center">
          Mes Listes d'Inventaire
        </Text>
      </View>

      <FlatList
        data={lists}
        renderItem={renderList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-lg text-gray-500 text-center mb-2">
              Aucune liste
            </Text>
            <Text className="text-base text-gray-400 text-center">
              Créez-en une pour commencer !
            </Text>
          </View>
        }
      />

      {/* Bouton flottant pour créer une liste */}
      <Pressable
        onPress={handlePressCreate}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-[#3C6E47] dark:bg-[#3C6E47] items-center justify-center shadow-lg active:opacity-80 active:scale-90"
        android_ripple={{
          color: 'rgba(255, 255, 255, 0.3)',
          borderless: true,
          radius: 32,
        }}
        accessible={true}
        accessibilityLabel="Créer une nouvelle liste"
        accessibilityRole="button"
        accessibilityHint="Ouvre l'écran de création de liste"
        style={{
          elevation: 8, // Android shadow
        }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </Pressable>

      {/* Paywall Modal */}
      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature="lists"
      />

      {/* Modal pour créer une nouvelle liste */}
      <Modal
        visible={isCreating}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreating(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 items-center justify-center px-5">
            <Card variant="elevated" className="w-full max-w-md p-6">
              <Text className="text-2xl font-bold text-gray-900 mb-6">
                Nouvelle Liste
              </Text>
              
              <Input
                placeholder="Titre de la liste"
                value={newListTitle}
                onChangeText={setNewListTitle}
                autoFocus
                onSubmitEditing={handleCreateList}
              />

              <View className="flex-row gap-3 mt-2">
                <Button
                  variant="outline"
                  onPress={() => {
                    setIsCreating(false);
                    setNewListTitle('');
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onPress={handleCreateList}
                  className="flex-1"
                >
                  Créer
                </Button>
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
