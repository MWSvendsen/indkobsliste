import { addToList, finishShopping, setQuantity, toggleChecked } from './list';
import { DomainError } from './common';
import { activeEntries, itemByName, seededDb } from '../test/testDb';

describe('tilføj til listen', () => {
  it('opretter en ny linje, når varen ikke står på listen', async () => {
    const db = await seededDb();
    const maelk = await itemByName(db, 'Mælk');
    await addToList(db, [{ itemId: maelk.id, quantity: 1 }]);
    const [entry] = await activeEntries(db);
    expect(entry).toMatchObject({ itemId: maelk.id, quantity: 1, checked: false, addedBy: null });
  });

  it('lægger antallet til, når varen allerede står på listen (højst én aktiv linje)', async () => {
    const db = await seededDb();
    const hakket = await itemByName(db, 'Hakket oksekød');
    await addToList(db, [{ itemId: hakket.id, quantity: 1 }]);
    await addToList(db, [{ itemId: hakket.id, quantity: 1 }]);
    const entries = await activeEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.quantity).toBe(2);
  });

  it('lægger flere linjer for samme vare i ét kald sammen', async () => {
    const db = await seededDb();
    const loeg = await itemByName(db, 'Løg');
    await addToList(db, [
      { itemId: loeg.id, quantity: 1 },
      { itemId: loeg.id, quantity: 2 },
    ]);
    const entries = await activeEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.quantity).toBe(3);
  });

  it('sætter en linje i kurven tilbage som ikke afkrydset', async () => {
    const db = await seededDb();
    const ost = await itemByName(db, 'Ost');
    await addToList(db, [{ itemId: ost.id, quantity: 1 }]);
    const [entry] = await activeEntries(db);
    await toggleChecked(db, entry!.id);
    await addToList(db, [{ itemId: ost.id, quantity: 1 }]);
    const [after] = await activeEntries(db);
    expect(after).toMatchObject({ quantity: 2, checked: false, checkedAt: null });
  });

  it.each([0, -1, 1.5, Number.NaN])('afviser antal %s', async (quantity) => {
    const db = await seededDb();
    const ost = await itemByName(db, 'Ost');
    await expect(addToList(db, [{ itemId: ost.id, quantity }])).rejects.toBeInstanceOf(DomainError);
    expect(await activeEntries(db)).toHaveLength(0);
  });

  it('afviser en vare, der ikke findes', async () => {
    const db = await seededDb();
    await expect(addToList(db, [{ itemId: 'findes-ikke', quantity: 1 }])).rejects.toBeInstanceOf(DomainError);
  });
});

describe('antal', () => {
  it('ændrer antallet', async () => {
    const db = await seededDb();
    const aeg = await itemByName(db, 'Æg');
    await addToList(db, [{ itemId: aeg.id, quantity: 1 }]);
    await setQuantity(db, aeg.id, 3);
    expect((await activeEntries(db))[0]!.quantity).toBe(3);
  });

  it('fjerner linjen (soft delete), når antallet kommer under 1', async () => {
    const db = await seededDb();
    const aeg = await itemByName(db, 'Æg');
    await addToList(db, [{ itemId: aeg.id, quantity: 1 }]);
    await setQuantity(db, aeg.id, 0);
    expect(await activeEntries(db)).toHaveLength(0);
    const [deleted] = await db.listEntries.toArray();
    expect(deleted!.deletedAt).not.toBeNull();
  });

  it('opretter en ny linje, hvis varen tilføjes igen efter at være fjernet', async () => {
    const db = await seededDb();
    const aeg = await itemByName(db, 'Æg');
    await addToList(db, [{ itemId: aeg.id, quantity: 2 }]);
    await setQuantity(db, aeg.id, 0);
    await addToList(db, [{ itemId: aeg.id, quantity: 1 }]);
    const entries = await activeEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.quantity).toBe(1);
  });
});

describe('kurven', () => {
  it('lægger i kurven og tager op igen', async () => {
    const db = await seededDb();
    const kaffe = await itemByName(db, 'Kaffe');
    await addToList(db, [{ itemId: kaffe.id, quantity: 1 }]);
    const [entry] = await activeEntries(db);
    await toggleChecked(db, entry!.id);
    expect((await db.listEntries.get(entry!.id))).toMatchObject({ checked: true });
    expect((await db.listEntries.get(entry!.id))!.checkedAt).not.toBeNull();
    await toggleChecked(db, entry!.id);
    expect((await db.listEntries.get(entry!.id))).toMatchObject({ checked: false, checkedAt: null });
  });
});

describe('afslut indkøb', () => {
  it('sletter afkrydsede linjer og opdaterer purchaseCount og lastPurchasedAt', async () => {
    const db = await seededDb();
    const maelk = await itemByName(db, 'Mælk');
    const ost = await itemByName(db, 'Ost');
    await addToList(db, [
      { itemId: maelk.id, quantity: 2 },
      { itemId: ost.id, quantity: 1 },
    ]);
    const maelkEntry = (await activeEntries(db)).find((e) => e.itemId === maelk.id)!;
    await toggleChecked(db, maelkEntry.id);

    const bought = await finishShopping(db);

    expect(bought).toBe(1);
    const remaining = await activeEntries(db);
    expect(remaining.map((e) => e.itemId)).toEqual([ost.id]);
    const maelkAfter = await db.items.get(maelk.id);
    expect(maelkAfter!.purchaseCount).toBe(maelk.purchaseCount + 1);
    expect(maelkAfter!.lastPurchasedAt).not.toBeNull();
    const ostAfter = await db.items.get(ost.id);
    expect(ostAfter!.purchaseCount).toBe(ost.purchaseCount);
    expect(ostAfter!.lastPurchasedAt).toBeNull();
  });

  it('gør intet, når kurven er tom', async () => {
    const db = await seededDb();
    expect(await finishShopping(db)).toBe(0);
  });
});
