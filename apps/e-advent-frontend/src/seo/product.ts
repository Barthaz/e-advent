import { getProduct } from '../config/products';

export function productSchema(sku: string, name: string, description: string, path: string, images: string[]) {
  const product = getProduct(sku);
  if (!product) throw new Error('Unknown product ' + sku);
  const url = 'https://e-advent.pl' + path;
  return {
    '@context': 'https://schema.org', '@type': 'Product', sku, name, description, url,
    image: images.map(image => new URL(image, url).href),
    brand: { '@type': 'Brand', name: 'e-Advent' },
    offers: {
      '@type': 'Offer', url, priceCurrency: 'PLN', price: product.basePrice.toFixed(2),
      availability: product.discontinued ? 'https://schema.org/Discontinued' : 'https://schema.org/InStock',
    },
  };
}
