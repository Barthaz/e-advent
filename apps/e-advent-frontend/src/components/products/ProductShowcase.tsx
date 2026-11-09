import { Link } from 'react-router-dom';
import { ProductColumns } from '../product-page/ProductHero';
import ProductGallery, { type ProductGalleryImage } from '../product-page/ProductGallery';
import ProductIntro from '../product-page/ProductIntro';

export interface ProductShowcaseCta {
  label: string;
  to: string;
}

interface ProductShowcaseProps {
  images: ProductGalleryImage[];
  eyebrow: string;
  title: string;
  description: string;
  priceLabel: string;
  priceHint?: string;
  features: string[];
  cta: ProductShowcaseCta;
  /** Dark photo hero (white/gold text) vs cream section */
  tone?: 'onDark' | 'onLight';
  /** Use h1 for primary product, h2 for secondary blocks */
  headingLevel?: 'h1' | 'h2';
  className?: string;
  imageFit?: 'cover' | 'contain';
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
  imageFit = 'cover',
}: ProductShowcaseProps) {
  return (
    <ProductColumns media={<ProductGallery images={images} fit={imageFit} />} tone={tone} className={className}>
      <ProductIntro
        eyebrow={eyebrow}
        title={title}
        description={description}
        price={priceLabel}
        priceHint={priceHint}
        features={features}
        tone={tone}
        headingLevel={headingLevel}
      />
      <Link to={cta.to} className="btn-gold inline-flex px-8 py-3.5 text-lg">
        <i className="fas fa-gift mr-2" />
        {cta.label}
      </Link>
    </ProductColumns>
  );
}
