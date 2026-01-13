import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LIST_COLORS } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  label?: string;
}

export default function ColorPicker({
  selectedColor,
  onColorSelect,
  label = 'Couleur de la liste',
}: ColorPickerProps) {
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
          {LIST_COLORS.map((color) => {
            const isSelected = selectedColor === color.value;
            return (
              <TouchableOpacity
                key={color.value}
                onPress={() => onColorSelect(color.value)}
                activeOpacity={0.7}
                className="items-center"
                accessibilityLabel={`Couleur ${color.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={{
                    backgroundColor: color.value,
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: '#ffffff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.3 : 0.1,
                    shadowRadius: 4,
                    elevation: isSelected ? 6 : 2,
                  }}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={24} color="#ffffff" />
                  )}
                </View>
                <Text 
                  className={`text-xs mt-1 ${
                    isSelected 
                      ? 'text-gray-900 font-semibold' 
                      : 'text-gray-500'
                  }`}
                >
                  {color.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
