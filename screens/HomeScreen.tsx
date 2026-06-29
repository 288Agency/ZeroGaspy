// ============================================================================
// ZeroGaspy · screens/HomeScreen.tsx (handoff port — "Aujourd'hui")
// ============================================================================
// Écran principal. Structure handoff :
//   1. TopBar       — logo Z (gauche) · recherche + cloche (droite)
//   2. Greeting     — « Bonjour {prénom}. » + sous-titre date
//   3. today-hero   — gradient forêt + glow, compteur urgents → Cuisiner
//   4. À statuer    — liste ProductCard urgents avec actions inline
//   5. Bento        — économisé / bientôt / série
//   6. Mes espaces  — listes réelles avec compteurs alert/warn
//
// Auto-suffisant : charge `loadLists()` + `calculateUserStats()` au focus,
// dérive urgents/next3, mappe icône Ionicons → SF Symbol, wire les actions
// sur `markItemConsumed`/`markItemThrown`.
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
import { SymbolView, SFSymbol } from 'expo-symbols';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage, Cream } from '@/tokens';
import { ProductCard, Badge } from '@/components/ds';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import {
  loadLists,
  markItemConsumed,
  markItemThrown,
} from '@/utils/localStorage';
import { getDaysUntilExpiration } from '@/utils/dateUtils';
import { calculateUserStats } from '@/services/statsService';
import { getMonthlySavings, getMonthlySavingsGoal } from '@/services/monthlySavingsService';
import type { FoodItem, List, UserStats } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';

// Composants legacy ré-injectés (palette héritée via designSystem.ts retouché)
import WeeklyChallengeCard from '@/components/WeeklyChallengeCard';
import ReferralCard from '@/components/ReferralCard';
import WeeklyRecapModal from '@/components/WeeklyRecapModal';

// ────────────────────────────────────────────────────────────────────────────
// Modèle interne — flatten d'items rattachés à leur liste source
// ────────────────────────────────────────────────────────────────────────────

type LiveFood = {
  id: string;
  listId: string;
  name: string;
  quantityLabel: string;
  daysLeft: number;
  imageUri?: string;
};

type LiveSpace = {
  id: string;       // listId
  label: string;    // list.title
  icon: SFSymbol;
  count: number;
  alert: number;    // items <= 1j
  warn: number;     // items 2..3j
  color?: string;
};

// Map des icônes Ionicons (LIST_ICONS) → SF Symbols (handoff utilise expo-symbols)
const ICON_MAP: Record<string, SFSymbol> = {
  'snow-outline':              'refrigerator.fill',
  'cube-outline':              'snowflake',
  'basket-outline':            'basket.fill',
  'nutrition-outline':         'leaf.fill',
  'leaf-outline':              'leaf.fill',
  'restaurant-outline':        'fork.knife',
  'wine-outline':              'wineglass.fill',
  'beer-outline':              'mug.fill',
  'file-tray-stacked-outline': 'cabinet.fill',
  'briefcase-outline':         'briefcase.fill',
  'home-outline':              'house.fill',
  'cart-outline':              'cart.fill',
};

function mapIcon(ionIcon?: string): SFSymbol {
  if (!ionIcon) return 'tray.fill';
  return ICON_MAP[ionIcon] ?? 'tray.fill';
}

function flattenLiveFoods(lists: List[]): LiveFood[] {
  const out: LiveFood[] = [];
  for (const list of lists) {
    for (const item of list.items) {
      if (item.status === 'consumed' || item.status === 'thrown') continue;
      const days = getDaysUntilExpiration(item.expirationDate);
      if (days == null) continue;
      const qty = item.quantity ?? 1;
      const unit = item.unit ?? '';
      out.push({
        id: item.id,
        listId: list.id,
        name: item.name,
        quantityLabel: unit ? `${qty} ${unit}` : `${qty}`,
        daysLeft: days,
        imageUri: item.imageUri,
      });
    }
  }
  return out;
}

function deriveSpaces(lists: List[], foods: LiveFood[]): LiveSpace[] {
  const mapped = lists.map((list) => {
    const items = foods.filter((f) => f.listId === list.id);
    return {
      id: list.id,
      label: list.title,
      icon: mapIcon(list.icon),
      count: items.length,
      alert: items.filter((f) => f.daysLeft <= 1).length,
      warn:  items.filter((f) => f.daysLeft > 1 && f.daysLeft <= 3).length,
      color: list.color,
    };
  });
  // Tri handoff §6.3 : urgent desc → warn desc → ordre d'origine stable
  return mapped.sort((a, b) => {
    if (a.alert !== b.alert) return b.alert - a.alert;
    if (a.warn !== b.warn) return b.warn - a.warn;
    return 0;
  });
}

function formatGreetingDate(d: Date): string {
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · belle journée pour vider ton frigo.`;
}

function extractFirstName(authUser: any, fallback = 'toi'): string {
  const meta = authUser?.user_metadata;
  const full = meta?.full_name || meta?.name || authUser?.email;
  if (!full || typeof full !== 'string') return fallback;
  return full.split(/[\s@]/)[0] || fallback;
}

// ────────────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────────────

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type RoutePropT = RouteProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const { colors, typography, layout, componentRadius, elevation, glow } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropT>();
  const { user } = useAuth();
  const { challengesState, gamificationData } = useGamification();

  const [lists, setLists] = useState<List[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [monthlySaved, setMonthlySaved] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(50);
  const [recapVisible, setRecapVisible] = useState(false);

  // Notification weekly_recap → utils/notificationNavigation.ts route vers
  // Home { showWeeklyRecap: true }. v1 ouvrait WeeklyRecapModal → on rebrand.
  useEffect(() => {
    if (route.params?.showWeeklyRecap) {
      setRecapVisible(true);
      navigation.setParams({ showWeeklyRecap: undefined } as any);
    }
  }, [route.params?.showWeeklyRecap, navigation]);

  const hasBadges = (gamificationData?.badges?.length ?? 0) >= 1;

  const refresh = useCallback(async () => {
    try {
      const [nextLists, nextStats, nextMonthly, nextGoal] = await Promise.all([
        loadLists(),
        calculateUserStats().catch((err) => {
          logger.warn('[HomeV2] calculateUserStats failed:', err);
          return null;
        }),
        getMonthlySavings().catch(() => 0),
        getMonthlySavingsGoal().catch(() => 50),
      ]);
      setLists(nextLists);
      setStats(nextStats);
      setMonthlySaved(nextMonthly);
      setMonthlyGoal(nextGoal);
    } catch (err) {
      logger.error('[HomeV2] refresh failed:', err);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const foods = useMemo(() => flattenLiveFoods(lists), [lists]);
  const urgents = useMemo(
    () => foods.filter((f) => f.daysLeft <= 1).sort((a, b) => a.daysLeft - b.daysLeft),
    [foods],
  );
  const next3 = useMemo(
    () => foods.filter((f) => f.daysLeft > 1 && f.daysLeft <= 3),
    [foods],
  );
  const spaces = useMemo(() => deriveSpaces(lists, foods), [lists, foods]);

  const userName = extractFirstName(user);
  const dateLabel = useMemo(() => formatGreetingDate(new Date()), []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePressItem = useCallback((itemId: string) => {
    const f = foods.find((x) => x.id === itemId);
    if (!f) return;
    navigation.navigate('ProductDetail', { itemId, listId: f.listId });
  }, [foods, navigation]);

  const handlePressSpace = useCallback((space: LiveSpace) => {
    navigation.navigate('InventoryList', {
      listId: space.id,
      listTitle: space.label,
      listColor: space.color,
    });
  }, [navigation]);

  const handleCookTonight = useCallback(() => {
    navigation.navigate('CookTonight');
  }, [navigation]);

  const handleConsume = useCallback(async (itemId: string) => {
    const f = foods.find((x) => x.id === itemId);
    if (!f) return;
    try {
      await markItemConsumed(f.listId, itemId);
      await refresh();
    } catch (err) {
      logger.error('[HomeV2] markItemConsumed failed:', err);
    }
  }, [foods, refresh]);

  const handleTrash = useCallback(async (itemId: string) => {
    const f = foods.find((x) => x.id === itemId);
    if (!f) return;
    try {
      await markItemThrown(f.listId, itemId);
      await refresh();
    } catch (err) {
      logger.error('[HomeV2] markItemThrown failed:', err);
    }
  }, [foods, refresh]);

  // Stats avec fallbacks visuels si pas encore chargées
  // Bento "économisé" = mois en cours (handoff intent + actionnable vs total)
  const savedAmount = monthlySaved;
  const savedEuros = Math.floor(savedAmount);
  const savedCents = Math.round((savedAmount - savedEuros) * 100);
  const goalProgress = monthlyGoal > 0 ? Math.min(1, savedAmount / monthlyGoal) : 0;
  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const streakRemainingForRecord = Math.max(0, longestStreak - currentStreak);

  // Hero state-aware (v1 HeroSection avait gradient calm/warning/urgent)
  // calm: 0 urgent · warning: 1-2 · urgent: 3+
  const heroState: 'calm' | 'warning' | 'urgent' =
    urgents.length >= 3 ? 'urgent' : urgents.length >= 1 ? 'warning' : 'calm';
  const heroSolid: string =
    heroState === 'urgent'
      ? '#B23A1A'
      : heroState === 'warning'
        ? '#C2410C'
        : Forest[700];

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
          <IconButton icon="magnifyingglass" label="Recherche" />
          <IconButton icon="bell" label="Notifications" />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPaddingH,
          paddingTop: 8,
          paddingBottom: 110 + insets.bottom,
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

        {/* ── 2. today-hero — fond plein, typo display, pas de gradient ── */}
        <Pressable
          onPress={handleCookTonight}
          accessibilityRole="button"
          accessibilityLabel={
            urgents.length > 0
              ? `${urgents.length} aliments à sauver aujourd'hui. Toucher pour voir l'idée du soir.`
              : `Rien d'urgent. Toucher pour explorer des recettes.`
          }
          style={({ pressed }) => [
            styles.hero,
            {
              backgroundColor: heroSolid,
              borderRadius: componentRadius.hero,
              paddingHorizontal: 24,
              paddingTop: 26,
              paddingBottom: 22,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}
        >
          <Text
            style={[
              typography.eyebrow,
              { color: Cream[50], opacity: 0.6, letterSpacing: 1.4, textTransform: 'uppercase' },
            ]}
          >
            À sauver aujourd'hui
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 10 }}>
            <Text
              style={{
                color: Cream[50],
                fontSize: 72,
                fontWeight: '800',
                letterSpacing: -3,
                lineHeight: 72,
                fontVariant: ['tabular-nums'],
              }}
            >
              {String(urgents.length).padStart(2, '0')}
            </Text>
            <Text
              style={[
                typography.serifItalic,
                {
                  color: Cream[50],
                  opacity: 0.7,
                  fontSize: 30,
                  marginLeft: 10,
                  letterSpacing: -0.8,
                },
              ]}
            >
              {urgents.length === 1 ? 'truc' : 'trucs'}
            </Text>
          </View>

          <Text
            style={{
              color: Cream[50],
              opacity: 0.78,
              fontSize: 14,
              lineHeight: 20,
              marginTop: 14,
              letterSpacing: -0.1,
            }}
            numberOfLines={2}
          >
            {urgents.length > 0
              ? `${urgents.slice(0, 3).map((f) => f.name.split(' ')[0]).join(', ')} · idée du soir`
              : `Rien d'urgent — explore des recettes`}
          </Text>
        </Pressable>

        {/* ── 3. À statuer — urgents avec actions inline ──────────────── */}
        {urgents.length > 0 && (
          <>
            <SectionHead label={`À statuer · ${urgents.length}`} />
            <View style={{ gap: layout.cardGap, marginBottom: layout.sectionGap }}>
              {urgents.map((f) => (
                <ProductCard
                  key={f.id}
                  name={f.name}
                  image={f.imageUri ? { uri: f.imageUri } : undefined}
                  daysUntilExpiration={f.daysLeft}
                  quantity={f.quantityLabel}
                  onPress={() => handlePressItem(f.id)}
                  onConsume={() => handleConsume(f.id)}
                  onTrash={() => handleTrash(f.id)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── 3b. Mes espaces — feature core remontée au-dessus du fold ── */}
        {spaces.length === 0 ? (
          <>
            <SectionHead label="Mes espaces" />
            <Pressable
              onPress={() => navigation.navigate('CreateList')}
              style={({ pressed }) => [
                styles.plannerCta,
                {
                  backgroundColor: colors.bg.surface,
                  borderColor: colors.border.default,
                  borderRadius: componentRadius.card,
                  opacity: pressed ? 0.85 : 1,
                  ...elevation[1],
                },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: Sage[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <SymbolView name="plus" size={20} tintColor={Forest[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.fg.primary, letterSpacing: -0.2 }}>
                  Créez votre première liste
                </Text>
                <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 2 }]}>
                  Frigo, garde-manger, congélateur…
                </Text>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={colors.fg.muted} />
            </Pressable>
          </>
        ) : (
          <>
            <SectionHead
              label="Mes espaces"
              actionLabel="+ Nouvelle"
              onAction={() => navigation.navigate('CreateList')}
            />
            <View style={{ gap: layout.cardGap }}>
              {spaces.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => handlePressSpace(s)}
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
                      {s.count} aliment{s.count > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {s.alert > 0 && (
                    <Badge tone="danger" variant="solid" dot={false}>
                      {String(s.alert)}
                    </Badge>
                  )}
                  {s.alert === 0 && s.warn > 0 && (
                    <Badge tone="warning" dot={false}>
                      {String(s.warn)}
                    </Badge>
                  )}
                  <SymbolView
                    name="chevron.right"
                    size={14}
                    tintColor={colors.fg.muted}
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>
              ))}
            </View>
          </>
        )}

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
                {savedEuros}
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
                ,{String(savedCents).padStart(2, '0')}
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
              {savedEuros === 0 && savedCents === 0
                ? 'Sauve ton premier aliment'
                : `ce mois / ${Math.round(monthlyGoal)}€`}
            </Text>
            {/* Progress bar vers objectif mensuel */}
            <View
              style={{
                marginTop: 8,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(34, 82, 48, 0.12)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${goalProgress * 100}%`,
                  height: '100%',
                  backgroundColor: Forest[600],
                  borderRadius: 2,
                }}
              />
            </View>
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
              {next3.length === 0 ? 'tout va bien' : 'dans 3 jours'}
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
                  {currentStreak === 0
                    ? 'Lance ta série'
                    : `Série de ${currentStreak} jour${currentStreak > 1 ? 's' : ''}`}
                </Text>
                <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 2 }]}>
                  {longestStreak > 0 && streakRemainingForRecord > 0
                    ? `Plus que ${streakRemainingForRecord}j pour ton record (${longestStreak}j).`
                    : currentStreak > 0 && currentStreak >= longestStreak
                      ? 'Nouveau record ! Continue.'
                      : 'Consomme un aliment avant péremption pour démarrer.'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 4b. Engagement : Challenge hebdo + MealPlanner CTA + Referral ── */}
        {challengesState && (
          <View style={{ marginTop: layout.sectionGap }}>
            <WeeklyChallengeCard challengesState={challengesState} />
          </View>
        )}

        {/* Planner — ghost row, action secondaire (visuellement subordonnée au Challenge) */}
        <Pressable
          onPress={() => navigation.navigate('MealPlanner')}
          accessibilityRole="button"
          accessibilityLabel="Planifier les repas de la semaine"
          style={({ pressed }) => [
            styles.plannerGhost,
            { opacity: pressed ? 0.55 : 1 },
          ]}
        >
          <SymbolView name="calendar" size={18} tintColor={colors.fg.secondary} />
          <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '500', color: colors.fg.primary }}>
            Planifier les repas
          </Text>
          <SymbolView name="chevron.right" size={13} tintColor={colors.fg.muted} />
        </Pressable>

        {user && hasBadges && (
          <View style={{ marginTop: 12 }}>
            <ReferralCard userId={user.id} hasBadges={true} />
          </View>
        )}

      </ScrollView>

      {/* Recap hebdo — déclenché par push notif weekly_recap (route param) */}
      <WeeklyRecapModal
        visible={recapVisible}
        onClose={() => setRecapVisible(false)}
      />
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
  icon: SFSymbol;
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
  plannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  plannerGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 6,
  },
});
