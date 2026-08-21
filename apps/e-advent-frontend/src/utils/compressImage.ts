const MAX_BYTES = 10 * 1024 * 1024;
const FORMAT_ERROR =
  'Nie udało się odczytać tego pliku. Wczytaj zdjęcie JPG, PNG, WEBP lub GIF (do 10 MB). Zdjęcia HEIC z iPhone’a zapisz jako JPG.';
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/gif',
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const HEIC_ERROR =
  'Zdjęcia HEIC z iPhone’a nie są obsługiwane. Zapisz je jako JPG lub PNG i wczytaj ponownie.';

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function isHeicFile(file: File): boolean {
  const type = String(file.type || '').toLowerCase();
  const ext = fileExtension(file.name);
  return type === 'image/heic' || type === 'image/heif' || ext === '.heic' || ext === '.heif';
}

export function isAcceptedImageFile(file: File): boolean {
  if (isHeicFile(file)) return false;
  const type = String(file.type || '').toLowerCase();
  const ext = fileExtension(file.name);
  if (ALLOWED_MIME.has(type)) return true;
  if (!type && ALLOWED_EXT.has(ext)) return true;
  return ALLOWED_EXT.has(ext) && type.startsWith('image/');
}

function toUserError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : '';
  if (/heic|heif/i.test(msg) && !/JPG|PNG/.test(msg)) return new Error(HEIC_ERROR);
  if (!msg || /could not be decoded|unsupported image|encoding error/i.test(msg)) {
    return new Error(FORMAT_ERROR);
  }
  return err instanceof Error ? err : new Error(FORMAT_ERROR);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!image.width || !image.height) {
        reject(new Error(FORMAT_ERROR));
        return;
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error(FORMAT_ERROR));
    image.src = src;
  });
}

export async function compressImageFile(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  if (file.size > MAX_BYTES) {
    throw new Error('Zdjęcie może mieć maksymalnie 10 MB.');
  }
  if (isHeicFile(file)) {
    throw new Error(HEIC_ERROR);
  }
  if (!isAcceptedImageFile(file)) {
    throw new Error(FORMAT_ERROR);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    let width: number;
    let height: number;
    let draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
    let close: () => void = () => undefined;

    try {
      const image = await loadHtmlImage(objectUrl);
      width = image.width;
      height = image.height;
      draw = (ctx, w, h) => ctx.drawImage(image, 0, 0, w, h);
    } catch {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      draw = (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h);
      close = () => bitmap.close();
    }

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const outWidth = Math.max(1, Math.round(width * scale));
    const outHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      close();
      throw new Error('Nie udało się przygotować zdjęcia.');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outWidth, outHeight);
    draw(ctx, outWidth, outHeight);
    close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), 'image/jpeg', quality);
    });
    if (!blob) throw new Error('Nie udało się zapisać zdjęcia.');
    return blob;
  } catch (err) {
    throw toUserError(err);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Nie udało się odczytać zdjęcia.'));
    reader.readAsDataURL(blob);
  });
}
