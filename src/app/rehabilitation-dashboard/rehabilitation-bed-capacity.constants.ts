/**
 * קיבולת מיטות קבועה לפי שנה – מקור: טבלת Excel (עדכון ידני בקוד).
 * כמעט לא משתנה; יוחלף בטבלה דינמית בעתיד.
 */

export interface DepartmentBedCapacity {
  department: string;
  beds: number;
}

/** קיבולת מיטות לפי שנה ומחלקה */
export const REHAB_BED_CAPACITY_BY_YEAR: Record<number, DepartmentBedCapacity[]> = {
  2024: [
    { department: 'גריאטריה שיקומית', beds: 18 },
  ],
  2025: [
    { department: 'גריאטריה שיקומית', beds: 18 },
    { department: 'שיקום כללי', beds: 18 },
    { department: 'שיקום ילדים', beds: 14 },
  ],
  2026: [
    { department: 'גריאטריה שיקומית', beds: 18 },
    { department: 'שיקום כללי', beds: 35 },
    { department: 'שיקום ילדים', beds: 14 },
  ],
};

/** מספר ימים בחודש לפי שנה (לחישובי תפוסה מצטברים) */
export const DAYS_IN_MONTH: Record<number, number[]> = {
  2024: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  2025: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  2026: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
};

export function getBedCapacityForYear(year: number): DepartmentBedCapacity[] {
  if (REHAB_BED_CAPACITY_BY_YEAR[year]) {
    return REHAB_BED_CAPACITY_BY_YEAR[year].map((d) => ({ ...d }));
  }
  const years = Object.keys(REHAB_BED_CAPACITY_BY_YEAR).map(Number).sort((a, b) => b - a);
  const fallbackYear = years.find((y) => y <= year) || years[0];
  return REHAB_BED_CAPACITY_BY_YEAR[fallbackYear].map((d) => ({ ...d }));
}

export function getTotalBedsForYear(year: number): number {
  return getBedCapacityForYear(year).reduce((sum, d) => sum + d.beds, 0);
}

export function getBedsForDepartment(year: number, department: string): number {
  const row = getBedCapacityForYear(year).find((d) => d.department === department);
  return row ? row.beds : 0;
}

export function getInpatientDepartmentsWithBeds(year: number): string[] {
  return getBedCapacityForYear(year).map((d) => d.department);
}
