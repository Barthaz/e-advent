jest.mock('@vercel/blob', () => ({
  list: jest.fn(),
  del: jest.fn(),
}));

const { list, del } = require('@vercel/blob');
const { cleanupExportBlobs } = require('../../services/blobExportCleanup');

const NOW = Date.parse('2026-11-04T07:00:00Z');
const blob = (pathname, hoursAgo, size = 10) => ({
  url: `https://store.public.blob.vercel-storage.com/${pathname}`,
  pathname,
  size,
  uploadedAt: new Date(NOW - hoursAgo * 60 * 60 * 1000),
});

describe('cleanupExportBlobs', () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;

  afterEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    jest.clearAllMocks();
  });

  test('does nothing without a Blob token', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    await expect(cleanupExportBlobs({ now: NOW })).resolves.toEqual({ skipped: true, deleted: 0, bytes: 0 });
    expect(list).not.toHaveBeenCalled();
  });

  test('deletes only export folders, across pages, and keeps files from the last hour', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'token';
    list.mockImplementation(async ({ prefix, cursor }) => {
      if (prefix === 'scratch-exports/' && !cursor) {
        return { blobs: [blob('scratch-exports/a.png', 30, 100)], hasMore: true, cursor: 'next' };
      }
      if (prefix === 'scratch-exports/' && cursor === 'next') {
        return { blobs: [blob('scratch-exports/b.png', 0.2, 50), blob('scratch-exports/c.pdf', 2, 7)], hasMore: false };
      }
      return { blobs: [], hasMore: false };
    });

    const result = await cleanupExportBlobs({ now: NOW });

    expect(list.mock.calls.map(([options]) => options.prefix)).toEqual(
      ['scratch-exports/', 'scratch-exports/', 'exports/'],
    );
    const deletedUrls = del.mock.calls.flatMap(([urls]) => urls);
    expect(deletedUrls).toEqual([
      'https://store.public.blob.vercel-storage.com/scratch-exports/a.png',
      'https://store.public.blob.vercel-storage.com/scratch-exports/c.pdf',
    ]);
    expect(deletedUrls.some((url) => url.includes('designs/'))).toBe(false);
    expect(result).toEqual({ deleted: 2, bytes: 107 });
  });
});
