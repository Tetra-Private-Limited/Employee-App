import { config } from '../config/index.js';

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

// Reads the wall-clock date/time that `date` corresponds to in `timeZone`,
// e.g. the same UTC instant reads as a different hour (and possibly day) in
// Asia/Dhaka than it does in UTC. This is what lets us treat "today" and
// "9am" as the organization's local concepts rather than the server host's.
function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

// Converts a wall-clock date/time as it would read in `timeZone` into the
// UTC instant it represents. Works by guessing the instant is UTC, checking
// what that guess actually reads as in the target zone, and correcting by
// the discovered offset — avoids needing a timezone database dependency.
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const asReadInZone = getZonedParts(new Date(guessUtcMs), timeZone);
  const asReadInZoneMs = Date.UTC(
    asReadInZone.year,
    asReadInZone.month - 1,
    asReadInZone.day,
    asReadInZone.hour,
    asReadInZone.minute,
    asReadInZone.second
  );
  const offsetMs = asReadInZoneMs - guessUtcMs;
  return new Date(guessUtcMs - offsetMs);
}

// The wall-clock date/time in the organization's configured timezone for a
// given instant (defaults to now). Use this instead of `date.getHours()` /
// `date.getMinutes()` for anything compared against office-hours config.
export function orgNowParts(date: Date = new Date(), timeZone: string = config.timezone): ZonedParts {
  return getZonedParts(date, timeZone);
}

// Start of the organization's local calendar day (00:00:00 in `timeZone`)
// containing `date`, returned as the UTC instant it corresponds to — this
// is what should be stored/compared against the `attendance.date` column
// so "today" means the org's today, not the server host's.
export function startOfOrgDay(date: Date = new Date(), timeZone: string = config.timezone): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return zonedTimeToUtc(year, month, day, 0, 0, 0, timeZone);
}

// Start/end (exclusive) of a specific organization-local calendar day given
// as plain Y-M-D components (e.g. parsed from a "YYYY-MM-DD" query param).
// Deliberately does not go through `new Date(dateString)` — parsing a
// date-only ISO string that way anchors it to UTC midnight, which is a
// different instant than org-timezone midnight whenever the org isn't UTC.
export function orgDayBoundsFromParts(
  year: number,
  month: number,
  day: number,
  timeZone: string = config.timezone
): { start: Date; end: Date } {
  const start = zonedTimeToUtc(year, month, day, 0, 0, 0, timeZone);
  // Next calendar day's start, computed the same way rather than adding a
  // fixed 24h, so a DST transition day isn't mis-bounded. 25h is always
  // past next midnight (even a DST-shortened 23h day) and never far enough
  // to reach the day after that (which would need a further ~23h).
  const nextDay = new Date(start.getTime() + 25 * 60 * 60 * 1000);
  const nextParts = getZonedParts(nextDay, timeZone);
  const end = zonedTimeToUtc(nextParts.year, nextParts.month, nextParts.day, 0, 0, 0, timeZone);
  return { start, end };
}

// Parses a "YYYY-MM-DD" calendar date string (no timezone conversion) and
// returns its org-local day bounds.
export function orgDayBoundsFromDateString(
  dateString: string,
  timeZone: string = config.timezone
): { start: Date; end: Date } {
  const [year, month, day] = dateString.split('-').map(Number);
  return orgDayBoundsFromParts(year, month, day, timeZone);
}
