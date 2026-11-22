import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('viser overskriften', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Indkøb' })).toBeInTheDocument();
  });
});
