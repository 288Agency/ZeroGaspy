// ============================================================================
// ZeroGaspy · components/Gaspie.tsx
// ============================================================================
// Gaspie, la mascotte ZeroGaspy. Un rendu 3D par état émotionnel.
//
// Les PNG sont détourés (fond transparent) et bornés à 700 px de haut, donc
// affichables sur n'importe quel fond de la palette sans liseré.
//
// Ajouter une pose : déposer le PNG détouré dans `assets/mascot/`, puis
// l'enregistrer dans POSES ci-dessous.
// ============================================================================

import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export type GaspiePose = 'emptyFridge' | 'expired';

const POSES: Record<GaspiePose, ReturnType<typeof require>> = {
  // Gaspie devant un frigo vide, main au menton — inventaire/liste sans produit
  emptyFridge: require('../assets/mascot/gaspie-empty-fridge.png'),
  // Gaspie tenant une tomate moisie, bulle ⚠️ — produit périmé / alerte date
  expired: require('../assets/mascot/gaspie-expired.png'),
};

interface GaspieProps {
  pose: GaspiePose;
  /** Hauteur de rendu en points. La largeur suit le ratio natif. */
  size?: number;
  style?: StyleProp<ImageStyle>;
  /** Texte lu par les lecteurs d'écran. `null` pour la marquer décorative. */
  accessibilityLabel?: string | null;
}

export default function Gaspie({
  pose,
  size = 160,
  style,
  accessibilityLabel = null,
}: GaspieProps) {
  return (
    <Image
      source={POSES[pose]}
      style={[{ height: size, width: size }, style]}
      resizeMode="contain"
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel ?? undefined}
      accessibilityRole={accessibilityLabel != null ? 'image' : undefined}
      importantForAccessibility={accessibilityLabel == null ? 'no' : 'auto'}
    />
  );
}
