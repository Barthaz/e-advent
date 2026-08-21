import type { ThemeId } from '@e-advent/design-tokens';

export type PageSize = 'A4' | 'A5' | 'A6' | 'A3' | 'SQUARE';
export type PageOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type DocumentVariant = 'COLOR' | 'INK_SAVER';

export interface DocumentPage {
  size: PageSize;
  orientation: PageOrientation;
  marginMm: number;
}

export type DocumentNode =
  | { type: 'Heading'; text: string; level?: 1 | 2 | 3 }
  | { type: 'Text'; text: string; style?: 'body' | 'muted' | 'accent' }
  | { type: 'Kicker'; text: string }
  | { type: 'GoldFrame'; insetMm?: number }
  | { type: 'Table'; columns: string[]; rows: string[][] }
  | { type: 'Divider' }
  | { type: 'BrandFooter' }
  | { type: 'CutLine'; label?: string }
  | { type: 'CheckboxList'; items: string[]; checked?: boolean[] }
  | { type: 'RankList'; items: string[] }
  | { type: 'BingoGrid'; items: string[]; checked?: boolean[]; columns?: number };

export interface DocumentDefinition {
  templateId: string;
  version: number;
  page: DocumentPage;
  themeId: ThemeId;
  variant: DocumentVariant;
  nodes: DocumentNode[];
}

export type DocumentFactory = (data: Record<string, unknown>, variant: DocumentVariant) => DocumentDefinition;

export function defineDocument(
  templateId: string,
  version: number,
  builder: (data: Record<string, unknown>, variant: DocumentVariant) => Omit<DocumentDefinition, 'templateId' | 'version'>
): DocumentFactory {
  return (data, variant) => ({
    templateId,
    version,
    ...builder(data, variant),
  });
}

export const FormCardDocument = defineDocument('form-card-v1', 1, (data, variant) => ({
  page: { size: 'A5', orientation: 'PORTRAIT', marginMm: 12 },
  themeId: 'WARM_CREAM',
  variant,
  nodes: [
    { type: 'GoldFrame', insetMm: 5 },
    { type: 'Heading', text: String(data.title ?? 'Karta'), level: 1 },
    ...Object.entries((data.fields as Record<string, string>) || {}).map(([key, value]) => ({
      type: 'Text' as const,
      text: `${key}: ${value}`,
      style: 'body' as const,
    })),
    { type: 'BrandFooter' },
  ],
}));

export const ChecklistDocument = defineDocument('checklist-v1', 1, (data, variant) => ({
  page: { size: 'A5', orientation: 'PORTRAIT', marginMm: 12 },
  themeId: 'CLASSIC_GREEN',
  variant,
  nodes: [
    { type: 'Heading', text: String(data.title ?? 'Lista'), level: 1 },
    {
      type: 'CheckboxList',
      items: (data.items as string[]) || [],
      checked: (data.checked as boolean[]) || [],
    },
    { type: 'BrandFooter' },
  ],
}));

export const PlannerDocument = defineDocument('gift-planner-v1', 1, (data, variant) => ({
  page: { size: 'A5', orientation: 'PORTRAIT', marginMm: 12 },
  themeId: 'WARM_CREAM',
  variant,
  nodes: [
    { type: 'GoldFrame', insetMm: 5 },
    { type: 'Heading', text: String(data.title ?? 'Planer'), level: 1 },
    {
      type: 'Table',
      columns: (data.columns as string[]) || ['Osoba', 'Pomysł', 'Budżet', 'Kupione'],
      rows: (data.rows as string[][]) || [],
    },
    { type: 'BrandFooter' },
  ],
}));

export const BingoDocument = defineDocument('bingo-v1', 1, (data, variant) => ({
  page: { size: 'SQUARE', orientation: 'PORTRAIT', marginMm: 10 },
  themeId: 'CLASSIC_GREEN',
  variant,
  nodes: [
    { type: 'Heading', text: String(data.title ?? 'Świąteczne Bingo'), level: 1 },
    {
      type: 'BingoGrid',
      columns: 3,
      items: (data.items as string[]) || [],
      checked: (data.checked as boolean[]) || [],
    },
    { type: 'BrandFooter' },
  ],
}));

export const RecipeDocument = defineDocument('recipe-v1', 1, (data, variant) => ({
  page: { size: 'A5', orientation: 'PORTRAIT', marginMm: 12 },
  themeId: 'WARM_CREAM',
  variant,
  nodes: [
    { type: 'Heading', text: String(data.title ?? 'Przepis'), level: 1 },
    { type: 'Text', text: `Porcje: ${data.servings ?? '—'}`, style: 'muted' },
    { type: 'Heading', text: 'Składniki', level: 2 },
    ...((data.ingredients as string[]) || []).map((line) => ({ type: 'Text' as const, text: `• ${line}` })),
    { type: 'Heading', text: 'Kroki', level: 2 },
    ...((data.steps as string[]) || []).map((line, i) => ({ type: 'Text' as const, text: `${i + 1}. ${line}` })),
    { type: 'BrandFooter' },
  ],
}));

export const PaperVillageDocument = defineDocument('paper-village-v1', 1, (_data, variant) => ({
  page: { size: 'A5', orientation: 'PORTRAIT', marginMm: 8 },
  themeId: 'CLASSIC_GREEN',
  variant,
  nodes: [
    { type: 'Heading', text: 'Papierowa Wioska', level: 1 },
    { type: 'Text', text: 'Wycinaj wzdłuż linii cięcia. Składaj wzdłuż linii zgięcia.', style: 'muted' },
    { type: 'CutLine', label: 'CIĘCIE' },
    { type: 'Text', text: '[Schemat domków — wektor w PDF]', style: 'body' },
    { type: 'BrandFooter' },
  ],
}));

export const ScorecardDocument = defineDocument('scorecard-v1', 1, (data, variant) => ({
  page: { size: 'A5', orientation: 'PORTRAIT', marginMm: 12 },
  themeId: 'WARM_CREAM',
  variant,
  nodes: [
    { type: 'Heading', text: String(data.title ?? 'Karta wyników'), level: 1 },
    {
      type: 'Table',
      columns: ['Pozycja', 'Ocena 1-5', 'Notatki'],
      rows: (data.rows as string[][]) || [],
    },
    { type: 'BrandFooter' },
  ],
}));

export const RankingDocument = defineDocument('ranking-v1', 1, (data, variant) => ({
  page: { size: 'A5', orientation: 'PORTRAIT', marginMm: 12 },
  themeId: 'CLASSIC_GREEN',
  variant,
  nodes: [
    { type: 'Heading', text: String(data.title ?? 'Ranking'), level: 1 },
    { type: 'Divider' },
    {
      type: 'RankList',
      items: ((data.items as string[]) || []).map((item) => String(item || '').trim()).filter(Boolean),
    },
    { type: 'BrandFooter' },
  ],
}));

export const documentRegistry: Record<string, DocumentFactory> = {
  'form-card-v1': FormCardDocument,
  'checklist-v1': ChecklistDocument,
  'gift-planner-v1': PlannerDocument,
  'planner-v1': PlannerDocument,
  'bingo-v1': BingoDocument,
  'recipe-v1': RecipeDocument,
  'paper-village-v1': PaperVillageDocument,
  'scorecard-v1': ScorecardDocument,
  'ranking-v1': RankingDocument,
};

export function getDocumentFactory(templateId: string): DocumentFactory | undefined {
  return documentRegistry[templateId];
}
