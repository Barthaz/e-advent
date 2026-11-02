import { describe, expect, it } from 'vitest';
import { getProduct } from '@e-advent/products';
import { buildPhysicalProductJsonLd } from './productSeo';

describe('product offers after the October campaign', () => {
  it('advertises the catalog letter price', () => {
    const offer = buildPhysicalProductJsonLd('santa-letter', ['/letter.webp']);
    expect(offer.offers.price).toBe(getProduct('santa-letter')!.basePrice.toFixed(2));
    expect(offer.offers.availability).toBe('https://schema.org/InStock');
    expect(offer.image).toEqual(['https://e-advent.pl/letter.webp']);
    expect(offer.sku).toBe('santa-letter');
  });

  it('advertises the scratch calendar as in stock', () => {
    const available = buildPhysicalProductJsonLd('scratch-a3', []);
    expect(available.offers.availability).toBe('https://schema.org/InStock');
    expect(available.offers.price).toBe(getProduct('scratch-a3')!.basePrice.toFixed(2));
    expect(available.offers.url).toBe('https://e-advent.pl/stworz-kalendarz/zdrapka');
  });
});
