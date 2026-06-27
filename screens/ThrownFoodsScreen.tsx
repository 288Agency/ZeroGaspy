// ============================================================================
// ZeroGaspy · screens/ThrownFoodsScreen.tsx (handoff port — "Jetés")
// ============================================================================
// Historique des aliments marqués jetés. Lecture seule.
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
import type { FoodItem } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ThrownFoods'>;
type ThrownItem = FoodItem & { listTitle: string; listId: string; listColor?: string };

export default function ThrownFoodsScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ThrownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await loadLists();
      const flat: ThrownItem[] = [];
      data.forEach((list) => {
        list.items.forEach((item) => {
          if (item.status === 'thrown') {
            flat.push({ ...item, listTitle: list.title, listId: list.id, listColor: list.color });
          }
        });
      });
      setItems(flat);
    } catch (err) {
      logger.error('[ThrownFoodsV2] load failed:', err);
      Alert.alert(t('common.error'), t('home.loadThrownError'), [{ text: t('common.ok') }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(false); }, [load]));

  const renderItem = useCallback(
    ({ item }: { item: ThrownItem }) => (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bg.surface,
            borderColor: colors.border.subtle,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.itemName, { color: colors.fg.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Badge tone="danger" variant="soft" dot={false}>
            {t('inventory.throw')}
          </Badge>
        </View>
        {item.expirationDate && (
          <View style={styles.metaRow}>
            <SymbolView name="calendar" size={12} tintColor={colors.fg.tertiary} />
            <Text style={[styles.metaText, { color: colors.fg.tertiary }]}>
              {t('inventory.expiresOn')} {item.expirationDate}
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
      </View>
    ),
    [colors, t],
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
            {t('home.thrownEyebrow', { defaultValue: 'Historique' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('home.thrownFoodsTitle')}
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
                <SymbolView name="leaf.fill" size={32} tintColor={Forest[600]} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.fg.primary }]}>
                {t('home.noThrownItems')}
              </Text>
              <Text style={[styles.emptySub, { color: colors.fg.secondary }]}>
                {t('home.noWasteCongrats')}
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
    borderRadius: 16,
    padding: 14,
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
