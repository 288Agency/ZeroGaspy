// ============================================================================
// ZeroGaspy · screens/ExpiringSoonScreen.tsx (handoff port — "À surveiller")
// ============================================================================
// Liste des aliments qui périment dans ≤7 jours, triés par urgence.
// Tap sur un item → navigate InventoryList de la liste source.
// Port iso-features avec tokens DS v2 + topbar handoff.
// ============================================================================

import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { Sage, Forest } from '@/tokens';
import { Badge } from '@/components/ds';
import { SkeletonExpiringList } from '@/components/Skeleton';
import { loadLists } from '@/utils/localStorage';
import { getDaysUntilExpiration } from '@/utils/dateUtils';
import type { FoodItem } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ExpiringSoon'>;
type ExpiringItem = FoodItem & { listTitle: string; listId: string; daysLeft: number };

function getUrgencyTone(days: number): 'danger' | 'warning' | 'success' {
  if (days <= 1) return 'danger';
  if (days <= 3) return 'warning';
  return 'success';
}

export default function ExpiringSoonScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await loadLists();
      const flat: ExpiringItem[] = [];
      data.forEach((list) => {
        list.items.forEach((item) => {
          const days = getDaysUntilExpiration(item.expirationDate);
          if (
            days !== null &&
            days >= 0 &&
            days <= 7 &&
            (item.status === 'active' || !item.status)
          ) {
            flat.push({ ...item, listTitle: list.title, listId: list.id, daysLeft: days });
          }
        });
      });
      flat.sort((a, b) => a.daysLeft - b.daysLeft);
      setItems(flat);
    } catch (err) {
      logger.error('[ExpiringSoonV2] load failed:', err);
      Alert.alert(t('common.error'), t('inventory.loadError'), [{ text: t('common.ok') }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(false); }, [load]));

  const handleItemPress = useCallback(
    (listId: string, listTitle: string) => {
      navigation.navigate('InventoryList', { listId, listTitle });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ExpiringItem }) => {
      const tone = getUrgencyTone(item.daysLeft);
      const labelDays =
        item.daysLeft === 0
          ? t('common.today')
          : item.daysLeft === 1
          ? t('common.tomorrow')
          : `${item.daysLeft} ${t('common.days')}`;
      return (
        <Pressable
          onPress={() => handleItemPress(item.listId, item.listTitle)}
          accessibilityRole="button"
          accessibilityLabel={item.name}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.subtle,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.itemName, { color: colors.fg.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Badge tone={tone} variant="solid" dot={false}>
              {labelDays}
            </Badge>
          </View>
          {item.expirationDate && (
            <View style={styles.metaRow}>
              <SymbolView name="calendar" size={12} tintColor={colors.fg.tertiary} />
              <Text style={[styles.metaText, { color: colors.fg.tertiary }]}>
                {t('home.expiresOn')} {item.expirationDate}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <SymbolView name="tray.fill" size={12} tintColor={colors.fg.tertiary} />
            <Text style={[styles.metaText, { color: colors.fg.tertiary }]}>
              {t('home.list')} {item.listTitle}
            </Text>
          </View>
          {item.quantity !== undefined && (
            <View style={styles.metaRow}>
              <SymbolView name="number" size={12} tintColor={colors.fg.tertiary} />
              <Text style={[styles.metaText, { color: colors.fg.tertiary }]}>
                {t('home.quantity')} {item.quantity}
              </Text>
            </View>
          )}
          <View style={styles.cardChevron}>
            <SymbolView name="chevron.right" size={14} tintColor={colors.fg.muted} />
          </View>
        </Pressable>
      );
    },
    [colors, handleItemPress, t],
  );

  return (
    <View
      style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}
    >
      {/* Topbar handoff */}
      <View style={styles.topbar}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.topbarBtn,
            { backgroundColor: colors.bg.surface, opacity: pressed ? 0.55 : 1 },
          ]}
        >
          <SymbolView name="chevron.left" size={20} tintColor={colors.fg.primary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.eyebrow, { color: colors.fg.secondary }]}>
            {t('home.expiringEyebrow', { defaultValue: 'À surveiller' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('home.expiringSoonTitle')}
          </Text>
        </View>
      </View>

      {loading ? (
        <SkeletonExpiringList />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.id}-${item.listId}`}
          contentContainerStyle={{
            paddingHorizontal: layout.screenPaddingH,
            paddingTop: 8,
            paddingBottom: 24 + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={Forest[600]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: Sage[100] }]}>
                <SymbolView name="checkmark.circle.fill" size={32} tintColor={Forest[600]} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.fg.primary }]}>
                {t('home.noExpiringSoon')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.fg.secondary }]}>
                {t('home.allGood')}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  topbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  card: {
    position: 'relative',
    borderRadius: 16,
    padding: 14,
    paddingRight: 32,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardChevron: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -7,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 72,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
