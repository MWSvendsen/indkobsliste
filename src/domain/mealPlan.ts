import { type AppDb, isActive, newRow, nowIso } from '../data/db';
import type { ISODate, MealPlanEntry } from '../data/types';
import { DomainError, getHouseholdId } from './common';
import { addToList } from './list';

async function activeEntryOn(db: AppDb, date: ISODate): Promise<MealPlanEntry | undefined> {
  return (await db.mealPlanEntries.where('date').equals(date).toArray()).find(isActive);
}

/**
 * Sætter en ret på en dag (højst én ret pr. dag). null fjerner retten fra dagen.
 * Når retten skifter, skal ingredienserne vælges igen.
 * Ingredienser, der allerede er lagt på listen, bliver stående (bevidst fravalg i datamodellen).
 */
export async function assignRecipe(db: AppDb, date: ISODate, recipeId: string | null): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DomainError(`Ugyldig dato: ${date}`);
  await db.transaction('rw', [db.households, db.recipes, db.mealPlanEntries], async () => {
    const now = nowIso();
    const entry = await activeEntryOn(db, date);
    if (recipeId === null) {
      if (entry) await db.mealPlanEntries.update(entry.id, { deletedAt: now, updatedAt: now });
      return;
    }
    const recipe = await db.recipes.get(recipeId);
    if (!recipe || !isActive(recipe)) throw new DomainError('Retten findes ikke');
    if (entry) {
      await db.mealPlanEntries.update(entry.id, { recipeId, ingredientsAddedAt: null, updatedAt: now });
    } else {
      const householdId = await getHouseholdId(db);
      await db.mealPlanEntries.add(newRow({ householdId, date, recipeId, ingredientsAddedAt: null }, now));
    }
  });
}

/**
 * Vælg ingredienser: de valgte ingredienser lægges på listen med rettens antal,
 * og ingredientsAddedAt sættes. Intet er valgt på forhånd, så mindst én skal vælges.
 * Returnerer antallet af varer, der blev lagt på listen.
 */
export async function confirmIngredients(db: AppDb, date: ISODate, selectedItemIds: string[]): Promise<number> {
  if (selectedItemIds.length === 0) throw new DomainError('Vælg mindst én ingrediens');
  return db.transaction(
    'rw',
    [db.households, db.items, db.listEntries, db.recipeIngredients, db.mealPlanEntries],
    async () => {
      const entry = await activeEntryOn(db, date);
      if (!entry) throw new DomainError('Der er ingen ret på dagen');
      const selected = new Set(selectedItemIds);
      const chosen = (await db.recipeIngredients.where('recipeId').equals(entry.recipeId).toArray()).filter(
        (x) => isActive(x) && selected.has(x.itemId),
      );
      if (chosen.length === 0) throw new DomainError('Ingen af de valgte varer er ingredienser i retten');
      await addToList(
        db,
        chosen.map((x) => ({ itemId: x.itemId, quantity: x.quantity })),
      );
      const now = nowIso();
      await db.mealPlanEntries.update(entry.id, { ingredientsAddedAt: now, updatedAt: now });
      return chosen.length;
    },
  );
}
