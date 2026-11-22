import { isActive } from '../data/db';
import { DomainError } from './common';
import { addToList } from './list';
import { assignRecipe, confirmIngredients } from './mealPlan';
import { activeEntries, itemByName, recipeByName, seededDb } from '../test/testDb';

const MONDAY = '2026-11-23';
const WEDNESDAY = '2026-11-25';

const activePlan = async (db: Awaited<ReturnType<typeof seededDb>>) =>
  (await db.mealPlanEntries.toArray()).filter(isActive);

describe('madplan', () => {
  it('sætter en ret på en dag', async () => {
    const db = await seededDb();
    const tacos = await recipeByName(db, 'Tacos');
    await assignRecipe(db, MONDAY, tacos.id);
    const [entry] = await activePlan(db);
    expect(entry).toMatchObject({ date: MONDAY, recipeId: tacos.id, ingredientsAddedAt: null });
  });

  it('har højst én ret pr. dag og nulstiller valget af ingredienser, når retten skifter', async () => {
    const db = await seededDb();
    const tacos = await recipeByName(db, 'Tacos');
    const laks = await recipeByName(db, 'Laks med kartofler');
    await assignRecipe(db, MONDAY, tacos.id);
    await confirmIngredients(db, MONDAY, [(await itemByName(db, 'Tortillas')).id]);
    await assignRecipe(db, MONDAY, laks.id);
    const plan = await activePlan(db);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ recipeId: laks.id, ingredientsAddedAt: null });
  });

  it('fjerner retten fra dagen, men lader ingredienserne blive på listen', async () => {
    const db = await seededDb();
    const tacos = await recipeByName(db, 'Tacos');
    await assignRecipe(db, MONDAY, tacos.id);
    await confirmIngredients(db, MONDAY, [(await itemByName(db, 'Tortillas')).id]);
    await assignRecipe(db, MONDAY, null);
    expect(await activePlan(db)).toHaveLength(0);
    expect(await activeEntries(db)).toHaveLength(1);
  });

  it('afviser en ugyldig dato', async () => {
    const db = await seededDb();
    const tacos = await recipeByName(db, 'Tacos');
    await expect(assignRecipe(db, '23/11', tacos.id)).rejects.toBeInstanceOf(DomainError);
  });
});

describe('vælg ingredienser', () => {
  it('lægger kun de valgte på listen med rettens antal og sætter ingredientsAddedAt', async () => {
    const db = await seededDb();
    const tacos = await recipeByName(db, 'Tacos');
    const tomater = await itemByName(db, 'Tomater');
    const hakket = await itemByName(db, 'Hakket oksekød');
    await assignRecipe(db, WEDNESDAY, tacos.id);

    const n = await confirmIngredients(db, WEDNESDAY, [tomater.id, hakket.id]);

    expect(n).toBe(2);
    const qty = Object.fromEntries((await activeEntries(db)).map((e) => [e.itemId, e.quantity]));
    expect(qty).toEqual({ [tomater.id]: 2, [hakket.id]: 1 });
    expect((await activePlan(db))[0]!.ingredientsAddedAt).not.toBeNull();
  });

  it('samler antal fra flere retter: 1 hakket oksekød mandag og 1 onsdag giver 2', async () => {
    const db = await seededDb();
    const hakket = await itemByName(db, 'Hakket oksekød');
    await assignRecipe(db, MONDAY, (await recipeByName(db, 'Pasta med kødsovs')).id);
    await assignRecipe(db, WEDNESDAY, (await recipeByName(db, 'Tacos')).id);
    await confirmIngredients(db, MONDAY, [hakket.id]);
    await confirmIngredients(db, WEDNESDAY, [hakket.id]);
    const entries = await activeEntries(db);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.quantity).toBe(2);
  });

  it('lægger rettens antal til en vare, der allerede står på listen', async () => {
    const db = await seededDb();
    const tomater = await itemByName(db, 'Tomater');
    await addToList(db, [{ itemId: tomater.id, quantity: 1 }]);
    await assignRecipe(db, WEDNESDAY, (await recipeByName(db, 'Tacos')).id);
    await confirmIngredients(db, WEDNESDAY, [tomater.id]);
    expect((await activeEntries(db))[0]!.quantity).toBe(3);
  });

  it('kræver, at mindst én ingrediens er valgt', async () => {
    const db = await seededDb();
    await assignRecipe(db, WEDNESDAY, (await recipeByName(db, 'Tacos')).id);
    await expect(confirmIngredients(db, WEDNESDAY, [])).rejects.toBeInstanceOf(DomainError);
    expect((await activePlan(db))[0]!.ingredientsAddedAt).toBeNull();
  });

  it('ignorerer valgte varer, der ikke er ingredienser i retten', async () => {
    const db = await seededDb();
    await assignRecipe(db, WEDNESDAY, (await recipeByName(db, 'Tacos')).id);
    const kaffe = await itemByName(db, 'Kaffe');
    await expect(confirmIngredients(db, WEDNESDAY, [kaffe.id])).rejects.toBeInstanceOf(DomainError);
    expect(await activeEntries(db)).toHaveLength(0);
  });

  it('fejler, når der ingen ret er på dagen', async () => {
    const db = await seededDb();
    const kaffe = await itemByName(db, 'Kaffe');
    await expect(confirmIngredients(db, MONDAY, [kaffe.id])).rejects.toBeInstanceOf(DomainError);
  });
});
