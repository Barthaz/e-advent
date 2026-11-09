import { useEffect, useState } from 'react';

export interface ProductGalleryImage {
  src: string;
  alt: string;
  thumb?: string;
}

interface ProductGalleryProps {
  images: readonly ProductGalleryImage[];
  /** `contain` shows the whole product on a dark mat (e.g. wide scratch calendar shots). */
  fit?: 'cover' | 'contain';
}

const THUMB_COLUMNS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

export default function ProductGallery({ images, fit = 'cover' }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const count = images.length;
  const zoomable = count > 1;
  const active = images[activeIndex] ?? images[0];

  const step = (delta: number) => setActiveIndex((i) => (i + delta + count) % count);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + count) % count);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % count);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, count]);

  if (!active) return null;

  const frameClass = 'block w-full rounded-2xl overflow-hidden border border-christmas-gold/30 bg-cream shadow-xl';
  const mainImage = (
    <img
      src={active.src}
      alt={active.alt}
      className={`w-full ${fit === 'contain' ? 'aspect-[4/3] object-contain bg-[#24150f]' : 'aspect-[4/5] object-cover'}`}
      width={960}
      height={1200}
      decoding="async"
    />
  );

  return (
    <>
      {zoomable ? (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className={`${frameClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-christmas-gold`}
          aria-label="Powiększ zdjęcie"
        >
          {mainImage}
        </button>
      ) : (
        <div className={frameClass}>{mainImage}</div>
      )}

      {zoomable && (
        <div className={`mt-3 grid gap-2 ${THUMB_COLUMNS[count] ?? 'grid-cols-5'}`}>
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`rounded-xl overflow-hidden border-2 transition-colors ${
                i === activeIndex ? 'border-christmas-gold' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              aria-label={img.alt}
              aria-current={i === activeIndex}
            >
              <img
                src={img.thumb ?? img.src}
                alt=""
                className="w-full aspect-square object-cover"
                width={180}
                height={180}
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Powiększone zdjęcie"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl p-2"
            aria-label="Zamknij"
            onClick={() => setLightboxOpen(false)}
          >
            <i className="fas fa-times" />
          </button>
          <button
            type="button"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white text-xl hover:bg-black/70"
            aria-label="Poprzednie zdjęcie"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            <i className="fas fa-chevron-left" />
          </button>
          <figure className="max-w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={active.src}
              alt={active.alt}
              className="max-h-[82vh] max-w-[min(100%,920px)] rounded-xl shadow-2xl"
            />
            <figcaption className="mt-3 text-center text-white/80 text-sm">
              {active.alt}
              <span className="mx-2 text-white/40">·</span>
              {activeIndex + 1} / {count}
            </figcaption>
          </figure>
          <button
            type="button"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white text-xl hover:bg-black/70"
            aria-label="Następne zdjęcie"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}
    </>
  );
}
