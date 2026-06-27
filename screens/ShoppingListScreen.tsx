// ============================================================================
// ZeroGaspy · screens/ShoppingListScreen.tsx (handoff port — "Courses")
// ============================================================================
// Liste de courses dérivée du MealPlanner + recettes + inventaire.
// Sections : à acheter / déjà en stock. Persist coché via AsyncStorage.
// Port iso-features avec tokens DS v2 + topbar handoff.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage } from '@/tokens';
import { Badge } from '@/components/ds';
import { useAuth } from '@/contexts/AuthContext';
import { Recipe, getAllRecipesWithUser } from '@/services/recipeService';
import { loadLists } from '@/utils/localStorage';
import {
  loadMealPlans,
  loadCheckedShoppingItems,
  saveCheckedShoppingItems,
} from '@/utils/mealPlanStorage';
import { buildShoppingList } from '@/utils/shoppingListBuilder';
import type { FoodItem, ShoppingListItem } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ShoppingList'>;

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export default function ShoppingListScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [plans, lists, recipes, checked] = await Promise.all([
        loadMealPlans(),
        loadLists(),
        getAllRecipesWithUser(user?.id),
        loadCheckedShoppingItems(),
      ]);
      const recipesById = new Map<string, Recipe>();
      recipes.forEach((r) => recipesById.set(r.id, r));
      const inventory: FoodItem[] = lists.flatMap((l) => l.items);
      const checkedSet = new Set(checked);
      setCheckedKeys(checkedSet);
      setItems(buildShoppingList(plans, recipesById, inventory, checkedSet));
    } catch (e) {
      logger.error('[ShoppingListV2] load failed:', e);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleChecked = useCallback(
    async (item: ShoppingListItem) => {
      Haptics.selectionAsync().catch(() => {});
      const key = normalizeKey(item.ingredient);
      const next = new Set(checkedKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setCheckedKeys(next);
      setItems((prev) =>
        prev.map((i) =>
          normalizeKey(i.ingredient) === key ? { ...i, checked: next.has(key) } : i,
        ),
      );
      try {
        await saveCheckedShoppingItems([...next]);
      } catch (e) {
        logger.error('[ShoppingListV2] save failed:', e);
      }
    },
    [checkedKeys],
  );

  const clearChecked = useCallback(() => {
    Alert.alert(
      t('shoppingList.clearConfirmTitle'),
      t('shoppingList.clearConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            setCheckedKeys(new Set());
            await saveCheckedShoppingItems([]);
            await load();
          },
        },
      ],
    );
  }, [t, load]);

  const share = useCallback(async () => {
    const missing = items.filter((i) => !i.inInventory);
    if (missing.length === 0) return;
    const text = `${t('shoppingList.shareHeader')}\n\n${missing.map((m) => `• ${m.ingredient}`).join('\n')}`;
    try {
      await Share.share({ message: text });
    } catch (e) {
      logger.error('[ShoppingListV2] share failed:', e);
    }
  }, [items, t]);

  const sections = useMemo(() => {
    const missing = items.filter((i) => !i.inInventory);
    const inStock = items.filter((i) => i.inInventory);
    const out: { title: string; data: ShoppingListItem[] }[] = [];
    if (missing.length) out.push({ title: t('shoppingList.toBuy'), data: missing });
    if (inStock.length) out.push({ title: t('shoppingList.alreadyHave'), data: inStock });
    return out;
  }, [items, t]);

  const missingCount = useMemo(
    () => items.filter((i) => !i.inInventory && !i.checked).length,
    [items],
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
            {t('shoppingList.eyebrow', { defaultValue: 'À acheter' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('shoppingList.title')}
          </Text>
        </View>
        <Pressable
          onPress={share}
          disabled={items.length === 0}
          accessibilityRole="button"
          accessibilityLabel={t('common.share')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.topbarBtn,
            {
              backgroundColor: colors.bg.surface,
              opacity: items.length === 0 ? 0.35 : pressed ? 0.55 : 1,
            },
          ]}
        >
          <SymbolView
            name="square.and.arrow.up"
            size={20}
            tintColor={items.length === 0 ? colors.fg.muted : Forest[600]}
          />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: Sage[100] }]}>
            <SymbolView name="cart" size={32} tintColor={Forest[600]} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.fg.primary }]}>
            {t('shoppingList.emptyTitle')}
          </Text>
          <Text style={[styles.emptySub, { color: colors.fg.secondary }]}>
            {t('shoppingList.emptyMessage')}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('MealPlanner' as never)}
            style={({ pressed }) => [
              styles.emptyCta,
              { backgroundColor: Forest[600], opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.emptyCtaText}>{t('shoppingList.goToPlanner')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.summary, { paddingHorizontal: layout.screenPaddingH }]}>
            <Text style={[styles.summaryText, { color: colors.fg.secondary }]}>
              {t('shoppingList.missingSummary', { count: missingCount })}
            </Text>
            {checkedKeys.size > 0 && (
              <Pressable onPress={clearChecked} hitSlop={6}>
                <Text style={[styles.clearLink, { color: Forest[600] }]}>
                  {t('shoppingList.clearChecked')}
                </Text>
              </Pressable>
            )}
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.ingredient}
            renderSectionHeader={({ section }) => (
              <Text
                style={[
                  styles.sectionHeader,
                  { color: colors.fg.tertiary, paddingHorizontal: layout.screenPaddingH },
                ]}
              >
                {section.title}
              </Text>
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => toggleChecked(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: colors.bg.surface,
                    borderColor: colors.border.subtle,
                    opacity: item.checked ? 0.55 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: item.checked ? Forest[600] : colors.border.default,
                      backgroundColor: item.checked ? Forest[600] : 'transparent',
                    },
                  ]}
                >
                  {item.checked && <SymbolView name="checkmark" size={12} tintColor="#fff" />}
                </View>
                <Text
                  style={[
                    styles.rowText,
                    {
                      color: colors.fg.primary,
                      textDecorationLine: item.checked ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {item.ingredient}
                </Text>
                {item.inInventory && (
                  <Badge tone="success" variant="soft" dot={false}>
                    {t('shoppingList.inInventory')}
                  </Badge>
                )}
              </Pressable>
            )}
            contentContainerStyle={{
              paddingTop: 4,
              paddingBottom: 24 + insets.bottom,
            }}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </>
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
    gap: 10,
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
    lineHeight: 20,
  },
  emptyCta: {
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 999,
    marginTop: 22,
  },
  emptyCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
