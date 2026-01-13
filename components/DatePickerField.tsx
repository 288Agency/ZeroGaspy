import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import Calendar from './Calendar';
import { cn } from '../utils/cn';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onDateChange: (date: string) => void;
  className?: string;
  minimumDate?: Date;
}

export default function DatePickerField({
  label,
  value,
  onDateChange,
  className,
  minimumDate,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(dateString);
  };

  const [selectedDate, setSelectedDate] = useState<Date>(parseDate(value));

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateChange(formatDate(date));
    setTimeout(() => setShowPicker(false), 150);
  };

  const displayValue = value || 'JJ/MM/AAAA';

  return (
    <View className={cn('mb-6', className)}>
      <PressableScale
        onPress={() => setShowPicker(true)}
        className="flex-row items-center bg-[#A3C9A8] rounded-2xl px-5 py-4 border border-[#3C6E47]/30 min-h-[60px]"
      >
        <Text className="text-[#3C6E47] font-medium text-base mr-4 flex-1">
          {label}
        </Text>
        <View className="flex-row items-center">
          <Text
            className={cn(
              'text-base font-medium mr-2',
              value ? 'text-[#3C6E47]' : 'text-[#6A8A6E]'
            )}
          >
            {displayValue}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#3C6E47" />
        </View>
      </PressableScale>

      <AnimatedModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        position="center"
      >
        <View className="bg-[#F7F5E6] rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-[#3C6E47]/20">
            <PressableScale
              onPress={() => setShowPicker(false)}
              className="px-3 py-2 rounded-xl"
            >
              <Text className="text-[#3C6E47] font-medium text-base">Annuler</Text>
            </PressableScale>

            <Text className="text-[#3C6E47] font-bold text-lg">{label}</Text>

            <PressableScale
              onPress={() => {
                if (selectedDate) {
                  onDateChange(formatDate(selectedDate));
                  setShowPicker(false);
                }
              }}
              hapticType="medium"
              className="px-3 py-2 rounded-xl"
            >
              <Text className="text-[#3C6E47] font-semibold text-base">OK</Text>
            </PressableScale>
          </View>

          {/* Calendar */}
          <View className="p-3">
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              minimumDate={minimumDate}
            />
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
}
