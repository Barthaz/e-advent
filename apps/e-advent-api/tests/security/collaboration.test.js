jest.mock('../../config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  getPool: jest.fn(() => ({
    getConnection: jest.fn().mockResolvedValue({
      ping: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    }),
  })),
  query: jest.fn().mockResolvedValue([[], []]),
  withTransaction: jest.fn(),
  closeConnection: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../models/Calendar', () => require('../mocks/Calendar'));
jest.mock('../../models/Payment', () => require('../mocks/Payment'));
jest.mock('../../models/Collaboration');
jest.mock('../../models/SharedTask');
jest.mock('../../models/GiftIdea');
jest.mock('../../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));
jest.mock('../../config/stripe', () => ({
  paymentIntents: {
    create: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
  customers: {
    list: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

const { request, loadApp, pendingCalendar } = require('../helpers/createTestApp');
const Calendar = require('../../models/Calendar');
const Collaboration = require('../../models/Collaboration');
const SharedTask = require('../../models/SharedTask');
const { sendEmail } = require('../../config/email');

function succeededProfile(email = 'owner@example.com') {
  return pendingCalendar({
    id: 'cal-owner-1',
    status: 'succeeded',
    accessCode: 'ABC123',
    data: {
      email,
      sku: 'interactive',
      productType: 'interactive',
      title: 'Owner Cal',
      author: 'O',
      tasks: [],
    },
  });
}

describe('Collaboration / shared-tasks auth & flows', () => {
  const app = loadApp();

  beforeEach(() => {
    jest.clearAllMocks();
    sendEmail.mockResolvedValue({ messageId: 'm1' });
    Collaboration.normalizeEmail.mockImplementation((e) =>
      String(e || '').trim().toLowerCase()
    );
  });

  test('GET /collaboration without credentials returns 401', async () => {
    const res = await request(app).get('/api/v1/collaboration');
    expect(res.status).toBe(401);
  });

  test('GET /collaboration with valid access returns empty group', async () => {
    Calendar.findCalendarByEmailAndAccessCode.mockResolvedValue(succeededProfile());
    Collaboration.getMyCollaboration.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/collaboration')
      .set('X-Access-Email', 'owner@example.com')
      .set('X-Access-Code', 'ABC123');

    expect(res.status).toBe(200);
    expect(res.body.collaboration).toBeNull();
    expect(res.body.members).toEqual([]);
  });

  test('POST /collaboration/invite creates invite and sends email', async () => {
    Calendar.findCalendarByEmailAndAccessCode.mockResolvedValue(succeededProfile());
    Collaboration.inviteMember.mockResolvedValue({
      collaboration: { id: 'collab-1', ownerEmail: 'owner@example.com' },
      members: [
        { email: 'owner@example.com', role: 'owner', status: 'active' },
        { email: 'friend@example.com', role: 'member', status: 'pending' },
      ],
      invited: { email: 'friend@example.com', role: 'member', status: 'pending' },
    });

    const res = await request(app)
      .post('/api/v1/collaboration/invite')
      .set('X-Access-Email', 'owner@example.com')
      .set('X-Access-Code', 'ABC123')
      .send({ email: 'friend@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.invited.email).toBe('friend@example.com');
    expect(sendEmail).toHaveBeenCalled();
  });

  test('GET /shared-tasks without collab returns 404', async () => {
    Calendar.findCalendarByEmailAndAccessCode.mockResolvedValue(succeededProfile());
    const err = new Error('Brak aktywnej grupy współpracy');
    err.code = 'NO_COLLABORATION';
    Collaboration.requireActiveCollaboration.mockRejectedValue(err);

    const res = await request(app)
      .get('/api/v1/shared-tasks')
      .set('X-Access-Email', 'owner@example.com')
      .set('X-Access-Code', 'ABC123');

    expect(res.status).toBe(404);
  });

  test('POST /shared-tasks creates task for active group', async () => {
    Calendar.findCalendarByEmailAndAccessCode.mockResolvedValue(succeededProfile());
    Collaboration.requireActiveCollaboration.mockResolvedValue({
      collaboration: { id: 'collab-1', ownerEmail: 'owner@example.com' },
      membership: { email: 'owner@example.com', role: 'owner', status: 'active' },
      members: [],
    });
    SharedTask.create.mockResolvedValue({
      id: 'task-1',
      collaborationId: 'collab-1',
      authorEmail: 'owner@example.com',
      text: 'Kup choinkę',
      done: false,
    });

    const res = await request(app)
      .post('/api/v1/shared-tasks')
      .set('X-Access-Email', 'owner@example.com')
      .set('X-Access-Code', 'ABC123')
      .send({ text: 'Kup choinkę' });

    expect(res.status).toBe(201);
    expect(res.body.task.text).toBe('Kup choinkę');
  });
});
