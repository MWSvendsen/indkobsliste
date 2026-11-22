import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { initDatabase } from './data/bootstrap';
import { db } from './data/db';
import { resetToSeed } from './data/seed';

async function setup() {
  await initDatabase();
  await resetToSeed(db);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Listen er tom', { selector: 'h2' });
  return user;
}

const openAdd = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Tilføj' }));
  return screen.getByRole('dialog', { name: 'Tilføj vare' });
};

// Databasen svarer asynkront, så testene venter på resultatet i stedet for at tjekke med det samme.
const listGroup = async (zone: string) =>
  (await screen.findByRole('heading', { name: new RegExp(zone) })).closest('section')!;

// Toast-elementet findes altid, så der skal ventes på teksten.
const expectToast = (text: string) =>
  waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));

describe('Liste', () => {
  it('starter tom med 0 / 0', async () => {
    await setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Indkøb' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '0 af 0 i kurven' })).toBeInTheDocument();
  });
});

describe('Tilføj vare', () => {
  it('sætter fokus i søgefeltet og viser "Det køber I tit" med de 10 mest købte', async () => {
    const user = await setup();
    const dialog = await openAdd(user);
    expect(within(dialog).getByLabelText('Hvad mangler I?')).toHaveFocus();
    await waitFor(() => expect(within(dialog).getAllByRole('button', { name: /^Tilføj / })).toHaveLength(10));
    const chips = within(dialog).getAllByRole('button', { name: /^Tilføj / });
    expect(chips[0]).toHaveAccessibleName('Tilføj Mælk');
  });

  it('tilføjer et forslag og viser det på listen under sit område', async () => {
    const user = await setup();
    const dialog = await openAdd(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Tilføj Mælk' }));
    await expectToast('Mælk er på listen');
    // Mælk er nu på listen og forsvinder fra forslagene
    await waitFor(() => expect(within(dialog).queryByRole('button', { name: 'Tilføj Mælk' })).not.toBeInTheDocument());
    await user.click(within(dialog).getAllByRole('button', { name: 'Luk' })[0]!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await within(await listGroup('Mejeri')).findByRole('button', { name: 'Læg i kurven: Mælk' })).toBeInTheDocument();
  });

  it('søger, og Enter tilføjer det øverste resultat', async () => {
    const user = await setup();
    const dialog = await openAdd(user);
    const input = within(dialog).getByLabelText('Hvad mangler I?');
    await user.type(input, 'tomat');
    const results = await within(dialog).findByRole('list', { name: 'Resultater' });
    await waitFor(() => expect(within(results).getAllByRole('listitem')[0]).toHaveTextContent('Tomater'));
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('');
    await user.type(input, 'tomat');
    expect(await within(dialog).findByText('På listen')).toBeInTheDocument();
  });

  it('viser plus og minus for en vare på listen, og minus ved 1 fjerner den', async () => {
    const user = await setup();
    const dialog = await openAdd(user);
    await user.type(within(dialog).getByLabelText('Hvad mangler I?'), 'kaffe');
    await user.click(await within(dialog).findByRole('button', { name: 'Sæt Kaffe på listen' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Én mere Kaffe' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Én mindre Kaffe' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Fjern Kaffe fra listen' }));
    expect(await within(dialog).findByRole('button', { name: 'Sæt Kaffe på listen' })).toBeInTheDocument();
  });

  it('opretter en ny vare med område og sætter den på listen', async () => {
    const user = await setup();
    const dialog = await openAdd(user);
    await user.type(within(dialog).getByLabelText('Hvad mangler I?'), 'kiwi');
    const create = await within(dialog).findByRole('region', { name: 'Ny vare' });
    expect(create).toHaveTextContent('Ny vare: Kiwi');
    await user.click(within(create).getByRole('button', { name: 'Frugt & grønt' }));
    await expectToast('Kiwi er oprettet under Frugt & grønt');
    await user.keyboard('{Escape}');
    expect(
      await within(await listGroup('Frugt & grønt')).findByRole('button', { name: 'Læg i kurven: Kiwi' }),
    ).toBeInTheDocument();
  });
});

describe('Handle', () => {
  it('lægger i kurven, viser antal og afslutter indkøb', async () => {
    const user = await setup();
    const dialog = await openAdd(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Tilføj Ost' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Tilføj Æg' }));
    await user.type(within(dialog).getByLabelText('Hvad mangler I?'), 'æg');
    await user.click(await within(dialog).findByRole('button', { name: 'Én mere Æg' }));
    await user.keyboard('{Escape}');

    expect(await screen.findByText('2 ×')).toBeInTheDocument();
    expect(await screen.findByRole('progressbar', { name: '0 af 2 i kurven' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Liste/ })).toHaveTextContent('2');

    await user.click(await screen.findByRole('button', { name: 'Læg i kurven: 2 Æg' }));
    const cart = (await screen.findByRole('heading', { name: /I kurven/ })).closest('section')!;
    expect(await within(cart).findByRole('button', { name: 'Tag op af kurven: 2 Æg' })).toBeInTheDocument();
    expect(await screen.findByRole('progressbar', { name: '1 af 2 i kurven' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Afslut indkøb' }));
    await expectToast('1 vare lagt tilbage i kataloget');
    await waitFor(() => expect(screen.queryByRole('heading', { name: /I kurven/ })).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Læg i kurven: Ost' })).toBeInTheDocument();
  });
});
