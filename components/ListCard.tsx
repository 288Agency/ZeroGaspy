import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import IndicatorBadge from './IndicatorBadge';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/designSystem';

interface ListCardProps {
  list: List;
  urgentCount?: number;
  variant?: 'default' | 'featured';
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ListCard({
  list,
  urgentCount = 0,
  variant = 'default',
}: ListCardProps) {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    navigation.navigate('InventoryList', {
      listId: list.id,
      listTitle: list.title,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.featuredTouchable}
        accessible={true}
        accessibilityLabel={`Liste ${list.title} avec ${list.items.length} aliment${list.items.length > 1 ? 's' : ''}`}
        accessibilityRole="button"
      >
        <View style={styles.featuredCard}>
          <View style={styles.featuredHeader}>
            <View style={styles.flex1}>
              <Text style={styles.featuredTitle}>
                {list.title}
              </Text>
              <Text style={styles.featuredSubtitle}>
                Créée le {formatDate(list.createdAt)}
              </Text>
            </View>
            {urgentCount > 0 && (
              <IndicatorBadge count={urgentCount} variant="danger" />
            )}
          </View>

          <View style={styles.featuredFooter}>
            <View style={styles.rowCenter}>
              <View style={styles.dot} />
              <Text style={styles.featuredItemCount}>
                {list.items.length} aliment{list.items.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.viewLink}>
              Voir →
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.defaultTouchable}
      accessible={true}
      accessibilityLabel={`Liste ${list.title} avec ${list.items.length} aliment${list.items.length > 1 ? 's' : ''}`}
      accessibilityRole="button"
    >
      <View style={styles.defaultCard}>
        <View style={styles.defaultRow}>
          <View style={styles.defaultTextContainer}>
            <Text style={styles.defaultTitle}>
              {list.title}
            </Text>
            <Text style={styles.defaultSubtitle}>
              {list.items.length} aliment{list.items.length > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.rowCenter}>
            {urgentCount > 0 && (
              <IndicatorBadge count={urgentCount} variant="warning" size="sm" style={styles.badgeMargin} />
            )}
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Featured variant
  featuredTouchable: {
    marginBottom: SPACING.lg,
  },
  featuredCard: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray100,
    ...SHADOWS.lg,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  flex1: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral.gray900,
    marginBottom: SPACING.xs,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: COLORS.neutral.gray500,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.gray100,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary[500],
    marginRight: SPACING.sm,
  },
  featuredItemCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.gray700,
  },
  viewLink: {
    color: COLORS.primary[500],
    fontWeight: '500',
  },

  // Default variant
  defaultTouchable: {
    marginBottom: SPACING.md,
  },
  defaultCard: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['2xl'],
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray100,
    ...SHADOWS.sm,
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultTextContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  defaultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.neutral.gray900,
    marginBottom: SPACING.xs,
  },
  defaultSubtitle: {
    fontSize: 14,
    color: COLORS.neutral.gray500,
  },
  badgeMargin: {
    marginRight: SPACING.sm,
  },
  chevron: {
    color: COLORS.neutral.gray400,
    fontSize: 18,
  },
});
