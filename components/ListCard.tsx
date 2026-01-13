import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import IndicatorBadge from './IndicatorBadge';
import { cn } from '../utils/cn';

interface ListCardProps {
  list: List;
  urgentCount?: number;
  variant?: 'default' | 'featured';
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ListCard({
  list,
  urgentCount = 0,
  variant = 'default',
}: ListCardProps) {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    navigation.navigate('InventoryList', {
      listId: list.id,
      listTitle: list.title,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        className="mb-4"
        accessible={true}
        accessibilityLabel={`Liste ${list.title} avec ${list.items.length} aliment${list.items.length > 1 ? 's' : ''}`}
        accessibilityRole="button"
      >
        <View className="bg-[#F7F5E6] dark:bg-gray-800 rounded-3xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {list.title}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Créée le {formatDate(list.createdAt)}
              </Text>
            </View>
            {urgentCount > 0 && (
              <IndicatorBadge count={urgentCount} variant="danger" />
            )}
          </View>
          
          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-[#3C6E47] mr-2" />
              <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
                {list.items.length} aliment{list.items.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Text className="text-[#3C6E47] dark:text-[#3C6E47] font-medium">
              Voir →
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="mb-3"
      accessible={true}
      accessibilityLabel={`Liste ${list.title} avec ${list.items.length} aliment${list.items.length > 1 ? 's' : ''}`}
      accessibilityRole="button"
    >
      <View className="bg-[#F7F5E6] dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {list.title}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {list.items.length} aliment{list.items.length > 1 ? 's' : ''}
            </Text>
          </View>
          <View className="flex-row items-center">
            {urgentCount > 0 && (
              <IndicatorBadge count={urgentCount} variant="warning" size="sm" className="mr-2" />
            )}
            <Text className="text-gray-400 dark:text-gray-500 text-lg">›</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}


