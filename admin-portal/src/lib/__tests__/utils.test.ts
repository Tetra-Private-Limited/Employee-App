import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatTime,
  formatDuration,
  getStatusColor,
  buildQueryString,
  toISODate,
} from '../utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters falsy values', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar');
  });

  it('returns empty string for no truthy args', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-02-22T10:00:00Z');
    // en-IN locale: "22 Feb 2026" or similar
    expect(result).toContain('2026');
    expect(result).toContain('Feb');
  });
});

describe('formatTime', () => {
  it('formats a time string', () => {
    const result = formatTime('2026-02-22T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });

  it('returns dash for null', () => {
    expect(formatTime(null)).toBe('-');
  });
});

describe('formatDuration', () => {
  it('formats minutes to hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('formats minutes only', () => {
    expect(formatDuration(30)).toBe('30m');
  });

  it('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2h 0m');
  });

  it('returns dash for null', () => {
    expect(formatDuration(null)).toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatDuration(undefined as unknown as null)).toBe('-');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0m');
  });
});

describe('getStatusColor', () => {
  it('returns correct color for PRESENT', () => {
    expect(getStatusColor('PRESENT')).toBe('bg-green-100 text-green-800');
  });

  it('returns correct color for LATE', () => {
    expect(getStatusColor('LATE')).toBe('bg-yellow-100 text-yellow-800');
  });

  it('returns correct color for ABSENT', () => {
    expect(getStatusColor('ABSENT')).toBe('bg-red-100 text-red-800');
  });

  it('returns correct color for ADMIN role', () => {
    expect(getStatusColor('ADMIN')).toBe('bg-red-100 text-red-800');
  });

  it('returns default color for unknown status', () => {
    expect(getStatusColor('UNKNOWN')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('buildQueryString', () => {
  it('builds query string from params', () => {
    expect(buildQueryString({ page: 1, limit: 20 })).toBe('?page=1&limit=20');
  });

  it('skips undefined and null values', () => {
    expect(buildQueryString({ page: 1, search: undefined, dept: null })).toBe('?page=1');
  });

  it('skips empty strings', () => {
    expect(buildQueryString({ page: 1, search: '' })).toBe('?page=1');
  });

  it('returns empty string when no valid params', () => {
    expect(buildQueryString({ a: undefined, b: null })).toBe('');
  });

  it('handles boolean values', () => {
    expect(buildQueryString({ isActive: true })).toBe('?isActive=true');
  });
});

describe('toISODate', () => {
  it('converts Date to YYYY-MM-DD', () => {
    const date = new Date('2026-02-22T15:30:00Z');
    expect(toISODate(date)).toBe('2026-02-22');
  });
});
