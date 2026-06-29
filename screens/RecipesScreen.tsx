// ============================================================================
// ZeroGaspy · screens/RecipesScreen.tsx (handoff port — "Recettes")
// ============================================================================
// Port iso-features de l'ancienne RecipesScreen vers les tokens DS v2.
//
// Structure handoff (tab top-level, pas de back) :
//   1. TopBar         — eyebrow "Idées du jour" + titre "Cuisiner"
//                       actions droite : ✨ (IA premium) · + (add recipe)
//   2. Stats pill     — "N ingrédients · M recettes" inline sous le titre
//   3. Filtres chips  — scroll horizontal (8 catégories + Mes + Toutes)
//   4. Tri segment    — Anti-gaspi ↔ Best match (segment control unifié)
//   5. PremiumTeaser  — uniquement non-Premium quand suggested > limit
//   6. Liste recettes — RecipeCard (cover gradient sage→forest + meta row)
//   7. Empty state    — ChefIllustration + CTA contextuel
//   8. Modals         — AddRecipeModal · PaywallSheet · RecipeOnboardingModal
//
// Tap recette → navigation('RecipeDetail', { recipeId })  [PLUS DE MODAL INTERNE]
// Long-press recette user → confirm delete
// Tap ✨ → si non-premium → paywall ; si premium → confirm → generate → save
//         → reload → navigate RecipeDetail (la recette IA est persistée)
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/contexts/ThemeContext';
import { Sage, Forest, Cream } from '@/tokens';
import { Badge, PaywallSheet, TAB_BAR_SAFE_PADDING } from '@/components/ds';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePaywallSheetProps } from '@/hooks/usePaywallSheetProps';
import AddRecipeModal from '@/components/AddRecipeModal';
import RecipeOnboardingModal, { RECIPE_ONBOARDING_KEY } from '@/components/RecipeOnboardingModal';
import { loadLists } from '@/utils/localStorage';
import {
  findMatchingRecipesWithUser,
  deleteUserRecipe,
  addUserRecipe,
  type RecipeMatch,
  type Recipe,
} from '@/services/recipeService';
import { generateAIRecipe } from '@/services/aiRecipeService';
import { getDaysUntilExpiration } from '@/utils/dateUtils';
import { trackRecipeViewed as analyticsTrackRecipeViewed } from '@/services/analytics';
import type { FoodItem, List } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Recipes'>;
type Rt = RouteProp<RootStackParamList, 'Recipes'>;

type FilterKey = 'all' | 'user' | Recipe['category'];
type SortMode = 'antiWaste' | 'bestMatch';

const FREE_SUGGESTED_LIMIT = 2;

// ────────────────────────────────────────────────────────────────────────────
// Mapping catégorie → icône SF Symbol + couleur d'accent
// ────────────────────────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<Recipe['category'], SFSymbol> = {
  'petit-déjeuner': 'sun.max.fill',
  'plat':           'fork.knife',
  'entrée':         'leaf.fill',
  'dessert':        'birthday.cake.fill',
  'snack':          'cup.and.saucer.fill',
  'boisson':        'wineglass.fill',
};

const CATEGORY_TONE: Record<Recipe['category'], 'success' | 'warning' | 'info' | 'reward' | 'neutral'> = {
  'petit-déjeuner': 'reward',
  'plat':           'warning',
  'entrée':         'success',
  'dessert':        'info',
  'snack':          'neutral',
  'boisson':        'info',
};

const DIFFICULTY_DOTS: Record<Recipe['difficulty'], number> = {
  facile: 1,
  moyen: 2,
  difficile: 3,
};

// ============================================================================
// Composant principal
// ============================================================================

export default function RecipesScreen() {
  const { t } = useTranslation();
  const { colors, layout } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const highlightIngredient = route.params?.ingredient;

  const { user } = useAuth();
  const { trackRecipeViewed } = useGamification();
  const { isPremium } = useSubscription();
  const paywallProps = usePaywallSheetProps();

  const [lists, setLists] = useState<List[]>([]);
  const [recipeMatches, setRecipeMatches] = useState<RecipeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');
  const [sortMode, setSortMode] = useState<SortMode>('antiWaste');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showRecipeOnboarding, setShowRecipeOnboarding] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Animations ──────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ── Onboarding au premier passage ────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(RECIPE_ONBOARDING_KEY).then((value) => {
      if (value !== 'true') setShowRecipeOnboarding(true);
    });
  }, []);

  // ── Data load ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const data = await loadLists();
      setLists(data);
      const allFoodItems: FoodItem[] = data.flatMap((l) => l.items);
      const matches = await findMatchingRecipesWithUser(allFoodItems, user?.id);
      setRecipeMatches(matches);
    } catch (error) {
      logger.error('[RecipesV2] loadData failed:', error);
      Alert.alert(t('common.error'), t('recipes.loadError'), [{ text: t('common.ok') }]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, t]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }, [loadData]);

  // ── Dérivés ──────────────────────────────────────────────────────────────
  const userRecipes = useMemo(
    () => recipeMatches.filter((m) => m.recipe.isUserRecipe),
    [recipeMatches],
  );
  const suggestedRecipes = useMemo(
    () => recipeMatches.filter((m) => !m.recipe.isUserRecipe),
    [recipeMatches],
  );
  const freeSuggestedRecipes = useMemo(
    () => suggestedRecipes.slice(0, FREE_SUGGESTED_LIMIT),
    [suggestedRecipes],
  );
  const availableMatches = useMemo(
    () => (isPremium ? recipeMatches : [...userRecipes, ...freeSuggestedRecipes]),
    [isPremium, recipeMatches, userRecipes, freeSuggestedRecipes],
  );

  const categoryFiltered = useMemo<RecipeMatch[]>(() => {
    if (selectedFilter === 'all') return availableMatches;
    if (selectedFilter === 'user') return userRecipes;
    return availableMatches.filter((m) => m.recipe.category === selectedFilter);
  }, [selectedFilter, availableMatches, userRecipes]);

  const filteredMatches = useMemo<RecipeMatch[]>(() => {
    const ingredientLower = highlightIngredient?.toLowerCase();
    const matchesIngredient = (m: RecipeMatch) =>
      !!ingredientLower &&
      m.matchingIngredients.some(
        (ing) =>
          ing.toLowerCase().includes(ingredientLower) ||
          ingredientLower.includes(ing.toLowerCase()),
      );

    return [...categoryFiltered].sort((a, b) => {
      if (ingredientLower) {
        const aMatch = matchesIngredient(a) ? 1 : 0;
        const bMatch = matchesIngredient(b) ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;
      }
      if (sortMode === 'antiWaste') {
        return b.urgencyScore - a.urgencyScore || b.matchPercentage - a.matchPercentage;
      }
      return b.matchPercentage - a.matchPercentage;
    });
  }, [categoryFiltered, sortMode, highlightIngredient]);

  const totalIngredients = useMemo(
    () =>
      lists.reduce((sum, list) => {
        return sum + list.items.filter((it) => it.status !== 'consumed' && it.status !== 'thrown').length;
      }, 0),
    [lists],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRecipePress = useCallback(
    (match: RecipeMatch) => {
      trackRecipeViewed();
      analyticsTrackRecipeViewed(match.recipe.id);
      navigation.navigate('RecipeDetail', { recipeId: match.recipe.id });
    },
    [navigation, trackRecipeViewed],
  );

  const handleRecipeLongPress = useCallback(
    (match: RecipeMatch) => {
      if (!match.recipe.isUserRecipe) return;
      Alert.alert(
        match.recipe.name,
        t('recipes.whatToDo'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              // Optimistic update
              setRecipeMatches((prev) => prev.filter((m) => m.recipe.id !== match.recipe.id));
              const success = await deleteUserRecipe(match.recipe.id, user?.id);
              if (!success) {
                setRecipeMatches((prev) => [...prev, match]);
                Alert.alert(t('common.error'), t('recipes.deleteError'));
              }
            },
          },
        ],
      );
    },
    [t, user?.id],
  );

  const handleGenerateAIRecipe = useCallback(async () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }

    const expiringItems = lists
      .flatMap((l) => l.items)
      .filter((item) => {
        if (item.status !== 'active' || !item.expirationDate) return false;
        const days = getDaysUntilExpiration(item.expirationDate as string);
        return days !== null && days <= 7;
      })
      .map((item) => item.name)
      .slice(0, 8);

    if (expiringItems.length === 0) {
      Alert.alert(t('recipes.aiNoIngredients'), t('recipes.aiNoIngredientsHint'));
      return;
    }

    setAiGenerating(true);
    try {
      const result = await generateAIRecipe(expiringItems);
      if (!result) {
        Alert.alert(t('common.error'), t('recipes.aiError'));
        return;
      }
      // Persiste la recette IA dans la collection user (l'utilisateur la garde)
      const persisted = await addUserRecipe(
        {
          name: result.recipe.name,
          description: result.recipe.description,
          ingredients: result.recipe.ingredients,
          preparationTime: result.recipe.preparationTime,
          difficulty: result.recipe.difficulty,
          category: result.recipe.category,
          imageEmoji: result.recipe.imageEmoji,
          instructions: result.recipe.instructions,
          tips: result.recipe.tips,
          tags: result.recipe.tags,
        },
        user?.id,
      );
      await loadData();
      navigation.navigate('RecipeDetail', { recipeId: persisted.id });
    } catch (err) {
      logger.error('[RecipesV2] AI generate failed:', err);
      Alert.alert(t('common.error'), t('recipes.aiError'));
    } finally {
      setAiGenerating(false);
    }
  }, [isPremium, lists, t, user?.id, loadData, navigation]);

  // ── Filters config ───────────────────────────────────────────────────────
  const filters: Array<{ key: FilterKey; label: string; icon: SFSymbol }> = useMemo(
    () => [
      { key: 'all', label: t('recipes.all'), icon: 'square.grid.2x2.fill' },
      { key: 'user', label: t('recipes.myRecipes'), icon: 'person.fill' },
      { key: 'petit-déjeuner', label: t('recipes.breakfast'), icon: 'sun.max.fill' },
      { key: 'plat', label: t('recipes.mainDishes'), icon: 'fork.knife' },
      { key: 'entrée', label: t('recipes.starters'), icon: 'leaf.fill' },
      { key: 'dessert', label: t('recipes.desserts'), icon: 'birthday.cake.fill' },
      { key: 'snack', label: t('recipes.snacks'), icon: 'cup.and.saucer.fill' },
      { key: 'boisson', label: t('recipes.drinks'), icon: 'wineglass.fill' },
    ],
    [t],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas, paddingTop: insets.top }]}>
      <TopBar
        onAI={handleGenerateAIRecipe}
        aiLoading={aiGenerating}
        isPremium={isPremium}
        onAdd={() => setAddModalVisible(true)}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Hero header texte */}
        <View style={[styles.heroBlock, { paddingHorizontal: layout.screenPaddingH }]}>
          <Text style={[styles.eyebrow, { color: colors.fg.secondary }]}>
            {t('recipes.eyebrow', { defaultValue: 'Idées du jour' })}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.fg.primary }]}>
            {t('recipes.ideasTitle')}
          </Text>
          <StatsPill
            ingredients={totalIngredients}
            recipesCount={
              isPremium ? recipeMatches.length : availableMatches.length
            }
          />
        </View>

        {/* Filtres */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={[styles.filtersContent, { paddingHorizontal: layout.screenPaddingH }]}
        >
          {filters.map((f) => (
            <FilterChip
              key={f.key}
              icon={f.icon}
              label={f.label}
              active={selectedFilter === f.key}
              onPress={() => setSelectedFilter(f.key)}
            />
          ))}
        </ScrollView>

        {/* Tri segment */}
        <View style={[styles.sortRow, { paddingHorizontal: layout.screenPaddingH }]}>
          <SortSegment mode={sortMode} onChange={setSortMode} />
        </View>

        {/* Liste */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: layout.screenPaddingH,
            paddingTop: 8,
            paddingBottom: TAB_BAR_SAFE_PADDING + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Forest[600]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {!isPremium &&
            suggestedRecipes.length > FREE_SUGGESTED_LIMIT &&
            selectedFilter !== 'user' && (
              <PremiumTeaser
                suggestedCount={suggestedRecipes.length - FREE_SUGGESTED_LIMIT}
                onPress={() => setShowPaywall(true)}
              />
            )}

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Forest[600]} />
            </View>
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <RecipeCard
                key={match.recipe.id}
                match={match}
                onPress={() => handleRecipePress(match)}
                onLongPress={() => handleRecipeLongPress(match)}
                highlightIngredient={highlightIngredient}
              />
            ))
          ) : selectedFilter !== 'all' && availableMatches.length > 0 ? (
            <EmptyState
              title={t('recipes.noFilterResults')}
              subtitle={t('recipes.noFilterResultsHint')}
              actionLabel={t('recipes.resetFilter')}
              onAction={() => setSelectedFilter('all')}
            />
          ) : (
            <EmptyState
              title={
                totalIngredients === 0
                  ? t('recipes.noFood')
                  : isPremium
                  ? t('recipes.noRecipes')
                  : t('recipes.noPersonalRecipes')
              }
              subtitle={
                totalIngredients === 0
                  ? t('recipes.addFoodHint')
                  : isPremium
                  ? t('recipes.changeFilterHint')
                  : t('recipes.addRecipeHint')
              }
            />
          )}
        </ScrollView>
      </Animated.View>

      {/* Modals */}
      <AddRecipeModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onRecipeAdded={loadData}
      />
      <PaywallSheet
        {...paywallProps}
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="recipes"
      />
      <RecipeOnboardingModal
        visible={showRecipeOnboarding}
        onComplete={() => setShowRecipeOnboarding(false)}
      />
    </View>
  );
}

// ============================================================================
// Atoms locaux
// ============================================================================

function TopBar({
  onAI,
  aiLoading,
  isPremium,
  onAdd,
}: {
  onAI: () => void;
  aiLoading: boolean;
  isPremium: boolean;
  onAdd: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.topbar}>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={onAI}
        disabled={aiLoading}
        accessibilityRole="button"
        accessibilityLabel="Générer une recette IA"
        hitSlop={8}
        style={({ pressed }) => [
          styles.topbarBtn,
          styles.topbarBtnAI,
          { backgroundColor: colors.bg.surface, opacity: pressed || aiLoading ? 0.55 : 1 },
        ]}
      >
        {aiLoading ? (
          <ActivityIndicator size="small" color={Forest[600]} />
        ) : (
          <SymbolView name="sparkles" size={20} tintColor={Forest[600]} />
        )}
        {!isPremium && (
          <View style={[styles.proDot, { backgroundColor: Forest[600] }]} />
        )}
      </Pressable>
      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une recette"
        hitSlop={8}
        style={({ pressed }) => [
          styles.topbarBtn,
          { backgroundColor: Forest[600], opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <SymbolView name="plus" size={20} tintColor={Cream[50]} />
      </Pressable>
    </View>
  );
}

function StatsPill({
  ingredients,
  recipesCount,
}: {
  ingredients: number;
  recipesCount: number;
}) {
  const { t } = useTranslation();
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.statsPill,
        {
          backgroundColor: colors.bg.sunken,
          borderRadius: radius.full,
        },
      ]}
    >
      <SymbolView name="leaf.fill" size={14} tintColor={Forest[600]} />
      <Text style={[styles.statsPillText, { color: colors.fg.primary }]}>
        {t('recipes.availableCount', { count: ingredients })}
      </Text>
      <View style={[styles.statsDot, { backgroundColor: colors.fg.tertiary }]} />
      <Text style={[styles.statsPillText, { color: colors.fg.secondary }]}>
        {t('recipes.possibleRecipes', { count: recipesCount })}
      </Text>
    </View>
  );
}

function FilterChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: SFSymbol;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? Forest[600] : colors.bg.surface,
          borderColor: active ? Forest[600] : colors.border.subtle,
          borderRadius: radius.full,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <SymbolView
        name={icon}
        size={14}
        tintColor={active ? Cream[50] : colors.fg.secondary}
      />
      <Text
        style={[
          styles.chipText,
          { color: active ? Cream[50] : colors.fg.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SortSegment({
  mode,
  onChange,
}: {
  mode: SortMode;
  onChange: (m: SortMode) => void;
}) {
  const { t } = useTranslation();
  const { colors, radius } = useTheme();

  const Segment = ({
    value,
    icon,
    label,
  }: {
    value: SortMode;
    icon: SFSymbol;
    label: string;
  }) => {
    const isActive = mode === value;
    return (
      <Pressable
        onPress={() => onChange(value)}
        style={({ pressed }) => [
          styles.segmentItem,
          {
            backgroundColor: isActive ? colors.bg.surface : 'transparent',
            borderRadius: radius.md,
            opacity: pressed ? 0.8 : 1,
          },
          isActive && styles.segmentItemShadow,
        ]}
      >
        <SymbolView
          name={icon}
          size={13}
          tintColor={isActive ? Forest[600] : colors.fg.secondary}
        />
        <Text
          style={[
            styles.segmentText,
            { color: isActive ? colors.fg.primary : colors.fg.secondary },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.segmentTrack,
        { backgroundColor: colors.bg.sunken, borderRadius: radius.lg },
      ]}
    >
      <Segment value="antiWaste" icon="flame.fill" label={t('recipes.sortAntiWaste')} />
      <Segment value="bestMatch" icon="checkmark.circle.fill" label={t('recipes.sortBestMatch')} />
    </View>
  );
}

function RecipeCard({
  match,
  onPress,
  onLongPress,
  highlightIngredient,
}: {
  match: RecipeMatch;
  onPress: () => void;
  onLongPress?: () => void;
  highlightIngredient?: string;
}) {
  const { t } = useTranslation();
  const { colors, componentRadius, elevation } = useTheme();
  const {
    recipe,
    matchPercentage,
    matchingIngredients,
    missingIngredients,
    urgencyScore,
    expiringIngredients,
  } = match;

  const isHighlighted = useMemo(() => {
    if (!highlightIngredient) return false;
    const needle = highlightIngredient.toLowerCase();
    return matchingIngredients.some(
      (ing) => ing.toLowerCase().includes(needle) || needle.includes(ing.toLowerCase()),
    );
  }, [highlightIngredient, matchingIngredients]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.bg.surface,
          borderRadius: componentRadius.card,
          ...elevation[1],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Cover gradient sage→forest avec emoji XL */}
      <View
        style={[
          styles.cardCover,
          { borderTopLeftRadius: componentRadius.card, borderTopRightRadius: componentRadius.card },
        ]}
      >
        <LinearGradient
          colors={[Sage[300], Forest[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.cardCoverEmoji}>{recipe.imageEmoji}</Text>

        {/* Badges en haut à gauche : match + urgents */}
        <View style={styles.cardCoverBadges}>
          <Badge tone="reward" variant="solid" dot={false}>
            {matchPercentage}%
          </Badge>
          {urgencyScore > 0 && (
            <Badge tone="warning" variant="solid" dot={false}>
              {t('recipes.antiWasteBadge')}
            </Badge>
          )}
          {recipe.isUserRecipe && (
            <Badge tone="info" variant="solid" dot={false}>
              {t('recipes.myRecipe')}
            </Badge>
          )}
          {isHighlighted && (
            <Badge tone="success" variant="solid" dot={false}>
              ★
            </Badge>
          )}
        </View>
      </View>

      {/* Contenu */}
      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, { color: colors.fg.primary }]}
          numberOfLines={1}
        >
          {recipe.name}
        </Text>

        <Text
          style={[styles.cardDesc, { color: colors.fg.secondary }]}
          numberOfLines={2}
        >
          {recipe.description}
        </Text>

        {/* Meta row : catégorie · temps · difficulté */}
        <View style={styles.cardMetaRow}>
          <MetaChip
            icon={CATEGORY_ICON[recipe.category]}
            tone={CATEGORY_TONE[recipe.category]}
            label={t(`recipes.${recipe.category === 'plat' ? 'mainDishes' :
              recipe.category === 'entrée' ? 'starters' :
              recipe.category === 'dessert' ? 'desserts' :
              recipe.category === 'snack' ? 'snacks' :
              recipe.category === 'boisson' ? 'drinks' :
              'breakfast'}`)}
          />
          <MetaInline icon="clock" label={`${recipe.preparationTime} min`} />
          <DifficultyDots difficulty={recipe.difficulty} />
        </View>

        {/* Footer ingrédients */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border.subtle }]}>
          <Text style={[styles.cardFooterText, { color: colors.fg.secondary }]}>
            {t('recipes.ingredientsOf', {
              matched: matchingIngredients.length,
              total: recipe.ingredients.length,
            })}
          </Text>
          {missingIngredients.length > 0 && missingIngredients.length <= 3 && (
            <Text
              style={[styles.cardMissingText, { color: colors.fg.tertiary }]}
              numberOfLines={1}
            >
              {t('recipes.missing')} {missingIngredients.join(', ')}
            </Text>
          )}
          {expiringIngredients.length > 0 && (
            <Text
              style={[styles.cardExpiringText, { color: Forest[600] }]}
              numberOfLines={1}
            >
              <Text>🔥 </Text>
              {t('recipes.expiringCount', { count: expiringIngredients.length })}
              {' : '}
              {expiringIngredients.join(', ')}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function MetaChip({
  icon,
  label,
  tone,
}: {
  icon: SFSymbol;
  label: string;
  tone: 'success' | 'warning' | 'info' | 'reward' | 'neutral';
}) {
  return (
    <Badge tone={tone} variant="soft" dot={false}>
      <SymbolView
        name={icon}
        size={10}
        tintColor={undefined}
        style={{ marginRight: 4 }}
      />
      {label}
    </Badge>
  );
}

function MetaInline({ icon, label }: { icon: SFSymbol; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaInline}>
      <SymbolView name={icon} size={12} tintColor={colors.fg.secondary} />
      <Text style={[styles.metaInlineText, { color: colors.fg.secondary }]}>{label}</Text>
    </View>
  );
}

function DifficultyDots({ difficulty }: { difficulty: Recipe['difficulty'] }) {
  const { colors } = useTheme();
  const dots = DIFFICULTY_DOTS[difficulty];
  const color =
    difficulty === 'facile'
      ? colors.feedback.success.solid
      : difficulty === 'moyen'
        ? colors.feedback.warning.solid
        : colors.feedback.danger.solid;

  return (
    <View
      style={styles.dotsWrap}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Difficulté : ${difficulty}`}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i < dots ? color : colors.border.subtle },
          ]}
        />
      ))}
    </View>
  );
}

function PremiumTeaser({
  suggestedCount,
  onPress,
}: {
  suggestedCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors, componentRadius, elevation } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.teaser,
        {
          backgroundColor: colors.bg.surface,
          borderRadius: componentRadius.card,
          borderColor: Forest[600],
          ...elevation[1],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={[Sage[100], Cream[100]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, { borderRadius: componentRadius.card }]}
      />
      <View style={styles.teaserIcon}>
        <SymbolView name="sparkles" size={28} tintColor={Forest[600]} />
      </View>
      <View style={styles.teaserBody}>
        <View style={styles.teaserBadge}>
          <Text style={styles.teaserBadgeText}>PRO</Text>
        </View>
        <Text style={[styles.teaserTitle, { color: colors.fg.primary }]}>
          {t('recipes.premiumTeaserTitle', {
            defaultValue: `+${suggestedCount} recettes à découvrir`,
            count: suggestedCount,
          })}
        </Text>
        <Text style={[styles.teaserSub, { color: colors.fg.secondary }]}>
          {t('recipes.premiumTeaserSub', {
            defaultValue: 'Débloque toute la bibliothèque + génération IA illimitée.',
          })}
        </Text>
      </View>
      <SymbolView name="chevron.right" size={18} tintColor={colors.fg.tertiary} />
    </Pressable>
  );
}

function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={styles.empty}>
      <ChefIllustration />
      <Text style={[styles.emptyTitle, { color: colors.fg.primary }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: colors.fg.secondary }]}>{subtitle}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.emptyBtn,
            {
              backgroundColor: Forest[600],
              borderRadius: radius.full,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.emptyBtnText, { color: Cream[50] }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ChefIllustration : conservée du legacy (animation float SVG).
const ChefIllustration = React.memo(function ChefIllustration() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Defs>
          <SvgLinearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Cream[50]} />
            <Stop offset="100%" stopColor={Cream[100]} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M35 50 C35 30 50 20 60 20 C70 20 85 30 85 50 L85 60 L35 60 Z"
          fill="url(#hatGrad)"
          stroke={Sage[300]}
          strokeWidth="2"
        />
        <Path d="M30 60 L90 60 L90 70 L30 70 Z" fill={Sage[100]} />
        <Circle cx="60" cy="85" r="20" fill="#FFDAB9" />
        <Circle cx="53" cy="82" r="3" fill={Forest[600]} />
        <Circle cx="67" cy="82" r="3" fill={Forest[600]} />
        <Path
          d="M54 92 Q60 98 66 92"
          stroke={Forest[600]}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx="25" cy="40" r="8" fill="#E89B5A" />
        <Circle cx="95" cy="45" r="6" fill="#D85535" />
        <Circle cx="20" cy="80" r="5" fill={Sage[400]} />
      </Svg>
    </Animated.View>
  );
});

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },

  // TopBar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 8,
  },
  topbarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topbarBtnAI: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  proDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Hero block (eyebrow + title + stats)
  heroBlock: {
    paddingTop: 4,
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  statsPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
    gap: 6,
  },
  statsPillText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  statsDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },

  // Filters scroll
  filtersScroll: {
    maxHeight: 48,
    marginBottom: 4,
  },
  filtersContent: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sort segment
  sortRow: {
    paddingVertical: 10,
  },
  segmentTrack: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  segmentItemShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Scroll
  scroll: { flex: 1 },

  // Card
  card: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardCover: {
    height: 130,
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'flex-end',
  },
  cardCoverEmoji: {
    position: 'absolute',
    right: 18,
    bottom: 8,
    fontSize: 78,
    opacity: 0.88,
  },
  cardCoverBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignSelf: 'flex-start',
  },
  cardBody: { padding: 14 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaInlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dotsWrap: {
    flexDirection: 'row',
    gap: 3,
    marginLeft: 'auto',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cardFooterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardMissingText: {
    fontSize: 11,
    marginTop: 3,
  },
  cardExpiringText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  // Premium teaser
  teaser: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  teaserIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teaserBody: { flex: 1 },
  teaserBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Forest[600],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  teaserBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Cream[50],
    letterSpacing: 0.8,
  },
  teaserTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  teaserSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 32,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 14,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  emptyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 18,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
});
