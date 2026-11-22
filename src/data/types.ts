// Entiteter fra docs/datamodel.md. Feltnavnene er de samme, som en senere server skal bruge.

export type UUID = string;
/** Tidspunkt i ISO 8601, fx 2026-11-22T09:12:00.000Z */
export type ISODateTime = string;
/** Kalenderdato uden tid, fx 2026-11-23 */
export type ISODate = string;

/** Felter, som alle rækker har, så de kan synkroniseres senere. */
export interface SyncFields {
  id: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Soft delete: sat betyder slettet. */
  deletedAt: ISODateTime | null;
}

export interface Household extends SyncFields {
  name: string;
}

export interface Zone extends SyncFields {
  householdId: UUID;
  name: string;
  /** Rutens rækkefølge, 1 er først. */
  position: number;
}

export interface Item extends SyncFields {
  householdId: UUID;
  name: string;
  zoneId: UUID;
  purchaseCount: number;
  lastPurchasedAt: ISODateTime | null;
}

export interface ListEntry extends SyncFields {
  householdId: UUID;
  itemId: UUID;
  /** Heltal, mindst 1. */
  quantity: number;
  checked: boolean;
  checkedAt: ISODateTime | null;
  /** Hvem der satte linjen på. Altid null i v1, hvor der ikke er brugere. */
  addedBy: UUID | null;
}

export interface Recipe extends SyncFields {
  householdId: UUID;
  name: string;
}

export interface RecipeIngredient extends SyncFields {
  recipeId: UUID;
  itemId: UUID;
  /** Heltal, mindst 1. */
  quantity: number;
}

export interface MealPlanEntry extends SyncFields {
  householdId: UUID;
  date: ISODate;
  recipeId: UUID;
  ingredientsAddedAt: ISODateTime | null;
}

/** En vare og et antal, fx når noget skal lægges på listen. */
export interface ItemQuantity {
  itemId: UUID;
  quantity: number;
}
