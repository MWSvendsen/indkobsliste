import { type AppDb, isActive, newRow, nowIso } from '../data/db';
import type { ItemQuantity, Recipe } from '../data/types';
import { DomainError, assertQuantity, getHouseholdId } from './common';

export interface RecipeInput {
  /** Udelades for en ny ret. */
  id?: string;
  name: string;
  ingredients: ItemQuantity[];
}

/** Lægger ingredienser for samme vare sammen. */
function mergeIngredients(ingredients: ItemQuantity[]): ItemQuantity[] {
  const byItem = new Map<string, number>();
  for (const x of ingredients) {
    assertQuantity(x.quantity);
    byItem.set(x.itemId, (byItem.get(x.itemId) ?? 0) + x.quantity);
  }
  return [...byItem].map(([itemId, quantity]) => ({ itemId, quantity }));
}

/**
 * Gemmer en ny eller ændret ret. En ret skal have et navn og mindst én ingrediens.
 * Ingredienser, der er fjernet, bliver soft-slettet, så sletningen kan synkroniseres.
 */
export async function saveRecipe(db: AppDb, input: RecipeInput): Promise<Recipe> {
  const name = input.name.trim();
  if (!name) throw new DomainError('En ret skal have et navn');
  const ingredients = mergeIngredients(input.ingredients);
  if (ingredients.length === 0) throw new DomainError('En ret skal have mindst én ingrediens');

  return db.transaction('rw', [db.households, db.items, db.recipes, db.recipeIngredients], async () => {
    for (const x of ingredients) {
      const item = await db.items.get(x.itemId);
      if (!item || !isActive(item)) throw new DomainError(`Varen findes ikke: ${x.itemId}`);
    }
    const now = nowIso();

    if (!input.id) {
      const householdId = await getHouseholdId(db);
      const recipe = newRow({ householdId, name }, now);
      await db.recipes.add(recipe);
      await db.recipeIngredients.bulkAdd(ingredients.map((x) => newRow({ recipeId: recipe.id, ...x }, now)));
      return recipe;
    }

    const recipe = await db.recipes.get(input.id);
    if (!recipe || !isActive(recipe)) throw new DomainError('Retten findes ikke');
    if (recipe.name !== name) await db.recipes.update(recipe.id, { name, updatedAt: now });

    const existing = (await db.recipeIngredients.where('recipeId').equals(recipe.id).toArray()).filter(isActive);
    const wanted = new Map(ingredients.map((x) => [x.itemId, x.quantity]));
    for (const row of existing) {
      const quantity = wanted.get(row.itemId);
      if (quantity === undefined) {
        await db.recipeIngredients.update(row.id, { deletedAt: now, updatedAt: now });
      } else {
        if (quantity !== row.quantity) await db.recipeIngredients.update(row.id, { quantity, updatedAt: now });
        wanted.delete(row.itemId);
      }
    }
    for (const [itemId, quantity] of wanted) {
      await db.recipeIngredients.add(newRow({ recipeId: recipe.id, itemId, quantity }, now));
    }
    return { ...recipe, name, updatedAt: now };
  });
}

/** Sletter en ret, dens ingredienser og de dage på madplanen, hvor den står. */
export async function deleteRecipe(db: AppDb, recipeId: string): Promise<void> {
  await db.transaction('rw', [db.recipes, db.recipeIngredients, db.mealPlanEntries], async () => {
    const now = nowIso();
    const gone = { deletedAt: now, updatedAt: now };
    await db.recipes.update(recipeId, gone);
    const ingredients = (await db.recipeIngredients.where('recipeId').equals(recipeId).toArray()).filter(isActive);
    await Promise.all(ingredients.map((x) => db.recipeIngredients.update(x.id, gone)));
    const days = (await db.mealPlanEntries.toArray()).filter((m) => isActive(m) && m.recipeId === recipeId);
    await Promise.all(days.map((m) => db.mealPlanEntries.update(m.id, gone)));
  });
}
