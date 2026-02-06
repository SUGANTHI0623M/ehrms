/**
 * Frontend utility functions for calculating salary based on working days
 */

export interface SalaryComponent {
  name: string;
  amount: number;
  type: 'earning' | 'deduction';
}

export interface SalaryStructure {
  gross: number;
  net: number;
  components: SalaryComponent[];
}

export interface WorkingDaysInfo {
  totalDaysInMonth: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  holidays: number;
  weekends: number;
}

export interface FineInfo {
  totalFineAmount: number;
  lateDays: number;
  totalLateMinutes: number;
}

/**
 * Calculate pro-rated salary based on working days (Frontend version)
 */
export function calculateSalaryByWorkingDays(
  salaryStructure: SalaryStructure,
  workingDaysInfo: WorkingDaysInfo,
  fineInfo?: FineInfo
): {
  gross: number;
  net: number;
  components: SalaryComponent[];
  breakdown: {
    totalDaysInMonth: number;
    workingDays: number;
    presentDays: number;
    attendancePercentage: number;
    proratedGross: number;
    proratedNet: number;
    totalFineAmount: number;
    lateDays: number;
    totalLateMinutes: number;
  };
} {
  const { workingDays, presentDays } = workingDaysInfo;

  // Calculate attendance percentage
  const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

  // Calculate prorated amounts
  const proratedComponents: SalaryComponent[] = salaryStructure.components.map(component => {
    let proratedAmount = component.amount;

    // For earnings, prorate based on working days
    if (component.type === 'earning') {
      // Components that are typically prorated (daily basis)
      const proratedComponents = ['basic', 'da', 'hra', 'allowance', 'special', 'esi', 'pf'];
      const componentNameLower = component.name.toLowerCase();
      
      // Check if this component should be prorated
      const shouldProrate = proratedComponents.some(keyword => componentNameLower.includes(keyword));
      
      if (shouldProrate) {
        proratedAmount = workingDays > 0 ? (component.amount / workingDays) * presentDays : 0;
      } else {
        // For yearly benefits like Gratuity, Statutory Bonus, Incentive - check if they should be prorated
        // Typically these are not prorated for partial months, but we'll prorate them anyway
        proratedAmount = workingDays > 0 ? (component.amount / workingDays) * presentDays : 0;
      }
    } else {
      // Deductions are typically prorated
      proratedAmount = workingDays > 0 ? (component.amount / workingDays) * presentDays : 0;
    }

    return {
      ...component,
      amount: Math.round(proratedAmount * 100) / 100 // Round to 2 decimal places
    };
  });

  // Calculate prorated gross (sum of all earnings)
  const proratedGross = proratedComponents
    .filter(c => c.type === 'earning')
    .reduce((sum, c) => sum + c.amount, 0);

  // Calculate prorated net (gross - deductions)
  let proratedNet = proratedGross - proratedComponents
    .filter(c => c.type === 'deduction')
    .reduce((sum, c) => sum + c.amount, 0);

  // Deduct fine amount from net salary
  const totalFineAmount = fineInfo?.totalFineAmount || 0;
  proratedNet = proratedNet - totalFineAmount;

  // Add fine as a deduction component if fine exists
  if (totalFineAmount > 0) {
    proratedComponents.push({
      name: 'Late Login Fine',
      amount: totalFineAmount,
      type: 'deduction'
    });
  }

  return {
    gross: Math.round(proratedGross * 100) / 100,
    net: Math.max(0, Math.round(proratedNet * 100) / 100), // Ensure net is not negative
    components: proratedComponents,
    breakdown: {
      totalDaysInMonth: workingDaysInfo.totalDaysInMonth,
      workingDays,
      presentDays,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      proratedGross: Math.round(proratedGross * 100) / 100,
      proratedNet: Math.max(0, Math.round(proratedNet * 100) / 100),
      totalFineAmount: Math.round(totalFineAmount * 100) / 100,
      lateDays: fineInfo?.lateDays || 0,
      totalLateMinutes: fineInfo?.totalLateMinutes || 0,
    }
  };
}

/**
 * Calculate working days in a month (excluding weekends and holidays)
 * @param year - Year
 * @param month - Month (0-11, JavaScript month index)
 * @param holidays - Array of holiday dates
 * @param weeklyOffPattern - 'standard' or 'oddEvenSaturday'
 */
export function calculateWorkingDays(
  year: number,
  month: number, // 0-11 (JavaScript month index)
  holidays: Date[] = [], // Array of holiday dates
  weeklyOffPattern: 'standard' | 'oddEvenSaturday' = 'standard'
): {
  totalDays: number;
  workingDays: number;
  weekends: number;
  holidayCount: number;
} {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  let workingDays = 0;
  let weekends = 0;
  const holidayDates = holidays.map(h => h.toDateString());

  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toDateString();

    // Check if it's a holiday first
    if (holidayDates.includes(dateString)) {
      continue; // Skip holidays
    }

    if (weeklyOffPattern === 'oddEvenSaturday') {
      // Odd/Even Saturday pattern: Odd Saturdays working, Even Saturdays off, All Sundays off
      if (dayOfWeek === 0) {
        // Sunday - always off
        weekends++;
      } else if (dayOfWeek === 6) {
        // Saturday - check if odd or even
        if (day % 2 === 1) {
          // Odd Saturday - working day
          workingDays++;
        } else {
          // Even Saturday - off
          weekends++;
        }
      } else {
        // Monday to Friday - working days
        workingDays++;
      }
    } else {
      // Standard pattern: Check if it's a weekend (Saturday = 6, Sunday = 0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends++;
      } else {
        workingDays++;
      }
    }
  }

  return {
    totalDays,
    workingDays,
    weekends,
    holidayCount: holidays.length
  };
}

/**
 * Calculate daily rate from monthly salary
 */
export function calculateDailyRate(monthlySalary: number, workingDaysInMonth: number): number {
  if (workingDaysInMonth === 0) return 0;
  return Math.round((monthlySalary / workingDaysInMonth) * 100) / 100;
}

/**
 * Calculate loss of pay for absent days
 */
export function calculateLossOfPay(
  dailyRate: number,
  absentDays: number
): number {
  return Math.round(dailyRate * absentDays * 100) / 100;
}

/**
 * Format currency (INR)
 */
export function formatCurrency(amount: number): string {
  return `₹ ${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

