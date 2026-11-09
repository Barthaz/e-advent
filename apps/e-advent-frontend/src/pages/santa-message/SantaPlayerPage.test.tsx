import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SantaPlayerPage from './SantaPlayerPage';
import * as api from '../../santa-message/api';

vi.mock('../../santa-message/api', async (original) => ({ ...await original<typeof api>(), getPlayback: vi.fn(), refreshPlayback: vi.fn(), downloadRecording: vi.fn(), saveAudioFile: vi.fn() }));
vi.mock('../../utils/analytics', () => ({ trackSantaEvent: vi.fn() }));
const audio = vi.hoisted(() => ({ play: vi.fn(), prime: vi.fn(), restart: vi.fn() }));
vi.mock('../../santa-message/SantaAudioPlayer', async () => {
  const { useImperativeHandle } = await import('react');
  return { default: (props: { ref: import('react').Ref<unknown>; onEnded: () => void; onProgress: (n: number) => void }) => {
    useImperativeHandle(props.ref, () => audio);
    return <div><button onClick={props.onEnded}>Zakończ testowe audio</button><button onClick={() => props.onProgress(100)}>Raport postępu</button></div>;
  } };
});
const message: api.PlaybackView = { childName: 'Feliks', childVocative: 'Feliksie', audioUrl: '/audio.mp3', downloadUrl: '/download.mp3', durationSeconds: 24, transcript: 'Witaj, Feliksie!', availableUntil: '2027-12-24T00:00:00Z' };
function mount(token = 'private-one') {
  render(<MemoryRouter initialEntries={[`/od-mikolaja/${token}`]}><Link to="/od-mikolaja/private-two">Next fixture</Link><Routes><Route path="/od-mikolaja/:token" element={<SantaPlayerPage />} /><Route path="/od-mikolaja/przyklad/:sample" element={<SantaPlayerPage />} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getPlayback).mockResolvedValue(message);
  vi.mocked(api.downloadRecording).mockResolvedValue();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function openMessage() {
  fireEvent.click(await screen.findByRole('button', { name: 'Otwórz wiadomość' }));
  await screen.findByRole('heading', { name: /Feliksie.*posłuchaj/ });
}

describe('North Pole experience', () => {
  it('opens by gesture, ends only on ended, downloads and replays without fetching a new link', async () => {
    mount();
    await screen.findByText('Feliks');
    expect(audio.play).not.toHaveBeenCalled();
    await openMessage();
    expect(audio.prime).toHaveBeenCalledOnce();
    expect(audio.play).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Raport postępu' }));
    expect(screen.queryByText(/została dostarczona/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ testowe audio' }));
    expect(screen.getByRole('heading', { name: /została dostarczona/ })).toBeTruthy();
    expect(document.activeElement?.id).toBe('complete-title');
    expect(screen.getByText(/24 grudnia 2027/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz nagranie MP3' }));
    await waitFor(() => expect(api.downloadRecording).toHaveBeenCalledWith('private-one'));
    fireEvent.click(screen.getByRole('button', { name: 'Posłuchaj ponownie' }));
    expect(audio.restart).toHaveBeenCalledOnce();
    expect(api.getPlayback).toHaveBeenCalledOnce();
  });
  it('keeps the demo to listening only, including after the sample ends', async () => {
    mount('przyklad');
    expect(screen.queryByRole('button', { name: 'Otwórz wiadomość' })).toBeNull();
    expect(screen.getByRole('heading', { name: /Tak brzmi/ })).toBeTruthy();
    expect(audio.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ testowe audio' }));
    expect(screen.queryByText(/została dostarczona/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Pobierz nagranie/ })).toBeNull();
    expect(api.getPlayback).not.toHaveBeenCalled();
  });
  it('lets the envelope fade out before the message starts playing', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    mount();
    const openButton = await screen.findByRole('button', { name: 'Otwórz wiadomość' });
    vi.useFakeTimers();
    try {
      fireEvent.click(openButton);
      expect(audio.prime).toHaveBeenCalledOnce();
      expect(audio.play).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Otwieramy przesyłkę…' })).toBeTruthy();
      act(() => { vi.advanceTimersByTime(1200); });
      expect(audio.play).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(500); });
      expect(audio.play).toHaveBeenCalledOnce();
      expect(screen.getByRole('heading', { name: /Feliksie.*posłuchaj/ })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
  it('plays the named sample through the full delivery without calling the API', async () => {
    vi.mocked(api.saveAudioFile).mockResolvedValue();
    mount('przyklad/feliks');
    expect(screen.getByText('Przykładowa poczta z Bieguna Północnego')).toBeTruthy();
    await openMessage();
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ testowe audio' }));
    expect(screen.getByRole('heading', { name: /została dostarczona/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Stwórz własną wiadomość/ }).getAttribute('href')).toBe('/wiadomosc-od-mikolaja/kreator');
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz nagranie MP3' }));
    await waitFor(() => expect(api.saveAudioFile).toHaveBeenCalledWith('/assets/santa-mail/samples/feliks.mp3'));
    expect(api.getPlayback).not.toHaveBeenCalled();
    expect(api.downloadRecording).not.toHaveBeenCalled();
  });
  it('sends an unknown sample to the default child', async () => {
    mount('przyklad/nieznany');
    expect(await screen.findByText('Feliks')).toBeTruthy();
    expect(api.getPlayback).not.toHaveBeenCalled();
  });
  it('discards previous personalization and playback when the URL token changes', async () => {
    mount();
    await openMessage();
    vi.mocked(api.getPlayback).mockResolvedValue({ ...message, childName: 'Zosia', childVocative: 'Zosiu' });
    fireEvent.click(screen.getByRole('link', { name: 'Next fixture' }));
    await screen.findByText('Zosia');
    expect(screen.queryByText('Feliks')).toBeNull();
    expect(screen.getByRole('button', { name: 'Otwórz wiadomość' })).toBeTruthy();
    expect(audio.play).toHaveBeenCalledOnce();
  });
  it.each([404, 409, 410, 500])('handles load error %s without exposing the player', async (status) => {
    vi.mocked(api.getPlayback).mockRejectedValue(new api.SantaApiError(status, 'ERROR', 'error'));
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Otwórz wiadomość' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Zakończ testowe audio' })).toBeNull();
  });
  it('offers retry after a failed MP3 download', async () => {
    vi.mocked(api.downloadRecording).mockRejectedValue(new Error('offline'));
    mount(); await openMessage();
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ testowe audio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz nagranie MP3' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Nie udało się pobrać'));
    expect(screen.getByRole('button', { name: 'Pobierz nagranie MP3' })).toHaveProperty('disabled', false);
  });
});
