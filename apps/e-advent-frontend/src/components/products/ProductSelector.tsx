import { Link } from 'react-router-dom';
import FestivePage from '../FestivePage';
import ParchmentCard from '../ParchmentCard';
import ProductCard from './ProductCard';
import { PRODUCT_FAMILIES } from '../../config/products';

export default function ProductSelector() {
  return (
    <FestivePage className="py-4" maxWidth="full">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-christmas-gold-light mb-3 leading-tight">
          Wybierz swój kalendarz
        </h1>
        <p className="text-white/80 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
          Trzy sposoby na świąteczny klimat — wybierz wariant dla siebie lub na prezent.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto">
        {PRODUCT_FAMILIES.map((product) => (
          <ProductCard
            key={product.type}
            product={product}
            featured={product.type === 'interactive'}
          />
        ))}
      </div>

      <ParchmentCard padding="sm" className="max-w-xl mx-auto text-center">
        <p className="text-sm text-parchment-muted">
          Masz już kalendarz interaktywny?{' '}
          <Link to="/kalendarz" className="text-christmas-green hover:underline font-medium">
            Otwórz go tutaj
          </Link>
        </p>
      </ParchmentCard>
    </FestivePage>
  );
}
