import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { List, FoodItem } from '../types';
import { findMatchingRecipesWithUser, RecipeMatch } from '../services/recipeService';
import { useAuth } from '../contexts/AuthContext';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import { COLORS, RADIUS, SHADOWS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import PressableScale from './PressableScale';
import { SkeletonBox } from './Skeleton';
import { trackProactiveRecipeTapped } from '../services/analytics';

interface ProactiveRecipeCardProps {
  lists: List[];
}

export default function ProactiveRecipeCard({ lists }: ProactiveRecipeCardProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [topMatch, setTopMatch] = useState<RecipeMatch | null>(null);
  const [loading, setLoading] = useState(true);

  const allItems = useMemo(() => lists.flatMap(list => list.items), [lists]);

  useEffect(() => {
    let cancelled = false;
    if (allItems.length === 0) {
      if (!cancelled) { setTopMatch(null); setLoading(false); }
      return;
    }
    setLoading(true);
    findMatchingRecipesWithUser(allItems, user?.id).then(matches => {
      if (!cancelled) {
        setTopMatch(matches.length > 0 ? matches[0] : null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [allItems, user?.id]);

  const urgentIngredient = useMemo(() => {
    if (!topMatch || topMatch.expiringIngredients.length === 0) return null;

    let mostUrgent: { name: string; daysLeft: number } | null = null;

    for (const name of topMatch.expiringIngredients) {
      const item = allItems.find(
        i => i.name.toLowerCase() === name.toLowerCase() && i.status !== 'consumed' && i.status !== 'thrown'
      );
      if (item) {
        const days = getDaysUntilExpiration(item.expirationDate);
        if (days !== null && (!mostUrgent || days < mostUrgent.daysLeft)) {
          mostUrgent = { name: item.name, daysLeft: days };
        }
      }
    }
    return mostUrgent;
  }, [allItems, topMatch]);

  if (loading) {
    return (
      <SkeletonBox
        height={76}
        borderRadius={RADIUS.xl}
        style={{
          marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
          marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
        }}
      />
    );
  }

  if (!topMatch) return null;

  const { recipe, matchPercentage } = topMatch;

  const handlePress = () => {
    trackProactiveRecipeTapped(recipe.id, recipe.name, matchPercentage);
    navigation.navigate('Home', { screen: 'RecipesTab' } as any);
  };

  const difficultyLabel =
    recipe.difficulty === 'facile' ? t('recipes.easy') :
    recipe.difficulty === 'moyen' ? t('recipes.medium') :
    t('recipes.hard');

  return (
    <PressableScale
      onPress={handlePress}
      style={styles.container}
      hapticType="light"
      accessibilityLabel={`${t('home.tonightCook')}: ${recipe.name}`}
      accessibilityRole="button"
    >
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{recipe.imageEmoji}</Text>
        </View>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>{t('home.tonightCook')}</Text>

        <View style={styles.recipeRow}>
          <Text style={styles.recipeName} numberOfLines={1}>
            {recipe.name}
          </Text>
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{matchPercentage}%</Text>
          </View>
        </View>

        <Text style={styles.metaText}>
          {recipe.preparationTime} min &bull; {difficultyLabel}
        </Text>

        {urgentIngredient && urgentIngredient.daysLeft <= 3 && (
          <View style={styles.urgentRow}>
            <Text style={styles.flameIcon}>🔥</Text>
            <Text style={styles.urgentText} numberOfLines={1}>
              {urgentIngredient.name} — {t('home.expiresInDays', { count: urgentIngredient.daysLeft })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={scaleSize(20)} color={COLORS.text.tertiary} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary.sand,
    borderRadius: RADIUS.xl,
    padding: scaleSpacing(isSmallScreen ? 12 : 16),
    marginHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    marginBottom: scaleSpacing(isSmallScreen ? 12 : 16),
    borderWidth: 1,
    borderColor: 'rgba(60,110,71,0.12)',
    ...SHADOWS.sm,
  },
  leftSection: {
    marginRight: scaleSpacing(12),
  },
  iconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: RADIUS.lg,
    backgroundColor: hexToRgba(COLORS.status.expiringSoon, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: scaleSize(22),
  },
  contentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    fontWeight: '600',
    color: COLORS.status.expiringSoon,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  recipeName: {
    flex: 1,
    fontSize: scaleFontSize(isSmallScreen ? 14 : 15),
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  matchBadge: {
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    borderRadius: RADIUS.sm,
    paddingHorizontal: scaleSpacing(6),
    paddingVertical: 2,
    marginLeft: scaleSpacing(8),
  },
  matchText: {
    fontSize: scaleFontSize(11),
    fontWeight: '700',
    color: COLORS.primary[500],
  },
  metaText: {
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  flameIcon: {
    fontSize: scaleSize(12),
    marginRight: 4,
  },
  urgentText: {
    flex: 1,
    fontSize: scaleFontSize(isSmallScreen ? 11 : 12),
    fontWeight: '500',
    color: COLORS.semantic.dangerLight,
  },
  chevronContainer: {
    marginLeft: scaleSpacing(8),
  },
});
