const { normalizeAdminTasks } = require('../../services/calendarAdminTasks');

describe('normalizeAdminTasks', () => {
  test('keeps scratch title and description', () => {
    expect(normalizeAdminTasks([
      { day: 1, title: 'Startujemy!', description: 'Wymyślcie nazwę drużyny.', status: 'closed' },
    ])).toEqual([
      {
        day: 1,
        task: 'Wymyślcie nazwę drużyny.',
        title: 'Startujemy!',
        description: 'Wymyślcie nazwę drużyny.',
        status: 'closed',
      },
    ]);
  });

  test('interactive payload with title-only still has task text', () => {
    expect(normalizeAdminTasks([{ day: 2, title: 'Zrób pierniki' }])).toEqual([
      { day: 2, task: 'Zrób pierniki', title: 'Zrób pierniki' },
    ]);
  });
});
