'use strict';

const WARSAW = 'Europe/Warsaw';

function tzOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

function parseMysqlDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value).trim().replace(' ', 'T');
  const withOffset = /Z|[+-]\d{2}:\d{2}$/.test(str) ? str : `${str}Z`;
  const date = new Date(withOffset);
  return Number.isNaN(date.getTime()) ? null : date;
}

// DATETIME from MySQL CURRENT_TIMESTAMP is a Warsaw wall clock. mysql2 timezone
// +00:00 puts those numbers on a UTC Date; this restores the real instant.
function warsawWallClockToUtc(value) {
  const date = parseMysqlDate(value);
  if (!date) return date;
  const wallAsUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  let instant = wallAsUtc - tzOffsetMs(new Date(wallAsUtc), WARSAW);
  instant = wallAsUtc - tzOffsetMs(new Date(instant), WARSAW);
  return new Date(instant);
}

module.exports = { warsawWallClockToUtc, parseMysqlDate };
