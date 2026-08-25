// ============================================
// FOOD EMOJI
// Illustration Fluent Emoji 3D d'un aliment.
// Résout le visuel depuis le nom (et la catégorie en repli) — voir
// services/foodEmojiService.ts pour la table de correspondance.
// ============================================

import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

import { getFoodEmoji } from '../services/foodEmojiService';

export interface FoodEmojiProps {
  /** Nom de l'aliment saisi par l'utilisateur — « Pommes Golden », « saumon fumé »… */
  name?: string;
  /** Catégorie, utilisée si le nom ne matche aucun mot-clé */
  category?: string;
  /** Côté de l'illustration, en points */
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function FoodEmoji({ name, category, size = 32, style }: FoodEmojiProps) {
  return (
    <Image
      source={getFoodEmoji(name, category)}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
