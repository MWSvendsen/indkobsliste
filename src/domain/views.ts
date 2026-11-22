// Rene funktioner, der laver data om til det, skærmene viser. Ingen databasekald.
import type { Item, ListEntry, Zone } from '../data/types';
import { zoneColor } from '../data/zoneColors';
import { byName, normalizeName } from './common';

const active = <T extends { deletedAt: string | null }>(rows: T[]): T[] => rows.filter((r) => r.deletedAt === null);

export const sortZones = (zones: Zone[]): Zone[] => active(zones).sort((a, b) => a.position - b.position);

/**
 * Søgning i Tilføj vare: alle varer, hvis navn indeholder søgningen.
 * Varer med et ord, der starter med søgningen, står først, og derefter sorteres efter purchaseCount.
 */
export function searchItems(items: Item[], query: string, limit = 6): Item[] {
  const q = normalizeName(query);
  if (!q) return [];
  const rank = (i: Item) => (normalizeName(i.name).split(/\s+/).some((w) => w.startsWith(q)) ? 0 : 1);
  return active(items)
    .filter((i) => normalizeName(i.name).includes(q))
    .sort((a, b) => rank(a) - rank(b) || b.purchaseCount - a.purchaseCount || byName(a, b))
    .slice(0, limit);
}

/** Om søgningen svarer præcist til en eksisterende vare. Ellers tilbydes "Ny vare". */
export function hasExactItem(items: Item[], query: string): boolean {
  const q = normalizeName(query);
  return active(items).some((i) => normalizeName(i.name) === q);
}

/** "Det køber I tit": de varer med højest purchaseCount, der ikke står på listen. */
export function frequentItems(items: Item[], entries: ListEntry[], limit = 10): Item[] {
  const onList = new Set(active(entries).map((e) => e.itemId));
  return active(items)
    .filter((i) => !onList.has(i.id))
    .sort((a, b) => b.purchaseCount - a.purchaseCount || byName(a, b))
    .slice(0, limit);
}

export interface ListLine {
  entry: ListEntry;
  item: Item;
}

export interface ListGroup {
  zone: Zone;
  color: string;
  lines: ListLine[];
}

export interface ListView {
  /** Det, der mangler, grupperet efter område i rutens rækkefølge. */
  groups: ListGroup[];
  /** Det, der er i kurven, sorteret alfabetisk. */
  cart: ListLine[];
  total: number;
  inCart: number;
}

/** Indkøbslisten: grupperet efter område i rutens rækkefølge og alfabetisk inden for området. */
export function buildListView(zones: Zone[], items: Item[], entries: ListEntry[]): ListView {
  const itemById = new Map(active(items).map((i) => [i.id, i]));
  const lines: ListLine[] = active(entries)
    .map((entry) => ({ entry, item: itemById.get(entry.itemId) }))
    .filter((x): x is ListLine => x.item !== undefined);
  const byItemName = (a: ListLine, b: ListLine) => byName(a.item, b.item);
  const toBuy = lines.filter((x) => !x.entry.checked);
  const cart = lines.filter((x) => x.entry.checked).sort(byItemName);
  const groups = sortZones(zones)
    .map((zone, k) => ({
      zone,
      color: zoneColor(zone.id, k),
      lines: toBuy.filter((x) => x.item.zoneId === zone.id).sort(byItemName),
    }))
    .filter((g) => g.lines.length > 0);
  return { groups, cart, total: lines.length, inCart: cart.length };
}
