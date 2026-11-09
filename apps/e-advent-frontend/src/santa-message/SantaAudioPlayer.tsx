import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref, type CSSProperties } from 'react';
import './audio-player.css';

const BAR_COUNT = 48;
const PROGRESS_MARKS = [25, 50, 75, 100] as const;

export type ProgressMark = (typeof PROGRESS_MARKS)[number];

export interface SantaAudioPlayerHandle { play: () => void; prime: () => void; restart: () => void }

interface SantaAudioPlayerProps {
  ref?: Ref<SantaAudioPlayerHandle>;
  variant?: 'ring' | 'wave';
  onEnded?: () => void;
  src: string;
  downloadUrl?: string;
  /** Seconds known before metadata loads (from the API) */
  durationHint?: number | null;
  size?: number;
  autoPlay?: boolean;
  onFirstPlay?: () => void;
  onProgress?: (mark: ProgressMark) => void;
  onDownload?: () => void;
  onError?: (kind: 'playback' | 'analyser') => void;
  /** Signed URLs expire; return a fresh one to resume playback */
  onSourceExpired?: () => Promise<string | null>;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Golden sound ring: BAR_COUNT bars around the play button driven by a Web Audio
 * AnalyserNode. Shows a static visualization if the analyser is unavailable or
 * reduced motion is requested. Supports a compact ring and a horizontal wave.
 */
export default function SantaAudioPlayer({
  ref,
  variant = 'ring',
  onEnded,
  src,
  downloadUrl,
  durationHint,
  size = 280,
  autoPlay = false,
  onFirstPlay,
  onProgress,
  onDownload,
  onError,
  onSourceExpired,
}: SantaAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const levelsRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => 0));
  const frameRef = useRef<number | null>(null);
  const playedRef = useRef(false);
  const marksRef = useRef(new Set<number>());
  const retriedRef = useRef(false);
  const analyserFailedRef = useRef(false);
  const resumeRef = useRef<{ time: number; play: boolean } | null>(null);
  const wantsPlaybackRef = useRef(false);
  const primingRef = useRef(false);

  const reducedMotion = usePrefersReducedMotion();
  const [currentSrc, setCurrentSrc] = useState(src);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [failed, setFailed] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => setCurrentSrc(src), [src]);

  /**
   * Once routed through Web Audio the element is silent unless the context runs,
   * so the graph is only built on a context confirmed to be running.
   */
  const setupAnalyser = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || contextRef.current || analyserFailedRef.current) return;
    try {
      const Ctor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!Ctor) throw new Error('no AudioContext');
      const context = new Ctor();
      if (context.state !== 'running') {
        await Promise.race([context.resume(), new Promise((resolve) => setTimeout(resolve, 400))]);
      }
      if (context.state !== 'running' || contextRef.current || audioRef.current !== audio) {
        void context.close().catch(() => {});
        return;
      }
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(context.destination);
      contextRef.current = context;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch {
      analyserFailedRef.current = true;
      onError?.('analyser');
    }
  }, [onError]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const height = variant === 'wave' ? 88 : size;
    if (canvas.width !== size * dpr || canvas.height !== height * dpr) {
      canvas.width = size * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, height);

    const audio = audioRef.current;
    const isPlaying = Boolean(audio && !audio.paused && !audio.ended);
    const levels = levelsRef.current;
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (isPlaying && analyser && data) analyser.getByteFrequencyData(data);

    const half = BAR_COUNT / 2;
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const mirrored = i < half ? i : BAR_COUNT - 1 - i;
      let target: number;
      if (reducedMotion) {
        target = 0.18;
      } else if (isPlaying && analyser && data) {
        // Voice energy sits in the lower bins; spread them over half the ring and mirror.
        const bin = Math.min(data.length - 1, 2 + Math.floor((mirrored / half) * data.length * 0.55));
        target = Math.pow(data[bin] / 255, 1.4);
      } else {
        // A quiet static wave when paused or Web Audio is unavailable; never fake speech.
        target = 0.07 + 0.05 * Math.sin(mirrored * 0.45);
      }
      levels[i] += (target - levels[i]) * (reducedMotion ? 1 : 0.28);
    }

    if (variant === 'wave') {
      ctx.lineWidth = Math.max(2, size / BAR_COUNT * 0.46);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#edbd70';
      ctx.shadowColor = '#e9a64b';
      ctx.shadowBlur = isPlaying && !reducedMotion ? 9 : 0;
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const x = (i + 0.5) * size / BAR_COUNT;
        const length = 3 + levels[i] * 36;
        ctx.beginPath();
        ctx.moveTo(x, height / 2 - length);
        ctx.lineTo(x, height / 2 + length);
        ctx.stroke();
      }
      return;
    }
    const center = size / 2;
    const inner = size * 0.3;
    const maxLength = size * 0.17;
    const barWidth = Math.max(2, (2 * Math.PI * inner) / BAR_COUNT * 0.5);
    ctx.lineCap = 'round';
    ctx.lineWidth = barWidth;
    ctx.shadowColor = 'rgba(244, 208, 63, 0.55)';
    ctx.shadowBlur = isPlaying && !reducedMotion ? 12 : 4;
    for (let i = 0; i < BAR_COUNT; i += 1) {
      const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
      const length = 4 + levels[i] * maxLength;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const alpha = 0.55 + levels[i] * 0.45;
      ctx.strokeStyle = `rgba(${244 - Math.round(levels[i] * 32)}, ${208 - Math.round(levels[i] * 33)}, ${63 - Math.round(levels[i] * 8)}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(center + cos * inner, center + sin * inner);
      ctx.lineTo(center + cos * (inner + length), center + sin * (inner + length));
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    const progress = audio && audio.duration ? audio.currentTime / audio.duration : 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(center, center, inner - 9, 0, Math.PI * 2);
    ctx.stroke();
    if (progress > 0) {
      ctx.strokeStyle = '#f4d03f';
      ctx.beginPath();
      ctx.arc(center, center, inner - 9, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }
  }, [reducedMotion, size, variant]);

  useEffect(() => {
    let alive = true;
    const loop = () => {
      if (!alive) return;
      draw();
      const audio = audioRef.current;
      const idleStatic = reducedMotion || !audio || audio.paused;
      frameRef.current = idleStatic ? null : requestAnimationFrame(loop);
    };
    if (typeof requestAnimationFrame === 'function') frameRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [draw, playing, reducedMotion]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      // StrictMode remounts keep the same element; closing then would mute it for good.
      setTimeout(() => {
        if (audio?.isConnected) return;
        void contextRef.current?.close().catch(() => {});
        contextRef.current = null;
        analyserRef.current = null;
      }, 0);
    };
  }, []);

  const play = useCallback(async (silent = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    setFailed(false);
    primingRef.current = false;
    wantsPlaybackRef.current = true;
    // Invoke play in the original click stack (also on iOS), before any await.
    setLoading(true);
    const playback = audio.play();
    void setupAnalyser();
    try {
      if (contextRef.current?.state === 'suspended') await contextRef.current.resume();
      await playback;
    } catch {
      setLoading(false);
      // A blocked autoplay is not an error: the big button is right there.
      if (silent) return;
      setFailed(true);
      onError?.('playback');
    }
  }, [onError, setupAnalyser]);

  /**
   * iOS only lets an element start later from a timer if it was played inside a gesture,
   * and Web Audio needs the gesture to create a running context. No sound is produced.
   */
  const prime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    primingRef.current = true;
    audio.play()?.catch(() => {});
    audio.pause();
    void setupAnalyser();
  }, [setupAnalyser]);

  useEffect(() => {
    if (autoPlay) void play(true);
    // Autoplay is requested once, right after the envelope is opened by a click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void play();
    else audio.pause();
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrent(0);
    if (audio.paused) void play();
  };

  useImperativeHandle(ref, () => ({ play: () => { void play(); }, prime, restart }));

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
    if (!audio.duration || !onProgress) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    for (const mark of PROGRESS_MARKS) {
      if (percent >= mark - (mark === 100 ? 1 : 0) && !marksRef.current.has(mark)) {
        marksRef.current.add(mark);
        onProgress(mark);
      }
    }
  };

  const handleError = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (onSourceExpired && !retriedRef.current) {
      retriedRef.current = true;
      const resumeAt = audio.currentTime;
      const shouldPlay = wantsPlaybackRef.current;
      const fresh = await onSourceExpired();
      if (fresh && audioRef.current === audio) {
        resumeRef.current = { time: resumeAt, play: shouldPlay };
        setCurrentSrc(fresh);
        return;
      }
    }
    setLoading(false);
    setPlaying(false);
    setFailed(true);
    onError?.('playback');
  };

  const total = duration || durationHint || 0;

  return (
    <div className={`santa-player ${variant === 'wave' ? 'santa-player--wave' : ''} flex flex-col items-center gap-4 w-full`}>
      <audio
        ref={audioRef}
        src={currentSrc}
        crossOrigin="anonymous"
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
          const resume = resumeRef.current;
          if (resume) {
            resumeRef.current = null;
            e.currentTarget.currentTime = Number.isFinite(d) ? Math.min(resume.time, d) : resume.time;
            if (resume.play) void play();
          }
        }}
        onPlay={() => {
          if (primingRef.current) return;
          setPlaying(true);
          if (!playedRef.current) {
            playedRef.current = true;
            onFirstPlay?.();
          }
        }}
        onPlaying={() => { setLoading(false); retriedRef.current = false; }}
        onWaiting={() => setLoading(true)}
        onPause={() => {
          if (primingRef.current) { primingRef.current = false; return; }
          setPlaying(false); setLoading(false); wantsPlaybackRef.current = false;
        }}
        onEnded={() => {
          setPlaying(false);
          setLoading(false);
          wantsPlaybackRef.current = false;
          handleTimeUpdate();
          onEnded?.();
        }}
        onTimeUpdate={handleTimeUpdate}
        onError={() => void handleError()}
      />

      <div className="relative santa-visualizer" style={{ width: size, height: variant === 'wave' ? 88 : size, maxWidth: '100%' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
        {variant === 'ring' && <button
          type="button"
          onClick={toggle}
          className="santa-play-button absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-christmas-gold-light/70"
          style={{ width: size * 0.42, height: size * 0.42 }}
          aria-label={playing ? 'Wstrzymaj wiadomość' : 'Odtwórz wiadomość'}
        >
          {loading && playing ? (
            <i className="fas fa-circle-notch fa-spin text-3xl" aria-hidden="true" />
          ) : (
            <i className={`fas ${playing ? 'fa-pause' : 'fa-play ml-1.5'} text-4xl`} aria-hidden="true" />
          )}
        </button>}
      </div>

      <div className="w-full max-w-sm">
        <input
          type="range"
          min={0}
          max={total || 0}
          step={0.1}
          value={Math.min(current, total || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          className="santa-seek w-full"
          style={{ '--progress': `${total ? Math.min(100, current / total * 100) : 0}%` } as CSSProperties}
          aria-label="Przewiń nagranie"
          aria-valuetext={`${formatTime(current)} z ${formatTime(total)}`}
          disabled={!total}
        />
        <div className="flex justify-between text-xs text-white/70 tabular-nums mt-1">
          <span>{formatTime(current)}</span>
          <span>{formatTime(total)}</span>
        </div>
      </div>

      <div className="santa-controls">
        {variant === 'wave' && <>
          <div className="santa-volume-controls">
          <button type="button" className="santa-chip santa-volume-toggle" onClick={() => {
            if (!audioRef.current) return;
            const next = volume ? 0 : 1;
            audioRef.current.volume = next;
            setVolume(next);
          }} aria-label={volume ? 'Wycisz dźwięk' : 'Włącz dźwięk'}>
            <i className={`fas ${volume ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true" />
          </button>
          <input className="santa-volume santa-seek" type="range" min="0" max="1" step="0.05" value={volume} aria-label="Głośność" style={{ '--progress': `${volume * 100}%` } as CSSProperties} onChange={(e) => {
            const next = Number(e.target.value);
            setVolume(next);
            if (audioRef.current) audioRef.current.volume = next;
          }} />
          </div>
          <button type="button" onClick={toggle} className="santa-wave-play" aria-label={playing ? 'Wstrzymaj wiadomość' : 'Odtwórz wiadomość'}>
            <i className={`fas ${loading ? 'fa-circle-notch fa-spin' : playing ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />
          </button>
        </>}
        <button type="button" onClick={restart} className="santa-chip" aria-label="Odtwórz od początku">
          <i className="fas fa-redo-alt" aria-hidden="true" /> Od początku
        </button>
        {downloadUrl && (
          <a href={downloadUrl} download="wiadomosc-od-swietego-mikolaja.mp3" onClick={() => onDownload?.()} className="santa-chip" rel="noreferrer">
            <i className="fas fa-download" aria-hidden="true" /> Pobierz MP3
          </a>
        )}
      </div>

      {failed && (
        <p role="alert" className="text-sm text-amber-200 text-center max-w-sm">
          Nie udało się odtworzyć nagrania. Sprawdź połączenie i spróbuj ponownie
          {downloadUrl ? ' albo pobierz plik MP3.' : '.'}
        </p>
      )}
    </div>
  );
}
