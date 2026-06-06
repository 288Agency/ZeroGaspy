// ============================================================================
// ZeroGaspy · screens/v2/HomeScreen.tsx (handoff port — "Aujourd'hui")
// ============================================================================
// Écran principal, port direct du handoff (reference/screens/Home.jsx).
//
// Structure :
//   1. TopBar       — logo Z (gauche) · recherche + cloche (droite)
//   2. Greeting     — « Bonjour Sarah. » + sous-titre date
//   3. today-hero   — gradient forêt + glow, compteur « 03 trucs » → Cuisiner
//   4. À statuer    — liste ProductCard urgents avec actions inline
//   5. Bento        — économisé / bientôt / série 12 jours
//   6. Mes espaces  — Frigo / Placard / Congélateur
//
// État : utilise des SEED data inline pour le port v1 (juger le rendu réel
// avant de wirer au store). TODO: brancher sur `loadLists()` une fois le
// rendu validé par le user.
//
// Pas swappé dans la nav — additif, comme ProductDetailScreen v2.
// ============================================================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage, Cream } from '@/tokens';
import { ProductCard, Badge } from '@/components/ds';

// ────────────────────────────────────────────────────────────────────────────
// Seed data (port direct de reference/data.jsx) — à remplacer par le store.
// ────────────────────────────────────────────────────────────────────────────

type SeedFood = {
  id: string;
  name: string;
  space: 'fridge' | 'pantry' | 'freezer';
  category: string;
  quantity: number;
  unit: string;
  daysLeft: number;
};

const SEED_FOODS: SeedFood[] = [
  { id: 'f1', name: 'Yaourts nature Danone',  space: 'fridge', category: 'dairy', quantity: 4,   unit: 'pots',   daysLeft: 0 },
  { id: 'f2', name: 'Crème fraîche épaisse',  space: 'fridge', category: 'dairy', quantity: 120, unit: 'ml',     daysLeft: 1 },
  { id: 'f3', name: 'Salade verte (sachet)',  space: 'fridge', category: 'veg',   quantity: 1,   unit: 'sachet', daysLeft: 1 },
  { id: 'f4', name: 'Jambon Fleury Michon',   space: 'fridge', category: 'meat',  quantity: 3,   unit: 'tr.',    daysLeft: 3 },
  { id: 'f5', name: 'Tomates cerises',        space: 'fridge', category: 'veg',   quantity: 220, unit: 'g',      daysLeft: 3 },
  { id: 'f6', name: 'Beurre doux Président',  space: 'fridge', category: 'dairy', quantity: 180, unit: 'g',      daysLeft: 12 },
  { id: 'f7', name: 'Pain de mie',            space: 'pantry', category: 'bakery', quantity: 8,  unit: 'tr.',    daysLeft: 4 },
  { id: 'f8', name: 'Riz basmati',            space: 'pantry', category: 'other', quantity: 800, unit: 'g',      daysLeft: 180 },
  { id: 'f9', name: 'Saumon ×2',              space: 'freezer', category: 'meat', quantity: 2,   unit: 'pavés',  daysLeft: 60 },
];

const SPACES = [
  { id: 'fridge',  label: 'Frigo',       icon: 'refrigerator.fill' as const },
  { id: 'pantry',  label: 'Placard',     icon: 'cabinet.fill' as const },
  { id: 'freezer', label: 'Congélateur', icon: 'snowflake' as const },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers (port de data.jsx)
// ────────────────────────────────────────────────────────────────────────────

const urgentFoods = (foods: SeedFood[]) =>
  foods.filter((f) => f.daysLeft <= 1).sort((a, b) => a.daysLeft - b.daysLeft);

const foodsInSpace = (foods: SeedFood[], spaceId: string) =>
  foods.filter((f) => f.space === spaceId);

// ────────────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────────────

export interface HomeScreenProps {
  onPressItem?: (id: string) => void;
  onPressSpace?: (spaceId: string) => void;
  onPressCookTonight?: () => void;
  onPressSearch?: () => void;
  onPressNotifications?: () => void;
  /** Callbacks d'action — à wirer sur le store une fois le rendu validé */
  onConsume?: (id: string) => void;
  onTrash?: (id: string) => void;
  /** Données — par défaut, utilise SEED_FOODS (mode démo) */
  foods?: SeedFood[];
  userName?: string;
  dateLabel?: string;
}

export default function HomeScreen({
  onPressItem,
  onPressSpace,
  onPressCookTonight,
  onPressSearch,
  onPressNotifications,
  onConsume,
  onTrash,
  foods = SEED_FOODS,
  userName = 'Sarah',
  dateLabel = 'Jeudi 6 juin · belle journée pour vider ton frigo.',
}: HomeScreenProps) {
  const { colors, typography, space, layout, componentRadius, elevation, glow } = useTheme();
  const insets = useSafeAreaInsets();

  const urgents = useMemo(() => urgentFoods(foods), [foods]);
  const next3 = useMemo(
    () => foods.filter((f) => f.daysLeft > 1 && f.daysLeft <= 3),
    [foods],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      {/* ── TopBar ────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.topbar,
          { paddingTop: insets.top + 6, paddingHorizontal: 14 },
        ]}
      >
        <View style={styles.topbarLeft}>
          <LogoMonogram size={28} />
        </View>
        <View style={styles.topbarRight}>
          <IconButton icon="magnifyingglass" onPress={onPressSearch} label="Recherche" />
          <IconButton icon="bell" onPress={onPressNotifications} label="Notifications" />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 8,
          paddingBottom: 110 + insets.bottom, // place pour la tabbar flottante
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Greeting éditorial ───────────────────────────────────── */}
        <View style={{ paddingBottom: 18 }}>
          <Text style={[typography.title1, { color: colors.fg.primary, lineHeight: 36 }]}>
            Bonjour{' '}
            <Text style={[typography.title1, typography.serifItalic, { color: colors.fg.primary }]}>
              {userName}.
            </Text>
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.fg.secondary, marginTop: 8, letterSpacing: -0.1 },
            ]}
          >
            {dateLabel}
          </Text>
        </View>

        {/* ── 2. today-hero (focus du jour) ───────────────────────────── */}
        <Pressable
          onPress={onPressCookTonight}
          style={({ pressed }) => [
            styles.hero,
            {
              borderRadius: componentRadius.hero,
              transform: [{ scale: pressed ? 0.99 : 1 }],
              ...glow,
            },
          ]}
        >
          <LinearGradient
            colors={[Forest[600], Forest[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: componentRadius.hero }]}
          />
          {/* halo radial sage en haut à droite — simulé par un second gradient */}
          <LinearGradient
            colors={['rgba(168,209,131,0.35)', 'transparent']}
            start={{ x: 0.9, y: 0.1 }}
            end={{ x: 0.3, y: 0.6 }}
            style={[StyleSheet.absoluteFill, { borderRadius: componentRadius.hero }]}
          />

          <View style={{ padding: 20 }}>
            <Text style={[typography.eyebrow, { color: Cream[50], opacity: 0.7 }]}>
              À sauver aujourd'hui
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
              <Text style={[typography.hero, { color: Cream[50] }]}>
                {String(urgents.length).padStart(2, '0')}
              </Text>
              <Text
                style={[
                  typography.hero,
                  typography.serifItalic,
                  { color: Cream[50], opacity: 0.85, marginLeft: 6, fontSize: 32, letterSpacing: -1.5 },
                ]}
              >
                trucs
              </Text>
            </View>
            <Text
              style={[
                typography.body,
                {
                  color: Cream[50],
                  opacity: 0.92,
                  marginTop: 8,
                  letterSpacing: -0.2,
                  lineHeight: 20,
                },
              ]}
            >
              {urgents.slice(0, 3).map((f) => f.name.split(' ')[0]).join(', ')}.{'  '}
              <Text style={{ fontWeight: '700' }}>Touche pour voir l'idée du soir →</Text>
            </Text>
          </View>
        </Pressable>

        {/* ── 3. À statuer — urgents avec actions inline ──────────────── */}
        <SectionHead label={`À statuer · ${urgents.length}`} actionLabel="Tout voir" />
        <View style={{ gap: layout.cardGap, marginBottom: layout.sectionGap }}>
          {urgents.map((f) => (
            <ProductCard
              key={f.id}
              name={f.name}
              daysUntilExpiration={f.daysLeft}
              quantity={`${f.quantity} ${f.unit}`}
              onPress={() => onPressItem?.(f.id)}
              onConsume={onConsume ? () => onConsume(f.id) : undefined}
              onTrash={onTrash ? () => onTrash(f.id) : undefined}
            />
          ))}
        </View>

        {/* ── 4. Bento — économisé / bientôt / série ──────────────────── */}
        <SectionHead label="Cette semaine" />
        <View style={[styles.bento, { gap: layout.bentoGap }]}>
          {/* Économisé — carte accent */}
          <View
            style={[
              styles.bentoStat,
              {
                backgroundColor: colors.accent.soft,
                borderColor: colors.accent.border,
                borderRadius: componentRadius.card,
                padding: layout.cardPaddingLg,
                flex: 1,
                ...elevation[2],
              },
            ]}
          >
            <Text style={[typography.sectionLabel, { color: Forest[600], opacity: 0.75, fontSize: 10 }]}>
              économisé
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
              <Text
                style={{
                  color: Forest[700],
                  fontSize: 28,
                  fontWeight: '700',
                  letterSpacing: -0.8,
                  lineHeight: 28,
                }}
              >
                38
              </Text>
              <Text
                style={[
                  typography.serifItalic,
                  {
                    color: Forest[700],
                    fontSize: 22,
                    letterSpacing: -0.6,
                  },
                ]}
              >
                ,40
              </Text>
              <Text
                style={{
                  color: Forest[700],
                  fontSize: 22,
                  fontWeight: '700',
                  letterSpacing: -0.6,
                  marginLeft: 2,
                }}
              >
                €
              </Text>
            </View>
            <Text style={[typography.footnote, { color: Forest[600], opacity: 0.8, marginTop: 2 }]}>
              vs. moyenne foyer
            </Text>
          </View>

          {/* Bientôt */}
          <View
            style={[
              styles.bentoStat,
              {
                backgroundColor: colors.bg.surface,
                borderColor: colors.border.default,
                borderRadius: componentRadius.card,
                padding: layout.cardPaddingLg,
                flex: 1,
                ...elevation[2],
              },
            ]}
          >
            <Text style={[typography.sectionLabel, { color: colors.fg.tertiary, fontSize: 10 }]}>
              bientôt
            </Text>
            <Text
              style={{
                color: colors.fg.primary,
                fontSize: 28,
                fontWeight: '700',
                letterSpacing: -0.8,
                lineHeight: 28,
                marginTop: 6,
              }}
            >
              {String(next3.length).padStart(2, '0')}
            </Text>
            <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 2 }]}>
              dans 3 jours
            </Text>
          </View>

          {/* Série — full width */}
          <View
            style={[
              styles.bentoStat,
              {
                backgroundColor: colors.bg.surface,
                borderColor: colors.border.default,
                borderRadius: componentRadius.card,
                padding: layout.cardPaddingLg,
                width: '100%',
                ...elevation[2],
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.feedback.warning.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SymbolView name="flame.fill" size={22} tintColor={colors.feedback.warning.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    letterSpacing: -0.2,
                    color: colors.fg.primary,
                  }}
                >
                  Série de 12 jours
                </Text>
                <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 2 }]}>
                  Plus que 3 jours pour ton record (15j).
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 5. Mes espaces ──────────────────────────────────────────── */}
        <SectionHead label="Mes espaces" />
        <View style={{ gap: layout.cardGap }}>
          {SPACES.map((s) => {
            const items = foodsInSpace(foods, s.id);
            const alert = items.filter((f) => f.daysLeft <= 1).length;
            const warn = items.filter((f) => f.daysLeft > 1 && f.daysLeft <= 3).length;

            return (
              <Pressable
                key={s.id}
                onPress={() => onPressSpace?.(s.id)}
                style={({ pressed }) => [
                  styles.space,
                  {
                    backgroundColor: colors.bg.surface,
                    borderColor: colors.border.default,
                    borderRadius: componentRadius.card,
                    padding: layout.cardPaddingLg,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                    ...elevation[2],
                  },
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: Sage[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SymbolView name={s.icon} size={22} tintColor={Forest[600]} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      letterSpacing: -0.3,
                      color: colors.fg.primary,
                    }}
                  >
                    {s.label}
                  </Text>
                  <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 2 }]}>
                    {items.length} aliments
                  </Text>
                </View>
                {alert > 0 && (
                  <Badge tone="danger" variant="solid" dot={false}>
                    {String(alert)}
                  </Badge>
                )}
                {alert === 0 && warn > 0 && (
                  <Badge tone="warning" dot={false}>
                    {String(warn)}
                  </Badge>
                )}
                <SymbolView
                  name="chevron.right"
                  size={14}
                  tintColor={colors.fg.muted}
                  style={{ marginLeft: 6 }}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Atoms locaux
// ────────────────────────────────────────────────────────────────────────────

function SectionHead({ label, actionLabel, onAction }: { label: string; actionLabel?: string; onAction?: () => void }) {
  const { colors, typography, layout } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: layout.sectionGap,
        marginBottom: 10,
        paddingHorizontal: 4,
      }}
    >
      <Text style={[typography.sectionLabel, { color: colors.fg.secondary }]}>
        {label}
      </Text>
      {actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: colors.accent.default,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function IconButton({
  icon,
  onPress,
  label,
}: {
  icon: 'magnifyingglass' | 'bell';
  onPress?: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        padding: 8,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <SymbolView name={icon} size={22} tintColor={colors.fg.primary} />
    </Pressable>
  );
}

/** Monogramme ZG minimal — placeholder en attendant le vrai logo embarqué. */
function LogoMonogram({ size = 28 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Sage[200],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.5,
          fontWeight: '800',
          color: Forest[700],
          letterSpacing: -0.5,
        }}
      >
        Z
      </Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingBottom: 6,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', minWidth: 64 },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scroll: { flex: 1 },
  hero: {
    overflow: 'hidden',
    marginBottom: 16,
  },
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bentoStat: {
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  space: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
