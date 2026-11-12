import { useContext, useLayoutEffect } from 'react';
import { BuildDocument, writeMetadata, type PageMetadata } from '../seo/document';

export default function SEOHead({ title, description, keywords, canonical, ogImage, robots, jsonLd }: PageMetadata) {
  const doc = useContext(BuildDocument);
  if (doc) writeMetadata(doc, { title, description, keywords, canonical, ogImage, robots, jsonLd });
  useLayoutEffect(() => {
    const path = window.location.pathname;
    const safeCanonical = canonical ?? (['/sukces', '/platnosc', '/koszyk'].includes(path) ? 'https://e-advent.pl' + path : undefined);
    writeMetadata(document, { title, description, keywords, canonical: safeCanonical, ogImage, robots, jsonLd });
  }, [title, description, keywords, canonical, ogImage, robots, jsonLd]);
  return null;
}
