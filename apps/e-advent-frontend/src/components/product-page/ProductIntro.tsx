import type { ReactNode } from 'react';

interface ProductIntroProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  price: string;
  priceHint?: ReactNode;
  priceNote?: ReactNode;
  features?: readonly string[];
  /** Dark photo hero (white/gold text) vs cream section */
  tone?: 'onDark' | 'onLight';
  /** Use h1 for the page's main product, h2 for secondary blocks */
  headingLevel?: 'h1' | 'h2';
}

export default function ProductIntro({
  eyebrow,
  title,
  description,
  price,
  priceHint,
  priceNote,
  features = [],
  tone = 'onDark',
  headingLevel = 'h1',
}: ProductIntroProps) {
  const dark = tone === 'onDark';
  const HeadingTag = headingLevel;

  return (
    <>
      <p className={`${dark ? 'text-christmas-gold' : 'text-christmas-green'} text-sm tracking-[0.2em] uppercase mb-3`}>
        {eyebrow}
      </p>
      <HeadingTag
        className={`font-display text-3xl md:text-5xl font-semibold mb-4 leading-tight [&_em]:font-normal ${
          dark ? 'text-christmas-gold-light [&_em]:text-christmas-gold' : 'text-christmas-green [&_em]:text-bronze'
        }`}
      >
        {title}
      </HeadingTag>
      <p className={`${dark ? 'text-white/80' : 'text-parchment-muted'} text-base md:text-lg leading-relaxed mb-6`}>
        {description}
      </p>

      <div className="mb-6">
        <p className={`font-display text-4xl font-semibold ${dark ? 'text-christmas-gold-light' : 'text-christmas-green'}`}>
          {price}
        </p>
        {priceHint && <p className={`${dark ? 'text-white/60' : 'text-parchment-muted'} text-sm mt-2`}>{priceHint}</p>}
        {priceNote && <p className={`${dark ? 'text-white/50' : 'text-parchment-muted'} text-xs mt-1`}>{priceNote}</p>}
      </div>

      {features.length > 0 && (
        <ul className={`space-y-2 mb-6 text-sm ${dark ? 'text-white/85' : 'text-parchment-text'}`}>
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <i className={`fas fa-check text-xs ${dark ? 'text-christmas-gold' : 'text-christmas-green'}`} />
              {feature}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
