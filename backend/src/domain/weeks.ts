export interface WeekRange {
  weekNumber: number; // 1 to 5 or 6
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  startDay: number;   // Day of month (1..31)
  endDay: number;     // Day of month (1..31)
  label: string;      // e.g. "Week 1: Oct 1–4"
}

/**
 * Generates Monday-Sunday week boundaries for a given year and month (1-indexed: 1 = Jan, 12 = Dec).
 * Partial weeks at month boundaries are included:
 * - Week 1 starts on day 1 of the month and ends on the first Sunday of the month (or the last day if month ends earlier).
 * - Full intermediate weeks run Monday to Sunday.
 * - The final week starts on a Monday and ends on the last day of the month.
 */
export function getMonthlyWeeks(year: number, month: number): WeekRange[] {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: WeekRange[] = [];
  let currentDay = 1;
  let weekNumber = 1;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthName = monthNames[month - 1];

  while (currentDay <= daysInMonth) {
    const startDay = currentDay;
    const dateObj = new Date(year, month - 1, currentDay);
    // getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayOfWeek = dateObj.getDay();

    // In a Monday-Sunday week:
    // Sunday is day 7 in Mon-Sun indexing. Days to next Sunday = (7 - (dayOfWeek === 0 ? 7 : dayOfWeek))
    const daysUntilSunday = (7 - (dayOfWeek === 0 ? 7 : dayOfWeek));
    let endDay = currentDay + daysUntilSunday;

    if (endDay > daysInMonth) {
      endDay = daysInMonth;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const startStr = `${year}-${pad(month)}-${pad(startDay)}`;
    const endStr = `${year}-${pad(month)}-${pad(endDay)}`;

    weeks.push({
      weekNumber,
      startDate: startStr,
      endDate: endStr,
      startDay,
      endDay,
      label: `Week ${weekNumber}: ${monthName} ${startDay}–${endDay}`,
    });

    weekNumber++;
    currentDay = endDay + 1;
  }

  return weeks;
}

/**
 * Returns the week number (1..6) for a given date within its month.
 */
export function getWeekNumberForDate(date: Date | string): { year: number; month: number; weekNumber: number } {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const weeks = getMonthlyWeeks(year, month);
  const found = weeks.find(w => day >= w.startDay && day <= w.endDay);

  if (!found) {
    throw new Error(`Could not find week for date: ${d.toISOString()}`);
  }

  return { year, month, weekNumber: found.weekNumber };
}

