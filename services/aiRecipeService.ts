import { supabase } from '../config/supabase';
import logger from '../utils/logger';
import { Recipe } from './recipeService';
import i18n from '../i18n';

export interface AIRecipeResult {
  recipe: Recipe;
  cached: boolean;
}

const AI_RECIPE_TIMEOUT_MS = 15_000;

/**
 * Génère une recette IA basée sur les ingrédients fournis (expirés/expirants).
 * Cache côté serveur 24h. Timeout 15s. Fallback null en cas d'erreur.
 */
export async function generateAIRecipe(ingredients: string[]): Promise<AIRecipeResult | null> {
  if (ingredients.length === 0) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_RECIPE_TIMEOUT_MS);

  try {
    const { data, error } = await supabase.functions.invoke('generate-ai-recipe', {
      body: {
        ingredients,
        language: i18n.language ?? 'fr',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (error) {
      logger.error('AI recipe edge function error:', error);
      return null;
    }

    if (!data?.recipe) {
      logger.warn('AI recipe: empty response');
      return null;
    }

    const raw = data.recipe;

    const recipe: Recipe = {
      id: `ai_${Date.now()}`,
      name: raw.name ?? 'Recette IA',
      description: raw.description ?? '',
      ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
      preparationTime: typeof raw.preparationTime === 'number' ? raw.preparationTime : 20,
      difficulty: raw.difficulty ?? 'facile',
      category: raw.category ?? 'plat',
      imageEmoji: raw.imageEmoji ?? '🍳',
      instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
      tips: raw.tips,
      tags: raw.tags,
      isUserRecipe: false,
    };

    return { recipe, cached: data.cached ?? false };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      logger.warn('generateAIRecipe: timeout after 15s');
    } else {
      logger.error('generateAIRecipe error:', error);
    }
    return null;
  }
}
