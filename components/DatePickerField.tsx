import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandIcon } from '@/components/ds';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import Calendar from './Calendar';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onDateChange: (date: string) => void;
  minimumDate?: Date;
}

export default function DatePickerField({
  label,
  value,
  onDateChange,
  minimumDate,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/').map(Number);
      const d = new Date(year, month - 1, day);
      return Number.isNaN(d.getTime()) ? new Date() : d;
    }

    const d = new Date(dateString);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(parseDate(value));

  // Resync si la valeur change depuis l'extérieur (ex. scan OCR date)
  useEffect(() => {
    setSelectedDate(parseDate(value));
  }, [value]);

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
    <View style={[styles.container, !label ? styles.containerNoLabel : null]}>
      <PressableScale
        onPress={() => setShowPicker(true)}
        style={styles.field}
      >
        {!!label && (
          <Text style={styles.label}>
            {label}
          </Text>
        )}
        <View style={[styles.valueRow, !label && styles.valueRowFull]}>
          <Text
            style={[
              styles.valueText,
              { color: value ? COLORS.primary[500] : COLORS.text.tertiary },
            ]}
          >
            {displayValue}
          </Text>
          <BrandIcon name="calendar" size={18} color={COLORS.primary[500]} />
        </View>
      </PressableScale>

      <AnimatedModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        position="center"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <PressableScale
              onPress={() => setShowPicker(false)}
              style={styles.headerButton}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </PressableScale>

            <Text style={styles.headerTitle}>{label || 'Date de péremption'}</Text>

            <PressableScale
              onPress={() => {
                if (selectedDate) {
                  onDateChange(formatDate(selectedDate));
                  setShowPicker(false);
                }
              }}
              hapticType="medium"
              style={styles.headerButton}
            >
              <Text style={styles.okText}>OK</Text>
            </PressableScale>
          </View>

          <View style={styles.calendarContainer}>
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

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING['2xl'],
  },
  containerNoLabel: {
    marginBottom: 18,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary.sage,
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.3),
    minHeight: 60,
  },
  label: {
    color: COLORS.primary[500],
    fontWeight: '500',
    fontSize: 16,
    marginRight: SPACING.lg,
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueRowFull: {
    flex: 1,
    justifyContent: 'space-between',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: SPACING.sm,
  },
  modalContainer: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    overflow: 'hidden',
    ...SHADOWS.xl,
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
    borderRadius: RADIUS.xl,
  },
  cancelText: {
    color: COLORS.primary[500],
    fontWeight: '500',
    fontSize: 16,
  },
  headerTitle: {
    color: COLORS.primary[500],
    fontWeight: '700',
    fontSize: 18,
  },
  okText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: 16,
  },
  calendarContainer: {
    padding: SPACING.md,
  },
});
