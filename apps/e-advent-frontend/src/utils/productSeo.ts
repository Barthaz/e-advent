import { getProduct, isCalendarsOnSale, isLetterPromoActive, LETTER_PROMO_PERCENT, roundPln } from '@e-advent/products';

const SITE_URL = 'https://e-advent.pl';

/** Only independently purchasable physical products belong in this merchant markup. */
export function buildPhysicalProductJsonLd(sku: 'santa-letter' | 'scratch-a3', images: readonly string[], now = new Date()) {
  const product = getProduct(sku);
  if (!product) throw new Error(`Missing product: ${sku}`);
  const url = new URL(product.creatorRoute, SITE_URL).href;
  // This public coupon is displayed on the landing page and applied in letter checkout.
  const price = sku === 'santa-letter' && isLetterPromoActive(now)
    ? roundPln(product.basePrice * (1 - LETTER_PROMO_PERCENT / 100))
    : product.basePrice;
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
      price: price.toFixed(2),
      // PreOrder would imply customers can actually place a preorder. They cannot.
      availability: sku === 'scratch-a3' && !isCalendarsOnSale(now)
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  };
}
