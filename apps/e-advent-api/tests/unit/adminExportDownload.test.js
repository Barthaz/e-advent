jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));

const { put } = require('@vercel/blob');
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

  afterEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = originalToken;
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

  test('rejects oversized files when blob is not configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = mockRes();
    const buffer = Buffer.from('oversized-png');
    await expect(sendAdminDownload(res, {
      buffer,
      contentType: 'image/png',
      filename: 'kalendarz.png',
      maxBytes: 4,
    })).rejects.toMatchObject({ status: 413, code: 'EXPORT_TOO_LARGE' });
  });
});
