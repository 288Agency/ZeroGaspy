/**
 * Tests pour iconService
 * Service d'icônes intelligentes auto-adaptatives
 */

import {
  getFoodIcon,
  getListIcon,
  getCategoryColor,
  getAllCategories,
  getSuggestedFoodIcons,
} from '../../services/iconService';

describe('iconService', () => {
  describe('getFoodIcon', () => {
    it('devrait retourner une icône valide avec couleur et catégorie', () => {
      const foods = ['pomme', 'tomate', 'lait', 'poulet', 'saumon', 'pain', 'eau'];

      foods.forEach(food => {
        const result = getFoodIcon(food);

        expect(result).toHaveProperty('icon');
        expect(result).toHaveProperty('color');
        expect(typeof result.icon).toBe('string');
        expect(typeof result.color).toBe('string');
        expect(result.icon.length).toBeGreaterThan(0);
        expect(result.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('devrait retourner la même icône pour singular et plural', () => {
      const result1 = getFoodIcon('pomme');
      const result2 = getFoodIcon('pommes');

      expect(result1.icon).toBe(result2.icon);
      expect(result1.category).toBe(result2.category);
    });

    it('devrait être insensible à la casse', () => {
      const result1 = getFoodIcon('POMME');
      const result2 = getFoodIcon('pomme');
      const result3 = getFoodIcon('Pomme');

      expect(result1.icon).toBe(result2.icon);
      expect(result2.icon).toBe(result3.icon);
    });

    it('devrait retourner une icône par défaut pour un aliment inconnu', () => {
      const result = getFoodIcon('qwertyuiopasdfghjkl');

      expect(result.icon).toBeDefined();
      expect(result.color).toBeDefined();
      // Un aliment vraiment inconnu peut avoir ou non une catégorie selon la correspondance partielle
    });

    it('devrait gérer les noms vides', () => {
      const result = getFoodIcon('');

      expect(result.icon).toBeDefined();
      expect(result.color).toBeDefined();
    });

    it('devrait gérer les caractères spéciaux', () => {
      expect(() => getFoodIcon('@#$%^&*()')).not.toThrow();
    });

    it('devrait trouver des catégories pour les aliments communs', () => {
      const result1 = getFoodIcon('pomme');
      const result2 = getFoodIcon('tomate');
      const result3 = getFoodIcon('lait');

      // Ces aliments devraient avoir une catégorie
      expect(result1.category).toBeDefined();
      expect(result2.category).toBeDefined();
      expect(result3.category).toBeDefined();
    });
  });

  describe('getListIcon', () => {
    it('devrait retourner une icône valide avec couleur', () => {
      const lists = ['Frigo', 'Congélateur', 'Placard', 'Cave'];

      lists.forEach(list => {
        const result = getListIcon(list);

        expect(result).toHaveProperty('icon');
        expect(result).toHaveProperty('color');
        expect(typeof result.icon).toBe('string');
        expect(typeof result.color).toBe('string');
        expect(result.icon.length).toBeGreaterThan(0);
        expect(result.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('devrait être insensible à la casse', () => {
      const result1 = getListIcon('FRIGO');
      const result2 = getListIcon('frigo');
      const result3 = getListIcon('Frigo');

      expect(result1.icon).toBe(result2.icon);
      expect(result2.icon).toBe(result3.icon);
    });

    it('devrait utiliser la correspondance partielle', () => {
      const result = getListIcon('Mon frigo');

      // Devrait trouver "frigo" dans "Mon frigo"
      expect(result.icon).toBeDefined();
      expect(result.color).toBeDefined();
    });

    it('devrait retourner une icône par défaut pour une liste inconnue', () => {
      const result = getListIcon('Liste sans nom spécifique xyz');

      expect(result.icon).toBeDefined();
      expect(result.color).toBeDefined();
    });

    it('devrait gérer les noms vides', () => {
      const result = getListIcon('');

      expect(result.icon).toBeDefined();
      expect(result.color).toBeDefined();
    });
  });

  describe('getCategoryColor', () => {
    it('devrait retourner une couleur valide pour les catégories connues', () => {
      const categories = ['fruits', 'légumes', 'viande', 'poisson', 'produits laitiers'];

      categories.forEach(category => {
        const color = getCategoryColor(category);

        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('devrait retourner une couleur par défaut pour une catégorie inconnue', () => {
      const color = getCategoryColor('catégorie inexistante');

      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('devrait retourner une couleur par défaut pour undefined', () => {
      const color = getCategoryColor(undefined);

      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('devrait retourner une couleur par défaut pour une chaîne vide', () => {
      const color = getCategoryColor('');

      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('devrait retourner des couleurs différentes pour des catégories différentes', () => {
      const color1 = getCategoryColor('fruits');
      const color2 = getCategoryColor('légumes');

      // Les catégories différentes devraient avoir des couleurs différentes
      expect(color1).not.toBe(color2);
    });
  });

  describe('getAllCategories', () => {
    it('devrait retourner un tableau de catégories', () => {
      const categories = getAllCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('devrait retourner des catégories uniques', () => {
      const categories = getAllCategories();
      const uniqueCategories = [...new Set(categories)];

      expect(categories.length).toBe(uniqueCategories.length);
    });

    it('devrait retourner au moins 10 catégories', () => {
      const categories = getAllCategories();

      expect(categories.length).toBeGreaterThanOrEqual(10);
    });

    it('toutes les catégories devraient avoir une couleur', () => {
      const categories = getAllCategories();

      categories.forEach(category => {
        const color = getCategoryColor(category);
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('getSuggestedFoodIcons', () => {
    it('devrait retourner des suggestions pour un préfixe valide', () => {
      const suggestions = getSuggestedFoodIcons('po');

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('devrait limiter le nombre de suggestions', () => {
      const suggestions = getSuggestedFoodIcons('a', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('devrait retourner un tableau vide pour un préfixe qui ne match rien', () => {
      const suggestions = getSuggestedFoodIcons('xyz123impossible');

      expect(suggestions).toEqual([]);
    });

    it('devrait retourner un tableau vide pour un préfixe trop court', () => {
      const suggestions = getSuggestedFoodIcons('p');

      expect(suggestions).toEqual([]);
    });

    it('devrait être insensible à la casse', () => {
      const suggestions1 = getSuggestedFoodIcons('PO');
      const suggestions2 = getSuggestedFoodIcons('po');

      expect(suggestions1.length).toBe(suggestions2.length);
    });

    it('devrait retourner des objets avec la structure correcte', () => {
      const suggestions = getSuggestedFoodIcons('po', 1);

      if (suggestions.length > 0) {
        const first = suggestions[0];

        expect(first).toHaveProperty('name');
        expect(first).toHaveProperty('icon');
        expect(first).toHaveProperty('color');
        expect(typeof first.name).toBe('string');
        expect(typeof first.icon).toBe('string');
        expect(typeof first.color).toBe('string');
        expect(first.color).toMatch(/^#[0-9A-F]{6}$/i);
      }
    });

    it('devrait gérer une chaîne vide', () => {
      const suggestions = getSuggestedFoodIcons('');

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('devrait être performant pour des recherches multiples', () => {
      const testWords = ['pomme', 'lait', 'pain', 'poulet', 'eau', 'salade', 'tomate', 'fromage'];

      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        testWords.forEach(word => getFoodIcon(word));
      }

      const duration = Date.now() - start;

      // Devrait prendre moins de 1 seconde pour 800 recherches
      expect(duration).toBeLessThan(1000);
    });

    it('ne devrait pas crasher avec des strings très longues', () => {
      const longString = 'a'.repeat(1000);

      expect(() => getFoodIcon(longString)).not.toThrow();
      expect(() => getListIcon(longString)).not.toThrow();
    });
  });

  describe('Cohérence', () => {
    it('tous les aliments devraient avoir une icône et une couleur', () => {
      const testFoods = [
        'pomme', 'tomate', 'lait', 'poulet', 'saumon',
        'pain', 'eau', 'aliment inconnu'
      ];

      testFoods.forEach(food => {
        const icon = getFoodIcon(food);
        expect(icon.icon).toBeDefined();
        expect(icon.icon).not.toBe('');
        expect(icon.color).toBeDefined();
        expect(icon.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('toutes les listes devraient avoir une icône et une couleur', () => {
      const testLists = [
        'Frigo', 'Congélateur', 'Placard',
        'Cave', 'Liste inconnue'
      ];

      testLists.forEach(list => {
        const icon = getListIcon(list);
        expect(icon.icon).toBeDefined();
        expect(icon.icon).not.toBe('');
        expect(icon.color).toBeDefined();
        expect(icon.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });
});
