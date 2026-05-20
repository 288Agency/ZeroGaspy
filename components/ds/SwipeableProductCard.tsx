// ============================================================================
// ZeroGaspy Design System · SwipeableProductCard
// ============================================================================
// Wrap d'une ProductCard avec swipe actions iOS-native, COMBINÉ au pattern
// "chips on urgent only" (la card affiche déjà 2 chips inline quand l'état
// est urgent/expired — voir ProductCard.tsx pour la logique).
//
// Gestures :
//   👉 Swipe droite (geste positif, vers le ✓) → "Consommé" instant + toast undo
//   👈 Swipe gauche (vers la corbeille)        → AlertModal confirm "Jeter ?"
//   Tap                                        → ouvre détail (passé via onPress)
//   Chips inline (urgent/expired uniquement)   → mêmes handlers que swipe
//
// Pourquoi cette asymétrie ?
//   · Consommé = action heureuse + récupérable via undo → exécution instant
//     (pattern Apple Mail "Archive" — pas de confirm)
//   · Jeter = destructif, log permanent (Stats), volontaire → toujours confirm
//
// Usage :
//   <SwipeableProductCard
//     name="Yaourt nature Danone"
//     daysUntilExpiration={0}
//     quantity="4 pots"
//     onPress={() => nav.navigate('ProductDetail', ...)}
//     onConsume={() => markConsumed(item.id)}
//     onTrash={() => markThrown(item.id)}
//     onUndoConsume={() => restoreItem(item.id, 'active')}
//     onUndoTrash={() => restoreItem(item.id, 'active')}
//   />
// ============================================================================

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import ProductCard, { ProductCardProps } from './ProductCard';
import AlertModal from './Modal';
import { useToast } from './Toast';

export interface SwipeableProductCardProps extends ProductCardProps {
  /** Marquer consommé — appelé immédiatement au swipe droit complet */
  onConsume: () => void | Promise<void>;
  /** Marquer jeté — appelé après confirmation AlertModal */
  onTrash: () => void | Promise<void>;
  /** Restaurer l'item (depuis le toast undo après consume) */
  onUndoConsume?: () => void | Promise<void>;
  /** Restaurer l'item (depuis le toast undo après trash) */
  onUndoTrash?: () => void | Promise<void>;
  /** Désactive les swipe (utile en mode edit / multi-select) */
  swipeDisabled?: boolean;
}

export default function SwipeableProductCard({
  onConsume,
  onTrash,
  onUndoConsume,
  onUndoTrash,
  swipeDisabled = false,
  ...productProps
}: SwipeableProductCardProps) {
  const { colors, typography, componentRadius, space } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const { show } = useToast();

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConsume = async () => {
    swipeRef.current?.close();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await onConsume();
    show({
      message: `${productProps.name} consommé`,
      tone: 'success',
      action: onUndoConsume ? { label: 'Annuler', onPress: onUndoConsume } : undefined,
    });
  };

  const askTrash = () => {
    swipeRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTrashOpen(true);
  };

  const confirmTrash = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    await onTrash();
    setTrashOpen(false);
    show({
      message: `${productProps.name} jeté`,
      tone: 'danger',
      action: onUndoTrash ? { label: 'Annuler', onPress: onUndoTrash } : undefined,
    });
  };

  // ── Action backgrounds ──────────────────────────────────────────────────

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0.5, 1, 1],
      extrapolate: 'clamp',
    });
    return (
      <View
        style={[
          styles.actionPane,
          styles.actionRight,
          {
            backgroundColor: colors.accent.default,
            borderRadius: componentRadius.card,
          },
        ]}
      >
        <Animated.View style={[styles.actionInner, { transform: [{ scale }] }]}>
          <SymbolView name="checkmark.circle.fill" type="hierarchical" size={24} tintColor={colors.fg.onAccent} />
          <Text
            style={[
              typography.caption,
              {
                color: colors.fg.onAccent,
                marginTop: 4,
                textTransform: 'none',
                letterSpacing: 0,
                fontWeight: '600',
              },
            ]}
          >
            Consommé
          </Text>
        </Animated.View>
      </View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0.5, 1, 1],
      extrapolate: 'clamp',
    });
    return (
      <View
        style={[
          styles.actionPane,
          styles.actionLeft,
          {
            backgroundColor: colors.feedback.danger.solid,
            borderRadius: componentRadius.card,
          },
        ]}
      >
        <Animated.View style={[styles.actionInner, { transform: [{ scale }] }]}>
          <SymbolView name="trash.fill" type="hierarchical" size={24} tintColor="#FFFFFF" />
          <Text
            style={[
              typography.caption,
              {
                color: '#FFFFFF',
                marginTop: 4,
                textTransform: 'none',
                letterSpacing: 0,
                fontWeight: '600',
              },
            ]}
          >
            Jeter
          </Text>
        </Animated.View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (swipeDisabled) {
    return <ProductCard {...productProps} />;
  }

  return (
    <>
      <Swipeable
        ref={swipeRef}
        friction={2}
        rightThreshold={80}
        leftThreshold={80}
        overshootLeft={false}
        overshootRight={false}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableWillOpen={(direction) => {
          if (direction === 'right') handleConsume();
          else if (direction === 'left') askTrash();
        }}
      >
        <ProductCard
          {...productProps}
          onConsume={handleConsume}
          onTrash={askTrash}
        />
      </Swipeable>

      <AlertModal
        visible={trashOpen}
        onClose={() => setTrashOpen(false)}
        icon="trash"
        tone="danger"
        title="Jeter cet aliment ?"
        message={`${productProps.name} sera marqué comme jeté. Tu pourras consulter tes pertes dans Stats.`}
        primaryLabel="Jeter"
        onPrimary={confirmTrash}
        secondaryLabel="Annuler"
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionPane: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRight: {
    // Right action s'affiche à droite du card → on aligne sur la droite visuellement
  },
  actionLeft: {
    // Left action s'affiche à gauche
  },
  actionInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
