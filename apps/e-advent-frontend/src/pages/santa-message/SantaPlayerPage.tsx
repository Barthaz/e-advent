import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SEOHead from '../../components/SEOHead';
import logo from '../../assets/brand-logo.webp';
import SantaAudioPlayer, { type SantaAudioPlayerHandle } from '../../santa-message/SantaAudioPlayer';
import { absoluteAudioUrl, downloadRecording, getPlayback, refreshPlayback, saveAudioFile, SantaApiError, type PlaybackView } from '../../santa-message/api';
import { SAMPLE_MESSAGES, samplePath } from '../../santa-message/samples';
import { trackSantaEvent } from '../../utils/analytics';
import '../../santa-message/santa-mail.css';

export const DEMO_TOKEN = 'przyklad';
const DEMO: PlaybackView = {
  childVocative: '', durationSeconds: 24, audioUrl: '/assets/santa_sample.mp3',
  downloadUrl: '', transcript: '', availableUntil: null,
};
type Phase = 'arrival' | 'opening' | 'listening' | 'complete';
type LoadState = { kind: 'loading' } | { kind: 'ready'; data: PlaybackView } | { kind: 'error'; title: string; text: string };

function errorState(error: unknown): LoadState {
  if (error instanceof SantaApiError && error.status === 409) {
    return { kind: 'error', title: 'Elfy jeszcze pracują', text: 'Wiadomość jest w przygotowaniu. Gdy będzie gotowa, wyślemy link na adres e-mail z zamówienia.' };
  }
  if (error instanceof SantaApiError && error.status === 410) {
    return { kind: 'error', title: 'Nagranie wygasło', text: 'Ta wiadomość nie jest już dostępna. Jeśli potrzebujesz pomocy, napisz do nas: kontakt@e-advent.pl.' };
  }
  if (error instanceof SantaApiError && error.status === 404) {
    return { kind: 'error', title: 'Nie znaleźliśmy wiadomości', text: 'Sprawdź, czy link został skopiowany w całości. Mógł też zostać unieważniony.' };
  }
  return { kind: 'error', title: 'Przesyłka utknęła w śniegu', text: 'Nie udało się wczytać wiadomości. Sprawdź połączenie i spróbuj ponownie.' };
}

function Ornament() {
  return <div className="mail-ornament" aria-hidden="true"><span /><i className="far fa-snowflake" /><span /></div>;
}

function DemoCta({ location }: { location: string }) {
  return <div className="mail-demo-cta"><Ornament /><p>A gdyby Mikołaj zwrócił się do Twojego dziecka po imieniu?</p><Link to="/wiadomosc-od-mikolaja/kreator" className="mail-button mail-button--red" onClick={() => trackSantaEvent('santa_product_cta_click', { cta_location: location, purchase_mode: 'standalone' })}><i className="fas fa-wand-magic-sparkles" aria-hidden="true" /> Stwórz własną wiadomość</Link><span>Imię, małe sukcesy i wielka świąteczna radość.</span></div>;
}

// A new token must unmount the old audio element and discard all private page state.
export default function SantaPlayerPage() {
  const { token = '', sample } = useParams();
  if (sample !== undefined) {
    const message = SAMPLE_MESSAGES[sample];
    if (!message) return <Navigate to={samplePath()} replace />;
    return <SantaExperience key={`${DEMO_TOKEN}/${sample}`} token={sample} sample={message} />;
  }
  return <SantaExperience key={token} token={token} />;
}

function SantaExperience({ token, sample }: { token: string; sample?: PlaybackView }) {
  const isSample = Boolean(sample);
  const isDemo = !isSample && token === DEMO_TOKEN;
  const local = isDemo ? DEMO : sample;
  const [state, setState] = useState<LoadState>(local ? { kind: 'ready', data: local } : { kind: 'loading' });
  const [phase, setPhase] = useState<Phase>(isDemo ? 'listening' : 'arrival');
  const [showTranscript, setShowTranscript] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const player = useRef<SantaAudioPlayerHandle>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const transition = useRef<ReturnType<typeof setTimeout> | null>(null);
  const source = local ? 'demo' : 'email';

  useEffect(() => {
    if (local) return;
    let alive = true;
    getPlayback(token).then((data) => { if (alive) setState({ kind: 'ready', data }); }).catch((error) => {
      if (!alive) return;
      setState(errorState(error));
      trackSantaEvent('santa_player_error', { error_type: error instanceof SantaApiError ? `load_${error.status}` : 'load_failed', source });
    });
    return () => { alive = false; };
  }, [local, source, token, attempt]);

  useEffect(() => () => { if (transition.current) clearTimeout(transition.current); }, []);
  useEffect(() => {
    if (phase === 'listening' || phase === 'complete') title.current?.focus({ preventScroll: true });
  }, [phase]);

  const open = () => {
    if (phase !== 'arrival') return;
    setPhase('opening');
    player.current?.prime();
    trackSantaEvent('santa_player_open', { source });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Matches the envelope opening and fade-out in santa-mail.css.
    transition.current = setTimeout(() => {
      setPhase((current) => current === 'opening' ? 'listening' : current);
      player.current?.play();
    }, reduced ? 0 : 1700);
  };
  const replay = () => { setPhase('listening'); player.current?.restart(); };
  const refreshSource = useCallback(async () => {
    if (local) return null;
    try {
      const fresh = await refreshPlayback(token);
      // The player owns source replacement and resuming after loadedmetadata.
      setState((previous) => previous.kind === 'ready' ? { kind: 'ready', data: { ...fresh, audioUrl: previous.data.audioUrl } } : previous);
      return absoluteAudioUrl(fresh.audioUrl);
    } catch { return null; }
  }, [local, token]);
  const data = state.kind === 'ready' ? state.data : null;
  const saveRecording = async () => {
    if (downloadBusy) return;
    setDownloadBusy(true);
    setDownloadError('');
    try {
      if (sample) await saveAudioFile(sample.downloadUrl);
      else await downloadRecording(token);
      trackSantaEvent('santa_audio_download', { source });
    } catch { setDownloadError('Nie udało się pobrać nagrania. Sprawdź połączenie i spróbuj ponownie.'); }
    finally { setDownloadBusy(false); }
  };
  const siblings = data?.forSiblings === true;
  const vocative = data?.childVocative;
  const name = data?.childName;
  const deliveryDate = data?.availableUntil ? new Date(data.availableUntil) : null;
  const until = deliveryDate && Number.isFinite(deliveryDate.getTime()) ? deliveryDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const arrival = phase === 'arrival' || phase === 'opening';

  return <>
    <SEOHead title={isDemo ? 'Posłuchaj Mikołaja — przykładowa wiadomość | e-Advent' : sample ? `Przykładowa wiadomość od Mikołaja dla dziecka: ${sample.childName} | e-Advent` : 'Twoja poczta z Bieguna Północnego | e-Advent'} description="Magiczna przesyłka i osobista wiadomość od Świętego Mikołaja." canonical="https://e-advent.pl/wiadomosc-od-mikolaja" robots="noindex, nofollow" />
    <main className={`santa-mail santa-mail--${phase} ${isDemo ? 'santa-mail--demo' : ''}`}>
      <div className={`mail-scenery mail-scenery--post ${arrival || phase === 'complete' ? 'is-visible' : ''}`} aria-hidden="true" />
      <div className={`mail-scenery mail-scenery--reading ${!arrival && phase !== 'complete' ? 'is-visible' : ''}`} aria-hidden="true" />
      <div className="mail-shade" aria-hidden="true" />
      <div className="mail-sparks" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <span key={i} style={{ '--i': i, left: `${(i * 37 + 11) % 100}%`, top: `${(i * 23 + 7) % 100}%` } as CSSProperties} />)}</div>
      <header className="mail-header">
        <Link to="/" aria-label="e-Advent — strona główna"><img src={logo} alt="e-Advent" /></Link>
        <span><i className="far fa-snowflake" aria-hidden="true" /> Pracownia Świętego Mikołaja</span>
        <Link to="/wiadomosc-od-mikolaja" className="mail-back">O wiadomościach <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
      </header>
      <div className="mail-layout">
        {isDemo && <div className="mail-demo-visual"><img src="/assets/santa-mail/santa-reading.webp" alt="Mikołaj czyta list w swojej świątecznej pracowni" width={1536} height={1024} /><p>Prosto z pracowni.<br /><em>Z myślą o kimś wyjątkowym.</em></p></div>}
        <div className="mail-content">
          <div className="mail-postmark"><Ornament /><p>{isDemo ? 'Zajrzyj do pracowni Mikołaja' : isSample ? 'Przykładowa poczta z Bieguna Północnego' : 'Poczta z Bieguna Północnego'}</p></div>
          {state.kind === 'loading' && <div className="mail-state" role="status"><i className="far fa-snowflake fa-spin" aria-hidden="true" /><h1>Elfy niosą wiadomość…</h1><p>Jeszcze chwila. Magia jest już blisko.</p></div>}
          {state.kind === 'error' && <div className="mail-state" role="alert"><h1>{state.title}</h1><p>{state.text}</p><button className="mail-button" onClick={() => { setState({ kind: 'loading' }); setAttempt((v) => v + 1); }}>Spróbuj ponownie</button><Link className="mail-text-link" to="/">Wróć do e-Advent</Link></div>}
          {data && <>
            {arrival && <section className="mail-arrival mail-enter" aria-labelledby="mail-title">
              <h1 id="mail-title">{vocative && <span className="mail-child">{vocative},</span>}{siblings ? 'macie wyjątkową' : 'masz wyjątkową'}<br />wiadomość!</h1>
              <p className="mail-intro">Święty Mikołaj przygotował coś specjalnie dla {siblings ? 'Was' : 'Ciebie'}.<br className="mail-desktop-break" /> Przesyłka właśnie dotarła z jego pracowni…</p>
              <div className={`mail-envelope ${phase === 'opening' ? 'is-opening' : ''}`} aria-hidden="true">
                <div className="mail-envelope-letter"><i className="far fa-snowflake" /><span>Specjalnie dla {siblings ? 'Was' : 'Ciebie'}</span></div>
                <div className="mail-envelope-pocket" /><div className="mail-envelope-flap" />
                <span className="mail-wax"><i className="far fa-snowflake" /></span>
                <span className="mail-envelope-address">Przesyłka specjalna{ name && <strong>{name}</strong>}</span>
              </div>
              <button type="button" className="mail-button mail-button--red" onClick={open} disabled={phase === 'opening'}><i className="far fa-envelope-open" aria-hidden="true" />{phase === 'opening' ? 'Otwieramy przesyłkę…' : 'Otwórz wiadomość'}</button>
              <p className="mail-hint"><i className="fas fa-volume-low" aria-hidden="true" /> {siblings ? 'Włączcie dźwięk i rozsiądźcie się wygodnie' : 'Włącz dźwięk i rozsiądź się wygodnie'}</p>
            </section>}
            <section className="mail-listening mail-enter" hidden={phase !== 'listening'} aria-labelledby="listening-title">
              <p className="mail-eyebrow">{isDemo ? 'Przykładowe nagranie' : siblings ? 'Wiadomość dla Was' : 'Wiadomość tylko dla Ciebie'}</p>
              <h1 id="listening-title" ref={phase === 'listening' ? title : undefined} tabIndex={-1}>{isDemo ? <>Tak brzmi<br />świąteczna magia</> : vocative ? <>{vocative},<br /><em>{siblings ? 'posłuchajcie…' : 'posłuchaj…'}</em></> : <>Posłuchaj<br /><em>Świętego Mikołaja…</em></>}</h1>
              {isDemo && <p className="mail-intro">Rozgość się i posłuchaj krótkiego fragmentu. W Twojej wiadomości Mikołaj zwróci się do dziecka po imieniu.</p>}
              <SantaAudioPlayer ref={player} variant="wave" size={400} src={local ? data.audioUrl : absoluteAudioUrl(data.audioUrl)} durationHint={data.durationSeconds}
                onFirstPlay={() => trackSantaEvent('santa_audio_play', { source })}
                onProgress={(mark) => trackSantaEvent('santa_audio_progress', { progress_percent: mark, source })}
                onError={(kind) => trackSantaEvent('santa_player_error', { error_type: kind, source })}
                onSourceExpired={local ? undefined : refreshSource}
                onEnded={() => { if (!isDemo) { setPhase('complete'); setShowTranscript(false); } }} />
              {!isDemo && <div className="mail-note"><i className="fas fa-tree" aria-hidden="true" /><p>Elfy opowiedziały mi o {siblings ? 'Was' : 'Tobie'}…<br /><em>{siblings ? 'Tak wiele dobra macie w sobie!' : 'Tak wiele dobra masz w sobie!'}</em></p></div>}
              {data.transcript && !isDemo && <div className="mail-transcript"><button className="mail-text-link" type="button" onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript} aria-controls="mail-transcript">{showTranscript ? 'Ukryj tekst wiadomości' : 'Przeczytaj tekst wiadomości'}</button>{showTranscript && <p id="mail-transcript">{data.transcript}</p>}</div>}
              {isDemo && <DemoCta location="demo_player" />}
            </section>
            {phase === 'complete' && !isDemo && <section className="mail-finale mail-enter" aria-labelledby="complete-title">
              <div className="mail-parchment"><Ornament /><p className="mail-eyebrow">Przesyłka odebrana sercem</p><h1 id="complete-title" ref={title} tabIndex={-1}>Wiadomość<br />została dostarczona!</h1><div className="mail-parchment-rule" /><p>{vocative ? `${vocative}, dziękuję za wspólną chwilę.` : 'Dziękuję za wspólną chwilę.'}<br />{siblings ? 'Pamiętajcie, że magia świąt jest zawsze bliżej, niż myślicie.' : 'Pamiętaj, że magia świąt jest zawsze bliżej, niż myślisz.'}</p><p className="mail-signature">Ho, ho, ho!<span>{siblings ? 'Wasz' : 'Twój'} Święty Mikołaj</span></p><div className="mail-stamp" aria-hidden="true"><i className="fas fa-sleigh" /><span>Biegun Północny</span></div></div>
              <div className="mail-finale-actions"><button type="button" className="mail-button" onClick={replay}><i className="fas fa-rotate-left" aria-hidden="true" /> Posłuchaj ponownie</button>{data.downloadUrl && <button type="button" className="mail-button mail-button--outline" disabled={downloadBusy} onClick={() => void saveRecording()}><i className={`fas ${downloadBusy ? 'fa-circle-notch fa-spin' : 'fa-download'}`} aria-hidden="true" />{downloadBusy ? 'Pobieramy nagranie…' : 'Pobierz nagranie MP3'}</button>}
                {downloadError && <p role="alert" className="mail-hint">{downloadError}</p>}
              </div>{isSample ? <DemoCta location="sample_player" /> : <p className="mail-return-note">{siblings ? 'Możecie wracać do tej chwili pod Waszym linkiem.' : 'Możesz wracać do tej chwili pod swoim linkiem.'}{until && <> Nagranie dostępne do {until}.</>}</p>}
            </section>}
          </>}
          <footer className="mail-footer"><Ornament /><p>{isDemo ? 'Odrobina magii. Całe mnóstwo uśmiechu.' : 'Magiczna przesyłka'}{!isDemo && <><span>✦</span>Tylko dla {siblings ? 'Was' : 'Ciebie'}</>}</p></footer>
        </div>
        <div className="mail-scene-caption" aria-hidden="true"><span>66°33′ N · 25°44′ E</span><p>{phase === 'complete' ? 'Najpiękniejsza magia zostaje z nami.' : 'Tu zaczynają się świąteczne opowieści.'}</p></div>
      </div>
      <div className="mail-bottom"><span>Prosto z pracowni Świętego Mikołaja</span><span>z odrobiną magii od <Link to="/">e-Advent</Link></span></div>
    </main>
  </>;
}
