import moodFunPack from '../../../../packages/content/packs/mood-fun.json';
import culinaryPack from '../../../../packages/content/packs/culinary.json';
import reflectionPack from '../../../../packages/content/packs/reflection.json';
import preparationsPack from '../../../../packages/content/packs/preparations.json';
import kindnessPack from '../../../../packages/content/packs/kindness.json';
import creativePack from '../../../../packages/content/packs/creative.json';

const PACK_GROUPS = [
  moodFunPack.packs,
  culinaryPack.packs,
  reflectionPack.packs,
  preparationsPack.packs,
  kindnessPack.packs,
  creativePack.packs,
] as Array<Record<string, Record<string, unknown>>>;

export function resolvePack(
  contentKey?: string,
  templateId?: string
): Record<string, unknown> | null {
  const keys = [contentKey, templateId].filter(
    (key): key is string => typeof key === 'string' && key.trim().length > 0
  );
  for (const key of keys) {
    for (const packs of PACK_GROUPS) {
      const pack = packs[key];
      if (pack) return pack;
    }
  }
  return null;
}
