module.exports = {
  createPayment: jest.fn(),
  findPayments: jest.fn(),
  findPaymentByStripeId: jest.fn(),
  updatePayment: jest.fn(),
  updatePaymentByProductId: jest.fn(),
  updatePaymentStatus: jest.fn(),
  replaceOrderItems: jest.fn(),
};
