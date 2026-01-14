import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FoodItem, Inventory } from '../types';
import { saveData, loadData } from '../utils/localStorage';

const STORAGE_KEY = 'inventory';

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<Inventory>([]);
  const [foodName, setFoodName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  // Charger l'inventaire au démarrage
  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await loadData(STORAGE_KEY);
      if (data) {
        setInventory(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'inventaire:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger l\'inventaire. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  const saveInventory = async (newInventory: Inventory) => {
    try {
      await saveData(STORAGE_KEY, newInventory);
      setInventory(newInventory);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'inventaire:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'inventaire');
    }
  };

  const handleAddFood = () => {
    if (!foodName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom d\'aliment');
      return;
    }
    if (!expirationDate.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une date d\'expiration');
      return;
    }

    const newItem: FoodItem = {
      id: Date.now().toString(),
      name: foodName.trim(),
      expirationDate: expirationDate.trim(),
    };

    const newInventory = [...inventory, newItem];
    saveInventory(newInventory);

    // Réinitialiser les champs
    setFoodName('');
    setExpirationDate('');
  };

  const handleDeleteFood = (id: string) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cet aliment ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newInventory = inventory.filter((item) => item.id !== id);
            saveInventory(newInventory);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FoodItem }) => (
    <View className="flex-row justify-between items-center bg-[#A3C9A8]/20 rounded-2xl p-4 mb-3 border border-[#3C6E47]/20">
      <View className="flex-1">
        <Text className="text-lg font-bold mb-1 text-[#3C6E47]">{item.name}</Text>
        <Text className="text-sm text-[#3C6E47]/70">Expire le: {item.expirationDate}</Text>
      </View>
      <TouchableOpacity
        className="bg-red-500 rounded-xl py-2 px-4 active:opacity-80"
        onPress={() => handleDeleteFood(item.id)}
      >
        <Text className="text-white text-sm font-bold">Supprimer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 p-5 bg-[#F7F5E6]">
      <Text className="text-2xl font-bold mb-5 text-center text-[#3C6E47]">
        Inventaire des Aliments
      </Text>

      <View className="mb-5">
        <TextInput
          className="border border-[#3C6E47]/30 bg-white rounded-2xl p-4 mb-3 text-base text-[#3C6E47]"
          placeholder="Nom de l'aliment"
          placeholderTextColor="#3C6E47/50"
          value={foodName}
          onChangeText={setFoodName}
        />
        <TextInput
          className="border border-[#3C6E47]/30 bg-white rounded-2xl p-4 mb-3 text-base text-[#3C6E47]"
          placeholder="Date d'expiration (JJ/MM/AAAA)"
          placeholderTextColor="#3C6E47/50"
          value={expirationDate}
          onChangeText={setExpirationDate}
        />
        <TouchableOpacity
          className="bg-[#3C6E47] rounded-2xl p-4 items-center active:opacity-80"
          onPress={handleAddFood}
        >
          <Text className="text-white text-base font-bold">Ajouter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={inventory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        className="flex-1"
        ListEmptyComponent={
          <Text className="text-center text-[#3C6E47]/50 text-base mt-12">
            Aucun aliment dans l'inventaire
          </Text>
        }
      />
    </View>
  );
}
