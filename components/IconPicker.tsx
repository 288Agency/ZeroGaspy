import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LIST_ICONS } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/designSystem';

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  selectedColor?: string;
  label?: string;
}

export default function IconPicker({
  selectedIcon,
  onIconSelect,
  selectedColor = COLORS.primary[500],
  label = 'Icône de la liste',
}: IconPickerProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {label}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        <View className="flex-row gap-3">
          {LIST_ICONS.map((icon) => {
            const isSelected = selectedIcon === icon.value;
            return (
              <TouchableOpacity
                key={icon.value}
                onPress={() => onIconSelect(icon.value)}
                activeOpacity={0.7}
                className="items-center"
                accessibilityLabel={`Icône ${icon.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={{
                    backgroundColor: isSelected ? selectedColor : '#E5E7EB',
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: '#D1D5DB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.25 : 0.1,
                    shadowRadius: 4,
                    elevation: isSelected ? 4 : 2,
                  }}
                >
                  <Ionicons
                    name={icon.value as any}
                    size={24}
                    color={isSelected ? '#ffffff' : '#6B7280'}
                  />
                </View>
                <Text
                  className={`text-xs mt-1.5 ${
                    isSelected
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-500'
                  }`}
                  style={{ maxWidth: 56, textAlign: 'center' }}
                  numberOfLines={1}
                >
                  {icon.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
