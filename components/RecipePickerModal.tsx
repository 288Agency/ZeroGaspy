import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Recipe, findMatchingRecipesWithUser, getAllRecipesWithUser } from '../services/recipeService';
import { loadLists } from '../utils/localStorage';
import { FoodItem } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../utils/designSystem';
import logger from '../utils/logger';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
}

export default function RecipePickerModal({ visible, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [urgentIds, setUrgentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setLoading(true);
    (async () => {
      try {
        const [all, lists] = await Promise.all([
          getAllRecipesWithUser(user?.id),
          loadLists(),
        ]);
        const inventory: FoodItem[] = lists.flatMap(l =>
          l.items.filter(i => i.status === 'active' || !i.status)
        );
        const matches = await findMatchingRecipesWithUser(inventory, user?.id);
        const ranked = matches
          .filter(m => m.urgencyScore > 0 || m.matchPercentage >= 25)
          .map(m => m.recipe.id);
        setUrgentIds(new Set(ranked));
        const rankedSet = new Set(ranked);
        const sorted = [...all].sort((a, b) => {
          const au = rankedSet.has(a.id) ? 0 : 1;
          const bu = rankedSet.has(b.id) ? 0 : 1;
          if (au !== bu) return au - bu;
          return a.name.localeCompare(b.name);
        });
        setRecipes(sorted);
      } catch (e) {
        logger.error('Error loading recipes for picker:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.ingredients.some(i => i.toLowerCase().includes(q))
    );
  }, [recipes, query]);

  const renderItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        onSelect(item);
        onClose();
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.rowEmoji}>{item.imageEmoji}</Text>
      <View style={styles.rowContent}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          {urgentIds.has(item.id) && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={12} color={COLORS.text.warningDark} />
              <Text style={styles.urgentText}>{t('mealPlan.urgent')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {item.preparationTime} min · {item.ingredients.slice(0, 3).join(', ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('mealPlan.pickRecipe')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={t('mealPlan.searchPlaceholder')}
              placeholderTextColor={COLORS.text.tertiary}
            />
          </View>
          {loading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary[500]} />
          ) : (
            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('mealPlan.noRecipesFound')}</Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface.background,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '85%',
    paddingTop: SPACING.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.gray300,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.xs,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.xs,
  },
  rowEmoji: {
    fontSize: 28,
  },
  rowContent: {
    flex: 1,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowName: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surface.warningLightBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.warningDark,
  },
  rowMeta: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  loader: {
    marginVertical: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
