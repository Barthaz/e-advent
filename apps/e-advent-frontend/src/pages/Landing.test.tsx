import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Landing from './Landing';

vi.mock('../santa-message/SantaAudioPlayer', () => ({ default: () => null }));
afterEach(cleanup);

describe('Homepage purchase links', () => {
  it('shows all three categories', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    const chapters = within(screen.getByRole('region', { name: 'Trzy rozdziały magii świąt' }));
    expect(chapters.getAllByRole('article')).toHaveLength(3);
    expect(chapters.getByRole('link', { name: 'Poznaj wiadomość' }).getAttribute('href')).toBe('/wiadomosc-od-mikolaja');
  });

  it('links straight to the voice creator and the letter bundle with catalog prices', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Stwórz wiadomość dla dziecka' }).getAttribute('href')).toBe('/wiadomosc-od-mikolaja/kreator');
    expect(screen.getByRole('link', { name: 'Wybierz magiczny zestaw' }).getAttribute('href')).toBe('/list-do-swietego-mikolaja?wiadomosc=1');
    expect(screen.getByText(/Osobno: 53 zł.*oszczędzasz 5 zł/)).toBeTruthy();
  });
});
