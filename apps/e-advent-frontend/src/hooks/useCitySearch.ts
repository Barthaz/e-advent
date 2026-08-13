import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SantaCity } from '../utils/santa/schedule';
import { normalizeCityName } from '../utils/santa/normalizeCity';

/** Compact row: [id, name, country, lat, lon] */
type CompactCity = [number, string, string, number, number];

interface SantaCityIndexed extends SantaCity {
  norm: string;
}

function parseCities(raw: CompactCity[]): SantaCityIndexed[] {
  return raw.map((row, index) => ({
    id: row[0],
    name: row[1],
    country: row[2],
    lat: row[3],
    lon: row[4],
    index,
    norm: normalizeCityName(row[1]),
  }));
}

let citiesCache: SantaCityIndexed[] | null = null;
let citiesPromise: Promise<SantaCityIndexed[]> | null = null;

export async function loadSantaCities(): Promise<SantaCityIndexed[]> {
  if (citiesCache) return citiesCache;
  if (!citiesPromise) {
    citiesPromise = fetch('/data/santa-cities.json')
      .then((r) => {
        if (!r.ok) throw new Error('Nie udało się wczytać bazy miast');
        return r.json() as Promise<CompactCity[]>;
      })
      .then((raw) => {
        citiesCache = parseCities(raw);
        return citiesCache;
      })
      .catch((err) => {
        citiesPromise = null;
        throw err;
      });
  }
  return citiesPromise;
}

export function useSantaCities() {
  const [cities, setCities] = useState<SantaCity[]>(citiesCache ?? []);
  const [loading, setLoading] = useState(!citiesCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (citiesCache) {
      setCities(citiesCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadSantaCities()
      .then((data) => {
        if (!cancelled) {
          setCities(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Błąd wczytywania miast');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { cities, loading, error };
}

export interface CitySearchHit {
  city: SantaCity;
  score: number;
}

function asIndexed(cities: SantaCity[]): SantaCityIndexed[] {
  return cities as SantaCityIndexed[];
}

export function searchCities(cities: SantaCity[], query: string, limit = 12): CitySearchHit[] {
  const q = normalizeCityName(query);
  if (q.length < 2) return [];

  const best: CitySearchHit[] = [];
  const insert = (hit: CitySearchHit) => {
    let i = best.length;
    while (i > 0 && best[i - 1].score < hit.score) i -= 1;
    best.splice(i, 0, hit);
    if (best.length > limit) best.pop();
  };

  const list = asIndexed(cities);
  for (const city of list) {
    const n = city.norm ?? normalizeCityName(city.name);
    if (!n.includes(q)) continue;

    let score = 0;
    if (n === q) score = 1000;
    else if (n.startsWith(q)) score = 500;
    else score = 100;

    if (city.country === 'Polska' || city.country === 'Laponia') score += 80;
    score -= Math.min(40, city.name.length);

    if (best.length < limit || score > best[best.length - 1].score) {
      insert({ city, score });
    }
  }

  return best;
}

export function findCityByName(cities: SantaCity[], name: string): SantaCity | null {
  const q = normalizeCityName(name);
  if (!q) return null;
  const list = asIndexed(cities);
  const matches = list.filter((c) => (c.norm ?? normalizeCityName(c.name)) === q);
  if (matches.length) {
    return matches.find((c) => c.country === 'Polska') ?? matches[0];
  }
  const hits = searchCities(cities, name, 1);
  return hits[0]?.city ?? null;
}

export function useCitySearch(cities: SantaCity[]) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SantaCity | null>(null);

  const results = useMemo(() => searchCities(cities, query, 12), [cities, query]);

  const selectCity = useCallback((city: SantaCity) => {
    setSelected(city);
    setQuery(city.name);
  }, []);

  const confirmQuery = useCallback(() => {
    const found = findCityByName(cities, query);
    if (found) {
      setSelected(found);
      setQuery(found.name);
      return found;
    }
    return null;
  }, [cities, query]);

  return {
    query,
    setQuery,
    selected,
    setSelected,
    selectCity,
    confirmQuery,
    results,
  };
}
