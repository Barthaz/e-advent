'use strict';

/**
 * Normalize admin PATCH task payloads.
 * Scratch calendars send { title, description }; interactive send { title } or { task }.
 */
function normalizeAdminTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((t, index) => {
    const day = Number(t.day) || index + 1;
    const title = t.title != null ? String(t.title).trim() : '';
    const description = t.description != null ? String(t.description).trim() : '';
    const text = String(t.task || description || t.title || t.content || '').trim();
    const out = { day, task: text };
    if (title) out.title = title;
    if (description) out.description = description;
    if (t.status) out.status = t.status;
    if (t.duration != null) out.duration = t.duration;
    if (t.latestDay != null) out.latestDay = t.latestDay;
    if (t.lockedDay != null) out.lockedDay = t.lockedDay;
    return out;
  });
}

module.exports = { normalizeAdminTasks };
