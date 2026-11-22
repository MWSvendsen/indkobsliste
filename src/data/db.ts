import Dexie, { type EntityTable } from 'dexie';
import type {
  Household,
  Item,
  ListEntry,
  MealPlanEntry,
  Recipe,
  RecipeIngredient,
  SyncFields,
  Zone,
} from './types';

export class AppDb extends Dexie {
  households!: EntityTable<Household, 'id'>;
  zones!: EntityTable<Zone, 'id'>;
  items!: EntityTable<Item, 'id'>;
  listEntries!: EntityTable<ListEntry, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  recipeIngredients!: EntityTable<RecipeIngredient, 'id'>;
  mealPlanEntries!: EntityTable<MealPlanEntry, 'id'>;

  constructor(name = 'indkobsliste') {
    super(name);
    // Første felt er primærnøglen. De øvrige er indekser til opslag.
    // updatedAt er indekseret, så en senere sync kan hente "ændret siden".
    this.version(1).stores({
      households: 'id, updatedAt',
      zones: 'id, householdId, updatedAt',
      items: 'id, householdId, zoneId, updatedAt',
      listEntries: 'id, householdId, itemId, updatedAt',
      recipes: 'id, householdId, updatedAt',
      recipeIngredients: 'id, recipeId, itemId, updatedAt',
      mealPlanEntries: 'id, householdId, date, updatedAt',
    });
  }

  get allTables() {
    return [
      this.households,
      this.zones,
      this.items,
      this.listEntries,
      this.recipes,
      this.recipeIngredients,
      this.mealPlanEntries,
    ];
  }
}

export const db = new AppDb();

export const isActive = <T extends Pick<SyncFields, 'deletedAt'>>(row: T): boolean =>
  row.deletedAt === null;

export const nowIso = (): string => new Date().toISOString();

export const newId = (): string => crypto.randomUUID();

/** Laver en ny række med id og tidsstempler. */
export function newRow<T extends object>(fields: T, now = nowIso()): T & SyncFields {
  return { ...fields, id: newId(), createdAt: now, updatedAt: now, deletedAt: null };
}
