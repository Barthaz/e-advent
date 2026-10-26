import { describe, expect, it } from 'vitest';
import { getProduct } from '@e-advent/products';
import { buildPhysicalProductJsonLd } from './productSeo';

describe('product offers at the Warsaw campaign boundary', () => {
  const before = new Date('2026-10-31T22:59:59Z');
  const after = new Date('2026-10-31T23:00:00Z');

  it('matches the public letter coupon before November and the catalog price afterwards', () => {
    expect(buildPhysicalProductJsonLd('santa-letter', ['/letter.webp'], before).offers.price).toBe('23.20');
    const regular = buildPhysicalProductJsonLd('santa-letter', ['/letter.webp'], after);
    expect(regular.offers.price).toBe(getProduct('santa-letter')!.basePrice.toFixed(2));
    expect(regular.image).toEqual(['https://e-advent.pl/letter.webp']);
    expect(regular.sku).toBe('santa-letter');
  });

  it('never advertises a preorder when checkout is blocked', () => {
    expect(buildPhysicalProductJsonLd('scratch-a3', [], before).offers.availability).toBe('https://schema.org/OutOfStock');
    const available = buildPhysicalProductJsonLd('scratch-a3', [], after);
    expect(available.offers.availability).toBe('https://schema.org/InStock');
    expect(available.offers.price).toBe(getProduct('scratch-a3')!.basePrice.toFixed(2));
    expect(available.offers.url).toBe('https://e-advent.pl/stworz-kalendarz/zdrapka');
  });
});
