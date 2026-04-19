// ============================================
// RECIPE SERVICE TESTS
// Tests pour les suggestions de recettes
// ============================================

jest.mock('../../config/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
  dbCategoryToApp: (c: string) => c,
  appCategoryToDb: (c: string) => c,
}));

jest.mock('../../services/analytics', () => ({
  trackRecipeVariantAssigned: jest.fn(),
}));

import {
  findMatchingRecipes,
  getAllRecipes,
  getRecipeById,
  getRecipesByCategory,
  getRecipesByDifficulty,
  loadUserRecipes,
  saveUserRecipes,
  addUserRecipe,
  updateUserRecipe,
  deleteUserRecipe,
  getAllRecipesWithUser,
  findMatchingRecipesWithUser,
  Recipe,
  RecipeMatch,
} from '../../services/recipeService';
import { FoodItem } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('RecipeService - Algorithme de matching', () => {
  describe('Bug fix: Détection de mots complets', () => {
    it('NE devrait PAS détecter "sucre" dans "yaourt au sucre"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'yaourt au sucre',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Aucune recette nécessitant "sucre" ne devrait être suggérée
      const recipesWithSugar = matches.filter(match =>
        match.recipe.ingredients.some(ing => ing.toLowerCase().includes('sucre'))
      );

      expect(recipesWithSugar.length).toBe(0);
    });

    it('NE devrait PAS détecter "beurre" dans "beurre de cacahuète"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'beurre de cacahuète',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Filtrer les recettes qui demandent du beurre (comme ingrédient séparé)
      // La recette "Crêpes sucrées" demande du beurre
      const crepesRecipe = matches.find(m => m.recipe.name === 'Crêpes sucrées');

      // Ne devrait pas être trouvée car "beurre de cacahuète" n'est pas du "beurre"
      expect(crepesRecipe).toBeUndefined();
    });

    it('DEVRAIT détecter "yaourt" dans "yaourt au sucre"', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'yaourt au sucre',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'banane',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'fraise',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '4',
          name: 'lait',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '5',
          name: 'miel',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // La recette "Smoothie aux fruits" demande du yaourt
      const smoothieRecipe = matches.find(m => m.recipe.name === 'Smoothie aux fruits');

      // Devrait être trouvée car "yaourt au sucre" contient "yaourt"
      expect(smoothieRecipe).toBeDefined();
      expect(smoothieRecipe?.matchPercentage).toBe(100); // Tous les ingrédients présents
    });

    it('DEVRAIT matcher les ingrédients avec word boundaries correctes', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'pain complet',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'avocat',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'oeufs',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // "pain complet" devrait matcher "pain" dans Toast avocat
      const toastRecipe = matches.find(m => m.recipe.name === 'Toast avocat');
      expect(toastRecipe).toBeDefined();
      expect(toastRecipe?.matchPercentage).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Système de matching avec synonymes', () => {
    it('devrait matcher "oeuf" et "oeufs" comme synonymes', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'oeuf',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'oignon',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Devrait trouver "Omelette aux légumes" qui demande des "oeufs"
      const omeletteRecipe = matches.find(m => m.recipe.name === 'Omelette aux légumes');
      expect(omeletteRecipe).toBeDefined();
    });

    it('devrait matcher les différents types de fromage', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'gruyère',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'oeufs',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Devrait trouver des recettes demandant du "fromage"
      const recipesWithCheese = matches.filter(m =>
        m.recipe.ingredients.some(ing => ing.toLowerCase().includes('fromage'))
      );

      expect(recipesWithCheese.length).toBeGreaterThan(0);
    });

    it('devrait matcher les variantes de pâtes', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'spaghetti',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'viande hachée',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '4',
          name: 'oignon',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Devrait trouver "Spaghetti bolognaise" qui demande "pâtes"
      const bolognaiseRecipe = matches.find(m => m.recipe.name === 'Spaghetti bolognaise');
      expect(bolognaiseRecipe).toBeDefined();
    });
  });

  describe('Seuil minimum de correspondance (50%)', () => {
    it('devrait suggérer une recette avec 100% de correspondance', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'banane',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'fraise',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'lait',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '4',
          name: 'yaourt',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '5',
          name: 'miel',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const smoothieRecipe = matches.find(m => m.recipe.name === 'Smoothie aux fruits');
      expect(smoothieRecipe).toBeDefined();
      expect(smoothieRecipe?.matchPercentage).toBe(100);
      expect(smoothieRecipe?.missingIngredients.length).toBe(0);
    });

    it('devrait suggérer une recette avec exactement 50% de correspondance', () => {
      // Recipe "Omelette aux légumes" a 5 ingrédients: oeufs, tomate, oignon, fromage, poivron
      // On fournit 3 ingrédients (60%)
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'oeufs',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'fromage',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const omeletteRecipe = matches.find(m => m.recipe.name === 'Omelette aux légumes');
      expect(omeletteRecipe).toBeDefined();
      expect(omeletteRecipe?.matchPercentage).toBe(60);
      expect(omeletteRecipe?.matchingIngredients.length).toBe(3);
      expect(omeletteRecipe?.missingIngredients.length).toBe(2);
    });

    it('NE devrait PAS suggérer une recette avec moins de 50% de correspondance', () => {
      // Recipe "Risotto aux champignons" a 6 ingrédients
      // On fournit seulement 2 ingrédients (33%)
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'riz',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'oignon',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const risottoRecipe = matches.find(m => m.recipe.name === 'Risotto aux champignons');
      // Ne devrait pas être suggéré car 33% < 50%
      expect(risottoRecipe).toBeUndefined();
    });

    it('devrait calculer correctement les pourcentages de correspondance', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'pâtes',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'lardons',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'oeufs',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      const carbonaraRecipe = matches.find(m => m.recipe.name === 'Pâtes à la carbonara');
      expect(carbonaraRecipe).toBeDefined();
      // 3 ingrédients sur 5 = 60%
      expect(carbonaraRecipe?.matchPercentage).toBe(60);
    });
  });

  describe('Filtrage des aliments', () => {
    it('devrait ignorer les aliments consommés', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'oeufs',
          expirationDate: '2024-02-01',
          status: 'consumed', // Déjà consommé
        },
        {
          id: '2',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Ne devrait trouver aucune recette nécessitant des oeufs
      const eggsRecipes = matches.filter(m =>
        m.matchingIngredients.some(ing => ing.toLowerCase().includes('oeuf'))
      );

      expect(eggsRecipes.length).toBe(0);
    });

    it('devrait ignorer les aliments jetés', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'poulet',
          expirationDate: '2024-02-01',
          status: 'thrown', // Jeté
        },
        {
          id: '2',
          name: 'salade',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Ne devrait pas suggérer "Salade César" car le poulet est jeté
      const cesarRecipe = matches.find(m => m.recipe.name === 'Salade César');
      expect(cesarRecipe).toBeUndefined();
    });

    it('devrait utiliser uniquement les aliments actifs', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'banane',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'fraise',
          expirationDate: '2024-02-01',
          status: 'consumed',
        },
        {
          id: '3',
          name: 'lait',
          expirationDate: '2024-02-01',
          status: 'thrown',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Devrait uniquement considérer la banane (active)
      matches.forEach(match => {
        expect(match.matchingIngredients).not.toContain('fraise');
        expect(match.matchingIngredients).not.toContain('lait');
      });
    });
  });

  describe('Tri des résultats', () => {
    it('devrait trier les recettes par pourcentage décroissant', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'oeufs',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'fromage',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '4',
          name: 'pain',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '5',
          name: 'avocat',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);

      // Vérifier que les recettes sont triées par pourcentage décroissant
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].matchPercentage).toBeGreaterThanOrEqual(matches[i + 1].matchPercentage);
      }
    });
  });

  describe('Cas limites', () => {
    it('devrait retourner un tableau vide si aucun aliment', () => {
      const foodItems: FoodItem[] = [];
      const matches = findMatchingRecipes(foodItems);
      expect(matches).toEqual([]);
    });

    it('devrait retourner un tableau vide si tous les aliments sont consommés/jetés', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'oeufs',
          expirationDate: '2024-02-01',
          status: 'consumed',
        },
        {
          id: '2',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'thrown',
        },
      ];

      const matches = findMatchingRecipes(foodItems);
      expect(matches).toEqual([]);
    });

    it('devrait gérer les noms d\'aliments avec accents', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'pâtes',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'viande hachée',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('devrait gérer les noms d\'aliments en majuscules', () => {
      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'OEUFS',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'TOMATE',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '3',
          name: 'FROMAGE',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '4',
          name: 'OIGNON',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = findMatchingRecipes(foodItems);
      // Devrait trouver au moins "Omelette aux légumes" (4/5 ingrédients = 80%)
      expect(matches.length).toBeGreaterThan(0);

      const omeletteRecipe = matches.find(m => m.recipe.name === 'Omelette aux légumes');
      expect(omeletteRecipe).toBeDefined();
      expect(omeletteRecipe?.matchPercentage).toBe(80);
    });
  });
});

describe('RecipeService - Fonctions utilitaires', () => {
  describe('getAllRecipes', () => {
    it('devrait retourner toutes les recettes de la base', () => {
      const recipes = getAllRecipes();
      expect(recipes.length).toBeGreaterThan(0);
      expect(recipes[0]).toHaveProperty('id');
      expect(recipes[0]).toHaveProperty('name');
      expect(recipes[0]).toHaveProperty('ingredients');
    });

    it('toutes les recettes devraient avoir les champs requis', () => {
      const recipes = getAllRecipes();
      recipes.forEach(recipe => {
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('name');
        expect(recipe).toHaveProperty('description');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('preparationTime');
        expect(recipe).toHaveProperty('difficulty');
        expect(recipe).toHaveProperty('category');
        expect(recipe).toHaveProperty('imageEmoji');
        expect(recipe).toHaveProperty('instructions');
      });
    });
  });

  describe('getRecipeById', () => {
    it('devrait retourner une recette par son ID', () => {
      const recipe = getRecipeById('1');
      expect(recipe).toBeDefined();
      expect(recipe?.id).toBe('1');
      expect(typeof recipe?.name).toBe('string');
    });

    it('devrait retourner undefined pour un ID inexistant', () => {
      const recipe = getRecipeById('999');
      expect(recipe).toBeUndefined();
    });
  });

  describe('getRecipesByCategory', () => {
    it('devrait filtrer les recettes par catégorie "plat"', () => {
      const recipes = getRecipesByCategory('plat');
      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.category).toBe('plat');
      });
    });

    it('devrait filtrer les recettes par catégorie "dessert"', () => {
      const recipes = getRecipesByCategory('dessert');
      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.category).toBe('dessert');
      });
    });

    it('devrait filtrer les recettes par catégorie "entrée"', () => {
      const recipes = getRecipesByCategory('entrée');
      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.category).toBe('entrée');
      });
    });
  });

  describe('getRecipesByDifficulty', () => {
    it('devrait filtrer les recettes par difficulté "facile"', () => {
      const recipes = getRecipesByDifficulty('facile');
      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.difficulty).toBe('facile');
      });
    });

    it('devrait filtrer les recettes par difficulté "moyen"', () => {
      const recipes = getRecipesByDifficulty('moyen');
      expect(recipes.length).toBeGreaterThan(0);
      recipes.forEach(recipe => {
        expect(recipe.difficulty).toBe('moyen');
      });
    });
  });
});

describe('RecipeService - Gestion des recettes utilisateur', () => {
  beforeEach(() => {
    // Clear mocks avant chaque test
    jest.clearAllMocks();
  });

  describe('loadUserRecipes', () => {
    it('devrait charger les recettes utilisateur depuis AsyncStorage', async () => {
      const mockRecipes: Recipe[] = [
        {
          id: 'user_1',
          name: 'Ma recette perso',
          description: 'Une recette personnalisée',
          ingredients: ['tomate', 'oignon'],
          preparationTime: 20,
          difficulty: 'facile',
          category: 'plat',
          imageEmoji: '🍳',
          instructions: ['Étape 1', 'Étape 2'],
          isUserRecipe: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockRecipes));

      const recipes = await loadUserRecipes();
      expect(recipes).toEqual(mockRecipes);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user_recipes');
    });

    it('devrait retourner un tableau vide si aucune recette', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const recipes = await loadUserRecipes();
      expect(recipes).toEqual([]);
    });

    it('devrait gérer les erreurs gracieusement', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const recipes = await loadUserRecipes();
      expect(recipes).toEqual([]);
    });
  });

  describe('saveUserRecipes', () => {
    it('devrait sauvegarder les recettes dans AsyncStorage', async () => {
      const mockRecipes: Recipe[] = [
        {
          id: 'user_1',
          name: 'Ma recette',
          description: 'Description',
          ingredients: ['tomate'],
          preparationTime: 20,
          difficulty: 'facile',
          category: 'plat',
          imageEmoji: '🍳',
          instructions: ['Étape 1'],
          isUserRecipe: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      await saveUserRecipes(mockRecipes);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user_recipes',
        JSON.stringify(mockRecipes)
      );
    });

    it('devrait gérer les erreurs de sauvegarde', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(saveUserRecipes([])).resolves.not.toThrow();
    });
  });

  describe('addUserRecipe', () => {
    it('devrait ajouter une nouvelle recette utilisateur', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newRecipeData = {
        name: 'Ma nouvelle recette',
        description: 'Une description',
        ingredients: ['tomate', 'oignon'],
        preparationTime: 30,
        difficulty: 'facile' as const,
        category: 'plat' as const,
        imageEmoji: '🍝',
        instructions: ['Étape 1', 'Étape 2'],
      };

      const newRecipe = await addUserRecipe(newRecipeData);

      expect(newRecipe).toHaveProperty('id');
      expect(newRecipe.id).toContain('user_');
      expect(newRecipe.isUserRecipe).toBe(true);
      expect(newRecipe.createdAt).toBeDefined();
      expect(newRecipe.name).toBe(newRecipeData.name);
    });
  });

  describe('updateUserRecipe', () => {
    it('devrait mettre à jour une recette existante', async () => {
      const existingRecipe: Recipe = {
        id: 'user_123',
        name: 'Ancienne recette',
        description: 'Ancienne description',
        ingredients: ['tomate'],
        preparationTime: 20,
        difficulty: 'facile',
        category: 'plat',
        imageEmoji: '🍳',
        instructions: ['Étape 1'],
        isUserRecipe: true,
        createdAt: '2024-01-01T00:00:00Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([existingRecipe]));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const updates = { name: 'Nouvelle recette', description: 'Nouvelle description' };
      const updatedRecipe = await updateUserRecipe('user_123', updates);

      expect(updatedRecipe).toBeDefined();
      expect(updatedRecipe?.name).toBe('Nouvelle recette');
      expect(updatedRecipe?.description).toBe('Nouvelle description');
    });

    it('devrait retourner null si la recette n\'existe pas', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      const result = await updateUserRecipe('user_999', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteUserRecipe', () => {
    it('devrait supprimer une recette existante', async () => {
      const recipes: Recipe[] = [
        {
          id: 'user_1',
          name: 'Recette 1',
          description: 'Description 1',
          ingredients: ['tomate'],
          preparationTime: 20,
          difficulty: 'facile',
          category: 'plat',
          imageEmoji: '🍳',
          instructions: ['Étape 1'],
          isUserRecipe: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'user_2',
          name: 'Recette 2',
          description: 'Description 2',
          ingredients: ['oignon'],
          preparationTime: 30,
          difficulty: 'moyen',
          category: 'entrée',
          imageEmoji: '🥗',
          instructions: ['Étape 1'],
          isUserRecipe: true,
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(recipes));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await deleteUserRecipe('user_1');

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user_recipes',
        expect.stringContaining('user_2')
      );
    });

    it('devrait retourner false si la recette n\'existe pas', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');

      const result = await deleteUserRecipe('user_999');
      expect(result).toBe(false);
    });
  });

  describe('getAllRecipesWithUser', () => {
    it('devrait combiner les recettes intégrées et utilisateur', async () => {
      const userRecipes: Recipe[] = [
        {
          id: 'user_1',
          name: 'Recette perso',
          description: 'Description',
          ingredients: ['tomate'],
          preparationTime: 20,
          difficulty: 'facile',
          category: 'plat',
          imageEmoji: '🍳',
          instructions: ['Étape 1'],
          isUserRecipe: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'user_recipes') return Promise.resolve(JSON.stringify(userRecipes));
        return Promise.resolve(null);
      });
      (AsyncStorage.multiGet as jest.Mock) = jest.fn().mockResolvedValue([
        ['cloud_recipes_cache_ts_default', null],
        ['cloud_recipes_cache_default', null],
      ]);

      const allRecipes = await getAllRecipesWithUser();

      expect(allRecipes.length).toBeGreaterThan(userRecipes.length);
      expect(allRecipes.some(r => r.id === 'user_1')).toBe(true);
      expect(allRecipes.some(r => !r.isUserRecipe)).toBe(true); // cloud/integrated recipe
    });
  });

  describe('findMatchingRecipesWithUser', () => {
    it('devrait inclure les recettes utilisateur dans les résultats', async () => {
      const userRecipes: Recipe[] = [
        {
          id: 'user_1',
          name: 'Ma recette simple',
          description: 'Description',
          ingredients: ['tomate', 'oignon'],
          preparationTime: 15,
          difficulty: 'facile',
          category: 'plat',
          imageEmoji: '🍳',
          instructions: ['Étape 1'],
          isUserRecipe: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(userRecipes));

      const foodItems: FoodItem[] = [
        {
          id: '1',
          name: 'tomate',
          expirationDate: '2024-02-01',
          status: 'active',
        },
        {
          id: '2',
          name: 'oignon',
          expirationDate: '2024-02-01',
          status: 'active',
        },
      ];

      const matches = await findMatchingRecipesWithUser(foodItems);

      const userRecipeMatch = matches.find(m => m.recipe.id === 'user_1');
      expect(userRecipeMatch).toBeDefined();
      expect(userRecipeMatch?.matchPercentage).toBe(100);
    });
  });
});
