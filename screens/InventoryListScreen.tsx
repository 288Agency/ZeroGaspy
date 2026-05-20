import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Svg, { Circle, G } from 'react-native-svg';
import { FoodItem, List } from '../types';
import { RootStackParamList } from '../types/navigation';
import {
  getListById,
  updateItemStatusWithQuantity,
  markItemAsOpened,
  markItemAsOpenedWithQuantity,
  addItemToList,
  removeItemFromList,
  loadLists,
  saveLists,
} from '../utils/localStorage';
import MarkAsOpenedModal from '../components/MarkAsOpenedModal';
import QuantityModal from '../components/QuantityModal';
import PressableScale from '../components/PressableScale';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import ReceiptReviewModal from '../components/ReceiptReviewModal';
import { ReceiptScanResult, ReceiptItem } from '../services/mindeeReceiptService';
import { markFreeReceiptScanAsUsed, canScanReceipt } from '../services/premiumFeaturesService';
import { useBonusScan } from '../services/referralService';
import { trackBonusScanUsed } from '../services/analytics';
import SavedFoodPulse from '../components/SavedFoodPulse';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import { getFoodIcon } from '../services/iconService';
import { supabase } from '../config/supabase';
import { useGamification } from '../contexts/GamificationContext';
import { useTheme } from '../contexts/ThemeContext.legacy';
import { useSubscription } from '../contexts/SubscriptionContext';
import PaywallModal from '../components/PaywallModal';
import ListMembersModal from '../components/ListMembersModal';
import ShareListModal from '../components/ShareListModal';
import { loadSharedListFromCloud } from '../services/listSharingService';
import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';
import { trackFoodConsumed as analyticsTrackFoodConsumed, trackFoodThrown as analyticsTrackFoodThrown } from '../services/analytics';
import { useInventoryFilters } from '../hooks/useInventoryFilters';
import { useListSharing } from '../hooks/useListSharing';

type RoutePropType = RouteProp<RootStackParamList, 'InventoryList'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'InventoryList'>;

// Background decoration
const BackgroundDecoration = React.memo(function BackgroundDecoration() {
  return (
    <View style={styles.decorationContainer}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <G opacity={0.05}>
          <Circle cx="180" cy="20" r="100" fill={COLORS.primary[500]} />
        </G>
      </Svg>
    </View>
  );
});

const EmptyIllustration = React.memo(function EmptyIllustration() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Svg width={80} height={80} viewBox="0 0 80 80">
        <G>
          <Circle cx="40" cy="40" r="35" fill={hexToRgba(COLORS.primary[500], 0.1)} />
          <Circle cx="40" cy="35" r="15" fill={COLORS.accent.avocado} />
          <Circle cx="30" cy="50" r="10" fill={COLORS.accent.tomato} />
          <Circle cx="52" cy="48" r="8" fill={COLORS.accent.carrot} />
        </G>
      </Svg>
    </Animated.View>
  );
});

const SearchBar = React.memo(function SearchBar({
  value,
  onChangeText,
  listColor,
}: {
  value: string;
  onChangeText: (text: string) => void;
  listColor: string;
}) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.searchContainer}>
      <View
        style={[
          styles.searchInputContainer,
          isFocused && {
            borderColor: listColor,
            ...SHADOWS.colored(listColor, 0.15),
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={isFocused ? listColor : COLORS.text.muted}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('inventory.searchPlaceholder')}
          placeholderTextColor={COLORS.text.muted}
          style={styles.searchInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={listColor}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <PressableScale
            onPress={() => onChangeText('')}
            style={styles.clearButton}
            hapticType="light"
          >
            <Ionicons name="close-circle" size={20} color={COLORS.text.muted} />
          </PressableScale>
        )}
      </View>
    </View>
  );
});

const FilterMenu = React.memo(function FilterMenu({
  categories,
  selectedCategory,
  onCategorySelect,
  selectedExpirationFilter,
  onExpirationFilterSelect,
  listColor,
}: {
  categories: string[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  selectedExpirationFilter: string | null;
  onExpirationFilterSelect: (filter: string | null) => void;
  listColor: string;
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const expirationFilters = [
    { id: 'expired', label: t('inventory.expired'), icon: 'alert-circle' },
    { id: 'today', label: t('common.today'), icon: 'today' },
    { id: 'soon', label: t('inventory.threeDays'), icon: 'time' },
    { id: 'week', label: t('inventory.sevenDays'), icon: 'calendar' },
    { id: 'fresh', label: t('inventory.fresh'), icon: 'leaf' },
  ];

  const hasActiveFilters = selectedCategory || selectedExpirationFilter;

  return (
    <View style={styles.filtersContainer}>
      <View style={styles.filtersRow}>
        {/* Filter button */}
        <PressableScale
          onPress={() => setMenuOpen(!menuOpen)}
          style={[
            styles.filterButton,
            hasActiveFilters && { borderColor: listColor, backgroundColor: hexToRgba(listColor, 0.08) },
          ]}
          hapticType="light"
          activeScale={0.97}
        >
          <Ionicons
            name="funnel-outline"
            size={20}
            color={hasActiveFilters ? listColor : COLORS.text.secondary}
          />
          {hasActiveFilters && (
            <View style={[styles.filterBadge, { backgroundColor: listColor }]}>
              <Text style={styles.filterBadgeText}>
                {(selectedCategory ? 1 : 0) + (selectedExpirationFilter ? 1 : 0)}
              </Text>
            </View>
          )}
        </PressableScale>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <PressableScale
            onPress={() => {
              onCategorySelect(null);
              onExpirationFilterSelect(null);
              setMenuOpen(false);
            }}
            style={styles.clearFiltersButton}
            hapticType="light"
            activeScale={0.95}
          >
            <Text style={styles.clearFiltersText}>{t('common.clear')}</Text>
          </PressableScale>
        )}
      </View>

      {/* Filter menu */}
      {menuOpen && (
        <>
          {/* Overlay */}
          <TouchableOpacity
            style={styles.filterOverlay}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          />

          {/* Menu content */}
          <View style={styles.filterMenuContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Categories section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('inventory.categories')}</Text>
                <TouchableOpacity
                  style={[
                    styles.filterMenuItem,
                    !selectedCategory && styles.filterMenuItemActive,
                  ]}
                  onPress={() => {
                    onCategorySelect(null);
                    setMenuOpen(false);
                  }}
                >
                  <View style={styles.filterMenuItemContent}>
                    <Ionicons name="apps-outline" size={20} color={COLORS.text.secondary} />
                    <Text
                      style={[
                        styles.filterMenuItemText,
                        !selectedCategory && { color: listColor, fontWeight: '600' },
                      ]}
                    >
                      {t('inventory.allCategories')}
                    </Text>
                  </View>
                  {!selectedCategory && (
                    <Ionicons name="checkmark" size={20} color={listColor} />
                  )}
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterMenuItem,
                      selectedCategory === category && styles.filterMenuItemActive,
                    ]}
                    onPress={() => {
                      onCategorySelect(category);
                      setMenuOpen(false);
                    }}
                  >
                    <View style={styles.filterMenuItemContent}>
                      <Ionicons name="fast-food-outline" size={20} color={COLORS.text.secondary} />
                      <Text
                        style={[
                          styles.filterMenuItemText,
                          selectedCategory === category && { color: listColor, fontWeight: '600' },
                        ]}
                      >
                        {category}
                      </Text>
                    </View>
                    {selectedCategory === category && (
                      <Ionicons name="checkmark" size={20} color={listColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Divider */}
              <View style={styles.filterDivider} />

              {/* Expiration section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>{t('inventory.expirationDate')}</Text>
                <TouchableOpacity
                  style={[
                    styles.filterMenuItem,
                    !selectedExpirationFilter && styles.filterMenuItemActive,
                  ]}
                  onPress={() => {
                    onExpirationFilterSelect(null);
                    setMenuOpen(false);
                  }}
                >
                  <View style={styles.filterMenuItemContent}>
                    <Ionicons name="infinite-outline" size={20} color={COLORS.text.secondary} />
                    <Text
                      style={[
                        styles.filterMenuItemText,
                        !selectedExpirationFilter && { color: listColor, fontWeight: '600' },
                      ]}
                    >
                      {t('inventory.allCategories')}
                    </Text>
                  </View>
                  {!selectedExpirationFilter && (
                    <Ionicons name="checkmark" size={20} color={listColor} />
                  )}
                </TouchableOpacity>
                {expirationFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterMenuItem,
                      selectedExpirationFilter === filter.id && styles.filterMenuItemActive,
                    ]}
                    onPress={() => {
                      onExpirationFilterSelect(filter.id);
                      setMenuOpen(false);
                    }}
                  >
                    <View style={styles.filterMenuItemContent}>
                      <Ionicons
                        name={filter.icon as any}
                        size={20}
                        color={COLORS.text.secondary}
                      />
                      <Text
                        style={[
                          styles.filterMenuItemText,
                          selectedExpirationFilter === filter.id && { color: listColor, fontWeight: '600' },
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </View>
                    {selectedExpirationFilter === filter.id && (
                      <Ionicons name="checkmark" size={20} color={listColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
});

const FoodItemCard = React.memo(function FoodItemCard({
  item,
  onConsumed,
  onThrown,
  onMarkAsOpened,
  onMenuPress,
  onCardPress,
  listColor,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onLongPress,
}: {
  item: FoodItem;
  onConsumed: () => void;
  onThrown: () => void;
  onMarkAsOpened: () => void;
  onMenuPress: () => void;
  onCardPress: () => void;
  listColor: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onLongPress: () => void;
}) {
  const { t } = useTranslation();
  const days = getDaysUntilExpiration(item.expirationDate);

  // Determine status color for indicator dot
  let dotColor = COLORS.status.fresh; // Green - fresh (bright green)
  if (days !== null) {
    if (days < 0) {
      dotColor = COLORS.status.expired; // Red - expired
    } else if (days <= 3) {
      dotColor = COLORS.status.expiringSoon; // Orange - expiring soon
    }
  }

  const handlePress = () => {
    if (isSelectionMode) {
      onToggleSelect();
    } else {
      onCardPress();
    }
  };

  const foodIconData = getFoodIcon(item.name);

  return (
    <View
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isSelected && { borderColor: listColor },
      ]}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <PressableScale
          onPress={onToggleSelect}
          style={styles.checkboxContainer}
          hapticType="light"
        >
          <View
            style={[
              styles.checkbox,
              isSelected && { backgroundColor: listColor, borderColor: listColor },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={14} color={COLORS.neutral.white} />
            )}
          </View>
        </PressableScale>
      )}

      {/* Main card content - clickable area for popup */}
      <PressableScale
        onPress={handlePress}
        onLongPress={onLongPress}
        activeScale={0.98}
        style={styles.cardInner}
      >
        {/* Left: Image placeholder with status indicator */}
        <View style={styles.imageWrapper}>
          <View style={styles.imagePlaceholder}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.foodImage} />
            ) : (
              <Ionicons
                name={foodIconData.icon}
                size={36}
                color={hexToRgba(COLORS.primary[500], 0.35)}
              />
            )}
          </View>
          {/* Status indicator dot - overlapping */}
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        </View>

        {/* Right: Content */}
        <View style={styles.cardRight}>
          {/* Top section: Name, quantity, price, menu */}
          <View style={styles.topSection}>
            <View style={styles.textContent}>
              <Text style={styles.foodName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.quantityPriceRow}>
                <Text style={styles.quantityLabel}>x{item.quantity || 1}</Text>
                {item.price !== undefined && item.price > 0 && (
                  <Text style={styles.priceLabel}>{item.price.toFixed(2).replace('.', ',')} €</Text>
                )}
              </View>
              {/* Date de péremption */}
              {item.expirationDate && (
                <View style={styles.expirationDateContainer}>
                  <Ionicons name="calendar-outline" size={14} color={dotColor} />
                  <Text style={[styles.expirationDateText, { color: dotColor }]}>
                    {item.expirationDate}
                  </Text>
                </View>
              )}
            </View>
            {/* Three dots menu */}
            {!isSelectionMode && (
              <TouchableOpacity
                onPress={onMenuPress}
                style={styles.dotsMenu}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={styles.dotItem} />
                <View style={styles.dotItem} />
                <View style={styles.dotItem} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </PressableScale>

      {/* Bottom section: Action buttons - outside clickable area */}
      {!isSelectionMode && (
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            onPress={onConsumed}
            style={styles.btnConsumed}
            activeOpacity={0.8}
          >
            <Text style={styles.btnTextWhite}>{t('inventory.consumed')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onThrown}
            style={styles.btnThrown}
            activeOpacity={0.8}
          >
            <Text style={styles.btnTextWhite}>{t('inventory.throw')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={item.isOpened ? undefined : onMarkAsOpened}
            style={[styles.btnOpened, item.isOpened && styles.btnOpenedActive]}
            activeOpacity={item.isOpened ? 1 : 0.8}
          >
            <Text style={[styles.btnTextDark, item.isOpened && styles.btnTextOpenedActive]}>
              {t('inventory.opened')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export default function InventoryListScreen() {
  const { t } = useTranslation();
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { trackFoodConsumed, trackFoodThrown } = useGamification();
  const { colors } = useTheme();
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const { listId, listTitle, listColor = colors.primary[500] } = route.params;

  const [list, setList] = useState<List | null>(null);
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedExpirationFilter,
    setSelectedExpirationFilter,
    activeItems,
    availableCategories,
    filteredItems,
  } = useInventoryFilters(list);
  const [markAsOpenedModalVisible, setMarkAsOpenedModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const [selectedItemQuantity, setSelectedItemQuantity] = useState<number>(1);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [quantityActionType, setQuantityActionType] = useState<'consumed' | 'thrown' | 'opened'>('consumed');
  const [showSavedPulse, setShowSavedPulse] = useState(false);

  // Multi-selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Receipt scanner states
  const [receiptScannerVisible, setReceiptScannerVisible] = useState(false);
  const [receiptReviewVisible, setReceiptReviewVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const [scannedItems, setScannedItems] = useState<ReceiptItem[]>([]);
  const [scannedStoreName, setScannedStoreName] = useState<string | undefined>();
  const [scannedDate, setScannedDate] = useState<string | undefined>();
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  // Menu popup state
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [menuSelectedItem, setMenuSelectedItem] = useState<FoodItem | null>(null);

  // Detail popup state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailSelectedItem, setDetailSelectedItem] = useState<FoodItem | null>(null);

  // Sharing state (modals local; permission/member state in hook)
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { cloudListId, myPermission, memberCount, isViewOnly, refresh: refreshSharing } = useListSharing(listId, user);

  const emptyFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadListData();
  }, [listId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadListData();
    });
    return unsubscribe;
  }, [navigation, listId]);

  // Synchronisation temps réel avec Supabase Realtime
  useEffect(() => {
    if (!cloudListId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`list_${cloudListId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'food_items',
        filter: `list_id=eq.${cloudListId}`
      }, (payload) => {
        logger.debug('Changement détecté:', payload);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadListData(true), 500);
      })
      .subscribe((status) => {
        logger.debug('Status de la souscription:', status);
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      logger.debug('Désinscription du channel');
      supabase.removeChannel(channel);
    };
  }, [cloudListId]);

  // Set navigation header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: listTitle,
      headerStyle: { backgroundColor: COLORS.secondary.cream },
      headerTintColor: listColor,
      headerRight: () => (
        <View style={styles.headerRightRow}>
          {user && myPermission === 'owner' && (
            <TouchableOpacity
              onPress={() => setShareModalVisible(true)}
              style={styles.headerShareButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="person-add-outline" size={20} color={listColor} />
            </TouchableOpacity>
          )}
          {memberCount > 1 && (
            <TouchableOpacity
              onPress={() => setMembersModalVisible(true)}
              style={styles.headerMembersButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="people-outline" size={22} color={listColor} />
              <View style={[styles.headerMembersBadge, { backgroundColor: listColor }]}>
                <Text style={styles.headerMembersBadgeText}>{memberCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [listTitle, listColor, memberCount, myPermission, user]);

  const loadListData = async (forceCloud = false) => {
    try {
      let data: List | null = null;

      // When forceCloud (realtime change), fetch directly from Supabase
      if (forceCloud && user) {
        data = await loadSharedListFromCloud(listId);
        if (data) {
          // Update AsyncStorage so local mutations stay in sync
          const allLists = await loadLists();
          const existingIdx = allLists.findIndex(l => l.id === data!.id);
          if (existingIdx >= 0) {
            allLists[existingIdx] = data;
          } else {
            allLists.push(data);
          }
          await saveLists(allLists);
        }
      }

      // If no cloud data (or not forced), read from local
      if (!data) {
        data = await getListById(listId);
      }

      // Fallback: if still not found locally, try cloud (shared list first open)
      if (!data && user) {
        data = await loadSharedListFromCloud(listId);
        if (data) {
          const allLists = await loadLists();
          const existingIdx = allLists.findIndex(l => l.id === data!.id);
          if (existingIdx >= 0) {
            allLists[existingIdx] = data;
          } else {
            allLists.push(data);
          }
          await saveLists(allLists);
        }
      }

      if (data) {
        setList(data);
        if (data.items.filter(i => i.status !== 'consumed' && i.status !== 'thrown').length === 0) {
          Animated.timing(emptyFade, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }
      } else {
        Alert.alert(t('common.error'), t('inventory.listNotFound'));
        navigation.goBack();
      }
    } catch (error) {
      logger.error('Erreur lors du chargement de la liste:', error);
      Alert.alert(t('common.error'), t('inventory.loadError'));
    }
  };

  const handleMarkAsConsumed = (item: FoodItem) => {
    const quantity = item.quantity || 1;
    if (quantity > 1) {
      setSelectedItemId(item.id);
      setSelectedItemName(item.name);
      setSelectedItemQuantity(quantity);
      setQuantityActionType('consumed');
      setQuantityModalVisible(true);
    } else {
      markAsConsumedDirect(item.id, 1);
    }
  };

  const handleMarkAsThrown = (item: FoodItem) => {
    const quantity = item.quantity || 1;
    if (quantity > 1) {
      setSelectedItemId(item.id);
      setSelectedItemName(item.name);
      setSelectedItemQuantity(quantity);
      setQuantityActionType('thrown');
      setQuantityModalVisible(true);
    } else {
      markAsThrownDirect(item.id, 1);
    }
  };

  const handleOpenMarkAsOpenedModal = (item: FoodItem) => {
    const quantity = item.quantity || 1;
    setSelectedItemId(item.id);
    setSelectedItemName(item.name);
    setSelectedItemQuantity(quantity);

    if (quantity > 1) {
      setQuantityActionType('opened');
      setQuantityModalVisible(true);
    } else {
      setMarkAsOpenedModalVisible(true);
    }
  };

  const markAsConsumedDirect = async (itemId: string, quantity: number) => {
    try {
      // Verifier si l'aliment est consomme avant expiration
      const item = list?.items.find(i => i.id === itemId);
      let wasBeforeExpiration = true;
      if (item) {
        const expDate = item.expirationDate;
        if (expDate) {
          const days = getDaysUntilExpiration(expDate as string);
          wasBeforeExpiration = days !== null && days >= 0;
        }
      }

      await updateItemStatusWithQuantity(listId, itemId, 'consumed', quantity);
      await loadListData();
      setShowSavedPulse(true);

      // Tracker pour la gamification
      trackFoodConsumed(wasBeforeExpiration);
      // Analytics PostHog
      analyticsTrackFoodConsumed({
        category: item?.category,
        daysBeforeExpiry: item?.expirationDate ? getDaysUntilExpiration(item.expirationDate as string) ?? undefined : undefined,
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('inventory.consumedError'));
    }
  };

  const markAsThrownDirect = async (itemId: string, quantity: number) => {
    try {
      const thrownItem = list?.items.find(i => i.id === itemId);
      await updateItemStatusWithQuantity(listId, itemId, 'thrown', quantity);
      await loadListData();

      // Tracker pour la gamification (reset du streak)
      trackFoodThrown();
      // Analytics PostHog
      analyticsTrackFoodThrown({
        category: thrownItem?.category,
        daysExpired: thrownItem?.expirationDate ? Math.abs(getDaysUntilExpiration(thrownItem.expirationDate as string) ?? 0) : undefined,
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('inventory.thrownError'));
    }
  };

  const handleQuantityConfirm = (quantity: number) => {
    setQuantityModalVisible(false);
    if (!selectedItemId) return;

    if (quantityActionType === 'consumed') {
      markAsConsumedDirect(selectedItemId, quantity);
    } else if (quantityActionType === 'thrown') {
      markAsThrownDirect(selectedItemId, quantity);
    } else if (quantityActionType === 'opened') {
      setSelectedItemQuantity(quantity);
      setMarkAsOpenedModalVisible(true);
    }
  };

  const handleMarkAsOpened = async (openedDate: string, daysAfterOpening: number) => {
    if (!selectedItemId) return;

    try {
      const totalQuantity = list?.items.find(i => i.id === selectedItemId)?.quantity || 1;
      if (selectedItemQuantity < totalQuantity) {
        await markItemAsOpenedWithQuantity(listId, selectedItemId, openedDate, daysAfterOpening, selectedItemQuantity);
      } else {
        await markItemAsOpened(listId, selectedItemId, openedDate, daysAfterOpening);
      }
      await loadListData();
      setMarkAsOpenedModalVisible(false);
      setSelectedItemId(null);
    } catch (error) {
      Alert.alert(t('common.error'), t('inventory.openedError'));
    }
  };

  // Receipt scanner handlers
  const handleReceiptScanComplete = (result: ReceiptScanResult) => {
    setScannedItems(result.items);
    setScannedStoreName(result.storeName);
    setScannedDate(result.date);
    setReceiptScannerVisible(false);
    setReceiptReviewVisible(true);
  };

  const handleReceiptItemsConfirm = async (items: ReceiptItem[]) => {
    try {
      for (const item of items) {
        const newFoodItem: FoodItem = {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          expirationDate: item.expirationDate || '',
          status: 'active',
          price: item.price, // Prix extrait du ticket pour le calcul des économies
        };
        await addItemToList(listId, newFoodItem);
      }

      setReceiptReviewVisible(false);
      setScannedItems([]);
      await loadListData();

      Alert.alert(
        t('common.success'),
        t('inventory.productsAdded', { count: items.length })
      );
    } catch (error) {
      logger.error('Erreur ajout produits:', error);
      Alert.alert(t('common.error'), t('inventory.productsAddError'));
    }
  };


  const toggleFabMenu = () => {
    setFabMenuOpen(!fabMenuOpen);
  };

  // Multi-selection handlers
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
        // Exit selection mode if no items selected
        if (newSet.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const enterSelectionMode = (itemId: string) => {
    setIsSelectionMode(true);
    setSelectedItems(new Set([itemId]));
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedItems(new Set());
  };

  const selectAllItems = () => {
    const allIds = new Set(filteredItems.map(item => item.id));
    setSelectedItems(allIds);
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  // Bulk actions
  const handleBulkConsumed = async () => {
    try {
      for (const itemId of selectedItems) {
        const item = activeItems.find(i => i.id === itemId);
        const quantity = item?.quantity || 1;
        await updateItemStatusWithQuantity(listId, itemId, 'consumed', quantity);

        let wasBeforeExpiration = true;
        if (item?.expirationDate) {
          const days = getDaysUntilExpiration(item.expirationDate as string);
          wasBeforeExpiration = days !== null && days >= 0;
        }
        trackFoodConsumed(wasBeforeExpiration);
        analyticsTrackFoodConsumed({
          category: item?.category,
          daysBeforeExpiry: item?.expirationDate ? getDaysUntilExpiration(item.expirationDate as string) ?? undefined : undefined,
        });
      }
      exitSelectionMode();
      await loadListData();
      setShowSavedPulse(true);
    } catch (error) {
      Alert.alert(t('common.error'), t('inventory.bulkConsumedError'));
    }
  };

  const handleBulkThrown = async () => {
    try {
      for (const itemId of selectedItems) {
        const item = activeItems.find(i => i.id === itemId);
        const quantity = item?.quantity || 1;
        await updateItemStatusWithQuantity(listId, itemId, 'thrown', quantity);

        trackFoodThrown();
        analyticsTrackFoodThrown({
          category: item?.category,
          daysExpired: item?.expirationDate ? Math.abs(getDaysUntilExpiration(item.expirationDate as string) ?? 0) : undefined,
        });
      }
      exitSelectionMode();
      await loadListData();
    } catch (error) {
      Alert.alert(t('common.error'), t('inventory.bulkThrownError'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const itemId of selectedItems) {
        await removeItemFromList(listId, itemId);
      }
      exitSelectionMode();
      await loadListData();
    } catch (error) {
      Alert.alert(t('common.error'), t('inventory.bulkDeleteError'));
    }
  };

  const confirmBulkAction = (action: 'consumed' | 'thrown' | 'delete') => {
    const count = selectedItems.size;

    if (action === 'delete') {
      Alert.alert(
        t('inventory.deleteForever'),
        t('inventory.deleteCountConfirm', { count }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: handleBulkDelete,
          },
        ]
      );
      return;
    }

    const actionLabel = action === 'consumed'
      ? t('inventory.consumedAction', { count })
      : t('inventory.thrownAction', { count });

    Alert.alert(
      t('inventory.confirmAction'),
      t('inventory.markCountAs', { count, action: actionLabel }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: action === 'consumed' ? handleBulkConsumed : handleBulkThrown,
        },
      ]
    );
  };

  // Menu handlers
  const handleOpenMenu = (item: FoodItem) => {
    setMenuSelectedItem(item);
    setMenuModalVisible(true);
  };

  const handleEditItem = () => {
    if (menuSelectedItem) {
      setMenuModalVisible(false);
      navigation.navigate('AddFood', { listId, editItem: menuSelectedItem });
    }
  };

  const handleDeleteItem = async () => {
    if (!menuSelectedItem) return;

    Alert.alert(
      t('inventory.deleteItem'),
      t('inventory.deleteItemConfirm', { name: menuSelectedItem.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Suppression définitive (pas de trace dans les stats)
              await removeItemFromList(listId, menuSelectedItem.id);
              setMenuModalVisible(false);
              setMenuSelectedItem(null);
              await loadListData();
            } catch (error) {
              Alert.alert(t('common.error'), t('inventory.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleCardPress = (item: FoodItem) => {
    setDetailSelectedItem(item);
    setDetailModalVisible(true);
  };

  const stableHandleConsumed = useCallback((item: FoodItem) => handleMarkAsConsumed(item), [list]);
  const stableHandleThrown = useCallback((item: FoodItem) => handleMarkAsThrown(item), [list]);
  const stableHandleOpened = useCallback((item: FoodItem) => handleOpenMarkAsOpenedModal(item), []);
  const stableHandleMenu = useCallback((item: FoodItem) => handleOpenMenu(item), []);
  const stableHandleCardPress = useCallback((item: FoodItem) => handleCardPress(item), []);
  const stableToggleSelect = useCallback((id: string) => toggleItemSelection(id), []);
  const stableEnterSelect = useCallback((id: string) => enterSelectionMode(id), []);

  const renderItem = useCallback(({ item }: { item: FoodItem }) => (
    <FoodItemCard
      item={item}
      onConsumed={() => stableHandleConsumed(item)}
      onThrown={() => stableHandleThrown(item)}
      onMarkAsOpened={() => stableHandleOpened(item)}
      onMenuPress={() => stableHandleMenu(item)}
      onCardPress={() => stableHandleCardPress(item)}
      listColor={listColor}
      isSelectionMode={isSelectionMode}
      isSelected={selectedItems.has(item.id)}
      onToggleSelect={() => stableToggleSelect(item.id)}
      onLongPress={() => stableEnterSelect(item.id)}
    />
  ), [listColor, isSelectionMode, selectedItems, stableHandleConsumed, stableHandleThrown, stableHandleOpened, stableHandleMenu, stableHandleCardPress, stableToggleSelect, stableEnterSelect]);

  const keyExtractor = useCallback((item: FoodItem) => item.id, []);

  if (!list) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.secondary.cream }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary.cream }]}>
      <BackgroundDecoration />

      {/* Search bar - only show if there are items */}
      {activeItems.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          listColor={listColor}
        />
      )}

      {/* Filter menu */}
      {activeItems.length > 0 && (
        <FilterMenu
          categories={availableCategories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          selectedExpirationFilter={selectedExpirationFilter}
          onExpirationFilterSelect={setSelectedExpirationFilter}
          listColor={listColor}
        />
      )}

      {/* Read-only indicator */}
      {isViewOnly && (
        <View style={styles.readOnlyBar}>
          <Ionicons name="eye-outline" size={16} color={COLORS.text.muted} />
          <Text style={styles.readOnlyBarText}>{t('sharing.readOnly')}</Text>
        </View>
      )}

      {/* Counter header */}
      <View style={styles.counterHeader}>
        <View style={[styles.counterBadge, { backgroundColor: hexToRgba(listColor, 0.15) }]}>
          <Text style={[styles.counterText, { color: listColor }]}>
            {searchQuery ? (
              t('inventory.results', { count: filteredItems.length })
            ) : (
              t('inventory.activeItems', { count: activeItems.length })
            )}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews
        ListEmptyComponent={
          <Animated.View style={[styles.emptyState, { opacity: searchQuery ? 1 : emptyFade }]}>
            {searchQuery ? (
              <>
                <View style={styles.noResultsIcon}>
                  <Ionicons name="search-outline" size={48} color={COLORS.text.muted} />
                </View>
                <Text style={styles.emptyTitle}>{t('inventory.noResults')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('inventory.noMatchFor', { query: searchQuery })}
                </Text>
                <PressableScale
                  onPress={() => setSearchQuery('')}
                  style={[styles.clearSearchButton, { borderColor: listColor }]}
                  hapticType="light"
                >
                  <Text style={[styles.clearSearchText, { color: listColor }]}>
                    {t('inventory.clearSearch')}
                  </Text>
                </PressableScale>
              </>
            ) : (
              <>
                <EmptyIllustration />
                <Text style={styles.emptyTitle}>{t('inventory.noFood')}</Text>
                <Text style={styles.emptySubtitle}>{t('inventory.addToStart')}</Text>
              </>
            )}
          </Animated.View>
        }
      />

      {/* Selection Action Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBar}>
          {/* Header row */}
          <View style={styles.selectionBarHeader}>
            <PressableScale
              onPress={exitSelectionMode}
              style={styles.closeSelectionButton}
              hapticType="light"
            >
              <Ionicons name="close" size={22} color={COLORS.text.secondary} />
            </PressableScale>

            <Text style={styles.selectionCount}>
              {t('inventory.selected', { count: selectedItems.size })}
            </Text>

            <PressableScale
              onPress={selectedItems.size === filteredItems.length ? deselectAllItems : selectAllItems}
              style={styles.selectAllButton}
              hapticType="light"
            >
              <Text style={[styles.selectAllText, { color: listColor }]}>
                {selectedItems.size === filteredItems.length ? t('inventory.deselectAll') : t('inventory.selectAll')}
              </Text>
            </PressableScale>
          </View>

          {/* Action buttons */}
          <View style={styles.selectionActions}>
            <PressableScale
              onPress={() => confirmBulkAction('consumed')}
              style={styles.bulkActionButton}
              hapticType="medium"
              activeScale={0.95}
            >
              <View style={[styles.bulkActionIconContainer, { backgroundColor: COLORS.primary[500] }]}>
                <Ionicons name="checkmark" size={20} color={COLORS.neutral.white} />
              </View>
              <Text style={[styles.bulkActionText, { color: COLORS.primary[500] }]}>{t('inventory.consumed')}</Text>
            </PressableScale>

            <PressableScale
              onPress={() => confirmBulkAction('thrown')}
              style={styles.bulkActionButton}
              hapticType="medium"
              activeScale={0.95}
            >
              <View style={[styles.bulkActionIconContainer, { backgroundColor: COLORS.accent.tomato }]}>
                <Ionicons name="trash-outline" size={18} color={COLORS.neutral.white} />
              </View>
              <Text style={[styles.bulkActionText, { color: COLORS.accent.tomato }]}>{t('inventory.throw')}</Text>
            </PressableScale>

            <PressableScale
              onPress={() => confirmBulkAction('delete')}
              style={styles.bulkActionButton}
              hapticType="medium"
              activeScale={0.95}
            >
              <View style={[styles.bulkActionIconContainer, { backgroundColor: COLORS.neutral.gray500 }]}>
                <Ionicons name="close" size={20} color={COLORS.neutral.white} />
              </View>
              <Text style={[styles.bulkActionText, { color: COLORS.neutral.gray500 }]}>{t('common.delete')}</Text>
            </PressableScale>
          </View>
        </View>
      )}

      {/* FAB Menu - hide in selection mode and view-only */}
      {!isSelectionMode && !isViewOnly && fabMenuOpen && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setFabMenuOpen(false)}
        />
      )}

      {!isSelectionMode && !isViewOnly && fabMenuOpen && (
        <View style={styles.fabMenuContainer}>
          {/* Scanner un ticket */}
          <Animated.View style={styles.fabMenuItem}>
            <Text style={styles.fabMenuLabel}>{t('inventory.scanReceipt')}</Text>
            <PressableScale
              onPress={async () => {
                setFabMenuOpen(false);
                if (!user) {
                  setPaywallVisible(true);
                  return;
                }
                const { allowed, source } = await canScanReceipt(user.id, isPremium);
                if (!allowed) {
                  setPaywallVisible(true);
                  return;
                }
                if (source === 'monthly_free') {
                  await markFreeReceiptScanAsUsed(user?.id ?? null);
                } else if (source === 'bonus') {
                  await useBonusScan(user.id);
                  trackBonusScanUsed();
                }
                setReceiptScannerVisible(true);
              }}
              style={[styles.fabSecondary, { backgroundColor: COLORS.status.indigo }]}
              hapticType="medium"
              activeScale={0.9}
            >
              <Ionicons name="receipt-outline" size={22} color="white" />
            </PressableScale>
          </Animated.View>

          {/* Ajouter un aliment */}
          <Animated.View style={styles.fabMenuItem}>
            <Text style={styles.fabMenuLabel}>{t('inventory.addFood')}</Text>
            <PressableScale
              onPress={() => {
                setFabMenuOpen(false);
                navigation.navigate('AddFood', { listId });
              }}
              style={[styles.fabSecondary, { backgroundColor: listColor }]}
              hapticType="medium"
              activeScale={0.9}
            >
              <Ionicons name="nutrition-outline" size={22} color="white" />
            </PressableScale>
          </Animated.View>
        </View>
      )}

      {/* Main FAB - hide in selection mode and view-only mode */}
      {!isSelectionMode && !isViewOnly && (
        <PressableScale
          onPress={toggleFabMenu}
          style={[
            styles.fab,
            { backgroundColor: listColor, ...SHADOWS.colored(listColor, 0.4) },
            fabMenuOpen && styles.fabRotated,
          ]}
          hapticType="medium"
          activeScale={0.9}
          accessibilityLabel={t('inventory.addMenu')}
          accessibilityRole="button"
        >
          <Ionicons
            name={fabMenuOpen ? 'close' : 'add'}
            size={28}
            color={COLORS.neutral.white}
          />
        </PressableScale>
      )}

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        visible={receiptScannerVisible}
        onClose={() => setReceiptScannerVisible(false)}
        onScanComplete={handleReceiptScanComplete}
      />

      {/* Receipt Review Modal */}
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

      {/* Modals */}
      <MarkAsOpenedModal
        visible={markAsOpenedModalVisible}
        onClose={() => {
          setMarkAsOpenedModalVisible(false);
          setSelectedItemId(null);
        }}
        onConfirm={handleMarkAsOpened}
        itemName={selectedItemName}
      />

      <QuantityModal
        visible={quantityModalVisible}
        onClose={() => {
          setQuantityModalVisible(false);
          setSelectedItemId(null);
        }}
        onConfirm={handleQuantityConfirm}
        itemName={selectedItemName}
        maxQuantity={selectedItemQuantity}
        actionType={quantityActionType}
      />

      {/* Menu Popup Modal */}
      <Modal
        visible={menuModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setMenuModalVisible(false)}
        >
          <View style={styles.menuModalContent}>
            <Text style={styles.menuModalTitle}>{menuSelectedItem?.name}</Text>

            <TouchableOpacity
              style={styles.menuModalOption}
              onPress={handleEditItem}
            >
              <Ionicons name="pencil-outline" size={22} color={COLORS.primary[500]} />
              <Text style={styles.menuModalOptionText}>{t('inventory.modify')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuModalOption, styles.menuModalOptionDanger]}
              onPress={handleDeleteItem}
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.accent.tomato} />
              <Text style={[styles.menuModalOptionText, styles.menuModalOptionTextDanger]}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detail Popup Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.detailModalOverlay}
          activeOpacity={1}
          onPress={() => setDetailModalVisible(false)}
        >
          <View style={styles.detailModalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {detailSelectedItem && (() => {
                const days = getDaysUntilExpiration(detailSelectedItem.expirationDate);
                const foodIconData = getFoodIcon(detailSelectedItem.name);
                let statusColor = COLORS.status.fresh;
                let statusText = t('inventory.freshStatus');
                let statusIcon = 'checkmark-circle';

                if (days !== null) {
                  if (days < 0) {
                    statusColor = COLORS.status.expired;
                    statusText = t('inventory.expiredSince', { count: Math.abs(days) });
                    statusIcon = 'close-circle';
                  } else if (days === 0) {
                    statusColor = COLORS.status.expiringSoon;
                    statusText = t('inventory.expiresToday');
                    statusIcon = 'alert-circle';
                  } else if (days <= 3) {
                    statusColor = COLORS.status.expiringSoon;
                    statusText = t('inventory.expiresIn', { count: days });
                    statusIcon = 'time';
                  } else {
                    statusText = t('inventory.expiresIn', { count: days });
                    statusIcon = 'checkmark-circle';
                  }
                }

                return (
                  <>
                    {/* Header with close button */}
                    <View style={styles.detailModalHeader}>
                    <Text style={styles.detailModalTitle}>{t('inventory.foodDetails')}</Text>
                    <TouchableOpacity
                      onPress={() => setDetailModalVisible(false)}
                      style={styles.detailModalClose}
                    >
                      <Ionicons name="close" size={24} color={COLORS.text.secondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Image */}
                  <View style={styles.detailImageContainer}>
                    {detailSelectedItem.imageUri ? (
                      <Image source={{ uri: detailSelectedItem.imageUri }} style={styles.detailImage} />
                    ) : (
                      <View style={styles.detailImagePlaceholder}>
                        <Ionicons
                          name={foodIconData.icon}
                          size={64}
                          color={hexToRgba(COLORS.primary[500], 0.35)}
                        />
                      </View>
                    )}
                  </View>

                  {/* Food name */}
                  <Text style={styles.detailFoodName}>{detailSelectedItem.name}</Text>

                  {/* Status badge */}
                  <View style={[styles.detailStatusBadge, { backgroundColor: hexToRgba(statusColor, 0.15) }]}>
                    <Ionicons name={statusIcon as any} size={18} color={statusColor} />
                    <Text style={[styles.detailStatusText, { color: statusColor }]}>{statusText}</Text>
                  </View>

                  {/* Details section */}
                  <View style={styles.detailInfoSection}>
                    {/* Category */}
                    {detailSelectedItem.category && (
                      <View style={styles.detailInfoRow}>
                        <View style={styles.detailInfoLabel}>
                          <Ionicons name="fast-food-outline" size={20} color={COLORS.text.secondary} />
                          <Text style={styles.detailInfoLabelText}>{t('inventory.category')}</Text>
                        </View>
                        <Text style={styles.detailInfoValue}>{detailSelectedItem.category}</Text>
                      </View>
                    )}

                    {/* Quantity */}
                    <View style={styles.detailInfoRow}>
                      <View style={styles.detailInfoLabel}>
                        <Ionicons name="layers-outline" size={20} color={COLORS.text.secondary} />
                        <Text style={styles.detailInfoLabelText}>{t('inventory.quantity')}</Text>
                      </View>
                      <Text style={styles.detailInfoValue}>x{detailSelectedItem.quantity || 1}</Text>
                    </View>

                    {/* Weight / Unit */}
                    {detailSelectedItem.weight != null && detailSelectedItem.weight > 0 && (
                      <View style={styles.detailInfoRow}>
                        <View style={styles.detailInfoLabel}>
                          <Ionicons name="scale-outline" size={20} color={COLORS.text.secondary} />
                          <Text style={styles.detailInfoLabelText}>{t('addFood.volume')}</Text>
                        </View>
                        <Text style={styles.detailInfoValue}>
                          {detailSelectedItem.weight} {detailSelectedItem.unit || 'g'}
                        </Text>
                      </View>
                    )}

                    {/* Price */}
                    {detailSelectedItem.price !== undefined && detailSelectedItem.price > 0 && (
                      <View style={styles.detailInfoRow}>
                        <View style={styles.detailInfoLabel}>
                          <Ionicons name="pricetag-outline" size={20} color={COLORS.text.secondary} />
                          <Text style={styles.detailInfoLabelText}>{t('addFood.totalPrice')}</Text>
                        </View>
                        <Text style={styles.detailInfoValue}>
                          {detailSelectedItem.price.toFixed(2).replace('.', ',')} €
                        </Text>
                      </View>
                    )}

                    {/* Expiration date */}
                    {detailSelectedItem.expirationDate && (
                      <View style={styles.detailInfoRow}>
                        <View style={styles.detailInfoLabel}>
                          <Ionicons name="calendar-outline" size={20} color={COLORS.text.secondary} />
                          <Text style={styles.detailInfoLabelText}>{t('addFood.expirationDate')}</Text>
                        </View>
                        <Text style={[styles.detailInfoValue, { color: statusColor, fontWeight: '700' }]}>
                          {detailSelectedItem.expirationDate}
                        </Text>
                      </View>
                    )}

                    {/* Opened status */}
                    {detailSelectedItem.isOpened && (
                      <>
                        <View style={styles.detailInfoRow}>
                          <View style={styles.detailInfoLabel}>
                            <Ionicons name="open-outline" size={20} color={COLORS.text.secondary} />
                            <Text style={styles.detailInfoLabelText}>{t('inventory.status')}</Text>
                          </View>
                          <Text style={styles.detailInfoValue}>{t('inventory.opened')}</Text>
                        </View>

                        {detailSelectedItem.openedDate && (
                          <View style={styles.detailInfoRow}>
                            <View style={styles.detailInfoLabel}>
                              <Ionicons name="time-outline" size={20} color={COLORS.text.secondary} />
                              <Text style={styles.detailInfoLabelText}>{t('addFood.openDate')}</Text>
                            </View>
                            <Text style={styles.detailInfoValue}>{detailSelectedItem.openedDate}</Text>
                          </View>
                        )}

                        {detailSelectedItem.daysAfterOpening && (
                          <View style={styles.detailInfoRow}>
                            <View style={styles.detailInfoLabel}>
                              <Ionicons name="hourglass-outline" size={20} color={COLORS.text.secondary} />
                              <Text style={styles.detailInfoLabelText}>{t('addFood.consumeWithin')}</Text>
                            </View>
                            <Text style={styles.detailInfoValue}>
                              {detailSelectedItem.daysAfterOpening} {t('common.days')}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>

                  {/* Action buttons */}
                  <View style={styles.detailActionButtons}>
                    <PressableScale
                      onPress={() => {
                        setDetailModalVisible(false);
                        handleMarkAsConsumed(detailSelectedItem);
                      }}
                      style={[styles.detailActionButton, { backgroundColor: COLORS.primary[500] }]}
                      hapticType="medium"
                      activeScale={0.96}
                    >
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.neutral.white} />
                      <Text style={styles.detailActionButtonText}>{t('inventory.consumed')}</Text>
                    </PressableScale>

                    <PressableScale
                      onPress={() => {
                        setDetailModalVisible(false);
                        handleMarkAsThrown(detailSelectedItem);
                      }}
                      style={[styles.detailActionButton, { backgroundColor: COLORS.semantic.dangerLight }]}
                      hapticType="medium"
                      activeScale={0.96}
                    >
                      <Ionicons name="trash" size={20} color={COLORS.neutral.white} />
                      <Text style={styles.detailActionButtonText}>{t('inventory.throw')}</Text>
                    </PressableScale>
                  </View>
                </>
              );
            })()}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature="scanner"
      />

      {/* Share List Modal */}
      <ShareListModal
        visible={shareModalVisible}
        onClose={() => {
          setShareModalVisible(false);
          refreshSharing();
        }}
        listId={listId}
        listTitle={listTitle}
        listColor={listColor}
      />

      {/* List Members Modal */}
      <ListMembersModal
        visible={membersModalVisible}
        onClose={() => setMembersModalVisible(false)}
        listId={listId}
        listTitle={listTitle}
        listColor={listColor}
        isOwner={myPermission === 'owner'}
        onLeft={() => navigation.goBack()}
      />

      <SavedFoodPulse
        visible={showSavedPulse}
        onDone={() => setShowSavedPulse(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  decorationContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.cream,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    color: COLORS.text.primary,
    letterSpacing: 0,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    position: 'relative',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    ...SHADOWS.xs,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: COLORS.neutral.white,
    fontSize: 11,
    fontWeight: '700',
  },
  clearFiltersButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.neutral.gray300, 0.5),
    ...SHADOWS.xs,
  },
  clearFiltersText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  filterOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: -1000,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  filterMenuContent: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    ...SHADOWS.lg,
    maxHeight: 400,
    zIndex: 11,
  },
  filterSection: {
    paddingVertical: 12,
  },
  filterSectionTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
    letterSpacing: 0.5,
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterMenuItemActive: {
    backgroundColor: hexToRgba(COLORS.primary[500], 0.05),
  },
  filterMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterMenuItemText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  filterDivider: {
    height: 1,
    backgroundColor: hexToRgba(COLORS.neutral.gray200, 0.5),
    marginHorizontal: 16,
  },
  counterHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  counterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  counterText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  // Card Design
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.neutral.gray200, 0.5),
    ...SHADOWS.sm,
  },
  cardSelected: {
    borderWidth: 2,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.05),
  },
  cardInner: {
    flexDirection: 'row',
  },
  // Image wrapper with status dot
  imageWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  imagePlaceholder: {
    width: 95,
    height: 95,
    borderRadius: 16,
    backgroundColor: COLORS.secondary.sage,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  statusDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: COLORS.neutral.white,
  },
  // Right content area
  cardRight: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContent: {
    flex: 1,
    paddingRight: 8,
  },
  foodName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  quantityPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  expirationDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  expirationDateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Three dots menu
  dotsMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dotItem: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.9),
  },
  // Action buttons
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  btnConsumed: {
    flex: 1,
    backgroundColor: COLORS.primary[500],
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnThrown: {
    flex: 1,
    backgroundColor: COLORS.semantic.dangerLight,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOpened: {
    flex: 1,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.7),
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOpenedActive: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.5),
  },
  btnTextWhite: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
  btnTextDark: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  btnTextOpenedActive: {
    color: COLORS.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: hexToRgba(COLORS.text.muted, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[500],
    marginTop: 16,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  clearSearchButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
  },
  clearSearchText: {
    ...TYPOGRAPHY.buttonSm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  fabRotated: {
    transform: [{ rotate: '45deg' }],
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 90,
  },
  fabMenuContainer: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    alignItems: 'flex-end',
    zIndex: 95,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fabMenuLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.neutral.white,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginRight: 12,
    fontWeight: '500',
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  // Multi-selection styles
  checkboxContainer: {
    marginRight: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.neutral.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neutral.white,
  },
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...SHADOWS.lg,
    zIndex: 100,
  },
  selectionBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  closeSelectionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: hexToRgba(COLORS.neutral.gray200, 0.6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    marginLeft: 12,
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    borderRadius: RADIUS.lg,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: hexToRgba(COLORS.neutral.gray200, 0.6),
  },
  bulkActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  bulkActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...SHADOWS.sm,
  },
  bulkActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Menu Modal styles
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    ...SHADOWS.lg,
  },
  menuModalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray200,
  },
  menuModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 8,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
  },
  menuModalOptionDanger: {
    backgroundColor: hexToRgba(COLORS.accent.tomato, 0.08),
    marginBottom: 0,
  },
  menuModalOptionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primary[500],
    marginLeft: 12,
  },
  menuModalOptionTextDanger: {
    color: COLORS.accent.tomato,
  },
  // Detail Modal styles
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    ...SHADOWS.lg,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailModalTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  detailModalClose: {
    padding: 4,
  },
  detailImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
  },
  detailImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 20,
    backgroundColor: COLORS.secondary.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailFoodName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    marginBottom: 20,
    alignSelf: 'center',
  },
  detailStatusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  detailInfoSection: {
    backgroundColor: hexToRgba(COLORS.neutral.gray100, 0.5),
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.neutral.gray200, 0.5),
  },
  detailInfoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detailInfoLabelText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  detailInfoValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'right',
  },
  detailActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: RADIUS.xl,
    ...SHADOWS.md,
  },
  detailActionButtonText: {
    color: COLORS.neutral.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerShareButton: {
    padding: 6,
  },
  headerMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  headerMembersBadge: {
    position: 'absolute',
    top: -6,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerMembersBadgeText: {
    color: COLORS.neutral.white,
    fontSize: 11,
    fontWeight: '700',
  },
  readOnlyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: hexToRgba(COLORS.neutral.gray300, 0.3),
  },
  readOnlyBarText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.muted,
  },
});
