import { getProduct } from '@e-advent/products';

const SITE_URL = 'https://e-advent.pl';

/** Only independently purchasable physical products belong in this merchant markup. */
export function buildPhysicalProductJsonLd(sku: 'santa-letter' | 'scratch-a3', images: readonly string[]) {
  const product = getProduct(sku);
  if (!product) throw new Error(`Missing product: ${sku}`);
  const url = new URL(product.creatorRoute, SITE_URL).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    sku: product.sku,
    name: product.name,
    description: product.description,
    image: images.map((src) => new URL(src, SITE_URL).href),
    brand: { '@type': 'Brand', name: 'e-Advent' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PLN',
      price: product.basePrice.toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  };
}
