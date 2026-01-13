import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';

interface ReceiptScanButtonProps {
  onPress: () => void;
}

export default function ReceiptScanButton({ onPress }: ReceiptScanButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      activeScale={0.98}
      hapticType="light"
      className="flex-row items-center justify-center bg-[#6366F1] rounded-2xl px-6 py-4 shadow-sm"
      accessible={true}
      accessibilityLabel="Scanner un ticket de caisse"
      accessibilityRole="button"
    >
      {/* Icone de scan */}
      <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
        <Ionicons name="receipt-outline" size={24} color="white" />
      </View>

      {/* Texte */}
      <View className="flex-1">
        <Text className="text-white font-semibold text-base">
          Scanner un ticket de caisse
        </Text>
        <Text className="text-white/70 text-sm">
          Ajout auto de plusieurs produits
        </Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
    </PressableScale>
  );
}
