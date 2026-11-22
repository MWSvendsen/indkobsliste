import type { ISODate } from '../data/types';

// Madplanens uge går fra mandag til søndag. Datoer er lokale kalenderdatoer, ikke UTC.

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = fromISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Mandagen i den uge, datoen ligger i. */
export function mondayOf(date: ISODate): ISODate {
  const weekday = (fromISODate(date).getDay() + 6) % 7; // mandag = 0
  return addDays(date, -weekday);
}

/** De syv datoer fra mandag til søndag. */
export function weekDates(monday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, k) => addDays(monday, k));
}

/** Ugenummer efter ISO 8601, som bruges i Danmark. */
export function isoWeek(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number);
  const utc = Date.UTC(y!, m! - 1, d!);
  const weekday = (new Date(utc).getUTCDay() + 6) % 7;
  const thursday = new Date(utc + (3 - weekday) * 86_400_000);
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return 1 + Math.floor((thursday.getTime() - jan1) / (7 * 86_400_000));
}

/** De næste dage fra i dag til og med søndag i næste uge. Bruges til "Sæt på madplanen". */
export function upcomingDates(today: ISODate): ISODate[] {
  const end = addDays(mondayOf(today), 13);
  const out: ISODate[] = [];
  for (let d = today; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const LONG = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

const weekdayIndex = (date: ISODate) => (fromISODate(date).getDay() + 6) % 7;

/** Fx "Mandag" */
export const dayName = (date: ISODate): string => LONG[weekdayIndex(date)]!;

/**
 * Hvornår en ret står på madplanen, fx "På madplanen mandag og onsdag".
 * Kun dage fra denne uges mandag og frem. Dage i en senere uge får dato på, fx "man 30/11".
 * Returnerer '' hvis retten ikke står på madplanen.
 */
export function plannedLabel(dates: ISODate[], today: ISODate): string {
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const parts = dates
    .filter((d) => d >= monday)
    .sort()
    .map((d) => (d <= sunday ? dayName(d).toLowerCase() : shortDayLabel(d).toLowerCase()));
  if (parts.length === 0) return '';
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} og ${parts.at(-1)}`;
  return `På madplanen ${list}`;
}

/** Fx "Man 23/11", som i prototypen */
export function shortDayLabel(date: ISODate): string {
  const d = fromISODate(date);
  return `${SHORT[weekdayIndex(date)]} ${d.getDate()}/${d.getMonth() + 1}`;
}
