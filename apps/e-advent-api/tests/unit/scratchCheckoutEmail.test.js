'use strict';

jest.mock('../../models/Calendar', () => ({
  findCalendarById: jest.fn(),
  verifyEditToken: jest.fn(() => true),
}));
jest.mock('../../services/inpost', () => ({
  resolveDelivery: jest.fn(async () => ({
    price: 17,
    receiver: {
      first_name: 'Anna',
      last_name: 'Nowak',
      phone: '500600700',
      address: { street: 'Kwiatowa', building_number: '1', city: 'Kraków', post_code: '30-001' },
    },
  })),
}));

const Calendar = require('../../models/Calendar');
const { resolveCheckoutItems } = require('../../services/orderCheckout');

describe('scratch checkout without calendar owner email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Calendar.verifyEditToken.mockReturnValue(true);
  });

  test('physical scratch calendar may omit name, title and email', async () => {
    Calendar.findCalendarById.mockResolvedValue({
      id: 'cal-scratch',
      status: 'pending',
      editToken: 'tok',
      data: {
        email: '',
        title: '',
        author: '',
        sku: 'scratch-a3',
        productType: 'scratch',
        format: 'A3',
        design: { imageUrl: '/designs/scratch/red.png' },
      },
    });

    const result = await resolveCheckoutItems({
      productId: 'cal-scratch',
      editToken: 'tok',
      customerEmail: 'buyer@example.com',
      shippingAddress: {
        firstName: 'Anna',
        lastName: 'Nowak',
        street: 'Kwiatowa 1',
        city: 'Kraków',
        postalCode: '30-001',
        phone: '500600700',
      },
      delivery: { type: 'parcel_inpost', pointId: 'KRA01' },
    });

    expect(result.errors).toBeUndefined();
    expect(result.items[0]).toMatchObject({ sku: 'scratch-a3', calendarId: 'cal-scratch' });
  });

  test('interactive calendar still requires owner email', async () => {
    Calendar.findCalendarById.mockResolvedValue({
      id: 'cal-int',
      status: 'pending',
      editToken: 'tok',
      data: { email: '', sku: 'interactive', productType: 'interactive' },
    });

    const result = await resolveCheckoutItems({
      productId: 'cal-int',
      editToken: 'tok',
      customerEmail: 'buyer@example.com',
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ msg: expect.stringContaining('owner email') }),
    ]));
  });
});
