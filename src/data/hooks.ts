import { useLiveQuery } from 'dexie-react-hooks';
import { db, isActive } from './db';
import type { Item, ListEntry, MealPlanEntry, Recipe, RecipeIngredient, Zone } from './types';
import { sortZones } from '../domain/views';

// Live-forespørgsler: komponenterne gentegnes, når data ændres i IndexedDB.
// undefined betyder, at data endnu ikke er indlæst.

export function useZones(): Zone[] | undefined {
  return useLiveQuery(async () => sortZones(await db.zones.toArray()));
}

export function useItems(): Item[] | undefined {
  return useLiveQuery(async () => (await db.items.toArray()).filter(isActive));
}

export function useListEntries(): ListEntry[] | undefined {
  return useLiveQuery(async () => (await db.listEntries.toArray()).filter(isActive));
}

export function useRecipes(): Recipe[] | undefined {
  return useLiveQuery(async () => (await db.recipes.toArray()).filter(isActive));
}

export function useRecipeIngredients(): RecipeIngredient[] | undefined {
  return useLiveQuery(async () => (await db.recipeIngredients.toArray()).filter(isActive));
}

export function useMealPlan(): MealPlanEntry[] | undefined {
  return useLiveQuery(async () => (await db.mealPlanEntries.toArray()).filter(isActive));
}
