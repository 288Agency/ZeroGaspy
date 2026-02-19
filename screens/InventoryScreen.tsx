import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { FoodItem, Inventory } from '../types';
import { saveData, loadData } from '../utils/localStorage';
import logger from '../utils/logger';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

const STORAGE_KEY = 'inventory';

export default function InventoryScreen() {
  const { t } = useTranslation();
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
      logger.error('Error loading inventory:', error);
      Alert.alert(
        t('common.error'),
        t('inventory.loadError'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const saveInventory = async (newInventory: Inventory) => {
    try {
      await saveData(STORAGE_KEY, newInventory);
      setInventory(newInventory);
    } catch (error) {
      logger.error('Error saving inventory:', error);
      Alert.alert(t('common.error'), t('inventory.saveError'));
    }
  };

  const handleAddFood = () => {
    if (!foodName.trim()) {
      Alert.alert(t('common.error'), t('inventory.nameRequired'));
      return;
    }
    if (!expirationDate.trim()) {
      Alert.alert(t('common.error'), t('inventory.dateRequired'));
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
      t('common.delete'),
      t('inventory.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <Text style={styles.listItemName}>{item.name}</Text>
        <Text style={styles.listItemDate}>{t('inventory.expiresOn')} {item.expirationDate}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteFood(item.id)}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('inventory.inventoryTitle')}
      </Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('addFood.name')}
          placeholderTextColor={hexToRgba(COLORS.primary[500], 0.5)}
          value={foodName}
          onChangeText={setFoodName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('inventory.dateFormat')}
          placeholderTextColor={hexToRgba(COLORS.primary[500], 0.5)}
          value={expirationDate}
          onChangeText={setExpirationDate}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddFood}
          activeOpacity={0.8}
          accessibilityLabel={t('inventory.addFood')}
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>{t('common.add')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={inventory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {t('inventory.noFood')}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.xl,
    backgroundColor: COLORS.secondary.cream,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xl,
    textAlign: 'center',
    color: COLORS.primary[500],
  },
  formContainer: {
    marginBottom: SPACING.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.3),
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    fontSize: 16,
    color: COLORS.primary[500],
  },
  addButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.2),
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    color: COLORS.primary[500],
  },
  listItemDate: {
    fontSize: 14,
    color: hexToRgba(COLORS.primary[500], 0.7),
  },
  deleteButton: {
    backgroundColor: COLORS.semantic.danger,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  deleteButtonText: {
    color: COLORS.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: hexToRgba(COLORS.primary[500], 0.5),
    fontSize: 16,
    marginTop: SPACING['5xl'],
  },
});
