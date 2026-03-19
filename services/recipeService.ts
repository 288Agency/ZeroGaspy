// ============================================
// RECIPE SERVICE
// Suggestions de recettes basées sur les aliments disponibles
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '../types';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import logger from '../utils/logger';

const USER_RECIPES_KEY = 'user_recipes';

// Seuil minimum de correspondance pour suggérer une recette (en %)
// 50% = L'utilisateur doit avoir au moins la moitié des ingrédients
const MIN_MATCH_THRESHOLD = 50;

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  preparationTime: number; // en minutes
  difficulty: 'facile' | 'moyen' | 'difficile';
  category: 'entrée' | 'plat' | 'dessert' | 'snack' | 'boisson' | 'petit-déjeuner';
  imageEmoji: string;
  instructions: string[];
  tips?: string;
  isUserRecipe?: boolean; // true si c'est une recette ajoutée par l'utilisateur
  createdAt?: string; // date de création pour les recettes utilisateur
  tags?: string[]; // tags additionnels: végétarien, rapide, healthy, etc.
}

export interface RecipeMatch {
  recipe: Recipe;
  matchingIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  urgencyScore: number;
  expiringIngredients: string[];
}

// Base de données de recettes
const RECIPES_DATABASE: Recipe[] = [
  // ============================================
  // PETIT-DÉJEUNER
  // ============================================
  {
    id: '1',
    name: 'Oeufs brouillés',
    description: 'Des oeufs brouillés crémeux et savoureux',
    ingredients: ['oeufs', 'beurre', 'lait', 'ciboulette'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🍳',
    instructions: [
      'Battre les oeufs avec le lait',
      'Faire fondre le beurre dans une poêle',
      'Verser les oeufs et remuer doucement',
      'Retirer du feu quand encore crémeux',
      'Parsemer de ciboulette'
    ],
    tags: ['rapide', 'protéiné']
  },
  {
    id: '2',
    name: 'Pancakes moelleux',
    description: 'Des pancakes américains pour un brunch parfait',
    ingredients: ['farine', 'oeufs', 'lait', 'beurre', 'sucre', 'levure'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🥞',
    instructions: [
      'Mélanger les ingrédients secs',
      'Ajouter le lait et les oeufs',
      'Incorporer le beurre fondu',
      'Cuire à la poêle par petites louches',
      'Retourner quand des bulles apparaissent',
      'Servir avec du sirop d\'érable'
    ],
    tags: ['sucré', 'brunch']
  },
  {
    id: '3',
    name: 'Smoothie bowl',
    description: 'Un bol de smoothie garni de fruits et granola',
    ingredients: ['banane', 'fruits rouges', 'yaourt', 'granola', 'miel'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🥣',
    instructions: [
      'Mixer la banane congelée avec les fruits rouges',
      'Ajouter le yaourt et mixer',
      'Verser dans un bol',
      'Garnir de granola et fruits frais',
      'Arroser de miel'
    ],
    tags: ['healthy', 'végétarien', 'rapide']
  },
  {
    id: '4',
    name: 'Tartines complètes',
    description: 'Tartines gourmandes pour bien commencer la journée',
    ingredients: ['pain', 'avocat', 'oeufs', 'saumon fumé', 'fromage frais'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🥪',
    instructions: [
      'Toaster le pain',
      'Écraser l\'avocat',
      'Cuire les oeufs au plat',
      'Assembler les tartines',
      'Ajouter le saumon et le fromage frais'
    ],
    tags: ['protéiné', 'complet']
  },
  {
    id: '5',
    name: 'Porridge aux fruits',
    description: 'Un porridge onctueux et réconfortant',
    ingredients: ['flocons d\'avoine', 'lait', 'banane', 'miel', 'cannelle'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🥣',
    instructions: [
      'Chauffer le lait avec les flocons',
      'Remuer jusqu\'à épaississement',
      'Ajouter la cannelle',
      'Garnir de banane et miel',
      'Servir chaud'
    ],
    tags: ['healthy', 'végétarien', 'réconfortant']
  },
  {
    id: '6',
    name: 'French toast',
    description: 'Pain perdu à la française',
    ingredients: ['pain', 'oeufs', 'lait', 'sucre', 'beurre', 'cannelle'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🍞',
    instructions: [
      'Battre les oeufs avec le lait et le sucre',
      'Tremper les tranches de pain',
      'Faire dorer au beurre',
      'Saupoudrer de cannelle',
      'Servir avec des fruits'
    ],
    tags: ['sucré', 'brunch']
  },

  // ============================================
  // ENTRÉES
  // ============================================
  {
    id: '7',
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
    id: '8',
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
    ],
    tags: ['végétarien', 'healthy']
  },
  {
    id: '9',
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
    ],
    tags: ['végétarien', 'healthy', 'été']
  },
  {
    id: '10',
    name: 'Bruschetta',
    description: 'Tartines italiennes aux tomates fraîches',
    ingredients: ['pain', 'tomate', 'ail', 'basilic', 'huile d\'olive'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🍅',
    instructions: [
      'Griller les tranches de pain',
      'Frotter avec l\'ail',
      'Couper les tomates en dés',
      'Mélanger avec le basilic et l\'huile',
      'Garnir les tartines'
    ],
    tags: ['végétarien', 'italien', 'rapide']
  },
  {
    id: '11',
    name: 'Velouté de potiron',
    description: 'Une soupe automnale onctueuse',
    ingredients: ['potiron', 'oignon', 'crème', 'muscade', 'beurre'],
    preparationTime: 35,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🎃',
    instructions: [
      'Faire revenir l\'oignon',
      'Ajouter le potiron en cubes',
      'Couvrir d\'eau et cuire 20 min',
      'Mixer finement',
      'Ajouter la crème et la muscade'
    ],
    tags: ['végétarien', 'automne', 'réconfortant']
  },
  {
    id: '12',
    name: 'Salade grecque',
    description: 'Fraîcheur méditerranéenne',
    ingredients: ['tomate', 'concombre', 'feta', 'oignon', 'olives', 'huile d\'olive'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🥗',
    instructions: [
      'Couper les tomates et le concombre',
      'Émincer l\'oignon rouge',
      'Ajouter les olives et la feta',
      'Assaisonner à l\'huile d\'olive',
      'Ajouter de l\'origan'
    ],
    tags: ['végétarien', 'méditerranéen', 'healthy']
  },
  {
    id: '13',
    name: 'Houmous maison',
    description: 'Crème de pois chiches libanaise',
    ingredients: ['pois chiches', 'tahini', 'citron', 'ail', 'huile d\'olive'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🧆',
    instructions: [
      'Égoutter les pois chiches',
      'Mixer avec le tahini et l\'ail',
      'Ajouter le jus de citron',
      'Incorporer l\'huile d\'olive',
      'Servir avec du pain pita'
    ],
    tags: ['végétarien', 'vegan', 'oriental']
  },
  {
    id: '14',
    name: 'Soupe miso',
    description: 'Soupe japonaise traditionnelle',
    ingredients: ['miso', 'tofu', 'algues', 'oignon vert', 'champignons'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🍜',
    instructions: [
      'Chauffer l\'eau',
      'Ajouter les algues et champignons',
      'Délayer le miso',
      'Ajouter le tofu en dés',
      'Garnir d\'oignon vert'
    ],
    tags: ['végétarien', 'japonais', 'léger']
  },

  // ============================================
  // PLATS PRINCIPAUX
  // ============================================
  {
    id: '15',
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
    tips: 'Ajoutez des herbes fraîches pour plus de saveur',
    tags: ['rapide', 'végétarien']
  },
  {
    id: '16',
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
    ],
    tags: ['italien', 'classique']
  },
  {
    id: '17',
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
    ],
    tags: ['italien', 'végétarien']
  },
  {
    id: '18',
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
    ],
    tags: ['familial', 'classique']
  },
  {
    id: '19',
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
    ],
    tags: ['français', 'classique']
  },
  {
    id: '20',
    name: 'Burger maison',
    description: 'Un burger fait maison avec tous les garnitures',
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
    ],
    tags: ['américain', 'rapide']
  },
  {
    id: '21',
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
    ],
    tags: ['végétarien', 'léger']
  },
  {
    id: '22',
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
    ],
    tags: ['italien', 'familial']
  },
  {
    id: '23',
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
    ],
    tags: ['rapide', 'mexicain']
  },
  {
    id: '24',
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
    ],
    tags: ['italien', 'familial']
  },
  {
    id: '25',
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
    ],
    tags: ['asiatique', 'végétarien']
  },
  {
    id: '26',
    name: 'Curry de poulet',
    description: 'Un curry indien onctueux et parfumé',
    ingredients: ['poulet', 'oignon', 'tomate', 'lait de coco', 'curry', 'riz'],
    preparationTime: 40,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍛',
    instructions: [
      'Faire revenir l\'oignon',
      'Ajouter le poulet et dorer',
      'Incorporer le curry et les tomates',
      'Verser le lait de coco',
      'Laisser mijoter 25 minutes',
      'Servir avec du riz'
    ],
    tags: ['indien', 'épicé']
  },
  {
    id: '27',
    name: 'Tacos mexicains',
    description: 'Des tacos garnis comme au Mexique',
    ingredients: ['tortilla', 'viande hachée', 'tomate', 'salade', 'fromage', 'crème'],
    preparationTime: 25,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🌮',
    instructions: [
      'Cuire la viande avec les épices',
      'Préparer la salsa',
      'Réchauffer les tortillas',
      'Garnir de viande et légumes',
      'Ajouter fromage et crème'
    ],
    tags: ['mexicain', 'épicé']
  },
  {
    id: '28',
    name: 'Pad Thaï',
    description: 'Nouilles sautées thaïlandaises',
    ingredients: ['nouilles de riz', 'crevettes', 'oeufs', 'cacahuètes', 'citron vert', 'sauce soja'],
    preparationTime: 30,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍜',
    instructions: [
      'Faire tremper les nouilles',
      'Sauter les crevettes',
      'Ajouter les oeufs brouillés',
      'Incorporer les nouilles',
      'Assaisonner et ajouter les cacahuètes',
      'Servir avec du citron vert'
    ],
    tags: ['thaï', 'asiatique']
  },
  {
    id: '29',
    name: 'Lasagnes',
    description: 'Lasagnes gratinées à la bolognaise',
    ingredients: ['pâtes à lasagne', 'viande hachée', 'tomate', 'béchamel', 'fromage'],
    preparationTime: 60,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍝',
    instructions: [
      'Préparer la sauce bolognaise',
      'Préparer la béchamel',
      'Alterner les couches de pâtes et sauces',
      'Terminer par du fromage',
      'Cuire au four 40 minutes'
    ],
    tags: ['italien', 'familial']
  },
  {
    id: '30',
    name: 'Ratatouille',
    description: 'Mijoté de légumes provençal',
    ingredients: ['courgette', 'aubergine', 'poivron', 'tomate', 'oignon', 'ail'],
    preparationTime: 50,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍆',
    instructions: [
      'Couper tous les légumes en dés',
      'Faire revenir l\'oignon et l\'ail',
      'Ajouter les légumes par étapes',
      'Assaisonner avec les herbes de Provence',
      'Laisser mijoter 30 minutes'
    ],
    tags: ['végétarien', 'provençal', 'healthy']
  },
  {
    id: '31',
    name: 'Chili con carne',
    description: 'Ragoût épicé tex-mex',
    ingredients: ['viande hachée', 'haricots rouges', 'tomate', 'oignon', 'poivron', 'épices'],
    preparationTime: 45,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🌶️',
    instructions: [
      'Faire revenir la viande',
      'Ajouter l\'oignon et le poivron',
      'Incorporer les tomates et haricots',
      'Assaisonner avec les épices',
      'Laisser mijoter 30 minutes'
    ],
    tags: ['mexicain', 'épicé']
  },
  {
    id: '32',
    name: 'Poulet teriyaki',
    description: 'Poulet glacé à la japonaise',
    ingredients: ['poulet', 'sauce soja', 'miel', 'gingembre', 'ail', 'riz'],
    preparationTime: 25,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍗',
    instructions: [
      'Mélanger sauce soja, miel et gingembre',
      'Faire mariner le poulet',
      'Cuire le poulet à la poêle',
      'Glacer avec la sauce',
      'Servir avec du riz'
    ],
    tags: ['japonais', 'asiatique']
  },
  {
    id: '33',
    name: 'Gratin dauphinois',
    description: 'Gratin de pommes de terre crémeux',
    ingredients: ['pomme de terre', 'crème', 'lait', 'ail', 'muscade'],
    preparationTime: 60,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🥔',
    instructions: [
      'Couper les pommes de terre en rondelles',
      'Frotter le plat à l\'ail',
      'Alterner pommes de terre et crème',
      'Saupoudrer de muscade',
      'Cuire au four 45 minutes'
    ],
    tags: ['français', 'végétarien']
  },
  {
    id: '34',
    name: 'Saumon grillé',
    description: 'Pavé de saumon et ses légumes',
    ingredients: ['saumon', 'citron', 'ail', 'brocoli', 'huile d\'olive'],
    preparationTime: 25,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🐟',
    instructions: [
      'Assaisonner le saumon',
      'Griller à la poêle 4 min par côté',
      'Cuire les brocolis à la vapeur',
      'Arroser de citron',
      'Servir immédiatement'
    ],
    tags: ['healthy', 'poisson', 'rapide']
  },
  {
    id: '35',
    name: 'Couscous végétarien',
    description: 'Couscous aux légumes et pois chiches',
    ingredients: ['semoule', 'pois chiches', 'carotte', 'courgette', 'navet', 'épices'],
    preparationTime: 45,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🥘',
    instructions: [
      'Préparer le bouillon aux épices',
      'Cuire les légumes dans le bouillon',
      'Cuire la semoule à la vapeur',
      'Ajouter les pois chiches',
      'Servir avec la sauce'
    ],
    tags: ['végétarien', 'maghrébin']
  },
  {
    id: '36',
    name: 'Poke bowl',
    description: 'Bowl hawaïen au poisson cru',
    ingredients: ['riz', 'saumon', 'avocat', 'concombre', 'sauce soja', 'sésame'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍣',
    instructions: [
      'Cuire le riz',
      'Couper le saumon en cubes',
      'Préparer les légumes',
      'Assembler dans un bol',
      'Arroser de sauce et sésame'
    ],
    tags: ['hawaïen', 'healthy', 'poisson']
  },
  {
    id: '37',
    name: 'Shakshuka',
    description: 'Oeufs pochés dans une sauce tomate épicée',
    ingredients: ['oeufs', 'tomate', 'poivron', 'oignon', 'ail', 'épices'],
    preparationTime: 25,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍳',
    instructions: [
      'Faire revenir oignon et poivron',
      'Ajouter les tomates et épices',
      'Laisser mijoter',
      'Créer des puits et casser les oeufs',
      'Couvrir et cuire 5-7 minutes'
    ],
    tags: ['oriental', 'végétarien']
  },
  {
    id: '38',
    name: 'Boeuf bourguignon',
    description: 'Ragoût de boeuf au vin rouge',
    ingredients: ['boeuf', 'vin rouge', 'carotte', 'oignon', 'champignons', 'lardons'],
    preparationTime: 120,
    difficulty: 'difficile',
    category: 'plat',
    imageEmoji: '🥩',
    instructions: [
      'Faire mariner le boeuf dans le vin',
      'Faire revenir les lardons',
      'Saisir la viande',
      'Ajouter légumes et vin',
      'Mijoter 2h à feu doux'
    ],
    tags: ['français', 'mijoté']
  },
  {
    id: '39',
    name: 'Fajitas au poulet',
    description: 'Fajitas avec légumes grillés',
    ingredients: ['poulet', 'tortilla', 'poivron', 'oignon', 'crème', 'fromage'],
    preparationTime: 30,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🌮',
    instructions: [
      'Émincer le poulet et les légumes',
      'Faire sauter avec les épices',
      'Réchauffer les tortillas',
      'Garnir avec la préparation',
      'Ajouter crème et fromage'
    ],
    tags: ['mexicain', 'rapide']
  },
  {
    id: '40',
    name: 'Wok de légumes',
    description: 'Légumes croquants sautés au wok',
    ingredients: ['brocoli', 'carotte', 'poivron', 'oignon', 'sauce soja', 'gingembre'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🥦',
    instructions: [
      'Couper tous les légumes',
      'Chauffer le wok à feu vif',
      'Sauter les légumes rapidement',
      'Ajouter la sauce soja',
      'Servir avec du riz ou des nouilles'
    ],
    tags: ['végétarien', 'asiatique', 'healthy', 'rapide']
  },
  {
    id: '41',
    name: 'Croque-monsieur',
    description: 'Sandwich grillé au jambon et fromage',
    ingredients: ['pain de mie', 'jambon', 'fromage', 'beurre', 'béchamel'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🥪',
    instructions: [
      'Beurrer les tranches de pain',
      'Garnir de jambon et fromage',
      'Ajouter la béchamel',
      'Fermer et griller',
      'Servir chaud'
    ],
    tags: ['français', 'rapide']
  },
  {
    id: '42',
    name: 'Buddha bowl',
    description: 'Bol équilibré et coloré',
    ingredients: ['quinoa', 'pois chiches', 'avocat', 'carotte', 'chou rouge', 'sauce tahini'],
    preparationTime: 30,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🥗',
    instructions: [
      'Cuire le quinoa',
      'Rôtir les pois chiches',
      'Préparer les légumes',
      'Assembler dans un bol',
      'Arroser de sauce tahini'
    ],
    tags: ['végétarien', 'vegan', 'healthy']
  },

  // ============================================
  // SNACKS
  // ============================================
  {
    id: '43',
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
    ],
    tags: ['healthy', 'rapide', 'végétarien']
  },
  {
    id: '44',
    name: 'Guacamole',
    description: 'Dip mexicain à l\'avocat',
    ingredients: ['avocat', 'tomate', 'oignon', 'citron vert', 'coriandre'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🥑',
    instructions: [
      'Écraser les avocats',
      'Couper tomate et oignon en dés',
      'Mélanger tous les ingrédients',
      'Ajouter le jus de citron',
      'Servir avec des chips'
    ],
    tags: ['mexicain', 'végétarien', 'vegan']
  },
  {
    id: '45',
    name: 'Chips de légumes',
    description: 'Chips maison croustillantes',
    ingredients: ['betterave', 'patate douce', 'carotte', 'huile', 'sel'],
    preparationTime: 30,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🥔',
    instructions: [
      'Trancher finement les légumes',
      'Badigeonner d\'huile',
      'Enfourner à 180°C',
      'Cuire jusqu\'à croustillant',
      'Saler et servir'
    ],
    tags: ['végétarien', 'vegan', 'healthy']
  },
  {
    id: '46',
    name: 'Energy balls',
    description: 'Boules d\'énergie aux dattes',
    ingredients: ['dattes', 'flocons d\'avoine', 'beurre de cacahuète', 'chocolat', 'noix de coco'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🍫',
    instructions: [
      'Mixer les dattes',
      'Ajouter les autres ingrédients',
      'Former des boules',
      'Rouler dans la noix de coco',
      'Réfrigérer 30 minutes'
    ],
    tags: ['végétarien', 'healthy', 'sans cuisson']
  },

  // ============================================
  // DESSERTS
  // ============================================
  {
    id: '47',
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
    id: '48',
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
    ],
    tags: ['healthy', 'végétarien']
  },
  {
    id: '49',
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
    ],
    tags: ['français', 'classique']
  },
  {
    id: '50',
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
  {
    id: '51',
    name: 'Mousse au chocolat',
    description: 'Mousse légère et aérienne',
    ingredients: ['chocolat', 'oeufs', 'sucre', 'beurre'],
    preparationTime: 20,
    difficulty: 'moyen',
    category: 'dessert',
    imageEmoji: '🍫',
    instructions: [
      'Faire fondre le chocolat',
      'Séparer les blancs des jaunes',
      'Mélanger jaunes et chocolat',
      'Monter les blancs en neige',
      'Incorporer délicatement',
      'Réfrigérer 4h minimum'
    ],
    tags: ['français', 'classique']
  },
  {
    id: '52',
    name: 'Tiramisu',
    description: 'Dessert italien au café et mascarpone',
    ingredients: ['mascarpone', 'oeufs', 'sucre', 'café', 'biscuits', 'cacao'],
    preparationTime: 30,
    difficulty: 'moyen',
    category: 'dessert',
    imageEmoji: '☕',
    instructions: [
      'Préparer le café et le laisser refroidir',
      'Battre les jaunes avec le sucre',
      'Incorporer le mascarpone',
      'Monter les blancs et les incorporer',
      'Tremper les biscuits dans le café',
      'Alterner couches de crème et biscuits',
      'Saupoudrer de cacao'
    ],
    tags: ['italien', 'sans cuisson']
  },
  {
    id: '53',
    name: 'Fondant au chocolat',
    description: 'Gâteau au coeur coulant',
    ingredients: ['chocolat', 'beurre', 'oeufs', 'sucre', 'farine'],
    preparationTime: 25,
    difficulty: 'moyen',
    category: 'dessert',
    imageEmoji: '🍫',
    instructions: [
      'Faire fondre chocolat et beurre',
      'Battre oeufs et sucre',
      'Mélanger les deux préparations',
      'Ajouter la farine',
      'Cuire 10-12 minutes à 200°C'
    ],
    tips: 'Le coeur doit rester coulant'
  },
  {
    id: '54',
    name: 'Panna cotta',
    description: 'Crème italienne aux fruits rouges',
    ingredients: ['crème', 'lait', 'sucre', 'gélatine', 'vanille', 'fruits rouges'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍮',
    instructions: [
      'Faire tremper la gélatine',
      'Chauffer crème, lait et sucre',
      'Incorporer la gélatine',
      'Verser dans des ramequins',
      'Réfrigérer 4h',
      'Démouler et servir avec les fruits'
    ],
    tags: ['italien', 'élégant']
  },
  {
    id: '55',
    name: 'Clafoutis aux cerises',
    description: 'Dessert moelleux aux cerises',
    ingredients: ['cerises', 'oeufs', 'farine', 'lait', 'sucre', 'beurre'],
    preparationTime: 45,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍒',
    instructions: [
      'Disposer les cerises dans un plat beurré',
      'Battre les oeufs avec le sucre',
      'Ajouter farine et lait',
      'Verser sur les cerises',
      'Cuire 35-40 minutes'
    ],
    tags: ['français', 'été']
  },
  {
    id: '56',
    name: 'Crumble aux pommes',
    description: 'Dessert croustillant aux fruits',
    ingredients: ['pomme', 'farine', 'beurre', 'sucre', 'cannelle'],
    preparationTime: 40,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍎',
    instructions: [
      'Couper les pommes en morceaux',
      'Les disposer dans un plat',
      'Sabler farine, beurre et sucre',
      'Parsemer sur les pommes',
      'Cuire 30 minutes à 180°C'
    ],
    tags: ['anglais', 'automne']
  },

  // ============================================
  // BOISSONS
  // ============================================
  {
    id: '57',
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
    ],
    tags: ['healthy', 'végétarien', 'rapide']
  },
  {
    id: '58',
    name: 'Smoothie vert',
    description: 'Smoothie détox aux épinards',
    ingredients: ['épinards', 'banane', 'pomme', 'gingembre', 'citron'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '🥬',
    instructions: [
      'Laver les épinards',
      'Couper les fruits',
      'Mixer tous les ingrédients',
      'Ajouter de l\'eau si nécessaire',
      'Servir immédiatement'
    ],
    tags: ['healthy', 'vegan', 'détox']
  },
  {
    id: '59',
    name: 'Chocolat chaud',
    description: 'Chocolat chaud onctueux maison',
    ingredients: ['chocolat', 'lait', 'sucre', 'crème', 'cannelle'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '☕',
    instructions: [
      'Chauffer le lait',
      'Ajouter le chocolat râpé',
      'Remuer jusqu\'à fonte complète',
      'Ajouter la crème fouettée',
      'Saupoudrer de cannelle'
    ],
    tags: ['réconfortant', 'hiver']
  },
  {
    id: '60',
    name: 'Limonade maison',
    description: 'Limonade fraîche et désaltérante',
    ingredients: ['citron', 'sucre', 'eau', 'menthe', 'glaçons'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '🍋',
    instructions: [
      'Presser les citrons',
      'Dissoudre le sucre dans l\'eau chaude',
      'Mélanger jus et sirop',
      'Ajouter la menthe fraîche',
      'Servir très frais avec des glaçons'
    ],
    tags: ['été', 'rafraîchissant']
  },

  // ============================================
  // PETIT-DÉJEUNER (suite)
  // ============================================
  {
    id: '61',
    name: 'Granola maison',
    description: 'Céréales croustillantes au miel et noix',
    ingredients: ['flocons d\'avoine', 'miel', 'amandes', 'noix', 'huile de coco'],
    preparationTime: 35,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🥣',
    instructions: [
      'Mélanger les flocons avec le miel et l\'huile',
      'Ajouter les noix concassées',
      'Étaler sur une plaque de four',
      'Cuire 20 min à 160°C en remuant',
      'Laisser refroidir et conserver en bocal'
    ],
    tags: ['healthy', 'végétarien', 'batch cooking']
  },
  {
    id: '62',
    name: 'Açaí bowl',
    description: 'Bowl brésilien aux superfruits',
    ingredients: ['açaí', 'banane', 'fruits rouges', 'granola', 'noix de coco'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🫐',
    instructions: [
      'Mixer l\'açaí congelé avec la banane',
      'Verser dans un bol',
      'Garnir de fruits rouges et granola',
      'Parsemer de noix de coco râpée',
      'Servir immédiatement'
    ],
    tags: ['healthy', 'vegan', 'superfood']
  },
  {
    id: '63',
    name: 'Croque madame',
    description: 'Croque-monsieur avec un oeuf sur le dessus',
    ingredients: ['pain de mie', 'jambon', 'fromage', 'oeufs', 'beurre', 'béchamel'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🥪',
    instructions: [
      'Préparer le croque-monsieur classique',
      'Griller au four avec la béchamel',
      'Faire cuire un oeuf au plat',
      'Poser l\'oeuf sur le croque',
      'Servir chaud'
    ],
    tags: ['français', 'brunch']
  },
  {
    id: '64',
    name: 'Overnight oats',
    description: 'Flocons d\'avoine préparés la veille',
    ingredients: ['flocons d\'avoine', 'lait', 'yaourt', 'fruits rouges', 'miel'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'petit-déjeuner',
    imageEmoji: '🥣',
    instructions: [
      'Mélanger les flocons avec le lait et le yaourt',
      'Ajouter le miel',
      'Couvrir et réfrigérer toute la nuit',
      'Le matin, garnir de fruits frais',
      'Déguster froid'
    ],
    tags: ['healthy', 'sans cuisson', 'rapide']
  },

  // ============================================
  // ENTRÉES (suite)
  // ============================================
  {
    id: '65',
    name: 'Tabboulé libanais',
    description: 'Salade de boulgour aux herbes fraîches',
    ingredients: ['boulgour', 'persil', 'tomate', 'oignon', 'citron', 'menthe'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🥗',
    instructions: [
      'Faire gonfler le boulgour dans l\'eau',
      'Hacher finement le persil et la menthe',
      'Couper les tomates en dés',
      'Mélanger le tout',
      'Assaisonner avec le jus de citron et l\'huile'
    ],
    tags: ['libanais', 'végétarien', 'été']
  },
  {
    id: '66',
    name: 'Soupe à l\'oignon',
    description: 'Soupe gratinée à la française',
    ingredients: ['oignon', 'beurre', 'vin blanc', 'pain', 'fromage'],
    preparationTime: 45,
    difficulty: 'moyen',
    category: 'entrée',
    imageEmoji: '🧅',
    instructions: [
      'Émincer finement les oignons',
      'Les faire caraméliser dans le beurre',
      'Déglacer au vin blanc',
      'Ajouter le bouillon et cuire 20 min',
      'Servir avec pain et fromage gratiné'
    ],
    tags: ['français', 'hiver', 'réconfortant']
  },
  {
    id: '67',
    name: 'Salade de chèvre chaud',
    description: 'Salade avec toasts de chèvre fondant',
    ingredients: ['salade', 'chèvre', 'pain', 'miel', 'noix', 'tomate'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🥗',
    instructions: [
      'Déposer le chèvre sur des toasts',
      'Passer au four 5 min',
      'Préparer la salade',
      'Disposer les toasts chauds',
      'Arroser de miel et ajouter les noix'
    ],
    tags: ['français', 'végétarien']
  },
  {
    id: '68',
    name: 'Tzatziki',
    description: 'Dip grec au concombre et yaourt',
    ingredients: ['yaourt', 'concombre', 'ail', 'menthe', 'huile d\'olive', 'citron'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🥒',
    instructions: [
      'Râper le concombre et l\'égoutter',
      'Mélanger avec le yaourt',
      'Ajouter l\'ail haché et la menthe',
      'Arroser d\'huile d\'olive et de citron',
      'Réfrigérer 30 min avant de servir'
    ],
    tags: ['grec', 'végétarien', 'rapide']
  },
  {
    id: '69',
    name: 'Velouté de carottes',
    description: 'Soupe douce et orangée',
    ingredients: ['carotte', 'oignon', 'pomme de terre', 'crème', 'cumin'],
    preparationTime: 30,
    difficulty: 'facile',
    category: 'entrée',
    imageEmoji: '🥕',
    instructions: [
      'Faire revenir l\'oignon',
      'Ajouter carottes et pomme de terre en morceaux',
      'Couvrir d\'eau et cuire 20 min',
      'Mixer finement',
      'Ajouter la crème et le cumin'
    ],
    tags: ['végétarien', 'hiver', 'réconfortant']
  },

  // ============================================
  // PLATS PRINCIPAUX (suite)
  // ============================================
  {
    id: '70',
    name: 'Blanquette de veau',
    description: 'Ragoût de veau à la crème',
    ingredients: ['veau', 'carotte', 'poireau', 'champignons', 'crème', 'citron'],
    preparationTime: 90,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🥘',
    instructions: [
      'Couper le veau en morceaux',
      'Le faire pocher dans l\'eau',
      'Ajouter les légumes coupés',
      'Cuire 1h à feu doux',
      'Préparer la sauce avec la crème et le citron',
      'Servir avec du riz'
    ],
    tags: ['français', 'classique', 'mijoté']
  },
  {
    id: '71',
    name: 'Hachis parmentier',
    description: 'Gratin de viande hachée et purée',
    ingredients: ['viande hachée', 'pomme de terre', 'oignon', 'fromage', 'crème'],
    preparationTime: 50,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🥔',
    instructions: [
      'Préparer une purée de pommes de terre',
      'Faire revenir la viande avec l\'oignon',
      'Disposer la viande dans un plat à gratin',
      'Recouvrir de purée',
      'Parsemer de fromage et gratiner 20 min'
    ],
    tags: ['français', 'familial', 'réconfortant']
  },
  {
    id: '72',
    name: 'Gratin de pâtes',
    description: 'Pâtes gratinées au fromage',
    ingredients: ['pâtes', 'béchamel', 'fromage', 'jambon', 'muscade'],
    preparationTime: 35,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍝',
    instructions: [
      'Cuire les pâtes al dente',
      'Préparer la béchamel',
      'Mélanger pâtes, béchamel et jambon',
      'Verser dans un plat, couvrir de fromage',
      'Gratiner 15 min au four'
    ],
    tags: ['familial', 'réconfortant']
  },
  {
    id: '73',
    name: 'Poulet basquaise',
    description: 'Poulet mijoté aux poivrons et tomates',
    ingredients: ['poulet', 'poivron', 'tomate', 'oignon', 'ail', 'piment'],
    preparationTime: 55,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍗',
    instructions: [
      'Faire dorer les morceaux de poulet',
      'Réserver et faire revenir les poivrons',
      'Ajouter les tomates et l\'oignon',
      'Remettre le poulet',
      'Laisser mijoter 40 min'
    ],
    tags: ['français', 'basque']
  },
  {
    id: '74',
    name: 'Tajine d\'agneau',
    description: 'Tajine aux pruneaux et amandes',
    ingredients: ['agneau', 'pruneaux', 'amandes', 'oignon', 'miel', 'épices'],
    preparationTime: 90,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🥘',
    instructions: [
      'Faire revenir l\'agneau',
      'Ajouter les oignons et épices',
      'Couvrir d\'eau et mijoter 1h',
      'Ajouter pruneaux et miel',
      'Cuire encore 20 min',
      'Garnir d\'amandes grillées'
    ],
    tags: ['marocain', 'mijoté']
  },
  {
    id: '75',
    name: 'Galette bretonne complète',
    description: 'Crêpe de sarrasin garnie',
    ingredients: ['farine de sarrasin', 'oeufs', 'jambon', 'fromage', 'beurre'],
    preparationTime: 20,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🥞',
    instructions: [
      'Préparer la pâte à galette',
      'Cuire la galette sur une crêpière',
      'Garnir de jambon et fromage',
      'Casser un oeuf au centre',
      'Replier les bords et servir'
    ],
    tags: ['français', 'breton']
  },
  {
    id: '76',
    name: 'Poulet au citron',
    description: 'Poulet rôti parfumé au citron et herbes',
    ingredients: ['poulet', 'citron', 'ail', 'romarin', 'huile d\'olive', 'pomme de terre'],
    preparationTime: 50,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍋',
    instructions: [
      'Mariner le poulet avec citron et romarin',
      'Disposer dans un plat avec les pommes de terre',
      'Arroser d\'huile d\'olive',
      'Enfourner à 200°C pendant 40 min',
      'Arroser régulièrement du jus'
    ],
    tags: ['méditerranéen', 'familial']
  },
  {
    id: '77',
    name: 'Moules marinières',
    description: 'Moules au vin blanc classiques',
    ingredients: ['moules', 'vin blanc', 'oignon', 'ail', 'persil', 'beurre'],
    preparationTime: 25,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🦪',
    instructions: [
      'Nettoyer les moules',
      'Faire revenir l\'oignon et l\'ail dans le beurre',
      'Déglacer au vin blanc',
      'Ajouter les moules et couvrir',
      'Cuire 5-7 min jusqu\'à ouverture',
      'Parsemer de persil et servir avec des frites'
    ],
    tags: ['français', 'fruits de mer']
  },
  {
    id: '78',
    name: 'Tarte flambée',
    description: 'Flammekueche alsacienne',
    ingredients: ['pâte à pizza', 'crème fraîche', 'oignon', 'lardons', 'fromage blanc'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍕',
    instructions: [
      'Préchauffer le four à 250°C',
      'Étaler finement la pâte',
      'Mélanger crème et fromage blanc',
      'Étaler sur la pâte',
      'Ajouter oignons émincés et lardons',
      'Cuire 10-12 min'
    ],
    tags: ['alsacien', 'français', 'rapide']
  },
  {
    id: '79',
    name: 'Pot-au-feu',
    description: 'Bouilli de boeuf aux légumes d\'hiver',
    ingredients: ['boeuf', 'carotte', 'poireau', 'navet', 'pomme de terre', 'oignon'],
    preparationTime: 180,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍲',
    instructions: [
      'Mettre le boeuf dans l\'eau froide',
      'Porter à ébullition et écumer',
      'Ajouter les légumes par étapes',
      'Laisser mijoter 2h30 à feu doux',
      'Servir la viande avec les légumes et le bouillon'
    ],
    tags: ['français', 'classique', 'hiver', 'mijoté']
  },
  {
    id: '80',
    name: 'Escalope milanaise',
    description: 'Escalope panée à l\'italienne',
    ingredients: ['escalope de poulet', 'chapelure', 'oeufs', 'parmesan', 'citron'],
    preparationTime: 20,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍗',
    instructions: [
      'Aplatir les escalopes',
      'Paner: farine, oeuf, chapelure-parmesan',
      'Faire frire dans l\'huile chaude',
      'Égoutter sur du papier absorbant',
      'Servir avec du citron et des pâtes'
    ],
    tags: ['italien', 'rapide']
  },
  {
    id: '81',
    name: 'Dahl de lentilles',
    description: 'Curry de lentilles indien',
    ingredients: ['lentilles corail', 'oignon', 'tomate', 'lait de coco', 'curry', 'ail'],
    preparationTime: 35,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍛',
    instructions: [
      'Faire revenir l\'oignon et l\'ail',
      'Ajouter le curry et les tomates',
      'Incorporer les lentilles et le lait de coco',
      'Cuire 20-25 min',
      'Servir avec du riz et de la coriandre'
    ],
    tags: ['indien', 'végétarien', 'vegan', 'healthy']
  },
  {
    id: '82',
    name: 'Pâtes au pesto',
    description: 'Pâtes fraîches au pesto basilic',
    ingredients: ['pâtes', 'pesto', 'parmesan', 'tomates cerises', 'pignons de pin'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍝',
    instructions: [
      'Cuire les pâtes al dente',
      'Couper les tomates cerises en deux',
      'Égoutter les pâtes, mélanger avec le pesto',
      'Ajouter les tomates et les pignons',
      'Servir avec du parmesan râpé'
    ],
    tags: ['italien', 'rapide', 'végétarien']
  },
  {
    id: '83',
    name: 'Bibimbap',
    description: 'Bol coréen au riz et légumes',
    ingredients: ['riz', 'boeuf', 'carotte', 'courgette', 'oeufs', 'sauce soja'],
    preparationTime: 35,
    difficulty: 'moyen',
    category: 'plat',
    imageEmoji: '🍚',
    instructions: [
      'Cuire le riz',
      'Mariner et cuire le boeuf émincé',
      'Sauter chaque légume séparément',
      'Assembler dans un bol sur le riz',
      'Ajouter un oeuf au plat et la sauce'
    ],
    tags: ['coréen', 'asiatique']
  },
  {
    id: '84',
    name: 'Pâtes alla norma',
    description: 'Pâtes siciliennes aux aubergines',
    ingredients: ['pâtes', 'aubergine', 'tomate', 'ricotta', 'basilic', 'ail'],
    preparationTime: 30,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍆',
    instructions: [
      'Couper l\'aubergine en cubes et la faire frire',
      'Préparer la sauce tomate avec l\'ail',
      'Cuire les pâtes al dente',
      'Mélanger pâtes, sauce et aubergines',
      'Garnir de ricotta et basilic'
    ],
    tags: ['italien', 'végétarien', 'sicilien']
  },

  // ============================================
  // SNACKS (suite)
  // ============================================
  {
    id: '85',
    name: 'Cake salé',
    description: 'Cake aux olives et jambon',
    ingredients: ['farine', 'oeufs', 'huile', 'jambon', 'olives', 'fromage'],
    preparationTime: 50,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🧁',
    instructions: [
      'Mélanger farine, oeufs, huile et lait',
      'Couper le jambon et les olives',
      'Incorporer à la pâte avec le fromage',
      'Verser dans un moule à cake',
      'Cuire 40 min à 180°C'
    ],
    tags: ['français', 'pique-nique', 'apéritif']
  },
  {
    id: '86',
    name: 'Mini quiches',
    description: 'Petites quiches pour l\'apéritif',
    ingredients: ['pâte brisée', 'oeufs', 'crème', 'lardons', 'fromage'],
    preparationTime: 30,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🥧',
    instructions: [
      'Découper des ronds de pâte',
      'Les disposer dans des moules à muffins',
      'Mélanger oeufs, crème et lardons',
      'Remplir les fonds de tarte',
      'Cuire 15 min à 180°C'
    ],
    tags: ['français', 'apéritif']
  },
  {
    id: '87',
    name: 'Bâtonnets de légumes & houmous',
    description: 'Crudités avec trempette',
    ingredients: ['carotte', 'concombre', 'céleri', 'pois chiches', 'citron'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🥕',
    instructions: [
      'Couper les légumes en bâtonnets',
      'Préparer le houmous maison',
      'Disposer les crudités autour du dip',
      'Servir frais'
    ],
    tags: ['healthy', 'végétarien', 'vegan']
  },
  {
    id: '88',
    name: 'Pan con tomate',
    description: 'Toast espagnol à la tomate',
    ingredients: ['pain', 'tomate', 'ail', 'huile d\'olive', 'sel'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'snack',
    imageEmoji: '🍅',
    instructions: [
      'Griller le pain',
      'Frotter avec une gousse d\'ail',
      'Frotter avec une demi-tomate',
      'Arroser d\'huile d\'olive',
      'Saler et servir'
    ],
    tags: ['espagnol', 'rapide', 'végétarien']
  },

  // ============================================
  // DESSERTS (suite)
  // ============================================
  {
    id: '89',
    name: 'Gâteau au yaourt',
    description: 'Le gâteau le plus simple du monde',
    ingredients: ['yaourt', 'farine', 'sucre', 'oeufs', 'huile', 'levure'],
    preparationTime: 40,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍰',
    instructions: [
      'Verser le yaourt dans un saladier',
      'Utiliser le pot comme mesure',
      'Mélanger 3 pots de farine, 2 de sucre, 1 d\'huile',
      'Ajouter les oeufs et la levure',
      'Cuire 30 min à 180°C'
    ],
    tips: 'Le pot de yaourt sert de mesure pour tout !',
    tags: ['français', 'familial', 'classique']
  },
  {
    id: '90',
    name: 'Riz au lait',
    description: 'Dessert crémeux à la vanille',
    ingredients: ['riz', 'lait', 'sucre', 'vanille', 'cannelle'],
    preparationTime: 40,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍚',
    instructions: [
      'Rincer le riz',
      'Chauffer le lait avec la vanille',
      'Ajouter le riz et cuire à feu doux',
      'Remuer régulièrement pendant 30 min',
      'Sucrer et servir tiède ou froid'
    ],
    tags: ['français', 'réconfortant', 'classique']
  },
  {
    id: '91',
    name: 'Brownie',
    description: 'Gâteau au chocolat dense et fondant',
    ingredients: ['chocolat', 'beurre', 'sucre', 'oeufs', 'farine', 'noix'],
    preparationTime: 35,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍫',
    instructions: [
      'Faire fondre le chocolat et le beurre',
      'Battre les oeufs avec le sucre',
      'Mélanger les deux préparations',
      'Ajouter farine et noix',
      'Cuire 20-25 min à 180°C (le centre doit rester fondant)'
    ],
    tags: ['américain', 'chocolat']
  },
  {
    id: '92',
    name: 'Tarte au citron meringuée',
    description: 'Tarte acidulée couverte de meringue',
    ingredients: ['pâte sablée', 'citron', 'oeufs', 'sucre', 'beurre', 'maïzena'],
    preparationTime: 50,
    difficulty: 'difficile',
    category: 'dessert',
    imageEmoji: '🍋',
    instructions: [
      'Cuire le fond de tarte à blanc',
      'Préparer la crème au citron (curd)',
      'Verser sur le fond de tarte',
      'Monter les blancs en meringue',
      'Déposer la meringue et caraméliser au chalumeau'
    ],
    tags: ['français', 'pâtisserie', 'élégant']
  },
  {
    id: '93',
    name: 'Compote de pommes',
    description: 'Compote maison toute simple',
    ingredients: ['pomme', 'sucre', 'cannelle', 'citron'],
    preparationTime: 25,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '🍎',
    instructions: [
      'Éplucher et couper les pommes',
      'Les cuire à feu doux avec un peu d\'eau',
      'Ajouter le sucre et la cannelle',
      'Écraser ou mixer selon la texture voulue',
      'Arroser d\'un filet de citron'
    ],
    tags: ['français', 'healthy', 'enfant']
  },
  {
    id: '94',
    name: 'Île flottante',
    description: 'Blancs en neige sur crème anglaise',
    ingredients: ['oeufs', 'lait', 'sucre', 'vanille'],
    preparationTime: 30,
    difficulty: 'moyen',
    category: 'dessert',
    imageEmoji: '🍮',
    instructions: [
      'Préparer la crème anglaise avec jaunes, lait et sucre',
      'Monter les blancs en neige ferme',
      'Les pocher dans du lait chaud',
      'Déposer sur la crème anglaise',
      'Napper de caramel'
    ],
    tags: ['français', 'classique', 'élégant']
  },
  {
    id: '95',
    name: 'Mug cake chocolat',
    description: 'Gâteau express au micro-ondes',
    ingredients: ['farine', 'chocolat', 'oeufs', 'sucre', 'beurre'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'dessert',
    imageEmoji: '☕',
    instructions: [
      'Mélanger tous les ingrédients dans un mug',
      'Cuire 1 min 30 au micro-ondes',
      'Laisser tiédir 1 min',
      'Déguster directement dans le mug'
    ],
    tags: ['rapide', 'chocolat', 'express']
  },

  // ============================================
  // BOISSONS (suite)
  // ============================================
  {
    id: '96',
    name: 'Thé glacé pêche',
    description: 'Thé glacé rafraîchissant aux pêches',
    ingredients: ['thé', 'pêche', 'sucre', 'citron', 'menthe'],
    preparationTime: 15,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '🍑',
    instructions: [
      'Infuser le thé et le laisser refroidir',
      'Mixer les pêches',
      'Mélanger le thé, la purée de pêche et le sucre',
      'Ajouter le jus de citron',
      'Servir avec des glaçons et de la menthe'
    ],
    tags: ['été', 'rafraîchissant']
  },
  {
    id: '97',
    name: 'Milkshake vanille',
    description: 'Milkshake crémeux à la vanille',
    ingredients: ['glace', 'lait', 'vanille', 'crème chantilly'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '🥛',
    instructions: [
      'Mixer la glace avec le lait',
      'Ajouter la vanille',
      'Mixer jusqu\'à consistance lisse',
      'Servir avec de la chantilly'
    ],
    tags: ['sucré', 'rapide', 'américain']
  },
  {
    id: '98',
    name: 'Lassi à la mangue',
    description: 'Boisson indienne au yaourt et mangue',
    ingredients: ['mangue', 'yaourt', 'lait', 'sucre', 'cardamome'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '🥭',
    instructions: [
      'Mixer la mangue avec le yaourt',
      'Ajouter le lait et le sucre',
      'Parfumer à la cardamome',
      'Servir très frais'
    ],
    tags: ['indien', 'rafraîchissant']
  },
  {
    id: '99',
    name: 'Eau aromatisée concombre-menthe',
    description: 'Eau infusée détox et rafraîchissante',
    ingredients: ['concombre', 'menthe', 'citron', 'gingembre'],
    preparationTime: 5,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '💧',
    instructions: [
      'Couper le concombre en rondelles',
      'Ajouter les feuilles de menthe',
      'Presser le citron et râper le gingembre',
      'Verser de l\'eau fraîche',
      'Laisser infuser 30 min au frigo'
    ],
    tags: ['détox', 'healthy', 'été']
  },
  {
    id: '100',
    name: 'Chaï latte',
    description: 'Thé épicé indien au lait',
    ingredients: ['thé noir', 'lait', 'cannelle', 'gingembre', 'cardamome', 'miel'],
    preparationTime: 10,
    difficulty: 'facile',
    category: 'boisson',
    imageEmoji: '☕',
    instructions: [
      'Faire infuser le thé avec les épices',
      'Chauffer le lait',
      'Mélanger thé épicé et lait chaud',
      'Sucrer avec le miel',
      'Saupoudrer de cannelle'
    ],
    tags: ['indien', 'hiver', 'réconfortant']
  },
];

// Synonymes et variantes pour améliorer le matching
const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  // Protéines
  'oeufs': ['oeuf', 'œuf', 'œufs', 'egg', 'eggs'],
  'poulet': ['blanc de poulet', 'escalope de poulet', 'filet de poulet', 'cuisse de poulet', 'aile de poulet'],
  'viande hachée': ['boeuf haché', 'steak haché', 'haché', 'viande hachee'],
  'boeuf': ['bœuf', 'steak', 'entrecôte', 'rumsteck', 'bavette'],
  'porc': ['côte de porc', 'filet mignon', 'échine'],
  'saumon': ['pavé de saumon', 'filet de saumon', 'saumon fumé', 'saumon frais'],
  'crevettes': ['crevette', 'gambas', 'scampis'],
  'thon': ['thon en boîte', 'thon frais', 'thon rouge'],
  'jambon': ['jambon blanc', 'jambon cru', 'jambon de parme'],
  'lardons': ['lardon', 'bacon', 'pancetta'],
  'tofu': ['tofu ferme', 'tofu soyeux'],

  // Produits laitiers
  'fromage': ['gruyère', 'emmental', 'comté', 'cheddar', 'mozzarella', 'parmesan', 'raclette', 'reblochon', 'brie', 'camembert', 'chèvre', 'feta'],
  'lait': ['lait entier', 'lait demi-écrémé', 'lait écrémé', 'lait frais'],
  'crème': ['crème fraîche', 'crème liquide', 'crème épaisse', 'crème entière'],
  'yaourt': ['yaourts', 'yogurt', 'yoghurt', 'yogourt', 'yogourts', 'yaourt grec', 'yaourt nature'],
  'beurre': ['beurres', 'butter', 'beurre doux', 'beurre salé', 'beurre demi-sel'],
  'mascarpone': ['fromage frais', 'philadelphia', 'cream cheese'],
  'lait de coco': ['crème de coco', 'lait coco'],

  // Féculents
  'pâtes': ['spaghetti', 'penne', 'fusilli', 'tagliatelles', 'macaroni', 'farfalle', 'rigatoni', 'linguine', 'fettuccine'],
  'riz': ['riz basmati', 'riz thaï', 'riz complet', 'riz blanc', 'riz arborio', 'riz long grain'],
  'pomme de terre': ['pommes de terre', 'patate', 'patates', 'potato', 'patate douce'],
  'pain': ['baguette', 'pain de mie', 'pain complet', 'pain de campagne', 'ciabatta', 'focaccia'],
  'pâte brisée': ['pâte feuilletée', 'pâte sablée', 'pâte'],
  'pâte à pizza': ['pâte pizza', 'pâte à pain'],
  'tortilla': ['tortillas', 'wrap', 'galette de blé'],
  'semoule': ['couscous', 'semoule de blé'],
  'quinoa': ['boulgour', 'millet'],
  'nouilles de riz': ['nouilles', 'vermicelles de riz', 'nouilles chinoises'],
  'flocons d\'avoine': ['avoine', 'porridge', 'oatmeal'],

  // Légumes
  'tomate': ['tomates', 'tomate cerise', 'tomates cerises', 'tomates concassées', 'coulis de tomate', 'sauce tomate'],
  'salade': ['laitue', 'roquette', 'mâche', 'mesclun', 'feuille de chêne', 'batavia', 'romaine'],
  'oignon': ['oignons', 'échalote', 'échalotes', 'oignon rouge', 'oignon jaune', 'oignon blanc'],
  'ail': ['gousse d\'ail', 'gousses d\'ail', 'ail en poudre'],
  'carotte': ['carottes'],
  'courgette': ['courgettes'],
  'poivron': ['poivrons', 'poivron rouge', 'poivron vert', 'poivron jaune'],
  'champignons': ['champignon', 'champignons de paris', 'shiitake', 'pleurotes', 'girolles', 'cèpes'],
  'brocoli': ['brocolis', 'chou-fleur'],
  'épinards': ['épinard', 'pousses d\'épinard'],
  'aubergine': ['aubergines'],
  'concombre': ['concombres'],
  'avocat': ['avocats'],
  'poireau': ['poireaux'],
  'céleri': ['céleri branche', 'céleri rave'],
  'chou': ['chou vert', 'chou rouge', 'chou blanc', 'chou chinois'],
  'haricots verts': ['haricots', 'haricot vert'],
  'petits pois': ['petit pois', 'pois'],
  'pois chiches': ['pois chiche', 'chickpeas'],
  'haricots rouges': ['haricot rouge', 'kidney beans'],
  'maïs': ['mais', 'maïs en boîte'],
  'potiron': ['courge', 'butternut', 'citrouille', 'potimarron'],

  // Fruits
  'banane': ['bananes'],
  'pomme': ['pommes', 'golden', 'granny smith'],
  'fraise': ['fraises'],
  'orange': ['oranges', 'clémentine', 'mandarine'],
  'citron': ['citrons', 'citron jaune'],
  'citron vert': ['lime', 'citrons verts'],
  'kiwi': ['kiwis'],
  'fruits rouges': ['framboises', 'myrtilles', 'mûres', 'groseilles'],
  'raisin': ['raisins'],
  'poire': ['poires'],
  'pêche': ['pêches', 'nectarine'],
  'ananas': ['ananas frais'],
  'mangue': ['mangues'],
  'cerises': ['cerise'],
  'dattes': ['datte', 'dattes medjool'],

  // Herbes et épices
  'herbes': ['herbes de provence', 'fines herbes', 'herbes fraîches'],
  'basilic': ['basilic frais'],
  'persil': ['persil frais', 'persil plat'],
  'coriandre': ['coriandre fraîche'],
  'menthe': ['menthe fraîche'],
  'ciboulette': ['ciboulettes'],
  'thym': ['thym frais'],
  'romarin': ['romarin frais'],
  'curry': ['curry en poudre', 'pâte de curry'],
  'cumin': ['cumin en poudre'],
  'paprika': ['paprika fumé', 'piment doux'],
  'gingembre': ['gingembre frais', 'gingembre en poudre'],
  'cannelle': ['cannelle en poudre', 'bâton de cannelle'],

  // Sauces et condiments
  'sauce soja': ['soja', 'tamari', 'sauce soya'],
  'huile d\'olive': ['huile olive', 'olive oil'],
  'vinaigre': ['vinaigre balsamique', 'vinaigre de vin', 'vinaigre de cidre'],
  'moutarde': ['moutarde de dijon', 'moutarde à l\'ancienne'],
  'mayonnaise': ['mayo'],
  'ketchup': ['sauce tomate'],
  'miel': ['sirop d\'érable', 'sirop d\'agave'],
  'tahini': ['purée de sésame', 'tahin'],

  // Autres
  'farine': ['farines', 'flour', 'farine de blé', 'farine t45', 'farine t55'],
  'sucre': ['sucres', 'sugar', 'sucre en poudre', 'sucre roux', 'cassonade'],
  'chocolat': ['chocolat noir', 'chocolat au lait', 'pépites de chocolat', 'cacao'],
  'levure': ['levure chimique', 'levure boulangère', 'baking powder'],
  'gélatine': ['agar-agar', 'feuilles de gélatine'],
  'noix': ['noix de cajou', 'noix de pécan', 'cerneaux de noix'],
  'amandes': ['amande', 'poudre d\'amande'],
  'cacahuètes': ['cacahuète', 'arachides', 'beurre de cacahuète'],
  'sésame': ['graines de sésame'],
  'granola': ['muesli', 'céréales'],
  'olives': ['olive', 'olives noires', 'olives vertes'],
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

  const matches: RecipeMatch[] = [];

  for (const recipe of RECIPES_DATABASE) {
    const matchingIngredients: string[] = [];
    const missingIngredients: string[] = [];
    let urgencyScore = 0;
    const expiringIngredients: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const matchedItem = activeItems.find(item => ingredientMatches(item.name, ingredient));

      if (matchedItem) {
        matchingIngredients.push(ingredient);
        // Calculer l'urgence pour cet ingrédient
        const daysLeft = getDaysUntilExpiration(matchedItem.expirationDate);
        if (daysLeft !== null && daysLeft <= 7) {
          expiringIngredients.push(matchedItem.name);
          urgencyScore += daysLeft <= 0 ? 10 : (8 - daysLeft);
        }
      } else {
        missingIngredients.push(ingredient);
      }
    }

    // Calculer le pourcentage de correspondance
    const matchPercentage = Math.round((matchingIngredients.length / recipe.ingredients.length) * 100);

    // Ne garder que les recettes avec au moins MIN_MATCH_THRESHOLD de correspondance
    if (matchPercentage >= MIN_MATCH_THRESHOLD) {
      matches.push({
        recipe,
        matchingIngredients,
        missingIngredients,
        matchPercentage,
        urgencyScore,
        expiringIngredients,
      });
    }
  }

  // Trier par urgencyScore décroissant, puis matchPercentage en cas d'égalité
  return matches.sort((a, b) => b.urgencyScore - a.urgencyScore || b.matchPercentage - a.matchPercentage);
}

/**
 * Version onboarding avec seuil bas (25%) pour garantir des résultats
 * même avec 1-2 ingrédients seulement
 */
export function findMatchingRecipesForOnboarding(foodItems: FoodItem[], threshold: number = 25): RecipeMatch[] {
  const matches: RecipeMatch[] = [];

  for (const recipe of RECIPES_DATABASE) {
    const matchingIngredients: string[] = [];
    const missingIngredients: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const matchedItem = foodItems.find(item => ingredientMatches(item.name, ingredient));
      if (matchedItem) {
        matchingIngredients.push(ingredient);
      } else {
        missingIngredients.push(ingredient);
      }
    }

    const matchPercentage = Math.round((matchingIngredients.length / recipe.ingredients.length) * 100);

    if (matchPercentage >= threshold && matchingIngredients.length > 0) {
      matches.push({
        recipe,
        matchingIngredients,
        missingIngredients,
        matchPercentage,
        urgencyScore: 0,
        expiringIngredients: [],
      });
    }
  }

  return matches
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 5);
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
    logger.error('Erreur lors du chargement des recettes utilisateur:', error);
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
    logger.error('Erreur lors de la sauvegarde des recettes utilisateur:', error);
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

  // Récupérer toutes les recettes (intégrées + utilisateur)
  const allRecipes = await getAllRecipesWithUser();
  const matches: RecipeMatch[] = [];

  for (const recipe of allRecipes) {
    const matchingIngredients: string[] = [];
    const missingIngredients: string[] = [];
    let urgencyScore = 0;
    const expiringIngredients: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const matchedItem = activeItems.find(item => ingredientMatches(item.name, ingredient));

      if (matchedItem) {
        matchingIngredients.push(ingredient);
        // Calculer l'urgence pour cet ingrédient
        const daysLeft = getDaysUntilExpiration(matchedItem.expirationDate);
        if (daysLeft !== null && daysLeft <= 7) {
          expiringIngredients.push(matchedItem.name);
          urgencyScore += daysLeft <= 0 ? 10 : (8 - daysLeft);
        }
      } else {
        missingIngredients.push(ingredient);
      }
    }

    // Calculer le pourcentage de correspondance
    const matchPercentage = Math.round((matchingIngredients.length / recipe.ingredients.length) * 100);

    // Ne garder que les recettes avec au moins MIN_MATCH_THRESHOLD de correspondance
    if (matchPercentage >= MIN_MATCH_THRESHOLD) {
      matches.push({
        recipe,
        matchingIngredients,
        missingIngredients,
        matchPercentage,
        urgencyScore,
        expiringIngredients,
      });
    }
  }

  // Trier par urgencyScore décroissant, puis matchPercentage en cas d'égalité
  return matches.sort((a, b) => b.urgencyScore - a.urgencyScore || b.matchPercentage - a.matchPercentage);
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
