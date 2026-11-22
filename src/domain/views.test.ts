import type { Item, ListEntry, Zone } from '../data/types';
import { buildListView, frequentItems, hasExactItem, searchItems } from './views';

const t = '2026-11-22T00:00:00.000Z';
const base = { createdAt: t, updatedAt: t, deletedAt: null as string | null };
const zone = (id: string, name: string, position: number): Zone => ({ ...base, id, householdId: 'h', name, position });
const item = (id: string, name: string, zoneId: string, purchaseCount = 0): Item => ({
  ...base,
  id,
  householdId: 'h',
  name,
  zoneId,
  purchaseCount,
  lastPurchasedAt: null,
});
const entry = (itemId: string, quantity = 1, checked = false): ListEntry => ({
  ...base,
  id: 'le-' + itemId,
  householdId: 'h',
  itemId,
  quantity,
  checked,
  checkedAt: null,
  addedBy: null,
});

const zones = [zone('z2', 'Mejeri', 2), zone('z1', 'Frugt & grønt', 1), zone('z3', 'Kolonial', 3)];
const items = [
  item('tomater', 'Tomater', 'z1', 14),
  item('flaaede', 'Flåede tomater', 'z3', 6),
  item('tomatpure', 'Tomatpuré', 'z3', 2),
  item('aebler', 'Æbler', 'z1', 9),
  item('agurk', 'Agurk', 'z1', 14),
  item('maelk', 'Mælk', 'z2', 30),
  item('ost', 'Ost', 'z2', 18),
];

describe('søgning', () => {
  it('sætter ord, der starter med søgningen, først og sorterer derefter efter purchaseCount', () => {
    const names = searchItems(items, 'tomat').map((i) => i.name);
    expect(names).toEqual(['Tomater', 'Flåede tomater', 'Tomatpuré']);
  });

  it('finder også midt i et ord, men bagerst, selvom varen købes oftere', () => {
    const cherry = item('cherry', 'Cherrytomater', 'z1', 50);
    const names = searchItems([...items, cherry], 'tomat').map((i) => i.name);
    expect(names).toEqual(['Tomater', 'Flåede tomater', 'Tomatpuré', 'Cherrytomater']);
  });

  it('ignorerer store og små bogstaver og mellemrum', () => {
    expect(searchItems(items, '  MÆLK ').map((i) => i.name)).toEqual(['Mælk']);
  });

  it('returnerer intet uden søgning og respekterer grænsen', () => {
    expect(searchItems(items, '  ')).toEqual([]);
    expect(searchItems(items, 'a', 2)).toHaveLength(2);
  });

  it('ser bort fra slettede varer', () => {
    const deleted = { ...item('x', 'Tomatjuice', 'z3', 99), deletedAt: t };
    expect(searchItems([...items, deleted], 'tomat').map((i) => i.id)).not.toContain('x');
  });

  it('ved, om søgningen svarer præcist til en vare', () => {
    expect(hasExactItem(items, ' mælk')).toBe(true);
    expect(hasExactItem(items, 'mælke')).toBe(false);
  });
});

describe('Det køber I tit', () => {
  it('viser varerne med højest purchaseCount, som ikke står på listen', () => {
    const names = frequentItems(items, [entry('maelk')], 3).map((i) => i.name);
    expect(names).toEqual(['Ost', 'Agurk', 'Tomater']);
  });
});

describe('listevisning', () => {
  it('grupperer efter område i rutens rækkefølge og sorterer alfabetisk med æ, ø og å til sidst', () => {
    const view = buildListView(zones, items, [
      entry('ost'),
      entry('aebler'),
      entry('tomater', 2),
      entry('agurk'),
      entry('maelk', 1, true),
    ]);
    expect(view.groups.map((g) => g.zone.name)).toEqual(['Frugt & grønt', 'Mejeri']);
    expect(view.groups[0]!.lines.map((l) => l.item.name)).toEqual(['Agurk', 'Tomater', 'Æbler']);
    expect(view.groups[1]!.lines.map((l) => l.item.name)).toEqual(['Ost']);
    expect(view.cart.map((l) => l.item.name)).toEqual(['Mælk']);
    expect(view).toMatchObject({ total: 5, inCart: 1 });
  });

  it('udelader tomme områder og slettede linjer', () => {
    const view = buildListView(zones, items, [{ ...entry('ost'), deletedAt: t }]);
    expect(view).toMatchObject({ groups: [], cart: [], total: 0, inCart: 0 });
  });

  it('giver hvert område sin farveprik', () => {
    const view = buildListView(zones, items, [entry('ost')]);
    expect(view.groups[0]!.color).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
