// ============================================================================
// ZeroGaspy · screens/CookTonightScreen.tsx (handoff port — "Cuisiner")
// ============================================================================
// LE différenciateur produit selon le handoff README §6.8 :
// UNE recette poussée (la meilleure qui sauve les urgents), en grand,
// avec justification ("Pourquoi cette recette ?") et alternatives classées.
//
// Pas un browser générique de recettes — c'est un acte d'inspiration.
//
// Structure :
//   1. TopBar         — back · (bookmark à droite, placeholder)
//   2. Editorial      — "Idée du soir" / "Ce soir, cuisine ça." + sub
//   3. cook-hero      — image gradient + badges + nom recette + meta
//   4. "Pourquoi ?"   — carte accent-soft, explique le match
//   5. Alternatives   — N autres recettes scorées par findMatchingRecipes
//
// Data : utilise findMatchingRecipes(items) déjà implémenté (recipeService).
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { Sage, Forest, Cream } from '@/tokens';
import { Badge } from '@/components/ds';
import { loadLists } from '@/utils/localStorage';
import { findMatchingRecipes, type RecipeMatch } from '@/services/recipeService';
import { getDaysUntilExpiration } from '@/utils/dateUtils';
import type { FoodItem } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CookTonight'>;

export default function CookTonightScreen() {
  const { colors, typography, layout, componentRadius, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const [items, setItems] = useState<FoodItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      const lists = await loadLists();
      const flat: FoodItem[] = [];
      for (const l of lists) for (const it of l.items) flat.push(it);
      setItems(flat);
    } catch (err) {
      logger.error('[CookTonight] refresh failed:', err);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Recettes scorées (tri : urgencyScore desc, puis matchPercentage)
  const ranked = useMemo<RecipeMatch[]>(() => findMatchingRecipes(items), [items]);

  // Compte les aliments urgents (≤1j) pour le sous-titre
  const urgentCount = useMemo(() => {
    let n = 0;
    for (const it of items) {
      if (it.status === 'consumed' || it.status === 'thrown') continue;
      const d = getDaysUntilExpiration(it.expirationDate);
      if (d != null && d <= 1) n++;
    }
    return n;
  }, [items]);

  const hero = ranked[0];
  const others = ranked.slice(1);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleOpenRecipe = useCallback(
    (recipeId: string) => {
      navigation.navigate('RecipeDetail', { recipeId });
    },
    [navigation],
  );
  const handleSeeAll = useCallback(() => navigation.navigate('Recipes', undefined), [navigation]);

  // ── États dégradés ───────────────────────────────────────────────────────
  if (ranked.length === 0) {
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
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: Sage[100],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}
          >
            <SymbolView name="fork.knife" size={32} tintColor={Forest[600]} />
          </View>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              letterSpacing: -0.6,
              color: colors.fg.primary,
              textAlign: 'center',
            }}
          >
            Pas encore d'idée.
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.fg.secondary, marginTop: 10, textAlign: 'center', maxWidth: 320 },
            ]}
          >
            Ajoute des aliments dans tes listes et on te proposera une recette qui sauve tes urgents.
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
          paddingBottom: 110 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Editorial header ────────────────────────────────────────── */}
        <View style={{ paddingBottom: 16 }}>
          <View style={styles.eyebrow}>
            <SymbolView name="bolt.fill" size={12} tintColor={colors.accent.default} />
            <Text
              style={{
                fontFamily: typography.eyebrow.fontFamily,
                fontSize: 11,
                fontWeight: '500',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: colors.accent.default,
              }}
            >
              Idée du soir
            </Text>
          </View>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '700',
              letterSpacing: -1.2,
              lineHeight: 36,
              color: colors.fg.primary,
            }}
          >
            Ce soir,{' '}
            <Text style={[typography.serifItalic, { fontSize: 34, color: colors.fg.primary }]}>
              cuisine ça.
            </Text>
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.fg.secondary,
              marginTop: 8,
              letterSpacing: -0.1,
              lineHeight: 20,
            }}
          >
            {urgentCount > 0 && hero.expiringIngredients.length > 0
              ? `Sauve ${hero.expiringIngredients.length} aliment${hero.expiringIngredients.length > 1 ? 's' : ''} qui périme${hero.expiringIngredients.length > 1 ? 'nt' : ''}.`
              : 'Profite des bons ingrédients que tu as.'}
          </Text>
        </View>

        {/* ── Cook hero ───────────────────────────────────────────────── */}
        <Pressable
          onPress={() => handleOpenRecipe(hero.recipe.id)}
          style={({ pressed }) => [
            styles.heroCard,
            {
              borderRadius: componentRadius.card,
              transform: [{ scale: pressed ? 0.99 : 1 }],
              ...elevation[2],
            },
          ]}
        >
          <View style={[styles.heroImage, { borderTopLeftRadius: componentRadius.card, borderTopRightRadius: componentRadius.card }]}>
            <LinearGradient
              colors={[Sage[300], Forest[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Emoji as visual placeholder */}
            <Text style={styles.heroEmoji}>{hero.recipe.imageEmoji}</Text>

            {/* Tag row top */}
            <View style={styles.tagRow}>
              {hero.expiringIngredients.length > 0 && (
                <Badge tone="danger" variant="solid" dot={false}>
                  ★ Sauve {hero.expiringIngredients.length}
                </Badge>
              )}
              <Badge tone="success" variant="solid" dot={false}>
                {hero.recipe.preparationTime} min
              </Badge>
            </View>

            {/* Title overlay bottom */}
            <View style={styles.heroTitleWrap}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  letterSpacing: -0.4,
                  color: Cream[50],
                  textShadowColor: 'rgba(0,0,0,0.25)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {hero.recipe.name}
              </Text>
            </View>
          </View>

          {/* Meta row */}
          <View
            style={[
              styles.heroMeta,
              {
                backgroundColor: colors.bg.surface,
                borderBottomLeftRadius: componentRadius.card,
                borderBottomRightRadius: componentRadius.card,
              },
            ]}
          >
            <MetaItem icon="clock" label={`${hero.recipe.preparationTime} min`} />
            <MetaItem icon="flame" label={hero.recipe.difficulty} />
            <MetaItem icon="person" label="2 pers." />
          </View>
        </Pressable>

        {/* ── Pourquoi cette recette ? ────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.accent.soft,
            borderColor: colors.accent.border,
            borderWidth: 1,
            borderRadius: componentRadius.card,
            padding: 14,
            marginTop: 16,
            marginBottom: 22,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: Forest[700],
              marginBottom: 6,
              letterSpacing: -0.1,
            }}
          >
            Pourquoi cette recette ?
          </Text>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: Forest[700],
              letterSpacing: -0.1,
            }}
          >
            {hero.matchingIngredients.length === hero.recipe.ingredients.length
              ? `Tu as les ${hero.recipe.ingredients.length} ingrédients chez toi.`
              : `Tu as déjà ${hero.matchingIngredients.length} des ${hero.recipe.ingredients.length} ingrédients chez toi${hero.expiringIngredients.length > 0 ? ` et ça sauve ${hero.expiringIngredients.length} truc${hero.expiringIngredients.length > 1 ? 's' : ''} qui périme${hero.expiringIngredients.length > 1 ? 'nt' : ''}` : ''}.`}
          </Text>
        </View>

        {/* ── Alternatives ────────────────────────────────────────────── */}
        {others.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <Text style={[typography.sectionLabel, { color: colors.fg.secondary, fontSize: 12 }]}>
                AUTRES IDÉES · {others.length}
              </Text>
              <Pressable onPress={handleSeeAll} hitSlop={8}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.accent.default }}>
                  Tout voir
                </Text>
              </Pressable>
            </View>

            <View style={{ gap: layout.cardGap }}>
              {others.slice(0, 4).map((m) => (
                <TouchableOpacity
                  key={m.recipe.id}
                  onPress={() => handleOpenRecipe(m.recipe.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.altCard,
                    {
                      backgroundColor: colors.bg.surface,
                      borderColor: colors.border.default,
                      borderRadius: componentRadius.card,
                      ...elevation[1],
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <LinearGradient
                      colors={[Sage[200], Sage[400]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={{ fontSize: 28 }}>{m.recipe.imageEmoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        letterSpacing: -0.2,
                        marginBottom: 3,
                        color: colors.fg.primary,
                      }}
                    >
                      {m.recipe.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                      <MiniMeta>
                        <SymbolView name="clock" size={12} tintColor={colors.fg.secondary} />
                        <Text style={{ fontSize: 12, color: colors.fg.secondary, marginLeft: 3 }}>
                          {m.recipe.preparationTime} min
                        </Text>
                      </MiniMeta>
                      <Text style={{ fontSize: 12, color: colors.fg.secondary }}>
                        ✓ {m.matchingIngredients.length}/{m.recipe.ingredients.length} ingr.
                      </Text>
                      {m.expiringIngredients.length > 0 && (
                        <Text style={{ fontSize: 12, color: colors.feedback.danger.fg }}>
                          · sauve {m.expiringIngredients.length}
                        </Text>
                      )}
                    </View>
                  </View>
                  <SymbolView
                    name="chevron.right"
                    size={14}
                    tintColor={colors.fg.muted}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
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
    </View>
  );
}

function MetaItem({ icon, label }: { icon: 'clock' | 'flame' | 'person'; label: string }) {
  const { colors } = useTheme();
  const symbolName = icon === 'person' ? 'person.fill' : icon === 'flame' ? 'flame.fill' : 'clock';
  return (
    <View style={styles.metaItem}>
      <SymbolView name={symbolName} size={14} tintColor={colors.fg.secondary} />
      <Text style={{ fontSize: 13, color: colors.fg.secondary, marginLeft: 5, letterSpacing: -0.1 }}>
        {label}
      </Text>
    </View>
  );
}

function MiniMeta({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{children}</View>;
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
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  heroCard: {
    overflow: 'hidden',
  },
  heroImage: {
    height: 220,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 14,
  },
  heroEmoji: {
    position: 'absolute',
    right: 18,
    bottom: 60,
    fontSize: 84,
    opacity: 0.85,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  heroTitleWrap: {
    marginTop: 'auto',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
  },
});
