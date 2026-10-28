'use strict';

let tail = Promise.resolve();

/**
 * Run heavy export work one job at a time per instance. Vercel Fluid compute shares an
 * instance between concurrent requests, and two overlapping A3 rasters exceed its memory.
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function runExclusive(task) {
  const run = tail.then(task, task);
  tail = run.catch(() => {});
  return run;
}

module.exports = { runExclusive };
