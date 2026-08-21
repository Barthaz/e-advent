import moodFunPack from '../../../../packages/content/packs/mood-fun.json';
import culinaryPack from '../../../../packages/content/packs/culinary.json';
import reflectionPack from '../../../../packages/content/packs/reflection.json';
import preparationsPack from '../../../../packages/content/packs/preparations.json';
import kindnessPack from '../../../../packages/content/packs/kindness.json';

const PACK_GROUPS = [
  moodFunPack.packs,
  culinaryPack.packs,
  reflectionPack.packs,
  preparationsPack.packs,
  kindnessPack.packs,
] as Array<Record<string, Record<string, unknown>>>;

export function resolvePack(contentKey?: string): Record<string, unknown> | null {
  if (!contentKey) return null;
  for (const packs of PACK_GROUPS) {
    const pack = packs[contentKey];
    if (pack) return pack;
  }
  return null;
}
