import { generateAIRecipe } from '../../services/aiRecipeService';
import { supabase } from '../../config/supabase';

jest.mock('../../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../i18n', () => ({
  default: { language: 'fr' },
}));

describe('generateAIRecipe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retourne null si la liste d\'ingredients est vide', async () => {
    const result = await generateAIRecipe([]);
    expect(result).toBeNull();
  });

  it('retourne null en cas d\'erreur edge function', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('Function error'),
    });
    const result = await generateAIRecipe(['poulet', 'courgettes']);
    expect(result).toBeNull();
  });

  it('retourne null et log un warning en cas de timeout (AbortError)', async () => {
    const logger = require('../../utils/logger').default;
    (supabase.functions.invoke as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Aborted'), { name: 'AbortError' })
    );
    const result = await generateAIRecipe(['poulet']);
    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('timeout'));
  });

  it('retourne une recette normalisee en cas de succes', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: {
        recipe: {
          name: 'Poulet aux courgettes',
          description: 'Recette test',
          ingredients: ['poulet', 'courgettes'],
          preparationTime: 30,
          difficulty: 'facile',
          category: 'plat',
          imageEmoji: '🍗',
          instructions: ['Cuire le poulet'],
        },
        cached: false,
      },
      error: null,
    });
    const result = await generateAIRecipe(['poulet', 'courgettes']);
    expect(result).not.toBeNull();
    expect(result?.recipe.name).toBe('Poulet aux courgettes');
    expect(result?.cached).toBe(false);
    expect(result?.recipe.id).toMatch(/^ai_/);
  });
});
