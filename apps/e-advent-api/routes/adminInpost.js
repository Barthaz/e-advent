const { operate, markLabelPrepared, markDispatched, syncActiveShipments } = require('../services/inpostFulfillment');
module.exports = (router, authAdmin) => {
  const handler = action => async (req, res) => {
    try {
      if (action === 'dispatch') {
        const result = await markDispatched(req.params.id);
        res.set('Cache-Control', 'no-store');
        return res.json(result);
      }
      const result = await operate(req.params.id, action, req.body);
      res.set('Cache-Control', 'no-store');
      if (action === 'label') {
        const prepared = await markLabelPrepared(req.params.id);
        res.set('X-Shipment-Email', prepared.email);
        if (prepared.error) res.set('X-Shipment-Email-Error', encodeURIComponent(prepared.error));
        return res.type('application/pdf').set('Content-Disposition', 'attachment; filename="inpost-label.pdf"').send(result);
      }
      if (action === 'generate' && result.labelReady && result.trackingNumber) {
        const prepared = await markLabelPrepared(req.params.id, { downloaded: false });
        return res.json({ ...result, email: prepared.email, emailError: prepared.error });
      }
      res.json(result);
    } catch (error) {
      console.error('InPost admin action failed:', action, req.params.id, error);
      res.status(error.status || 503).json({
        error: error.status
          ? error.message
          : (error.message
            ? `Nie udało się zapisać stanu przesyłki: ${error.message}`
            : 'Nie udało się zapisać stanu przesyłki. Odśwież status przed kolejną próbą.'),
      });
    }
  };
  router.post('/inpost/sync', authAdmin, async (req, res) => {
    try { res.json(await syncActiveShipments()); }
    catch { res.status(503).json({ error: 'Nie udało się zsynchronizować statusów InPost.' }); }
  });
  router.get('/orders/:id/inpost', authAdmin, handler('get'));
  router.get('/orders/:id/inpost/label', authAdmin, handler('label'));
  router.get('/orders/:id/inpost/refresh', authAdmin, handler('refresh'));
  for (const action of ['create', 'refresh', 'offers', 'buy', 'reconcile', 'generate', 'dispatch']) {
    router.post(`/orders/:id/inpost/${action}`, authAdmin, handler(action));
  }
};
