import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { initDatabase } from '../data/bootstrap';
import { db, isActive } from '../data/db';
import { resetToSeed } from '../data/seed';
import { toISODate } from '../domain/dates';
import { assignRecipe } from '../domain/mealPlan';

async function openRecipes() {
  await initDatabase();
  await resetToSeed(db);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Listen er tom', { selector: 'h2' });
  await user.click(screen.getByRole('button', { name: 'Retter' }));
  await screen.findByRole('heading', { level: 1, name: 'Retter' });
  return user;
}

const expectToast = (text: string) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));

const recipeCard = async (name: string) =>
  (await screen.findByRole('button', { name: `Rediger ${name}` })).closest('article')!;

describe('Retter', () => {
  it('viser retterne alfabetisk med ingredienser', async () => {
    await openRecipes();
    expect(screen.getByText('7 retter')).toBeInTheDocument();
    const names = (await screen.findAllByRole('button', { name: /^Rediger / })).map((b) => b.getAttribute('aria-label'));
    expect(names[0]).toBe('Rediger Frikadeller');
    expect(names.at(-1)).toBe('Rediger Tacos');
    expect(await recipeCard('Tacos')).toHaveTextContent(
      '8 ingredienser · Agurk, Creme fraiche, Hakket oksekød, Ost, Salat, Tacokrydderi, Tomater, Tortillas',
    );
  });

  it('viser, hvilke dage en ret står på madplanen', async () => {
    const today = toISODate(new Date());
    await initDatabase();
    await resetToSeed(db);
    const tacos = (await db.recipes.toArray()).find((r) => r.name === 'Tacos')!;
    await assignRecipe(db, today, tacos.id);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Retter' }));
    expect(await recipeCard('Tacos')).toHaveTextContent(/På madplanen \p{L}+dag/u);
  });

  it('opretter en ny ret med ingredienser fra kataloget', async () => {
    const user = await openRecipes();
    await user.click(screen.getByRole('button', { name: 'Ny ret' }));
    const dialog = screen.getByRole('dialog', { name: 'Ny ret' });
    const save = within(dialog).getByRole('button', { name: 'Gem ret' });
    expect(save).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Navn på retten'), 'Chili con carne');
    const search = within(dialog).getByLabelText('Tilføj ingrediens');
    await user.type(search, 'hakket');
    await user.click(await within(dialog).findByRole('button', { name: 'Tilføj Hakket oksekød til retten' }));
    expect(search).toHaveValue('');
    await user.type(search, 'flåede{Enter}');
    await user.click(await within(dialog).findByRole('button', { name: 'Én mere Flåede tomater' }));

    const list = within(dialog).getByRole('list', { name: 'Ingredienser i retten' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(dialog).getByText('Ingredienser · 2')).toBeInTheDocument();

    await user.click(save);
    await expectToast('Chili con carne er gemt');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await recipeCard('Chili con carne')).toHaveTextContent('2 ingredienser · Flåede tomater, Hakket oksekød');
    expect(screen.getByText('8 retter')).toBeInTheDocument();
  });

  it('opretter en ny vare med område fra editoren', async () => {
    const user = await openRecipes();
    await user.click(screen.getByRole('button', { name: 'Ny ret' }));
    const dialog = screen.getByRole('dialog', { name: 'Ny ret' });
    await user.type(within(dialog).getByLabelText('Tilføj ingrediens'), 'koriander');
    const create = await within(dialog).findByRole('region', { name: 'Ny vare' });
    expect(create).toHaveTextContent('Ny vare: Koriander');
    await user.click(within(create).getByRole('button', { name: 'Frugt & grønt' }));
    await expectToast('Koriander er oprettet under Frugt & grønt');
    const list = await within(dialog).findByRole('list', { name: 'Ingredienser i retten' });
    expect(list).toHaveTextContent('Koriander');
    const item = (await db.items.toArray()).find((i) => i.name === 'Koriander');
    expect(item).toBeDefined();
  });

  it('retter en eksisterende ret og fjerner en ingrediens med minus', async () => {
    const user = await openRecipes();
    await user.click(await screen.findByRole('button', { name: 'Rediger Pizza og salat' }));
    const dialog = screen.getByRole('dialog', { name: 'Rediger ret' });
    const name = await within(dialog).findByLabelText('Navn på retten');
    await waitFor(() => expect(name).toHaveValue('Pizza og salat'));
    await user.clear(name);
    await user.type(name, 'Pizzaaften');
    await user.click(within(dialog).getByRole('button', { name: 'Fjern Agurk fra retten' }));
    await user.click(within(dialog).getByRole('button', { name: 'Gem ret' }));
    await expectToast('Pizzaaften er gemt');
    expect(await recipeCard('Pizzaaften')).toHaveTextContent('2 ingredienser · Frossen pizza, Salat');
  });

  it('lukker uden at gemme', async () => {
    const user = await openRecipes();
    await user.click(await screen.findByRole('button', { name: 'Rediger Tacos' }));
    const dialog = screen.getByRole('dialog', { name: 'Rediger ret' });
    const name = await within(dialog).findByLabelText('Navn på retten');
    await waitFor(() => expect(name).toHaveValue('Tacos'));
    await user.type(name, ' deluxe');
    await user.keyboard('{Escape}');
    expect(await screen.findByRole('button', { name: 'Rediger Tacos' })).toBeInTheDocument();
  });

  it('sletter en ret efter bekræftelse', async () => {
    const user = await openRecipes();
    await user.click(await screen.findByRole('button', { name: 'Rediger Grøntsagssuppe' }));
    const dialog = screen.getByRole('dialog', { name: 'Rediger ret' });
    await user.click(await within(dialog).findByRole('button', { name: 'Slet ret' }));
    const confirm = within(dialog).getByRole('region', { name: 'Slet ret' });
    await user.click(within(confirm).getByRole('button', { name: 'Behold' }));
    await user.click(within(dialog).getByRole('button', { name: 'Slet ret' }));
    await user.click(within(within(dialog).getByRole('region', { name: 'Slet ret' })).getByRole('button', { name: 'Slet' }));
    await expectToast('Grøntsagssuppe er slettet');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Rediger Grøntsagssuppe' })).not.toBeInTheDocument());
    expect((await db.recipes.toArray()).filter(isActive)).toHaveLength(6);
  });
});
