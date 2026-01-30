import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { loadLists } from '../utils/localStorage';
import { List, FoodItem } from '../types';
import Card from '../components/Card';
import ExpirationBadge from '../components/ExpirationBadge';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ExpiringSoonScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [lists, setLists] = useState<List[]>([]);
  const [expiringItems, setExpiringItems] = useState<Array<FoodItem & { listTitle: string; listId: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Fonction pour calculer les jours jusqu'à expiration
  const getDaysUntilExpiration = (dateString: string): number | null => {
    try {
      const [day, month, year] = dateString.split('/').map(Number);
      const expiration = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiration.setHours(0, 0, 0, 0);
      
      const diffTime = expiration.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch {
      return null;
    }
  };

  const loadExpiringItems = async () => {
    try {
      setLoading(true);
      const data = await loadLists();
      setLists(data);
      
      // Récupérer tous les aliments bientôt périmés (≤ 7 jours) de toutes les listes
      const items: Array<FoodItem & { listTitle: string; listId: string }> = [];
      
      data.forEach((list) => {
        list.items.forEach((item) => {
          const days = getDaysUntilExpiration(item.expirationDate);
          if (
            days !== null &&
            days >= 0 &&
            days <= 7 &&
            (item.status === 'active' || !item.status)
          ) {
            items.push({
              ...item,
              listTitle: list.title,
              listId: list.id,
            });
          }
        });
      });
      
      // Trier par date d'expiration (les plus urgents en premier)
      items.sort((a, b) => {
        const daysA = getDaysUntilExpiration(a.expirationDate) || 999;
        const daysB = getDaysUntilExpiration(b.expirationDate) || 999;
        return daysA - daysB;
      });
      
      setExpiringItems(items);
    } catch (error) {
      logger.error('Erreur lors du chargement:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les aliments à expiration proche. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadExpiringItems();
    }, [])
  );

  const handleItemPress = (listId: string, listTitle: string) => {
    navigation.navigate('InventoryList', { listId, listTitle });
  };

  const renderItem = ({ item }: { item: FoodItem & { listTitle: string; listId: string } }) => {
    const days = getDaysUntilExpiration(item.expirationDate);
    
    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item.listId, item.listTitle)}
        activeOpacity={0.7}
        accessibilityLabel={`Voir ${item.name} dans ${item.listTitle}`}
        accessibilityRole="button"
        accessibilityHint="Double-tapez pour voir cet aliment dans sa liste"
      >
        <Card variant="elevated" className="p-5 mb-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-xl font-bold text-[#3C6E47] mb-2">
                {item.name}
              </Text>
              
              <View className="flex-row items-center mb-2">
                <ExpirationBadge expirationDate={item.expirationDate} />
              </View>

              <Text className="text-sm text-[#3C6E47] mb-1">
                Expire le: {item.expirationDate}
                {days !== null && days >= 0 && (
                  <Text className="font-semibold">
                    {' '}({days === 0 ? 'Aujourd\'hui' : days === 1 ? 'Demain' : `${days} jours`})
                  </Text>
                )}
              </Text>
              
              <Text className="text-sm text-[#6A8A6E] mb-1">
                Liste: {item.listTitle}
              </Text>
              
              {item.quantity !== undefined && (
                <Text className="text-sm text-[#6A8A6E]">
                  Quantité: {item.quantity}
                </Text>
              )}
            </View>
            
            <Ionicons name="chevron-forward" size={24} color="#3C6E47" />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F7F5E6] items-center justify-center">
        <ActivityIndicator size="large" color="#3C6E47" />
        <Text className="text-[#3C6E47] mt-4">Chargement...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F7F5E6]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-16 pb-6">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center"
          activeOpacity={0.7}
          accessibilityLabel="Retour"
          accessibilityRole="button"
          accessibilityHint="Retourner à l'écran précédent"
        >
          <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        </TouchableOpacity>
        <Text className="text-2xl font-semibold text-[#3C6E47]">
          Bientôt périmés
        </Text>
        <View className="w-10" />
      </View>

      <FlatList
        data={expiringItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}-${item.listId}`}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="checkmark-circle-outline" size={64} color="#A3C9A8" />
            <Text className="text-lg text-[#3C6E47] text-center mt-4 font-semibold">
              Aucun aliment bientôt périmé
            </Text>
            <Text className="text-base text-[#6A8A6E] text-center mt-2">
              Tous vos aliments sont encore bons !
            </Text>
          </View>
        }
      />
    </View>
  );
}

