import { format, subMonths, startOfMonth } from 'date-fns';

/**
 * Generates a list of month options for selectors.
 * Default is 36 months back from current month.
 */
export const getMonthOptions = (count: number = 36) => {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy')
    });
  }
  
  return options;
};

/**
 * Gets the start and end ISO strings for a given month string (yyyy-MM)
 */
export const getMonthRange = (monthStr: string) => {
  if (monthStr === 'all') return { start: null, end: null };
  
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};
