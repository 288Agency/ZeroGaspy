/**
 * Estimation de prix par catégorie + résolution de la valeur d'une ligne.
 *
 * Règle quantité :
 * - `item.price` stocké = total de la ligne (ticket, saisie manuelle, split
 *   consommé partiel) → on l'utilise tel quel.
 * - Estimation → prix unitaire × quantité.
 *
 * Les IDs AddFood sont en anglais (`dairy`, `vegetables`…) ; les tickets OCR
 * et anciennes données utilisent souvent le français (`légumes`, `viande`…).
 */

export const DEFAULT_ESTIMATED_UNIT_PRICE = 3;

/** Prix unitaire moyen (€) — clés normalisées en minuscules. */
const ESTIMATED_UNIT_PRICES: Record<string, number> = {
  // AddFood (anglais)
  dairy: 2.0,
  vegetables: 1.5,
  fruits: 2.5,
  meat: 8.0,
  bakery: 1.5,
  other: 3.0,

  // OCR / legacy (français)
  légumes: 1.5,
  legume: 1.5,
  legumes: 1.5,
  viande: 8.0,
  poisson: 9.0,
  'produits laitiers': 2.0,
  laitiers: 2.0,
  fromage: 3.5,
  boulangerie: 1.5,
  boissons: 1.5,
  surgelés: 3.0,
  surgeles: 3.0,
  épicerie: 2.5,
  epicerie: 2.5,
  condiments: 2.0,
  snacks: 2.0,
  'plats préparés': 4.0,
  'plats prepares': 4.0,
  autres: 3.0,
};

export type PricedItem = {
  price?: number | null;
  category?: string | null;
  quantity?: number | null;
};

/** Prix unitaire estimé pour une catégorie (jamais 0). */
export function estimateUnitPrice(category?: string | null): number {
  if (!category) return DEFAULT_ESTIMATED_UNIT_PRICE;
  const key = category.toLowerCase().trim();
  return ESTIMATED_UNIT_PRICES[key] ?? DEFAULT_ESTIMATED_UNIT_PRICE;
}

/**
 * Valeur monétaire d'une ligne inventaire (€).
 * Prix saisi = total ligne ; sinon estimation unitaire × qty.
 */
export function resolveItemLineValue(item: PricedItem): number {
  const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
  if (item.price != null && item.price > 0) {
    return item.price;
  }
  return estimateUnitPrice(item.category) * qty;
}
