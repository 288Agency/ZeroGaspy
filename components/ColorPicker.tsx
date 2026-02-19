import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIST_COLORS } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  label?: string;
}

export default function ColorPicker({
  selectedColor,
  onColorSelect,
  label,
}: ColorPickerProps) {
  const { t } = useTranslation();
  const displayLabel = label ?? t('colorPicker.label');
  return (
    <View style={styles.container}>
      {displayLabel && (
        <Text style={styles.label}>
          {displayLabel}
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        <View style={styles.row}>
          {LIST_COLORS.map((color) => {
            const isSelected = selectedColor === color.value;
            return (
              <TouchableOpacity
                key={color.value}
                onPress={() => onColorSelect(color.value)}
                activeOpacity={0.7}
                style={styles.itemContainer}
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
                    borderColor: COLORS.neutral.white,
                    shadowColor: COLORS.neutral.black,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.3 : 0.1,
                    shadowRadius: 4,
                    elevation: isSelected ? 6 : 2,
                  }}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={24} color={COLORS.neutral.white} />
                  )}
                </View>
                <Text
                  style={[
                    styles.colorName,
                    isSelected && styles.colorNameSelected,
                  ]}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.gray700,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  itemContainer: {
    alignItems: 'center',
  },
  colorName: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.neutral.gray500,
  },
  colorNameSelected: {
    color: COLORS.neutral.gray900,
    fontWeight: '600',
  },
});
