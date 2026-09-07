import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { BrandIcon } from '@/components/ds';
import type { BrandIconName } from '@/tokens/brandIcons';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

interface UnitSelectorProps {
  selectedUnit: string;
  onUnitSelect: (unit: string) => void;
  style?: any;
}

const UNITS: Array<{ value: string; label: string; icon: BrandIconName }> = [
  { value: 'g', label: 'Grammes (g)', icon: 'scales' },
  { value: 'kg', label: 'Kilos (kg)', icon: 'scales' },
  { value: 'mL', label: 'Millilitres (mL)', icon: 'drop' },
  { value: 'cL', label: 'Centilitres (cL)', icon: 'drop' },
  { value: 'L', label: 'Litres (L)', icon: 'drop' },
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
        <BrandIcon
          name={selectedUnitData?.icon ?? 'scales'}
          size={20}
          color={COLORS.primary[500]}
        />
        <Text style={styles.triggerText}>
          {displayValue}
        </Text>
        <BrandIcon name="chevronDown" size={16} color={COLORS.text.tertiary} />
      </PressableScale>

      <AnimatedModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        position="center"
      >
        <View style={styles.modalContainer}>
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
                  <BrandIcon
                    name={unit.icon}
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
