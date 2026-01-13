import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { cn } from '../utils/cn';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  minimumDate?: Date;
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  minimumDate = new Date(),
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDatePress = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!isDateDisabled(date)) {
      onDateSelect(date);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (number | null)[] = [];

    // Ajouter des cellules vides pour les jours avant le premier jour du mois
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Ajouter tous les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days.map((day, index) => {
      if (day === null) {
        return (
          <View key={index} className="w-[14.28%] aspect-square p-1" />
        );
      }

      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isDisabled = isDateDisabled(date);
      const isToday = isSameDay(date, new Date());

      return (
        <TouchableOpacity
          key={index}
          onPress={() => handleDatePress(day)}
          disabled={isDisabled}
          className={cn(
            'w-[14.28%] aspect-square p-1',
            isDisabled && 'opacity-30'
          )}
          activeOpacity={0.7}
        >
          <View
            className={cn(
              'flex-1 rounded-xl items-center justify-center',
              isSelected
                ? 'bg-[#3C6E47]'
                : isToday
                ? 'bg-[#A3C9A8] border-2 border-[#3C6E47]'
                : 'bg-transparent'
            )}
          >
            <Text
              className={cn(
                'text-base font-medium',
                isSelected
                  ? 'text-white'
                  : isToday
                  ? 'text-[#3C6E47]'
                  : 'text-[#3C6E47]'
              )}
            >
              {day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View className="bg-[#F7F5E6] rounded-2xl p-4">
      {/* En-tête avec navigation */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={goToPreviousMonth}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#A3C9A8]"
          activeOpacity={0.7}
        >
          <Text className="text-[#3C6E47] text-xl font-bold">‹</Text>
        </TouchableOpacity>

        <Text className="text-[#3C6E47] text-xl font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>

        <TouchableOpacity
          onPress={goToNextMonth}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#A3C9A8]"
          activeOpacity={0.7}
        >
          <Text className="text-[#3C6E47] text-xl font-bold">›</Text>
        </TouchableOpacity>
      </View>

      {/* Jours de la semaine */}
      <View className="flex-row mb-2">
        {dayNames.map((day, index) => (
          <View key={index} className="w-[14.28%] items-center">
            <Text className="text-[#3C6E47] text-sm font-semibold">
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Grille du calendrier */}
      <View className="flex-row flex-wrap">
        {renderCalendar()}
      </View>
    </View>
  );
}

