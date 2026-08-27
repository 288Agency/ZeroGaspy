// ============================================================================
// ZeroGaspy · screens/InventoryListScreen.tsx (handoff port — "Stock")
// ============================================================================
// Port direct de design_handoff_zerogaspy/reference/screens/Inventory.jsx.
//
// Structure :
//   1. TopBar       — back · titre liste · + (ajouter)
//   2. Large title  — nom liste + sous-titre (N aliments · M urgents)
//   3. Input        — recherche par nom / marque
//   4. Chips        — Tous · Urgents · Bientôt · Frais · catégories dynamiques
//   5. Sections     — Urgent → Bientôt → Frais (triées par daysLeft)
//   6. Empty state  — si filtre/recherche vide
//
// Auto-suffisant : charge la liste via `getListById(route.params.listId)`,
// wire les actions consume/trash, navigue vers ProductDetail / AddFood.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { Sage, Forest } from '@/tokens';
import { ProductCard } from '@/components/ds';
import Gaspie from '@/components/Gaspie';
import {
  getListById,
  markItemConsumed,
  markItemThrown,
  addItemToList,
} from '@/utils/localStorage';
import { getDaysUntilExpiration } from '@/utils/dateUtils';
import type { FoodItem, List } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import logger from '@/utils/logger';
import ReceiptScannerModal from '@/components/ReceiptScannerModal';
import ReceiptReviewModal from '@/components/ReceiptReviewModal';
import type { ReceiptScanResult, ReceiptItem } from '@/services/mindeeReceiptService';
import { canScanReceipt, markFreeReceiptScanAsUsed } from '@/services/premiumFeaturesService';
import { useBonusScan } from '@/services/referralService';
import {
  trackBonusScanUsed,
  trackFoodAdded as analyticsTrackFoodAdded,
  trackFoodConsumed as analyticsTrackFoodConsumed,
  trackFoodThrown as analyticsTrackFoodThrown,
  trackFirstFoodAddedOnce,
} from '@/services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGamification } from '@/contexts/GamificationContext';
import { PaywallSheet, DeferredAuthSheet } from '@/components/ds';
import { usePaywallSheetProps } from '@/hooks/usePaywallSheetProps';
import { isActiveItem } from '@/utils/foodItems';

// ────────────────────────────────────────────────────────────────────────────
// Modèle interne
// ────────────────────────────────────────────────────────────────────────────

type LiveFood = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  quantityLabel: string;
  daysLeft: number;
  imageUri?: string;
};

type FilterKey = 'all' | 'urgent' | 'soon' | 'fresh' | string;

function hydrateFood(item: FoodItem): LiveFood | null {
  if (!isActiveItem(item)) return null;
  const days = getDaysUntilExpiration(item.expirationDate);
  // Date manquante / invalide : on affiche quand même (J+7 virtuel) pour ne pas
  // faire "disparaître" des articles déjà stockés — cause de churn historique.
  const daysLeft = days == null ? 7 : days;
  const qty = item.quantity ?? 1;
  const unit = item.unit ?? '';
  return {
    id: item.id,
    name: item.name,
    category: item.category?.toLowerCase(),
    quantityLabel: unit ? `${qty} ${unit}` : `${qty}`,
    daysLeft,
    imageUri: item.imageUri,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────────────

type Nav = NativeStackNavigationProp<RootStackParamList, 'InventoryList'>;
type Rt = RouteProp<RootStackParamList, 'InventoryList'>;

export default function InventoryListScreen() {
  const { colors, typography, layout, componentRadius, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { listId, listTitle, listColor, openReceiptScanner } = route.params;

  const { user, signInWithApple } = useAuth();
  const { isPremium } = useSubscription();
  const { trackFoodAdded, trackFoodConsumed, trackFoodThrown } = useGamification();
  const paywallProps = usePaywallSheetProps();

  const [list, setList] = useState<List | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  // Receipt scanner flow state
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [receiptScannerVisible, setReceiptScannerVisible] = useState(false);
  const [receiptReviewVisible, setReceiptReviewVisible] = useState(false);
  const [scannedItems, setScannedItems] = useState<ReceiptItem[]>([]);
  const [scannedStoreName, setScannedStoreName] = useState<string | undefined>();
  const [scannedDate, setScannedDate] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      const fresh = await getListById(listId);
      setList(fresh ?? null);
    } catch (err) {
      logger.error('[InventoryV2] refresh failed:', err);
    }
  }, [listId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Hydrate items → LiveFood
  const allFoods = useMemo<LiveFood[]>(() => {
    if (!list) return [];
    return list.items
      .map(hydrateFood)
      .filter((f): f is LiveFood => f !== null);
  }, [list]);

  // Catégories réellement présentes (pour chips dynamiques)
  const categoriesPresent = useMemo(() => {
    const set = new Set<string>();
    for (const f of allFoods) if (f.category) set.add(f.category);
    return Array.from(set).sort();
  }, [allFoods]);

  // Apply filter + query
  const filtered = useMemo<LiveFood[]>(() => {
    let items = allFoods;
    if (filter === 'urgent') items = items.filter((f) => f.daysLeft <= 1);
    else if (filter === 'soon') items = items.filter((f) => f.daysLeft > 1 && f.daysLeft <= 3);
    else if (filter === 'fresh') items = items.filter((f) => f.daysLeft > 3);
    else if (filter !== 'all') items = items.filter((f) => f.category === filter);

    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (f) => f.name.toLowerCase().includes(q) || (f.brand && f.brand.toLowerCase().includes(q)),
      );
    }
    return items;
  }, [allFoods, filter, query]);

  // Liste réellement vide (aucun aliment) vs simplement filtrée/cherchée sans
  // résultat — l'empty state n'affiche la mascotte que dans le premier cas.
  const isTrulyEmpty = allFoods.length === 0;

  // Sections par urgence (tri par daysLeft)
  const urgentList = useMemo(
    () => filtered.filter((f) => f.daysLeft <= 1).sort((a, b) => a.daysLeft - b.daysLeft),
    [filtered],
  );
  const warnList = useMemo(
    () => filtered.filter((f) => f.daysLeft > 1 && f.daysLeft <= 3).sort((a, b) => a.daysLeft - b.daysLeft),
    [filtered],
  );
  const freshList = useMemo(
    () => filtered.filter((f) => f.daysLeft > 3).sort((a, b) => a.daysLeft - b.daysLeft),
    [filtered],
  );

  const totalCount = allFoods.length;
  const urgentCount = allFoods.filter((f) => f.daysLeft <= 1).length;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleAdd = useCallback(() => {
    navigation.navigate('AddFood', { listId });
  }, [navigation, listId]);
  const handlePressItem = useCallback((itemId: string) => {
    navigation.navigate('ProductDetail', { itemId, listId });
  }, [navigation, listId]);
  const handleConsume = useCallback(async (itemId: string) => {
    const food = allFoods.find((f) => f.id === itemId);
    try {
      await markItemConsumed(listId, itemId);
      const beforeExpiration = food == null || food.daysLeft >= 0;
      trackFoodConsumed(beforeExpiration);
      analyticsTrackFoodConsumed({
        category: food?.category,
        daysBeforeExpiry: food?.daysLeft,
      });
      await refresh();
    } catch (err) {
      logger.error('[InventoryV2] markItemConsumed failed:', err);
      Alert.alert('Erreur', "Impossible de marquer l'aliment comme consommé.");
    }
  }, [listId, refresh, allFoods, trackFoodConsumed]);
  const handleTrash = useCallback(async (itemId: string) => {
    const food = allFoods.find((f) => f.id === itemId);
    try {
      await markItemThrown(listId, itemId);
      trackFoodThrown();
      analyticsTrackFoodThrown({
        category: food?.category,
        daysExpired: food != null && food.daysLeft < 0 ? Math.abs(food.daysLeft) : undefined,
      });
      await refresh();
    } catch (err) {
      logger.error('[InventoryV2] markItemThrown failed:', err);
      Alert.alert('Erreur', "Impossible de jeter l'aliment.");
    }
  }, [listId, refresh, allFoods, trackFoodThrown]);

  // ── Receipt scanner flow (premium-gated) ─────────────────────────────────
  // Mode local : les 2 scans gratuits/mois restent utilisables (canScanReceipt
  // accepte userId null). Paywall seulement si compte + quota épuisé.
  // Sans compte + quota épuisé → DeferredAuthSheet (pas un paywall trompeur).
  const handleOpenReceiptScan = useCallback(async () => {
    try {
      const userId = user?.id ?? null;
      const { allowed, source } = await canScanReceipt(userId, isPremium);
      if (!allowed) {
        if (!user) {
          setAuthSheetVisible(true);
        } else {
          setPaywallVisible(true);
        }
        return;
      }
      if (source === 'monthly_free') {
        await markFreeReceiptScanAsUsed(userId);
      } else if (source === 'bonus' && userId) {
        await useBonusScan(userId);
        trackBonusScanUsed();
      }
      setReceiptScannerVisible(true);
    } catch (err) {
      logger.error('[InventoryV2] receipt scan gate failed:', err);
    }
  }, [user, isPremium]);

  // Le CTA « Scanner mon ticket » de l'accueil arrive ici. On repasse par
  // handleOpenReceiptScan pour que le quota, le premium et le DeferredAuthSheet
  // s'appliquent exactement comme depuis le bouton de la barre.
  const autoScanDone = useRef(false);
  useEffect(() => {
    if (!openReceiptScanner || autoScanDone.current) return;
    autoScanDone.current = true;
    void handleOpenReceiptScan();
  }, [openReceiptScanner, handleOpenReceiptScan]);

  const handleReceiptScanComplete = useCallback((result: ReceiptScanResult) => {
    setScannedItems(result.items);
    setScannedStoreName(result.storeName);
    setScannedDate(result.date);
    setReceiptScannerVisible(false);
    setReceiptReviewVisible(true);
  }, []);

  const handleReceiptItemsConfirm = useCallback(async (items: ReceiptItem[]) => {
    try {
      for (const it of items) {
        const newItem: FoodItem = {
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          category: it.category,
          expirationDate: it.expirationDate || '',
          status: 'active',
          price: it.price,
        };
        await addItemToList(listId, newItem);
        trackFoodAdded(listId);
        analyticsTrackFoodAdded({
          category: it.category,
          hasExpiryDate: Boolean(newItem.expirationDate),
          hasPrice: it.price != null,
          source: 'receipt',
        });
        void trackFirstFoodAddedOnce();
      }
      setReceiptReviewVisible(false);
      setScannedItems([]);
      await refresh();
    } catch (err) {
      logger.error('[InventoryV2] receipt items add failed:', err);
      Alert.alert('Erreur', "Impossible d'ajouter les articles du ticket.");
    }
  }, [listId, refresh, trackFoodAdded]);

  // Titre fallback : route.params.listTitle si list pas encore chargée
  const title = list?.title ?? listTitle ?? 'Stock';
  const accentDotColor = list?.color || listColor || Forest[600];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg.canvas }]}>
      {/* ── TopBar ────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.topbar,
          { paddingTop: insets.top + 6, paddingHorizontal: 14 },
        ]}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          style={({ pressed }) => [styles.topbarBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <SymbolView name="chevron.left" size={22} tintColor={colors.fg.primary} />
        </Pressable>

        <View style={styles.topbarTitleWrap}>
          <View style={[styles.dot, { backgroundColor: accentDotColor }]} />
          <Text
            numberOfLines={1}
            style={{
              fontSize: 17,
              fontWeight: '600',
              letterSpacing: -0.3,
              color: colors.fg.primary,
            }}
          >
            {title}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={handleOpenReceiptScan}
            accessibilityRole="button"
            accessibilityLabel="Scanner un ticket de caisse"
            hitSlop={8}
            style={({ pressed }) => [styles.topbarBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <SymbolView name="doc.text.viewfinder" size={22} tintColor={colors.fg.primary} />
          </Pressable>
          <Pressable
            onPress={handleAdd}
            accessibilityRole="button"
            accessibilityLabel="Ajouter un aliment"
            hitSlop={8}
            style={({ pressed }) => [styles.topbarBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <SymbolView name="plus" size={24} tintColor={colors.fg.primary} />
          </Pressable>
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
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Large title ─────────────────────────────────────────────── */}
        <View style={{ paddingBottom: 6 }}>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '700',
              letterSpacing: -1.2,
              lineHeight: 34,
              color: colors.fg.primary,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.fg.secondary,
              marginTop: 8,
              letterSpacing: -0.1,
            }}
          >
            {totalCount} aliment{totalCount > 1 ? 's' : ''}
            {urgentCount > 0 && ` · ${urgentCount} urgent${urgentCount > 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* ── Search input ────────────────────────────────────────────── */}
        <View
          style={[
            styles.input,
            {
              backgroundColor: colors.bg.surface,
              borderColor: colors.border.default,
              borderRadius: componentRadius.input,
              marginTop: 18,
              marginBottom: 12,
            },
          ]}
        >
          <SymbolView name="magnifyingglass" size={18} tintColor={colors.fg.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un aliment…"
            placeholderTextColor={colors.fg.muted}
            style={{
              flex: 1,
              fontSize: 16,
              color: colors.fg.primary,
              padding: 0,
            }}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.fg.muted} />
            </Pressable>
          )}
        </View>

        {/* ── Chips ───────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingRight: 18 }}
          style={{ marginHorizontal: -layout.screenPaddingH, paddingLeft: layout.screenPaddingH, marginBottom: 4 }}
        >
          <Chip label="Tous"    active={filter === 'all'}    onPress={() => setFilter('all')} />
          <Chip label="Urgents" active={filter === 'urgent'} onPress={() => setFilter('urgent')} />
          <Chip label="Bientôt" active={filter === 'soon'}   onPress={() => setFilter('soon')} />
          <Chip label="Frais"   active={filter === 'fresh'}  onPress={() => setFilter('fresh')} />
          {categoriesPresent.map((cat) => (
            <Chip
              key={cat}
              label={prettyCategory(cat)}
              active={filter === cat}
              onPress={() => setFilter(cat)}
            />
          ))}
        </ScrollView>

        {/* ── Empty ───────────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <View
            style={[
              styles.empty,
              {
                marginTop: 32,
                paddingVertical: 36,
                paddingHorizontal: 24,
                backgroundColor: colors.bg.surface,
                borderColor: colors.border.default,
                borderRadius: componentRadius.card,
              },
            ]}
          >
            {isTrulyEmpty ? (
              // Liste réellement vide → Gaspie devant son frigo vide
              <Gaspie pose="emptyFridge" size={170} style={{ marginBottom: 14 }} />
            ) : (
              // Filtre/recherche sans résultat → pastille discrète, la mascotte
              // serait dramatique pour un simple "aucun match"
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: Sage[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <SymbolView name="leaf.fill" size={26} tintColor={Forest[600]} />
              </View>
            )}
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: colors.fg.primary,
                textAlign: 'center',
              }}
            >
              {query.trim() ? 'Aucun résultat' : 'Liste vide'}
            </Text>
            <Text
              style={[typography.footnote, { color: colors.fg.secondary, marginTop: 4, textAlign: 'center' }]}
            >
              {query.trim()
                ? `Rien pour "${query.trim()}".`
                : filter !== 'all'
                  ? 'Essaie un autre filtre.'
                  : 'Ajoute ton premier aliment avec le bouton + en haut.'}
            </Text>
          </View>
        )}

        {/* ── Sections ────────────────────────────────────────────────── */}
        <Section label="Urgent" items={urgentList}
          onPressItem={handlePressItem}
          onConsume={handleConsume}
          onTrash={handleTrash}
        />
        <Section label="Bientôt" items={warnList}
          onPressItem={handlePressItem}
          onConsume={handleConsume}
          onTrash={handleTrash}
        />
        <Section label="Frais" items={freshList}
          onPressItem={handlePressItem}
          onConsume={handleConsume}
          onTrash={handleTrash}
        />
      </ScrollView>

      {/* ── Receipt scanner + review ──────────────────────────────────── */}
      <ReceiptScannerModal
        visible={receiptScannerVisible}
        onClose={() => setReceiptScannerVisible(false)}
        onScanComplete={handleReceiptScanComplete}
      />
      <ReceiptReviewModal
        visible={receiptReviewVisible}
        items={scannedItems}
        storeName={scannedStoreName}
        date={scannedDate}
        onClose={() => {
          setReceiptReviewVisible(false);
          setScannedItems([]);
        }}
        onConfirm={handleReceiptItemsConfirm}
      />
      <PaywallSheet
        {...paywallProps}
        trigger="scanLimit"
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
      <DeferredAuthSheet
        visible={authSheetVisible}
        onClose={() => setAuthSheetVisible(false)}
        reason="sync"
        onAppleSignIn={async () => {
          const { error } = await signInWithApple();
          if (!error) {
            setAuthSheetVisible(false);
            // Après auth : retente le gate (crédits / premium / bonus).
            await handleOpenReceiptScan();
          }
        }}
        onEmailSignUp={() => {
          setAuthSheetVisible(false);
          navigation.navigate('Register');
        }}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Atoms locaux
// ────────────────────────────────────────────────────────────────────────────

function Section({
  label,
  items,
  onPressItem,
  onConsume,
  onTrash,
}: {
  label: string;
  items: LiveFood[];
  onPressItem: (id: string) => void;
  onConsume: (id: string) => void;
  onTrash: (id: string) => void;
}) {
  const { colors, typography, layout } = useTheme();
  if (items.length === 0) return null;
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: 22,
          marginBottom: 10,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={[
            typography.sectionLabel,
            { color: colors.fg.secondary, letterSpacing: 0.6, fontSize: 12 },
          ]}
        >
          {label.toUpperCase()} · {items.length}
        </Text>
      </View>
      <View style={{ gap: layout.cardGap }}>
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
    </>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        height: 32,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.fg.primary : colors.border.default,
        backgroundColor: active ? colors.fg.primary : colors.bg.surface,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: active ? colors.bg.canvas : colors.fg.secondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Pretty French labels for category chips (matching handoff vocabulary)
function prettyCategory(cat: string): string {
  const map: Record<string, string> = {
    dairy: 'Laitiers',
    veg: 'Légumes',
    vegetables: 'Légumes',
    légumes: 'Légumes',
    fruits: 'Fruits',
    meat: 'Viande',
    viande: 'Viande',
    fish: 'Poisson',
    bakery: 'Boulangerie',
    boulangerie: 'Boulangerie',
    beverages: 'Boissons',
    boissons: 'Boissons',
    frozen: 'Surgelés',
    condiments: 'Condiments',
    snacks: 'Snacks',
    other: 'Autres',
  };
  return map[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
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
    paddingBottom: 6,
  },
  topbarBtn: { padding: 8, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  scroll: { flex: 1 },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  empty: {
    borderWidth: 1,
    alignItems: 'center',
  },
});
