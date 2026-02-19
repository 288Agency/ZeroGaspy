import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { loadLists } from '../utils/localStorage';
import { FoodItem } from '../types';
import { useTranslation } from 'react-i18next';
import Card from '../components/Card';
import logger from '../utils/logger';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ThrownFoodsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [thrownItems, setThrownItems] = useState<Array<FoodItem & { listTitle: string; listId: string; listColor?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadThrownItems = async () => {
    try {
      setLoading(true);
      const data = await loadLists();

      // Récupérer tous les aliments jetés de toutes les listes
      const items: Array<FoodItem & { listTitle: string; listId: string; listColor?: string }> = [];

      data.forEach((list) => {
        list.items.forEach((item) => {
          if (item.status === 'thrown') {
            items.push({
              ...item,
              listTitle: list.title,
              listId: list.id,
              listColor: list.color,
            });
          }
        });
      });

      setThrownItems(items);
    } catch (error) {
      logger.error('Erreur lors du chargement:', error);
      Alert.alert(
        t('common.error'),
        t('home.loadThrownError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadThrownItems();
    }, [])
  );

  const renderItem = ({ item }: { item: FoodItem & { listTitle: string; listId: string; listColor?: string } }) => {
    return (
      <Card variant="elevated" style={styles.cardItem}>
        <View style={styles.itemRow}>
          <View style={styles.itemContent}>
            <View style={styles.nameRow}>
              <Text style={styles.itemName}>
                {item.name}
              </Text>
              <View style={styles.thrownBadge}>
                <Text style={styles.thrownBadgeText}>
                  {t('inventory.throw')}
                </Text>
              </View>
            </View>

            {item.expirationDate && (
              <Text style={styles.itemDetail}>
                {t('inventory.expiresOn')} {item.expirationDate}
              </Text>
            )}

            <Text style={styles.itemDetail}>
              {t('home.list')} {item.listTitle}
            </Text>

            {item.quantity !== undefined && (
              <Text style={styles.itemQuantity}>
                {t('home.quantity')} {item.quantity}
              </Text>
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('home.thrownFoodsTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={thrownItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}-${item.listId}`}
        contentContainerStyle={{ padding: SPACING.xl }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={64} color={COLORS.secondary.sage} />
            <Text style={styles.emptyTitle}>
              {t('home.noThrownItems')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('home.noWasteCongrats')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.primary[500],
    marginTop: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 64,
    paddingBottom: SPACING['2xl'],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  headerSpacer: {
    width: 40,
  },
  cardItem: {
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  thrownBadge: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface.dangerBgMuted,
  },
  thrownBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.danger,
  },
  itemDetail: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    color: COLORS.primary[500],
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
