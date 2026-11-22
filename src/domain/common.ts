import type { AppDb } from '../data/db';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Antal skal være et heltal på mindst 1. */
export function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new DomainError(`Antal skal være et heltal på mindst 1, fik ${quantity}`);
  }
}

export async function getHouseholdId(db: AppDb): Promise<string> {
  const household = (await db.households.toArray()).find((h) => h.deletedAt === null);
  if (!household) throw new DomainError('Der er ingen husstand. Databasen er ikke seedet.');
  return household.id;
}

/** Danske navne sorteres med æ, ø og å til sidst. */
export const byName = <T extends { name: string }>(a: T, b: T): number =>
  a.name.localeCompare(b.name, 'da');

/** Første bogstav stort, som når en ny vare oprettes fra søgefeltet. */
export function capitalize(text: string): string {
  const t = text.trim();
  return t ? t.charAt(0).toLocaleUpperCase('da') + t.slice(1) : '';
}

export const normalizeName = (name: string): string => name.trim().toLocaleLowerCase('da');
