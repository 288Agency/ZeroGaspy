// ============================================
// RECIPE SERVICE
// Suggestions de recettes basées sur les aliments disponibles
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem } from '../types';
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

    // Ne garder que les recettes avec au moins MIN_MATCH_THRESHOLD de correspondance
    if (matchPercentage >= MIN_MATCH_THRESHOLD) {
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

    // Ne garder que les recettes avec au moins MIN_MATCH_THRESHOLD de correspondance
    if (matchPercentage >= MIN_MATCH_THRESHOLD) {
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
