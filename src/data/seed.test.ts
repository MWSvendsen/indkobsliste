import { AppDb, isActive } from './db';
import { SEED_COUNTS, ensureSeeded, resetToSeed } from './seed';
import { addToList } from '../domain/list';
import { assignRecipe } from '../domain/mealPlan';
import { itemByName, recipeByName, seededDb } from '../test/testDb';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('eksempeldata', () => {
  it('fylder 10 områder, varerne og 7 retter, mens listen og madplanen er tomme', async () => {
    const db = await seededDb();
    expect(await db.households.count()).toBe(1);
    expect(await db.zones.count()).toBe(10);
    expect(SEED_COUNTS.items).toBeGreaterThanOrEqual(45);
    expect(await db.items.count()).toBe(SEED_COUNTS.items);
    expect(await db.recipes.count()).toBe(7);
    expect(await db.listEntries.count()).toBe(0);
    expect(await db.mealPlanEntries.count()).toBe(0);
  });

  it('giver alle rækker UUID, tidsstempler og deletedAt = null', async () => {
    const db = await seededDb();
    for (const table of db.allTables) {
      for (const row of await table.toArray()) {
        expect(row.id).toMatch(UUID);
        expect(row.createdAt).toBeTruthy();
        expect(row.updatedAt).toBeTruthy();
        expect(row.deletedAt).toBeNull();
      }
    }
  });

  it('kobler retternes ingredienser til varer i kataloget', async () => {
    const db = await seededDb();
    const tacos = await recipeByName(db, 'Tacos');
    const ingredients = await db.recipeIngredients.where('recipeId').equals(tacos.id).toArray();
    expect(ingredients).toHaveLength(8);
    const tomater = await itemByName(db, 'Tomater');
    expect(ingredients.find((x) => x.itemId === tomater.id)?.quantity).toBe(2);
  });

  it('seeder kun ved første opstart', async () => {
    const db = await seededDb();
    expect(await ensureSeeded(db)).toBe(false);
    expect(await db.items.count()).toBe(SEED_COUNTS.items);
  });

  it('nulstiller til eksempeldata og beholder husstanden', async () => {
    const db = await seededDb();
    const [household] = await db.households.toArray();
    await addToList(db, [{ itemId: (await itemByName(db, 'Mælk')).id, quantity: 2 }]);
    await assignRecipe(db, '2026-11-23', (await recipeByName(db, 'Tacos')).id);

    await resetToSeed(db);

    expect(await db.listEntries.count()).toBe(0);
    expect(await db.mealPlanEntries.count()).toBe(0);
    expect((await db.items.toArray()).filter(isActive)).toHaveLength(SEED_COUNTS.items);
    expect((await db.households.toArray()).map((h) => h.id)).toEqual([household!.id]);
  });

  it('opretter en husstand, hvis databasen er tom', async () => {
    const db = new AppDb(`tom-${Date.now()}`);
    expect(await ensureSeeded(db)).toBe(true);
  });
});
