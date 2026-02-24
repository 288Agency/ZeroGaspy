import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { ReceiptItem } from '../services/mindeeReceiptService';
import { COLORS, SHADOWS, RADIUS, TYPOGRAPHY, hexToRgba } from '../utils/designSystem';
import PressableScale from './PressableScale';
import DatePickerField from './DatePickerField';

interface ReceiptReviewModalProps {
  visible: boolean;
  items: ReceiptItem[];
  storeName?: string;
  date?: string;
  onClose: () => void;
  onConfirm: (items: ReceiptItem[]) => void;
}

export default function ReceiptReviewModal({
  visible,
  items: initialItems,
  storeName,
  date,
  onClose,
  onConfirm,
}: ReceiptReviewModalProps) {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [globalExpirationDate, setGlobalExpirationDate] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setItems(initialItems.map(item => ({ ...item, selected: true, expirationDate: '' })));
      setGlobalExpirationDate('');
      setEditingItemId(null);
      setExpandedItemId(null);
    }
  }, [visible, initialItems]);

  const toggleItem = (id: string) => {
    Haptics.selectionAsync();
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateItemName = (id: string, name: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, name } : item))
    );
  };

  const updateItemQuantity = (id: string, quantity: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Math.min(quantity, 99)) }
          : item
      )
    );
  };

  const updateItemExpirationDate = (id: string, expirationDate: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, expirationDate } : item))
    );
  };

  const removeItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.filter(item => item.id !== id));
    if (expandedItemId === id) setExpandedItemId(null);
  };

  const toggleExpanded = (id: string) => {
    Haptics.selectionAsync();
    setExpandedItemId(prev => (prev === id ? null : id));
  };

  const selectAll = () => {
    Haptics.selectionAsync();
    setItems(prev => prev.map(item => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    Haptics.selectionAsync();
    setItems(prev => prev.map(item => ({ ...item, selected: false })));
  };

  const applyGlobalDate = () => {
    if (!globalExpirationDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev =>
      prev.map(item =>
        item.selected && !item.expirationDate
          ? { ...item, expirationDate: globalExpirationDate }
          : item
      )
    );
  };

  const handleConfirm = () => {
    const selectedItems = items
      .filter(item => item.selected)
      .map(item => ({
        ...item,
        // Utiliser la date globale si pas de date individuelle
        expirationDate: item.expirationDate || globalExpirationDate || '',
      }));

    if (selectedItems.length === 0) {
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(selectedItems);
  };

  const selectedCount = items.filter(item => item.selected).length;

  const renderItem = (item: ReceiptItem, index: number) => {
    const isEditing = editingItemId === item.id;
    const isExpanded = expandedItemId === item.id;

    return (
      <Animated.View
        key={item.id}
        entering={FadeIn.delay(index * 50)}
        exiting={FadeOut}
        layout={Layout.springify()}
      >
        <View style={[styles.itemCard, !item.selected && styles.itemCardUnselected]}>
          {/* Ligne principale */}
          <View style={styles.itemMainRow}>
            {/* Checkbox */}
            <TouchableOpacity
              onPress={() => toggleItem(item.id)}
              style={styles.checkboxContainer}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
                {item.selected && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>

            {/* Contenu */}
            <View style={styles.itemContent}>
              {isEditing ? (
                <TextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(text) => updateItemName(item.id, text)}
                  onBlur={() => setEditingItemId(null)}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <TouchableOpacity onPress={() => setEditingItemId(item.id)}>
                  <Text style={[styles.itemName, !item.selected && styles.itemNameUnselected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.itemDetails}>
                {item.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                )}
                {item.expirationDate && (
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={10} color={COLORS.primary[500]} />
                    <Text style={styles.dateTagText}>{item.expirationDate}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quantite */}
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
                style={styles.quantityButton}
                disabled={item.quantity <= 1}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={item.quantity <= 1 ? COLORS.text.muted : COLORS.primary[500]}
                />
              </TouchableOpacity>

              <Text style={styles.quantityText}>{item.quantity}</Text>

              <TouchableOpacity
                onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                style={styles.quantityButton}
                disabled={item.quantity >= 99}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={item.quantity >= 99 ? COLORS.text.muted : COLORS.primary[500]}
                />
              </TouchableOpacity>
            </View>

            {/* Bouton expand/date */}
            <TouchableOpacity
              onPress={() => toggleExpanded(item.id)}
              style={[styles.expandButton, isExpanded && styles.expandButtonActive]}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'calendar-outline'}
                size={18}
                color={isExpanded ? 'white' : COLORS.primary[500]}
              />
            </TouchableOpacity>

            {/* Supprimer */}
            <TouchableOpacity
              onPress={() => removeItem(item.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.semantic.danger} />
            </TouchableOpacity>
          </View>

          {/* Section date expanded */}
          {isExpanded && item.selected && (
            <View style={styles.dateSection}>
              <Text style={styles.dateSectionLabel}>Date d'expiration</Text>
              <DatePickerField
                label=""
                value={item.expirationDate || ''}
                onDateChange={(date) => updateItemExpirationDate(item.id, date)}
              />
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text.secondary} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Produits detectes</Text>
            {storeName && <Text style={styles.storeName}>{storeName}</Text>}
            {date && <Text style={styles.ticketDateText}>Ticket du {date}</Text>}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={selectAll} style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Tout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deselectAll} style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Aucun</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Liste des produits */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.text.muted} />
              <Text style={styles.emptyText}>Aucun produit detecte</Text>
            </View>
          ) : (
            <>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.primary[500]} />
                <Text style={styles.infoText}>
                  Appuyez sur l'icone calendrier pour definir une date d'expiration par produit
                </Text>
              </View>

              <Text style={styles.sectionLabel}>
                {items.length} produit{items.length > 1 ? 's' : ''} detecte{items.length > 1 ? 's' : ''}
              </Text>
              {items.map((item, index) => renderItem(item, index))}
            </>
          )}

          {/* Date d'expiration globale */}
          {items.length > 0 && (
            <View style={styles.globalDateSection}>
              <Text style={styles.sectionLabel}>Date globale (optionnelle)</Text>
              <Text style={styles.globalDateHint}>
                Appliquee aux produits sans date individuelle
              </Text>
              <View style={styles.globalDateRow}>
                <View style={styles.globalDatePicker}>
                  <DatePickerField
                    label=""
                    value={globalExpirationDate}
                    onDateChange={setGlobalExpirationDate}
                  />
                </View>
                {globalExpirationDate && (
                  <TouchableOpacity onPress={applyGlobalDate} style={styles.applyButton}>
                    <Ionicons name="checkmark" size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {selectedCount} produit{selectedCount > 1 ? 's' : ''} selectionne{selectedCount > 1 ? 's' : ''}
            </Text>
          </View>

          <PressableScale
            onPress={handleConfirm}
            disabled={selectedCount === 0}
            style={[styles.confirmButton, selectedCount === 0 && styles.confirmButtonDisabled]}
            hapticType="medium"
          >
            <Ionicons
              name="add-circle"
              size={22}
              color={selectedCount > 0 ? 'white' : COLORS.text.muted}
            />
            <Text style={[styles.confirmButtonText, selectedCount === 0 && styles.confirmButtonTextDisabled]}>
              Ajouter a la liste
            </Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[500],
  },
  storeName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  ticketDateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    borderRadius: RADIUS.md,
  },
  selectButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.primary[500], 0.08),
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[500],
    flex: 1,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    ...SHADOWS.sm,
  },
  itemCardUnselected: {
    backgroundColor: hexToRgba(COLORS.neutral.gray100, 0.5),
    borderColor: hexToRgba(COLORS.neutral.gray300, 0.3),
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: hexToRgba(COLORS.primary[500], 0.4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
    fontSize: 14,
  },
  itemNameUnselected: {
    color: COLORS.text.muted,
    textDecorationLine: 'line-through',
  },
  itemNameInput: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
    fontSize: 14,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary[500],
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  categoryText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[500],
    fontSize: 10,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  dateTagText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[500],
    fontSize: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: hexToRgba(COLORS.secondary.cream, 0.8),
    borderRadius: RADIUS.md,
  },
  quantityButton: {
    padding: 6,
  },
  quantityText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
    minWidth: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  expandButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: RADIUS.md,
    backgroundColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  expandButtonActive: {
    backgroundColor: COLORS.primary[500],
  },
  deleteButton: {
    padding: 8,
  },
  dateSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  dateSectionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.muted,
    marginTop: 16,
  },
  globalDateSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: hexToRgba(COLORS.primary[500], 0.1),
  },
  globalDateHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.muted,
    marginBottom: 12,
  },
  globalDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  globalDatePicker: {
    flex: 1,
  },
  applyButton: {
    backgroundColor: COLORS.primary[500],
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  footer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: hexToRgba(COLORS.primary[500], 0.1),
    ...SHADOWS.lg,
  },
  summaryRow: {
    marginBottom: 16,
  },
  summaryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    gap: 8,
    ...SHADOWS.colored(COLORS.primary[500], 0.35),
  },
  confirmButtonDisabled: {
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.6),
    shadowOpacity: 0,
  },
  confirmButtonText: {
    ...TYPOGRAPHY.button,
    color: 'white',
  },
  confirmButtonTextDisabled: {
    color: COLORS.text.muted,
  },
});
