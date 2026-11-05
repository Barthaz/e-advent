import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import Snowfall from '../../components/Snowfall';
import logo from '@e-advent/assets/brand/eadvent-logo.png';
import SantaAudioPlayer from '../../santa-message/SantaAudioPlayer';
import { absoluteAudioUrl, getPlayback, refreshPlayback, SantaApiError, type PlaybackView } from '../../santa-message/api';
import { trackSantaEvent } from '../../utils/analytics';

export const DEMO_TOKEN = 'przyklad';

const DEMO: PlaybackView = {
  childVocative: '',
  durationSeconds: 24,
  audioUrl: '/assets/santa_sample.mp3',
  downloadUrl: '',
  transcript: '',
  availableUntil: null,
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: PlaybackView }
  | { kind: 'error'; title: string; text: string };

function errorState(error: unknown): LoadState {
  if (error instanceof SantaApiError && error.status === 409) {
    return { kind: 'error', title: 'Elfy jeszcze pracują', text: 'Wiadomość jest w przygotowaniu. Gdy będzie gotowa, wyślemy link na adres e-mail z zamówienia.' };
  }
  if (error instanceof SantaApiError && error.status === 410) {
    return { kind: 'error', title: 'Nagranie wygasło', text: 'Ta wiadomość nie jest już dostępna. Jeśli potrzebujesz pomocy, napisz do nas: kontakt@e-advent.pl.' };
  }
  if (error instanceof SantaApiError && error.status === 404) {
    return { kind: 'error', title: 'Nie znaleźliśmy wiadomości', text: 'Link jest nieprawidłowy albo został unieważniony. Sprawdź, czy skopiowano go w całości.' };
  }
  return { kind: 'error', title: 'Coś poszło nie tak', text: 'Nie udało się wczytać wiadomości. Odśwież stronę za chwilę.' };
}

function durationBucket(seconds: number | null | undefined): string | undefined {
  if (!seconds) return undefined;
  if (seconds < 45) return '<45s';
  if (seconds < 90) return '45-90s';
  return '90s+';
}

export default function SantaPlayerPage() {
  const { token = '' } = useParams();
  const isDemo = token === DEMO_TOKEN;
  const [state, setState] = useState<LoadState>(isDemo ? { kind: 'ready', data: DEMO } : { kind: 'loading' });
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const source = isDemo ? 'demo' : 'email';
  const [reducedMotion] = useState(() => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));

  useEffect(() => {
    if (isDemo) return;
    let alive = true;
    getPlayback(token)
      .then((data) => alive && setState({ kind: 'ready', data }))
      .catch((error) => {
        if (!alive) return;
        setState(errorState(error));
        trackSantaEvent('santa_player_error', { error_type: error instanceof SantaApiError ? `load_${error.status}` : 'load_failed', source });
      });
    return () => {
      alive = false;
    };
  }, [isDemo, source, token]);

  const open = () => {
    setOpening(true);
    trackSantaEvent('santa_player_open', { source });
    window.setTimeout(() => setOpened(true), reducedMotion ? 0 : 650);
  };

  const refreshSource = useCallback(async () => {
    if (isDemo) return null;
    try {
      const fresh = await refreshPlayback(token);
      setState({ kind: 'ready', data: fresh });
      return absoluteAudioUrl(fresh.audioUrl);
    } catch {
      return null;
    }
  }, [isDemo, token]);

  const data = state.kind === 'ready' ? state.data : null;
  const greeting = data?.childVocative ? `${data.childVocative}, masz wiadomość!` : 'Masz wiadomość z Laponii!';

  return (
    <>
      <SEOHead
        title={isDemo ? 'Przykładowa wiadomość od Świętego Mikołaja | e-Advent' : 'Wiadomość od Świętego Mikołaja | e-Advent'}
        description="Osobista wiadomość głosowa od Świętego Mikołaja."
        canonical="https://e-advent.pl/wiadomosc-od-mikolaja"
        robots="noindex, nofollow"
      />
      <div className="santa-stage">
        {!reducedMotion && <Snowfall />}
        <div className="santa-stage-photo" role="img" aria-label="Święty Mikołaj w swojej pracowni w Laponii" />

        <Link to="/" className="absolute top-4 left-4 z-10 hidden md:block" aria-label="e-Advent — strona główna">
          <img src={logo} alt="e-Advent" className="h-12 w-auto drop-shadow-xl" />
        </Link>

        <div className="santa-stage-panel">
          <div className="santa-glass px-5 py-8 sm:px-8 text-center">
            <p className="text-christmas-gold text-xs tracking-[0.25em] uppercase mb-3">
              {isDemo ? 'Przykładowe nagranie' : 'Poczta z Laponii'}
            </p>

            {state.kind === 'loading' && (
              <div className="py-16" role="status">
                <i className="fas fa-snowflake fa-spin text-3xl text-christmas-gold-light" aria-hidden="true" />
                <p className="mt-4 text-white/80">Elfy niosą wiadomość…</p>
              </div>
            )}

            {state.kind === 'error' && (
              <div className="py-10">
                <h1 className="font-display text-3xl text-christmas-gold-light mb-3">{state.title}</h1>
                <p className="text-white/80 leading-relaxed mb-6">{state.text}</p>
                <Link to="/" className="btn-outline-gold px-6 py-2.5">Wróć na stronę e-Advent</Link>
              </div>
            )}

            {data && !opened && (
              <div className="py-4">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-christmas-gold-light mb-2">{greeting}</h1>
                <p className="text-white/75 mb-8">Święty Mikołaj nagrał coś specjalnie dla Ciebie.</p>
                <div className={`santa-envelope ${opening ? 'santa-envelope--opening' : 'santa-envelope--idle'}`} aria-hidden="true">
                  <span className="santa-envelope-seal"><i className="fas fa-star" /></span>
                </div>
                <button type="button" onClick={open} disabled={opening} className="btn-gold px-8 py-3.5 text-lg mt-8">
                  <i className="fas fa-envelope-open-text" aria-hidden="true" /> Otwórz wiadomość
                </button>
                <p className="text-white/50 text-xs mt-4">Włącz dźwięk w urządzeniu 🔔</p>
              </div>
            )}

            {data && opened && (
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-christmas-gold-light mb-5">
                  {data.childVocative ? `Dla: ${data.childVocative}` : 'Wiadomość od Świętego Mikołaja'}
                </h1>
                <SantaAudioPlayer
                  src={isDemo ? data.audioUrl : absoluteAudioUrl(data.audioUrl)}
                  downloadUrl={isDemo ? undefined : absoluteAudioUrl(data.downloadUrl)}
                  durationHint={data.durationSeconds}
                  size={260}
                  autoPlay
                  onFirstPlay={() => trackSantaEvent('santa_audio_play', { source, audio_duration_bucket: durationBucket(data.durationSeconds) })}
                  onProgress={(mark) => trackSantaEvent('santa_audio_progress', { progress_percent: mark, source })}
                  onDownload={() => trackSantaEvent('santa_audio_download', { source })}
                  onError={(kind) => trackSantaEvent('santa_player_error', { error_type: kind, source })}
                  onSourceExpired={refreshSource}
                />
                {data.transcript && (
                  <div className="mt-6 text-left">
                    <button type="button" onClick={() => setShowTranscript((v) => !v)} className="text-sm text-christmas-gold-light underline underline-offset-4" aria-expanded={showTranscript}>
                      {showTranscript ? 'Ukryj tekst wiadomości' : 'Pokaż tekst wiadomości'}
                    </button>
                    {showTranscript && (
                      <div className="mt-3 max-h-60 overflow-y-auto rounded-xl bg-black/20 p-4 text-sm text-white/85 leading-relaxed whitespace-pre-line">
                        {data.transcript}
                      </div>
                    )}
                  </div>
                )}
                {isDemo ? (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-white/80 text-sm mb-4">Chcesz takie nagranie z imieniem i sukcesami swojego dziecka?</p>
                    <Link
                      to="/wiadomosc-od-mikolaja/kreator"
                      onClick={() => trackSantaEvent('santa_product_cta_click', { cta_location: 'demo_player', purchase_mode: 'standalone' })}
                      className="btn-gold px-7 py-3"
                    >
                      Stwórz wiadomość
                    </Link>
                  </div>
                ) : (
                  <p className="text-white/45 text-xs mt-6">
                    Link jest prywatny — udostępniaj go tylko bliskim. To nagranie przygotowane automatycznie, a nie rozmowa na żywo.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
