import { type AppDb, isActive, newRow, nowIso } from '../data/db';
import type { ItemQuantity, ListEntry } from '../data/types';
import { DomainError, assertQuantity, getHouseholdId } from './common';

async function activeEntryFor(db: AppDb, itemId: string): Promise<ListEntry | undefined> {
  return (await db.listEntries.where('itemId').equals(itemId).toArray()).find(isActive);
}

/**
 * Tilføj til listen: findes der en aktiv linje for varen, lægges antallet til,
 * og ellers oprettes en ny. Lå linjen i kurven, sættes den tilbage som ikke afkrydset.
 * Flere linjer for samme vare i ét kald lægges også sammen.
 */
export async function addToList(db: AppDb, lines: ItemQuantity[]): Promise<void> {
  lines.forEach((l) => assertQuantity(l.quantity));
  await db.transaction('rw', [db.households, db.items, db.listEntries], async () => {
    const householdId = await getHouseholdId(db);
    const now = nowIso();
    for (const line of lines) {
      const item = await db.items.get(line.itemId);
      if (!item || !isActive(item)) throw new DomainError(`Varen findes ikke: ${line.itemId}`);
      const entry = await activeEntryFor(db, line.itemId);
      if (entry) {
        await db.listEntries.update(entry.id, {
          quantity: entry.quantity + line.quantity,
          checked: false,
          checkedAt: null,
          updatedAt: now,
        });
      } else {
        await db.listEntries.add(
          newRow(
            { householdId, itemId: line.itemId, quantity: line.quantity, checked: false, checkedAt: null, addedBy: null },
            now,
          ),
        );
      }
    }
  });
}

/** Sætter antallet for en vare på listen. Under 1 fjerner linjen. Står varen ikke på listen, sker der intet. */
export async function setQuantity(db: AppDb, itemId: string, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity)) throw new DomainError(`Antal skal være et heltal, fik ${quantity}`);
  await db.transaction('rw', db.listEntries, async () => {
    const entry = await activeEntryFor(db, itemId);
    if (!entry) return;
    const now = nowIso();
    if (quantity < 1) {
      await db.listEntries.update(entry.id, { deletedAt: now, updatedAt: now });
    } else {
      await db.listEntries.update(entry.id, { quantity, updatedAt: now });
    }
  });
}

/** Lægger en linje i kurven eller tager den op igen. */
export async function toggleChecked(db: AppDb, entryId: string): Promise<void> {
  await db.transaction('rw', db.listEntries, async () => {
    const entry = await db.listEntries.get(entryId);
    if (!entry || !isActive(entry)) return;
    const now = nowIso();
    const checked = !entry.checked;
    await db.listEntries.update(entryId, { checked, checkedAt: checked ? now : null, updatedAt: now });
  });
}

/**
 * Afslut indkøb: afkrydsede linjer slettes, og purchaseCount og lastPurchasedAt opdateres på varen.
 * Returnerer antallet af linjer, der blev købt.
 */
export async function finishShopping(db: AppDb): Promise<number> {
  return db.transaction('rw', [db.items, db.listEntries], async () => {
    const now = nowIso();
    const done = (await db.listEntries.toArray()).filter((e) => isActive(e) && e.checked);
    for (const entry of done) {
      await db.listEntries.update(entry.id, { deletedAt: now, updatedAt: now });
      const item = await db.items.get(entry.itemId);
      if (item) {
        await db.items.update(item.id, {
          purchaseCount: item.purchaseCount + 1,
          lastPurchasedAt: now,
          updatedAt: now,
        });
      }
    }
    return done.length;
  });
}
