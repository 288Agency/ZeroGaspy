// ============================================================================
// ZeroGaspy Design System · ProductCard (handoff port)
// ============================================================================
// Card produit. UNE structure, état visuel dérivé de l'expiration.
//
// État (auto-calculé depuis daysUntilExpiration, ou forcé via `state`) :
//   · 'expired'   < 0 j   → bordure danger, nom barré, opacité 0.7
//   · 'urgent'    0–1 j   → bordure urgent-border, fond gradient urgent-bg→surface
//   · 'warning'   2–3 j   → bordure warn-border,   fond gradient warn-bg→surface
//   · 'fresh'     > 3 j   → bordure default, surface neutre
//
// Actions inline ✓/🗑 (handoff §5) :
//   Quand `onConsume` ou `onTrash` sont fournis, affichées sur la DROITE du
//   card en tant que carrés 38×38 (hit target HIG). ✓ = pill accent plein,
//   🗑 = surface élevée + glyph rouge. Visibles sur TOUS les états — pas
//   uniquement urgent (contrairement au design précédent).
//
// Signature de props identique à la version précédente — pas de breaking
// change pour les callers existants.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import Badge from './Badge';

export type ProductState = 'fresh' | 'warning' | 'urgent' | 'expired';

export interface ProductCardProps {
  name: string;
  /** Source RN Image (uri ou require) */
  image?: ImageSourcePropType;
  /** Jours avant péremption — négatif si périmé */
  daysUntilExpiration?: number;
  /** Force le state (ignore daysUntilExpiration) */
  state?: ProductState;
  /** Meta secondaire — quantité, marque, etc. */
  quantity?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Si fourni, affiche un bouton inline ✓ "Consommé" à droite */
  onConsume?: () => void;
  /** Si fourni, affiche un bouton inline 🗑 "Jeter" à droite */
  onTrash?: () => void;
  testID?: string;
}

function computeState(days?: number): ProductState {
  if (days == null) return 'fresh';
  if (days < 0) return 'expired';
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'warning';
  return 'fresh';
}

function formatExpirationLabel(days: number | undefined): string {
  if (days == null) return 'Frais';
  if (days < 0) return `Périmé · ${Math.abs(days)}j`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days <= 7) return `Dans ${days}j`;
  if (days <= 90) return `${days}j`;
  return `${Math.round(days / 30)} mois`;
}

export default function ProductCard({
  name,
  image,
  daysUntilExpiration,
  state: stateProp,
  quantity,
  onPress,
  onLongPress,
  onConsume,
  onTrash,
  testID,
}: ProductCardProps) {
  const { colors, typography, componentRadius, elevation, space, layout } = useTheme();
  const state = stateProp ?? computeState(daysUntilExpiration);

  const tone = useMemo(() => {
    if (state === 'expired' || state === 'urgent') return colors.feedback.danger;
    if (state === 'warning') return colors.feedback.warning;
    return null;
  }, [state, colors]);

  const isTinted = state === 'urgent' || state === 'warning';
  const borderColor = tone ? tone.border : colors.border.default;

  const badgeTone = state === 'fresh' ? 'success' : state === 'warning' ? 'warning' : 'danger';
  const badgeVariant = state === 'urgent' && (daysUntilExpiration ?? 1) <= 0 ? 'solid' : 'soft';

  const hasActions = Boolean(onConsume || onTrash);

  // Fond gradient teinté (urgent / warning) — fade horizontal vers la surface
  // pour que la zone des actions reste lisible.
  const gradientColors = isTinted && tone
    ? ([tone.bg, colors.bg.surface] as [string, string])
    : null;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      onLongPress={onLongPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.bg.surface,
          borderColor,
          borderRadius: componentRadius.card,
          borderWidth: 1,
          padding: space[3], // 12 (handoff pcard padding)
          opacity: state === 'expired' ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...elevation[2],
        },
      ]}
    >
      {/* Gradient teinté pour urgent/warning — overlay sous le contenu */}
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.65, y: 0.5 }}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: componentRadius.card }]}
          pointerEvents="none"
        />
      )}

      <View style={styles.row}>
        {/* Image / icône catégorie */}
        <View
          style={[
            styles.image,
            {
              backgroundColor: isTinted ? 'rgba(255,255,255,0.5)' : colors.bg.sunken,
              borderRadius: componentRadius.productImg,
            },
          ]}
        >
          {image ? (
            <Image source={image} style={styles.imageInner} resizeMode="cover" />
          ) : (
            <SymbolView name="cube.box" size={22} tintColor={colors.fg.tertiary} />
          )}
        </View>

        {/* Body — name + meta row */}
        <View style={[styles.body, { marginLeft: space[3] }]}>
          <Text
            style={[
              typography.cardTitle,
              {
                color: colors.fg.primary,
                textDecorationLine: state === 'expired' ? 'line-through' : 'none',
                marginBottom: space[1],
              },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>

          <View style={styles.metaRow}>
            <Badge
              tone={badgeTone}
              variant={badgeVariant}
              dot={state !== 'fresh'}
              strikethrough={state === 'expired'}
            >
              {formatExpirationLabel(daysUntilExpiration)}
            </Badge>
            {quantity && (
              <>
                <View style={[styles.metaDot, { backgroundColor: colors.fg.muted }]} />
                <Text
                  style={[typography.footnote, { color: colors.fg.secondary }]}
                  numberOfLines={1}
                >
                  {quantity}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Actions inline 38×38 — sur la droite, visibles dès qu'un handler est fourni */}
        {hasActions ? (
          <View style={[styles.actions, { marginLeft: space[2] }]}>
            {onConsume && (
              <ActionButton
                icon="checkmark"
                variant="consume"
                label="Consommé"
                onPress={onConsume}
              />
            )}
            {onTrash && (
              <ActionButton
                icon="trash"
                variant="trash"
                label="Jeter"
                onPress={onTrash}
              />
            )}
          </View>
        ) : (
          <SymbolView
            name="chevron.right"
            size={14}
            tintColor={colors.fg.muted}
            style={{ marginLeft: space[2] }}
          />
        )}
      </View>
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ActionButton — bouton carré 38×38 inline (handoff §5 : hit target 38px min)
// ────────────────────────────────────────────────────────────────────────────

function ActionButton({
  icon,
  variant,
  label,
  onPress,
}: {
  icon: 'checkmark' | 'trash';
  variant: 'consume' | 'trash';
  label: string;
  onPress: () => void;
}) {
  const { colors, componentRadius, layout } = useTheme();

  const isConsume = variant === 'consume';
  const bg = isConsume ? colors.accent.default : colors.bg.elevated;
  const fg = isConsume ? colors.fg.onAccent : colors.feedback.danger.solid;
  const border = isConsume ? colors.accent.default : colors.border.default;

  return (
    <Pressable
      onPress={() => {
        // Pressable enfant : RN ne propage pas onPress au parent, pas besoin de stop
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.action,
        {
          width: layout.quickAction,
          height: layout.quickAction,
          backgroundColor: bg,
          borderColor: border,
          borderRadius: componentRadius.productImg, // 10 — match image
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <SymbolView
        name={icon === 'checkmark' ? 'checkmark' : 'trash'}
        size={18}
        tintColor={fg}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  imageInner: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
