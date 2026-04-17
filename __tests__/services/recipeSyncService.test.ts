import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock supabase config to avoid react-native import chain
jest.mock('../../config/supabase', () => ({
  supabase: {},
  appCategoryToDb: jest.fn(),
}));

// Mock recipeService to avoid react-native import chain
jest.mock('../../services/recipeService', () => ({
  saveUserRecipes: jest.fn(),
  convertCloudUserRecipeToLocal: jest.fn(),
}));

import { addToRecipeSyncQueue } from '../../services/supabase/recipeSyncService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('addToRecipeSyncQueue', () => {
  const userId = 'user-123';
  const recipeId = 'recipe-abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignore un UPDATE si un DELETE est deja en queue pour la meme recette', async () => {
    const existingQueue = [{
      id: '1',
      operation: 'DELETE',
      recipeId,
      payload: {},
      createdAt: '2026-04-17T10:00:00Z',
      retryCount: 0,
    }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingQueue));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await addToRecipeSyncQueue(userId, 'UPDATE', recipeId, { name: 'Nouvelle recette' });

    // La queue ne doit pas avoir été modifiée (setItem non appelé)
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('merge un UPDATE dans un INSERT existant', async () => {
    const existingQueue = [{
      id: '1',
      operation: 'INSERT',
      recipeId,
      payload: { name: 'Ancienne', ingredients: ['a'] },
      createdAt: '2026-04-17T10:00:00Z',
      retryCount: 0,
    }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingQueue));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await addToRecipeSyncQueue(userId, 'UPDATE', recipeId, { name: 'Nouvelle' });

    const saved = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    const queue = JSON.parse(saved);
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe('INSERT');
    expect(queue[0].payload.name).toBe('Nouvelle');
    expect(queue[0].payload.ingredients).toEqual(['a']); // preserved
  });
});
