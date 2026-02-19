import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { loadLists } from '../utils/localStorage';
import { List, FoodItem } from '../types';
import Card from '../components/Card';
import ExpirationBadge from '../components/ExpirationBadge';
import logger from '../utils/logger';
import { COLORS, SPACING, RADIUS } from '../utils/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ExpiringSoonScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [lists, setLists] = useState<List[]>([]);
  const [expiringItems, setExpiringItems] = useState<Array<FoodItem & { listTitle: string; listId: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Fonction pour calculer les jours jusqu'à expiration
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

  const loadExpiringItems = async () => {
    try {
      setLoading(true);
      const data = await loadLists();
      setLists(data);

      // Récupérer tous les aliments bientôt périmés (≤ 7 jours) de toutes les listes
      const items: Array<FoodItem & { listTitle: string; listId: string }> = [];

      data.forEach((list) => {
        list.items.forEach((item) => {
          const days = getDaysUntilExpiration(item.expirationDate);
          if (
            days !== null &&
            days >= 0 &&
            days <= 7 &&
            (item.status === 'active' || !item.status)
          ) {
            items.push({
              ...item,
              listTitle: list.title,
              listId: list.id,
            });
          }
        });
      });

      // Trier par date d'expiration (les plus urgents en premier)
      items.sort((a, b) => {
        const daysA = getDaysUntilExpiration(a.expirationDate) || 999;
        const daysB = getDaysUntilExpiration(b.expirationDate) || 999;
        return daysA - daysB;
      });

      setExpiringItems(items);
    } catch (error) {
      logger.error('Error loading expiring items:', error);
      Alert.alert(
        t('common.error'),
        t('inventory.loadError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadExpiringItems();
    }, [])
  );

  const handleItemPress = (listId: string, listTitle: string) => {
    navigation.navigate('InventoryList', { listId, listTitle });
  };

  const renderItem = ({ item }: { item: FoodItem & { listTitle: string; listId: string } }) => {
    const days = getDaysUntilExpiration(item.expirationDate);

    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item.listId, item.listTitle)}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Card variant="elevated" style={styles.cardItem}>
          <View style={styles.itemRow}>
            <View style={styles.itemContent}>
              <Text style={styles.itemName}>
                {item.name}
              </Text>

              <View style={styles.badgeRow}>
                <ExpirationBadge expirationDate={item.expirationDate} />
              </View>

              <Text style={styles.itemDate}>
                {t('home.expiresOn')} {item.expirationDate}
                {days !== null && days >= 0 && (
                  <Text style={styles.itemDateBold}>
                    {' '}({days === 0 ? t('common.today') : days === 1 ? t('common.tomorrow') : `${days} ${t('common.days')}`})
                  </Text>
                )}
              </Text>

              <Text style={styles.itemList}>
                {t('home.list')} {item.listTitle}
              </Text>

              {item.quantity !== undefined && (
                <Text style={styles.itemQuantity}>
                  {t('home.quantity')} {item.quantity}
                </Text>
              )}
            </View>

            <Ionicons name="chevron-forward" size={24} color={COLORS.primary[500]} />
          </View>
        </Card>
      </TouchableOpacity>
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
          {t('home.expiringSoonTitle')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={expiringItems}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}-${item.listId}`}
        contentContainerStyle={{ padding: SPACING.xl }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.secondary.sage} />
            <Text style={styles.emptyTitle}>
              {t('home.noExpiringSoon')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('home.allGood')}
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
    justifyContent: 'space-between',
  },
  itemContent: {
    flex: 1,
    marginRight: SPACING.lg,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  itemDate: {
    fontSize: 14,
    color: COLORS.primary[500],
    marginBottom: SPACING.xs,
  },
  itemDateBold: {
    fontWeight: '600',
  },
  itemList: {
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
