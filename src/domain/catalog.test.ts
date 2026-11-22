import { isActive } from '../data/db';
import { SEED_ZONE_IDS } from '../data/zoneColors';
import { createItem, createItemOnList, moveZone } from './catalog';
import { DomainError } from './common';
import { activeEntries, itemByName, seededDb } from '../test/testDb';

describe('ny vare', () => {
  it('opretter varen med område og stort forbogstav', async () => {
    const db = await seededDb();
    const item = await createItem(db, '  laktosefri mælk ', SEED_ZONE_IDS.mejeri);
    expect(item).toMatchObject({ name: 'Laktosefri mælk', zoneId: SEED_ZONE_IDS.mejeri, purchaseCount: 0 });
  });

  it('kræver et område', async () => {
    const db = await seededDb();
    await expect(createItem(db, 'Kiwi', 'findes-ikke')).rejects.toBeInstanceOf(DomainError);
  });

  it('kræver et navn', async () => {
    const db = await seededDb();
    await expect(createItem(db, '   ', SEED_ZONE_IDS.frugt)).rejects.toBeInstanceOf(DomainError);
  });

  it('laver ikke en dublet, hvis navnet findes', async () => {
    const db = await seededDb();
    const maelk = await itemByName(db, 'Mælk');
    const again = await createItem(db, 'mælk', SEED_ZONE_IDS.frost);
    expect(again.id).toBe(maelk.id);
  });

  it('kan oprettes direkte på listen', async () => {
    const db = await seededDb();
    const item = await createItemOnList(db, 'Kiwi', SEED_ZONE_IDS.frugt);
    const entries = await activeEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ itemId: item.id, quantity: 1 });
  });
});

describe('ret rute', () => {
  const order = async (db: Awaited<ReturnType<typeof seededDb>>) =>
    (await db.zones.toArray())
      .filter(isActive)
      .sort((a, b) => a.position - b.position)
      .map((z) => z.name);

  it('flytter et område ned og nummererer positionerne 1..n', async () => {
    const db = await seededDb();
    await moveZone(db, SEED_ZONE_IDS.frugt, 1);
    const names = await order(db);
    expect(names.slice(0, 2)).toEqual(['Brød', 'Frugt & grønt']);
    const positions = (await db.zones.toArray()).map((z) => z.position).sort((a, b) => a - b);
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('flytter et område op', async () => {
    const db = await seededDb();
    await moveZone(db, SEED_ZONE_IDS.hus, -1);
    expect((await order(db)).slice(-2)).toEqual(['Husholdning', 'Drikkevarer']);
  });

  it('gør intet ved kanten', async () => {
    const db = await seededDb();
    const before = await order(db);
    await moveZone(db, SEED_ZONE_IDS.frugt, -1);
    await moveZone(db, SEED_ZONE_IDS.hus, 1);
    expect(await order(db)).toEqual(before);
  });
});
