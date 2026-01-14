import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
} from '../utils/localStorage';
import MarkAsOpenedModal from '../components/MarkAsOpenedModal';
import QuantityModal from '../components/QuantityModal';
import PressableScale from '../components/PressableScale';
import ReceiptScannerModal from '../components/ReceiptScannerModal';
import ReceiptReviewModal from '../components/ReceiptReviewModal';
import { ReceiptScanResult, ReceiptItem } from '../services/receiptScannerService';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba, EXPIRATION_COLORS } from '../utils/designSystem';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import { getFoodIcon } from '../services/iconService';

type RoutePropType = RouteProp<RootStackParamList, 'InventoryList'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'InventoryList'>;

// Background decoration
function BackgroundDecoration() {
  return (
    <View style={styles.decorationContainer}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <G opacity={0.05}>
          <Circle cx="180" cy="20" r="100" fill={COLORS.primary[500]} />
        </G>
      </Svg>
    </View>
  );
}

// Empty state illustration
function EmptyIllustration() {
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
}

// Search bar component
function SearchBar({
  value,
  onChangeText,
  listColor,
}: {
  value: string;
  onChangeText: (text: string) => void;
  listColor: string;
}) {
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
          placeholder="Rechercher un aliment..."
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
}

// Compact Food Card with colored dot
function FoodItemCard({
  item,
  onConsumed,
  onThrown,
  onMarkAsOpened,
  listColor,
  searchQuery,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onLongPress,
}: {
  item: FoodItem;
  onConsumed: () => void;
  onThrown: () => void;
  onMarkAsOpened: () => void;
  listColor: string;
  searchQuery: string;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onLongPress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const days = getDaysUntilExpiration(item.expirationDate);

  // Determine status color for dot
  let dotColor = COLORS.semantic.success;
  let statusText = 'Frais';
  if (days !== null) {
    if (days < 0) {
      dotColor = COLORS.semantic.danger;
      statusText = `Expiré (${Math.abs(days)}j)`;
    } else if (days === 0) {
      dotColor = COLORS.accent.carrot;
      statusText = "Aujourd'hui";
    } else if (days <= 3) {
      dotColor = COLORS.semantic.warning;
      statusText = `${days}j`;
    } else {
      statusText = `${days}j`;
    }
  } else {
    dotColor = COLORS.neutral.gray400;
    statusText = 'Pas de date';
  }

  const handlePress = () => {
    if (isSelectionMode) {
      onToggleSelect();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <PressableScale
      onPress={handlePress}
      onLongPress={onLongPress}
      activeScale={0.98}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        isSelected && { borderColor: listColor },
      ]}
    >
      {/* Main row */}
      <View style={styles.cardRow}>
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

        {/* Food icon with expiration status color */}
        {(() => {
          const foodIconData = getFoodIcon(item.name);
          return (
            <View style={[styles.foodIconContainer, { backgroundColor: hexToRgba(dotColor, 0.15) }]}>
              <Ionicons
                name={foodIconData.icon}
                size={22}
                color={dotColor}
              />
            </View>
          );
        })()}

        {/* Food info */}
        <View style={styles.foodInfo}>
          <Text style={styles.foodName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            {item.quantity && item.quantity > 1 && (
              <Text style={styles.quantityText}>×{item.quantity}</Text>
            )}
            {item.isOpened && (
              <View style={styles.openedBadge}>
                <Text style={styles.openedText}>Ouvert</Text>
              </View>
            )}
            <Text style={[styles.expirationText, { color: dotColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Expand chevron */}
        {!isSelectionMode && (
          <View style={styles.chevronContainer}>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={COLORS.neutral.gray400}
            />
          </View>
        )}
      </View>

      {/* Expanded actions */}
      {expanded && !isSelectionMode && (
        <View style={styles.expandedActions}>
          <PressableScale
            onPress={() => { onConsumed(); setExpanded(false); }}
            style={styles.actionBtn}
            hapticType="medium"
            activeScale={0.95}
          >
            <View style={[styles.actionBtnIcon, { backgroundColor: COLORS.primary[500] }]}>
              <Ionicons name="checkmark" size={18} color={COLORS.neutral.white} />
            </View>
            <Text style={styles.actionBtnLabel}>Consommé</Text>
          </PressableScale>

          <PressableScale
            onPress={() => { onThrown(); setExpanded(false); }}
            style={styles.actionBtn}
            hapticType="medium"
            activeScale={0.95}
          >
            <View style={[styles.actionBtnIcon, { backgroundColor: COLORS.accent.tomato }]}>
              <Ionicons name="trash" size={16} color={COLORS.neutral.white} />
            </View>
            <Text style={styles.actionBtnLabel}>Jeté</Text>
          </PressableScale>

          {!item.isOpened && (
            <PressableScale
              onPress={() => { onMarkAsOpened(); setExpanded(false); }}
              style={styles.actionBtn}
              hapticType="light"
              activeScale={0.95}
            >
              <View style={[styles.actionBtnIcon, { backgroundColor: COLORS.accent.carrot }]}>
                <Ionicons name="lock-open" size={16} color={COLORS.neutral.white} />
              </View>
              <Text style={styles.actionBtnLabel}>Ouvrir</Text>
            </PressableScale>
          )}
        </View>
      )}
    </PressableScale>
  );
}

export default function InventoryListScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { listId, listTitle, listColor = COLORS.primary[500] } = route.params;

  const [list, setList] = useState<List | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [markAsOpenedModalVisible, setMarkAsOpenedModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const [selectedItemQuantity, setSelectedItemQuantity] = useState<number>(1);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [quantityActionType, setQuantityActionType] = useState<'consumed' | 'thrown' | 'opened'>('consumed');

  // Multi-selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Receipt scanner states
  const [receiptScannerVisible, setReceiptScannerVisible] = useState(false);
  const [receiptReviewVisible, setReceiptReviewVisible] = useState(false);
  const [scannedItems, setScannedItems] = useState<ReceiptItem[]>([]);
  const [scannedStoreName, setScannedStoreName] = useState<string | undefined>();
  const [scannedDate, setScannedDate] = useState<string | undefined>();
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

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

  // Set navigation header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: listTitle,
      headerStyle: { backgroundColor: COLORS.secondary.cream },
      headerTintColor: listColor,
    });
  }, [listTitle, listColor]);

  const loadListData = async () => {
    try {
      const data = await getListById(listId);
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
        Alert.alert('Erreur', 'Liste introuvable');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la liste:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste');
    }
  };

  // Filter active items
  const activeItems = useMemo(() => {
    if (!list) return [];
    return list.items.filter(
      (item) => item.status !== 'consumed' && item.status !== 'thrown'
    );
  }, [list]);

  // Filter by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return activeItems;
    const query = searchQuery.toLowerCase().trim();
    return activeItems.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const categoryMatch = item.category?.toLowerCase().includes(query);
      return nameMatch || categoryMatch;
    });
  }, [activeItems, searchQuery]);

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
      await updateItemStatusWithQuantity(listId, itemId, 'consumed', quantity);
      await loadListData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de marquer comme consommé');
    }
  };

  const markAsThrownDirect = async (itemId: string, quantity: number) => {
    try {
      await updateItemStatusWithQuantity(listId, itemId, 'thrown', quantity);
      await loadListData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de marquer comme jeté');
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
      setMarkAsOpenedModalVisible(true);
    }
  };

  const handleMarkAsOpened = async (openedDate: string, daysAfterOpening: number) => {
    if (!selectedItemId) return;

    try {
      if (selectedItemQuantity > 1) {
        await markItemAsOpenedWithQuantity(listId, selectedItemId, openedDate, daysAfterOpening, selectedItemQuantity);
      } else {
        await markItemAsOpened(listId, selectedItemId, openedDate, daysAfterOpening);
      }
      await loadListData();
      setMarkAsOpenedModalVisible(false);
      setSelectedItemId(null);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de marquer comme ouvert');
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
        };
        await addItemToList(listId, newFoodItem);
      }

      setReceiptReviewVisible(false);
      setScannedItems([]);
      await loadListData();

      Alert.alert(
        'Succès',
        `${items.length} produit${items.length > 1 ? 's' : ''} ajouté${items.length > 1 ? 's' : ''} à la liste`
      );
    } catch (error) {
      console.error('Erreur ajout produits:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter les produits');
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
      }
      exitSelectionMode();
      await loadListData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de marquer comme consommés');
    }
  };

  const handleBulkThrown = async () => {
    try {
      for (const itemId of selectedItems) {
        const item = activeItems.find(i => i.id === itemId);
        const quantity = item?.quantity || 1;
        await updateItemStatusWithQuantity(listId, itemId, 'thrown', quantity);
      }
      exitSelectionMode();
      await loadListData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de marquer comme jetés');
    }
  };

  const confirmBulkAction = (action: 'consumed' | 'thrown') => {
    const count = selectedItems.size;
    const actionText = action === 'consumed' ? 'consommé' : 'jeté';
    const actionPlural = action === 'consumed' ? 'consommés' : 'jetés';

    Alert.alert(
      `Confirmer l'action`,
      `Marquer ${count} aliment${count > 1 ? 's' : ''} comme ${count > 1 ? actionPlural : actionText} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: action === 'consumed' ? handleBulkConsumed : handleBulkThrown,
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: FoodItem; index: number }) => (
    <FoodItemCard
      item={item}
      onConsumed={() => handleMarkAsConsumed(item)}
      onThrown={() => handleMarkAsThrown(item)}
      onMarkAsOpened={() => handleOpenMarkAsOpenedModal(item)}
      listColor={listColor}
      searchQuery={searchQuery}
      isSelectionMode={isSelectionMode}
      isSelected={selectedItems.has(item.id)}
      onToggleSelect={() => toggleItemSelection(item.id)}
      onLongPress={() => enterSelectionMode(item.id)}
    />
  );

  if (!list) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundDecoration />

      {/* Search bar - only show if there are items */}
      {activeItems.length > 0 && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          listColor={listColor}
        />
      )}

      {/* Counter header */}
      <View style={styles.counterHeader}>
        <View style={[styles.counterBadge, { backgroundColor: hexToRgba(listColor, 0.15) }]}>
          <Text style={[styles.counterText, { color: listColor }]}>
            {searchQuery ? (
              `${filteredItems.length} résultat${filteredItems.length !== 1 ? 's' : ''}`
            ) : (
              `${activeItems.length} aliment${activeItems.length !== 1 ? 's' : ''} actif${activeItems.length !== 1 ? 's' : ''}`
            )}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Animated.View style={[styles.emptyState, { opacity: searchQuery ? 1 : emptyFade }]}>
            {searchQuery ? (
              <>
                <View style={styles.noResultsIcon}>
                  <Ionicons name="search-outline" size={48} color={COLORS.text.muted} />
                </View>
                <Text style={styles.emptyTitle}>Aucun résultat</Text>
                <Text style={styles.emptySubtitle}>
                  Aucun aliment ne correspond à "{searchQuery}"
                </Text>
                <PressableScale
                  onPress={() => setSearchQuery('')}
                  style={[styles.clearSearchButton, { borderColor: listColor }]}
                  hapticType="light"
                >
                  <Text style={[styles.clearSearchText, { color: listColor }]}>
                    Effacer la recherche
                  </Text>
                </PressableScale>
              </>
            ) : (
              <>
                <EmptyIllustration />
                <Text style={styles.emptyTitle}>Aucun aliment</Text>
                <Text style={styles.emptySubtitle}>Ajoutez-en un pour commencer !</Text>
              </>
            )}
          </Animated.View>
        }
      />

      {/* Selection Action Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionBarContent}>
            {/* Selection info and controls */}
            <View style={styles.selectionInfo}>
              <PressableScale
                onPress={exitSelectionMode}
                style={styles.closeSelectionButton}
                hapticType="light"
              >
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </PressableScale>
              <Text style={styles.selectionCount}>
                {selectedItems.size} sélectionné{selectedItems.size > 1 ? 's' : ''}
              </Text>
            </View>

            {/* Select all / Deselect all */}
            <PressableScale
              onPress={selectedItems.size === filteredItems.length ? deselectAllItems : selectAllItems}
              style={styles.selectAllButton}
              hapticType="light"
            >
              <Text style={[styles.selectAllText, { color: listColor }]}>
                {selectedItems.size === filteredItems.length ? 'Tout désélect.' : 'Tout sélect.'}
              </Text>
            </PressableScale>
          </View>

          {/* Action buttons */}
          <View style={styles.selectionActions}>
            <PressableScale
              onPress={() => confirmBulkAction('consumed')}
              style={[styles.bulkActionButton, { backgroundColor: COLORS.primary[500] }]}
              hapticType="medium"
              activeScale={0.95}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.neutral.white} />
              <Text style={styles.bulkActionText}>Consommé</Text>
            </PressableScale>

            <PressableScale
              onPress={() => confirmBulkAction('thrown')}
              style={[styles.bulkActionButton, { backgroundColor: COLORS.accent.tomato }]}
              hapticType="medium"
              activeScale={0.95}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.neutral.white} />
              <Text style={styles.bulkActionText}>Jeté</Text>
            </PressableScale>
          </View>
        </View>
      )}

      {/* FAB Menu - hide in selection mode */}
      {!isSelectionMode && fabMenuOpen && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setFabMenuOpen(false)}
        />
      )}

      {!isSelectionMode && fabMenuOpen && (
        <View style={styles.fabMenuContainer}>
          {/* Scanner un ticket */}
          <Animated.View style={styles.fabMenuItem}>
            <Text style={styles.fabMenuLabel}>Scanner un ticket</Text>
            <PressableScale
              onPress={() => {
                setFabMenuOpen(false);
                setReceiptScannerVisible(true);
              }}
              style={[styles.fabSecondary, { backgroundColor: '#6366F1' }]}
              hapticType="medium"
              activeScale={0.9}
            >
              <Ionicons name="receipt-outline" size={22} color="white" />
            </PressableScale>
          </Animated.View>

          {/* Ajouter un aliment */}
          <Animated.View style={styles.fabMenuItem}>
            <Text style={styles.fabMenuLabel}>Ajouter un aliment</Text>
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

      {/* Main FAB - hide in selection mode */}
      {!isSelectionMode && (
        <PressableScale
          onPress={toggleFabMenu}
          style={[
            styles.fab,
            { backgroundColor: listColor, ...SHADOWS.colored(listColor, 0.4) },
            fabMenuOpen && styles.fabRotated,
          ]}
          hapticType="medium"
          activeScale={0.9}
          accessibilityLabel="Menu d'ajout"
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
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
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
  // Compact Card Design
  card: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: RADIUS.lg,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.neutral.gray200, 0.6),
    ...SHADOWS.sm,
  },
  cardSelected: {
    borderWidth: 2,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.05),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Food icon container
  foodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  // Status dot (kept for reference, but replaced by icon)
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  // Food info
  foodInfo: {
    flex: 1,
    marginRight: 8,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  openedBadge: {
    backgroundColor: hexToRgba(COLORS.accent.carrot, 0.12),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  openedText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.accent.carrot,
  },
  expirationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Chevron
  chevronContainer: {
    padding: 4,
  },
  // Expanded actions - icon buttons
  expandedActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: hexToRgba(COLORS.neutral.gray200, 0.6),
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.lg,
    zIndex: 100,
  },
  selectionBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeSelectionButton: {
    padding: 4,
    marginRight: 12,
  },
  selectionCount: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text.primary,
  },
  selectAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectAllText: {
    ...TYPOGRAPHY.buttonSm,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  bulkActionText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral.white,
  },
});
