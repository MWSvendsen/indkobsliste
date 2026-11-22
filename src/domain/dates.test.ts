import { addDays, dayName, isoWeek, mondayOf, plannedLabel, shortDayLabel, upcomingDates, weekDates } from './dates';

describe('ugenummer', () => {
  it('følger ISO 8601', () => {
    expect(isoWeek('2026-11-23')).toBe(48);
    expect(isoWeek('2026-11-29')).toBe(48);
    expect(isoWeek('2027-01-01')).toBe(53); // fredag hører til uge 53 i 2026
    expect(isoWeek('2027-01-04')).toBe(1);
    expect(isoWeek('2025-12-29')).toBe(1); // mandag hører til uge 1 i 2026
  });
});

describe('kommende dage', () => {
  it('går fra i dag til søndag i næste uge', () => {
    const days = upcomingDates('2026-11-25'); // onsdag
    expect(days[0]).toBe('2026-11-25');
    expect(days.at(-1)).toBe('2026-12-06');
    expect(days).toHaveLength(12);
  });
});

describe('plannedLabel', () => {
  const today = '2026-11-25'; // onsdag

  it('er tom, når retten ikke står på madplanen', () => {
    expect(plannedLabel([], today)).toBe('');
  });

  it('nævner dagene i denne uge med navn og "og" til sidst', () => {
    expect(plannedLabel(['2026-11-25', '2026-11-23'], today)).toBe('På madplanen mandag og onsdag');
    expect(plannedLabel(['2026-11-23', '2026-11-24', '2026-11-27'], today)).toBe(
      'På madplanen mandag, tirsdag og fredag',
    );
  });

  it('giver dage i senere uger dato på og udelader tidligere uger', () => {
    expect(plannedLabel(['2026-11-30', '2026-11-16'], today)).toBe('På madplanen man 30/11');
  });
});

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
