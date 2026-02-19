import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIST_ICONS } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

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
  label,
}: IconPickerProps) {
  const { t } = useTranslation();
  const displayLabel = label ?? t('iconPicker.label');
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
          {LIST_ICONS.map((icon) => {
            const isSelected = selectedIcon === icon.value;
            return (
              <TouchableOpacity
                key={icon.value}
                onPress={() => onIconSelect(icon.value)}
                activeOpacity={0.7}
                style={styles.itemContainer}
                accessibilityLabel={`Icône ${icon.name}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={{
                    backgroundColor: isSelected ? selectedColor : COLORS.neutral.gray150,
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: COLORS.neutral.gray300,
                    shadowColor: COLORS.neutral.black,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.25 : 0.1,
                    shadowRadius: 4,
                    elevation: isSelected ? 4 : 2,
                  }}
                >
                  <Ionicons
                    name={icon.value as any}
                    size={24}
                    color={isSelected ? COLORS.neutral.white : COLORS.neutral.grayMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.iconName,
                    isSelected && styles.iconNameSelected,
                  ]}
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
  iconName: {
    fontSize: 12,
    marginTop: 6,
    color: COLORS.neutral.gray500,
    maxWidth: 56,
    textAlign: 'center',
  },
  iconNameSelected: {
    color: COLORS.neutral.gray900,
    fontWeight: '600',
  },
});
