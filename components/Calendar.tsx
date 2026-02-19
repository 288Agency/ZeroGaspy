import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

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
          <View key={index} style={styles.dayCell} />
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
          style={[styles.dayCell, isDisabled && styles.dayCellDisabled]}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.dayInner,
              isSelected && styles.dayInnerSelected,
              isToday && !isSelected && styles.dayInnerToday,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                isSelected && styles.dayTextSelected,
                (isToday && !isSelected) && styles.dayTextToday,
              ]}
            >
              {day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* En-tête avec navigation */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>

        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Jours de la semaine */}
      <View style={styles.weekRow}>
        {dayNames.map((day, index) => (
          <View key={index} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Grille du calendrier */}
      <View style={styles.calendarGrid}>
        {renderCalendar()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary.sage,
  },
  navButtonText: {
    color: COLORS.primary[500],
    fontSize: 20,
    fontWeight: '700',
  },
  monthTitle: {
    color: COLORS.primary[500],
    fontSize: 20,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekDayCell: {
    width: '14.28%' as any,
    alignItems: 'center',
  },
  weekDayText: {
    color: COLORS.primary[500],
    fontSize: 14,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%' as any,
    aspectRatio: 1,
    padding: SPACING.xs,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayInner: {
    flex: 1,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: {
    backgroundColor: COLORS.primary[500],
  },
  dayInnerToday: {
    backgroundColor: COLORS.secondary.sage,
    borderWidth: 2,
    borderColor: COLORS.primary[500],
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary[500],
  },
  dayTextSelected: {
    color: COLORS.neutral.white,
  },
  dayTextToday: {
    color: COLORS.primary[500],
  },
});
