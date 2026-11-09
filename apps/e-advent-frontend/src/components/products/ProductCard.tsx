import { Link } from 'react-router-dom';
import type { ProductFamily } from '../../config/products';
import { formatPrice } from '../../config/products';
import scratchCardImage from '../../assets/scratch/wachlarz-card.webp';

interface ProductCardProps {
  product: ProductFamily;
  featured?: boolean;
}

export default function ProductCard({ product, featured = false }: ProductCardProps) {
  return (
    <article className="catalog-card">
      {product.imageSrc && (
        <Link to={product.creatorRoute} className="catalog-card-image" aria-label={product.name}>
          <img src={product.type === 'scratch' ? scratchCardImage : product.imageSrc} alt={product.imageAlt ?? product.name} width={480} height={600} loading="lazy" decoding="async" />
        </Link>
      )}
      <div className="catalog-card-body">
        <p className="catalog-card-label">{product.eyebrow ?? (featured ? 'Codzienna chwila razem' : 'Na świąteczne wspomnienia')}</p>
        <h3>{product.name}</h3>
        <p className="catalog-card-description">{product.shortDescription}</p>
        <ul>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        <div className="catalog-card-price"><span>od</span> {formatPrice(product.priceFrom)}</div>
        <Link to={product.creatorRoute} className="btn-green w-full px-6 py-3">
          {product.type === 'letter' ? 'Poznaj zestaw do listu' : product.type === 'scratch' ? 'Zobacz kalendarz' : 'Stwórz kalendarz'}
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
