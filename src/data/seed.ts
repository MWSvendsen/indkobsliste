import { type AppDb, newId, newRow, nowIso } from './db';
import type { Item, Recipe, RecipeIngredient, Zone } from './types';
import { SEED_ZONE_IDS, type SeedZoneKey } from './zoneColors';

// Eksempeldata fra prototypens seed(). Listen og madplanen starter tomme.

const ZONES: [SeedZoneKey, string][] = [
  ['frugt', 'Frugt & grønt'],
  ['brod', 'Brød'],
  ['mejeri', 'Mejeri'],
  ['paalaeg', 'Pålæg'],
  ['koel', 'Øvrige kølevarer'],
  ['kod', 'Kød & fisk'],
  ['kolonial', 'Kolonial'],
  ['frost', 'Frost'],
  ['drikke', 'Drikkevarer'],
  ['hus', 'Husholdning'],
];

// [nøgle, navn, område, purchaseCount]
const ITEMS: [string, string, SeedZoneKey, number][] = [
  ['bananer', 'Bananer', 'frugt', 25],
  ['agurk', 'Agurk', 'frugt', 14],
  ['tomater', 'Tomater', 'frugt', 14],
  ['aebler', 'Æbler', 'frugt', 9],
  ['loeg', 'Løg', 'frugt', 10],
  ['gulerod', 'Gulerødder', 'frugt', 9],
  ['kartofler', 'Kartofler', 'frugt', 8],
  ['citron', 'Citroner', 'frugt', 4],
  ['peber', 'Peberfrugt', 'frugt', 6],
  ['salat', 'Salat', 'frugt', 5],
  ['rugbrod', 'Rugbrød', 'brod', 22],
  ['toast', 'Toastbrød', 'brod', 8],
  ['boller', 'Boller', 'brod', 5],
  ['tortilla', 'Tortillas', 'brod', 4],
  ['maelk', 'Mælk', 'mejeri', 30],
  ['smoer', 'Smør', 'mejeri', 15],
  ['ost', 'Ost', 'mejeri', 18],
  ['yoghurt', 'Yoghurt', 'mejeri', 12],
  ['creme', 'Creme fraiche', 'mejeri', 5],
  ['skinke', 'Skinke', 'paalaeg', 8],
  ['leverpostej', 'Leverpostej', 'paalaeg', 6],
  ['spegepoelse', 'Spegepølse', 'paalaeg', 4],
  ['aeg', 'Æg', 'koel', 20],
  ['hummus', 'Hummus', 'koel', 3],
  ['friskpasta', 'Frisk pasta', 'koel', 3],
  ['hakket', 'Hakket oksekød', 'kod', 10],
  ['kylling', 'Kyllingebryst', 'kod', 7],
  ['laks', 'Laks', 'kod', 4],
  ['bacon', 'Bacon', 'kod', 3],
  ['fars', 'Frikadellefars', 'kod', 3],
  ['pasta', 'Pasta', 'kolonial', 9],
  ['ris', 'Ris', 'kolonial', 6],
  ['havre', 'Havregryn', 'kolonial', 7],
  ['flaaede', 'Flåede tomater', 'kolonial', 6],
  ['kaffe', 'Kaffe', 'kolonial', 12],
  ['karry', 'Karry', 'kolonial', 2],
  ['kokos', 'Kokosmælk', 'kolonial', 3],
  ['taco', 'Tacokrydderi', 'kolonial', 3],
  ['mel', 'Hvedemel', 'kolonial', 2],
  ['aerter', 'Frosne ærter', 'frost', 4],
  ['pizza', 'Frossen pizza', 'frost', 4],
  ['vand', 'Danskvand', 'drikke', 8],
  ['juice', 'Juice', 'drikke', 5],
  ['toilet', 'Toiletpapir', 'hus', 6],
  ['opvask', 'Opvasketabs', 'hus', 3],
  ['rulle', 'Køkkenrulle', 'hus', 4],
];

// [navn, [varenøgle, antal][]]
const RECIPES: [string, [string, number][]][] = [
  ['Pasta med kødsovs', [['hakket', 1], ['pasta', 1], ['flaaede', 2], ['loeg', 1], ['gulerod', 1]]],
  ['Kylling i karry', [['kylling', 1], ['ris', 1], ['karry', 1], ['kokos', 1], ['loeg', 1], ['peber', 1]]],
  [
    'Tacos',
    [['hakket', 1], ['tortilla', 1], ['taco', 1], ['salat', 1], ['tomater', 2], ['agurk', 1], ['creme', 1], ['ost', 1]],
  ],
  ['Laks med kartofler', [['laks', 1], ['kartofler', 1], ['citron', 1], ['salat', 1]]],
  ['Pizza og salat', [['pizza', 2], ['salat', 1], ['agurk', 1]]],
  ['Frikadeller', [['fars', 1], ['kartofler', 1], ['aeg', 1], ['loeg', 1], ['mel', 1], ['aerter', 1]]],
  ['Grøntsagssuppe', [['gulerod', 1], ['kartofler', 1], ['loeg', 2], ['boller', 1]]],
];

export const SEED_COUNTS = { zones: ZONES.length, items: ITEMS.length, recipes: RECIPES.length };

/** Bygger eksempeldata for en husstand. Rører ikke databasen. */
export function buildSeed(householdId: string, now = nowIso()) {
  const stamp = { createdAt: now, updatedAt: now, deletedAt: null };

  const zones: Zone[] = ZONES.map(([key, name], k) => ({
    id: SEED_ZONE_IDS[key],
    householdId,
    name,
    position: k + 1,
    ...stamp,
  }));

  const itemIdByKey = new Map<string, string>();
  const items: Item[] = ITEMS.map(([key, name, zone, purchaseCount]) => {
    const id = newId();
    itemIdByKey.set(key, id);
    return { id, householdId, name, zoneId: SEED_ZONE_IDS[zone], purchaseCount, lastPurchasedAt: null, ...stamp };
  });

  const recipes: Recipe[] = [];
  const recipeIngredients: RecipeIngredient[] = [];
  for (const [name, ingredients] of RECIPES) {
    const recipe = newRow({ householdId, name }, now);
    recipes.push(recipe);
    for (const [key, quantity] of ingredients) {
      const itemId = itemIdByKey.get(key);
      if (!itemId) throw new Error(`Ukendt vare i eksempeldata: ${key}`);
      recipeIngredients.push(newRow({ recipeId: recipe.id, itemId, quantity }, now));
    }
  }

  return { zones, items, recipes, recipeIngredients };
}

async function writeSeed(db: AppDb, householdId: string) {
  const seed = buildSeed(householdId);
  await db.zones.bulkAdd(seed.zones);
  await db.items.bulkAdd(seed.items);
  await db.recipes.bulkAdd(seed.recipes);
  await db.recipeIngredients.bulkAdd(seed.recipeIngredients);
}

/**
 * Første opstart: opretter husstanden og eksempeldata, hvis databasen er tom.
 * Returnerer true, hvis der blev seedet.
 */
export async function ensureSeeded(db: AppDb): Promise<boolean> {
  return db.transaction('rw', db.allTables, async () => {
    if ((await db.households.count()) > 0) return false;
    const household = newRow({ name: 'Hjem' });
    await db.households.add(household);
    await writeSeed(db, household.id);
    return true;
  });
}

/**
 * "Nulstil til eksempeldata": sletter alt undtagen husstanden og indlæser eksempeldata igen.
 * Sletningen er hård, fordi v1 ikke synkroniserer. Når sync kommer, skal dette laves om.
 */
export async function resetToSeed(db: AppDb): Promise<void> {
  await db.transaction('rw', db.allTables, async () => {
    const household = (await db.households.toArray()).find((h) => h.deletedAt === null);
    await Promise.all(db.allTables.filter((t) => t !== db.households).map((t) => t.clear()));
    if (household) {
      await writeSeed(db, household.id);
    } else {
      await db.households.clear();
      const fresh = newRow({ name: 'Hjem' });
      await db.households.add(fresh);
      await writeSeed(db, fresh.id);
    }
  });
}
