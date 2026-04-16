/**
 * Limits an array of objects to the most recent N years based on a year-extracting function.
 * Assumes current year = 0 and counts backwards (e.g., 0 = current year, -1 = previous year).
 *
 * @param items Array of objects
 * @param getYearFn Function that returns the year number from each item
 * @param limit Number of recent years to include
 * @returns Filtered array limited to the most recent N years
 */
export function limitToRecentYears<T>(
  items: T[],
  getYearFn: (item: T) => number,
  limit: number
): T[] {
  const currentYear = new Date().getFullYear();

  return items
    .filter(item => {
      const year = getYearFn(item);
      return year >= currentYear - limit + 1;
    })
    .sort((a, b) => getYearFn(a) - getYearFn(b)); // Optional: chronological order
}
