import { buildShoppingList } from '../../utils/shoppingListBuilder';
import { FoodItem, MealPlanEntry } from '../../types';
import { Recipe } from '../../services/recipeService';

function makeRecipe(id: string, ingredients: string[]): Recipe {
  return {
    id,
    name: `Recipe ${id}`,
    description: '',
    ingredients,
    preparationTime: 10,
    difficulty: 'facile',
    category: 'plat',
    imageEmoji: '🍽️',
    instructions: [],
  };
}

function makePlan(id: string, recipeId: string, date = '2026-04-24', slot: 'lunch' | 'dinner' = 'lunch'): MealPlanEntry {
  return {
    id,
    date,
    slot,
    recipeId,
    createdAt: new Date().toISOString(),
  };
}

function makeItem(name: string, status: FoodItem['status'] = 'active'): FoodItem {
  return {
    id: `item-${name}`,
    name,
    expirationDate: '2026-05-01',
    status,
  };
}

function toRecipeMap(recipes: Recipe[]): Map<string, Recipe> {
  return new Map(recipes.map(r => [r.id, r]));
}

describe('buildShoppingList', () => {
  it('returns empty list when there are no plans', () => {
    const result = buildShoppingList([], new Map(), [], new Set());
    expect(result).toEqual([]);
  });

  it('ignores plans whose recipe is missing from the map', () => {
    const plans = [makePlan('p1', 'missing-recipe')];
    const result = buildShoppingList(plans, new Map(), [], new Set());
    expect(result).toEqual([]);
  });

  it('aggregates ingredients across multiple recipes and dedupes', () => {
    const recipes = [
      makeRecipe('r1', ['tomate', 'oignon', 'ail']),
      makeRecipe('r2', ['tomate', 'basilic']),
    ];
    const plans = [makePlan('p1', 'r1'), makePlan('p2', 'r2', '2026-04-25')];
    const result = buildShoppingList(plans, toRecipeMap(recipes), [], new Set());

    expect(result).toHaveLength(4);
    const tomate = result.find(i => i.ingredient === 'tomate');
    expect(tomate?.sourceRecipeIds.sort()).toEqual(['r1', 'r2']);
  });

  it('flags ingredients present in inventory as inInventory=true', () => {
    const recipes = [makeRecipe('r1', ['tomate', 'oignon'])];
    const inventory = [makeItem('tomate')];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      inventory,
      new Set(),
    );
    expect(result.find(i => i.ingredient === 'tomate')?.inInventory).toBe(true);
    expect(result.find(i => i.ingredient === 'oignon')?.inInventory).toBe(false);
  });

  it('excludes consumed or thrown inventory items from matching', () => {
    const recipes = [makeRecipe('r1', ['tomate'])];
    const inventory = [makeItem('tomate', 'consumed'), makeItem('oignon', 'thrown')];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      inventory,
      new Set(),
    );
    expect(result.find(i => i.ingredient === 'tomate')?.inInventory).toBe(false);
  });

  it('normalizes accents and case when matching', () => {
    const recipes = [makeRecipe('r1', ['Éclair au chocolat', 'OIGNON'])];
    const inventory = [makeItem('eclair au chocolat'), makeItem('oignon')];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      inventory,
      new Set(),
    );
    expect(result.every(i => i.inInventory)).toBe(true);
  });

  it('does partial match — inventory item contained in ingredient string', () => {
    const recipes = [makeRecipe('r1', ['sauce tomate bio'])];
    const inventory = [makeItem('tomate')];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      inventory,
      new Set(),
    );
    expect(result[0].inInventory).toBe(true);
  });

  it('marks items as checked when key is in the checked set', () => {
    const recipes = [makeRecipe('r1', ['tomate', 'oignon'])];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      [],
      new Set(['tomate']),
    );
    expect(result.find(i => i.ingredient === 'tomate')?.checked).toBe(true);
    expect(result.find(i => i.ingredient === 'oignon')?.checked).toBe(false);
  });

  it('sorts missing ingredients first, then alphabetically within each group', () => {
    const recipes = [makeRecipe('r1', ['zucchini', 'carotte', 'tomate', 'aubergine'])];
    const inventory = [makeItem('tomate'), makeItem('zucchini')];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      inventory,
      new Set(),
    );
    const names = result.map(i => i.ingredient);
    // Missing first (alphabetical): aubergine, carotte — then inventory: tomate, zucchini
    expect(names).toEqual(['aubergine', 'carotte', 'tomate', 'zucchini']);
  });

  it('skips empty-string ingredients silently', () => {
    const recipes = [makeRecipe('r1', ['tomate', '', '   '])];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      [],
      new Set(),
    );
    expect(result).toHaveLength(1);
    expect(result[0].ingredient).toBe('tomate');
  });

  it('treats items with no status (legacy) as active inventory', () => {
    const recipes = [makeRecipe('r1', ['tomate'])];
    const inventory: FoodItem[] = [
      { id: '1', name: 'tomate', expirationDate: '2026-05-01' },
    ];
    const result = buildShoppingList(
      [makePlan('p1', 'r1')],
      toRecipeMap(recipes),
      inventory,
      new Set(),
    );
    expect(result[0].inInventory).toBe(true);
  });
});
