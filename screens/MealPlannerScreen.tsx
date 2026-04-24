import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../types/navigation';
import { MealPlanEntry, MealSlot } from '../types';
import { Recipe, getAllRecipesWithUser } from '../services/recipeService';
import { loadMealPlans, addMealPlan, removeMealPlan, clearMealPlansBefore } from '../utils/mealPlanStorage';
import { useAuth } from '../contexts/AuthContext';
import RecipePickerModal from '../components/RecipePickerModal';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../utils/designSystem';
import logger from '../utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [plans, setPlans] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ date: string; slot: MealSlot } | null>(null);

  const load = useCallback(async () => {
    try {
      const today = toIsoDate(new Date());
      await clearMealPlansBefore(today);
      const [p, r] = await Promise.all([
        loadMealPlans(),
        getAllRecipesWithUser(user?.id),
      ]);
      setPlans(p);
      setRecipes(r);
    } catch (e) {
      logger.error('Error loading meal planner:', e);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach(r => map.set(r.id, r));
    return map;
  }, [recipes]);

  const weekDates = useMemo(getWeekDates, []);

  const openPicker = (date: string, slot: MealSlot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerTarget({ date, slot });
    setPickerOpen(true);
  };

  const onSelectRecipe = async (recipe: Recipe) => {
    if (!pickerTarget) return;
    try {
      await addMealPlan(pickerTarget.date, pickerTarget.slot, recipe.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch (e) {
      logger.error('Error adding meal plan:', e);
      Alert.alert(t('common.error'), t('mealPlan.addError'));
    }
  };

  const onRemovePlan = (entry: MealPlanEntry) => {
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await load();
            } catch (e) {
              logger.error('Error removing meal plan:', e);
            }
          },
        },
      ]
    );
  };

  const formatDayLabel = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('mealPlan.today');
    if (diffDays === 1) return t('mealPlan.tomorrow');
    return d.toLocaleDateString(i18n.language, { weekday: 'long' });
  };

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  const headerPaddingTop = Math.max(insets.top, SPACING.lg) + SPACING.sm;

  const totalPlanned = plans.length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary[500]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('mealPlan.title')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ShoppingList' as any)}
          style={styles.iconBtn}
          accessibilityLabel={t('mealPlan.shoppingList')}
        >
          <Ionicons name="cart-outline" size={24} color={COLORS.primary[500]} />
        </TouchableOpacity>
      </View>

      {totalPlanned > 0 && (
        <TouchableOpacity
          style={styles.ctaBanner}
          onPress={() => navigation.navigate('ShoppingList' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="cart" size={18} color={COLORS.primary[500]} />
          <Text style={styles.ctaBannerText}>
            {t('mealPlan.seeShoppingList')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary[500]} />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {weekDates.map((date) => {
          const iso = toIsoDate(date);
          return (
            <View key={iso} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
                <Text style={styles.daySub}>{formatDateShort(date)}</Text>
              </View>
              {SLOTS.map((slot) => {
                const entry = plans.find(p => p.date === iso && p.slot === slot);
                const recipe = entry ? recipesById.get(entry.recipeId) : null;
                return (
                  <View key={slot} style={styles.slotRow}>
                    <Text style={styles.slotLabel}>{t(`mealPlan.slot_${slot}`)}</Text>
                    {entry && recipe ? (
                      <TouchableOpacity
                        style={styles.filledSlot}
                        onPress={() => onRemovePlan(entry)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.filledEmoji}>{recipe.imageEmoji}</Text>
                        <Text style={styles.filledName} numberOfLines={1}>
                          {recipe.name}
                        </Text>
                        <Ionicons name="close-circle" size={18} color={COLORS.text.tertiary} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.emptySlot}
                        onPress={() => openPicker(iso, slot)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={18} color={COLORS.primary[500]} />
                        <Text style={styles.emptySlotText}>{t('mealPlan.addRecipe')}</Text>
                      </TouchableOpacity>
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
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary[50],
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  ctaBannerText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary[500],
    fontWeight: '600',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  dayCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.xs,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  dayLabel: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    textTransform: 'capitalize',
  },
  daySub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  slotLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
    width: 60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptySlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.neutral.grayBorder,
  },
  emptySlotText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  filledSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary[50],
    borderRadius: RADIUS.lg,
  },
  filledEmoji: {
    fontSize: 20,
  },
  filledName: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
  },
});
