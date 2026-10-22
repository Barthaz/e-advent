import wachlarz from '../assets/scratch/wachlarz.webp';
import wachlarzThumb from '../assets/scratch/wachlarz-thumb.webp';
import czerwony from '../assets/scratch/czerwony.webp';
import czerwonyThumb from '../assets/scratch/czerwony-thumb.webp';
import niebieski from '../assets/scratch/niebieski.webp';
import niebieskiThumb from '../assets/scratch/niebieski-thumb.webp';
import zielony from '../assets/scratch/zielony.webp';
import zielonyThumb from '../assets/scratch/zielony-thumb.webp';
import okienko from '../assets/scratch/okienko.webp';
import okienkoThumb from '../assets/scratch/okienko-thumb.webp';

export {
  DEFAULT_SCRATCH_COLOR_ID,
  DEFAULT_SCRATCH_TITLE,
  SCRATCH_COLOR_OPTIONS,
  designFromScratchColor,
  scratchColorById,
  scratchColorFromDesign,
} from './scratchColors';
export type { ScratchColorId } from './scratchColors';

export const SCRATCH_HERO_IMAGE = wachlarz;

export const SCRATCH_GALLERY = [
  { src: wachlarz, thumb: wachlarzThumb, alt: 'Kalendarz zdrapka e-Advent — trzy warianty' },
  { src: czerwony, thumb: czerwonyThumb, alt: 'Kalendarz zdrapka — wariant Czerwony Mikołaj' },
  { src: niebieski, thumb: niebieskiThumb, alt: 'Kalendarz zdrapka — wariant Błękitna Noc' },
  { src: zielony, thumb: zielonyThumb, alt: 'Kalendarz zdrapka — wariant Zielona Gwiazdka' },
  { src: okienko, thumb: okienkoThumb, alt: 'Odkryte okienko kalendarza zdrapki' },
] as const;
