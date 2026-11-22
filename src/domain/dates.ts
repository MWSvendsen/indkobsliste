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

const LONG = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

const weekdayIndex = (date: ISODate) => (fromISODate(date).getDay() + 6) % 7;

/** Fx "Mandag" */
export const dayName = (date: ISODate): string => LONG[weekdayIndex(date)]!;

/** Fx "Man 23/11", som i prototypen */
export function shortDayLabel(date: ISODate): string {
  const d = fromISODate(date);
  return `${SHORT[weekdayIndex(date)]} ${d.getDate()}/${d.getMonth() + 1}`;
}
