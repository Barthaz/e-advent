const { runExclusive } = require('../../services/exportQueue');

describe('runExclusive', () => {
  test('runs export jobs one at a time in arrival order', async () => {
    const events = [];
    const job = (name, ms) => async () => {
      events.push(`start ${name}`);
      await new Promise((resolve) => setTimeout(resolve, ms));
      events.push(`end ${name}`);
      return name;
    };

    const results = await Promise.all([
      runExclusive(job('a', 20)),
      runExclusive(job('b', 1)),
    ]);

    expect(results).toEqual(['a', 'b']);
    expect(events).toEqual(['start a', 'end a', 'start b', 'end b']);
  });

  test('a failed job does not block the next one', async () => {
    const failed = runExclusive(async () => { throw new Error('boom'); });
    const next = runExclusive(async () => 'ok');
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});
