// ============================================
// RECIPE SERVICE
// Suggestions de recettes basées sur les aliments disponibles
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '../types';

const USER_RECIPES_KEY = 'user_recipes';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  preparationTime: number; // en minutes
  difficulty: 'facile' | 'moyen' | 'difficile';
  category: 'entrée' | 'plat' | 'dessert' | 'snack' | 'boisson';
  imageEmoji: string;
  instructions: string[];
  tips?: string;
  isUserRecipe?: boolean; // true si c'est une recette ajoutée par l'utilisateur
  createdAt?: string; // date de création pour les recettes utilisateur
}

export interface RecipeMatch {
  recipe: Recipe;
  matchingIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
}

// Base de données de recettes
const RECIPES_DATABASE: Recipe[] = [
  // PLATS PRINCIPAUX
  {
    id: '1',
    name: 'Omelette aux légumes',
    description: 'Une omelette simple et rapide avec les légumes du frigo',
    ingredients: ['oeufs', 'tomate', 'oignon', 'fromage', 'poivron'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍳',
    instructions: [
      'Battre les oeufs dans un bol',
      'Couper les légumes en petits dés',
      'Faire revenir les légumes dans une poêle',
      'Verser les oeufs battus sur les légumes',
      'Ajouter le fromage râpé',
      'Plier l\'omelette et servir'
    ],
    tips: 'Ajoutez des herbes fraîches pour plus de saveur'
  },
  {
    id: '2',
    name: 'Pâtes à la carbonara',
    description: 'Le classique italien revisité',
    ingredients: ['pâtes', 'lardons', 'oeufs', 'parmesan', 'crème'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍝',
    instructions: [
      'Cuire les pâtes dans l\'eau bouillante salée',
      'Faire revenir les lardons',
      'Mélanger les oeufs avec le parmesan',
      'Égoutter les pâtes et les mélanger avec les lardons',
      'Ajouter le mélange oeufs-parmesan hors du feu',
      'Servir immédiatement'
    ]
  },
  {
    id: '3',
    name: 'Salade César',
    description: 'Une salade fraîche et croquante',
    ingredients: ['salade', 'poulet', 'parmesan', 'croûtons', 'tomate'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🥗',
    instructions: [
      'Laver et couper la salade',
      'Griller le poulet et le couper en lamelles',
      'Préparer les croûtons dorés',
      'Assembler tous les ingrédients',
      'Ajouter le parmesan en copeaux',
      'Assaisonner avec la sauce César'
    ]
  },
  {
    id: '4',
    name: 'Risotto aux champignons',
    description: 'Un risotto crémeux aux champignons',
    ingredients: ['riz', 'champignons', 'oignon', 'vin blanc', 'parmesan', 'beurre'],
    preparationTime: 35,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍚',
    instructions: [
      'Faire revenir l\'oignon émincé',
      'Ajouter le riz et nacrer',
      'Mouiller avec le vin blanc',
      'Ajouter le bouillon petit à petit',
      'Incorporer les champignons sautés',
      'Finir avec le beurre et le parmesan'
    ]
  },
  {
    id: '5',
    name: 'Poulet rôti aux légumes',
    description: 'Un classique familial savoureux',
    ingredients: ['poulet', 'pomme de terre', 'carotte', 'oignon', 'ail', 'herbes'],
    preparationTime: 60,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍗',
    instructions: [
      'Préchauffer le four à 200°C',
      'Assaisonner le poulet avec les herbes',
      'Couper les légumes en morceaux',
      'Disposer le tout dans un plat',
      'Enfourner pendant 1h',
      'Arroser régulièrement'
    ]
  },
  {
    id: '6',
    name: 'Soupe de légumes',
    description: 'Une soupe réconfortante et healthy',
    ingredients: ['carotte', 'poireau', 'pomme de terre', 'oignon', 'céleri'],
    preparationTime: 40,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🍲',
    instructions: [
      'Éplucher et couper tous les légumes',
      'Faire revenir l\'oignon',
      'Ajouter les légumes et couvrir d\'eau',
      'Laisser mijoter 30 minutes',
      'Mixer selon la texture souhaitée',
      'Assaisonner et servir chaud'
    ]
  },
  {
    id: '7',
    name: 'Quiche lorraine',
    description: 'Une quiche traditionnelle et gourmande',
    ingredients: ['pâte brisée', 'lardons', 'oeufs', 'crème', 'fromage'],
    preparationTime: 45,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🥧',
    instructions: [
      'Préchauffer le four à 180°C',
      'Étaler la pâte dans un moule',
      'Faire revenir les lardons',
      'Battre les oeufs avec la crème',
      'Répartir lardons et appareil sur la pâte',
      'Cuire 35-40 minutes'
    ]
  },
  {
    id: '8',
    name: 'Steak haché maison',
    description: 'Un burger fait maison',
    ingredients: ['viande hachée', 'pain', 'salade', 'tomate', 'oignon', 'fromage'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍔',
    instructions: [
      'Former les steaks avec la viande',
      'Cuire à la poêle selon vos goûts',
      'Toaster les pains',
      'Préparer les garnitures',
      'Assembler le burger',
      'Servir avec des frites'
    ]
  },
  {
    id: '9',
    name: 'Gratin de courgettes',
    description: 'Un gratin léger et savoureux',
    ingredients: ['courgette', 'crème', 'fromage', 'ail', 'oignon'],
    preparationTime: 40,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🧀',
    instructions: [
      'Préchauffer le four à 180°C',
      'Couper les courgettes en rondelles',
      'Les faire revenir avec l\'oignon',
      'Disposer dans un plat à gratin',
      'Verser la crème et parsemer de fromage',
      'Gratiner 20 minutes'
    ]
  },
  {
    id: '10',
    name: 'Spaghetti bolognaise',
    description: 'Le classique italien par excellence',
    ingredients: ['pâtes', 'viande hachée', 'tomate', 'oignon', 'carotte', 'ail'],
    preparationTime: 45,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍝',
    instructions: [
      'Faire revenir oignon, carotte et ail',
      'Ajouter la viande hachée',
      'Incorporer les tomates',
      'Laisser mijoter 30 minutes',
      'Cuire les pâtes',
      'Servir avec du parmesan'
    ]
  },
  {
    id: '11',
    name: 'Smoothie aux fruits',
    description: 'Un smoothie vitaminé et rafraîchissant',
    ingredients: ['banane', 'fraise', 'lait', 'yaourt', 'miel'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '🥤',
    instructions: [
      'Éplucher et couper les fruits',
      'Mettre tous les ingrédients dans le blender',
      'Mixer jusqu\'à consistance lisse',
      'Servir frais'
    ]
  },
  {
    id: '12',
    name: 'Crêpes sucrées',
    description: 'Des crêpes moelleuses pour le goûter',
    ingredients: ['farine', 'oeufs', 'lait', 'beurre', 'sucre'],
    preparationTime: 30,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🥞',
    instructions: [
      'Mélanger farine et oeufs',
      'Ajouter le lait progressivement',
      'Incorporer le beurre fondu',
      'Laisser reposer 30 minutes',
      'Cuire les crêpes à la poêle',
      'Garnir selon vos envies'
    ]
  },
  {
    id: '13',
    name: 'Salade de fruits',
    description: 'Une salade de fruits fraîche et colorée',
    ingredients: ['pomme', 'banane', 'orange', 'kiwi', 'fraise'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍇',
    instructions: [
      'Laver et éplucher les fruits',
      'Les couper en morceaux',
      'Mélanger dans un saladier',
      'Arroser de jus d\'orange',
      'Réfrigérer avant de servir'
    ]
  },
  {
    id: '14',
    name: 'Toast avocat',
    description: 'Un toast healthy et tendance',
    ingredients: ['pain', 'avocat', 'oeufs', 'citron', 'tomate'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🥑',
    instructions: [
      'Toaster le pain',
      'Écraser l\'avocat avec du citron',
      'Tartiner sur le pain',
      'Ajouter un oeuf poché',
      'Garnir de tomates cerises'
    ]
  },
  {
    id: '15',
    name: 'Wrap au poulet',
    description: 'Un wrap frais et nourrissant',
    ingredients: ['tortilla', 'poulet', 'salade', 'tomate', 'sauce'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🌯',
    instructions: [
      'Réchauffer la tortilla',
      'Couper le poulet en lamelles',
      'Disposer les ingrédients au centre',
      'Ajouter la sauce',
      'Rouler le wrap',
      'Couper en deux et servir'
    ]
  },
  {
    id: '16',
    name: 'Pizza maison',
    description: 'Une pizza avec les ingrédients du frigo',
    ingredients: ['pâte à pizza', 'tomate', 'fromage', 'jambon', 'champignons'],
    preparationTime: 30,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍕',
    instructions: [
      'Préchauffer le four à 220°C',
      'Étaler la pâte',
      'Répartir la sauce tomate',
      'Ajouter les garnitures',
      'Parsemer de fromage',
      'Cuire 15-20 minutes'
    ]
  },
  {
    id: '17',
    name: 'Tarte aux pommes',
    description: 'Un dessert classique et délicieux',
    ingredients: ['pâte feuilletée', 'pomme', 'sucre', 'beurre', 'cannelle'],
    preparationTime: 45,
    difficulty: 'moyen',
    category: 'dessert',
    imageEmoji: '🥧',
    instructions: [
      'Préchauffer le four à 180°C',
      'Étaler la pâte dans un moule',
      'Éplucher et couper les pommes',
      'Les disposer en rosace',
      'Saupoudrer de sucre et cannelle',
      'Cuire 35-40 minutes'
    ]
  },
  {
    id: '18',
    name: 'Riz sauté aux légumes',
    description: 'Un plat asiatique rapide et savoureux',
    ingredients: ['riz', 'oeufs', 'carotte', 'petits pois', 'oignon', 'sauce soja'],
    preparationTime: 25,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍜',
    instructions: [
      'Cuire le riz et le laisser refroidir',
      'Faire sauter les légumes',
      'Ajouter le riz froid',
      'Pousser sur le côté et brouiller les oeufs',
      'Mélanger le tout',
      'Assaisonner avec la sauce soja'
    ]
  },
  {
    id: '19',
    name: 'Gaspacho',
    description: 'Une soupe froide rafraîchissante',
    ingredients: ['tomate', 'concombre', 'poivron', 'oignon', 'ail', 'huile d\'olive'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🍅',
    instructions: [
      'Couper tous les légumes',
      'Les mixer ensemble',
      'Ajouter l\'huile d\'olive',
      'Assaisonner',
      'Réfrigérer au moins 2h',
      'Servir très frais'
    ]
  },
  {
    id: '20',
    name: 'Banana bread',
    description: 'Un gâteau moelleux à la banane',
    ingredients: ['banane', 'farine', 'oeufs', 'sucre', 'beurre'],
    preparationTime: 60,
    difficulty: 'moyen',
    category: 'dessert',
    imageEmoji: '🍌',
    instructions: [
      'Préchauffer le four à 180°C',
      'Écraser les bananes bien mûres',
      'Mélanger avec le beurre fondu et le sucre',
      'Ajouter les oeufs puis la farine',
      'Verser dans un moule à cake',
      'Cuire 45-50 minutes'
    ],
    tips: 'Utilisez des bananes très mûres pour plus de saveur'
  },
];

// Synonymes et variantes pour améliorer le matching
const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  'oeufs': ['oeuf', 'œuf', 'œufs', 'egg', 'eggs'],
  'tomate': ['tomates', 'tomate cerise', 'tomates cerises'],
  'pomme de terre': ['pommes de terre', 'patate', 'patates', 'potato'],
  'fromage': ['gruyère', 'emmental', 'comté', 'cheddar', 'mozzarella', 'parmesan'],
  'salade': ['laitue', 'roquette', 'mâche', 'mesclun'],
  'poulet': ['blanc de poulet', 'escalope de poulet', 'filet de poulet'],
  'viande hachée': ['boeuf haché', 'steak haché', 'haché'],
  'pâtes': ['spaghetti', 'penne', 'fusilli', 'tagliatelles', 'macaroni'],
  'riz': ['riz basmati', 'riz thaï', 'riz complet'],
  'lait': ['lait entier', 'lait demi-écrémé', 'lait écrémé'],
  'crème': ['crème fraîche', 'crème liquide', 'crème épaisse'],
  'pain': ['baguette', 'pain de mie', 'pain complet'],
  'champignons': ['champignon', 'champignons de paris', 'shiitake'],
  'oignon': ['oignons', 'échalote', 'échalotes'],
  'ail': ['gousse d\'ail', 'gousses d\'ail'],
  'carotte': ['carottes'],
  'courgette': ['courgettes'],
  'poivron': ['poivrons', 'poivron rouge', 'poivron vert'],
  'banane': ['bananes'],
  'pomme': ['pommes'],
  'fraise': ['fraises'],
  'orange': ['oranges'],
  'yaourt': ['yaourts', 'yogurt', 'yoghurt', 'yogourt', 'yogourts'],
  'sucre': ['sucres', 'sugar'],
  'beurre': ['beurres', 'butter', 'beurre doux', 'beurre salé'],
  'farine': ['farines', 'flour', 'farine de blé'],
};

/**
 * Normalise un nom d'ingrédient pour la comparaison
 */
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .trim();
}

/**
 * Vérifie si un mot est présent comme mot complet (avec des limites de mots)
 * Cela évite les faux positifs comme "yaourt au sucre" qui contient "sucre"
 */
function containsAsWholeWord(text: string, word: string): boolean {
  // Crée une regex avec word boundaries pour matcher uniquement les mots complets
  // \b assure que le mot est entouré de limites (espaces, début/fin de chaîne, ponctuation)
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(text);
}

/**
 * Vérifie si un aliment correspond à un ingrédient de recette
 */
function ingredientMatches(foodName: string, recipeIngredient: string): boolean {
  const normalizedFood = normalizeIngredient(foodName);
  const normalizedIngredient = normalizeIngredient(recipeIngredient);

  // Correspondance exacte (match complet)
  if (normalizedFood === normalizedIngredient) {
    return true;
  }

  // Correspondance avec word boundaries (évite "yaourt au sucre" -> "sucre")
  // On vérifie que l'ingrédient est un mot complet dans le nom de l'aliment
  if (containsAsWholeWord(normalizedFood, normalizedIngredient)) {
    return true;
  }

  // Vérifier si le nom de l'aliment est un mot complet dans l'ingrédient de la recette
  // (ex: "poulet" dans "blanc de poulet")
  if (containsAsWholeWord(normalizedIngredient, normalizedFood)) {
    return true;
  }

  // Vérifier les synonymes
  for (const [key, synonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
    const normalizedKey = normalizeIngredient(key);
    const normalizedSynonyms = synonyms.map(normalizeIngredient);

    // L'ingrédient de la recette correspond-il à la clé ou à un synonyme ?
    const isIngredientMatch = normalizedIngredient === normalizedKey || normalizedSynonyms.includes(normalizedIngredient);

    if (isIngredientMatch) {
      // L'aliment de l'utilisateur correspond-il à la même famille ?
      // Match exact ou mot complet seulement
      const isFoodMatch =
        normalizedFood === normalizedKey ||
        normalizedSynonyms.includes(normalizedFood) ||
        containsAsWholeWord(normalizedFood, normalizedKey) ||
        normalizedSynonyms.some(s => containsAsWholeWord(normalizedFood, s));

      if (isFoodMatch) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Trouve les recettes possibles avec les aliments disponibles
 */
export function findMatchingRecipes(foodItems: FoodItem[]): RecipeMatch[] {
  // Filtrer les aliments actifs uniquement
  const activeItems = foodItems.filter(item => item.status !== 'consumed' && item.status !== 'thrown');
  const availableFoods = activeItems.map(item => item.name);

  const matches: RecipeMatch[] = [];

  for (const recipe of RECIPES_DATABASE) {
    const matchingIngredients: string[] = [];
    const missingIngredients: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const found = availableFoods.some(food => ingredientMatches(food, ingredient));

      if (found) {
        matchingIngredients.push(ingredient);
      } else {
        missingIngredients.push(ingredient);
      }
    }

    // Calculer le pourcentage de correspondance
    const matchPercentage = Math.round((matchingIngredients.length / recipe.ingredients.length) * 100);

    // Ne garder que les recettes avec au moins 30% de correspondance
    if (matchPercentage >= 30) {
      matches.push({
        recipe,
        matchingIngredients,
        missingIngredients,
        matchPercentage,
      });
    }
  }

  // Trier par pourcentage de correspondance décroissant
  return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Récupère toutes les recettes disponibles
 */
export function getAllRecipes(): Recipe[] {
  return RECIPES_DATABASE;
}

/**
 * Récupère une recette par son ID
 */
export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES_DATABASE.find(recipe => recipe.id === id);
}

/**
 * Filtre les recettes par catégorie
 */
export function getRecipesByCategory(category: Recipe['category']): Recipe[] {
  return RECIPES_DATABASE.filter(recipe => recipe.category === category);
}

/**
 * Filtre les recettes par difficulté
 */
export function getRecipesByDifficulty(difficulty: Recipe['difficulty']): Recipe[] {
  return RECIPES_DATABASE.filter(recipe => recipe.difficulty === difficulty);
}

// ============================================
// GESTION DES RECETTES UTILISATEUR
// ============================================

/**
 * Charge les recettes personnalisées de l'utilisateur
 */
export async function loadUserRecipes(): Promise<Recipe[]> {
  try {
    const data = await AsyncStorage.getItem(USER_RECIPES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erreur lors du chargement des recettes utilisateur:', error);
    return [];
  }
}

/**
 * Sauvegarde les recettes personnalisées
 */
export async function saveUserRecipes(recipes: Recipe[]): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_RECIPES_KEY, JSON.stringify(recipes));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des recettes utilisateur:', error);
  }
}

/**
 * Ajoute une nouvelle recette personnalisée
 */
export async function addUserRecipe(recipe: Omit<Recipe, 'id' | 'isUserRecipe' | 'createdAt'>): Promise<Recipe> {
  const userRecipes = await loadUserRecipes();

  const newRecipe: Recipe = {
    ...recipe,
    id: `user_${Date.now()}`,
    isUserRecipe: true,
    createdAt: new Date().toISOString(),
  };

  userRecipes.push(newRecipe);
  await saveUserRecipes(userRecipes);

  return newRecipe;
}

/**
 * Met à jour une recette personnalisée
 */
export async function updateUserRecipe(recipeId: string, updates: Partial<Recipe>): Promise<Recipe | null> {
  const userRecipes = await loadUserRecipes();
  const index = userRecipes.findIndex(r => r.id === recipeId);

  if (index === -1) return null;

  userRecipes[index] = { ...userRecipes[index], ...updates };
  await saveUserRecipes(userRecipes);

  return userRecipes[index];
}

/**
 * Supprime une recette personnalisée
 */
export async function deleteUserRecipe(recipeId: string): Promise<boolean> {
  const userRecipes = await loadUserRecipes();
  const filteredRecipes = userRecipes.filter(r => r.id !== recipeId);

  if (filteredRecipes.length === userRecipes.length) return false;

  await saveUserRecipes(filteredRecipes);
  return true;
}

/**
 * Récupère toutes les recettes (intégrées + utilisateur)
 */
export async function getAllRecipesWithUser(): Promise<Recipe[]> {
  const userRecipes = await loadUserRecipes();
  return [...RECIPES_DATABASE, ...userRecipes];
}

/**
 * Trouve les recettes possibles incluant les recettes utilisateur
 */
export async function findMatchingRecipesWithUser(foodItems: FoodItem[]): Promise<RecipeMatch[]> {
  // Filtrer les aliments actifs uniquement
  const activeItems = foodItems.filter(item => item.status !== 'consumed' && item.status !== 'thrown');
  const availableFoods = activeItems.map(item => item.name);

  // Récupérer toutes les recettes (intégrées + utilisateur)
  const allRecipes = await getAllRecipesWithUser();
  const matches: RecipeMatch[] = [];

  for (const recipe of allRecipes) {
    const matchingIngredients: string[] = [];
    const missingIngredients: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const found = availableFoods.some(food => ingredientMatches(food, ingredient));

      if (found) {
        matchingIngredients.push(ingredient);
      } else {
        missingIngredients.push(ingredient);
      }
    }

    // Calculer le pourcentage de correspondance
    const matchPercentage = Math.round((matchingIngredients.length / recipe.ingredients.length) * 100);

    // Ne garder que les recettes avec au moins 30% de correspondance
    if (matchPercentage >= 30) {
      matches.push({
        recipe,
        matchingIngredients,
        missingIngredients,
        matchPercentage,
      });
    }
  }

  // Trier par pourcentage de correspondance décroissant
  return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

// Liste des emojis disponibles pour les recettes
export const RECIPE_EMOJIS = [
  '🍳', '🥗', '🍝', '🍕', '🍔', '🌮', '🌯', '🥙', '🥘', '🍲',
  '🍜', '🍛', '🍣', '🍱', '🥟', '🍤', '🍗', '🥩', '🥓', '🧀',
  '🥞', '🧇', '🥐', '🍞', '🥖', '🥯', '🥨', '🧁', '🍰', '🎂',
  '🍮', '🍩', '🍪', '🍫', '🍬', '🍭', '🍯', '🥤', '🧃', '🥛',
  '☕', '🍵', '🧊', '🍹', '🍸', '🥂', '🍷', '🥃', '🍺', '🍻',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🥝', '🍑',
  '🥑', '🥦', '🥕', '🌽', '🥔', '🍆', '🌶️', '🥒', '🥬', '🧄',
];
