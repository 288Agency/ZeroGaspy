// ============================================================================
// ZeroGaspy · screens/HomeScreen.tsx (handoff port fidèle — "Accueil")
// ============================================================================
// Reproduction fidèle de reference/screens/Home.jsx (+ screenshot 01-accueil) :
//   1. TopBar      — logo Z + « ZeroGaspy » (gauche) · avatar profil (droite)
//   2. fresh-hero  — gradient forêt + glow : eyebrow date, titre urgence
//                    (accent italique serif), CTA, ANNEAU anti-gaspi %,
//                    bandeau bas (jetés · économisés)
//   3. seg-scroll  — filtre d'espaces (pills swipe : Tout + une par liste)
//   4. À surveiller — WatchGroups dépliables (À consommer / Bientôt / Cette
//                    semaine) avec vignettes catégorie + compteur ; corps =
//                    ProductCard DS avec actions inline ✓/🗑
//   5. cook-card   — nudge « Idée du soir » → CookTonight
//
// Features hors-maquette CONSERVÉES sous la cook-card (aucune perte) :
//   WeeklyChallengeCard · MealPlanner CTA · ReferralCard · WeeklyRecapModal.
//
// AUCUNE logique/donnée touchée : mêmes `loadLists()` + `calculateUserStats()`
// + `getMonthlySavings()` au focus, mêmes `markItemConsumed`/`markItemThrown`,
// mêmes navigations. Seul le rendu change.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import FoodEmoji from '@/components/FoodEmoji';
import Gaspie from '@/components/Gaspie';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { Forest, Sage, Cream } from '@/tokens';
import { ProductCard } from '@/components/ds';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import {
  loadLists,
  markItemConsumed,
  markItemThrown,
  ensureDefaultList,
} from '@/utils/localStorage';
import { getDaysUntilExpiration } from '@/utils/dateUtils';
import { calculateUserStats } from '@/services/statsService';
import { getMonthlySavings } from '@/services/monthlySavingsService';
import type { List, UserStats } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';
import {
  trackFoodConsumed as analyticsTrackFoodConsumed,
  trackFoodThrown as analyticsTrackFoodThrown,
} from '@/services/analytics';

// Composants legacy conservés (hors-maquette, palette héritée)
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
  category?: string;
  imageUri?: string;
};

type LiveSpace = {
  id: string;       // listId
  label: string;    // list.title
  count: number;
  alert: number;    // items <= 1j
  warn: number;     // items 2..3j
  color?: string;
};

// Vignette catégorie (handoff FoodCard thumb) — pastille teintée, l'illustration
// de l'aliment est rendue par <FoodEmoji> par-dessus.
type CatMeta = { bg: string };
const CATEGORY_META: Record<string, CatMeta> = {
  dairy:       { bg: '#DCEAF6' },
  laitiers:    { bg: '#DCEAF6' },
  fruits:      { bg: '#FBE5DC' },
  veg:         { bg: Sage[200] },
  vegetables:  { bg: Sage[200] },
  'légumes':   { bg: Sage[200] },
  meat:        { bg: '#F3D9D2' },
  viande:      { bg: '#F3D9D2' },
  fish:        { bg: '#DCEAF6' },
  poisson:     { bg: '#DCEAF6' },
  bakery:      { bg: '#FAE9C3' },
  boulangerie: { bg: '#FAE9C3' },
  beverages:   { bg: '#DCEAF6' },
  boissons:    { bg: '#DCEAF6' },
  frozen:      { bg: '#DCEAF6' },
  'surgelés':  { bg: '#DCEAF6' },
  snacks:      { bg: '#FAE9C3' },
  condiments:  { bg: '#FAE9C3' },
};
const CATEGORY_DEFAULT: CatMeta = { bg: Cream[200] };

function categoryMeta(cat?: string): CatMeta {
  if (!cat) return CATEGORY_DEFAULT;
  return CATEGORY_META[cat.toLowerCase()] ?? CATEGORY_DEFAULT;
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
        category: item.category,
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

function formatEyebrowDate(d: Date): string {
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
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
  const { challengesState, gamificationData, trackFoodConsumed, trackFoodThrown } = useGamification();

  const [lists, setLists] = useState<List[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [monthlySaved, setMonthlySaved] = useState(0);
  const [recapVisible, setRecapVisible] = useState(false);
  const [listId, setListId] = useState<string>('all'); // filtre seg-scroll

  // Notification weekly_recap → route param
  useEffect(() => {
    if (route.params?.showWeeklyRecap) {
      setRecapVisible(true);
      navigation.setParams({ showWeeklyRecap: undefined } as any);
    }
  }, [route.params?.showWeeklyRecap, navigation]);

  const hasBadges = (gamificationData?.badges?.length ?? 0) >= 1;

  const refresh = useCallback(async () => {
    try {
      const [nextLists, nextStats, nextMonthly] = await Promise.all([
        loadLists(),
        calculateUserStats().catch((err) => {
          logger.warn('[Home] calculateUserStats failed:', err);
          return null;
        }),
        getMonthlySavings().catch(() => 0),
      ]);
      setLists(nextLists);
      setStats(nextStats);
      setMonthlySaved(nextMonthly);
    } catch (err) {
      logger.error('[Home] refresh failed:', err);
    }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const foods = useMemo(() => flattenLiveFoods(lists), [lists]);
  const urgents = useMemo(
    () => foods.filter((f) => f.daysLeft <= 1).sort((a, b) => a.daysLeft - b.daysLeft),
    [foods],
  );
  const spaces = useMemo(() => deriveSpaces(lists, foods), [lists, foods]);

  // Feed filtré par espace sélectionné, ≤ 7 j, trié par urgence
  const feed = useMemo(() => {
    const scoped = listId === 'all' ? foods : foods.filter((f) => f.listId === listId);
    return scoped.filter((f) => f.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [foods, listId]);

  const feedUrgent = useMemo(() => feed.filter((f) => f.daysLeft <= 1), [feed]);
  const feedWarn = useMemo(() => feed.filter((f) => f.daysLeft > 1 && f.daysLeft <= 3), [feed]);
  const feedOk = useMemo(() => feed.filter((f) => f.daysLeft > 3), [feed]);

  const dateLabel = useMemo(() => formatEyebrowDate(new Date()), []);

  // Anneau anti-gaspi : part de nourriture consommée vs jetée.
  // Sans historique, le ratio n'est pas défini — on affichait 100 %, ce qui
  // annonçait un sans-faute à quelqu'un qui n'a encore rien fait, et
  // contredisait le titre « N aliments à consommer vite » juste à côté.
  // On masque l'anneau tant qu'il n'y a rien à mesurer.
  const consumed = stats?.itemsConsumed ?? 0;
  const thrown = stats?.itemsThrown ?? 0;
  const hasWasteHistory = consumed + thrown > 0;
  const score = hasWasteHistory ? Math.round((consumed / (consumed + thrown)) * 100) : 0;
  const savedEuros = Math.floor(monthlySaved);

  // ── Handlers (inchangés) ───────────────────────────────────────────────────
  const handlePressItem = useCallback((itemId: string) => {
    const f = foods.find((x) => x.id === itemId);
    if (!f) return;
    navigation.navigate('ProductDetail', { itemId, listId: f.listId });
  }, [foods, navigation]);

  const handleCookTonight = useCallback(() => {
    navigation.navigate('CookTonight');
  }, [navigation]);

  const handleSeeList = useCallback(() => {
    navigation.navigate('ExpiringSoon');
  }, [navigation]);

  const handleFillFridge = useCallback(async () => {
    try {
      const list = lists[0] ?? (await ensureDefaultList());
      navigation.navigate('InventoryList', {
        listId: list.id,
        listTitle: list.title,
        listColor: list.color,
        listIcon: list.icon,
      });
    } catch (err) {
      logger.error('[Home] fill fridge navigation failed:', err);
    }
  }, [lists, navigation]);

  const handleProfile = useCallback(() => {
    navigation.navigate('Account');
  }, [navigation]);

  const handleConsume = useCallback(async (itemId: string) => {
    const f = foods.find((x) => x.id === itemId);
    if (!f) return;
    try {
      await markItemConsumed(f.listId, itemId);
      const beforeExpiration = f.daysLeft >= 0;
      trackFoodConsumed(beforeExpiration);
      analyticsTrackFoodConsumed({
        category: f.category,
        daysBeforeExpiry: f.daysLeft,
      });
      await refresh();
    } catch (err) {
      logger.error('[Home] markItemConsumed failed:', err);
      Alert.alert('Erreur', "Impossible de marquer l'aliment comme consommé.");
    }
  }, [foods, refresh, trackFoodConsumed]);

  const handleTrash = useCallback(async (itemId: string) => {
    const f = foods.find((x) => x.id === itemId);
    if (!f) return;
    try {
      await markItemThrown(f.listId, itemId);
      trackFoodThrown();
      analyticsTrackFoodThrown({
        category: f.category,
        daysExpired: f.daysLeft < 0 ? Math.abs(f.daysLeft) : undefined,
      });
      await refresh();
    } catch (err) {
      logger.error('[Home] markItemThrown failed:', err);
      Alert.alert('Erreur', "Impossible de jeter l'aliment.");
    }
  }, [foods, refresh, trackFoodThrown]);

  const hasUrgent = urgents.length > 0;
  // Frigo vraiment vide (aucun aliment actif) ≠ « tout est frais ».
  const isFridgeEmpty = foods.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      {/* ── TopBar : logo + ZeroGaspy · avatar ────────────────────────── */}
      <View style={[styles.topbar, { paddingTop: insets.top + 6, paddingHorizontal: layout.screenPaddingH }]}>
        <View style={styles.topbarLeft}>
          <LogoMonogram size={36} />
          <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.5, color: colors.fg.primary }}>
            ZeroGaspy
          </Text>
        </View>
        <Pressable
          onPress={handleProfile}
          accessibilityRole="button"
          accessibilityLabel="Profil"
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <LinearGradient
            colors={[Sage[400], Forest[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <SymbolView name="person.fill" size={17} tintColor="#fff" />
          </LinearGradient>
        </Pressable>
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
        {/* ── fresh-hero ──────────────────────────────────────────────── */}
        <LinearGradient
          colors={[Forest[500], Forest[600], Forest[700]]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.hero, { borderRadius: componentRadius.hero }, glow]}
        >
          <View style={styles.heroTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.heroEyebrow, { color: Cream[50] }]}>{dateLabel}</Text>

              <Text style={[styles.heroTitle, { color: Cream[50] }]}>
                {isFridgeEmpty ? (
                  <>
                    Ton frigo est{'\n'}
                    <Text style={[styles.heroTitle, typography.serifItalic, { color: Cream[50] }]}>vide.</Text>
                  </>
                ) : hasUrgent ? (
                  <>
                    {urgents.length} aliment{urgents.length > 1 ? 's' : ''} à{'\n'}consommer{' '}
                    <Text style={[styles.heroTitle, typography.serifItalic, { color: Cream[50] }]}>vite.</Text>
                  </>
                ) : (
                  <>
                    Ton frigo est{'\n'}au{' '}
                    <Text style={[styles.heroTitle, typography.serifItalic, { color: Cream[50] }]}>top.</Text>
                  </>
                )}
              </Text>

              <Pressable
                onPress={isFridgeEmpty ? handleFillFridge : hasUrgent ? handleCookTonight : handleSeeList}
                accessibilityRole="button"
                style={({ pressed }) => [styles.heroCta, { opacity: pressed ? 0.8 : 1 }]}
              >
                <SymbolView
                  name={isFridgeEmpty ? 'plus' : hasUrgent ? 'book.closed.fill' : 'arrow.right'}
                  size={14}
                  tintColor="#fff"
                />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                  {isFridgeEmpty ? 'Ajouter des aliments' : hasUrgent ? 'Cuisiner ce soir' : 'Voir la liste'}
                </Text>
              </Pressable>
            </View>

            {/* Anneau anti-gaspi — seulement quand le ratio veut dire quelque chose */}
            {hasWasteHistory && (
            <View style={styles.ring}>
              <Svg width={92} height={92} viewBox="0 0 92 92">
                <Circle cx={46} cy={46} r={40} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={8} />
                <Circle
                  cx={46}
                  cy={46}
                  r={40}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - score / 100)}
                  transform="rotate(-90 46 46)"
                />
              </Svg>
              <View style={styles.ringLabel}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -1, lineHeight: 26 }}>
                  {score}%
                </Text>
                <Text style={{ color: '#fff', fontSize: 11, opacity: 0.8, marginTop: 1 }}>anti-gaspi</Text>
              </View>
            </View>
            )}
          </View>

          {/* Bandeau stats */}
          <View style={styles.heroStats}>
            <View style={styles.fhs}>
              <Text style={styles.fhsNum}>{thrown}</Text>
              <Text style={styles.fhsLabel}>jetés ce mois</Text>
            </View>
            <View style={[styles.fhs, styles.fhsDivider]}>
              <Text style={styles.fhsNum}>{savedEuros} €</Text>
              <Text style={styles.fhsLabel}>économisés</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── seg-scroll : filtre d'espaces ───────────────────────────── */}
        {spaces.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.segScroll}
            contentContainerStyle={{ gap: 8, paddingRight: layout.screenPaddingH }}
          >
            <SegPill label="Tout" active={listId === 'all'} onPress={() => setListId('all')} />
            {spaces.map((s) => (
              <SegPill
                key={s.id}
                label={s.label}
                dotColor={s.color}
                active={listId === s.id}
                onPress={() => setListId(s.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* ── À surveiller ────────────────────────────────────────────── */}
        <View style={styles.sectionHead}>
          <Text style={[typography.sectionLabel, { color: colors.fg.secondary }]}>À surveiller</Text>
          <Text style={{ fontSize: 13, color: colors.fg.tertiary, fontWeight: '500' }}>
            {feed.length} aliment{feed.length > 1 ? 's' : ''}
          </Text>
        </View>

        {feed.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.bg.surface, borderColor: colors.border.default, borderRadius: componentRadius.card },
            ]}
          >
            {isFridgeEmpty ? (
              <>
                <Gaspie pose="emptyFridge" size={140} style={{ marginBottom: 10 }} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.fg.primary, letterSpacing: -0.3 }}>
                  Remplis ton frigo
                </Text>
                <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 4, textAlign: 'center' }]}>
                  Ajoute un aliment ou scanne ton ticket de courses pour voir ce qui périme.
                </Text>
                <Pressable
                  onPress={handleFillFridge}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.emptyCta,
                    { backgroundColor: Forest[600], opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <SymbolView name="plus" size={14} tintColor="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Commencer</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.emptyIcon, { backgroundColor: Sage[200] }]}>
                  <SymbolView name="checkmark" size={26} tintColor={Forest[600]} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.fg.primary, letterSpacing: -0.3 }}>
                  Tout est frais
                </Text>
                <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 4, textAlign: 'center' }]}>
                  Rien ne périme dans cet espace cette semaine.
                </Text>
              </>
            )}
          </View>
        ) : (
          <>
            <WatchGroup
              tone="urgent"
              title="À consommer"
              subtitle="Aujourd'hui ou demain"
              items={feedUrgent}
              defaultOpen
              onPressItem={handlePressItem}
              onConsume={handleConsume}
              onTrash={handleTrash}
            />
            <WatchGroup
              tone="warn"
              title="Bientôt"
              subtitle="Dans 2 à 3 jours"
              items={feedWarn}
              onPressItem={handlePressItem}
              onConsume={handleConsume}
              onTrash={handleTrash}
            />
            <WatchGroup
              tone="ok"
              title="Cette semaine"
              subtitle="4 à 7 jours"
              items={feedOk}
              onPressItem={handlePressItem}
              onConsume={handleConsume}
              onTrash={handleTrash}
            />
          </>
        )}

        {/* ── cook-card ───────────────────────────────────────────────── */}
        {hasUrgent && (
          <Pressable
            onPress={handleCookTonight}
            accessibilityRole="button"
            accessibilityLabel="Idée du soir"
            style={({ pressed }) => [
              styles.cookCard,
              {
                backgroundColor: colors.accent.soft,
                borderColor: colors.accent.border,
                borderRadius: componentRadius.card,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.cookThumb, { backgroundColor: colors.accent.default }]}>
              <SymbolView name="book.closed.fill" size={22} tintColor="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.sectionLabel, { color: Forest[600], fontSize: 11 }]}>Idée du soir</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', letterSpacing: -0.3, marginTop: 3, color: colors.fg.primary }}>
                Une recette pour tes urgents
              </Text>
              <Text style={[typography.footnote, { color: colors.fg.secondary, marginTop: 2 }]}>
                Sauve {urgents.length} aliment{urgents.length > 1 ? 's' : ''} avant péremption
              </Text>
            </View>
            <SymbolView name="chevron.right" size={18} tintColor={colors.fg.muted} />
          </Pressable>
        )}

        {/* ── Features hors-maquette conservées ───────────────────────── */}
        {challengesState && (
          <View style={{ marginTop: layout.sectionGap }}>
            <WeeklyChallengeCard challengesState={challengesState} />
          </View>
        )}

        <Pressable
          onPress={() => navigation.navigate('MealPlanner')}
          accessibilityRole="button"
          accessibilityLabel="Planifier les repas de la semaine"
          style={({ pressed }) => [styles.plannerGhost, { opacity: pressed ? 0.55 : 1 }]}
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

      <WeeklyRecapModal visible={recapVisible} onClose={() => setRecapVisible(false)} />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Atoms locaux
// ────────────────────────────────────────────────────────────────────────────

function SegPill({
  label,
  dotColor,
  active,
  onPress,
}: {
  label: string;
  dotColor?: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillSeg,
        {
          backgroundColor: active ? colors.fg.primary : colors.bg.surface,
          borderColor: active ? colors.fg.primary : colors.border.default,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {dotColor && <View style={[styles.pillDot, { backgroundColor: dotColor }]} />}
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          letterSpacing: -0.2,
          color: active ? Cream[50] : colors.fg.secondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const TONE_SOLID: Record<'urgent' | 'warn' | 'ok', string> = {
  urgent: '#D85535',
  warn: '#C68A1E',
  ok: Forest[500],
};

function WatchGroup({
  tone,
  title,
  subtitle,
  items,
  defaultOpen,
  onPressItem,
  onConsume,
  onTrash,
}: {
  tone: 'urgent' | 'warn' | 'ok';
  title: string;
  subtitle: string;
  items: LiveFood[];
  defaultOpen?: boolean;
  onPressItem: (id: string) => void;
  onConsume: (id: string) => void;
  onTrash: (id: string) => void;
}) {
  const { colors, componentRadius, elevation } = useTheme();
  const [open, setOpen] = useState(!!defaultOpen);
  if (items.length === 0) return null;
  const solid = TONE_SOLID[tone];

  return (
    <View
      style={[
        styles.wgroup,
        {
          backgroundColor: colors.bg.surface,
          borderColor: colors.border.default,
          borderRadius: componentRadius.card,
        },
        open ? elevation[2] : elevation[1],
      ]}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        style={styles.wgroupHead}
      >
        <View style={[styles.wgroupTab, { backgroundColor: solid }]} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: colors.fg.primary }}>
            {title}
          </Text>
          <Text style={{ fontSize: 12, color: colors.fg.tertiary, marginTop: 2 }}>{subtitle}</Text>
        </View>

        {!open && (
          <View style={styles.wgroupThumbs}>
            {items.slice(0, 4).map((f, i) => {
              const c = categoryMeta(f.category);
              return (
                <View
                  key={f.id}
                  style={[
                    styles.wgroupThumb,
                    {
                      backgroundColor: c.bg,
                      borderColor: colors.bg.surface,
                      marginLeft: i === 0 ? 0 : -6,
                    },
                  ]}
                >
                  <FoodEmoji name={f.name} category={f.category} size={17} />
                </View>
              );
            })}
          </View>
        )}

        <View
          style={[
            styles.wgroupCount,
            { backgroundColor: open ? 'transparent' : solid },
          ]}
        >
          {open ? (
            <SymbolView name="chevron.down" size={16} tintColor={colors.fg.tertiary} />
          ) : (
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{items.length}</Text>
          )}
        </View>
      </Pressable>

      {open && (
        <View style={styles.wgroupBody}>
          {items.map((f) => (
            <ProductCard
              key={f.id}
              name={f.name}
              category={f.category}
              image={f.imageUri ? { uri: f.imageUri } : undefined}
              daysUntilExpiration={f.daysLeft}
              quantity={f.quantityLabel}
              onPress={() => onPressItem(f.id)}
              onConsume={() => onConsume(f.id)}
              onTrash={() => onTrash(f.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Logo officiel ZeroGaspy (icône monogramme ZG) — cercle, marge blanche du PNG rognée. */
function LogoMonogram({ size = 28 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: Cream[50],
      }}
    >
      <Image
        source={require('../assets/logo.png')}
        style={{ width: size, height: size, transform: [{ scale: 1.35 }] }}
        resizeMode="cover"
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingBottom: 6,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  // fresh-hero
  hero: { padding: 22, marginBottom: 18, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.72,
  },
  heroTitle: { fontSize: 25, fontWeight: '700', letterSpacing: -0.9, lineHeight: 28, marginTop: 8, marginBottom: 16 },
  heroCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  ring: { width: 92, height: 92 },
  ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
    paddingTop: 14,
    marginTop: 16,
  },
  fhs: { flex: 1 },
  fhsDivider: {
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.16)',
  },
  fhsNum: { color: '#fff', fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  fhsLabel: { color: '#fff', fontSize: 12, opacity: 0.82, marginTop: 2 },

  // seg-scroll
  segScroll: { marginBottom: 4 },
  pillSeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },

  // section head
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // watch groups
  wgroup: { borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  wgroupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  wgroupTab: { width: 6, height: 34, borderRadius: 999 },
  wgroupThumbs: { flexDirection: 'row', alignItems: 'center' },
  wgroupThumb: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  wgroupCount: {
    minWidth: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  wgroupBody: { paddingHorizontal: 8, paddingBottom: 8, gap: 8 },

  // cook-card
  cookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
  },
  cookThumb: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // empty
  empty: { borderWidth: 1, alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyCta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },

  plannerGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 6,
  },
});
