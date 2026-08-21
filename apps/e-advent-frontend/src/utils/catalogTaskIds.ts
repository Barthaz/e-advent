import creatorIndex from '../data/creator-index.json';

export const textToCatalogTaskId: Record<string, string> =
  creatorIndex.textToCatalogTaskId ?? {};

export function lookupCatalogTaskId(taskText: string): string | undefined {
  return textToCatalogTaskId[taskText.trim().toLowerCase()];
}
