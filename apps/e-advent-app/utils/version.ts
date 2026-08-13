// Funkcje pomocnicze do porównywania wersji

/**
 * Porównuje dwie wersje w formacie semantic versioning (np. "1.0.0")
 * @param version1 - Pierwsza wersja do porównania
 * @param version2 - Druga wersja do porównania
 * @returns -1 jeśli version1 < version2, 0 jeśli równe, 1 jeśli version1 > version2
 */
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  // Uzupełnij krótszą wersję zerami
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] < v2Parts[i]) return -1;
    if (v1Parts[i] > v2Parts[i]) return 1;
  }

  return 0;
}

/**
 * Sprawdza czy wersja aplikacji jest zgodna z minimalną wymaganą wersją
 * @param currentVersion - Aktualna wersja aplikacji
 * @param minVersion - Minimalna wymagana wersja
 * @returns true jeśli wersja jest zgodna (>= minVersion), false w przeciwnym razie
 */
export function isVersionCompatible(currentVersion: string, minVersion: string): boolean {
  return compareVersions(currentVersion, minVersion) >= 0;
}

