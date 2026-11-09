import type { ReactNode } from 'react';
import Logo from '../Logo';
import PageBackground from '../PageBackground';

interface ProductColumnsProps {
  media: ReactNode;
  children: ReactNode;
  tone?: 'onDark' | 'onLight';
  className?: string;
}

/** Product media on the left (pinned on wide screens), details on the right. */
export function ProductColumns({ media, children, tone = 'onDark', className = '' }: ProductColumnsProps) {
  return (
    <div className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-start ${className}`}>
      <div className="product-gallery-pin min-w-0">{media}</div>
      <div className={`min-w-0 ${tone === 'onDark' ? 'text-white' : ''}`}>{children}</div>
    </div>
  );
}

interface ProductHeroProps {
  /** When set, children become the details column next to the media. */
  media?: ReactNode;
  children: ReactNode;
}

export default function ProductHero({ media, children }: ProductHeroProps) {
  return (
    <PageBackground className="py-8 md:py-12" showSnow overlayOpacity="medium">
      <div className="container mx-auto px-4 max-w-6xl">
        <Logo className="mb-6" />
        {media ? <ProductColumns media={media}>{children}</ProductColumns> : children}
      </div>
    </PageBackground>
  );
}
