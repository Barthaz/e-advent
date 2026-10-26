import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import SEOHead from './SEOHead';

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

it('restores indexing after navigation from checkout to a product', () => {
  const { rerender } = render(<SEOHead robots="noindex, nofollow" />);
  expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  rerender(<SEOHead title="Produkt" canonical="https://e-advent.pl/list-do-swietego-mikolaja" />);
  expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow, max-image-preview:large');
});

it('excludes payment tokens, tracking parameters and fragments from the default canonical', () => {
  window.history.replaceState(null, '', '/sukces?payment_intent=private&utm_source=test#details');
  render(<SEOHead robots="noindex, nofollow" />);
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://e-advent.pl/sukces');
});

it('removes product markup when leaving a product page and synchronizes preview images', () => {
  const { rerender } = render(<SEOHead ogImage="https://e-advent.pl/letter.webp" jsonLd={{ '@type': 'Product' }} />);
  expect(document.querySelectorAll('script[data-e-advent-jsonld]')).toHaveLength(1);
  expect(document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content')).toBe('https://e-advent.pl/letter.webp');
  rerender(<SEOHead title="Regulamin" />);
  expect(document.querySelectorAll('script[data-e-advent-jsonld]')).toHaveLength(0);
});
