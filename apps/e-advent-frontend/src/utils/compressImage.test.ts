import { describe, expect, it } from 'vitest';
import { isAcceptedImageFile } from './compressImage';

describe('isAcceptedImageFile', () => {
  it('accepts jpg, png, webp and gif', () => {
    expect(isAcceptedImageFile(new File([], 'photo.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isAcceptedImageFile(new File([], 'photo.jpeg', { type: 'image/jpeg' }))).toBe(true);
    expect(isAcceptedImageFile(new File([], 'photo.png', { type: 'image/png' }))).toBe(true);
    expect(isAcceptedImageFile(new File([], 'photo.webp', { type: 'image/webp' }))).toBe(true);
    expect(isAcceptedImageFile(new File([], 'photo.gif', { type: 'image/gif' }))).toBe(true);
  });

  it('rejects heic and non-images', () => {
    expect(isAcceptedImageFile(new File([], 'photo.heic', { type: 'image/heic' }))).toBe(false);
    expect(isAcceptedImageFile(new File([], 'notes.pdf', { type: 'application/pdf' }))).toBe(false);
    expect(isAcceptedImageFile(new File([], 'file.txt', { type: 'text/plain' }))).toBe(false);
  });
});
