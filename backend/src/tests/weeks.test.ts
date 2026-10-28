import { getMonthlyWeeks, getWeekNumberForDate } from '../domain/weeks';

describe('Monday-Sunday Week Generation & Date Boundaries', () => {
  it('correctly generates October 2026 weeks matching exact product requirements', () => {
    // Requirements specification:
    // Week 1: October 1–4.
    // Week 2: October 5–11.
    // Week 3: October 12–18.
    // Week 4: October 19–25.
    // Week 5: October 26–31.
    const weeks = getMonthlyWeeks(2026, 10);

    expect(weeks.length).toBe(5);

    expect(weeks[0]).toEqual({
      weekNumber: 1,
      startDate: '2026-10-01',
      endDate: '2026-10-04',
      startDay: 1,
      endDay: 4,
      label: 'Week 1: Oct 1–4',
    });

    expect(weeks[1]).toEqual({
      weekNumber: 2,
      startDate: '2026-10-05',
      endDate: '2026-10-11',
      startDay: 5,
      endDay: 11,
      label: 'Week 2: Oct 5–11',
    });

    expect(weeks[2]).toEqual({
      weekNumber: 3,
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      startDay: 12,
      endDay: 18,
      label: 'Week 3: Oct 12–18',
    });

    expect(weeks[3]).toEqual({
      weekNumber: 4,
      startDate: '2026-10-19',
      endDate: '2026-10-25',
      startDay: 19,
      endDay: 25,
      label: 'Week 4: Oct 19–25',
    });

    expect(weeks[4]).toEqual({
      weekNumber: 5,
      startDate: '2026-10-26',
      endDate: '2026-10-31',
      startDay: 26,
      endDay: 31,
      label: 'Week 5: Oct 26–31',
    });
  });

  it('correctly handles leap years for February 2024 (29 days)', () => {
    const weeks = getMonthlyWeeks(2024, 2);
    // Feb 1 2024 was Thursday -> Week 1: Feb 1-4 (Sunday)
    // Week 2: Feb 5-11
    // Week 3: Feb 12-18
    // Week 4: Feb 19-25
    // Week 5: Feb 26-29 (Thursday)
    expect(weeks.length).toBe(5);
    expect(weeks[0].startDay).toBe(1);
    expect(weeks[0].endDay).toBe(4);
    expect(weeks[4].startDay).toBe(26);
    expect(weeks[4].endDay).toBe(29);
  });

  it('correctly handles non-leap year February 2023 (28 days)', () => {
    const weeks = getMonthlyWeeks(2023, 2);
    // Feb 1 2023 was Wednesday -> Week 1: Feb 1-5 (Sunday)
    // Week 2: Feb 6-12
    // Week 3: Feb 13-19
    // Week 4: Feb 20-26
    // Week 5: Feb 27-28
    expect(weeks.length).toBe(5);
    expect(weeks[4].endDay).toBe(28);
  });

  it('handles month starting on Monday (e.g., February 2021)', () => {
    const weeks = getMonthlyWeeks(2021, 2);
    // Feb 1 2021 was Monday -> Week 1: Feb 1-7 (Full week)
    expect(weeks[0].startDay).toBe(1);
    expect(weeks[0].endDay).toBe(7);
  });

  it('handles month starting on Sunday (e.g., August 2021)', () => {
    const weeks = getMonthlyWeeks(2021, 8);
    // Aug 1 was Sunday -> Week 1 is just Aug 1 (1 day partial week)
    expect(weeks[0].startDay).toBe(1);
    expect(weeks[0].endDay).toBe(1);
    expect(weeks[1].startDay).toBe(2);
    expect(weeks[1].endDay).toBe(8);
  });

  it('maps an exact date to its correct week within the month', () => {
    const r1 = getWeekNumberForDate('2026-10-03');
    expect(r1).toEqual({ year: 2026, month: 10, weekNumber: 1 });

    const r2 = getWeekNumberForDate('2026-10-15');
    expect(r2).toEqual({ year: 2026, month: 10, weekNumber: 3 });

    const r3 = getWeekNumberForDate('2026-10-31');
    expect(r3).toEqual({ year: 2026, month: 10, weekNumber: 5 });
  });

  it('throws error on invalid month', () => {
    expect(() => getMonthlyWeeks(2026, 0)).toThrow();
    expect(() => getMonthlyWeeks(2026, 13)).toThrow();
  });
});

