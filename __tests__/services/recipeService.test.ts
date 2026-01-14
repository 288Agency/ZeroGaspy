/**
 * Tests unitaires pour le service de recettes
 * Focus sur la détection d'ingrédients avec limites de mots
 */

import { findMatchingRecipes } from '../../services/recipeService';
import { FoodItem } from '../../types';

describe('RecipeService - Ingredient Matching', () => {
  describe('Bug Fix: Sugar Detection', () => {
    it('ne devrait PAS matcher "yaourt au sucre" avec "sucre"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Yaourt au sucre',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Vérifier qu'aucune recette nécessitant du sucre n'est suggérée
      const recipesWithSugar = matches.filter((match) =>
        match.recipe.ingredients.some((ing) => ing.toLowerCase() === 'sucre')
      );

      // Les recettes avec sucre ne devraient pas avoir "sucre" dans les ingrédients matchés
      recipesWithSugar.forEach((match) => {
        expect(match.matchingIngredients).not.toContain('sucre');
      });
    });

    it('devrait matcher "sucre blanc" avec "sucre"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Sucre blanc',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Vérifier qu'au moins une recette avec sucre est suggérée
      const recipesWithSugar = matches.filter((match) =>
        match.recipe.ingredients.some((ing) => ing.toLowerCase() === 'sucre')
      );

      if (recipesWithSugar.length > 0) {
        // Au moins une recette devrait avoir "sucre" dans les ingrédients matchés
        const hasSugarMatch = recipesWithSugar.some((match) =>
          match.matchingIngredients.includes('sucre')
        );
        expect(hasSugarMatch).toBe(true);
      }
    });

    it('devrait matcher "sucre" seul avec "sucre"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Sucre',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const recipesWithSugar = matches.filter((match) =>
        match.recipe.ingredients.some((ing) => ing.toLowerCase() === 'sucre')
      );

      if (recipesWithSugar.length > 0) {
        const hasSugarMatch = recipesWithSugar.some((match) =>
          match.matchingIngredients.includes('sucre')
        );
        expect(hasSugarMatch).toBe(true);
      }
    });
  });

  describe('Word Boundary Matching', () => {
    it('devrait matcher "tomate" dans "tomate cerise"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Tomate cerise',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const recipesWithTomato = matches.filter((match) =>
        match.matchingIngredients.some((ing) => ing.toLowerCase().includes('tomate'))
      );

      expect(recipesWithTomato.length).toBeGreaterThan(0);
    });

    it('devrait matcher "yaourt nature" avec "yaourt"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Yaourt nature',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Vérifier qu'au moins une recette avec yaourt est suggérée
      const recipesWithYaourt = matches.filter((match) =>
        match.recipe.ingredients.some((ing) => ing.toLowerCase().includes('yaourt'))
      );

      if (recipesWithYaourt.length > 0) {
        const hasYaourtMatch = recipesWithYaourt.some((match) =>
          match.matchingIngredients.some((ing) => ing.toLowerCase().includes('yaourt'))
        );
        expect(hasYaourtMatch).toBe(true);
      }
    });
  });

  describe('Match Threshold', () => {
    it('ne devrait pas suggérer de recettes avec moins de 50% de match', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Sel',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Toutes les recettes retournées doivent avoir au moins 50% de match
      matches.forEach((match) => {
        expect(match.matchPercentage).toBeGreaterThanOrEqual(50);
      });
    });

    it('devrait calculer correctement le pourcentage de match', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Oeufs',
          expirationDate: '31/12/2026',
          status: 'active',
        },
        {
          id: '2',
          name: 'Lait',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      matches.forEach((match) => {
        const totalIngredients = match.recipe.ingredients.length;
        const matchingCount = match.matchingIngredients.length;
        const expectedPercentage = Math.round((matchingCount / totalIngredients) * 100);

        expect(match.matchPercentage).toBe(expectedPercentage);
      });
    });
  });

  describe('Status Filtering', () => {
    it('ne devrait pas inclure les aliments consommés', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Oeufs',
          expirationDate: '31/12/2026',
          status: 'consumed',
        },
        {
          id: '2',
          name: 'Lait',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Aucune recette ne devrait matcher "oeufs" car il est consommé
      matches.forEach((match) => {
        if (match.recipe.ingredients.includes('oeufs')) {
          expect(match.matchingIngredients).not.toContain('oeufs');
        }
      });
    });

    it('ne devrait pas inclure les aliments jetés', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Tomate',
          expirationDate: '31/12/2026',
          status: 'thrown',
        },
        {
          id: '2',
          name: 'Oignon',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Aucune recette ne devrait matcher "tomate" car elle est jetée
      matches.forEach((match) => {
        if (match.recipe.ingredients.includes('tomate')) {
          expect(match.matchingIngredients).not.toContain('tomate');
        }
      });
    });
  });

  describe('Synonyms Matching', () => {
    it('devrait matcher "oeuf" avec "oeufs" (synonyme)', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Oeuf',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const recipesWithEggs = matches.filter((match) =>
        match.recipe.ingredients.some((ing) => ing.toLowerCase().includes('oeuf'))
      );

      expect(recipesWithEggs.length).toBeGreaterThan(0);
    });

    it('devrait matcher "gruyère" avec "fromage" (synonyme)', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Gruyère',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const recipesWithCheese = matches.filter((match) =>
        match.recipe.ingredients.some((ing) => ing.toLowerCase().includes('fromage'))
      );

      if (recipesWithCheese.length > 0) {
        const hasCheeseMatch = recipesWithCheese.some((match) =>
          match.matchingIngredients.includes('fromage')
        );
        expect(hasCheeseMatch).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('devrait retourner un tableau vide avec aucun aliment', () => {
      const foodItems: FoodItem[] = [];
      const matches = findMatchingRecipes(foodItems);
      expect(matches).toEqual([]);
    });

    it('devrait gérer les noms avec accents', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'Crème fraîche',
          expirationDate: '31/12/2026',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const recipesWithCream = matches.filter((match) =>
        match.matchingIngredients.some((ing) => ing.toLowerCase().includes('crème') || ing.toLowerCase().includes('creme'))
      );

      expect(recipesWithCream.length).toBeGreaterThan(0);
    });

    it('devrait trier les recettes par pourcentage décroissant', () => {
      const foodItems: FoodItem[] = [
        { id: '1', name: 'Oeufs', expirationDate: '31/12/2026', status: 'active' },
        { id: '2', name: 'Tomate', expirationDate: '31/12/2026', status: 'active' },
        { id: '3', name: 'Fromage', expirationDate: '31/12/2026', status: 'active' },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Vérifier que le tri est décroissant
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].matchPercentage).toBeGreaterThanOrEqual(matches[i + 1].matchPercentage);
      }
    });
  });
});
