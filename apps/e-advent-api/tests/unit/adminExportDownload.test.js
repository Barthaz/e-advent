jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));
jest.mock('../../services/scratch/pngFitJpeg', () => ({
  pngBufferToFitJpeg: jest.fn(),
}));

const { put } = require('@vercel/blob');
const { pngBufferToFitJpeg } = require('../../services/scratch/pngFitJpeg');
const { sendAdminDownload } = require('../../services/adminExportDownload');

function mockRes() {
  const res = {
    headers: {},
    setHeader: jest.fn((key, value) => { res.headers[key] = value; }),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('sendAdminDownload', () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    process.env.VERCEL = originalVercel;
    jest.clearAllMocks();
  });

  test('sends small files inline', async () => {
    const res = mockRes();
    const buffer = Buffer.from('hello');
    await sendAdminDownload(res, {
      buffer,
      contentType: 'image/png',
      filename: 'kalendarz.png',
      maxBytes: 16,
    });
    expect(res.send).toHaveBeenCalledWith(buffer);
    expect(res.json).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  test('parks oversized files on blob and returns a download URL', async () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'token';
    put.mockResolvedValue({ url: 'https://blob.example/file.png' });
    const res = mockRes();
    const buffer = Buffer.from('oversized-png');
    await sendAdminDownload(res, {
      buffer,
      contentType: 'image/png',
      filename: 'kalendarz.png',
      maxBytes: 4,
    });
    expect(put).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      downloadUrl: 'https://blob.example/file.png',
      filename: 'kalendarz.png',
    }));
    expect(res.send).not.toHaveBeenCalled();
  });

  test('does not call Blob on Vercel when BLOB_READ_WRITE_TOKEN is missing', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.VERCEL = '1';
    pngBufferToFitJpeg.mockResolvedValue(Buffer.from('jpeg-bytes'));
    const res = mockRes();
    await sendAdminDownload(res, {
      buffer: Buffer.from('oversized-png'),
      contentType: 'image/png',
      filename: 'kalendarz.png',
      maxBytes: 4,
    });
    expect(put).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(Buffer.from('jpeg-bytes'));
  });

  test('falls back to a fitting JPEG when blob is unavailable', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;
    pngBufferToFitJpeg.mockResolvedValue(Buffer.from('jpeg-bytes'));
    const res = mockRes();
    await sendAdminDownload(res, {
      buffer: Buffer.from('oversized-png'),
      contentType: 'image/png',
      filename: 'kalendarz.png',
      maxBytes: 4,
    });
    expect(res.send).toHaveBeenCalledWith(Buffer.from('jpeg-bytes'));
    expect(res.headers['Content-Type']).toBe('image/jpeg');
    expect(res.headers['Content-Disposition']).toContain('kalendarz.jpg');
  });

  test('rejects oversized PDFs when blob is not configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;
    const res = mockRes();
    await expect(sendAdminDownload(res, {
      buffer: Buffer.from('oversized-pdf'),
      contentType: 'application/pdf',
      filename: 'kalendarz.pdf',
      maxBytes: 4,
    })).rejects.toMatchObject({ status: 413, code: 'EXPORT_TOO_LARGE' });
  });
});
