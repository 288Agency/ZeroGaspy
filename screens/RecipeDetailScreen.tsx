// ============================================================================
// ZeroGaspy · screens/RecipeDetailScreen.tsx (handoff port — "Recette")
// ============================================================================
// Port direct de design_handoff_zerogaspy/reference/screens/CookTonight.jsx
// (RecipeDetailScreen lines 108-180).
//
// Structure :
//   1. TopBar       — back · (bookmark + share placeholders)
//   2. Cover hero   — gradient sage→forest + emoji XL + badges + nom recette
//   3. Meta row     — temps · difficulté · portions
//   4. Section ingr — "Ingrédients · N · M en stock" + liste check/cross
//   5. Section étap — "Étapes · N" + steps numérotés avec pastilles accent
//   6. CTA          — pill primary "Commencer" (toast back)
//
// Data : utilise getRecipeById + findMatchingRecipes pour classer chaque
// ingrédient "en stock" (✓) vs "à acheter" (+).
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { Sage, Forest, Cream } from '@/tokens';
import { Badge } from '@/components/ds';
import { loadLists } from '@/utils/localStorage';
import { findMatchingRecipes, getRecipeById, type Recipe } from '@/services/recipeService';
import type { FoodItem } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RecipeDetail'>;
type Rt = RouteProp<RootStackParamList, 'RecipeDetail'>;

// Match string-based fallback si la recette est sous le seuil de findMatchingRecipes.
function inlineMatch(ingredient: string, foodNames: string[]): boolean {
  const ing = ingredient.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  for (const fn of foodNames) {
    const n = fn.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (n === ing) return true;
    // word-boundary substring both ways
    const ingWords = ing.split(/\s+/);
    if (ingWords.some((w) => w && n.split(/\s+/).includes(w))) return true;
    const fnWords = n.split(/\s+/);
    if (fnWords.some((w) => w && ing.split(/\s+/).includes(w))) return true;
  }
  return false;
}

export default function RecipeDetailScreen() {
  const { colors, typography, layout, componentRadius, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      const r = getRecipeById(recipeId);
      setRecipe(r ?? null);
      const lists = await loadLists();
      const flat: FoodItem[] = [];
      for (const l of lists) for (const it of l.items) flat.push(it);
      setItems(flat);
    } catch (err) {
      logger.error('[RecipeDetailV2] refresh failed:', err);
    }
  }, [recipeId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Map ingrédient → en stock (true/false)
  const inStockByIngredient = useMemo<Record<string, boolean>>(() => {
    if (!recipe) return {};
    const matches = findMatchingRecipes(items);
    const myMatch = matches.find((m) => m.recipe.id === recipe.id);
    const map: Record<string, boolean> = {};
    if (myMatch) {
      const matched = new Set(myMatch.matchingIngredients);
      for (const ing of recipe.ingredients) map[ing] = matched.has(ing);
    } else {
      // Fallback : matcher inline (recipe sous le seuil global)
      const foodNames = items
        .filter((it) => it.status !== 'consumed' && it.status !== 'thrown')
        .map((it) => it.name);
      for (const ing of recipe.ingredients) map[ing] = inlineMatch(ing, foodNames);
    }
    return map;
  }, [recipe, items]);

  const inStockCount = useMemo(
    () => Object.values(inStockByIngredient).filter(Boolean).length,
    [inStockByIngredient],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleStart = useCallback(() => {
    // Pas de notion "commencer" en prod → simple goBack pour fermer le détail.
    navigation.goBack();
  }, [navigation]);

  if (!recipe) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
        <TopBar onBack={handleBack} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
            paddingBottom: 80,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: colors.fg.primary,
              textAlign: 'center',
            }}
          >
            Recette introuvable.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      <TopBar onBack={handleBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 8,
          paddingBottom: 30 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Cover hero ───────────────────────────────────────────── */}
        <View
          style={[
            styles.cover,
            {
              borderRadius: componentRadius.card,
              ...elevation[2],
            },
          ]}
        >
          <LinearGradient
            colors={[Sage[300], Forest[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: componentRadius.card }]}
          />
          <Text style={styles.coverEmoji}>{recipe.imageEmoji}</Text>

          <View style={styles.coverTagRow}>
            <Badge tone="success" variant="solid" dot={false}>
              {recipe.preparationTime} min
            </Badge>
          </View>

          <View style={styles.coverTitleWrap}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                letterSpacing: -0.6,
                color: Cream[50],
                textShadowColor: 'rgba(0,0,0,0.25)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4,
              }}
            >
              {recipe.name}
            </Text>
          </View>
        </View>

        {/* ── 2. Meta row ─────────────────────────────────────────────── */}
        <View
          style={[
            styles.metaRow,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.default,
              borderRadius: componentRadius.card,
              marginTop: 12,
              ...elevation[1],
            },
          ]}
        >
          <MetaItem icon="clock" label={`${recipe.preparationTime} min`} />
          <MetaSeparator />
          <MetaItem icon="flame.fill" label={recipe.difficulty} />
          <MetaSeparator />
          <MetaItem icon="person.fill" label="2 pers." />
        </View>

        {/* ── 3. Description (if exists) ──────────────────────────────── */}
        {recipe.description && (
          <Text
            style={[
              typography.body,
              {
                color: colors.fg.secondary,
                marginTop: 16,
                lineHeight: 20,
                letterSpacing: -0.1,
              },
            ]}
          >
            {recipe.description}
          </Text>
        )}

        {/* ── 4. Ingrédients ──────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: colors.fg.secondary }]}>
            INGRÉDIENTS · {recipe.ingredients.length}
          </Text>
          <Text style={[styles.sectionLabel, { color: colors.accent.default }]}>
            {inStockCount} EN STOCK
          </Text>
        </View>

        <View
          style={[
            styles.ingList,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.default,
              borderRadius: componentRadius.card,
            },
          ]}
        >
          {recipe.ingredients.map((ing, i) => {
            const has = inStockByIngredient[ing];
            const isLast = i === recipe.ingredients.length - 1;
            return (
              <View
                key={i}
                style={[
                  styles.ingRow,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                ]}
              >
                <View
                  style={[
                    styles.ingCheck,
                    {
                      backgroundColor: has ? colors.accent.soft : colors.feedback.danger.bg,
                      borderColor: has ? colors.accent.border : colors.feedback.danger.border,
                    },
                  ]}
                >
                  <SymbolView
                    name={has ? 'checkmark' : 'plus'}
                    size={14}
                    tintColor={has ? Forest[700] : colors.feedback.danger.fg}
                  />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: has ? colors.fg.primary : colors.fg.secondary,
                    letterSpacing: -0.1,
                  }}
                >
                  {ing}
                </Text>
                {!has && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.feedback.danger.fg,
                      fontWeight: '500',
                    }}
                  >
                    à acheter
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* ── 5. Étapes ───────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: colors.fg.secondary }]}>
            ÉTAPES · {recipe.instructions.length}
          </Text>
        </View>

        <View
          style={[
            styles.stepsList,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.default,
              borderRadius: componentRadius.card,
            },
          ]}
        >
          {recipe.instructions.map((step, i) => {
            const isLast = i === recipe.instructions.length - 1;
            return (
              <View
                key={i}
                style={[
                  styles.stepRow,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
                ]}
              >
                <View
                  style={[
                    styles.stepNum,
                    { backgroundColor: colors.accent.default },
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    lineHeight: 22,
                    color: colors.fg.primary,
                    letterSpacing: -0.1,
                    paddingTop: 2,
                  }}
                >
                  {step}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── 6. Tips (if any) ────────────────────────────────────────── */}
        {recipe.tips && (
          <View
            style={{
              backgroundColor: colors.feedback.warning.bg,
              borderColor: colors.feedback.warning.border,
              borderWidth: 1,
              borderRadius: componentRadius.card,
              padding: 14,
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <SymbolView name="lightbulb.fill" size={18} tintColor={colors.feedback.warning.fg} />
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 19,
                color: colors.feedback.warning.fg,
                letterSpacing: -0.1,
              }}
            >
              {recipe.tips}
            </Text>
          </View>
        )}

        {/* ── 7. CTA Commencer ────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleStart}
          activeOpacity={0.85}
          style={[
            styles.cta,
            {
              backgroundColor: colors.accent.default,
              borderRadius: radius.full,
              marginTop: 24,
              ...elevation[1],
            },
          ]}
        >
          <SymbolView name="flame.fill" size={18} tintColor="#FFFFFF" />
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              letterSpacing: 0.3,
              marginLeft: 8,
            }}
          >
            Commencer
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Atoms locaux
// ────────────────────────────────────────────────────────────────────────────

function TopBar({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        hitSlop={8}
        style={({ pressed }) => [styles.topbarBtn, { opacity: pressed ? 0.5 : 1 }]}
      >
        <SymbolView name="chevron.left" size={22} tintColor={colors.fg.primary} />
      </Pressable>
      <View style={{ flex: 1 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Favoris"
        hitSlop={8}
        style={({ pressed }) => [styles.topbarBtn, { opacity: pressed ? 0.5 : 1 }]}
      >
        <SymbolView name="bookmark" size={22} tintColor={colors.fg.primary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Partager"
        hitSlop={8}
        style={({ pressed }) => [styles.topbarBtn, { opacity: pressed ? 0.5 : 1 }]}
      >
        <SymbolView name="square.and.arrow.up" size={22} tintColor={colors.fg.primary} />
      </Pressable>
    </View>
  );
}

function MetaItem({
  icon,
  label,
}: {
  icon: 'clock' | 'flame.fill' | 'person.fill';
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaItem}>
      <SymbolView name={icon} size={15} tintColor={colors.fg.secondary} />
      <Text
        style={{
          fontSize: 13,
          color: colors.fg.secondary,
          marginLeft: 6,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function MetaSeparator() {
  const { colors } = useTheme();
  return <View style={[styles.metaSep, { backgroundColor: colors.border.default }]} />;
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  topbarBtn: { padding: 8, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  cover: {
    height: 240,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'space-between',
  },
  coverEmoji: {
    position: 'absolute',
    right: 22,
    bottom: 56,
    fontSize: 110,
    opacity: 0.9,
  },
  coverTagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  coverTitleWrap: {
    marginTop: 'auto',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaSep: {
    width: 1,
    height: 18,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  ingList: {
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  ingCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsList: {
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 14,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cta: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
