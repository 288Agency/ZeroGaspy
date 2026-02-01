import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { cn } from '../utils/cn';

interface UnitSelectorProps {
  selectedUnit: string;
  onUnitSelect: (unit: string) => void;
  className?: string;
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
  className,
}: UnitSelectorProps) {
  const [showModal, setShowModal] = useState(false);

  const handleUnitPress = (unit: string) => {
    onUnitSelect(unit);
    setShowModal(false);
  };

  const selectedUnitData = UNITS.find(u => u.value === selectedUnit);
  const displayValue = selectedUnitData?.value || selectedUnit || 'g';

  return (
    <View className={cn('', className)}>
      <PressableScale
        onPress={() => setShowModal(true)}
        className="flex-row items-center justify-center bg-white rounded-2xl px-4 border-[1.5px] border-[#3C6E47]/20 min-h-[56px]"
      >
        <Ionicons
          name={(selectedUnitData?.icon as any) || 'scale-outline'}
          size={20}
          color="#3C6E47"
        />
        <Text className="text-[#3C6E47] font-semibold text-base ml-2 mr-1">
          {displayValue}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6A8A6E" />
      </PressableScale>

      <AnimatedModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        position="center"
      >
        <View className="bg-[#F7F5E6] rounded-3xl overflow-hidden shadow-2xl max-w-[320px]">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-[#3C6E47]/20">
            <PressableScale
              onPress={() => setShowModal(false)}
              className="px-3 py-2 rounded-xl"
            >
              <Text className="text-[#3C6E47] font-medium text-base">Fermer</Text>
            </PressableScale>

            <Text className="text-[#3C6E47] font-bold text-lg">Unité</Text>

            <View className="w-16" />
          </View>

          {/* Content */}
          <View className="p-4">
            <View className="flex-row flex-wrap gap-2">
              {UNITS.map((unit) => (
                <PressableScale
                  key={unit.value}
                  onPress={() => handleUnitPress(unit.value)}
                  hapticType="selection"
                  className={cn(
                    'flex-row items-center px-3 py-2.5 rounded-xl border',
                    selectedUnit === unit.value
                      ? 'bg-[#3C6E47] border-[#3C6E47]'
                      : 'bg-[#A3C9A8]/40 border-[#3C6E47]/20'
                  )}
                >
                  <Ionicons
                    name={unit.icon as any}
                    size={16}
                    color={selectedUnit === unit.value ? 'white' : '#3C6E47'}
                  />
                  <Text
                    className={cn(
                      'font-medium text-sm ml-1.5',
                      selectedUnit === unit.value ? 'text-white' : 'text-[#3C6E47]'
                    )}
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
