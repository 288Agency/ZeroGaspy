import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from './AnimatedModal';
import PressableScale from './PressableScale';
import { COLORS, SPACING, RADIUS, hexToRgba } from '../utils/designSystem';

interface QuantityModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  itemName: string;
  maxQuantity: number;
  actionType: 'consumed' | 'thrown' | 'opened';
}

export default function QuantityModal({
  visible,
  onClose,
  onConfirm,
  itemName,
  maxQuantity,
  actionType,
}: QuantityModalProps) {
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (visible) {
      setQuantity('1');
    }
  }, [visible]);

  const getActionLabel = () => {
    switch (actionType) {
      case 'consumed':
        return 'consommé';
      case 'thrown':
        return 'jeté';
      case 'opened':
        return 'ouvert';
      default:
        return '';
    }
  };

  const getActionColor = () => {
    switch (actionType) {
      case 'consumed':
        return COLORS.primary[500];
      case 'thrown':
        return COLORS.semantic.dangerDark;
      case 'opened':
        return COLORS.semantic.warningAmber;
      default:
        return COLORS.primary[500];
    }
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (actionType) {
      case 'consumed':
        return 'checkmark-circle-outline';
      case 'thrown':
        return 'trash-outline';
      case 'opened':
        return 'open-outline';
      default:
        return 'help-outline';
    }
  };

  const handleConfirm = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      onConfirm(1);
    } else if (qty > maxQuantity) {
      onConfirm(maxQuantity);
    } else {
      onConfirm(qty);
    }
  };

  const incrementQuantity = () => {
    const current = parseInt(quantity, 10) || 0;
    if (current < maxQuantity) {
      setQuantity((current + 1).toString());
    }
  };

  const decrementQuantity = () => {
    const current = parseInt(quantity, 10) || 0;
    if (current > 1) {
      setQuantity((current - 1).toString());
    }
  };

  const setAllQuantity = () => {
    setQuantity(maxQuantity.toString());
  };

  const currentQty = parseInt(quantity, 10) || 0;
  const isValid = currentQty >= 1 && currentQty <= maxQuantity;

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      position="center"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[styles.iconCircle, { backgroundColor: `${getActionColor()}20` }]}
          >
            <Ionicons name={getIcon()} size={32} color={getActionColor()} />
          </View>
          <Text style={styles.title}>
            Quelle quantité ?
          </Text>
          <Text style={styles.subtitle}>
            {itemName} • {maxQuantity} disponible{maxQuantity > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Quantity selector */}
        <View style={styles.selectorSection}>
          <View style={styles.selectorRow}>
            {/* Decrement button */}
            <PressableScale
              onPress={decrementQuantity}
              disabled={currentQty <= 1}
              style={[
                styles.stepButton,
                currentQty <= 1 ? styles.stepButtonDisabled : styles.stepButtonEnabled,
              ]}
              hapticType="light"
            >
              <Ionicons
                name="remove"
                size={28}
                color={currentQty <= 1 ? COLORS.neutral.grayDisabled : COLORS.primary[500]}
              />
            </PressableScale>

            {/* Quantity input */}
            <View style={styles.inputContainer}>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                style={styles.quantityInput}
                maxLength={3}
              />
            </View>

            {/* Increment button */}
            <PressableScale
              onPress={incrementQuantity}
              disabled={currentQty >= maxQuantity}
              style={[
                styles.stepButton,
                currentQty >= maxQuantity ? styles.stepButtonDisabled : styles.stepButtonEnabled,
              ]}
              hapticType="light"
            >
              <Ionicons
                name="add"
                size={28}
                color={currentQty >= maxQuantity ? COLORS.neutral.grayDisabled : COLORS.primary[500]}
              />
            </PressableScale>
          </View>

          {/* "Tout" button */}
          {maxQuantity > 1 && (
            <PressableScale
              onPress={setAllQuantity}
              style={styles.allButton}
              hapticType="light"
            >
              <Text style={styles.allButtonText}>
                Tout ({maxQuantity})
              </Text>
            </PressableScale>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Bouton Valider */}
          <PressableScale
            onPress={handleConfirm}
            disabled={!isValid}
            style={[
              styles.confirmButton,
              { backgroundColor: isValid ? getActionColor() : COLORS.neutral.gray300 },
            ]}
            hapticType="medium"
          >
            <Ionicons
              name={getIcon()}
              size={20}
              color={COLORS.neutral.white}
            />
            <Text style={styles.confirmButtonText}>
              {currentQty === maxQuantity
                ? `Tout marquer comme ${getActionLabel()}`
                : `Marquer ${currentQty} comme ${getActionLabel()}`}
            </Text>
          </PressableScale>

          {/* Bouton Annuler */}
          <PressableScale
            onPress={onClose}
            style={styles.cancelButton}
            hapticType="light"
          >
            <Text style={styles.cancelButtonText}>
              Annuler
            </Text>
          </PressableScale>
        </View>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondary.cream,
    borderRadius: RADIUS['3xl'],
    overflow: 'hidden',
    marginHorizontal: SPACING['2xl'],
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING['2xl'],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary[500],
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  selectorSection: {
    paddingHorizontal: SPACING['2xl'],
    paddingBottom: SPACING.lg,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: RADIUS['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    backgroundColor: COLORS.neutral.gray200,
  },
  stepButtonEnabled: {
    backgroundColor: COLORS.secondary.sage,
  },
  inputContainer: {
    alignItems: 'center',
  },
  quantityInput: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.primary[500],
    textAlign: 'center',
    width: 80,
  },
  allButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.3),
    alignSelf: 'center',
  },
  allButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary[500],
  },
  actions: {
    paddingHorizontal: SPACING['2xl'],
    paddingBottom: SPACING['2xl'],
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  confirmButton: {
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
    marginLeft: SPACING.sm,
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
});
