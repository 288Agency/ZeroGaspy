import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';

interface QuantityModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  itemName: string;
  maxQuantity: number;
  actionType: 'consumed' | 'thrown' | 'opened';
}

export default function QuantityModal({
  visible,
  onClose,
  onConfirm,
  itemName,
  maxQuantity,
  actionType,
}: QuantityModalProps) {
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (visible) {
      setQuantity('1');
    }
  }, [visible]);

  const getActionLabel = () => {
    switch (actionType) {
      case 'consumed':
        return 'consommé';
      case 'thrown':
        return 'jeté';
      case 'opened':
        return 'ouvert';
      default:
        return '';
    }
  };

  const getActionColor = () => {
    switch (actionType) {
      case 'consumed':
        return '#3C6E47';
      case 'thrown':
        return '#DC2626';
      case 'opened':
        return '#D97706';
      default:
        return '#3C6E47';
    }
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (actionType) {
      case 'consumed':
        return 'checkmark-circle-outline';
      case 'thrown':
        return 'trash-outline';
      case 'opened':
        return 'open-outline';
      default:
        return 'help-outline';
    }
  };

  const handleConfirm = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      onConfirm(1);
    } else if (qty > maxQuantity) {
      onConfirm(maxQuantity);
    } else {
      onConfirm(qty);
    }
  };

  const incrementQuantity = () => {
    const current = parseInt(quantity, 10) || 0;
    if (current < maxQuantity) {
      setQuantity((current + 1).toString());
    }
  };

  const decrementQuantity = () => {
    const current = parseInt(quantity, 10) || 0;
    if (current > 1) {
      setQuantity((current - 1).toString());
    }
  };

  const setAllQuantity = () => {
    setQuantity(maxQuantity.toString());
  };

  const currentQty = parseInt(quantity, 10) || 0;
  const isValid = currentQty >= 1 && currentQty <= maxQuantity;

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      position="center"
    >
      <View className="bg-[#F7F5E6] rounded-3xl overflow-hidden shadow-2xl mx-6">
        {/* Header */}
        <View className="items-center pt-6 pb-4 px-6">
          <View 
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${getActionColor()}20` }}
          >
            <Ionicons name={getIcon()} size={32} color={getActionColor()} />
          </View>
          <Text className="text-xl font-bold text-[#3C6E47] text-center mb-1">
            Quelle quantité ?
          </Text>
          <Text className="text-sm text-[#6A8A6E] text-center">
            {itemName} • {maxQuantity} disponible{maxQuantity > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Quantity selector */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-center gap-4">
            {/* Decrement button */}
            <PressableScale
              onPress={decrementQuantity}
              disabled={currentQty <= 1}
              className={`w-14 h-14 rounded-2xl items-center justify-center ${
                currentQty <= 1 ? 'bg-gray-200' : 'bg-[#A3C9A8]'
              }`}
              hapticType="light"
            >
              <Ionicons 
                name="remove" 
                size={28} 
                color={currentQty <= 1 ? '#9CA3AF' : '#3C6E47'} 
              />
            </PressableScale>

            {/* Quantity input */}
            <View className="items-center">
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                className="text-4xl font-bold text-[#3C6E47] text-center w-20"
                style={{ fontSize: 40 }}
                maxLength={3}
              />
            </View>

            {/* Increment button */}
            <PressableScale
              onPress={incrementQuantity}
              disabled={currentQty >= maxQuantity}
              className={`w-14 h-14 rounded-2xl items-center justify-center ${
                currentQty >= maxQuantity ? 'bg-gray-200' : 'bg-[#A3C9A8]'
              }`}
              hapticType="light"
            >
              <Ionicons 
                name="add" 
                size={28} 
                color={currentQty >= maxQuantity ? '#9CA3AF' : '#3C6E47'} 
              />
            </PressableScale>
          </View>

          {/* "Tout" button */}
          {maxQuantity > 1 && (
            <PressableScale
              onPress={setAllQuantity}
              className="mt-4 py-2 px-4 rounded-xl bg-[#A3C9A8]/30 self-center"
              hapticType="light"
            >
              <Text className="text-sm font-medium text-[#3C6E47]">
                Tout ({maxQuantity})
              </Text>
            </PressableScale>
          )}
        </View>

        {/* Actions */}
        <View className="px-6 pb-6 pt-2 gap-3">
          {/* Bouton Valider */}
          <PressableScale
            onPress={handleConfirm}
            disabled={!isValid}
            className="py-4 rounded-2xl items-center justify-center flex-row"
            style={{ backgroundColor: isValid ? getActionColor() : '#D1D5DB' }}
            hapticType="medium"
          >
            <Ionicons 
              name={getIcon()} 
              size={20} 
              color="white" 
            />
            <Text className="text-base font-semibold text-white ml-2">
              {currentQty === maxQuantity 
                ? `Tout marquer comme ${getActionLabel()}` 
                : `Marquer ${currentQty} comme ${getActionLabel()}`}
            </Text>
          </PressableScale>

          {/* Bouton Annuler */}
          <PressableScale
            onPress={onClose}
            className="py-3 items-center justify-center"
            hapticType="light"
          >
            <Text className="text-base font-medium text-[#6A8A6E]">
              Annuler
            </Text>
          </PressableScale>
        </View>
      </View>
    </AnimatedModal>
  );
}
