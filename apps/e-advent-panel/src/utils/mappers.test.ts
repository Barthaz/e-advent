import { describe, expect, test } from 'vitest';
import { mapCalendarDetail, resolveCalendarProductType } from './mappers';

describe('generator calendar mapping', () => {
  test('keeps product_type=certificate off the order letter fallback', () => {
    expect(resolveCalendarProductType('certificate', 'santa-certificate')).toBe('certificate');
    expect(resolveCalendarProductType(undefined, 'santa-certificate')).toBe('letter');
  });

  test('maps generator origin and GEN serial from tasks', () => {
    const calendar = mapCalendarDetail({
      id: 'cal-1',
      title: 'Kasia',
      author: 'ona',
      email: '',
      productType: 'certificate',
      sku: 'santa-certificate',
      origin: 'generator',
      tasks: [{ childName: 'Kasia', variant: 'ona', certificateNumber: 12 }],
      createdAt: '2026-10-27',
      updatedAt: '2026-10-27',
    });
    expect(calendar.product_type).toBe('certificate');
    expect(calendar.origin).toBe('generator');
    expect(calendar.certificate_number).toBe(12);
  });
});
