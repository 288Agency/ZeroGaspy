// ============================================
// EMOJI
// Rend un caractère emoji sous forme d'illustration Fluent Emoji 3D
// quand l'asset est bundlé, sinon retombe sur le glyphe système.
// Utilisé pour les emojis de recettes (Recipe.imageEmoji), choisis par
// l'utilisateur ou générés par l'IA — donc pas garantis dans notre set.
// ============================================

import React from 'react';
import { Image, ImageStyle, StyleProp, Text, TextStyle } from 'react-native';

import { getEmojiImage } from '../services/foodEmojiService';

export interface EmojiProps {
  /** Caractère emoji — « 🍝 », « 🥗 »… */
  glyph?: string;
  /** Côté de l'illustration (et fontSize du repli texte), en points */
  size: number;
  style?: StyleProp<ImageStyle>;
  /** Style appliqué uniquement au repli texte */
  textStyle?: StyleProp<TextStyle>;
}

export default function Emoji({ glyph, size, style, textStyle }: EmojiProps) {
  const source = getEmojiImage(glyph);

  if (!source) {
    return <Text style={[{ fontSize: size }, textStyle]}>{glyph}</Text>;
  }

  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
