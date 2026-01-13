import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
} from 'react-native';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import DatePickerField from './DatePickerField';

interface MarkAsOpenedModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (openedDate: string, daysAfterOpening: number) => void;
  itemName: string;
}

export default function MarkAsOpenedModal({
  visible,
  onClose,
  onConfirm,
  itemName,
}: MarkAsOpenedModalProps) {
  const [openedDate, setOpenedDate] = useState('');
  const [daysAfterOpening, setDaysAfterOpening] = useState('');

  useEffect(() => {
    if (visible) {
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const year = today.getFullYear();
      setOpenedDate(`${day}/${month}/${year}`);
      setDaysAfterOpening('');
    }
  }, [visible]);

  const handleConfirm = () => {
    if (!openedDate.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une date d\'ouverture');
      return;
    }
    if (!daysAfterOpening.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nombre de jours');
      return;
    }

    const days = parseInt(daysAfterOpening, 10);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Erreur', 'Le nombre de jours doit être positif');
      return;
    }

    onConfirm(openedDate, days);
    setOpenedDate('');
    setDaysAfterOpening('');
  };

  const handleClose = () => {
    setOpenedDate('');
    setDaysAfterOpening('');
    onClose();
  };

  const isValid = openedDate.trim() && daysAfterOpening.trim() && parseInt(daysAfterOpening, 10) > 0;

  return (
    <AnimatedModal
      visible={visible}
      onClose={handleClose}
      position="center"
    >
      <View className="bg-[#F7F5E6] rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-[#3C6E47]/20">
          <PressableScale onPress={handleClose} className="px-3 py-2 rounded-xl">
            <Text className="text-[#3C6E47] font-medium text-base">Annuler</Text>
          </PressableScale>

          <Text className="text-[#3C6E47] font-bold text-lg">Marquer ouvert</Text>

          <PressableScale
            onPress={handleConfirm}
            disabled={!isValid}
            hapticType="medium"
            className="px-3 py-2 rounded-xl"
          >
            <Text className={`font-semibold text-base ${isValid ? 'text-[#3C6E47]' : 'text-[#6A8A6E]'}`}>
              Valider
            </Text>
          </PressableScale>
        </View>

        {/* Content */}
        <View className="p-5">
          {/* Item name */}
          <View className="mb-4 p-3 bg-[#A3C9A8]/30 rounded-2xl">
            <Text className="text-[#3C6E47] font-semibold text-base text-center" numberOfLines={1}>
              {itemName}
            </Text>
          </View>

          {/* Date d'ouverture */}
          <DatePickerField
            label="Date d'ouverture"
            value={openedDate}
            onDateChange={setOpenedDate}
            className="mb-4"
          />

          {/* Jours après ouverture */}
          <View className="flex-row items-center bg-[#A3C9A8] rounded-2xl px-5 py-4 border border-[#3C6E47]/30">
            <Text className="text-[#3C6E47] font-medium text-base flex-1">
              Périmé après
            </Text>
            <View className="flex-row items-center">
              <TextInput
                value={daysAfterOpening}
                onChangeText={setDaysAfterOpening}
                placeholder="0"
                placeholderTextColor="#6A8A6E"
                keyboardType="numeric"
                className="text-[#3C6E47] text-lg font-semibold text-center min-w-[40px]"
                style={{ fontSize: 18 }}
                maxLength={3}
              />
              <Text className="text-[#3C6E47] font-medium text-base ml-1">jours</Text>
            </View>
          </View>

          <Text className="text-[#3C6E47]/50 text-xs text-center mt-3">
            La date d'expiration sera recalculée
          </Text>
        </View>
      </View>
    </AnimatedModal>
  );
}
