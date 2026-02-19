import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

interface UnitSelectorProps {
  selectedUnit: string;
  onUnitSelect: (unit: string) => void;
  style?: any;
}

const UNITS = [
  { value: 'g', label: 'Grammes (g)', icon: 'scale-outline' },
  { value: 'kg', label: 'Kilos (kg)', icon: 'scale-outline' },
  { value: 'mL', label: 'Millilitres (mL)', icon: 'water-outline' },
  { value: 'cL', label: 'Centilitres (cL)', icon: 'water-outline' },
  { value: 'L', label: 'Litres (L)', icon: 'water-outline' },
];

export default function UnitSelector({
  selectedUnit,
  onUnitSelect,
  style,
}: UnitSelectorProps) {
  const [showModal, setShowModal] = useState(false);

  const handleUnitPress = (unit: string) => {
    onUnitSelect(unit);
    setShowModal(false);
  };

  const selectedUnitData = UNITS.find(u => u.value === selectedUnit);
  const displayValue = selectedUnitData?.value || selectedUnit || 'g';

  return (
    <View style={style}>
      <PressableScale
        onPress={() => setShowModal(true)}
        style={styles.trigger}
      >
        <Ionicons
          name={(selectedUnitData?.icon as any) || 'scale-outline'}
          size={20}
          color={COLORS.primary[500]}
        />
        <Text style={styles.triggerText}>
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.text.tertiary} />
      </PressableScale>

      <AnimatedModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        position="center"
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <PressableScale
              onPress={() => setShowModal(false)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Fermer</Text>
            </PressableScale>

            <Text style={styles.headerTitle}>Unité</Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.unitsGrid}>
              {UNITS.map((unit) => (
                <PressableScale
                  key={unit.value}
                  onPress={() => handleUnitPress(unit.value)}
                  hapticType="selection"
                  style={[
                    styles.unitItem,
                    selectedUnit === unit.value
                      ? styles.unitItemSelected
                      : styles.unitItemUnselected,
                  ]}
                >
                  <Ionicons
                    name={unit.icon as any}
                    size={16}
                    color={selectedUnit === unit.value ? COLORS.neutral.white : COLORS.primary[500]}
                  />
                  <Text
                    style={[
                      styles.unitLabel,
                      selectedUnit === unit.value
                        ? styles.unitLabelSelected
                        : styles.unitLabelUnselected,
                    ]}
                  >
                    {unit.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING.lg,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
    minHeight: 56,
  },
  triggerText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: 16,
    marginLeft: SPACING.sm,
    marginRight: SPACING.xs,
  },
  modalContainer: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    overflow: 'hidden',
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  headerButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  headerButtonText: {
    color: COLORS.primary[500],
    fontWeight: '500',
    fontSize: 16,
  },
  headerTitle: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  headerSpacer: {
    width: 64,
  },
  content: {
    padding: SPACING.lg,
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  unitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  unitItemSelected: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  unitItemUnselected: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.4),
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  unitLabel: {
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  unitLabelSelected: {
    color: COLORS.neutral.white,
  },
  unitLabelUnselected: {
    color: COLORS.primary[500],
  },
});
