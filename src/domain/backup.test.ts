import { AppDb, isActive } from '../data/db';
import { ensureSeeded } from '../data/seed';
import { SEED_ZONE_IDS } from '../data/zoneColors';
import { activeEntries, itemByName, recipeByName, seededDb } from '../test/testDb';
import { backupFileName, exportData, importData, parseBackup, summarize } from './backup';
import { createItem } from './catalog';
import { DomainError } from './common';
import { addToList, setQuantity } from './list';
import { assignRecipe } from './mealPlan';

describe('eksport og import', () => {
  it('giver præcis samme data efter eksport, JSON og import i en ny database', async () => {
    const source = await seededDb();
    const kiwi = await createItem(source, 'Kiwi', SEED_ZONE_IDS.frugt);
    await addToList(source, [
      { itemId: kiwi.id, quantity: 2 },
      { itemId: (await itemByName(source, 'Mælk')).id, quantity: 1 },
    ]);
    await setQuantity(source, (await itemByName(source, 'Mælk')).id, 0); // soft-slettet linje
    await assignRecipe(source, '2026-11-23', (await recipeByName(source, 'Tacos')).id);

    const json = JSON.stringify(await exportData(source));

    const target = new AppDb(`import-${Date.now()}`);
    await ensureSeeded(target); // har sine egne data, som skal erstattes
    await importData(target, parseBackup(json));

    for (const table of source.allTables) {
      const sort = (rows: { id: string }[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
      expect(sort(await target.table(table.name).toArray())).toEqual(sort(await table.toArray()));
    }
    expect((await activeEntries(target)).map((e) => e.quantity)).toEqual([2]);
    expect((await target.mealPlanEntries.toArray()).filter(isActive)).toHaveLength(1);
  });

  it('opsummerer varer, retter og linjer', async () => {
    const db = await seededDb();
    await addToList(db, [{ itemId: (await itemByName(db, 'Ost')).id, quantity: 1 }]);
    expect(summarize(await exportData(db))).toEqual({ items: 46, recipes: 7, listEntries: 1 });
  });

  it.each([
    ['ikke JSON', 'hej'],
    ['en anden app', JSON.stringify({ app: 'noget', version: 1, tables: {} })],
    ['ukendt version', JSON.stringify({ app: 'indkobsliste', version: 99, tables: {} })],
    ['manglende tabeller', JSON.stringify({ app: 'indkobsliste', version: 1, tables: { households: [] } })],
  ])('afviser %s', (_, text) => {
    expect(() => parseBackup(text)).toThrow(DomainError);
  });

  it('afviser en backup uden husstand', async () => {
    const backup = await exportData(await seededDb());
    backup.tables.households = [];
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('ingen husstand');
  });

  it('laver et filnavn med dato', () => {
    expect(backupFileName(new Date(2026, 10, 2))).toBe('indkobsliste-2026-11-02.json');
  });
});
