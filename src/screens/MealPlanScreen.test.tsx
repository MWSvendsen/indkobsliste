import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { initDatabase } from '../data/bootstrap';
import { db, isActive } from '../data/db';
import { resetToSeed } from '../data/seed';
import { isoWeek, mondayOf, toISODate } from '../domain/dates';
import { addToList } from '../domain/list';

const today = toISODate(new Date());

async function open(tab: 'Madplan' | 'Retter' = 'Madplan') {
  await initDatabase();
  await resetToSeed(db);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Listen er tom', { selector: 'h2' });
  await user.click(screen.getByRole('button', { name: tab }));
  await screen.findByRole('heading', { level: 1, name: tab });
  return user;
}

const expectToast = (text: string) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));

const activeEntries = async () => (await db.listEntries.toArray()).filter(isActive);
const itemId = async (name: string) => (await db.items.toArray()).find((i) => i.name === name)!.id;

async function planTacosMonday(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Tilføj ret til mandag' }));
  const pick = screen.getByRole('dialog', { name: 'Ret til mandag' });
  await user.click(await within(pick).findByRole('button', { name: /^Tacos/ }));
  return screen.findByRole('dialog', { name: 'Tacos' });
}

describe('Madplan', () => {
  it('viser denne uge fra mandag til søndag og kan bladres frem og tilbage', async () => {
    const user = await open();
    expect(screen.getByText(`Uge ${isoWeek(today)} · denne uge`)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Tilføj ret til / })).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Forrige uge' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Næste uge' }));
    const next = isoWeek(toISODate(new Date(Date.now() + 7 * 86_400_000)));
    expect(screen.getByText(`Uge ${next}`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Forrige uge' }));
    expect(screen.getByText(`Uge ${isoWeek(today)} · denne uge`)).toBeInTheDocument();
  });

  it('sætter en ret på en dag, og intet er valgt i Vælg ingredienser fra start', async () => {
    const user = await open();
    const sheet = await planTacosMonday(user);
    const confirm = within(sheet).getByRole('button', { name: 'Vælg det, du skal købe' });
    expect(confirm).toBeDisabled();
    const rows = await within(sheet).findAllByRole('button', { pressed: false });
    expect(rows).toHaveLength(8);

    await user.click(within(sheet).getByRole('button', { name: 'Vælg Tomater' }));
    await user.click(within(sheet).getByRole('button', { name: 'Vælg Hakket oksekød' }));
    expect(within(sheet).getByRole('button', { name: 'Fravælg Tomater' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(sheet).getByRole('button', { name: 'Læg 2 varer på listen' }));

    await expectToast('2 varer lagt på listen');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Ingredienser er valgt')).toBeInTheDocument();
    const qty = Object.fromEntries((await activeEntries()).map((e) => [e.itemId, e.quantity]));
    expect(qty).toEqual({ [await itemId('Tomater')]: 2, [await itemId('Hakket oksekød')]: 1 });
    const plan = (await db.mealPlanEntries.toArray()).filter(isActive);
    expect(plan[0]).toMatchObject({ date: mondayOf(today) });
    expect(plan[0]!.ingredientsAddedAt).not.toBeNull();
  });

  it('viser, hvad der allerede står på listen, og Vælg alle vælger alt', async () => {
    await initDatabase();
    await resetToSeed(db);
    await addToList(db, [{ itemId: await itemId('Ost'), quantity: 1 }]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Madplan' }));
    const sheet = await planTacosMonday(user);
    expect(await within(sheet).findByText('1 står allerede på listen')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Vælg alle' }));
    await user.click(within(sheet).getByRole('button', { name: 'Læg 8 varer på listen' }));
    await expectToast('8 varer lagt på listen');
    const qty = Object.fromEntries((await activeEntries()).map((e) => [e.itemId, e.quantity]));
    expect(Object.keys(qty)).toHaveLength(8);
    expect(qty[await itemId('Ost')]).toBe(2); // 1 stod der i forvejen, og retten lægger 1 til
    expect(qty[await itemId('Tomater')]).toBe(2);
  });

  it('kan vælge igen og skifte eller fjerne retten', async () => {
    const user = await open();
    const sheet = await planTacosMonday(user);
    await user.click(within(sheet).getByRole('button', { name: 'Vælg Ost' }));
    await user.click(within(sheet).getByRole('button', { name: 'Læg 1 vare på listen' }));
    await user.click(await screen.findByRole('button', { name: 'Vælg ingredienser igen for mandag' }));
    expect(await screen.findByRole('dialog', { name: 'Tacos' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Skift ret for mandag: Tacos' }));
    const pick = screen.getByRole('dialog', { name: 'Ret til mandag' });
    await user.click(within(pick).getByRole('button', { name: 'Ingen ret' }));
    expect(await screen.findAllByRole('button', { name: /^Tilføj ret til / })).toHaveLength(7);
    // Ingredienserne bliver på listen
    expect(await activeEntries()).toHaveLength(1);
  });

  it('opretter en ny ret fra dagen og sætter den på dagen', async () => {
    const user = await open();
    await user.click(await screen.findByRole('button', { name: 'Tilføj ret til fredag' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ny ret' }));
    const editor = screen.getByRole('dialog', { name: 'Ny ret' });
    await user.type(within(editor).getByLabelText('Navn på retten'), 'Omelet');
    await user.type(within(editor).getByLabelText('Tilføj ingrediens'), 'æg{Enter}');
    await user.click(within(editor).getByRole('button', { name: 'Gem ret' }));
    const sheet = await screen.findByRole('dialog', { name: 'Omelet' });
    expect(within(sheet).getByText('Fredag')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('button', { name: 'Skift ret for fredag: Omelet' })).toBeInTheDocument();
  });
});

describe('Sæt på madplanen fra Retter', () => {
  it('vælger dag og derefter ingredienser', async () => {
    const user = await open('Retter');
    await user.click(await screen.findByRole('button', { name: 'Sæt Frikadeller på madplanen' }));
    const days = screen.getByRole('dialog', { name: 'Frikadeller' });
    const rows = within(within(days).getByRole('list', { name: 'Dage' })).getAllByRole('button');
    expect(rows[0]).toHaveTextContent('Ledig');
    await user.click(rows[0]!);
    const sheet = await screen.findByRole('dialog', { name: 'Frikadeller' });
    expect(await within(sheet).findByRole('button', { name: 'Vælg alle' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(await screen.findByText(/På madplanen/)).toBeInTheDocument();
  });
});
