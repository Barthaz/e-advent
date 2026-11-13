import { createContext } from 'react';

export interface PageMetadata {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  robots?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export const BuildDocument = createContext<Document | null>(null);

export function writeMetadata(doc: Document, page: PageMetadata) {
  const title = page.title ?? 'e-Advent';
  const description = page.description ?? title;
  const image = page.ogImage ?? 'https://e-advent.pl/og-image.png';
  doc.title = title;
  function meta(attribute: 'name' | 'property', key: string, value?: string) {
    let tag = doc.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!value) { tag?.remove(); return; }
    if (!tag) {
      tag = doc.createElement('meta');
      tag.setAttribute(attribute, key);
      doc.head.append(tag);
    }
    tag.content = value;
  }
  meta('name', 'robots', doc.location.hostname === 'test.e-advent.pl' ? 'noindex, nofollow' : (page.robots ?? 'index, follow, max-image-preview:large'));
  meta('name', 'description', description);
  meta('name', 'keywords', page.keywords);
  let canonical = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (page.canonical) {
    if (!canonical) {
      canonical = doc.createElement('link');
      canonical.rel = 'canonical';
      doc.head.append(canonical);
    }
    canonical.href = page.canonical;
  } else canonical?.remove();
  for (const prefix of ['og', 'twitter']) {
    const attribute = prefix === 'og' ? 'property' : 'name';
    meta(attribute, prefix + ':title', title);
    meta(attribute, prefix + ':description', description);
    meta(attribute, prefix + ':url', page.canonical);
    meta(attribute, prefix + ':image', image);
    meta(attribute, prefix + ':image:alt', title);
  }
  meta('property', 'og:image:secure_url', image);
  const isDefaultCard = image === 'https://e-advent.pl/og-image.png';
  meta('property', 'og:image:type', isDefaultCard ? 'image/png' : undefined);
  meta('property', 'og:image:width', isDefaultCard ? '1200' : undefined);
  meta('property', 'og:image:height', isDefaultCard ? '630' : undefined);
  doc.head.querySelector('script[data-e-advent-jsonld]')?.remove();
  if (page.jsonLd) {
    const script = doc.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.eAdventJsonld = 'true';
    script.textContent = JSON.stringify(page.jsonLd).replace(/</g, '\\u003c');
    doc.head.append(script);
  }
}
