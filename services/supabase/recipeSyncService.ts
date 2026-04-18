import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, CloudUserRecipe, appCategoryToDb } from '../../config/supabase';
import { Recipe, saveUserRecipes, convertCloudUserRecipeToLocal } from '../recipeService';
import logger from '../../utils/logger';

const RECIPE_MIGRATION_KEY = 'supabase_recipes_migrated';
const RECIPE_SYNC_QUEUE_KEY = 'supabase_recipe_sync_queue';
const USER_RECIPES_KEY = 'user_recipes';

interface RecipeSyncQueueItem {
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recipeId: string;
  payload: any;
  createdAt: string;
  retryCount: number;
}

/**
 * Migrates existing local user recipes to Supabase on first login.
 */
export async function migrateLocalRecipesToCloud(userId: string): Promise<void> {
  try {
    const migrated = await AsyncStorage.getItem(`${RECIPE_MIGRATION_KEY}_${userId}`);
    if (migrated === 'true') return;

    const localJson = await AsyncStorage.getItem(USER_RECIPES_KEY);
    if (!localJson) {
      await AsyncStorage.setItem(`${RECIPE_MIGRATION_KEY}_${userId}`, 'true');
      return;
    }

    const localRecipes: Recipe[] = JSON.parse(localJson);
    const userRecipes = localRecipes.filter(r => r.isUserRecipe);

    if (userRecipes.length === 0) {
      await AsyncStorage.setItem(`${RECIPE_MIGRATION_KEY}_${userId}`, 'true');
      return;
    }

    logger.debug(`[RecipeSync] Migrating ${userRecipes.length} local recipes to cloud...`);

    const rows = userRecipes.map(recipe => ({
      user_id: userId,
      name: recipe.name,
      description: recipe.description || '',
      ingredients: recipe.ingredients,
      preparation_time: recipe.preparationTime,
      difficulty: recipe.difficulty,
      category: appCategoryToDb(recipe.category),
      image_emoji: recipe.imageEmoji,
      instructions: recipe.instructions,
      tips: recipe.tips || null,
      tags: recipe.tags || null,
    }));

    const { error } = await supabase.from('user_recipes').insert(rows);
    if (error) {
      logger.error('[RecipeSync] Batch migration error:', error);
      return; // ne pas marquer comme migré si échec
    }

    await AsyncStorage.setItem(`${RECIPE_MIGRATION_KEY}_${userId}`, 'true');
    logger.debug('[RecipeSync] Migration complete');
  } catch (err) {
    logger.error('[RecipeSync] Migration error:', err);
  }
}

/**
 * Pulls all user recipes from Supabase and updates local cache.
 */
export async function pullUserRecipesFromCloud(userId: string): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (error) {
      logger.error('[RecipeSync] Pull error:', error);
      return [];
    }

    const recipes: Recipe[] = (data as CloudUserRecipe[]).map(convertCloudUserRecipeToLocal);

    await saveUserRecipes(recipes);
    return recipes;
  } catch (err) {
    logger.error('[RecipeSync] Pull failed:', err);
    return [];
  }
}

/**
 * Adds an operation to the offline sync queue for recipes.
 */
export async function addToRecipeSyncQueue(
  userId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  recipeId: string,
  payload: any
): Promise<void> {
  const queueJson = await AsyncStorage.getItem(`${RECIPE_SYNC_QUEUE_KEY}_${userId}`);
  const queue: RecipeSyncQueueItem[] = queueJson ? JSON.parse(queueJson) : [];

  if (operation === 'UPDATE') {
    // Si un DELETE est déjà en queue pour cette recette, ignorer le UPDATE :
    // la recette sera supprimée de toute façon.
    const pendingDeleteIdx = queue.findIndex(
      item => item.recipeId === recipeId && item.operation === 'DELETE'
    );
    if (pendingDeleteIdx >= 0) {
      return; // recette déjà en queue pour suppression, ignorer l'UPDATE
    }

    // Merge dans un INSERT ou UPDATE existant
    const existingIdx = queue.findIndex(
      item => item.recipeId === recipeId && item.operation !== 'DELETE'
    );
    if (existingIdx >= 0) {
      queue[existingIdx].payload = { ...queue[existingIdx].payload, ...payload };
      queue[existingIdx].createdAt = new Date().toISOString();
    } else {
      queue.push({
        id: Date.now().toString(),
        operation,
        recipeId,
        payload,
        createdAt: new Date().toISOString(),
        retryCount: 0,
      });
    }
  } else {
    queue.push({
      id: Date.now().toString(),
      operation,
      recipeId,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
  }

  await AsyncStorage.setItem(`${RECIPE_SYNC_QUEUE_KEY}_${userId}`, JSON.stringify(queue));
}

/**
 * Pushes all pending recipe changes to Supabase.
 */
export async function pushPendingRecipeChanges(userId: string): Promise<void> {
  const queueJson = await AsyncStorage.getItem(`${RECIPE_SYNC_QUEUE_KEY}_${userId}`);
  if (!queueJson) return;

  const queue: RecipeSyncQueueItem[] = JSON.parse(queueJson);
  const failedItems: RecipeSyncQueueItem[] = [];

  for (const item of queue) {
    try {
      switch (item.operation) {
        case 'INSERT': {
          const { error } = await supabase
            .from('user_recipes')
            .insert({ ...item.payload, user_id: userId });
          if (error) {
            logger.error('[RecipeSync] Insert error:', error);
            if (item.retryCount < 3) failedItems.push({ ...item, retryCount: item.retryCount + 1 });
          }
          break;
        }
        case 'UPDATE': {
          const { error } = await supabase
            .from('user_recipes')
            .update({ ...item.payload, updated_at: new Date().toISOString() })
            .eq('id', item.recipeId)
            .eq('user_id', userId);
          if (error) {
            logger.error('[RecipeSync] Update error:', error);
            if (item.retryCount < 3) failedItems.push({ ...item, retryCount: item.retryCount + 1 });
          }
          break;
        }
        case 'DELETE': {
          const { error } = await supabase
            .from('user_recipes')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', item.recipeId)
            .eq('user_id', userId);
          if (error) {
            logger.error('[RecipeSync] Delete error:', error);
            if (item.retryCount < 3) failedItems.push({ ...item, retryCount: item.retryCount + 1 });
          }
          break;
        }
      }
    } catch (err) {
      logger.error(`[RecipeSync] Queue item ${item.id} failed:`, err);
      if (item.retryCount < 3) failedItems.push({ ...item, retryCount: item.retryCount + 1 });
    }
  }

  if (failedItems.length > 0) {
    await AsyncStorage.setItem(`${RECIPE_SYNC_QUEUE_KEY}_${userId}`, JSON.stringify(failedItems));
  } else {
    await AsyncStorage.removeItem(`${RECIPE_SYNC_QUEUE_KEY}_${userId}`);
  }
}

/**
 * Full sync: push pending changes, then pull from cloud only if queue is empty.
 * Avoids overwriting locally-queued mutations with stale cloud data.
 */
export async function syncRecipes(userId: string): Promise<void> {
  await pushPendingRecipeChanges(userId);
  const remaining = await AsyncStorage.getItem(`${RECIPE_SYNC_QUEUE_KEY}_${userId}`);
  const hasPending = remaining && JSON.parse(remaining).length > 0;
  if (!hasPending) {
    await pullUserRecipesFromCloud(userId);
  }
}
