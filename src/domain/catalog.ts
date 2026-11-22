import { type AppDb, isActive, newRow, nowIso } from '../data/db';
import type { Item } from '../data/types';
import { DomainError, capitalize, getHouseholdId, normalizeName } from './common';
import { addToList } from './list';

/**
 * Ny vare: skal altid have et område, så den lander rigtigt på ruten.
 * Findes en vare med samme navn allerede, returneres den i stedet for at lave en dublet.
 */
export async function createItem(db: AppDb, name: string, zoneId: string): Promise<Item> {
  const pretty = capitalize(name);
  if (!pretty) throw new DomainError('En vare skal have et navn');
  return db.transaction('rw', [db.households, db.zones, db.items], async () => {
    const zone = await db.zones.get(zoneId);
    if (!zone || !isActive(zone)) throw new DomainError('En ny vare skal have et område');
    const key = normalizeName(pretty);
    const existing = (await db.items.toArray()).find((i) => isActive(i) && normalizeName(i.name) === key);
    if (existing) return existing;
    const householdId = await getHouseholdId(db);
    const item = newRow({ householdId, name: pretty, zoneId, purchaseCount: 0, lastPurchasedAt: null });
    await db.items.add(item);
    return item;
  });
}

/** Ny vare, der med det samme sættes på listen med antal 1. */
export async function createItemOnList(db: AppDb, name: string, zoneId: string): Promise<Item> {
  return db.transaction('rw', [db.households, db.zones, db.items, db.listEntries], async () => {
    const item = await createItem(db, name, zoneId);
    await addToList(db, [{ itemId: item.id, quantity: 1 }]);
    return item;
  });
}

/**
 * Ret rute: bytter et område med naboen over (-1) eller under (+1)
 * og nummererer positionerne 1..n igen.
 */
export async function moveZone(db: AppDb, zoneId: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.zones, async () => {
    const zones = (await db.zones.toArray()).filter(isActive).sort((a, b) => a.position - b.position);
    const from = zones.findIndex((z) => z.id === zoneId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= zones.length) return;
    const moved = zones[from]!;
    zones[from] = zones[to]!;
    zones[to] = moved;
    const now = nowIso();
    await Promise.all(
      zones.map((z, k) => (z.position === k + 1 ? null : db.zones.update(z.id, { position: k + 1, updatedAt: now }))),
    );
  });
}
