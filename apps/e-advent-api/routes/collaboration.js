const express = require('express');
const { body, validationResult } = require('express-validator');
const authCalendarAccess = require('../middleware/authCalendarAccess');
const Collaboration = require('../models/Collaboration');
const { sendEmail } = require('../config/email');
const {
  buildCollaborationInviteEmail,
  buildCollaborationInviteEmailText,
} = require('../services/orderEmails');
const EmailSend = require('../models/EmailSend');

const router = express.Router();

router.use(authCalendarAccess);

router.get('/', async (req, res) => {
  try {
    const my = await Collaboration.getMyCollaboration(req.profile.email);
    if (!my) {
      return res.json({
        success: true,
        collaboration: null,
        members: [],
      });
    }

    return res.json({
      success: true,
      collaboration: {
        id: my.collaboration.id,
        ownerEmail: my.collaboration.ownerEmail,
      },
      members: my.members.map((m) => ({
        email: m.email,
        role: m.role,
        status: m.status,
        invitedAt: m.invitedAt,
      })),
      me: {
        email: my.membership.email,
        role: my.membership.role,
        status: my.membership.status,
      },
    });
  } catch (error) {
    console.error('GET /collaboration error:', error);
    return res.status(500).json({ error: 'Failed to load collaboration', message: error.message });
  }
});

router.post(
  '/invite',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const inviteEmail = req.body.email;
      const result = await Collaboration.inviteMember(req.profile.email, inviteEmail);

      let emailSent = false;
      try {
        const inviteeHasAccount = result.invited.status === 'active';
        const subject = 'Zaproszenie do współpracy w e-advent';
        await sendEmail({
          to: result.invited.email,
          subject,
          html: buildCollaborationInviteEmail({
            inviterEmail: req.profile.email,
            inviteeHasAccount,
          }),
          text: buildCollaborationInviteEmailText({
            inviterEmail: req.profile.email,
            inviteeHasAccount,
          }),
        });
        emailSent = true;
        try {
          await EmailSend.createSend({
            type: 'collaboration_invite',
            recipientEmail: result.invited.email,
            subject,
            status: 'sent',
            triggeredBy: 'system',
          });
        } catch (logErr) {
          console.error('Failed to log collaboration invite email:', logErr.message);
        }
      } catch (emailErr) {
        console.error('Collaboration invite email failed:', emailErr.message);
      }

      return res.json({
        success: true,
        collaboration: {
          id: result.collaboration.id,
          ownerEmail: result.collaboration.ownerEmail,
        },
        members: result.members.map((m) => ({
          email: m.email,
          role: m.role,
          status: m.status,
          invitedAt: m.invitedAt,
        })),
        invited: {
          email: result.invited.email,
          role: result.invited.role,
          status: result.invited.status,
        },
        emailSent,
      });
    } catch (error) {
      console.error('POST /collaboration/invite error:', error);
      const statusByCode = {
        INVALID_EMAIL: 400,
        CANNOT_INVITE_SELF: 400,
        ALREADY_MEMBER: 409,
        ALREADY_IN_OTHER_COLLABORATION: 409,
        ALREADY_IN_COLLABORATION: 409,
        FORBIDDEN: 403,
      };
      const status = statusByCode[error.code] || 500;
      return res.status(status).json({
        error: error.code || 'INVITE_FAILED',
        message: error.message,
      });
    }
  }
);

router.delete('/members/:email', async (req, res) => {
  try {
    const targetEmail = decodeURIComponent(req.params.email || '');
    const result = await Collaboration.removeMember(req.profile.email, targetEmail);

    if (result.dissolved) {
      return res.json({ success: true, dissolved: true });
    }

    return res.json({
      success: true,
      dissolved: false,
      collaboration: {
        id: result.collaboration.id,
        ownerEmail: result.collaboration.ownerEmail,
      },
      members: result.members.map((m) => ({
        email: m.email,
        role: m.role,
        status: m.status,
        invitedAt: m.invitedAt,
      })),
    });
  } catch (error) {
    console.error('DELETE /collaboration/members error:', error);
    const statusByCode = {
      NO_COLLABORATION: 404,
      FORBIDDEN: 403,
      CANNOT_REMOVE_OWNER: 400,
      NOT_FOUND: 404,
    };
    const status = statusByCode[error.code] || 500;
    return res.status(status).json({
      error: error.code || 'REMOVE_FAILED',
      message: error.message,
    });
  }
});

module.exports = router;
