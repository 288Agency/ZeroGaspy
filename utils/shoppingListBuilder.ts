import { FoodItem, MealPlanEntry, ShoppingListItem } from '../types';
import { Recipe } from '../services/recipeService';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function buildShoppingList(
  plans: MealPlanEntry[],
  recipesById: Map<string, Recipe>,
  inventory: FoodItem[],
  checked: Set<string>
): ShoppingListItem[] {
  const inventoryNames = new Set(
    inventory
      .filter(i => i.status === 'active' || !i.status)
      .map(i => normalize(i.name))
  );

  const aggregated = new Map<string, { ingredient: string; sourceRecipeIds: Set<string> }>();

  for (const plan of plans) {
    const recipe = recipesById.get(plan.recipeId);
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      const key = normalize(ing);
      if (!key) continue;
      const existing = aggregated.get(key);
      if (existing) {
        existing.sourceRecipeIds.add(recipe.id);
      } else {
        aggregated.set(key, {
          ingredient: ing,
          sourceRecipeIds: new Set([recipe.id]),
        });
      }
    }
  }

  const items: ShoppingListItem[] = [];
  for (const [key, value] of aggregated) {
    const inInventory = inventoryNames.has(key) ||
      // partial match: inventory item name contains or is contained in ingredient
      [...inventoryNames].some(n => n.includes(key) || key.includes(n));
    items.push({
      ingredient: value.ingredient,
      sourceRecipeIds: Array.from(value.sourceRecipeIds),
      checked: checked.has(key),
      inInventory,
    });
  }

  // Sort: missing first, then alphabetical
  items.sort((a, b) => {
    if (a.inInventory !== b.inInventory) return a.inInventory ? 1 : -1;
    return a.ingredient.localeCompare(b.ingredient);
  });

  return items;
}
