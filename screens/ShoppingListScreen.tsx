import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../types/navigation';
import { FoodItem, ShoppingListItem } from '../types';
import { Recipe, getAllRecipesWithUser } from '../services/recipeService';
import { loadLists } from '../utils/localStorage';
import { loadMealPlans, loadCheckedShoppingItems, saveCheckedShoppingItems } from '../utils/mealPlanStorage';
import { buildShoppingList } from '../utils/shoppingListBuilder';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../utils/designSystem';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function normalizeKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export default function ShoppingListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
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
      recipes.forEach(r => recipesById.set(r.id, r));
      const inventory: FoodItem[] = lists.flatMap(l => l.items);
      const checkedSet = new Set(checked);
      setCheckedKeys(checkedSet);
      const built = buildShoppingList(plans, recipesById, inventory, checkedSet);
      setItems(built);
    } catch (e) {
      logger.error('Error loading shopping list:', e);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleChecked = async (item: ShoppingListItem) => {
    Haptics.selectionAsync();
    const key = normalizeKey(item.ingredient);
    const next = new Set(checkedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setCheckedKeys(next);
    setItems(prev =>
      prev.map(i => (normalizeKey(i.ingredient) === key ? { ...i, checked: next.has(key) } : i))
    );
    try {
      await saveCheckedShoppingItems([...next]);
    } catch (e) {
      logger.error('Error saving checked state:', e);
    }
  };

  const clearChecked = () => {
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
      ]
    );
  };

  const share = async () => {
    const missing = items.filter(i => !i.inInventory);
    if (missing.length === 0) return;
    const text = `${t('shoppingList.shareHeader')}\n\n${missing.map(m => `• ${m.ingredient}`).join('\n')}`;
    try {
      await Share.share({ message: text });
    } catch (e) {
      logger.error('Error sharing shopping list:', e);
    }
  };

  const sections = useMemo(() => {
    const missing = items.filter(i => !i.inInventory);
    const inStock = items.filter(i => i.inInventory);
    const out: { title: string; data: ShoppingListItem[] }[] = [];
    if (missing.length) out.push({ title: t('shoppingList.toBuy'), data: missing });
    if (inStock.length) out.push({ title: t('shoppingList.alreadyHave'), data: inStock });
    return out;
  }, [items, t]);

  const headerPaddingTop = Math.max(insets.top, SPACING.lg) + SPACING.sm;
  const missingCount = items.filter(i => !i.inInventory && !i.checked).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shoppingList.title')}</Text>
        <TouchableOpacity
          onPress={share}
          style={styles.iconBtn}
          disabled={items.length === 0}
          accessibilityLabel={t('common.share')}
        >
          <Ionicons name="share-outline" size={24} color={items.length === 0 ? COLORS.neutral.grayDisabled : COLORS.primary[500]} />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={64} color={COLORS.text.tertiary} />
          <Text style={styles.emptyTitle}>{t('shoppingList.emptyTitle')}</Text>
          <Text style={styles.emptyMessage}>{t('shoppingList.emptyMessage')}</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => navigation.navigate('MealPlanner' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyCtaText}>{t('shoppingList.goToPlanner')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {t('shoppingList.missingSummary', { count: missingCount })}
            </Text>
            {checkedKeys.size > 0 && (
              <TouchableOpacity onPress={clearChecked}>
                <Text style={styles.clearLink}>{t('shoppingList.clearChecked')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.ingredient}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, item.checked && styles.rowChecked]}
                onPress={() => toggleChecked(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                  {item.checked && (
                    <Ionicons name="checkmark" size={14} color={COLORS.neutral.white} />
                  )}
                </View>
                <Text style={[styles.rowText, item.checked && styles.rowTextChecked]}>
                  {item.ingredient}
                </Text>
                {item.inInventory && (
                  <View style={styles.inventoryBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={COLORS.semantic.success} />
                    <Text style={styles.inventoryBadgeText}>{t('shoppingList.inInventory')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[500],
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  summaryText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  clearLink: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.neutral.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xs,
    ...SHADOWS.xs,
  },
  rowChecked: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  rowText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    flex: 1,
  },
  rowTextChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.text.tertiary,
  },
  inventoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surface.successBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  inventoryBadgeText: {
    fontSize: 10,
    color: COLORS.semantic.success,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  emptyCta: {
    backgroundColor: COLORS.primary[500],
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING['2xl'],
    borderRadius: RADIUS.lg,
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  emptyCtaText: {
    color: COLORS.neutral.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
