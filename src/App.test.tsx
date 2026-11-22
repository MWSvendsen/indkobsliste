import { render, screen } from '@testing-library/react';
import { App } from './App';
import { initDatabase } from './data/bootstrap';

describe('App', () => {
  it('viser overskriften og den seedede database', async () => {
    await initDatabase();
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Indkøb' })).toBeInTheDocument();
    expect(await screen.findByText(/10 områder, 46 varer og 7 retter/)).toBeInTheDocument();
    expect(screen.getByText('Frugt & grønt')).toBeInTheDocument();
  });
});
