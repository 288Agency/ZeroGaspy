import {
  estimateUnitPrice,
  resolveItemLineValue,
  DEFAULT_ESTIMATED_UNIT_PRICE,
} from '../../services/priceEstimateService';

describe('priceEstimateService', () => {
  describe('estimateUnitPrice', () => {
    it('mappe les IDs AddFood anglais', () => {
      expect(estimateUnitPrice('dairy')).toBe(2);
      expect(estimateUnitPrice('vegetables')).toBe(1.5);
      expect(estimateUnitPrice('meat')).toBe(8);
      expect(estimateUnitPrice('bakery')).toBe(1.5);
      expect(estimateUnitPrice('other')).toBe(3);
    });

    it('mappe les labels français OCR', () => {
      expect(estimateUnitPrice('légumes')).toBe(1.5);
      expect(estimateUnitPrice('produits laitiers')).toBe(2);
      expect(estimateUnitPrice('viande')).toBe(8);
    });

    it('fallback défaut si catégorie inconnue', () => {
      expect(estimateUnitPrice('xyz')).toBe(DEFAULT_ESTIMATED_UNIT_PRICE);
      expect(estimateUnitPrice(undefined)).toBe(DEFAULT_ESTIMATED_UNIT_PRICE);
    });
  });

  describe('resolveItemLineValue', () => {
    it('utilise le prix saisi comme total de ligne', () => {
      expect(resolveItemLineValue({ price: 4.5, quantity: 3, category: 'meat' })).toBe(4.5);
    });

    it('estime unitaire × quantité si pas de prix', () => {
      expect(resolveItemLineValue({ category: 'dairy', quantity: 2 })).toBe(4);
    });
  });
});
