import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

interface ExpirationBadgeProps {
  expirationDate: string;
  style?: ViewStyle;
}

export default function ExpirationBadge({
  expirationDate,
  style,
}: ExpirationBadgeProps) {
  const { t } = useTranslation();
  const getDaysUntilExpiration = (dateString: string): number | null => {
    try {
      const [day, month, year] = dateString.split('/').map(Number);
      const expiration = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiration.setHours(0, 0, 0, 0);

      const diffTime = expiration.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch {
      return null;
    }
  };

  const days = getDaysUntilExpiration(expirationDate);

  const getBadgeStyle = (): ViewStyle => {
    if (days === null) {
      return { backgroundColor: COLORS.neutral.gray200 };
    }
    if (days < 0) {
      return { backgroundColor: COLORS.semantic.danger };
    }
    if (days <= 3) {
      return { backgroundColor: COLORS.semantic.warningDark };
    }
    if (days <= 7) {
      return { backgroundColor: COLORS.semantic.warning };
    }
    return { backgroundColor: COLORS.semantic.success };
  };

  const getTextColor = (): string => {
    if (days === null) {
      return COLORS.neutral.gray700;
    }
    return COLORS.neutral.white;
  };

  const getLabel = () => {
    if (days === null) {
      return t('inventory.invalidDate');
    }
    if (days < 0) {
      return t('inventory.expiredDays', { count: Math.abs(days) });
    }
    if (days === 0) {
      return t('inventory.expiresToday');
    }
    if (days === 1) {
      return t('inventory.expiresTomorrow');
    }
    if (days <= 7) {
      return t('common.day', { count: days });
    }
    return expirationDate;
  };

  return (
    <View
      style={[styles.badge, getBadgeStyle(), style]}
    >
      <Text
        style={[styles.text, { color: getTextColor() }]}
      >
        {getLabel()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
