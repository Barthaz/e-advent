const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const Calendar = require('./Calendar');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function rowToCollaboration(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    collaborationId: row.collaboration_id,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedAt: row.invited_at,
  };
}

async function findMembershipByEmail(email) {
  const normalized = normalizeEmail(email);
  const [rows] = await query(
    `SELECT * FROM collaboration_members WHERE LOWER(email) = ? LIMIT 1`,
    [normalized]
  );
  return rowToMember(rows[0] || null);
}

async function findCollaborationById(id) {
  const [rows] = await query('SELECT * FROM collaborations WHERE id = ?', [String(id)]);
  return rowToCollaboration(rows[0] || null);
}

async function findCollaborationByOwnerEmail(email) {
  const normalized = normalizeEmail(email);
  const [rows] = await query(
    'SELECT * FROM collaborations WHERE LOWER(owner_email) = ? LIMIT 1',
    [normalized]
  );
  return rowToCollaboration(rows[0] || null);
}

async function listMembers(collaborationId) {
  const [rows] = await query(
    `SELECT * FROM collaboration_members
     WHERE collaboration_id = ?
     ORDER BY FIELD(role, 'owner', 'member'), invited_at ASC`,
    [String(collaborationId)]
  );
  return rows.map(rowToMember);
}

async function activateEligibleMembers(collaborationId) {
  const members = await listMembers(collaborationId);
  for (const member of members) {
    if (member.status === 'pending') {
      const hasAccount = await Calendar.hasActiveCalendarAccount(member.email);
      if (hasAccount) {
        await query(
          `UPDATE collaboration_members SET status = 'active' WHERE id = ?`,
          [member.id]
        );
        member.status = 'active';
      }
    }
  }
  return members;
}

/**
 * Ensure caller has a collaboration group (as owner or active/pending member).
 * Returns { collaboration, members, membership } or null if none.
 */
async function getMyCollaboration(email) {
  const normalized = normalizeEmail(email);
  const membership = await findMembershipByEmail(normalized);
  if (!membership) {
    return null;
  }

  const collaboration = await findCollaborationById(membership.collaborationId);
  if (!collaboration) return null;

  const members = await activateEligibleMembers(collaboration.id);
  const refreshed = members.find((m) => normalizeEmail(m.email) === normalized) || membership;

  return {
    collaboration,
    members,
    membership: refreshed,
  };
}

async function createCollaborationForOwner(ownerEmail) {
  const normalized = normalizeEmail(ownerEmail);
  const existing = await findCollaborationByOwnerEmail(normalized);
  if (existing) {
    const members = await listMembers(existing.id);
    return { collaboration: existing, members };
  }

  const membershipElsewhere = await findMembershipByEmail(normalized);
  if (membershipElsewhere) {
    const err = new Error('Jesteś już członkiem innej grupy współpracy');
    err.code = 'ALREADY_IN_COLLABORATION';
    throw err;
  }

  const id = uuidv4();
  const memberId = uuidv4();

  await query(
    `INSERT INTO collaborations (id, owner_email) VALUES (?, ?)`,
    [id, normalized]
  );
  await query(
    `INSERT INTO collaboration_members (id, collaboration_id, email, role, status)
     VALUES (?, ?, ?, 'owner', 'active')`,
    [memberId, id, normalized]
  );

  return {
    collaboration: { id, ownerEmail: normalized, createdAt: new Date(), updatedAt: new Date() },
    members: [
      {
        id: memberId,
        collaborationId: id,
        email: normalized,
        role: 'owner',
        status: 'active',
        invitedAt: new Date(),
      },
    ],
  };
}

async function inviteMember(ownerEmail, inviteEmail) {
  const owner = normalizeEmail(ownerEmail);
  const invitee = normalizeEmail(inviteEmail);

  if (!invitee || !invitee.includes('@')) {
    const err = new Error('Nieprawidłowy adres email');
    err.code = 'INVALID_EMAIL';
    throw err;
  }
  if (invitee === owner) {
    const err = new Error('Nie możesz zaprosić samego siebie');
    err.code = 'CANNOT_INVITE_SELF';
    throw err;
  }

  let my = await getMyCollaboration(owner);
  if (!my) {
    const created = await createCollaborationForOwner(owner);
    my = {
      collaboration: created.collaboration,
      members: created.members,
      membership: created.members.find((m) => m.email === owner),
    };
  }

  if (my.membership.role !== 'owner' && my.membership.status !== 'active') {
    const err = new Error('Brak uprawnień do zapraszania');
    err.code = 'FORBIDDEN';
    throw err;
  }

  // Active members (including owner) may invite
  if (my.membership.status !== 'active') {
    const err = new Error('Tylko aktywni członkowie mogą zapraszać');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const existingMember = await findMembershipByEmail(invitee);
  if (existingMember) {
    if (existingMember.collaborationId === my.collaboration.id) {
      const err = new Error('Ta osoba jest już w Twojej grupie współpracy');
      err.code = 'ALREADY_MEMBER';
      throw err;
    }
    const err = new Error('Ta osoba należy już do innej grupy współpracy');
    err.code = 'ALREADY_IN_OTHER_COLLABORATION';
    throw err;
  }

  const hasAccount = await Calendar.hasActiveCalendarAccount(invitee);
  const status = hasAccount ? 'active' : 'pending';
  const memberId = uuidv4();

  await query(
    `INSERT INTO collaboration_members (id, collaboration_id, email, role, status)
     VALUES (?, ?, ?, 'member', ?)`,
    [memberId, my.collaboration.id, invitee, status]
  );

  const members = await activateEligibleMembers(my.collaboration.id);
  const invited = members.find((m) => m.email === invitee) || {
    id: memberId,
    collaborationId: my.collaboration.id,
    email: invitee,
    role: 'member',
    status,
    invitedAt: new Date(),
  };

  return {
    collaboration: my.collaboration,
    members,
    invited,
  };
}

async function removeMember(actorEmail, targetEmail) {
  const actor = normalizeEmail(actorEmail);
  const target = normalizeEmail(targetEmail);

  const my = await getMyCollaboration(actor);
  if (!my) {
    const err = new Error('Nie należysz do żadnej grupy współpracy');
    err.code = 'NO_COLLABORATION';
    throw err;
  }

  const isSelf = actor === target;
  const isOwner = my.membership.role === 'owner';

  if (!isSelf && !isOwner) {
    const err = new Error('Tylko właściciel może usuwać innych członków');
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (isSelf && isOwner) {
    // Owner leaving dissolves the group
    await query('DELETE FROM collaborations WHERE id = ?', [my.collaboration.id]);
    return { dissolved: true, collaborationId: my.collaboration.id };
  }

  if (target === normalizeEmail(my.collaboration.ownerEmail)) {
    const err = new Error('Nie można usunąć właściciela grupy');
    err.code = 'CANNOT_REMOVE_OWNER';
    throw err;
  }

  const [result] = await query(
    `DELETE FROM collaboration_members
     WHERE collaboration_id = ? AND LOWER(email) = ?`,
    [my.collaboration.id, target]
  );

  if (!result || result.affectedRows === 0) {
    const err = new Error('Nie znaleziono członka');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const members = await listMembers(my.collaboration.id);
  return { dissolved: false, collaboration: my.collaboration, members };
}

async function requireActiveCollaboration(email) {
  const my = await getMyCollaboration(email);
  if (!my) {
    const err = new Error('Brak aktywnej grupy współpracy');
    err.code = 'NO_COLLABORATION';
    throw err;
  }
  if (my.membership.status !== 'active') {
    const err = new Error('Twoje zaproszenie oczekuje na aktywne konto kalendarza');
    err.code = 'PENDING_MEMBERSHIP';
    throw err;
  }
  return my;
}

module.exports = {
  normalizeEmail,
  findMembershipByEmail,
  findCollaborationById,
  findCollaborationByOwnerEmail,
  listMembers,
  activateEligibleMembers,
  getMyCollaboration,
  createCollaborationForOwner,
  inviteMember,
  removeMember,
  requireActiveCollaboration,
};
