import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import DatePickerField from './DatePickerField';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

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
  const { t } = useTranslation();
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
      Alert.alert(t('common.error'), t('markAsOpened.errorOpenDate'));
      return;
    }
    if (!daysAfterOpening.trim()) {
      Alert.alert(t('common.error'), t('markAsOpened.errorDaysCount'));
      return;
    }

    const days = parseInt(daysAfterOpening, 10);
    if (isNaN(days) || days <= 0) {
      Alert.alert(t('common.error'), t('markAsOpened.errorDaysPositive'));
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
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={handleClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>{t('markAsOpened.cancel')}</Text>
          </PressableScale>

          <Text style={styles.headerTitle}>{t('markAsOpened.title')}</Text>

          <PressableScale
            onPress={handleConfirm}
            disabled={!isValid}
            hapticType="medium"
            style={styles.headerButton}
          >
            <Text style={[styles.validateText, !isValid && styles.validateTextDisabled]}>
              {t('markAsOpened.validate')}
            </Text>
          </PressableScale>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Item name */}
          <View style={styles.itemNameContainer}>
            <Text style={styles.itemNameText} numberOfLines={1}>
              {itemName}
            </Text>
          </View>

          {/* Date d'ouverture */}
          <View style={styles.datePickerWrapper}>
            <DatePickerField
              label={t('markAsOpened.openingDate')}
              value={openedDate}
              onDateChange={setOpenedDate}
            />
          </View>

          {/* Jours après ouverture */}
          <View style={styles.daysRow}>
            <Text style={styles.daysLabel}>
              {t('markAsOpened.expiresAfter')}
            </Text>
            <View style={styles.daysInputRow}>
              <TextInput
                value={daysAfterOpening}
                onChangeText={setDaysAfterOpening}
                placeholder="0"
                placeholderTextColor={COLORS.text.tertiary}
                keyboardType="numeric"
                style={styles.daysInput}
                maxLength={3}
              />
              <Text style={styles.daysUnit}>{t('markAsOpened.days')}</Text>
            </View>
          </View>

          <Text style={styles.helperText}>
            {t('markAsOpened.recalculated')}
          </Text>
        </View>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    overflow: 'hidden',
  },
  header: {
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
  validateText: {
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.primary[500],
  },
  validateTextDisabled: {
    color: COLORS.text.tertiary,
  },
  content: {
    padding: SPACING.xl,
  },
  itemNameContainer: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    borderRadius: RADIUS['2xl'],
  },
  itemNameText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary.sage,
    borderRadius: RADIUS['2xl'],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.3),
  },
  daysLabel: {
    color: COLORS.primary[500],
    fontWeight: '500',
    fontSize: 16,
    flex: 1,
  },
  daysInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysInput: {
    color: COLORS.primary[500],
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 40,
  },
  daysUnit: {
    color: COLORS.primary[500],
    fontWeight: '500',
    fontSize: 16,
    marginLeft: SPACING.xs,
  },
  datePickerWrapper: {
    marginBottom: SPACING.lg,
  },
  helperText: {
    color: hexToRgba(COLORS.primary[500], 0.5),
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
