import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { List } from '../types';
import ListCard from './ListCard';
import IndicatorBadge from './IndicatorBadge';

interface TodayOverviewProps {
  featuredLists: List[];
  urgentItemsCount: number;
}

export default function TodayOverview({
  featuredLists,
  urgentItemsCount,
}: TodayOverviewProps) {
  return (
    <View className="mb-6">
      {/* Header avec indicateur d'urgence */}
      <View className="flex-row items-center justify-between px-5 mb-4">
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Aujourd'hui
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {featuredLists.length} liste{featuredLists.length > 1 ? 's' : ''} active{featuredLists.length > 1 ? 's' : ''}
          </Text>
        </View>
        {urgentItemsCount > 0 && (
          <IndicatorBadge count={urgentItemsCount} variant="danger" size="lg" />
        )}
      </View>

      {/* Liste des listes principales */}
      {featuredLists.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          className="mb-4"
        >
          {featuredLists.map((list) => (
            <View key={list.id} className="mr-4" style={{ width: 280 }}>
              <ListCard list={list} variant="featured" urgentCount={0} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className="mx-5 mb-4 bg-[#F7F5E6] dark:bg-gray-800 rounded-2xl p-6 items-center">
          <Text className="text-gray-500 dark:text-gray-400 text-center mb-2">
            Aucune liste principale
          </Text>
          <Text className="text-sm text-gray-400 dark:text-gray-500 text-center">
            Créez une liste pour commencer
          </Text>
        </View>
      )}
    </View>
  );
}


