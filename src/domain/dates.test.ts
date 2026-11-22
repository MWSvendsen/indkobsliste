import { addDays, dayName, mondayOf, shortDayLabel, weekDates } from './dates';

describe('datoer', () => {
  it('finder mandagen i ugen', () => {
    expect(mondayOf('2026-11-22')).toBe('2026-11-16'); // søndag
    expect(mondayOf('2026-11-23')).toBe('2026-11-23'); // mandag
    expect(mondayOf('2026-11-26')).toBe('2026-11-23'); // torsdag
  });

  it('giver ugen fra mandag til søndag', () => {
    expect(weekDates('2026-11-23')).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ]);
  });

  it('krydser måneder, år og skift til sommertid', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(weekDates('2027-03-22').at(-1)).toBe('2027-03-28');
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29');
  });

  it('laver danske etiketter som i prototypen', () => {
    expect(dayName('2026-11-28')).toBe('Lørdag');
    expect(shortDayLabel('2026-11-23')).toBe('Man 23/11');
    expect(shortDayLabel('2026-11-29')).toBe('Søn 29/11');
  });
});
