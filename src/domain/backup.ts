import type { AppDb } from '../data/db';
import type { Household, Item, ListEntry, MealPlanEntry, Recipe, RecipeIngredient, Zone } from '../data/types';
import { DomainError } from './common';

// Eksport og import i JSON. Indtil der er sync, er det den eneste backup,
// fordi Safari kan slette lokale data under nogle forhold.

export const BACKUP_APP = 'indkobsliste';
export const BACKUP_VERSION = 1;

export interface BackupTables {
  households: Household[];
  zones: Zone[];
  items: Item[];
  listEntries: ListEntry[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  mealPlanEntries: MealPlanEntry[];
}

export interface Backup {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  tables: BackupTables;
}

const TABLES: (keyof BackupTables)[] = [
  'households',
  'zones',
  'items',
  'listEntries',
  'recipes',
  'recipeIngredients',
  'mealPlanEntries',
];

/** Alle rækker, også soft-slettede, så en import giver præcis samme tilstand. */
export async function exportData(db: AppDb): Promise<Backup> {
  const tables = {} as BackupTables;
  await db.transaction('r', db.allTables, async () => {
    for (const name of TABLES) {
      (tables as unknown as Record<string, unknown[]>)[name] = await db.table(name).toArray();
    }
  });
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Tjekker, at filen er en backup fra appen, før noget bliver slettet. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new DomainError('Filen er ikke gyldig JSON.');
  }
  if (!isObject(data) || data.app !== BACKUP_APP) throw new DomainError('Filen er ikke en backup fra Indkøbsliste.');
  if (data.version !== BACKUP_VERSION) throw new DomainError(`Backup-versionen ${String(data.version)} kendes ikke.`);
  const tables = data.tables;
  if (!isObject(tables)) throw new DomainError('Backuppen mangler data.');
  for (const name of TABLES) {
    const rows = tables[name];
    if (!Array.isArray(rows) || !rows.every((r) => isObject(r) && typeof r.id === 'string')) {
      throw new DomainError(`Backuppen har ugyldige data i ${name}.`);
    }
  }
  const households = tables.households as unknown[];
  if (households.length === 0) throw new DomainError('Backuppen har ingen husstand.');
  return data as unknown as Backup;
}

/** Erstatter alle data med backuppen. Sker i én transaktion, så intet går tabt, hvis det fejler. */
export async function importData(db: AppDb, backup: Backup): Promise<void> {
  await db.transaction('rw', db.allTables, async () => {
    for (const name of TABLES) {
      const table = db.table(name);
      await table.clear();
      await table.bulkAdd(backup.tables[name]);
    }
  });
}

/** Filnavn som indkobsliste-2026-11-22.json */
export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `indkobsliste-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Antal aktive varer, retter og linjer i en backup, til bekræftelsen før import. */
export function summarize(backup: Backup) {
  const active = <T extends { deletedAt: string | null }>(rows: T[]) => rows.filter((r) => r.deletedAt === null).length;
  return {
    items: active(backup.tables.items),
    recipes: active(backup.tables.recipes),
    listEntries: active(backup.tables.listEntries),
  };
}
