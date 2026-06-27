// ============================================================================
// ZeroGaspy · screens/MealPlannerScreen.tsx (handoff port — "Planificateur")
// ============================================================================
// Planning des repas sur 7 jours, 2 slots/jour (lunch/dinner).
// Tap slot vide → RecipePickerModal. Tap slot rempli → confirm remove.
// CTA Courses si au moins 1 plan posé.
// Port iso-features avec tokens DS v2 + topbar handoff.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage } from '@/tokens';
import { useAuth } from '@/contexts/AuthContext';
import RecipePickerModal from '@/components/RecipePickerModal';
import { Recipe, getAllRecipesWithUser } from '@/services/recipeService';
import {
  loadMealPlans,
  addMealPlan,
  removeMealPlan,
  clearMealPlansBefore,
} from '@/utils/mealPlanStorage';
import type { MealPlanEntry, MealSlot } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MealPlanner'>;
const SLOTS: MealSlot[] = ['lunch', 'dinner'];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

export default function MealPlannerScreen() {
  const { t, i18n } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [plans, setPlans] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ date: string; slot: MealSlot } | null>(null);

  const load = useCallback(async () => {
    try {
      const today = toIsoDate(new Date());
      await clearMealPlansBefore(today);
      const [p, r] = await Promise.all([loadMealPlans(), getAllRecipesWithUser(user?.id)]);
      setPlans(p);
      setRecipes(r);
    } catch (e) {
      logger.error('[MealPlannerV2] load failed:', e);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  const weekDates = useMemo(getWeekDates, []);

  const openPicker = useCallback((date: string, slot: MealSlot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPickerTarget({ date, slot });
    setPickerOpen(true);
  }, []);

  const onSelectRecipe = useCallback(
    async (recipe: Recipe) => {
      if (!pickerTarget) return;
      try {
        await addMealPlan(pickerTarget.date, pickerTarget.slot, recipe.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await load();
      } catch (e) {
        logger.error('[MealPlannerV2] add failed:', e);
        Alert.alert(t('common.error'), t('mealPlan.addError'));
      }
    },
    [pickerTarget, load, t],
  );

  const onRemovePlan = useCallback(
    (entry: MealPlanEntry) => {
      Alert.alert(
        t('mealPlan.removeConfirmTitle'),
        t('mealPlan.removeConfirmMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.remove'),
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMealPlan(entry.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                await load();
              } catch (e) {
                logger.error('[MealPlannerV2] remove failed:', e);
              }
            },
          },
        ],
      );
    },
    [t, load],
  );

  const formatDayLabel = useCallback(
    (d: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
      if (diffDays === 0) return t('mealPlan.today');
      if (diffDays === 1) return t('mealPlan.tomorrow');
      return d.toLocaleDateString(i18n.language, { weekday: 'long' });
    },
    [t, i18n.language],
  );

  const formatDateShort = useCallback(
    (d: Date) => d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
    [i18n.language],
  );

  const totalPlanned = plans.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      {/* Topbar */}
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
            {t('mealPlan.eyebrow', { defaultValue: 'Cette semaine' })}
          </Text>
          <Text style={[styles.title, { color: colors.fg.primary }]}>
            {t('mealPlan.title')}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('ShoppingList' as never)}
          accessibilityRole="button"
          accessibilityLabel={t('mealPlan.shoppingList')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.topbarBtn,
            { backgroundColor: colors.bg.surface, opacity: pressed ? 0.55 : 1 },
          ]}
        >
          <SymbolView name="cart" size={20} tintColor={Forest[600]} />
        </Pressable>
      </View>

      {totalPlanned > 0 && (
        <Pressable
          onPress={() => navigation.navigate('ShoppingList' as never)}
          style={({ pressed }) => [
            styles.ctaBanner,
            {
              backgroundColor: Sage[100],
              marginHorizontal: layout.screenPaddingH,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <SymbolView name="cart" size={16} tintColor={Forest[600]} />
          <Text style={[styles.ctaBannerText, { color: Forest[600] }]}>
            {t('mealPlan.seeShoppingList')}
          </Text>
          <SymbolView name="chevron.right" size={14} tintColor={Forest[600]} />
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 4,
          paddingBottom: 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {weekDates.map((date) => {
          const iso = toIsoDate(date);
          return (
            <View
              key={iso}
              style={[
                styles.dayCard,
                { backgroundColor: colors.bg.surface, borderColor: colors.border.subtle },
              ]}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: colors.fg.primary }]}>
                  {formatDayLabel(date)}
                </Text>
                <Text style={[styles.daySub, { color: colors.fg.tertiary }]}>
                  {formatDateShort(date)}
                </Text>
              </View>
              {SLOTS.map((slot) => {
                const entry = plans.find((p) => p.date === iso && p.slot === slot);
                const recipe = entry ? recipesById.get(entry.recipeId) : null;
                return (
                  <View key={slot} style={styles.slotRow}>
                    <Text style={[styles.slotLabel, { color: colors.fg.secondary }]}>
                      {t(`mealPlan.slot_${slot}`)}
                    </Text>
                    {entry && recipe ? (
                      <Pressable
                        onPress={() => onRemovePlan(entry)}
                        style={({ pressed }) => [
                          styles.filledSlot,
                          { backgroundColor: Sage[100], opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Text style={styles.filledEmoji}>{recipe.imageEmoji}</Text>
                        <Text
                          style={[styles.filledName, { color: colors.fg.primary }]}
                          numberOfLines={1}
                        >
                          {recipe.name}
                        </Text>
                        <SymbolView
                          name="xmark.circle.fill"
                          size={16}
                          tintColor={colors.fg.tertiary}
                        />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => openPicker(iso, slot)}
                        style={({ pressed }) => [
                          styles.emptySlot,
                          {
                            borderColor: colors.border.default,
                            backgroundColor: pressed ? colors.bg.sunken : 'transparent',
                          },
                        ]}
                      >
                        <SymbolView name="plus" size={14} tintColor={Forest[600]} />
                        <Text style={[styles.emptySlotText, { color: Forest[600] }]}>
                          {t('mealPlan.addRecipe')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <RecipePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectRecipe}
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
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  ctaBannerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  dayCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textTransform: 'capitalize',
  },
  daySub: {
    fontSize: 11,
    fontWeight: '500',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: '700',
    width: 56,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptySlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptySlotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filledSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  filledEmoji: {
    fontSize: 18,
  },
  filledName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
