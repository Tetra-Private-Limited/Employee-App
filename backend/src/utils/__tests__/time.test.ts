import { describe, it, expect } from 'vitest';
import { orgNowParts, startOfOrgDay, orgDayBoundsFromDateString } from '../time.js';

describe('orgNowParts', () => {
  it('reads UTC 03:00 as the previous day, 21:00, in America/New_York (UTC-5 in Jan)', () => {
    const instant = new Date('2026-01-15T03:00:00.000Z');
    const parts = orgNowParts(instant, 'America/New_York');

    expect(parts).toMatchObject({ year: 2026, month: 1, day: 14, hour: 22, minute: 0 });
  });

  it('reads UTC 02:00 as same-day 08:00 in Asia/Dhaka (UTC+6)', () => {
    const instant = new Date('2026-01-15T02:00:00.000Z');
    const parts = orgNowParts(instant, 'Asia/Dhaka');

    expect(parts).toMatchObject({ year: 2026, month: 1, day: 15, hour: 8, minute: 0 });
  });

  it('matches the instant itself in UTC', () => {
    const instant = new Date('2026-06-01T14:30:00.000Z');
    const parts = orgNowParts(instant, 'UTC');

    expect(parts).toMatchObject({ year: 2026, month: 6, day: 1, hour: 14, minute: 30 });
  });
});

describe('startOfOrgDay', () => {
  it('returns UTC midnight when the org timezone is UTC', () => {
    const instant = new Date('2026-03-10T18:00:00.000Z');
    const start = startOfOrgDay(instant, 'UTC');

    expect(start.toISOString()).toBe('2026-03-10T00:00:00.000Z');
  });

  it('returns the correct UTC instant for local midnight in Asia/Dhaka (UTC+6)', () => {
    // 2026-03-10T18:00Z is already 2026-03-11 00:00 in Dhaka.
    const instant = new Date('2026-03-10T18:00:00.000Z');
    const start = startOfOrgDay(instant, 'Asia/Dhaka');

    // Dhaka midnight on 2026-03-11 is 2026-03-10T18:00:00.000Z.
    expect(start.toISOString()).toBe('2026-03-10T18:00:00.000Z');
  });

  it('does not roll over to the next UTC day for a timezone behind UTC', () => {
    // 2026-03-10T02:00Z is still 2026-03-09 22:00 in America/New_York
    // (EDT / UTC-4 — DST has already started by March 9, 2026).
    const instant = new Date('2026-03-10T02:00:00.000Z');
    const start = startOfOrgDay(instant, 'America/New_York');

    // NY midnight on 2026-03-09 is 2026-03-09T04:00:00.000Z.
    expect(start.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });
});

describe('orgDayBoundsFromDateString', () => {
  it('returns a 24h [start, end) range anchored to org-local midnight', () => {
    const { start, end } = orgDayBoundsFromDateString('2026-05-01', 'Asia/Dhaka');

    expect(start.toISOString()).toBe('2026-04-30T18:00:00.000Z'); // Dhaka midnight, May 1
    expect(end.toISOString()).toBe('2026-05-01T18:00:00.000Z'); // Dhaka midnight, May 2
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('is timezone-independent of the literal date string in UTC', () => {
    const { start, end } = orgDayBoundsFromDateString('2026-05-01', 'UTC');

    expect(start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-02T00:00:00.000Z');
  });
});
