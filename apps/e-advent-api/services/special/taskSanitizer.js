'use strict';

const {
  getSpecialDescriptor,
  isPremiumCalendar,
  buildOpenedWindow,
} = require('./SpecialConfigRegistry');

/**
 * Strip premium metadata from tasks before client sees unopened windows.
 * Already-opened days may include special descriptor (surprise already revealed).
 */
function sanitizeTasksForClient(tasks, calendar = null) {
  if (!Array.isArray(tasks)) return tasks;
  const premium = calendar ? isPremiumCalendar(calendar) : false;
  return tasks.map((task) => {
    const isOpened = task.status === 'opened';
    const base = {
      day: task.day,
      title: task.title || task.task || '',
      status: task.status || 'closed',
      ...(task.duration !== undefined ? { duration: task.duration } : {}),
      ...(task.latestDay !== undefined ? { latestDay: task.latestDay } : {}),
    };
    if (isOpened && task.catalogTaskId) {
      base.catalogTaskId = task.catalogTaskId;
      if (premium) {
        const descriptor = getSpecialDescriptor(task.catalogTaskId);
        if (descriptor) {
          const opened = buildOpenedWindow(task, descriptor);
          base.isSpecial = true;
          base.special = opened.special;
        }
      }
    }
    return base;
  });
}

function normalizeStoredTask(task, day) {
  const title = task.title || task.task || '';
  return {
    day: task.day ?? day,
    title,
    task: title,
    status: task.status || 'closed',
    ...(task.catalogTaskId ? { catalogTaskId: task.catalogTaskId } : {}),
    ...(task.duration !== undefined ? { duration: task.duration } : {}),
    ...(task.latestDay !== undefined ? { latestDay: task.latestDay } : {}),
    ...(task.lockedDay !== undefined ? { lockedDay: task.lockedDay } : {}),
  };
}

function findTaskByDay(calendar, dayNum) {
  const tasks = calendar.data?.tasks || [];
  return tasks.find((t) => Number(t.day) === Number(dayNum));
}

module.exports = {
  sanitizeTasksForClient,
  normalizeStoredTask,
  findTaskByDay,
};
