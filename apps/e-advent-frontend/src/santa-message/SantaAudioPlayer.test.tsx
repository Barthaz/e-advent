import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SantaAudioPlayer, { type SantaAudioPlayerHandle } from './SantaAudioPlayer';
let paused = true;
const playMock = vi.fn();
beforeEach(() => {
  paused = true;
  playMock.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(() => paused);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    playMock(); paused = false; this.dispatchEvent(new Event('play')); this.dispatchEvent(new Event('playing')); return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) { paused = true; this.dispatchEvent(new Event('pause')); });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('never autoplays on mount and invokes playback synchronously from the opening gesture', async () => {
  const ref = createRef<SantaAudioPlayerHandle>();
  render(<SantaAudioPlayer ref={ref} src="/voice.mp3" variant="wave" />);
  expect(playMock).not.toHaveBeenCalled();
  await act(async () => { ref.current?.play(); expect(playMock).toHaveBeenCalledOnce(); });
  expect(screen.getByRole('button', { name: 'Wstrzymaj wiadomość' })).toBeTruthy();
});
it('primes playback inside the gesture without starting the message', async () => {
  const onFirstPlay = vi.fn();
  const ref = createRef<SantaAudioPlayerHandle>();
  render(<SantaAudioPlayer ref={ref} src="/voice.mp3" variant="wave" onFirstPlay={onFirstPlay} />);
  act(() => { ref.current?.prime(); });
  expect(playMock).toHaveBeenCalledOnce();
  expect(paused).toBe(true);
  expect(onFirstPlay).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Odtwórz wiadomość' })).toBeTruthy();
  await act(async () => { ref.current?.play(); });
  expect(onFirstPlay).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Wstrzymaj wiadomość' })).toBeTruthy();
});
it('pause, seek, replay, volume and the actual ended event control the same audio element', async () => {
  const onEnded = vi.fn();
  const ref = createRef<SantaAudioPlayerHandle>();
  const { container } = render(<SantaAudioPlayer ref={ref} src="/voice.mp3" variant="wave" onEnded={onEnded} durationHint={30} />);
  const audio = container.querySelector('audio')!;
  fireEvent.change(screen.getByLabelText('Przewiń nagranie'), { target: { value: '12' } });
  expect(audio.currentTime).toBe(12);
  fireEvent.change(screen.getByLabelText('Głośność'), { target: { value: '0.25' } });
  expect(audio.volume).toBe(.25);
  await act(async () => { ref.current?.restart(); });
  expect(audio.currentTime).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Wstrzymaj wiadomość' }));
  expect(paused).toBe(true);
  expect(onEnded).not.toHaveBeenCalled();
  fireEvent.ended(audio);
  expect(onEnded).toHaveBeenCalledOnce();
});
it('refreshes an expired source and restores position only after new metadata loads', async () => {
  const refresh = vi.fn().mockResolvedValue('/fresh.mp3');
  const { container } = render(<SantaAudioPlayer src="/expired.mp3" onSourceExpired={refresh} durationHint={60} />);
  const audio = container.querySelector('audio')!;
  audio.currentTime = 17;
  await act(async () => { fireEvent.error(audio); });
  await waitFor(() => expect(audio.getAttribute('src')).toBe('/fresh.mp3'));
  expect(playMock).not.toHaveBeenCalled();
  audio.currentTime = 0;
  Object.defineProperty(audio, 'duration', { configurable: true, value: 60 });
  fireEvent.loadedMetadata(audio);
  expect(audio.currentTime).toBe(17);
  expect(playMock).not.toHaveBeenCalled();
});
it('shows a useful error when playback is blocked or the media fails', async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('blocked'));
  render(<SantaAudioPlayer src="/voice.mp3" variant="wave" />);
  fireEvent.click(screen.getByRole('button', { name: 'Odtwórz wiadomość' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Nie udało się odtworzyć'));
});
