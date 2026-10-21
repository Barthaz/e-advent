jest.mock('../../models/Calendar', () => ({ findCalendarById: jest.fn() }));
jest.mock('../../services/special/SpecialProgressStore', () => ({ getProgress: jest.fn(), upsertProgress: jest.fn() }));
jest.mock('../../services/special/DateGateService', () => ({ getSealedContent: jest.fn(), sealContent: jest.fn(), resolveRevealAt: jest.fn() }));
jest.mock('../../services/special/SpecialConfigRegistry', () => ({ getSpecialDescriptor: jest.fn(), isPremiumCalendar: () => true }));
jest.mock('../../services/special/DocumentRegistry', () => ({ renderSpecialPdf: jest.fn(), resolveContentPack: jest.fn() }));
const express = require('express');
const request = require('supertest');
const Calendar = require('../../models/Calendar');
const progress = require('../../services/special/SpecialProgressStore');
const gate = require('../../services/special/DateGateService');
const { getSpecialDescriptor } = require('../../services/special/SpecialConfigRegistry');
const { renderSpecialPdf } = require('../../services/special/DocumentRegistry');
const app = express().use(express.json()).use(require('../../routes/specialWindows'));

describe('sealed content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Calendar.findCalendarById.mockResolvedValue({ id: 'cal', status: 'succeeded', data: { tasks: [{ day: 1, status: 'opened', catalogTaskId: 'task' }] } });
    getSpecialDescriptor.mockReturnValue({ configId: 'task', document: {}, capabilities: { dateGate: true, canPrint: true } });
    gate.getSealedContent.mockResolvedValue({ sealed: true, revealed: false, payload: null, revealAt: '2030-12-24T00:00:00Z' });
    progress.getProgress.mockResolvedValue({ payload: { fields: { letter: 'secret' } } });
    renderSpecialPdf.mockResolvedValue({ buffer: Buffer.from('pdf'), filename: 'test.pdf' });
  });
  test('PDF cannot bypass the time lock, including with a client payload', async () => {
    const res = await request(app).post('/cal/days/1/special/export/pdf').send({ payload: { fields: {} } });
    expect(res.status).toBe(403);
    expect(renderSpecialPdf).not.toHaveBeenCalled();
    expect(progress.getProgress).not.toHaveBeenCalled();
  });
  test('cannot reseal or edit an existing capsule', async () => {
    const res = await request(app).put('/cal/days/1/special/progress').send({ seal: true, revealAt: '2000-01-01', payload: {} });
    expect(res.status).toBe(409);
    expect(progress.upsertProgress).not.toHaveBeenCalled();
    expect(gate.sealContent).not.toHaveBeenCalled();
  });
  test('after reveal uses immutable sealed payload rather than mutable progress', async () => {
    gate.getSealedContent.mockResolvedValue({ sealed: true, revealed: true, payload: { fields: { letter: 'sealed' } } });
    const res = await request(app).post('/cal/days/1/special/export/pdf').send({ payload: { fields: { letter: 'replacement' } } });
    expect(res.status).toBe(200);
    expect(renderSpecialPdf.mock.calls[0][1]).toEqual({ fields: { letter: 'sealed' } });
  });
  test('failure to read a lock does not allow export', async () => {
    gate.getSealedContent.mockRejectedValue(new Error('DB unavailable'));
    expect((await request(app).post('/cal/days/1/special/export/pdf').send({})).status).toBe(500);
    expect(renderSpecialPdf).not.toHaveBeenCalled();
  });
});
