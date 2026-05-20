// ============================================================================
// ZeroGaspy Design System · ProductCard
// ============================================================================
// Card produit (frigo). UNE structure, état visuel dérivé de l'expiration.
//
// État (auto-calculé depuis daysUntilExpiration, ou forcé via `state`) :
//   · 'expired'   < 0 j   → bordure danger, pattern hachuré, nom barré
//   · 'urgent'    0–1 j   → bordure danger, halo soft danger
//   · 'warning'   2–3 j   → bordure warning, halo soft warning
//   · 'fresh'     > 3 j   → bordure default, neutre
//
// Quick actions hybrides (pattern "chips on urgent only") :
//   Quand `onConsume` ou `onTrash` sont fournis ET state ∈ {urgent, expired},
//   la card affiche 2 chips inline sous la meta row. Sinon = card propre.
//   Sur fresh/warning, on garde le swipe comme seul moyen d'action (via
//   SwipeableProductCard) — découvrabilité sacrifiée pour la densité visuelle.
//
// Usage :
//   <ProductCard
//     name="Yaourt nature Danone"
//     daysUntilExpiration={0}
//     quantity="4 pots"
//     onPress={...}
//     onConsume={...}        // ← chip Consommé sur urgent/expired
//     onTrash={...}          // ← chip Jeter sur urgent/expired
//   />
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet, Pressable } from 'react-native';
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
  /** Si fourni ET state ∈ {urgent, expired}, affiche un chip "Consommé" inline */
  onConsume?: () => void;
  /** Si fourni ET state ∈ {urgent, expired}, affiche un chip "Jeter" inline */
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
  if (days <= 7) return `Dans ${days} jours`;
  return `Frais · ${days}j`;
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
  const { colors, typography, componentRadius, elevation, space } = useTheme();
  const state = stateProp ?? computeState(daysUntilExpiration);

  const tone = useMemo(() => {
    if (state === 'expired' || state === 'urgent') return colors.feedback.danger;
    if (state === 'warning') return colors.feedback.warning;
    return null;
  }, [state, colors]);

  const isHighlight = state === 'urgent' || state === 'expired' || state === 'warning';
  const borderColor = tone ? tone.border : colors.border.default;
  const haloColor = tone ? tone.bg : 'transparent';

  const badgeTone = state === 'fresh' ? 'success' : state === 'warning' ? 'warning' : 'danger';
  const badgeVariant = state === 'urgent' ? 'solid' : 'soft';

  // Quick actions chips — only on urgent/expired AND when handler(s) provided
  const showChips =
    (state === 'urgent' || state === 'expired') && Boolean(onConsume || onTrash);

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
          borderWidth: isHighlight ? 1.5 : 1,
          padding: space[3],
          opacity: state === 'expired' ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...elevation[2],
        },
      ]}
    >
      {/* Halo gauche subtil pour les états critiques */}
      {isHighlight && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: componentRadius.card,
              backgroundColor: haloColor,
              opacity: 0.4,
            },
          ]}
        />
      )}

      {/* Pattern hachuré pour expired (overlay) */}
      {state === 'expired' && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: componentRadius.card, backgroundColor: colors.bg.surface, opacity: 0.5 },
          ]}
        />
      )}

      <View style={styles.row}>
        {/* Image */}
        <View
          style={[
            styles.image,
            {
              backgroundColor: colors.bg.sunken,
              borderRadius: componentRadius.productImg,
            },
          ]}
        >
          {image ? (
            <Image source={image} style={styles.imageInner} resizeMode="cover" />
          ) : (
            <SymbolView name="cube.box" size={24} tintColor={colors.fg.muted} />
          )}
        </View>

        {/* Body */}
        <View style={[styles.body, { marginLeft: space[3] }]}>
          <Text
            style={[
              typography.title3,
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
                <Text style={[typography.footnote, { color: colors.fg.tertiary }]}>
                  {quantity}
                </Text>
              </>
            )}
          </View>
        </View>

        <SymbolView
          name="chevron.right"
          size={14}
          tintColor={colors.fg.muted}
          style={{ marginLeft: space[2] }}
        />
      </View>

      {/* Quick actions — visibles uniquement sur urgent/expired */}
      {showChips && (
        <View style={[styles.chipsRow, { marginTop: space[3], gap: space[2] }]}>
          {onConsume && (
            <QuickChip
              icon="checkmark.circle.fill"
              label="Consommé"
              tone="success"
              onPress={onConsume}
            />
          )}
          {onTrash && (
            <QuickChip
              icon="trash.fill"
              label="Jeter"
              tone="danger"
              onPress={onTrash}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// QuickChip — utilisé uniquement par ProductCard, pas exporté
// ────────────────────────────────────────────────────────────────────────────

function QuickChip({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: any;
  label: string;
  tone: 'success' | 'danger';
  onPress: () => void;
}) {
  const { colors, typography, componentRadius } = useTheme();
  const t = tone === 'success' ? colors.feedback.success : colors.feedback.danger;

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: pressed ? t.border : t.bg,
          borderColor: t.border,
          borderRadius: componentRadius.badge,
        },
      ]}
    >
      <SymbolView name={icon} type="hierarchical" size={14} tintColor={t.fg} />
      <Text
        style={[
          typography.footnote,
          {
            color: t.fg,
            fontWeight: '600',
            marginLeft: 6,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    gap: 8,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    paddingLeft: 56 + 12, // align under body (image width + gap)
  },
  chip: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
