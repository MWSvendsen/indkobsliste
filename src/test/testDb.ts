import { AppDb, isActive } from '../data/db';
import { ensureSeeded } from '../data/seed';
import type { Item } from '../data/types';

let n = 0;

/** En ny, seedet database for hver test. */
export async function seededDb(): Promise<AppDb> {
  n += 1;
  const db = new AppDb(`test-${Date.now()}-${n}`);
  await ensureSeeded(db);
  return db;
}

export async function itemByName(db: AppDb, name: string): Promise<Item> {
  const item = (await db.items.toArray()).find((i) => isActive(i) && i.name === name);
  if (!item) throw new Error(`Ingen vare ved navn ${name}`);
  return item;
}

export async function activeEntries(db: AppDb) {
  return (await db.listEntries.toArray()).filter(isActive);
}

export async function recipeByName(db: AppDb, name: string) {
  const recipe = (await db.recipes.toArray()).find((r) => isActive(r) && r.name === name);
  if (!recipe) throw new Error(`Ingen ret ved navn ${name}`);
  return recipe;
}
