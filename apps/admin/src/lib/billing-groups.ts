import { format, subMonths } from 'date-fns';

export interface MonthGroup {
  label: string;
  value: string; // Used for Accordion item value (e.g., '2026-07')
  year: number;
  month: number;
}

export interface YearGroup {
  label: string;
  value: string; // Used for Accordion item value (e.g., 'fy-2025')
  year: number;
}

export function generateFinancialYearGroups() {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  // Financial Year in SA starts March 1st (month index 2)
  // If we are in Jan/Feb (0/1), current FY started in previous year
  const isEarlyYear = currentMonth < 2;
  const fyStartYear = isEarlyYear ? currentYear - 1 : currentYear;
  
  const months: MonthGroup[] = [];
  
  // Calculate months from now back to March of fyStartYear
  let d = new Date(now);
  while (true) {
    const m = d.getMonth();
    const y = d.getFullYear();
    
    months.push({
      label: format(d, 'MMMM yyyy'),
      value: format(d, 'yyyy-MM'),
      year: y,
      month: m + 1,
    });
    
    if (m === 2 && y === fyStartYear) {
      break; // Stop when we reach March of the current FY
    }
    
    d = subMonths(d, 1);
  }
  
  const previousFyStartYear = fyStartYear - 1;
  const previousFyEndYear = fyStartYear;
  
  const previousYearGroup: YearGroup = {
    label: `Financial Year ${previousFyStartYear}/${previousFyEndYear}`,
    value: `fy-${previousFyStartYear}`,
    year: previousFyStartYear,
  };
  
  return {
    currentMonths: months,
    previousYearGroup,
  };
}

export function getCurrentMonthString() {
  return format(new Date(), 'yyyy-MM');
}
