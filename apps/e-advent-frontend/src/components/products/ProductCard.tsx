import { Link } from 'react-router-dom';
import ParchmentCard from '../ParchmentCard';
import ScratchDesignPreview from '../ScratchDesignPreview';
import type { ProductFamily } from '../../config/products';
import { formatPrice } from '../../config/products';

interface ProductCardProps {
  product: ProductFamily;
  featured?: boolean;
}

export default function ProductCard({ product, featured = false }: ProductCardProps) {
  return (
    <ParchmentCard padding="md" className={`h-full flex flex-col ${featured ? 'ring-2 ring-christmas-gold' : ''}`}>
      {product.imageSrc ? (
        <div className="mb-4 rounded-xl overflow-hidden border border-christmas-gold/20 bg-cream">
          {product.type === 'scratch' ? (
            <ScratchDesignPreview
              imageSrc={product.imageSrc}
              alt={product.imageAlt ?? product.name}
              aspectClassName="aspect-[4/5]"
              className="w-full"
            />
          ) : (
            <img
              src={product.imageSrc}
              alt={product.imageAlt ?? product.name}
              className="w-full aspect-[4/5] object-cover"
              width={400}
              height={500}
            />
          )}
        </div>
      ) : (
        <div className="text-center mb-4">
          <div className="icon-circle mx-auto mb-3">
            <i className={`fas ${product.icon} text-parchment-text text-xl`} />
          </div>
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="font-display text-xl md:text-2xl font-semibold text-parchment-text mb-2">
          {product.name}
        </h3>
        <p className="text-parchment-muted text-sm leading-relaxed">{product.shortDescription}</p>
      </div>

      <ul className="space-y-2 mb-6 flex-grow">
        {product.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-parchment-text">
            <i className="fas fa-check text-christmas-green text-xs" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="text-center">
        <p className="text-christmas-green font-bold text-2xl mb-4">
          od {formatPrice(product.priceFrom)}
        </p>
        <Link to={product.creatorRoute} className="btn-gold w-full inline-flex justify-center px-6 py-3">
          <i className="fas fa-gift mr-2" />
          {product.type === 'letter' ? 'Zobacz zestaw' : 'Stwórz kalendarz'}
        </Link>
      </div>
    </ParchmentCard>
  );
}
