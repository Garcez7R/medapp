import { describe, expect, it } from 'vitest';
import { calculateDoseTimes, calculateTodayDoseTimes, shouldNotifyDose } from './utils';
import type { TodayDoseEntry } from './types';

describe('dose calculations', () => {
  it('creates doses respecting frequency and duration', () => {
    const doses = calculateDoseTimes('08:00', 8, 2);
    expect(doses.length).toBe(6);
    expect(doses[0].getHours()).toBe(8);
    expect(doses[1].getHours()).toBe(16);
  });

  it('creates today timeline by frequency', () => {
    const doses = calculateTodayDoseTimes('06:00', 6);
    expect(doses.length).toBe(4);
    expect(doses[0].getHours()).toBe(6);
  });
});

describe('notification rule', () => {
  it('notifies only near target and when pending', () => {
    const now = new Date();
    const entry: TodayDoseEntry = {
      key: 'm1|12:00',
      medicationId: 'm1',
      medicationName: 'Teste',
      dosage: '1cp',
      time: '12:00',
      dateTimeIso: new Date(now.getTime() + 30_000).toISOString(),
      taken: false,
      skipped: false
    };

    expect(shouldNotifyDose(entry, now)).toBe(true);
    expect(shouldNotifyDose({ ...entry, taken: true }, now)).toBe(false);
    expect(shouldNotifyDose({ ...entry, skipped: true }, now)).toBe(false);
  });
});
