import React, { useState, useRef, useCallback } from 'react';
import { useGamification } from '../contexts/GamificationContext';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { COLORS, SHADOWS, SPACING, RADIUS, TYPOGRAPHY, hexToRgba } from '../utils/designSystem';
import {
  DEVICE,
  scaleFontSize,
  scaleSize,
  scaleSpacing,
  isSmallScreen,
} from '../utils/responsive';
import { FoodItem } from '../types';
import { createList, addItemToList } from '../utils/localStorage';
import { findMatchingRecipesForOnboarding, RecipeMatch, fetchRecipesFromCloud } from '../services/recipeService';
import { formatDateToDDMMYYYY } from '../utils/dateUtils';
import FieldInput from '../components/FieldInput';
import DatePickerField from '../components/DatePickerField';
import {
  CarrotIllustration,
  AppleIllustration,
  BroccoliIllustration,
  LeafPattern,
  FloatingElement,
} from '../components/onboarding/Illustrations';
import {
  trackOnboardingFoodAdded,
  trackOnboardingRecipeViewed,
  trackOnboardingStepCompleted,
  trackOnboardingStep,
} from '../services/analytics';
import logger from '../utils/logger';
import { setMonthlySavingsGoal } from '../services/monthlySavingsService';
import { requestNotificationPermissions } from '../services/notificationService';

export const ONBOARDING_KEY = 'onboarding_completed';

type Step = 'welcome' | 'savings' | 'addFood' | 'recipes' | 'ready';

const EXPIRATION_OPTIONS = [
  { key: 'threeDays', days: 3 },
  { key: 'oneWeek', days: 7 },
  { key: 'twoWeeks', days: 14 },
  { key: 'oneMonth', days: 30 },
  { key: 'customDate', days: -1 },
];

const STEP_PROGRESS: Record<string, number> = {
  welcome: 0, savings: 25, addFood: 50, recipes: 75, ready: 100,
};

const WASTE_OPTIONS = [
  { labelKey: 'onboarding.wasteLittle', subKey: 'onboarding.wasteLittleSub', goal: 20 },
  { labelKey: 'onboarding.wasteRegular', subKey: 'onboarding.wasteRegularSub', goal: 50 },
  { labelKey: 'onboarding.wasteOften', subKey: 'onboarding.wasteOftenSub', goal: 80 },
];

interface ActiveOnboardingScreenProps {
  onComplete: () => void;
}

export default function ActiveOnboardingScreen({ onComplete }: ActiveOnboardingScreenProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('welcome');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Food form state
  const [foodName, setFoodName] = useState('');
  const [selectedExpiration, setSelectedExpiration] = useState('oneWeek');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Savings anchor state
  const [wasteLevel, setWasteLevel] = useState(1);

  // Data state
  const [addedItems, setAddedItems] = useState<FoodItem[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeMatch[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [requestingNotif, setRequestingNotif] = useState(false);
  const { trackFoodAdded } = useGamification();

  const transitionTo = useCallback((nextStep: Step) => {
    const stepIndexMap: Record<Step, number> = {
      welcome: 0, savings: 1, addFood: 2, recipes: 3, ready: 4,
    };
    trackOnboardingStep(stepIndexMap[nextStep], nextStep);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const getExpirationDate = (): string => {
    if (selectedExpiration === 'customDate' && customDate) {
      return customDate;
    }
    const option = EXPIRATION_OPTIONS.find(o => o.key === selectedExpiration);
    if (option && option.days > 0) {
      const date = new Date();
      date.setDate(date.getDate() + option.days);
      return formatDateToDDMMYYYY(date);
    }
    // Default to 1 week
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return formatDateToDDMMYYYY(date);
  };

  const handleAddFood = async () => {
    if (!foodName.trim() || isAdding) return;
    setIsAdding(true);
    Keyboard.dismiss();

    try {
      let currentListId = listId;

      // Create list on first add
      if (!currentListId) {
        const list = await createList(t('onboarding.defaultListName'));
        currentListId = list.id;
        setListId(currentListId);
      }

      const newItem: FoodItem = {
        id: Date.now().toString(),
        name: foodName.trim(),
        expirationDate: getExpirationDate(),
        category: 'other',
        quantity: 1,
        status: 'active',
      };

      await addItemToList(currentListId, newItem);
      const updatedItems = [...addedItems, newItem];
      setAddedItems(updatedItems);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      trackFoodAdded(currentListId ?? undefined);
      trackOnboardingFoodAdded(updatedItems.length);
      trackOnboardingStepCompleted('addFood');

      // Reset form, show choice view (add another / see recipes)
      setFoodName('');
      setSelectedExpiration('oneWeek');
      setCustomDate('');
      setShowCustomDate(false);
      setJustAdded(true);

      // Prefetch recipes so seeing them is instant
      const matches = findMatchingRecipesForOnboarding(updatedItems);
      setRecipes(matches);
      fetchRecipesFromCloud().then(() => {
        setRecipes(findMatchingRecipesForOnboarding(updatedItems));
      }).catch(() => {});
    } catch (error) {
      logger.error('Error adding food during onboarding:', error);
      Alert.alert(t('common.error'), t('addFood.saveError'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleComplete = async () => {
    try {
      await setMonthlySavingsGoal(WASTE_OPTIONS[wasteLevel].goal);
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      trackOnboardingStepCompleted('ready');
      onComplete();
    } catch (error) {
      logger.error('Error saving onboarding state:', error);
      onComplete();
    }
  };

  const handleAllowNotificationsAndComplete = async () => {
    if (requestingNotif) return;
    setRequestingNotif(true);
    try {
      await requestNotificationPermissions();
    } catch (error) {
      logger.error('Error requesting notification permissions:', error);
    } finally {
      setRequestingNotif(false);
      handleComplete();
    }
  };

  const handleAddAnother = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJustAdded(false);
  };

  const handleSeeRecipes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackOnboardingRecipeViewed();
    setJustAdded(false);
    transitionTo('recipes');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const backMap: Record<Step, Step> = {
      welcome: 'welcome',
      savings: 'welcome',
      addFood: 'savings',
      recipes: 'addFood',
      ready: 'recipes',
    };
    transitionTo(backMap[step]);
  };

  const canAddFood = foodName.trim().length > 0;

  // Step indicator
  const stepIndex = ['welcome', 'savings', 'addFood', 'recipes', 'ready'].indexOf(step);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i === stepIndex && styles.stepDotActive,
            i < stepIndex && styles.stepDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <LeafPattern color={COLORS.primary[500]} opacity={0.06} />
      <View style={styles.illustrationContainer}>
        <FloatingElement delay={0} duration={2500} range={isSmallScreen ? 8 : 12}>
          <View style={{ position: 'absolute', top: scaleSize(-50), left: scaleSize(-65) }}>
            <AppleIllustration scale={0.7 * (isSmallScreen ? 0.65 : 1)} />
          </View>
        </FloatingElement>
        <FloatingElement delay={200} duration={3000} range={isSmallScreen ? 10 : 15}>
          <BroccoliIllustration scale={isSmallScreen ? 0.65 : 1} />
        </FloatingElement>
        <FloatingElement delay={400} duration={2800} range={isSmallScreen ? 6 : 10}>
          <View style={{ position: 'absolute', top: scaleSize(-35), right: scaleSize(-75) }}>
            <CarrotIllustration scale={0.6 * (isSmallScreen ? 0.65 : 1)} />
          </View>
        </FloatingElement>
      </View>

      <Text style={styles.welcomeTitle}>
        {t('onboarding.activeWelcomeTitle')}
      </Text>
      <Text style={styles.welcomeSubtitle}>
        {t('onboarding.activeWelcomeSubtitle')}
      </Text>

      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          trackOnboardingStepCompleted('welcome');
          transitionTo('savings');
        }}
        activeOpacity={0.9}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>{t('onboarding.continue')}</Text>
        <View style={styles.buttonIconContainer}>
          <Ionicons name="arrow-forward" size={scaleSize(18)} color={COLORS.neutral.white} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderAfterAdd = () => {
    const lastItem = addedItems[addedItems.length - 1];
    return (
      <View style={styles.afterAddContainer}>
        <View style={styles.afterAddIconCircle}>
          <Ionicons name="checkmark-circle" size={scaleSize(72)} color={COLORS.semantic.success} />
        </View>
        <Text style={styles.afterAddTitle}>
          {t('onboarding.afterAddTitle', { name: lastItem?.name ?? '' })}
        </Text>
        <Text style={styles.afterAddSubtitle}>{t('onboarding.afterAddSubtitle')}</Text>

        <TouchableOpacity
          onPress={handleSeeRecipes}
          activeOpacity={0.9}
          style={[styles.primaryButton, { marginTop: SPACING.xl, alignSelf: 'stretch' }]}
        >
          <Text style={styles.primaryButtonText}>{t('onboarding.seeRecipes')}</Text>
          <View style={styles.buttonIconContainer}>
            <Ionicons name="arrow-forward" size={scaleSize(18)} color={COLORS.neutral.white} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAddAnother}
          activeOpacity={0.9}
          style={[styles.secondaryButton, { marginTop: SPACING.md, alignSelf: 'stretch' }]}
        >
          <Ionicons name="add-circle-outline" size={scaleSize(18)} color={COLORS.primary[500]} />
          <Text style={styles.secondaryButtonText}>{t('onboarding.addAnother')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAddFood = () => {
    if (justAdded && addedItems.length > 0) return renderAfterAdd();
    return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.addFoodContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t('onboarding.step1of2')}</Text>
        </View>
        <Text style={styles.stepTitle}>{t('onboarding.addFirstFood')}</Text>

        {/* Food name */}
        <FieldInput
          label={t('onboarding.foodName')}
          value={foodName}
          onChangeText={setFoodName}
          icon="nutrition-outline"
          placeholder={t('onboarding.foodNamePlaceholder')}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />

        {/* Expiration quick-pick */}
        <Text style={styles.sectionLabel}>{t('onboarding.expiresIn')}</Text>
        <View style={styles.expirationRow}>
          {EXPIRATION_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => {
                Haptics.selectionAsync();
                if (opt.key === 'customDate') {
                  setShowCustomDate(true);
                  setSelectedExpiration('customDate');
                } else {
                  setShowCustomDate(false);
                  setSelectedExpiration(selectedExpiration === opt.key ? '' : opt.key);
                }
              }}
              activeOpacity={0.7}
              style={[
                styles.expirationChip,
                selectedExpiration === opt.key && styles.expirationChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.expirationChipText,
                  selectedExpiration === opt.key && styles.expirationChipTextSelected,
                ]}
              >
                {t(`onboarding.${opt.key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom date picker */}
        {showCustomDate && (
          <DatePickerField
            label={t('onboarding.customDate')}
            value={customDate}
            onDateChange={setCustomDate}
            minimumDate={new Date()}
          />
        )}

        {/* Add button */}
        <TouchableOpacity
          onPress={handleAddFood}
          activeOpacity={0.9}
          disabled={!canAddFood || isAdding}
          style={[
            styles.primaryButton,
            (!canAddFood || isAdding) && styles.primaryButtonDisabled,
          ]}
        >
          <Ionicons name="add-circle" size={scaleSize(20)} color={COLORS.neutral.white} />
          <Text style={[styles.primaryButtonText, { marginLeft: SPACING.sm }]}>
            {t('onboarding.addFood')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    );
  };

  const renderRecipes = () => (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.recipesContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>{t('onboarding.recipesForYou')}</Text>
      <Text style={styles.stepSubtitle}>{t('onboarding.recipesDescription')}</Text>

      {recipes.length > 0 ? (
        recipes.slice(0, 3).map((match) => (
          <View key={match.recipe.id} style={styles.recipeCard}>
            <View style={styles.recipeHeader}>
              <Text style={styles.recipeEmoji}>{match.recipe.imageEmoji}</Text>
              <View style={styles.recipeInfo}>
                <Text style={styles.recipeName}>{match.recipe.name}</Text>
                <Text style={styles.recipeDesc} numberOfLines={2}>
                  {match.recipe.description}
                </Text>
              </View>
            </View>
            <View style={styles.recipeMeta}>
              <View style={styles.recipeTag}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.semantic.success} />
                <Text style={styles.recipeTagText}>
                  {t('onboarding.matching', { percent: match.matchPercentage })}
                </Text>
              </View>
              <View style={styles.recipeTag}>
                <Ionicons name="time-outline" size={14} color={COLORS.text.secondary} />
                <Text style={styles.recipeTagText}>{match.recipe.preparationTime} min</Text>
              </View>
              {match.missingIngredients.length > 0 && (
                <View style={styles.recipeTag}>
                  <Ionicons name="basket-outline" size={14} color={COLORS.semantic.warningDark} />
                  <Text style={styles.recipeTagText}>
                    {t('onboarding.missingCount', { count: match.missingIngredients.length })}
                  </Text>
                </View>
              )}
              <View style={styles.recipeTag}>
                <Text style={styles.recipeTagText}>
                  {match.recipe.difficulty === 'facile' ? t('recipes.easy') :
                   match.recipe.difficulty === 'moyen' ? t('recipes.medium') :
                   t('recipes.hard')}
                </Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noRecipesCard}>
          <Ionicons name="sparkles" size={scaleSize(48)} color={COLORS.accent.gold} />
          <Text style={styles.noRecipesTitle}>{t('onboarding.noRecipesTitle')}</Text>
          <Text style={styles.noRecipesMessage}>{t('onboarding.noRecipesMessage')}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          trackOnboardingStepCompleted('recipes');
          transitionTo('ready');
        }}
        activeOpacity={0.9}
        style={[styles.primaryButton, { marginTop: SPACING['2xl'] }]}
      >
        <Text style={styles.primaryButtonText}>{t('onboarding.continue')}</Text>
        <View style={styles.buttonIconContainer}>
          <Ionicons name="arrow-forward" size={scaleSize(18)} color={COLORS.neutral.white} />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSavings = () => (
    <View style={styles.savingsSlide}>
      <Text style={styles.savingsTitle}>{t('onboarding.savingsTitle')}</Text>
      <Text style={styles.savingsSubtitle}>{t('onboarding.savingsSubtitle')}</Text>
      <View style={styles.wasteOptions}>
        {WASTE_OPTIONS.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.wasteOption, wasteLevel === idx && styles.wasteOptionSelected]}
            onPress={() => setWasteLevel(idx)}
            activeOpacity={0.8}
          >
            <Text style={[styles.wasteOptionLabel, wasteLevel === idx && styles.wasteOptionLabelSelected]}>
              {t(opt.labelKey)}
            </Text>
            <Text style={styles.wasteOptionSub}>{t(opt.subKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.savingsProjection}>
        <Text style={styles.savingsProjectionText}>{t('onboarding.savingsProjectionText')}</Text>
        <Text style={styles.savingsProjectionAmount}>
          ~{WASTE_OPTIONS[wasteLevel].goal * 10} {t('onboarding.savingsYearly')}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          transitionTo('addFood');
        }}
        activeOpacity={0.9}
        style={[styles.primaryButton, { marginTop: scaleSpacing(32) }]}
      >
        <Text style={styles.primaryButtonText}>{t('onboarding.savingsCta')}</Text>
        <View style={styles.buttonIconContainer}>
          <Ionicons name="arrow-forward" size={scaleSize(18)} color={COLORS.neutral.white} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderReady = () => (
    <View style={styles.readyContainer}>
      <LeafPattern color={COLORS.primary[500]} opacity={0.06} />

      <View style={styles.readyIconCircle}>
        <Ionicons name="checkmark-done-circle" size={scaleSize(80)} color={COLORS.primary[500]} />
      </View>

      <Text style={styles.readyTitle}>{t('onboarding.notifPermTitle')}</Text>
      <Text style={styles.readySubtitle}>{t('onboarding.notifPermSub')}</Text>

      <Text style={styles.readySummary}>
        {t('onboarding.itemsAdded', { count: addedItems.length })}
      </Text>

      <TouchableOpacity
        onPress={handleAllowNotificationsAndComplete}
        activeOpacity={0.9}
        disabled={requestingNotif}
        style={[styles.primaryButton, requestingNotif && styles.primaryButtonDisabled]}
      >
        <Ionicons name="notifications" size={scaleSize(18)} color={COLORS.neutral.white} />
        <Text style={[styles.primaryButtonText, { marginLeft: SPACING.sm }]}>
          {t('onboarding.notifAllow')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleComplete}
        activeOpacity={0.7}
        disabled={requestingNotif}
        style={styles.laterButton}
      >
        <Text style={styles.laterButtonText}>{t('onboarding.notifLater')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome': return renderWelcome();
      case 'savings': return renderSavings();
      case 'addFood': return renderAddFood();
      case 'recipes': return renderRecipes();
      case 'ready': return renderReady();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${STEP_PROGRESS[step] ?? 0}%` as any }]} />
      </View>
      {/* Header with back + step indicator */}
      <View style={styles.header}>
        {step !== 'welcome' ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={scaleSize(24)} color={COLORS.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {renderStepIndicator()}
        {step !== 'ready' ? (
          <TouchableOpacity onPress={handleComplete} style={styles.skipButton} activeOpacity={0.7}>
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      {/* Animated step content */}
      <Animated.View
        style={[
          styles.flex,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {renderStep()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.background,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.neutral.gray200 || '#e5e7eb',
    width: '100%',
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.primary[500],
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scaleSpacing(isSmallScreen ? 50 : 60),
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: COLORS.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  backPlaceholder: {
    width: scaleSize(40),
  },
  skipButton: {
    paddingHorizontal: scaleSpacing(8),
    paddingVertical: scaleSpacing(6),
    width: scaleSize(40),
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(6),
  },
  stepDot: {
    width: scaleSize(8),
    height: scaleSize(8),
    borderRadius: scaleSize(4),
    backgroundColor: COLORS.neutral.gray300,
  },
  stepDotActive: {
    width: scaleSize(24),
    backgroundColor: COLORS.primary[500],
  },
  stepDotCompleted: {
    backgroundColor: COLORS.primary[300],
  },
  stepBadge: {
    backgroundColor: hexToRgba ? hexToRgba(COLORS.primary[500], 0.1) : '#e8f5eb',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'center',
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary[500],
  },

  // Welcome
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(24),
  },
  illustrationContainer: {
    height: scaleSize(isSmallScreen ? 140 : 180),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleSpacing(isSmallScreen ? 30 : 50),
  },
  welcomeTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 28 : 34),
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: scaleFontSize(isSmallScreen ? 34 : 42),
    letterSpacing: -1,
    marginBottom: scaleSpacing(14),
  },
  welcomeSubtitle: {
    fontSize: scaleFontSize(isSmallScreen ? 14 : 16),
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: scaleFontSize(isSmallScreen ? 20 : 24),
    maxWidth: scaleSize(300),
    marginBottom: scaleSpacing(40),
  },

  // Add food
  addFoodContent: {
    paddingHorizontal: scaleSpacing(20),
    paddingTop: SPACING.lg,
    paddingBottom: scaleSpacing(40),
  },
  stepTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING['2xl'],
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.brand,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: scaleSpacing(4),
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryChipSelected: {
    borderColor: COLORS.primary[500],
    ...SHADOWS.xs,
  },
  chipText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  expirationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING['2xl'],
  },
  expirationChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: scaleSpacing(10),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1.5,
    borderColor: COLORS.neutral.gray300,
  },
  expirationChipSelected: {
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  expirationChipText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  expirationChipTextSelected: {
    color: COLORS.primary[500],
    fontWeight: '600',
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.lg,
    paddingVertical: scaleSpacing(isSmallScreen ? 14 : 16),
    paddingHorizontal: SPACING['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.colored(COLORS.primary[500], 0.3),
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.neutral.grayDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: COLORS.neutral.white,
    fontSize: scaleFontSize(isSmallScreen ? 15 : 17),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    marginLeft: scaleSpacing(10),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: scaleSize(10),
    padding: scaleSpacing(5),
  },
  secondaryButton: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    paddingVertical: scaleSpacing(isSmallScreen ? 14 : 16),
    paddingHorizontal: SPACING['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: COLORS.primary[500],
    gap: SPACING.sm,
  },
  secondaryButtonText: {
    color: COLORS.primary[500],
    fontSize: scaleFontSize(isSmallScreen ? 15 : 17),
    fontWeight: '700',
  },

  // Add more
  addMoreContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: scaleSpacing(24),
  },
  successCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING['3xl'],
    alignItems: 'center',
    ...SHADOWS.lg,
    marginBottom: SPACING['3xl'],
  },
  successIconCircle: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.semantic.success,
    marginBottom: SPACING.lg,
  },
  itemPreview: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  itemPreviewName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
  },
  itemPreviewCategory: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  itemCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  checkMark: {
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
  },
  itemPill: {
    backgroundColor: hexToRgba ? hexToRgba(COLORS.primary[500], 0.1) : '#e8f5eb',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  itemPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  savingsText: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  addMoreButtons: {
    gap: SPACING.md,
  },
  ahaMomentBanner: {
    backgroundColor: COLORS.primary[500] + '15',
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[500],
    padding: scaleSpacing(12),
    marginBottom: scaleSpacing(16),
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  ahaMomentEmoji: {
    fontSize: scaleFontSize(20),
  },
  ahaMomentText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.primary[500],
    flex: 1,
  },

  // Recipes
  recipesContent: {
    paddingHorizontal: scaleSpacing(20),
    paddingTop: SPACING.lg,
    paddingBottom: scaleSpacing(40),
  },
  recipeCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  recipeEmoji: {
    fontSize: scaleSize(36),
    marginRight: SPACING.md,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
  },
  recipeDesc: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  recipeMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  recipeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(4),
    backgroundColor: COLORS.neutral.gray50,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  recipeTagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },
  noRecipesCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS['2xl'],
    padding: SPACING['3xl'],
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  noRecipesTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  noRecipesMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Ready
  savingsSlide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleSpacing(24),
  },
  savingsTitle: {
    fontSize: scaleFontSize(22),
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: scaleSpacing(8),
  },
  savingsSubtitle: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: scaleSpacing(20),
    maxWidth: scaleSize(300),
  },
  wasteOptions: {
    width: '100%',
    gap: scaleSpacing(12),
    marginBottom: scaleSpacing(32),
  },
  wasteOption: {
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(60,110,71,0.2)',
    padding: scaleSpacing(16),
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  wasteOptionSelected: {
    borderColor: COLORS.primary[500],
    backgroundColor: 'rgba(60,110,71,0.06)',
  },
  wasteOptionLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  wasteOptionLabelSelected: {
    color: COLORS.primary[500],
  },
  wasteOptionSub: {
    fontSize: scaleFontSize(12),
    color: COLORS.text.tertiary,
    marginTop: scaleSpacing(2),
  },
  savingsProjection: {
    alignItems: 'center',
    backgroundColor: 'rgba(60,110,71,0.06)',
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(20),
    width: '100%',
  },
  savingsProjectionText: {
    fontSize: scaleFontSize(14),
    color: COLORS.text.secondary,
    marginBottom: scaleSpacing(8),
    textAlign: 'center',
  },
  savingsProjectionAmount: {
    fontSize: scaleFontSize(40),
    fontWeight: '800',
    color: COLORS.primary[500],
  },
  readyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(24),
  },
  readyIconCircle: {
    marginBottom: SPACING['2xl'],
  },
  readyTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  readySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: scaleSize(280),
    marginBottom: SPACING.lg,
  },
  readySummary: {
    ...TYPOGRAPHY.label,
    color: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING['3xl'],
  },
  laterButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  laterButtonText: {
    ...TYPOGRAPHY.bodySm,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  afterAddContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(24),
  },
  afterAddIconCircle: {
    marginBottom: SPACING.xl,
  },
  afterAddTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  afterAddSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: scaleSize(300),
  },
});
