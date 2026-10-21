const { operate } = require('../services/inpostFulfillment');
module.exports = (router, authAdmin) => {
  const handler = action => async (req, res) => {
    try {
      const result = await operate(req.params.id, action, req.body);
      res.set('Cache-Control', 'no-store');
      if (action === 'label') return res.type('application/pdf').set('Content-Disposition', 'attachment; filename="inpost-label.pdf"').send(result);
      res.json(result);
    } catch (error) {
      res.status(error.status || 503).json({ error: error.status ? error.message : 'Nie udało się zapisać stanu przesyłki. Odśwież status przed kolejną próbą.' });
    }
  };
  router.get('/orders/:id/inpost', authAdmin, handler('get'));
  router.get('/orders/:id/inpost/label', authAdmin, handler('label'));
  for (const action of ['create', 'refresh', 'offers', 'buy', 'reconcile']) router.post(`/orders/:id/inpost/${action}`, authAdmin, handler(action));
};
