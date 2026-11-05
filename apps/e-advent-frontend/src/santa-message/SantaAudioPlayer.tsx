import { useCallback, useEffect, useRef, useState } from 'react';

const BAR_COUNT = 48;
const PROGRESS_MARKS = [25, 50, 75, 100] as const;

export type ProgressMark = (typeof PROGRESS_MARKS)[number];

interface SantaAudioPlayerProps {
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
 * AnalyserNode. Falls back to a synthetic animation when the analyser is unavailable
 * and to a static ring for prefers-reduced-motion.
 */
export default function SantaAudioPlayer({
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

  const reducedMotion = usePrefersReducedMotion();
  const [currentSrc, setCurrentSrc] = useState(src);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [failed, setFailed] = useState(false);

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

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

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
      } else if (isPlaying) {
        target = 0.25 + 0.45 * Math.abs(Math.sin(time / 180 + mirrored * 0.7) * Math.cos(time / 410 + mirrored * 0.33));
      } else {
        target = 0.07 + 0.05 * Math.sin(time / 900 + mirrored * 0.45);
      }
      levels[i] += (target - levels[i]) * (reducedMotion ? 1 : 0.28);
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
  }, [reducedMotion, size]);

  useEffect(() => {
    let alive = true;
    const loop = (time: number) => {
      if (!alive) return;
      draw(time);
      const audio = audioRef.current;
      const idleStatic = reducedMotion && (!audio || audio.paused);
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
    await setupAnalyser();
    try {
      if (contextRef.current?.state === 'suspended') await contextRef.current.resume();
      setLoading(true);
      await audio.play();
    } catch {
      setLoading(false);
      // A blocked autoplay is not an error: the big button is right there.
      if (silent) return;
      setFailed(true);
      onError?.('playback');
    }
  }, [onError, setupAnalyser]);

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
    if (audio.paused) void play();
  };

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
      const fresh = await onSourceExpired();
      if (fresh) {
        setCurrentSrc(fresh);
        requestAnimationFrame(() => {
          if (!audioRef.current) return;
          audioRef.current.currentTime = resumeAt;
          void play();
        });
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
    <div className="santa-player flex flex-col items-center gap-4 w-full">
      <audio
        ref={audioRef}
        src={currentSrc}
        crossOrigin="anonymous"
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onPlay={() => {
          setPlaying(true);
          if (!playedRef.current) {
            playedRef.current = true;
            onFirstPlay?.();
          }
        }}
        onPlaying={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          handleTimeUpdate();
        }}
        onTimeUpdate={handleTimeUpdate}
        onError={() => void handleError()}
      />

      <div className="relative" style={{ width: size, height: size, maxWidth: '100%' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
        <button
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
        </button>
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
          aria-label="Przewiń nagranie"
          aria-valuetext={`${formatTime(current)} z ${formatTime(total)}`}
          disabled={!total}
        />
        <div className="flex justify-between text-xs text-white/70 tabular-nums mt-1">
          <span>{formatTime(current)}</span>
          <span>{formatTime(total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
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
