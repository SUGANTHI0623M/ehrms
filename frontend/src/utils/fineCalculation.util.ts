/**
 * Frontend utility functions for calculating and displaying fine information
 */

export interface FineSettings {
  enabled: boolean;
  graceTimeMinutes: number; // Legacy
  finePerHour: number; // Legacy
  calculationType?: 'shiftBased' | 'fixedPerHour' | 'custom';
  fineRules?: {
    type: '1xSalary' | '2xSalary' | '3xSalary' | 'halfDay' | 'fullDay' | 'custom';
    customAmount?: number;
    applyTo?: 'lateArrival' | 'earlyExit' | 'both';
  }[];
}

export interface ShiftTiming {
  name: string;
  startTime: string;
  endTime: string;
  graceTime?: {
    value: number;
    unit: 'minutes' | 'hours';
  };
}

export interface AttendanceRecord {
  date: string;
  punchIn?: string;
  lateMinutes?: number;
  fineAmount?: number;
  status?: string;
}

/**
 * Calculate total fine from attendance records
 */
export function calculateTotalFine(attendanceRecords: AttendanceRecord[]): {
  totalFineAmount: number;
  lateDays: number;
  totalLateMinutes: number;
} {
  let totalFineAmount = 0;
  let lateDays = 0;
  let totalLateMinutes = 0;

  attendanceRecords.forEach(record => {
    if (record.fineAmount && record.fineAmount > 0) {
      totalFineAmount += record.fineAmount;
      lateDays++;
      totalLateMinutes += record.lateMinutes || 0;
    }
  });

  return {
    totalFineAmount: Math.round(totalFineAmount * 100) / 100,
    lateDays,
    totalLateMinutes
  };
}

/**
 * Format late minutes to human-readable string
 */
export function formatLateTime(lateMinutes: number): string {
  if (lateMinutes < 60) {
    return `${lateMinutes} min`;
  }
  const hours = Math.floor(lateMinutes / 60);
  const minutes = lateMinutes % 60;
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

/**
 * Calculate shift hours from start and end time
 */
export function calculateShiftHours(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  // Handle overnight shifts
  let diffMinutes = endTotalMinutes - startTotalMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Add 24 hours for overnight shift
  }
  
  return diffMinutes / 60; // Convert to hours
}

/**
 * Calculate fine amount based on different calculation types (Frontend preview)
 */
export function calculateFineAmountPreview(
  lateMinutes: number,
  shiftHours: number,
  dailySalary: number,
  fineSettings: FineSettings
): number {
  if (lateMinutes <= 0) {
    return 0;
  }

  // Use fine rule if available
  const rule = fineSettings.fineRules?.[0];
  
  if (!rule) {
    // Legacy calculation: fixed per hour
    if (fineSettings.calculationType === 'fixedPerHour' || fineSettings.finePerHour) {
      const lateHours = lateMinutes / 60;
      return Math.round((fineSettings.finePerHour * lateHours) * 100) / 100;
    }
    // Default: shift-based calculation
    const hourlyRate = dailySalary / shiftHours;
    const lateHours = lateMinutes / 60;
    return Math.round((hourlyRate * lateHours) * 100) / 100;
  }

  // Calculate based on rule type
  switch (rule.type) {
    case '1xSalary':
      return dailySalary;
    
    case '2xSalary':
      return dailySalary * 2;
    
    case '3xSalary':
      return dailySalary * 3;
    
    case 'halfDay':
      return dailySalary / 2;
    
    case 'fullDay':
      return dailySalary;
    
    case 'custom':
      return rule.customAmount || 0;
    
    default:
      // Fallback to shift-based calculation
      const hourlyRate = dailySalary / shiftHours;
      const lateHours = lateMinutes / 60;
      return Math.round((hourlyRate * lateHours) * 100) / 100;
  }
}

/**
 * Get grace time in minutes from shift timing
 */
export function getGraceTimeMinutes(
  shiftTiming: ShiftTiming | null,
  defaultGraceTimeMinutes: number
): number {
  if (shiftTiming?.graceTime) {
    if (shiftTiming.graceTime.unit === 'hours') {
      return shiftTiming.graceTime.value * 60;
    }
    return shiftTiming.graceTime.value;
  }
  return defaultGraceTimeMinutes;
}
