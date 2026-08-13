const express = require('express');
const { body, validationResult } = require('express-validator');
const authCalendarAccess = require('../middleware/authCalendarAccess');
const Collaboration = require('../models/Collaboration');
const GiftIdea = require('../models/GiftIdea');

const router = express.Router();

router.use(authCalendarAccess);

async function loadActiveGroup(req, res) {
  try {
    return await Collaboration.requireActiveCollaboration(req.profile.email);
  } catch (error) {
    const statusByCode = {
      NO_COLLABORATION: 404,
      PENDING_MEMBERSHIP: 403,
    };
    const status = statusByCode[error.code] || 500;
    res.status(status).json({ error: error.code || 'COLLAB_ERROR', message: error.message });
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const my = await loadActiveGroup(req, res);
    if (!my) return;

    const ideas = await GiftIdea.listByCollaboration(my.collaboration.id);
    return res.json({ success: true, ideas });
  } catch (error) {
    console.error('GET /gift-ideas error:', error);
    return res.status(500).json({ error: 'Failed to list gift ideas', message: error.message });
  }
});

router.post(
  '/',
  [body('text').isString().trim().notEmpty().withMessage('text is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const my = await loadActiveGroup(req, res);
      if (!my) return;

      const idea = await GiftIdea.create({
        collaborationId: my.collaboration.id,
        authorEmail: req.profile.email,
        text: req.body.text,
      });

      return res.status(201).json({ success: true, idea });
    } catch (error) {
      console.error('POST /gift-ideas error:', error);
      const status = error.code === 'INVALID_TEXT' ? 400 : 500;
      return res.status(status).json({ error: error.code || 'CREATE_FAILED', message: error.message });
    }
  }
);

router.patch('/:id', async (req, res) => {
  try {
    const my = await loadActiveGroup(req, res);
    if (!my) return;

    const existing = await GiftIdea.findById(req.params.id);
    if (!existing || existing.collaborationId !== my.collaboration.id) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Pomysł nie znaleziony' });
    }

    const idea = await GiftIdea.update(req.params.id, { text: req.body.text });
    return res.json({ success: true, idea });
  } catch (error) {
    console.error('PATCH /gift-ideas error:', error);
    const status = error.code === 'INVALID_TEXT' ? 400 : 500;
    return res.status(status).json({ error: error.code || 'UPDATE_FAILED', message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const my = await loadActiveGroup(req, res);
    if (!my) return;

    const existing = await GiftIdea.findById(req.params.id);
    if (!existing || existing.collaborationId !== my.collaboration.id) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Pomysł nie znaleziony' });
    }

    await GiftIdea.remove(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('DELETE /gift-ideas error:', error);
    return res.status(500).json({ error: 'DELETE_FAILED', message: error.message });
  }
});

module.exports = router;
