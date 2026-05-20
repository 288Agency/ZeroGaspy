// ============================================================================
// ZeroGaspy Design System · PaywallSheet
// ============================================================================
// Bottom sheet paywall CONTEXTUEL — déclenchée par un feature gate, pas en
// fin d'onboarding. Pattern conçu pour réparer le 100% dismiss du paywall
// modal actuel.
//
// Principes :
//   · Proof point CHIFFRÉ en tête (ce que l'user a déjà gagné, calculé local)
//   · 1 plan recommandé visible direct (annuel = best value)
//   · Toggle annuel/mensuel — annuel sélectionné par défaut + badge "Économise"
//   · 3 benefits MAX, concrets (pas "premium experience")
//   · Dismissable (grabber + swipe). Pas de manipulative "Continue free trial".
//   · Pas de gradient. Pas de gros emoji.
//
// Usage :
//   <PaywallSheet
//     visible={open}
//     onClose={() => setOpen(false)}
//     trigger="scanLimit"                // contexte = quel gate a été atteint
//     savedThisMonthEUR={18}             // proof point local
//     onSubscribe={(plan) => purchases.purchasePackage(plan)}
//   />
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';
import BottomSheet from './BottomSheet';
import Button from './Button';

type Plan = 'annual' | 'monthly';

export type PaywallTrigger =
  | 'scanLimit'         // a atteint la limite de scans gratuits
  | 'addList'           // veut créer un 3e espace
  | 'mealPlanner'       // ouvre meal planner
  | 'share'             // veut partager une liste
  | 'recipes';          // veut une recette IA

const TRIGGER_COPY: Record<PaywallTrigger, { hook: string }> = {
  scanLimit: { hook: 'Continue à scanner sans limite' },
  addList:   { hook: 'Ajoute autant d\'espaces que tu veux' },
  mealPlanner: { hook: 'Planifie tes repas de la semaine' },
  share:     { hook: 'Partage ton frigo avec ton foyer' },
  recipes:   { hook: 'Recettes IA depuis ton frigo' },
};

export interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  trigger: PaywallTrigger;
  /** Calculé localement depuis les items consommés à temps × prix moyens */
  savedThisMonthEUR?: number;
  /** Reçoit le plan choisi ; tu branches sur RevenueCat / Apple */
  onSubscribe: (plan: Plan) => void | Promise<void>;
  onRestore?: () => void;
  /** Override des prix (par défaut : place-holders à brancher sur RC) */
  annualPriceLabel?: string;
  monthlyPriceLabel?: string;
  /** "/mois équivalent" si annuel */
  annualMonthlyLabel?: string;
}

export default function PaywallSheet({
  visible,
  onClose,
  trigger,
  savedThisMonthEUR,
  onSubscribe,
  onRestore,
  annualPriceLabel = '39,99 €/an',
  monthlyPriceLabel = '4,99 €/mois',
  annualMonthlyLabel = '3,33 €/mois',
}: PaywallSheetProps) {
  const { colors, typography, space, radius, componentRadius } = useTheme();
  const [plan, setPlan] = useState<Plan>('annual');
  const [submitting, setSubmitting] = useState(false);

  const benefits: Array<{ icon: any; label: string }> = [
    { icon: 'barcode.viewfinder', label: 'Scans illimités · code-barres et dates' },
    { icon: 'person.2.fill',      label: 'Partage avec toute la famille' },
    { icon: 'wand.and.stars',     label: 'Recettes IA depuis ton frigo' },
  ];

  const handleSubscribe = async () => {
    try {
      setSubmitting(true);
      await onSubscribe(plan);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissable>
      {/* Proof point */}
      {savedThisMonthEUR != null && savedThisMonthEUR > 0 && (
        <View
          style={[
            styles.proof,
            {
              backgroundColor: colors.accent.soft,
              borderColor: colors.accent.border,
              borderRadius: radius.md,
              padding: space[3],
              marginBottom: space[4],
            },
          ]}
        >
          <SymbolView name="leaf.fill" size={16} tintColor={colors.accent.softFg} />
          <Text
            style={[
              typography.footnote,
              { color: colors.accent.softFg, marginLeft: space[2], flex: 1 },
            ]}
          >
            Tu as déjà sauvé <Text style={typography.bodyEmphasis}>≈ {savedThisMonthEUR} €</Text> ce mois-ci.
          </Text>
        </View>
      )}

      {/* Hook */}
      <Text style={[typography.title1, { color: colors.fg.primary, marginBottom: space[2] }]}>
        {TRIGGER_COPY[trigger].hook}
      </Text>
      <Text style={[typography.body, { color: colors.fg.secondary, marginBottom: space[5] }]}>
        Premium · annule à tout moment, sans engagement.
      </Text>

      {/* Benefits */}
      <View style={{ marginBottom: space[5], gap: space[3] }}>
        {benefits.map((b) => (
          <View key={b.label} style={styles.benefit}>
            <View
              style={[
                styles.benefitIcon,
                { backgroundColor: colors.accent.soft, borderRadius: radius.sm },
              ]}
            >
              <SymbolView name={b.icon} size={16} tintColor={colors.accent.softFg} />
            </View>
            <Text style={[typography.body, { color: colors.fg.primary, flex: 1 }]}>
              {b.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Plan toggle */}
      <View style={{ gap: space[2], marginBottom: space[5] }}>
        <PlanRow
          selected={plan === 'annual'}
          onPress={() => setPlan('annual')}
          title="Annuel"
          price={annualPriceLabel}
          sub={annualMonthlyLabel}
          recommended
        />
        <PlanRow
          selected={plan === 'monthly'}
          onPress={() => setPlan('monthly')}
          title="Mensuel"
          price={monthlyPriceLabel}
        />
      </View>

      {/* CTA */}
      <Button variant="primary" size="lg" onPress={handleSubscribe} loading={submitting}>
        Continuer avec Premium
      </Button>

      {/* Restore */}
      <View style={{ alignItems: 'center', marginTop: space[3] }}>
        <Pressable onPress={onRestore} hitSlop={8}>
          <Text style={[typography.footnote, { color: colors.fg.tertiary, textDecorationLine: 'underline' }]}>
            Restaurer un achat
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PlanRow — interne
// ────────────────────────────────────────────────────────────────────────────

function PlanRow({
  selected,
  onPress,
  title,
  price,
  sub,
  recommended,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  sub?: string;
  recommended?: boolean;
}) {
  const { colors, typography, space, radius, componentRadius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.planRow,
        {
          borderColor: selected ? colors.accent.default : colors.border.default,
          borderWidth: selected ? 2 : 1,
          borderRadius: radius.md,
          backgroundColor: pressed ? colors.bg.sunken : colors.bg.surface,
          padding: space[4] - (selected ? 1 : 0),
        },
      ]}
    >
      {/* Radio */}
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? colors.accent.default : colors.border.strong,
            borderWidth: 2,
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.radioInner,
              { backgroundColor: colors.accent.default },
            ]}
          />
        )}
      </View>

      {/* Body */}
      <View style={{ flex: 1, marginLeft: space[3] }}>
        <View style={styles.titleRow}>
          <Text style={[typography.bodyEmphasis, { color: colors.fg.primary }]}>{title}</Text>
          {recommended && (
            <View
              style={[
                styles.savePill,
                {
                  backgroundColor: colors.accent.soft,
                  borderRadius: componentRadius.badge,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.accent.softFg }]}>Économise 33%</Text>
            </View>
          )}
        </View>
        {sub && (
          <Text style={[typography.footnote, { color: colors.fg.tertiary, marginTop: 2 }]}>
            {sub}
          </Text>
        )}
      </View>

      {/* Price */}
      <Text style={[typography.bodyEmphasis, { color: colors.fg.primary }]}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  proof: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
