import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { initDatabase } from '../data/bootstrap';
import { db, isActive } from '../data/db';
import { resetToSeed } from '../data/seed';

async function openCatalog() {
  await initDatabase();
  await resetToSeed(db);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Listen er tom', { selector: 'h2' });
  await user.click(screen.getByRole('button', { name: 'Varer' }));
  await screen.findByRole('heading', { level: 1, name: 'Varer' });
  return user;
}

const zoneSection = async (name: string) => screen.findByRole('region', { name });

const routeNames = () =>
  within(screen.getByRole('list', { name: 'Rute' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent);

describe('Varer', () => {
  it('viser alle varer grupperet efter område', async () => {
    await openCatalog();
    const frugt = await zoneSection('Frugt & grønt');
    expect(await within(frugt).findByRole('button', { name: 'Sæt Bananer på listen' })).toBeInTheDocument();
    expect(within(frugt).getAllByRole('button')).toHaveLength(10);
  });

  it('tilføjer 1 ved tryk og bliver til en pille med minus, antal og plus', async () => {
    const user = await openCatalog();
    const mejeri = await zoneSection('Mejeri');
    await user.click(await within(mejeri).findByRole('button', { name: 'Sæt Mælk på listen' }));
    expect(await within(mejeri).findByText('1 × Mælk')).toBeInTheDocument();
    expect(screen.getByText('1 på listen')).toBeInTheDocument();

    await user.click(within(mejeri).getByRole('button', { name: 'Én mere Mælk' }));
    expect(await within(mejeri).findByText('2 × Mælk')).toBeInTheDocument();

    await user.click(within(mejeri).getByRole('button', { name: 'Én mindre Mælk' }));
    await user.click(await within(mejeri).findByRole('button', { name: 'Fjern Mælk fra listen' }));
    expect(await within(mejeri).findByRole('button', { name: 'Sæt Mælk på listen' })).toBeInTheDocument();
    expect(screen.getByText('0 på listen')).toBeInTheDocument();
  });

  it('retter ruten med pil op og ned, og listen følger rækkefølgen', async () => {
    const user = await openCatalog();
    await user.click(screen.getByRole('button', { name: 'Ret rute' }));
    expect(screen.getByRole('button', { name: 'Flyt Frugt & grønt op' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Flyt Husholdning ned' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Flyt Frugt & grønt ned' }));
    await waitFor(() => expect(routeNames().slice(0, 2)).toEqual(['1Brød', '2Frugt & grønt']));

    const positions = (await db.zones.toArray()).filter(isActive).map((z) => [z.name, z.position]);
    expect(Object.fromEntries(positions)).toMatchObject({ Brød: 1, 'Frugt & grønt': 2 });

    await user.click(screen.getByRole('button', { name: 'Færdig' }));
    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent);
    expect(headings.slice(0, 2)).toEqual(['Brød', 'Frugt & grønt']);
  });

  it('nulstiller til eksempeldata efter bekræftelse', async () => {
    const user = await openCatalog();
    const mejeri = await zoneSection('Mejeri');
    await user.click(await within(mejeri).findByRole('button', { name: 'Sæt Ost på listen' }));
    expect(await screen.findByText('1 på listen')).toBeInTheDocument();

    // Annuller lader alt være
    await user.click(screen.getByRole('button', { name: 'Nulstil til eksempeldata' }));
    const dialog = screen.getByRole('dialog', { name: 'Nulstil til eksempeldata?' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuller' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('1 på listen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nulstil til eksempeldata' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nulstil' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Eksempeldata er gendannet'));
    expect(await screen.findByText('0 på listen')).toBeInTheDocument();
  });
});
