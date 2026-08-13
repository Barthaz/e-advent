import { Link } from 'react-router-dom';
import ScratchDesignPreview from '../ScratchDesignPreview';

export interface ProductShowcaseImage {
  src: string;
  alt: string;
}

export interface ProductShowcaseCta {
  label: string;
  to: string;
}

interface ProductShowcaseProps {
  images: ProductShowcaseImage[];
  eyebrow: string;
  title: string;
  description: string;
  priceLabel: string;
  priceHint?: string;
  features: string[];
  cta: ProductShowcaseCta;
  /** Dark photo hero (white/gold text) vs cream/parchment section */
  tone?: 'onDark' | 'onLight';
  /** Use h1 for primary product, h2 for secondary blocks */
  headingLevel?: 'h1' | 'h2';
  className?: string;
  /** Overlay scratch calendar template on the main image */
  overlayScratchTemplate?: boolean;
}

export default function ProductShowcase({
  images,
  eyebrow,
  title,
  description,
  priceLabel,
  priceHint,
  features,
  cta,
  tone = 'onDark',
  headingLevel = 'h2',
  className = '',
  overlayScratchTemplate = false,
}: ProductShowcaseProps) {
  const primary = images[0];
  const isDark = tone === 'onDark';

  const eyebrowClass = isDark
    ? 'text-christmas-gold text-sm tracking-[0.2em] uppercase mb-3'
    : 'text-christmas-green text-sm tracking-[0.2em] uppercase mb-3';
  const titleClass = isDark
    ? 'font-display text-3xl md:text-5xl font-semibold text-christmas-gold-light mb-4 leading-tight'
    : 'font-display text-3xl md:text-4xl font-semibold text-christmas-green mb-4 leading-tight';
  const descClass = isDark
    ? 'text-white/80 text-base md:text-lg leading-relaxed mb-6'
    : 'text-parchment-muted text-base md:text-lg leading-relaxed mb-6';
  const priceClass = isDark
    ? 'font-display text-4xl font-semibold text-christmas-gold-light'
    : 'font-display text-4xl font-semibold text-christmas-green';
  const hintClass = isDark ? 'text-white/60 text-sm mt-2' : 'text-parchment-muted text-sm mt-2';
  const featureClass = isDark ? 'text-white/85 text-sm' : 'text-parchment-text text-sm';
  const checkClass = isDark ? 'text-christmas-gold' : 'text-christmas-green';

  const HeadingTag = headingLevel;

  return (
    <div className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-start ${className}`}>
      <div>
        <div
          className={`block w-full rounded-2xl overflow-hidden border shadow-xl ${
            isDark
              ? 'border-christmas-gold/30 bg-cream'
              : 'border-christmas-gold/20 bg-cream'
          }`}
        >
          {overlayScratchTemplate ? (
            <ScratchDesignPreview
              imageSrc={primary.src}
              alt={primary.alt}
              aspectClassName="aspect-[4/5]"
              className="w-full"
            />
          ) : (
            <img
              src={primary.src}
              alt={primary.alt}
              className="w-full aspect-[4/5] object-cover"
              width={800}
              height={1000}
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {images.slice(0, 4).map((img) => (
              <div
                key={img.src}
                className="rounded-xl overflow-hidden border border-christmas-gold/20 opacity-90"
              >
                <img src={img.src} alt="" className="w-full aspect-square object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={isDark ? 'text-white' : ''}>
        <p className={eyebrowClass}>{eyebrow}</p>
        <HeadingTag className={titleClass}>{title}</HeadingTag>
        <p className={descClass}>{description}</p>

        <div className="mb-6">
          <p className={priceClass}>{priceLabel}</p>
          {priceHint && <p className={hintClass}>{priceHint}</p>}
        </div>

        <ul className={`space-y-2 mb-8 ${featureClass}`}>
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <i className={`fas fa-check ${checkClass} text-xs`} />
              {f}
            </li>
          ))}
        </ul>

        <Link to={cta.to} className="btn-gold inline-flex px-8 py-3.5 text-lg">
          <i className="fas fa-gift mr-2" />
          {cta.label}
        </Link>
      </div>
    </div>
  );
}
