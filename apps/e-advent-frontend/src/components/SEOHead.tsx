import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  robots?: string;
  /** Structured data object or array — injected as application/ld+json */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const JSON_LD_ATTR = 'data-e-advent-jsonld';

export default function SEOHead({
  title = 'e-Advent — Niezapomniane chwile świąt | Kalendarze adwentowe',
  description = 'e-Advent pomaga przeżywać czas świąteczny w cieple: personalizowane kalendarze adwentowe, list do Mikołaja i magia oczekiwania. Każde święta mogą być niezapomniane.',
  keywords = 'kalendarz adwentowy, e-advent, e-dawent, interaktywny kalendarz adwentowy, personalizowany kalendarz adwentowy, kalendarz adwentowy online',
  canonical = window.location.href,
  ogImage = 'https://e-advent.pl/og-logo.png',
  robots,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Update or create meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', keywords);

    if (robots) {
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', robots);
    }

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);

    // Update Open Graph tags
    const updateOGTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateOGTag('og:title', title);
    updateOGTag('og:description', description);
    updateOGTag('og:url', canonical);
    updateOGTag('og:image', ogImage);

    // Update Twitter Card tags
    const updateTwitterTag = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateTwitterTag('twitter:title', title);
    updateTwitterTag('twitter:description', description);
    updateTwitterTag('twitter:url', canonical);
    updateTwitterTag('twitter:image', ogImage);

    // JSON-LD
    document.querySelectorAll(`script[${JSON_LD_ATTR}]`).forEach((el) => el.remove());
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute(JSON_LD_ATTR, 'true');
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.querySelectorAll(`script[${JSON_LD_ATTR}]`).forEach((el) => el.remove());
    };
  }, [title, description, keywords, canonical, ogImage, jsonLd]);

  return null;
}

