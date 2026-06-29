// ============================================================================
// ZeroGaspy · screens/ListsScreen.tsx (handoff port — "Mes espaces")
// ============================================================================
// Liste des espaces (frigo, garde-manger, etc.) personnels + partagés.
// Tap → InventoryList. Actions par card : partager · supprimer.
// FAB + → CreateList. Paywall + DeferredAuth + ShareListModal préservés.
// Inline create-modal legacy supprimé (code mort — flow utilise CreateList route).
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage } from '@/tokens';
import { Badge, PaywallSheet, DeferredAuthSheet, TAB_BAR_HEIGHT, TAB_BAR_SAFE_PADDING } from '@/components/ds';
import ShareListModal from '@/components/ShareListModal';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePaywallSheetProps } from '@/hooks/usePaywallSheetProps';
import { loadLists, deleteList } from '@/utils/localStorage';
import {
  getSharedListsWithMe,
  getMemberCount,
  SharedListWithMe,
} from '@/services/listSharingService';
import { FREE_LIMITS } from '@/constants/subscription';
import type { List } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Lists'>;

type ListItem =
  | { type: 'personal'; data: List }
  | { type: 'shared'; data: SharedListWithMe };

export default function ListsScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { isPremium } = useSubscription();
  const { user, isLocalMode, signInWithApple } = useAuth();
  const paywallProps = usePaywallSheetProps();

  const [lists, setLists] = useState<List[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedListWithMe[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareTarget, setShareTarget] = useState<{
    id: string;
    title: string;
    color?: string;
  }>({ id: '', title: '' });
  const [authSheetVisible, setAuthSheetVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await loadLists();
      setLists(data);
      if (user && !isLocalMode) {
        try {
          const shared = await getSharedListsWithMe();
          setSharedLists(shared);
          const counts: Record<string, number> = {};
          await Promise.all(
            data.map(async (list) => {
              const count = await getMemberCount(list.id);
              if (count > 1) counts[list.id] = count;
            }),
          );
          setMemberCounts(counts);
        } catch (e) {
          logger.error('[ListsV2] sharing data failed:', e);
        }
      }
    } catch (e) {
      logger.error('[ListsV2] loadData failed:', e);
      Alert.alert(t('common.error'), t('lists.loadError'));
    }
  }, [user, isLocalMode, t]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const handlePressCreate = useCallback(() => {
    if (!isPremium && lists.length >= FREE_LIMITS.MAX_LISTS) {
      setPaywallVisible(true);
      return;
    }
    navigation.navigate('CreateList');
  }, [isPremium, lists.length, navigation]);

  const handleSelect = useCallback(
    (list: List) => {
      navigation.navigate('InventoryList', {
        listId: list.id,
        listTitle: list.title,
        listColor: list.color,
        listIcon: list.icon,
      });
    },
    [navigation],
  );

  const handleSelectShared = useCallback(
    (sl: SharedListWithMe) => {
      navigation.navigate('InventoryList', {
        listId: sl.listId,
        listTitle: sl.listTitle,
        listColor: sl.listColor || undefined,
      });
    },
    [navigation],
  );

  const handleShare = useCallback(
    (list: List) => {
      setShareTarget({ id: list.id, title: list.title, color: list.color });
      if (user && !isLocalMode) {
        setShareModalVisible(true);
      } else {
        setAuthSheetVisible(true);
      }
    },
    [user, isLocalMode],
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert(
        t('lists.deleteList'),
        t('lists.deleteConfirm', { title }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteList(id);
                await loadData();
              } catch (e) {
                logger.error('[ListsV2] delete failed:', e);
                Alert.alert(t('common.error'), t('lists.deleteError'));
              }
            },
          },
        ],
      );
    },
    [t, loadData],
  );

  const allItems: ListItem[] = [
    ...lists.map((l): ListItem => ({ type: 'personal', data: l })),
    ...sharedLists.map((sl): ListItem => ({ type: 'shared', data: sl })),
  ];

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'personal') {
        const list = item.data;
        const accent = list.color || Forest[600];
        return (
          <Pressable
            onPress={() => handleSelect(list)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.bg.surface,
                borderColor: colors.border.subtle,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.accentStripe, { backgroundColor: accent }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardDot, { backgroundColor: accent }]} />
                <Text style={[styles.cardTitle, { color: colors.fg.primary }]} numberOfLines={1}>
                  {list.title}
                </Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.metaText, { color: colors.fg.tertiary }]}>
                  {t('lists.itemsCount', { count: list.items.length })}
                </Text>
                {memberCounts[list.id] > 1 && (
                  <View style={[styles.memberBadge, { backgroundColor: Sage[100] }]}>
                    <SymbolView name="person.2.fill" size={10} tintColor={accent} />
                    <Text style={[styles.memberBadgeText, { color: accent }]}>
                      {memberCounts[list.id]}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                onPress={() => handleShare(list)}
                accessibilityRole="button"
                accessibilityLabel={t('sharing.share')}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.bg.sunken, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <SymbolView name="square.and.arrow.up" size={16} tintColor={accent} />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(list.id, list.title)}
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.bg.sunken, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <SymbolView name="trash" size={16} tintColor={colors.feedback.danger.solid} />
              </Pressable>
            </View>
          </Pressable>
        );
      }

      const sl = item.data;
      const accent = sl.listColor || Forest[600];
      return (
        <Pressable
          onPress={() => handleSelectShared(sl)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.subtle,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.accentStripe, { backgroundColor: accent }]} />
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardDot, { backgroundColor: accent }]} />
              <Text style={[styles.cardTitle, { color: colors.fg.primary }]} numberOfLines={1}>
                {sl.listTitle}
              </Text>
              <Badge tone="info" variant="soft" dot={false}>
                <SymbolView name="person.2.fill" size={9} tintColor={undefined} style={{ marginRight: 3 }} />
                {t('sharing.shared', { defaultValue: 'Partagé' })}
              </Badge>
            </View>
            <View style={styles.cardMeta}>
              {sl.ownerName && (
                <Text style={[styles.metaText, { color: colors.fg.tertiary }]}>
                  {sl.ownerName}
                </Text>
              )}
              {sl.permission === 'view' && (
                <Badge tone="neutral" variant="soft" dot={false}>
                  {t('sharing.readOnly')}
                </Badge>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [colors, t, memberCounts, handleSelect, handleSelectShared, handleShare, handleDelete],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <View style={styles.topbar}>
        {navigation.canGoBack() && (
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
        )}
        <View style={{ flex: 1, marginLeft: navigation.canGoBack() ? 12 : 0 }}>
          <Text style={[styles.eyebrow, { color: colors.fg.secondary }]}>
            {t('lists.eyebrow', { defaultValue: 'Tous tes espaces' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('lists.title')}
          </Text>
        </View>
      </View>

      <FlatList
        data={allItems}
        renderItem={renderItem}
        keyExtractor={(item) =>
          item.type === 'personal' ? item.data.id : item.data.shareId
        }
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 4,
          paddingBottom: TAB_BAR_SAFE_PADDING + insets.bottom,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: Sage[100] }]}>
              <SymbolView
                name="tray.full.fill"
                size={32}
                tintColor={Forest[600]}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.fg.primary }]}>
              {t('lists.emptyLists')}
            </Text>
            <Text style={[styles.emptySub, { color: colors.fg.secondary }]}>
              {t('lists.emptyListsAction')}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB + */}
      <Pressable
        onPress={handlePressCreate}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        accessibilityRole="button"
        accessibilityLabel={t('lists.createNewList')}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: Forest[600],
            bottom: 24 + TAB_BAR_HEIGHT + insets.bottom,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <SymbolView name="plus" size={26} tintColor="#fff" />
      </Pressable>

      <PaywallSheet
        {...paywallProps}
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        trigger="addList"
      />

      <ShareListModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        listId={shareTarget.id}
        listTitle={shareTarget.title}
        listColor={shareTarget.color}
      />

      <DeferredAuthSheet
        visible={authSheetVisible}
        onClose={() => setAuthSheetVisible(false)}
        reason="share"
        onAppleSignIn={async () => {
          const { error } = await signInWithApple();
          if (!error) {
            setAuthSheetVisible(false);
            setShareModalVisible(true);
          }
        }}
        onEmailSignUp={() => {
          setAuthSheetVisible(false);
          navigation.navigate('Register');
        }}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 76,
  },
  accentStripe: {
    width: 5,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
});
