import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import PressableScale from '../components/PressableScale';
import AnimatedListItem from '../components/AnimatedListItem';
import AddRecipeModal from '../components/AddRecipeModal';
import { PaywallSheet } from '../components/ds';
import { usePaywallSheetProps } from '../hooks/usePaywallSheetProps';
import RecipeOnboardingModal, { RECIPE_ONBOARDING_KEY } from '../components/RecipeOnboardingModal';
import { useSubscription } from '../contexts/SubscriptionContext';
import { COLORS, SPACING, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { loadLists } from '../utils/localStorage';
import { List, FoodItem } from '../types';
import { findMatchingRecipesWithUser, RecipeMatch, Recipe, deleteUserRecipe } from '../services/recipeService';
import { generateAIRecipe } from '../services/aiRecipeService';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import { useGamification } from '../contexts/GamificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext.legacy';
import logger from '../utils/logger';
import { trackRecipeViewed as analyticsTrackRecipeViewed } from '../services/analytics';

// Chef illustration for empty state
const ChefIllustration = React.memo(function ChefIllustration() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const illustrationSize = scaleSize(isSmallScreen ? 100 : 120);

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Svg width={illustrationSize} height={illustrationSize} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="hatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.neutral.white} />
            <Stop offset="100%" stopColor="#F0F0F0" />
          </LinearGradient>
        </Defs>
        {/* Chef hat */}
        <Path
          d="M35 50 C35 30 50 20 60 20 C70 20 85 30 85 50 L85 60 L35 60 Z"
          fill="url(#hatGrad)"
          stroke={COLORS.primary[300]}
          strokeWidth="2"
        />
        <Path d="M30 60 L90 60 L90 70 L30 70 Z" fill={COLORS.primary[100]} />
        {/* Face */}
        <Circle cx="60" cy="85" r="20" fill="#FFDAB9" />
        {/* Eyes */}
        <Circle cx="53" cy="82" r="3" fill={COLORS.primary[700]} />
        <Circle cx="67" cy="82" r="3" fill={COLORS.primary[700]} />
        {/* Smile */}
        <Path d="M54 92 Q60 98 66 92" stroke={COLORS.primary[700]} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Food icons */}
        <Circle cx="25" cy="40" r="8" fill={COLORS.accent.carrot} />
        <Circle cx="95" cy="45" r="6" fill={COLORS.accent.tomato} />
        <Circle cx="20" cy="80" r="5" fill={COLORS.accent.avocado} />
      </Svg>
    </Animated.View>
  );
});

// Category badge component
const CategoryBadge = React.memo(function CategoryBadge({ category }: { category: Recipe['category'] }) {
  const { t } = useTranslation();
  const categoryConfig: Record<Recipe['category'], { color: string; icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = {
    'entrée': { color: COLORS.accent.avocado, icon: 'leaf', labelKey: 'recipes.starters' },
    'plat': { color: COLORS.accent.carrot, icon: 'restaurant', labelKey: 'recipes.mainDishes' },
    'dessert': { color: COLORS.accent.tomato, icon: 'ice-cream', labelKey: 'recipes.desserts' },
    'snack': { color: COLORS.accent.lemon, icon: 'cafe', labelKey: 'recipes.snacks' },
    'boisson': { color: COLORS.accent.blueberry, icon: 'wine', labelKey: 'recipes.drinks' },
    'petit-déjeuner': { color: COLORS.accent.gold, icon: 'sunny', labelKey: 'recipes.breakfast' },
  };

  const config = categoryConfig[category];

  return (
    <View style={[styles.categoryBadge, { backgroundColor: hexToRgba(config.color, 0.15) }]}>
      <Ionicons name={config.icon} size={scaleSize(12)} color={config.color} />
      <Text style={[styles.categoryBadgeText, { color: config.color }]}>
        {t(config.labelKey)}
      </Text>
    </View>
  );
});

// Difficulty badge
const DifficultyBadge = React.memo(function DifficultyBadge({ difficulty }: { difficulty: Recipe['difficulty'] }) {
  const difficultyConfig = {
    'facile': { color: COLORS.semantic.success, dots: 1 },
    'moyen': { color: COLORS.semantic.warning, dots: 2 },
    'difficile': { color: COLORS.semantic.danger, dots: 3 },
  };

  const config = difficultyConfig[difficulty];

  return (
    <View style={styles.difficultyBadge}>
      {[...Array(3)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.difficultyDot,
            { backgroundColor: i < config.dots ? config.color : COLORS.neutral.gray300 }
          ]}
        />
      ))}
    </View>
  );
});

// Recipe card component
const RecipeCard = React.memo(function RecipeCard({ match, onPress, onLongPress, index }: { match: RecipeMatch; onPress: () => void; onLongPress?: () => void; index: number }) {
  const { t } = useTranslation();
  const { recipe, matchPercentage, matchingIngredients, missingIngredients, urgencyScore, expiringIngredients } = match;

  return (
    <AnimatedListItem index={index} animationType="slideUp">
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        style={[
          styles.recipeCard,
          urgencyScore > 0 && styles.recipeCardUrgent,
        ]}
        hapticType="light"
        activeScale={0.98}
      >
        {/* User recipe badge */}
        {recipe.isUserRecipe && (
          <View style={styles.userBadge}>
            <Ionicons name="person" size={scaleSize(10)} color={COLORS.neutral.white} />
            <Text style={styles.userBadgeText}>{t('recipes.myRecipe')}</Text>
          </View>
        )}

        {/* Anti-gaspi badge */}
        {urgencyScore > 0 && (
          <View style={[styles.antiWasteBadge, recipe.isUserRecipe ? { top: scaleSpacing(32) } : undefined]}>
            <Ionicons name="flame" size={scaleSize(10)} color={COLORS.neutral.white} />
            <Text style={styles.antiWasteBadgeText}>{t('recipes.antiWasteBadge')}</Text>
          </View>
        )}

        {/* Emoji illustration */}
        <View style={styles.recipeEmoji}>
          <Text style={styles.emojiText}>{recipe.imageEmoji}</Text>
        </View>

        {/* Content */}
        <View style={styles.recipeContent}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName} numberOfLines={1}>{recipe.name}</Text>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{matchPercentage}%</Text>
            </View>
          </View>

          <Text style={styles.recipeDescription} numberOfLines={2}>
            {recipe.description}
          </Text>

          <View style={styles.recipeFooter}>
            <View style={styles.recipeMeta}>
              <CategoryBadge category={recipe.category} />
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={scaleSize(14)} color={COLORS.text.secondary} />
                <Text style={styles.timeText}>{recipe.preparationTime} min</Text>
              </View>
            </View>
            <DifficultyBadge difficulty={recipe.difficulty} />
          </View>

          {/* Ingredients preview */}
          <View style={styles.ingredientsPreview}>
            <Text style={styles.ingredientsLabel}>
              {t('recipes.ingredientsOf', { matched: matchingIngredients.length, total: recipe.ingredients.length })}
            </Text>
            {missingIngredients.length > 0 && missingIngredients.length <= 3 && (
              <Text style={styles.missingText} numberOfLines={1}>
                {t('recipes.missing')} {missingIngredients.join(', ')}
              </Text>
            )}
            {expiringIngredients.length > 0 && (
              <Text style={styles.expiringText} numberOfLines={1}>
                {t('recipes.expiringCount', { count: expiringIngredients.length })} : {expiringIngredients.join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={scaleSize(20)} color={COLORS.primary[400]} />
        </View>
      </PressableScale>
    </AnimatedListItem>
  );
});

// Recipe detail modal
function RecipeDetailModal({
  visible,
  recipe,
  match,
  onClose,
}: {
  visible: boolean;
  recipe: Recipe | null;
  match: RecipeMatch | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!recipe || !match) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={scaleSize(24)} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{recipe.name}</Text>
          <View style={{ width: scaleSize(40) }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.modalHero}>
            <Text style={styles.heroEmoji}>{recipe.imageEmoji}</Text>
            <View style={styles.heroBadges}>
              <CategoryBadge category={recipe.category} />
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={scaleSize(16)} color={COLORS.text.secondary} />
                <Text style={styles.heroTime}>{recipe.preparationTime} min</Text>
              </View>
              <DifficultyBadge difficulty={recipe.difficulty} />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.modalDescription}>{recipe.description}</Text>

          {/* Match info */}
          <View style={styles.matchInfo}>
            <View style={styles.matchBar}>
              <View style={[styles.matchBarFill, { width: `${match.matchPercentage}%` }]} />
            </View>
            <Text style={styles.matchInfoText}>
              {t('recipes.ingredientsAvailable', { count: match.matchingIngredients.length, total: recipe.ingredients.length })}
            </Text>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recipes.ingredients')}</Text>
            {recipe.ingredients.map((ingredient, index) => {
              const isAvailable = match.matchingIngredients.includes(ingredient);
              return (
                <View key={index} style={styles.ingredientRow}>
                  <Ionicons
                    name={isAvailable ? 'checkmark-circle' : 'ellipse-outline'}
                    size={scaleSize(20)}
                    color={isAvailable ? COLORS.semantic.success : COLORS.neutral.gray400}
                  />
                  <Text style={[
                    styles.ingredientText,
                    !isAvailable && styles.ingredientMissing
                  ]}>
                    {ingredient}
                  </Text>
                  {!isAvailable && (
                    <View style={styles.missingBadge}>
                      <Text style={styles.missingBadgeText}>{t('recipes.toBuy')}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('recipes.preparation')}</Text>
            {recipe.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>

          {/* Tips */}
          {recipe.tips && (
            <View style={styles.tipsContainer}>
              <Ionicons name="bulb" size={scaleSize(20)} color={COLORS.accent.lemon} />
              <Text style={styles.tipsText}>{recipe.tips}</Text>
            </View>
          )}

          <View style={{ height: scaleSpacing(40) }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// Premium teaser component for AI-suggested recipes
const PremiumRecipeTeaser = React.memo(function PremiumRecipeTeaser({
  suggestedCount,
  onPress
}: {
  suggestedCount: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <PressableScale
      onPress={onPress}
      style={styles.premiumTeaser}
      hapticType="medium"
    >
      <View style={styles.premiumTeaserIcon}>
        <Ionicons name="sparkles" size={scaleSize(28)} color={COLORS.accent.lemon} />
      </View>
      <View style={styles.premiumTeaserContent}>
        <View style={styles.premiumBadge}>
          <Ionicons name="star" size={scaleSize(12)} color={COLORS.neutral.white} />
          <Text style={styles.premiumBadgeText}>PREMIUM</Text>
        </View>
        <Text style={styles.premiumTeaserTitle}>
          {t('recipes.suggestedCount', { count: suggestedCount })}
        </Text>
        <Text style={styles.premiumTeaserSubtitle}>
          {t('recipes.unlockSuggestions')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={scaleSize(24)} color={COLORS.primary[400]} />
    </PressableScale>
  );
});

export default function RecipesScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'Recipes'>>();
  const highlightIngredient = route.params?.ingredient;
  const { trackRecipeViewed } = useGamification();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isPremium } = useSubscription();
  const paywallProps = usePaywallSheetProps();
  const [lists, setLists] = useState<List[]>([]);
  const [recipeMatches, setRecipeMatches] = useState<RecipeMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<RecipeMatch | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'user' | Recipe['category']>('all');
  const [sortMode, setSortMode] = useState<'antiWaste' | 'bestMatch'>('antiWaste');
  const [showRecipeOnboarding, setShowRecipeOnboarding] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(RECIPE_ONBOARDING_KEY).then((value) => {
      if (value !== 'true') {
        setShowRecipeOnboarding(true);
      }
    });
  }, []);

  const loadData = async () => {
    try {
      const data = await loadLists();
      setLists(data);

      const allFoodItems: FoodItem[] = data.flatMap(list => list.items);
      const matches = await findMatchingRecipesWithUser(allFoodItems, user?.id);
      setRecipeMatches(matches);
    } catch (error) {
      logger.error('Erreur lors du chargement:', error);
      Alert.alert(
        t('common.error'),
        t('recipes.loadError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRecipePress = (match: RecipeMatch) => {
    setSelectedMatch(match);
    setModalVisible(true);
    // Tracker pour la gamification
    trackRecipeViewed();
    // Analytics PostHog
    analyticsTrackRecipeViewed(match.recipe.id);
  };

  const handleRecipeLongPress = (match: RecipeMatch) => {
    if (match.recipe.isUserRecipe) {
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
              setRecipeMatches(prev => prev.filter(m => m.recipe.id !== match.recipe.id));
              const success = await deleteUserRecipe(match.recipe.id, user?.id);
              if (!success) {
                // Rollback on failure
                setRecipeMatches(prev => [...prev, match]);
                Alert.alert(t('common.error'), t('recipes.deleteError'));
              }
            },
          },
        ]
      );
    }
  };

  const handleGenerateAIRecipe = async () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    setAiGenerating(true);
    try {
      // Récupérer les ingrédients qui expirent dans les 7 prochains jours
      const expiringItems = lists
        .flatMap(l => l.items)
        .filter(item => {
          if (item.status !== 'active' || !item.expirationDate) return false;
          const days = getDaysUntilExpiration(item.expirationDate as string);
          return days !== null && days <= 7;
        })
        .map(item => item.name)
        .slice(0, 8); // max 8 ingrédients pour le prompt

      if (expiringItems.length === 0) {
        Alert.alert(
          t('recipes.aiNoIngredients'),
          t('recipes.aiNoIngredientsHint')
        );
        return;
      }

      const result = await generateAIRecipe(expiringItems);
      if (!result) {
        Alert.alert(t('common.error'), t('recipes.aiError'));
        return;
      }

      // Afficher via le modal existant en créant un RecipeMatch factice
      const fakeMatch: RecipeMatch = {
        recipe: result.recipe,
        matchingIngredients: expiringItems,
        missingIngredients: [],
        matchPercentage: 100,
        urgencyScore: 100,
        expiringIngredients: expiringItems,
      };
      setSelectedMatch(fakeMatch);
      setModalVisible(true);
    } catch {
      Alert.alert(t('common.error'), t('recipes.aiError'));
    } finally {
      setAiGenerating(false);
    }
  };

  // Séparer les recettes utilisateur des recettes suggérées (built-in)
  const userRecipes = recipeMatches.filter(m => m.recipe.isUserRecipe);
  const suggestedRecipes = recipeMatches.filter(m => !m.recipe.isUserRecipe);

  // Pour les utilisateurs gratuits, montrer leurs recettes + 2 recettes du catalogue en aperçu
  // Pour les utilisateurs Premium, montrer toutes les recettes
  const FREE_SUGGESTED_LIMIT = 2;
  const freeSuggestedRecipes = suggestedRecipes.slice(0, FREE_SUGGESTED_LIMIT);
  const availableMatches = isPremium
    ? recipeMatches
    : [...userRecipes, ...freeSuggestedRecipes];

  const categoryFiltered = selectedFilter === 'all'
    ? availableMatches
    : selectedFilter === 'user'
    ? userRecipes
    : availableMatches.filter(m => m.recipe.category === selectedFilter);

  // Boost recipes matching the deep-linked ingredient to the top
  const ingredientLower = highlightIngredient?.toLowerCase();
  const matchesIngredient = (m: RecipeMatch) =>
    ingredientLower && m.matchingIngredients.some(
      (ing) => ing.toLowerCase().includes(ingredientLower) || ingredientLower.includes(ing.toLowerCase())
    );

  const filteredMatches = [...categoryFiltered].sort((a, b) => {
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

  const totalIngredients = lists.reduce((sum, list) => {
    return sum + list.items.filter(item => item.status !== 'consumed' && item.status !== 'thrown').length;
  }, 0);

  const filters: Array<{ key: 'all' | 'user' | Recipe['category']; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'all', label: t('recipes.all'), icon: 'apps' },
    { key: 'user', label: t('recipes.myRecipes'), icon: 'person' },
    { key: 'petit-déjeuner', label: t('recipes.breakfast'), icon: 'sunny' },
    { key: 'plat', label: t('recipes.mainDishes'), icon: 'restaurant' },
    { key: 'entrée', label: t('recipes.starters'), icon: 'leaf' },
    { key: 'dessert', label: t('recipes.desserts'), icon: 'ice-cream' },
    { key: 'snack', label: t('recipes.snacks'), icon: 'cafe' },
    { key: 'boisson', label: t('recipes.drinks'), icon: 'wine' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary.cream }]}>
      <Header title={t('recipes.ideasTitle')} showBackButton={false} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Stats banner */}
        <View style={[styles.statsBanner, { backgroundColor: colors.neutral.white }]}>
          <View style={styles.statsIcon}>
            <Ionicons name="nutrition" size={scaleSize(24)} color={colors.primary[500]} />
          </View>
          <View style={styles.statsText}>
            <Text style={styles.statsTitle}>
              {t('recipes.availableCount', { count: totalIngredients })}
            </Text>
            <Text style={styles.statsSubtitle}>
              {isPremium
                ? t('recipes.possibleRecipes', { count: recipeMatches.length })
                : t('recipes.personalRecipes', { count: availableMatches.length })
              }
            </Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map(filter => (
            <PressableScale
              key={filter.key}
              onPress={() => setSelectedFilter(filter.key)}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.filterChipActive
              ]}
              hapticType="light"
            >
              <Ionicons
                name={filter.icon}
                size={scaleSize(16)}
                color={selectedFilter === filter.key ? COLORS.neutral.white : COLORS.primary[500]}
              />
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.key && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>

        {/* Sort toggle */}
        <View style={styles.sortContainer}>
          <PressableScale
            onPress={() => setSortMode('antiWaste')}
            style={[styles.sortButton, sortMode === 'antiWaste' && styles.sortButtonActive]}
            hapticType="light"
          >
            <Ionicons
              name="flame"
              size={scaleSize(14)}
              color={sortMode === 'antiWaste' ? COLORS.neutral.white : COLORS.semantic.warning}
            />
            <Text style={[styles.sortButtonText, sortMode === 'antiWaste' && styles.sortButtonTextActive]}>
              {t('recipes.sortAntiWaste')}
            </Text>
          </PressableScale>
          <PressableScale
            onPress={() => setSortMode('bestMatch')}
            style={[styles.sortButton, styles.sortButtonMatch, sortMode === 'bestMatch' && styles.sortButtonMatchActive]}
            hapticType="light"
          >
            <Ionicons
              name="checkmark-circle"
              size={scaleSize(14)}
              color={sortMode === 'bestMatch' ? COLORS.neutral.white : COLORS.primary[500]}
            />
            <Text style={[styles.sortButtonText, styles.sortButtonMatchText, sortMode === 'bestMatch' && styles.sortButtonTextActive]}>
              {t('recipes.sortBestMatch')}
            </Text>
          </PressableScale>
        </View>

        {/* Bouton Recette IA (Premium) */}
        <PressableScale
          onPress={handleGenerateAIRecipe}
          style={styles.aiButton}
          hapticType="medium"
          disabled={aiGenerating}
        >
          {aiGenerating ? (
            <ActivityIndicator size="small" color={COLORS.neutral.white} />
          ) : (
            <Ionicons name="sparkles" size={scaleSize(16)} color={COLORS.neutral.white} />
          )}
          <Text style={styles.aiButtonText}>
            {aiGenerating ? t('recipes.aiGenerating') : t('recipes.aiGenerate')}
          </Text>
          {!isPremium && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>PRO</Text>
            </View>
          )}
        </PressableScale>

        {/* Recipe list */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary[500]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Premium teaser for free users with suggested recipes */}
          {!isPremium && suggestedRecipes.length > FREE_SUGGESTED_LIMIT && selectedFilter !== 'user' && (
            <PremiumRecipeTeaser
              suggestedCount={suggestedRecipes.length - FREE_SUGGESTED_LIMIT}
              onPress={() => setShowPaywall(true)}
            />
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary[500]} />
            </View>
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map((match, index) => (
              <RecipeCard
                key={match.recipe.id}
                match={match}
                onPress={() => handleRecipePress(match)}
                onLongPress={() => handleRecipeLongPress(match)}
                index={index}
              />
            ))
          ) : selectedFilter !== 'all' && availableMatches.length > 0 ? (
            <View style={styles.emptyState}>
              <ChefIllustration />
              <Text style={styles.emptyTitle}>{t('recipes.noFilterResults')}</Text>
              <Text style={styles.emptySubtitle}>{t('recipes.noFilterResultsHint')}</Text>
              <TouchableOpacity
                onPress={() => setSelectedFilter('all')}
                style={styles.resetFilterButton}
              >
                <Text style={styles.resetFilterText}>{t('recipes.resetFilter')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ChefIllustration />
              <Text style={styles.emptyTitle}>
                {totalIngredients === 0
                  ? t('recipes.noFood')
                  : isPremium
                  ? t('recipes.noRecipes')
                  : t('recipes.noPersonalRecipes')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {totalIngredients === 0
                  ? t('recipes.addFoodHint')
                  : isPremium
                  ? t('recipes.changeFilterHint')
                  : t('recipes.addRecipeHint')}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* FAB pour ajouter une recette */}
      <PressableScale
        onPress={() => setAddModalVisible(true)}
        style={styles.fab}
        hapticType="medium"
        accessibilityLabel={t('recipes.addRecipe')}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={scaleSize(28)} color={COLORS.neutral.white} />
      </PressableScale>

      {/* Recipe detail modal */}
      <RecipeDetailModal
        visible={modalVisible}
        recipe={selectedMatch?.recipe || null}
        match={selectedMatch}
        onClose={() => setModalVisible(false)}
      />

      {/* Add recipe modal */}
      <AddRecipeModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onRecipeAdded={loadData}
      />

      {/* Paywall modal */}
      <PaywallSheet
        {...paywallProps}
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="recipes"
      />

      {/* Recipe onboarding modal */}
      <RecipeOnboardingModal
        visible={showRecipeOnboarding}
        onComplete={() => setShowRecipeOnboarding(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  content: {
    flex: 1,
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    marginHorizontal: scaleSpacing(isSmallScreen ? 14 : 20),
    marginTop: scaleSpacing(isSmallScreen ? 12 : 16),
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    borderRadius: scaleSize(16),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  statsIcon: {
    width: scaleSize(isSmallScreen ? 44 : 52),
    height: scaleSize(isSmallScreen ? 44 : 52),
    borderRadius: scaleSize(isSmallScreen ? 12 : 14),
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  statsText: {
    marginLeft: scaleSpacing(12),
    flex: 1,
  },
  statsTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 15 : 17),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  statsSubtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 14),
    color: COLORS.text.secondary,
    marginTop: scaleSpacing(2),
  },
  filtersContainer: {
    maxHeight: scaleSize(50),
    marginTop: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  filtersContent: {
    paddingHorizontal: scaleSpacing(isSmallScreen ? 14 : 20),
    gap: scaleSpacing(8),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(14),
    borderRadius: scaleSize(20),
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    marginRight: scaleSpacing(8),
  },
  filterChipActive: {
    backgroundColor: COLORS.primary[500],
  },
  filterChipText: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 14),
    fontWeight: '600',
    color: COLORS.primary[500],
    marginLeft: scaleSpacing(6),
  },
  filterChipTextActive: {
    color: COLORS.neutral.white,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: scaleSpacing(isSmallScreen ? 14 : 20),
    marginTop: scaleSpacing(10),
    gap: scaleSpacing(8),
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSpacing(6),
    paddingHorizontal: scaleSpacing(12),
    borderRadius: scaleSize(16),
    backgroundColor: hexToRgba(COLORS.semantic.warning, 0.1),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.semantic.warning, 0.2),
  },
  sortButtonActive: {
    backgroundColor: COLORS.semantic.warning,
    borderColor: COLORS.semantic.warning,
  },
  sortButtonText: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 13),
    fontWeight: '600',
    color: COLORS.semantic.warning,
    marginLeft: scaleSpacing(4),
  },
  sortButtonTextActive: {
    color: COLORS.neutral.white,
  },
  sortButtonMatch: {
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  sortButtonMatchActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[600],
    borderRadius: RADIUS.xl,
    paddingVertical: scaleSpacing(12),
    paddingHorizontal: scaleSpacing(20),
    marginHorizontal: scaleSpacing(16),
    marginBottom: scaleSpacing(8),
    gap: scaleSpacing(8),
    ...SHADOWS.md,
  },
  aiButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: COLORS.neutral.white,
    letterSpacing: 0.3,
  },
  aiBadge: {
    backgroundColor: COLORS.accent.lemon,
    borderRadius: RADIUS.sm,
    paddingHorizontal: scaleSpacing(6),
    paddingVertical: 2,
  },
  aiBadgeText: {
    fontSize: scaleFontSize(10),
    fontWeight: '800',
    color: COLORS.primary[700],
    letterSpacing: 0.5,
  },
  sortButtonMatchText: {
    color: COLORS.primary[500],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scaleSpacing(isSmallScreen ? 14 : 20),
    paddingTop: scaleSpacing(isSmallScreen ? 12 : 16),
    paddingBottom: scaleSpacing(isSmallScreen ? 80 : 100),
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderRadius: scaleSize(isSmallScreen ? 16 : 20),
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    marginBottom: scaleSpacing(12),
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  recipeEmoji: {
    width: scaleSize(isSmallScreen ? 56 : 70),
    height: scaleSize(isSmallScreen ? 56 : 70),
    borderRadius: scaleSize(isSmallScreen ? 14 : 18),
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: scaleFontSize(isSmallScreen ? 28 : 36),
  },
  recipeContent: {
    flex: 1,
    marginLeft: scaleSpacing(12),
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recipeName: {
    fontSize: scaleFontSize(isSmallScreen ? 15 : 16),
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  matchBadge: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(3),
    borderRadius: scaleSize(10),
    marginLeft: scaleSpacing(8),
  },
  matchText: {
    fontSize: scaleFontSize(11),
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  recipeDescription: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 13),
    color: COLORS.text.secondary,
    marginTop: scaleSpacing(4),
    lineHeight: scaleFontSize(isSmallScreen ? 16 : 18),
  },
  recipeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleSpacing(8),
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(10),
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSpacing(3),
    paddingHorizontal: scaleSpacing(8),
    borderRadius: scaleSize(8),
  },
  categoryBadgeText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    marginLeft: scaleSpacing(4),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    color: COLORS.text.secondary,
    marginLeft: scaleSpacing(4),
  },
  difficultyBadge: {
    flexDirection: 'row',
    gap: scaleSpacing(3),
  },
  difficultyDot: {
    width: scaleSize(6),
    height: scaleSize(6),
    borderRadius: scaleSize(3),
  },
  ingredientsPreview: {
    marginTop: scaleSpacing(8),
    paddingTop: scaleSpacing(8),
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.gray200,
  },
  ingredientsLabel: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    color: COLORS.text.secondary,
  },
  matchCount: {
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  missingText: {
    fontSize: scaleFontSize(10),
    color: COLORS.semantic.warning,
    marginTop: scaleSpacing(2),
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingLeft: scaleSpacing(8),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleSpacing(isSmallScreen ? 48 : 64),
  },
  emptyTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 18 : 22),
    fontWeight: '600',
    color: COLORS.primary[500],
    marginTop: scaleSpacing(16),
    marginBottom: scaleSpacing(8),
  },
  emptySubtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 13 : 15),
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: scaleSpacing(32),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING['3xl'],
  },
  resetFilterButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.2),
  },
  resetFilterText: {
    color: COLORS.primary[500],
    fontWeight: '600',
    fontSize: scaleFontSize(14),
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleSpacing(16),
    paddingTop: scaleSpacing(16),
    paddingBottom: scaleSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray200,
  },
  closeButton: {
    width: scaleSize(40),
    height: scaleSize(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(20),
    backgroundColor: COLORS.neutral.gray100,
  },
  modalTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 17 : 20),
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalHero: {
    alignItems: 'center',
    paddingVertical: scaleSpacing(24),
    backgroundColor: hexToRgba(COLORS.primary[500], 0.05),
  },
  heroEmoji: {
    fontSize: scaleFontSize(isSmallScreen ? 64 : 80),
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(12),
    marginTop: scaleSpacing(16),
  },
  heroTime: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.secondary,
    marginLeft: scaleSpacing(4),
  },
  modalDescription: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    color: COLORS.text.secondary,
    lineHeight: scaleFontSize(isSmallScreen ? 20 : 24),
    paddingHorizontal: scaleSpacing(20),
    paddingTop: scaleSpacing(20),
    textAlign: 'center',
  },
  matchInfo: {
    marginHorizontal: scaleSpacing(20),
    marginTop: scaleSpacing(20),
    padding: scaleSpacing(16),
    backgroundColor: COLORS.neutral.white,
    borderRadius: scaleSize(12),
    ...SHADOWS.sm,
  },
  matchBar: {
    height: scaleSize(8),
    backgroundColor: COLORS.neutral.gray200,
    borderRadius: scaleSize(4),
    overflow: 'hidden',
  },
  matchBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
    borderRadius: scaleSize(4),
  },
  matchInfoText: {
    fontSize: scaleFontSize(12),
    color: COLORS.text.secondary,
    marginTop: scaleSpacing(8),
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: scaleSpacing(20),
    paddingTop: scaleSpacing(24),
  },
  sectionTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 17 : 20),
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: scaleSpacing(16),
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSpacing(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray100,
  },
  ingredientText: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 15),
    color: COLORS.text.primary,
    marginLeft: scaleSpacing(12),
    flex: 1,
  },
  ingredientMissing: {
    color: COLORS.text.secondary,
  },
  missingBadge: {
    backgroundColor: hexToRgba(COLORS.semantic.warning, 0.15),
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(3),
    borderRadius: scaleSize(6),
  },
  missingBadgeText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    color: COLORS.semantic.warning,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: scaleSpacing(16),
  },
  stepNumber: {
    width: scaleSize(28),
    height: scaleSize(28),
    borderRadius: scaleSize(14),
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleSpacing(12),
  },
  stepNumberText: {
    fontSize: scaleFontSize(13),
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  instructionText: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 15),
    color: COLORS.text.primary,
    lineHeight: scaleFontSize(isSmallScreen ? 20 : 22),
    flex: 1,
  },
  tipsContainer: {
    flexDirection: 'row',
    backgroundColor: hexToRgba(COLORS.accent.lemon, 0.15),
    marginHorizontal: scaleSpacing(20),
    marginTop: scaleSpacing(20),
    padding: scaleSpacing(16),
    borderRadius: scaleSize(12),
  },
  tipsText: {
    fontSize: scaleFontSize(isSmallScreen ? 13 : 14),
    color: COLORS.text.primary,
    marginLeft: scaleSpacing(12),
    flex: 1,
    lineHeight: scaleFontSize(isSmallScreen ? 18 : 20),
  },
  userBadge: {
    position: 'absolute',
    top: scaleSpacing(-8),
    left: scaleSpacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(3),
    borderRadius: scaleSize(10),
    zIndex: 1,
  },
  userBadgeText: {
    fontSize: scaleFontSize(9),
    fontWeight: '600',
    color: COLORS.neutral.white,
    marginLeft: scaleSpacing(3),
  },
  recipeCardUrgent: {
    borderColor: hexToRgba(COLORS.semantic.warning, 0.3),
    borderWidth: 1.5,
  },
  antiWasteBadge: {
    position: 'absolute',
    top: scaleSpacing(-8),
    right: scaleSpacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.semantic.warning,
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(3),
    borderRadius: scaleSize(10),
    zIndex: 1,
  },
  antiWasteBadgeText: {
    fontSize: scaleFontSize(9),
    fontWeight: '600',
    color: COLORS.neutral.white,
    marginLeft: scaleSpacing(3),
  },
  expiringText: {
    fontSize: scaleFontSize(10),
    color: COLORS.semantic.warning,
    fontWeight: '600',
    marginTop: scaleSpacing(2),
  },
  fab: {
    position: 'absolute',
    bottom: scaleSpacing(isSmallScreen ? 90 : 100),
    right: scaleSpacing(isSmallScreen ? 16 : 24),
    width: scaleSize(isSmallScreen ? 54 : 60),
    height: scaleSize(isSmallScreen ? 54 : 60),
    borderRadius: scaleSize(isSmallScreen ? 27 : 30),
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },

  // Premium teaser styles
  premiumTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: scaleSize(16),
    padding: scaleSpacing(16),
    marginBottom: scaleSpacing(16),
    borderWidth: 2,
    borderColor: hexToRgba(COLORS.accent.lemon, 0.4),
    ...SHADOWS.md,
  },
  premiumTeaserIcon: {
    width: scaleSize(56),
    height: scaleSize(56),
    borderRadius: scaleSize(14),
    backgroundColor: hexToRgba(COLORS.accent.lemon, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleSpacing(14),
  },
  premiumTeaserContent: {
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.lemon,
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(3),
    borderRadius: scaleSize(10),
    alignSelf: 'flex-start',
    marginBottom: scaleSpacing(6),
  },
  premiumBadgeText: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    color: COLORS.neutral.white,
    marginLeft: scaleSpacing(4),
    letterSpacing: 0.5,
  },
  premiumTeaserTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 15 : 17),
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: scaleSpacing(4),
  },
  premiumTeaserSubtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 13),
    color: COLORS.text.secondary,
    lineHeight: scaleFontSize(isSmallScreen ? 16 : 18),
  },
});
