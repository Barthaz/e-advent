import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStorageKeys,
  resolveCheckoutProduct,
  setActiveProduct,
  getActiveProduct,
  clearCreatorData,
  saveTasks,
  loadTasks,
  setPendingCalendarSession,
  markCalendarPurchased,
  getReusablePendingCalendarId,
  getPurchasedCalendarIds,
  getPendingCalendarSession,
} from './creatorStorage';
import { getProductPrice } from '../config/products';

describe('creatorStorage isolation (M-06 / UT-12)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses distinct keys per productType', () => {
    const interactive = getStorageKeys('interactive');
    const scratch = getStorageKeys('scratch');
    expect(interactive.form).not.toBe(scratch.form);
    expect(interactive.tasks).not.toBe(scratch.tasks);
    expect(interactive.calendarData).not.toBe(scratch.calendarData);
  });

  it('does not mix tasks between product types', () => {
    saveTasks('interactive', [{ day: 1, task: 'A' }]);
    saveTasks('scratch', [{ day: 1, task: 'B' }]);
    expect(loadTasks('interactive')[0].task).toBe('A');
    expect(loadTasks('scratch')[0].task).toBe('B');
  });

  it('setActiveProduct / getActiveProduct round-trip', () => {
    localStorage.setItem(getStorageKeys('scratch').calendarData, JSON.stringify({ sku: 'scratch-a4' }));
    setActiveProduct('scratch', 'scratch-a4');
    expect(getActiveProduct()).toEqual({ productType: 'scratch', sku: 'scratch-a4' });
  });

  it('clearCreatorData does not wipe the other product family', () => {
    saveTasks('interactive', [{ day: 1, task: 'Keep' }]);
    saveTasks('scratch', [{ day: 1, task: 'Wipe' }]);
    clearCreatorData('scratch');
    expect(loadTasks('interactive')[0].task).toBe('Keep');
    expect(loadTasks('scratch')).toEqual([]);
  });
});

describe('resolveCheckoutProduct (UT-14 parity)', () => {
  it('keeps interactive sku', () => {
    expect(resolveCheckoutProduct({ productType: 'interactive', sku: 'interactive' }, null)).toEqual({
      productType: 'interactive',
      sku: 'interactive',
    });
  });

  it('repairs mismatched scratch sku from format', () => {
    expect(
      resolveCheckoutProduct({ productType: 'scratch', sku: 'interactive', format: 'A3' }, null)
    ).toEqual({ productType: 'scratch', sku: 'scratch-a3' });
  });
});

describe('product price parity with API catalog (UT-14)', () => {
  it('matches known totals', () => {
    expect(getProductPrice('interactive')).toBe(9);
    expect(getProductPrice('scratch-a4')).toBe(54);
    expect(getProductPrice('scratch-a3')).toBe(74);
    expect(getProductPrice('santa-letter')).toBe(34);
  });
});

describe('pending vs purchased calendar session (M-02 / U-10)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not reuse purchased id as pending', () => {
    setPendingCalendarSession('uuid-first', 'token-1');
    markCalendarPurchased('uuid-first');
    expect(getReusablePendingCalendarId()).toBeNull();
    expect(getPurchasedCalendarIds()).toContain('uuid-first');
  });

  it('keeps pending session until purchased', () => {
    setPendingCalendarSession('uuid-pending', 'token-2');
    expect(getReusablePendingCalendarId()).toBe('uuid-pending');
    expect(getPendingCalendarSession()?.editToken).toBe('token-2');
  });
});
