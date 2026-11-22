import { isActive } from '../data/db';
import { DomainError } from './common';
import { assignRecipe } from './mealPlan';
import { deleteRecipe, saveRecipe } from './recipes';
import { itemByName, recipeByName, seededDb } from '../test/testDb';

const activeIngredients = async (db: Awaited<ReturnType<typeof seededDb>>, recipeId: string) =>
  (await db.recipeIngredients.where('recipeId').equals(recipeId).toArray()).filter(isActive);

describe('retter', () => {
  it('opretter en ny ret med ingredienser', async () => {
    const db = await seededDb();
    const hakket = await itemByName(db, 'Hakket oksekød');
    const flaaede = await itemByName(db, 'Flåede tomater');
    const recipe = await saveRecipe(db, {
      name: ' Chili con carne ',
      ingredients: [
        { itemId: hakket.id, quantity: 1 },
        { itemId: flaaede.id, quantity: 2 },
      ],
    });
    expect(recipe.name).toBe('Chili con carne');
    const ingredients = await activeIngredients(db, recipe.id);
    expect(ingredients.map((x) => [x.itemId, x.quantity]).sort()).toEqual(
      [
        [hakket.id, 1],
        [flaaede.id, 2],
      ].sort(),
    );
  });

  it('kræver navn og mindst én ingrediens', async () => {
    const db = await seededDb();
    const hakket = await itemByName(db, 'Hakket oksekød');
    await expect(saveRecipe(db, { name: '', ingredients: [{ itemId: hakket.id, quantity: 1 }] })).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(saveRecipe(db, { name: 'Tom', ingredients: [] })).rejects.toBeInstanceOf(DomainError);
  });

  it('retter navn, antal, fjerner og tilføjer ingredienser', async () => {
    const db = await seededDb();
    const pizza = await recipeByName(db, 'Pizza og salat');
    const frossen = await itemByName(db, 'Frossen pizza');
    const salat = await itemByName(db, 'Salat');
    const agurk = await itemByName(db, 'Agurk');
    const tomater = await itemByName(db, 'Tomater');

    await saveRecipe(db, {
      id: pizza.id,
      name: 'Pizzaaften',
      ingredients: [
        { itemId: frossen.id, quantity: 3 },
        { itemId: salat.id, quantity: 1 },
        { itemId: tomater.id, quantity: 1 },
      ],
    });

    expect((await db.recipes.get(pizza.id))!.name).toBe('Pizzaaften');
    const ingredients = await activeIngredients(db, pizza.id);
    const qty = Object.fromEntries(ingredients.map((x) => [x.itemId, x.quantity]));
    expect(qty).toEqual({ [frossen.id]: 3, [salat.id]: 1, [tomater.id]: 1 });
    const removed = (await db.recipeIngredients.where('recipeId').equals(pizza.id).toArray()).find(
      (x) => x.itemId === agurk.id,
    );
    expect(removed!.deletedAt).not.toBeNull();
  });

  it('sletter en ret, dens ingredienser og dens dage på madplanen', async () => {
    const db = await seededDb();
    const tacos = await recipeByName(db, 'Tacos');
    await assignRecipe(db, '2026-11-25', tacos.id);
    await deleteRecipe(db, tacos.id);
    expect((await db.recipes.get(tacos.id))!.deletedAt).not.toBeNull();
    expect(await activeIngredients(db, tacos.id)).toHaveLength(0);
    expect((await db.mealPlanEntries.toArray()).filter(isActive)).toHaveLength(0);
  });
});
