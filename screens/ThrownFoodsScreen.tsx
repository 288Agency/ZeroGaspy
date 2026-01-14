import React, { useState } from 'react';
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
import { FoodItem } from '../types';
import Card from '../components/Card';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ThrownFoodsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [thrownItems, setThrownItems] = useState<Array<FoodItem & { listTitle: string; listId: string; listColor?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadThrownItems = async () => {
    try {
      setLoading(true);
      const data = await loadLists();
      
      // Récupérer tous les aliments jetés de toutes les listes
      const items: Array<FoodItem & { listTitle: string; listId: string; listColor?: string }> = [];
      
      data.forEach((list) => {
        list.items.forEach((item) => {
          if (item.status === 'thrown') {
            items.push({
              ...item,
              listTitle: list.title,
              listId: list.id,
              listColor: list.color,
            });
          }
        });
      });
      
      setThrownItems(items);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les aliments jetés. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadThrownItems();
    }, [])
  );

  const handleItemPress = (listId: string, listTitle: string, listColor?: string) => {
    navigation.navigate('InventoryList', { listId, listTitle, listColor });
  };

  const renderItem = ({ item }: { item: FoodItem & { listTitle: string; listId: string; listColor?: string } }) => {
    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item.listId, item.listTitle, item.listColor)}
        activeOpacity={0.7}
      >
        <Card variant="elevated" className="p-5 mb-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-2">
                <Text className="text-xl font-bold text-[#3C6E47]">
                  {item.name}
                </Text>
                <View className="ml-2 px-2 py-1 rounded-full bg-red-100">
                  <Text className="text-xs font-semibold text-red-600">
                    Jeté
                  </Text>
                </View>
              </View>
              
              {item.expirationDate && (
                <Text className="text-sm text-[#6A8A6E] mb-1">
                  Date d'expiration: {item.expirationDate}
                </Text>
              )}
              
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
        >
          <Ionicons name="arrow-back" size={24} color="#3C6E47" />
        </TouchableOpacity>
        <Text className="text-2xl font-semibold text-[#3C6E47]">
          Aliments jetés
        </Text>
        <View className="w-10" />
      </View>

      <FlatList
        data={thrownItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}-${item.listId}`}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="leaf-outline" size={64} color="#A3C9A8" />
            <Text className="text-lg text-[#3C6E47] text-center mt-4 font-semibold">
              Aucun aliment jeté
            </Text>
            <Text className="text-base text-[#6A8A6E] text-center mt-2">
              Bravo, vous évitez le gaspillage ! 🎉
            </Text>
          </View>
        }
      />
    </View>
  );
}
