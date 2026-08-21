'use strict';

const path = require('path');
const fs = require('fs');

const registryPath = path.resolve(
  __dirname,
  '../../../../packages/content/generated/special-config-registry.json',
);

let registryCache = null;

function loadRegistry() {
  if (registryCache) return registryCache;
  const raw = fs.readFileSync(registryPath, 'utf8');
  registryCache = JSON.parse(raw);
  return registryCache;
}

function getSpecialDescriptor(catalogTaskId) {
  if (!catalogTaskId) return null;
  const registry = loadRegistry();
  return registry.entries[catalogTaskId] || null;
}

function isPremiumCalendar(calendar) {
  if (!calendar) return false;
  if (calendar.isFree) return false;
  if (calendar.status !== 'succeeded') return false;
  const sku = calendar.data?.sku || calendar.data?.productType;
  return sku === 'interactive' || sku === 'interactive-calendar' || !sku;
}

function buildOpenedWindow(task, descriptor) {
  const title = task.title || task.task || '';
  const text = task.title || task.task || task.content || '';
  return {
    taskId: task.catalogTaskId,
    day: task.day,
    state: 'OPENED',
    title,
    text,
    isSpecial: !!descriptor,
    ...(descriptor ? { special: descriptor } : {}),
  };
}

module.exports = {
  loadRegistry,
  getSpecialDescriptor,
  isPremiumCalendar,
  buildOpenedWindow,
};
