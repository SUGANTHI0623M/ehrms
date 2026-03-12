import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Wifi, TrendingUp, Edit, Camera, X, AlertCircle, DollarSign, History, UserCheck, FileText, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetEmployeeAttendanceQuery, useUpdateAttendanceMutation, useMarkAttendanceMutation } from "@/store/api/attendanceApi";
import { useGetEmployeeHolidaysQuery } from "@/store/api/holidayApi";
import { useGetBusinessQuery, useGetLeaveTemplateByIdQuery } from "@/store/api/settingsApi";
import { useGetStaffByIdQuery } from "@/store/api/staffApi";
import { useGetLeavesQuery, useGetCasualLeaveBalanceQuery } from "@/store/api/leaveApi";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, parseISO } from "date-fns";
import { useAppSelector } from "@/store/hooks";
import { message, DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatINR } from "@/utils/currencyUtils";

interface EmployeeAttendanceProps {
  employeeId?: string;
}

interface DayAttendance {
  date: Date;
  attendance?: any;
  isHoliday: boolean;
  holidayName?: string;
  isWeekOff: boolean;
  isWorkingDay: boolean;
  isToday: boolean;
  isPast: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
}

// Helper function to check if a leave type matches any template leave type
// Handles cases where leave type might have "Leave" suffix (e.g., "Casual Leave" matches "Casual")
const matchesTemplateLeaveType = (leaveType: string, templateLeaveTypes: string[]): boolean => {
  if (!leaveType || !templateLeaveTypes || templateLeaveTypes.length === 0) {
    return false;
  }
  
  const normalizedLeaveType = leaveType.trim().toLowerCase();
  
  // First check exact match (case-insensitive)
  if (templateLeaveTypes.some(templateType => templateType.trim().toLowerCase() === normalizedLeaveType)) {
    return true;
  }
  
  // Check if leave type starts with any template type (e.g., "Casual Leave" starts with "Casual")
  if (templateLeaveTypes.some(templateType => {
    const normalizedTemplate = templateType.trim().toLowerCase();
    return normalizedLeaveType.startsWith(normalizedTemplate) || 
           normalizedTemplate.startsWith(normalizedLeaveType);
  })) {
    return true;
  }
  
  // Check if removing "Leave" suffix makes them match (e.g., "Casual Leave" -> "Casual")
  const leaveTypeWithoutSuffix = normalizedLeaveType.replace(/\s*leave\s*$/i, '').trim();
  if (leaveTypeWithoutSuffix && templateLeaveTypes.some(templateType => {
    const normalizedTemplate = templateType.trim().toLowerCase();
    const templateWithoutSuffix = normalizedTemplate.replace(/\s*leave\s*$/i, '').trim();
    return leaveTypeWithoutSuffix === normalizedTemplate || 
           normalizedTemplate === leaveTypeWithoutSuffix ||
           leaveTypeWithoutSuffix === templateWithoutSuffix ||
           templateWithoutSuffix === leaveTypeWithoutSuffix;
  })) {
    return true;
  }
  
  return false;
};

const EmployeeAttendance = ({ employeeId }: EmployeeAttendanceProps) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [fineAdjustment, setFineAdjustment] = useState<string>("auto"); // "auto", "0", "1x", "2x", "3x", "custom"
  const [customFineAmount, setCustomFineAmount] = useState<number>(0);
  const [lateFineAdjustment, setLateFineAdjustment] = useState<string>("auto"); // "auto", "0", "custom"
  const [earlyFineAdjustment, setEarlyFineAdjustment] = useState<string>("auto"); // "auto", "0", "custom"
  const [customLateFineAmount, setCustomLateFineAmount] = useState<number>(0);
  const [customEarlyFineAmount, setCustomEarlyFineAmount] = useState<number>(0);
  const [isPaidLeave, setIsPaidLeave] = useState<boolean>(true); // For casual leave: paid or unpaid
  const [isLeaveBalanceModalOpen, setIsLeaveBalanceModalOpen] = useState(false); // Modal for leave balance info
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false); // Modal for leave selection
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>(""); // Selected leave type in modal
  const [selectedPaidLeave, setSelectedPaidLeave] = useState<boolean>(true); // Paid/unpaid selection in modal
  const [compensationType, setCompensationType] = useState<'paid' | 'unpaid' | 'weekOff' | 'compOff'>('paid'); // Compensation type for half day/leave
  const [paidHolidayNote, setPaidHolidayNote] = useState<string>(""); // Note for Paid Holiday
  const [alternateWorkDate, setAlternateWorkDate] = useState<Date | null>(null); // Alternate work date for week off

  // Month/Year selection for attendance view
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Selected date for Ant Design DatePicker (month picker)
  const selectedMonthDate = useMemo(() => {
    return dayjs(new Date(selectedYear, selectedMonth - 1, 1));
  }, [selectedMonth, selectedYear]);
  
  // Handle month picker change
  const handleMonthChange = (date: Dayjs | null) => {
    if (date) {
      setSelectedMonth(date.month() + 1);
      setSelectedYear(date.year());
    }
  };

  // Calculate month start and end based on selected month/year
  const monthStart = useMemo(() => {
    return startOfMonth(new Date(selectedYear, selectedMonth - 1));
  }, [selectedMonth, selectedYear]);

  const monthEnd = useMemo(() => {
    return endOfMonth(new Date(selectedYear, selectedMonth - 1));
  }, [selectedMonth, selectedYear]);

  const startDateStr = format(monthStart, "yyyy-MM-dd");
  const endDateStr = format(monthEnd, "yyyy-MM-dd");

  // Get all days of the month
  const monthDays = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [monthStart, monthEnd]);

  // Fetch staff data to get templates
  const { data: staffData } = useGetStaffByIdQuery(employeeId || "", {
    skip: !employeeId,
  });

  const staff = staffData?.data?.staff;
  const holidayTemplateId = staff?.holidayTemplateId;
  const attendanceTemplateId = staff?.attendanceTemplateId;
  const leaveTemplateId = staff?.leaveTemplateId;

  // Check if leaveTemplateId is already populated (full object) or just an ID
  const isPopulatedTemplate = leaveTemplateId && 
    typeof leaveTemplateId === 'object' && 
    (leaveTemplateId as any).name && 
    Array.isArray((leaveTemplateId as any).leaveTypes);
  
  // Extract leaveTemplateId for fetching if not already populated
  const extractedLeaveTemplateId = useMemo(() => {
    if (isPopulatedTemplate) {
      return ''; // Don't fetch if already populated
    }
    if (!leaveTemplateId) {
      console.warn('[EmployeeAttendance] No leaveTemplateId found for staff:', staff?.name || staff?._id);
      return '';
    }
    if (typeof leaveTemplateId === 'string') {
      return leaveTemplateId;
    }
    if (typeof leaveTemplateId === 'object' && leaveTemplateId._id) {
      return leaveTemplateId._id;
    }
    console.warn('[EmployeeAttendance] Invalid leaveTemplateId format:', leaveTemplateId);
    return '';
  }, [leaveTemplateId, staff, isPopulatedTemplate]);

  // Fetch leave template only if not already populated
  const { data: leaveTemplateData, isLoading: isLoadingLeaveTemplate } = useGetLeaveTemplateByIdQuery(
    extractedLeaveTemplateId,
    { skip: !extractedLeaveTemplateId || isPopulatedTemplate }
  );

  // Use populated template directly if available, otherwise use fetched template
  const leaveTemplate = isPopulatedTemplate ? leaveTemplateId : (leaveTemplateData?.data?.template || null);

  // Debug logging for leave template
  useEffect(() => {
    if (staff) {
      console.log('[EmployeeAttendance] Leave Template Debug:', {
        employeeId: staff.employeeId || staff._id,
        employeeName: staff.name,
        rawLeaveTemplateId: leaveTemplateId,
        isPopulatedTemplate: isPopulatedTemplate,
        extractedLeaveTemplateId: extractedLeaveTemplateId,
        hasLeaveTemplate: !!leaveTemplate,
        leaveTemplateName: leaveTemplate?.name,
        leaveTemplateId: leaveTemplate?._id,
        leaveTypes: (leaveTemplate as any)?.leaveTypes?.map((lt: any) => ({ type: lt.type, days: lt.days }))
      });
    }
  }, [staff, leaveTemplateId, extractedLeaveTemplateId, leaveTemplate, isPopulatedTemplate]);

  // Fetch attendance for the month
  const { data: attendanceData, isLoading: isLoadingAttendance, refetch: refetchAttendance } = useGetEmployeeAttendanceQuery(
    {
      employeeId: employeeId || "",
      startDate: startDateStr,
      endDate: endDateStr,
      limit: 100, // Get all days of month
    },
    { 
      skip: !employeeId,
      refetchOnMountOrArgChange: true
    }
  );

  // Fetch holidays for selected year
  const { data: holidaysData } = useGetEmployeeHolidaysQuery(
    {
      year: selectedYear,
      limit: 50,
      page: 1
    },
    { skip: !employeeId }
  );

  // Get weekly holiday settings from staff template or business settings
  const { data: businessData } = useGetBusinessQuery();
  
  // Check if staff has a weekly holiday template assigned
  const weeklyHolidayTemplate = staff?.weeklyHolidayTemplateId;
  const isWeeklyHolidayTemplatePopulated = weeklyHolidayTemplate && 
    typeof weeklyHolidayTemplate === 'object' && 
    (weeklyHolidayTemplate as any).settings;
  
  // Extract weekly holiday settings - priority: staff template > business settings
  const weeklyHolidaySettings = useMemo(() => {
    if (isWeeklyHolidayTemplatePopulated) {
      // Use staff's weekly holiday template (if isActive is not present, assume it's active)
      const template = weeklyHolidayTemplate as any;
      const isActive = template.isActive !== undefined ? template.isActive : true;
      
      if (isActive && template.settings) {
        return {
          weeklyOffPattern: template.settings?.weeklyOffPattern || "standard",
          weeklyHolidays: template.settings?.weeklyHolidays || [],
          allowAttendanceOnWeeklyOff: template.settings?.allowAttendanceOnWeeklyOff || false
        };
      }
    }
    
    // Fall back to business settings
    return {
      weeklyOffPattern: businessData?.data?.business?.settings?.business?.weeklyOffPattern || "standard",
      weeklyHolidays: businessData?.data?.business?.settings?.business?.weeklyHolidays || [],
      allowAttendanceOnWeeklyOff: businessData?.data?.business?.settings?.business?.allowAttendanceOnWeeklyOff || false
    };
  }, [weeklyHolidayTemplate, isWeeklyHolidayTemplatePopulated, businessData]);
  
  const weeklyOffPattern = weeklyHolidaySettings.weeklyOffPattern;
  const weeklyHolidays = weeklyHolidaySettings.weeklyHolidays;

  // Debug logging for weekly holiday settings
  useEffect(() => {
    if (staff && employeeId) {
      console.log('[EmployeeAttendance] Weekly Holiday Settings:', {
        employeeId: staff.employeeId || staff._id,
        employeeName: staff.name,
        hasWeeklyHolidayTemplate: !!weeklyHolidayTemplate,
        isTemplatePopulated: isWeeklyHolidayTemplatePopulated,
        templateName: (weeklyHolidayTemplate as any)?.name,
        weeklyOffPattern,
        weeklyHolidays: weeklyHolidays.map((wh: any) => ({ day: wh.day, name: wh.name })),
        source: isWeeklyHolidayTemplatePopulated ? 'staff_template' : 'business_settings'
      });
    }
  }, [staff, employeeId, weeklyHolidayTemplate, isWeeklyHolidayTemplatePopulated, weeklyOffPattern, weeklyHolidays]);

  const attendanceRecords = attendanceData?.data?.attendance || [];
  const holidays = holidaysData?.data?.holidays || [];

  const [updateAttendance, { isLoading: isUpdating }] = useUpdateAttendanceMutation();
  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  // Fetch approved leave requests for the employee
  // Note: We fetch all approved leaves and filter for casual leaves in the calculation
  // because leaveType might be stored as "casual" (lowercase) or "Casual Leave"
  const { data: leavesData } = useGetLeavesQuery(
    {
      employeeId: employeeId || "",
      status: "Approved",
      // Don't filter by leaveType here - we'll filter in the calculation to handle both "casual" and "Casual Leave"
      page: 1,
      limit: 100, // Get all approved leaves
    },
    { skip: !employeeId }
  );

  // Calculate available casual leaves from template, attendance records, and approved leave requests
  const casualLeaveInfo = useMemo(() => {
    if (!leaveTemplate) {
      return { total: 0, used: 0, usedFromAttendance: 0, usedFromRequests: 0, available: 0 };
    }

    // Sum all leave types from template (not just casual)
    const total = (leaveTemplate as any).leaveTypes.reduce((sum: number, lt: any) => {
      return sum + (lt.days || 0);
    }, 0);
    
    // Get all leave type names from template for matching
    const templateLeaveTypes = (leaveTemplate as any).leaveTypes.map((lt: any) => 
      (lt.type || '').trim()
    ).filter((type: string) => type.length > 0);

    const currentMonth = monthStart.getMonth();
    const currentYear = monthStart.getFullYear();

    // Helper function to calculate days of a leave that fall in the given month
    const getLeaveDaysInMonth = (startDate: string, endDate: string, year: number, month: number) => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      monthEnd.setHours(23, 59, 59, 999);
      const overlapStart = start < monthStart ? monthStart : start;
      const overlapEnd = end > monthEnd ? monthEnd : end;
      if (overlapStart > overlapEnd) return 0;
      return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    };

    // Count used casual leaves from attendance records in current month
    // Group by date to avoid counting duplicate records for the same date (matching backend logic)
    const dateLeaveMap = new Map<string, number>();
    
    attendanceRecords.forEach((record: any) => {
      const recordDate = new Date(record.date);
      const isInCurrentMonth = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      
      if (!isInCurrentMonth) {
        return;
      }
      
      // Check if it matches any leave type from template
      const matchesTemplateLeave = record.leaveType && 
        matchesTemplateLeaveType(record.leaveType.trim(), templateLeaveTypes);
      
      if (matchesTemplateLeave && (record.status === 'On Leave' || record.status === 'Half Day')) {
        // IMPORTANT: Exclude week off compensation - week off does NOT count as casual leave usage
        if (record.compensationType === 'weekOff' || record.compensationType === 'compOff') {
          return; // Week off compensation doesn't deduct from casual leaves
        }
        
        // Check if it's a half-day leave
        // Half-day can be: status === "Half Day" OR (status === "On Leave" with halfDaySession)
        const isHalfDay = record.status === "Half Day" || 
                         (record.status === "On Leave" && record.halfDaySession) ||
                         (record.halfDaySession && (record.halfDaySession === "First Half Day" || record.halfDaySession === "Second Half Day"));
        
        const leaveDays = isHalfDay ? 0.5 : 1;
        const dateKey = `${recordDate.getFullYear()}-${recordDate.getMonth()}-${recordDate.getDate()}`;
        
        // If this date already has a leave recorded, use the first one we encounter (to handle duplicates)
        if (!dateLeaveMap.has(dateKey)) {
          dateLeaveMap.set(dateKey, leaveDays);
        }
      }
    });
    
    // If there's a current selection (from the leave modal), account for it in the calculation
    // This allows showing the projected balance when half-day is selected
    if (selectedDate && selectedLeaveType === "Casual Leave" && isLeaveModalOpen) {
      const selectedDateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
      const isSelectedDateInCurrentMonth = selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
      
      if (isSelectedDateInCurrentMonth) {
        // Check if this is a half-day leave (from editData status or halfDaySession)
        const isCurrentHalfDay = editData.status === "Half Day" || editData.halfDaySession;
        const currentLeaveDays = isCurrentHalfDay ? 0.5 : 1;
        
        // Only add if this date doesn't already have a leave recorded
        if (!dateLeaveMap.has(selectedDateKey)) {
          dateLeaveMap.set(selectedDateKey, currentLeaveDays);
        }
      }
    }
    
    // Sum up all unique date leaves
    // NOTE: Only count from attendance collection since approved leaves create attendance records
    // Counting both would be double-counting
    const usedFromAttendance = Array.from(dateLeaveMap.values()).reduce((sum, days) => sum + days, 0);

    // Calculate available leaves based only on attendance records
    const used = usedFromAttendance;
    const available = Math.max(0, total - used);
    
    // Debug logging for half-day calculation
    const templateLeaveRecords = attendanceRecords.filter((r: any) => {
      const recordDate = new Date(r.date);
      const isInCurrentMonth = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      const matchesTemplateLeave = r.leaveType && matchesTemplateLeaveType(r.leaveType.trim(), templateLeaveTypes);
      return matchesTemplateLeave && isInCurrentMonth;
    });
    
    console.log('[EmployeeAttendance] Leave Balance Calculation with Half-Days:', {
      totalAllocated: total,
      templateLeaveTypes: templateLeaveTypes,
      usedFromAttendance: Math.round(usedFromAttendance * 10) / 10,
      totalUsed: Math.round(used * 10) / 10,
      available: Math.round(available * 10) / 10,
      breakdown: {
        attendanceRecords: templateLeaveRecords.map((r: any) => ({
          date: r.date,
          status: r.status,
          leaveType: r.leaveType,
          halfDaySession: r.halfDaySession,
          isHalfDay: r.status === "Half Day" || (r.status === "On Leave" && r.halfDaySession),
          countedAs: r.status === "Half Day" || (r.status === "On Leave" && r.halfDaySession) ? 0.5 : 1
        })),
        halfDayCount: templateLeaveRecords.filter((r: any) => 
          r.status === "Half Day" || (r.status === "On Leave" && r.halfDaySession)
        ).length,
        fullDayCount: templateLeaveRecords.filter((r: any) => 
          (r.status === "On Leave" || r.status === "Half Day") && 
          !(r.status === "Half Day" || (r.status === "On Leave" && r.halfDaySession))
        ).length
      }
    });
    
    return { 
      total, 
      used: Math.round(used * 10) / 10, // Round to 1 decimal place
      usedFromAttendance: Math.round(usedFromAttendance * 10) / 10,
      usedFromRequests: 0, // Not used anymore - all leaves are in attendance collection
      available: Math.round(available * 10) / 10 
    };
  }, [leaveTemplate, attendanceRecords, leavesData, monthStart, selectedDate, selectedLeaveType, isLeaveModalOpen, editData.status, editData.halfDaySession]);

  // Create day attendance map
  const attendanceMap = useMemo(() => {
    const map = new Map();
    attendanceRecords.forEach((record: any) => {
      const dateKey = format(new Date(record.date), "yyyy-MM-dd");
      map.set(dateKey, record);
    });
    return map;
  }, [attendanceRecords]);

  // Create holidays map
  const holidaysMap = useMemo(() => {
    const map = new Map();
    holidays.forEach((holiday: any) => {
      const dateKey = format(new Date(holiday.date), "yyyy-MM-dd");
      map.set(dateKey, holiday);
    });
    return map;
  }, [holidays]);

  // Check if a day is week off based on business pattern
  // Also check if this date is an alternate work date (override week off)
  const isWeekOff = (date: Date): boolean => {
    const dateKey = format(date, "yyyy-MM-dd");
    
    // Check if this date is an alternate work date (override week off)
    // If any attendance record has alternateWorkDate pointing to this date, it's a working day
    const isAlternateWorkDate = attendanceRecords.some((record: any) => {
      if (record.alternateWorkDate && record.compensationType === 'weekOff') {
        const alternateDateKey = format(new Date(record.alternateWorkDate), "yyyy-MM-dd");
        return alternateDateKey === dateKey;
      }
      return false;
    });
    
    // If it's an alternate work date, it's NOT a week off (return false)
    if (isAlternateWorkDate) {
      return false;
    }
    
    const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
    const dayOfMonth = date.getDate(); // 1-31

    if (weeklyOffPattern === 'oddEvenSaturday') {
      // Odd/Even Saturday pattern:
      // - All Sundays (dayOfWeek === 0) are off
      // - Odd Saturdays (dayOfMonth % 2 === 1) are working days
      // - Even Saturdays (dayOfMonth % 2 === 0) are off
      if (dayOfWeek === 0) {
        // Sunday - always off
        return true;
      } else if (dayOfWeek === 6) {
        // Saturday - check if odd or even date
        // Odd date (1, 3, 5, 7, etc.) = working day (return false)
        // Even date (2, 4, 6, 8, etc.) = week off (return true)
        return dayOfMonth % 2 === 0;
      } else {
        // Monday to Friday - working days
        return false;
      }
    } else {
      // Standard pattern: Use weeklyHolidays array from staff template or business settings
      if (weeklyHolidays && weeklyHolidays.length > 0) {
        return weeklyHolidays.some((wh: any) => wh.day === dayOfWeek);
      } else {
        // Default: Saturday and Sunday are weekends
        return dayOfWeek === 0 || dayOfWeek === 6;
      }
    }
  };

  // Build day attendance data
  const daysAttendance: DayAttendance[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return monthDays.map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const attendance = attendanceMap.get(dateKey);
      const holiday = holidaysMap.get(dateKey);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      
      // Check if this date is an alternate work date (override week off/holiday)
      const isAlternateWorkDate = attendanceRecords.some((record: any) => {
        if (record.alternateWorkDate && record.compensationType === 'weekOff') {
          const alternateDateKey = format(new Date(record.alternateWorkDate), "yyyy-MM-dd");
          return alternateDateKey === dateKey;
        }
        return false;
      });
      
      const weekOff = isWeekOff(date);
      const isHoliday = !!holiday;
      // If it's an alternate work date, it's a working day (override week off and holiday)
      const isWorkingDay = isAlternateWorkDate || (!weekOff && !isHoliday);

      // Check approval status
      // Approved: has approvedBy and approvedAt, OR status is Present/Absent/Half Day/On Leave with approvedBy
      const hasApproval = !!(attendance?.approvedBy && attendance?.approvedAt);
      const statusRequiresApproval = attendance?.status && ['Present', 'Absent', 'Half Day', 'On Leave'].includes(attendance.status);
      const isApproved = hasApproval && (statusRequiresApproval || attendance?.status === 'Approved');
      const isPending = attendance?.status === 'Pending' || (attendance?.status && statusRequiresApproval && !hasApproval);
      const isRejected = attendance?.status === 'Rejected';

      return {
        date: dateOnly,
        attendance,
        isHoliday,
        holidayName: holiday?.name,
        isWeekOff: weekOff,
        isWorkingDay,
        isToday: isSameDay(date, today),
        isPast: dateOnly < today,
        isApproved,
        isPending,
        isRejected,
      };
    });
  }, [monthDays, attendanceMap, holidaysMap, weeklyHolidays, weeklyOffPattern, attendanceRecords]);

  // Calculate stats - Payroll book format
  const stats = useMemo(() => {
    const workingDays = daysAttendance.filter((d) => d.isWorkingDay);
    const workingDaysAttendance = workingDays.filter((d) => d.attendance);
    
    // Calculate fine-related stats
    const fineStats = attendanceRecords.reduce((acc: any, r: any) => {
      if (r.fineAmount && r.fineAmount > 0) {
        acc.totalFineAmount += r.fineAmount;
        acc.daysWithFine += 1;
      }
      if (r.lateMinutes && r.lateMinutes > 0) {
        acc.totalLateMinutes += r.lateMinutes;
        acc.daysWithLate += 1;
      }
      if (r.earlyMinutes && r.earlyMinutes > 0) {
        acc.totalEarlyMinutes += r.earlyMinutes;
        acc.daysWithEarly += 1;
      }
      if (r.fineHours && r.fineHours > 0) {
        acc.totalFineHours += r.fineHours;
      }
      return acc;
    }, {
      totalFineAmount: 0,
      totalLateMinutes: 0,
      totalEarlyMinutes: 0,
      totalFineHours: 0,
      daysWithFine: 0,
      daysWithLate: 0,
      daysWithEarly: 0,
    });
    
    return {
      // Working days stats
      totalWorkingDays: workingDays.length,
      workingDaysWithAttendance: workingDaysAttendance.length,
      workingDaysWithoutAttendance: workingDays.length - workingDaysAttendance.length,
      
      // Approval stats for working days
      approvedCount: workingDaysAttendance.filter((d) => d.isApproved).length,
      pendingApprovalCount: workingDaysAttendance.filter((d) => d.isPending).length,
      rejectedCount: workingDaysAttendance.filter((d) => d.isRejected).length,
      
      // Status breakdown
      present: daysAttendance.filter((d) => d.attendance?.status === "Present" && d.isApproved).length,
      absent: daysAttendance.filter((d) => d.attendance?.status === "Absent" && d.isApproved).length,
      halfDay: daysAttendance.filter((d) => d.attendance?.status === "Half Day" && d.isApproved).length,
      onLeave: daysAttendance.filter((d) => d.attendance?.status === "On Leave" && d.isApproved).length,
      
      // Non-working days
      holidays: daysAttendance.filter((d) => d.isHoliday).length,
      weekOffs: daysAttendance.filter((d) => d.isWeekOff && !d.isHoliday).length,
      
      // Totals
      totalDays: daysAttendance.length,
      totalWorkHours: attendanceRecords.reduce((sum: number, r: any) => sum + (r.workHours || 0), 0),
      
      // Fine-related stats
      totalFineAmount: fineStats.totalFineAmount,
      totalLateMinutes: fineStats.totalLateMinutes,
      totalEarlyMinutes: fineStats.totalEarlyMinutes,
      totalFineHours: fineStats.totalFineHours,
      daysWithFine: fineStats.daysWithFine,
      daysWithLate: fineStats.daysWithLate,
      daysWithEarly: fineStats.daysWithEarly,
    };
  }, [daysAttendance, attendanceRecords]);

  const formatTime = (dateString?: string | Date) => {
    if (!dateString) return "-";
    if (dateString instanceof Date) {
      return format(dateString, "hh:mm a");
    }
    return format(new Date(dateString), "hh:mm a");
  };

  const formatWorkHours = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Format fine hours as decimal hours (e.g., 142 minutes = 2.37h)
  const formatFineHours = (minutes?: number) => {
    if (!minutes || minutes === 0) return "0h";
    const hours = minutes / 60;
    // Round to 2 decimal places, remove unnecessary trailing zeros
    const roundedHours = Math.round(hours * 100) / 100;
    // Format to show up to 2 decimal places, but remove trailing zeros
    return `${roundedHours.toFixed(2).replace(/\.?0+$/, '')}h`;
  };

  const formatLateHours = (minutes?: number) => {
    if (!minutes || minutes === 0) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Format work hours with fine deduction (e.g., "3:53 [-4:10] Hrs")
  const formatWorkHoursWithFine = (workHours?: number, fineHours?: number) => {
    if (!workHours && !fineHours) return "0:00 Hrs";
    
    // Calculate net work hours (work hours minus fine hours)
    const netWorkHours = (workHours || 0) - (fineHours || 0);
    const h = Math.floor(Math.max(0, netWorkHours) / 60);
    const m = Math.max(0, netWorkHours) % 60;
    
    let hoursStr = `${h}:${m.toString().padStart(2, '0')} Hrs`;
    
    if (fineHours && fineHours > 0) {
      // Format fine hours as decimal hours (e.g., 142 minutes = 2.37h)
      const fineHoursDecimal = fineHours / 60;
      const roundedFineHours = Math.round(fineHoursDecimal * 100) / 100;
      const fineStr = `[-${roundedFineHours.toFixed(2).replace(/\.?0+$/, '')}h]`;
      hoursStr = `${hoursStr} ${fineStr}`;
    }
    
    return hoursStr;
  };

  // Format time range (e.g., "10:08 AM - 7:04 PM")
  const formatTimeRange = (punchIn?: string, punchOut?: string) => {
    if (!punchIn) return "";
    const inTime = formatTime(punchIn);
    const outTime = punchOut ? formatTime(punchOut) : "";
    return outTime ? `${inTime} - ${outTime}` : inTime;
  };

  // Handle quick status change via button click
  const handleQuickStatusChange = async (dayData: DayAttendance, newStatus: string) => {
    if (!isAdmin) return;
    
    setSelectedDate(dayData.date);
    
    // If clicking Present, open dialog to set time
    if (newStatus === "Present") {
      setIsEditing(true);
      setEditData({
        ...(dayData.attendance || {}),
        date: format(dayData.date, "yyyy-MM-dd"),
        employeeId,
        status: "Present",
        punchIn: dayData.attendance?.punchIn || "",
        punchOut: dayData.attendance?.punchOut || "",
        notes: dayData.attendance?.notes || dayData.attendance?.remarks || "",
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment("auto");
      setEarlyFineAdjustment("auto");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType('paid');
      setAlternateWorkDate(null);
      setIsDetailDialogOpen(true);
      return;
    }

    // If clicking Half Day, open dialog to select session and compensation
    if (newStatus === "Half Day") {
      setIsEditing(true);
      setEditData({
        ...(dayData.attendance || {}),
        date: format(dayData.date, "yyyy-MM-dd"),
        employeeId,
        status: "Half Day",
        halfDaySession: dayData.attendance?.halfDaySession || "",
        punchIn: dayData.attendance?.punchIn || "",
        punchOut: dayData.attendance?.punchOut || "",
        notes: dayData.attendance?.notes || dayData.attendance?.remarks || "",
        compensationType: dayData.attendance?.compensationType || 'paid',
        alternateWorkDate: dayData.attendance?.alternateWorkDate || null,
      });
      setFineAdjustment("auto");
      setCompensationType(dayData.attendance?.compensationType || 'paid');
      setAlternateWorkDate(dayData.attendance?.alternateWorkDate ? new Date(dayData.attendance.alternateWorkDate) : null);
      setIsDetailDialogOpen(true);
      return;
    }

    // If clicking Week Off, open dialog to set alternate work date
    if (newStatus === "Week Off") {
      setIsEditing(true);
      setEditData({
        ...(dayData.attendance || {}),
        date: format(dayData.date, "yyyy-MM-dd"),
        employeeId,
        status: "Week Off", // Display as "Week Off" in the dropdown
        leaveType: "Unpaid Leave", // Week off uses Unpaid Leave type
        notes: dayData.attendance?.notes || dayData.attendance?.remarks || "",
        compensationType: dayData.attendance?.compensationType || 'weekOff',
        alternateWorkDate: dayData.attendance?.alternateWorkDate || null,
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment("auto");
      setEarlyFineAdjustment("auto");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType('weekOff');
      setAlternateWorkDate(dayData.attendance?.alternateWorkDate ? new Date(dayData.attendance.alternateWorkDate) : null);
      setIsDetailDialogOpen(true);
      return;
    }

    // If clicking On Leave, directly open leave selection modal (like AdminAttendance)
    if (newStatus === "On Leave") {
      setSelectedDate(dayData.date);
      
      // Initialize with existing leave data if available
      if (dayData.attendance?.leaveType) {
        setSelectedLeaveType(dayData.attendance.leaveType);
        setCompensationType(dayData.attendance.compensationType || 'paid');
        setAlternateWorkDate(dayData.attendance.alternateWorkDate ? new Date(dayData.attendance.alternateWorkDate) : null);
        setPaidHolidayNote(dayData.attendance.remarks || dayData.attendance.notes || "");
      } else {
        // Default to Casual Leave if available, otherwise Paid Holiday
        if (casualLeaveInfo.available > 0) {
          setSelectedLeaveType("Casual Leave");
        } else {
          setSelectedLeaveType("Paid Holiday");
        }
        setCompensationType('paid');
        setAlternateWorkDate(null);
        setPaidHolidayNote("");
      }
      
      setIsLeaveModalOpen(true);
      return;
    }

    // For other statuses, directly update
    try {
      const dateStr = format(dayData.date, "yyyy-MM-dd");
      const attendanceData: any = {
        status: newStatus,
      };

      if (dayData.attendance?._id) {
        await updateAttendance({
          id: dayData.attendance._id,
          data: attendanceData,
        }).unwrap();
        message.success(`Attendance marked as ${newStatus}`);
      } else {
        await markAttendance({
          date: dateStr,
          employeeId,
          ...attendanceData,
        }).unwrap();
        message.success(`Attendance marked as ${newStatus}`);
      }
      
      // Refetch attendance data
      refetchAttendance();
    } catch (error: any) {
      message.error(error?.data?.error?.message || `Failed to mark as ${newStatus}`);
    }
  };

  const getStatusBadge = (status: string, attendance?: any) => {
    // Check if it's a week off (On Leave with weekOff compensation)
    const isWeekOff = status === "On Leave" && attendance?.compensationType === 'weekOff';
    
    switch (status) {
      case "Present":
        return (
          <Badge variant="default" className="bg-[#efaa1f] hover:bg-[#d97706] text-white border-[#efaa1f] font-semibold">
            Present
          </Badge>
        );
      case "Absent":
        return (
          <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white border-red-600 font-semibold">
            Absent
          </Badge>
        );
      case "Half Day":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500 font-semibold">
            Half Day
          </Badge>
        );
      case "On Leave":
        if (isWeekOff) {
          return (
            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 font-semibold">
              Week Off
            </Badge>
          );
        }
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600 font-semibold">
            On Leave
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 font-semibold">
            Not Marked
          </Badge>
        );
    }
  };

  const handleDateClick = (dayData: DayAttendance) => {
    setSelectedDate(dayData.date);
    // If no attendance and admin, automatically enter edit mode
    if (!dayData.attendance && isAdmin && dayData.isWorkingDay) {
      setIsEditing(true);
      setEditData({
        date: format(dayData.date, "yyyy-MM-dd"),
        employeeId,
        status: "Present",
        punchIn: "",
        punchOut: "",
        notes: "",
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setIsPaidLeave(true); // Reset to default
    } else {
      setEditData(dayData.attendance || {});
      setIsEditing(false);
      
      // Initialize fine adjustment based on stored values (same logic as AdminAttendance)
      const existingFine = dayData.attendance?.fineAmount || 0;
      const lateMinutes = dayData.attendance?.lateMinutes || 0;
      const earlyMinutes = dayData.attendance?.earlyMinutes || 0;
      
      // Initialize late fine adjustment
      if (lateMinutes > 0) {
        // If there's a stored fineAmount and late minutes exist, try to estimate late portion
        // For now, set to auto - admin can adjust if needed
        setLateFineAdjustment("auto");
        // If fineAmount exists and only late minutes (no early), assume it's all late fine
        if (existingFine > 0 && earlyMinutes <= 0) {
          setLateFineAdjustment("custom");
          setCustomLateFineAmount(existingFine);
        } else {
          setCustomLateFineAmount(0);
        }
      } else {
        setLateFineAdjustment("0");
        setCustomLateFineAmount(0);
      }
      
      // Initialize early fine adjustment
      if (earlyMinutes > 0) {
        setEarlyFineAdjustment("auto");
        // If fineAmount exists and only early minutes (no late), assume it's all early fine
        if (existingFine > 0 && lateMinutes <= 0) {
          setEarlyFineAdjustment("custom");
          setCustomEarlyFineAmount(existingFine);
        } else {
          setCustomEarlyFineAmount(0);
        }
      } else {
        setEarlyFineAdjustment("0");
        setCustomEarlyFineAmount(0);
      }
      
      // Initialize overall fine adjustment
      if (existingFine === 0) {
        setFineAdjustment("0");
        setCustomFineAmount(0);
      } else if (existingFine > 0) {
        // If both late and early exist, use overall custom
        // If only one exists, it's already set above
        if (lateMinutes > 0 && earlyMinutes > 0) {
          setFineAdjustment("auto"); // Will be calculated from late + early
          setCustomFineAmount(existingFine);
        } else {
          setFineAdjustment("auto");
          setCustomFineAmount(existingFine);
        }
      } else {
        setFineAdjustment("auto");
        setCustomFineAmount(0);
      }
      // Set isPaidLeave based on existing attendance
      if (dayData.attendance?.leaveType === "Casual Leave") {
        setIsPaidLeave(dayData.attendance.isPaidLeave !== false); // Default to true if not explicitly false
      } else if (dayData.attendance?.leaveType === "Unpaid Leave") {
        setIsPaidLeave(false);
      } else {
        setIsPaidLeave(true); // Default to paid for other leave types
      }
      
      // Initialize compensationType and alternateWorkDate from existing attendance
      if (dayData.attendance) {
        if (dayData.attendance.compensationType) {
          setCompensationType(dayData.attendance.compensationType);
        } else if (dayData.attendance.status === "On Leave" || dayData.attendance.status === "Half Day") {
          // Set default based on isPaidLeave if compensationType not set
          setCompensationType(dayData.attendance.isPaidLeave === false ? 'unpaid' : 'paid');
        } else {
          setCompensationType('paid');
        }
        
        if (dayData.attendance.alternateWorkDate) {
          setAlternateWorkDate(new Date(dayData.attendance.alternateWorkDate));
        } else {
          setAlternateWorkDate(null);
        }
        
        // If it's a week off (On Leave with weekOff compensation), set status to "Week Off" for display
        if (dayData.attendance.status === "On Leave" && dayData.attendance.compensationType === 'weekOff') {
          setEditData({
            ...dayData.attendance,
            status: "Week Off", // Display as "Week Off" in the dropdown
          });
        }
      } else {
        // No existing attendance - reset to defaults
        setCompensationType('paid');
        setAlternateWorkDate(null);
      }
    }
    setIsDetailDialogOpen(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
    // Initialize editData if not already set
    if (!editData.status && selectedDayData?.attendance) {
      setEditData({
        ...selectedDayData.attendance,
        status: selectedDayData.attendance.status || "Present",
      });
      
      // Initialize fine adjustment based on existing fine amount
      const existingFine = selectedDayData.attendance.fineAmount;
      if (existingFine === 0) {
        // Fine was explicitly set to 0
        setFineAdjustment("0");
        setCustomFineAmount(0);
      } else if (existingFine && existingFine > 0) {
        // Fine exists and is greater than 0
        // Check if it matches a calculated value or is custom
        setFineAdjustment("custom");
        setCustomFineAmount(existingFine);
      } else {
        // No fine set yet, default to auto
        setFineAdjustment("auto");
        setCustomFineAmount(0);
      }
    } else if (!editData.status) {
      setEditData({
        date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
        employeeId,
        status: "Present",
        punchIn: "",
        punchOut: "",
        notes: "",
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
    }
  };

  const handleSave = async () => {
    if (!selectedDate || !employeeId) return;

    // Auto-mark as Present if punch times are set but status is not set
    let finalStatus = editData.status;
    if (!finalStatus && (editData.punchIn || editData.punchOut)) {
      finalStatus = "Present";
    }

    // Validate required fields
    if (!finalStatus) {
      message.error("Please select a status or set punch times");
      return;
    }

    // Validate half day session if status is Half Day
    if (finalStatus === "Half Day" && !editData.halfDaySession) {
      message.error("Please select a half day session (First Half Day or Second Half Day)");
      return;
    }

    // Validate week off - requires alternate work date
    if (finalStatus === "Week Off" || (finalStatus === "On Leave" && compensationType === 'weekOff')) {
      if (!alternateWorkDate) {
        message.error("Please select an alternate work date for week off");
        return;
      }
      // Set leave type to Unpaid Leave for week off
      if (!editData.leaveType) {
        editData.leaveType = "Unpaid Leave";
      }
    }

    // Validate leave type if status is On Leave (and not week off)
    if (finalStatus === "On Leave" && !editData.leaveType && compensationType !== 'weekOff') {
      message.error("Please select a leave type");
      return;
    }

    // Validate casual leave availability - check balance before saving (considering half-days)
    if (finalStatus === "On Leave" && editData.leaveType === "Casual Leave") {
      // Check if this is a half-day leave (status is "Half Day" or has halfDaySession)
      const isHalfDay = finalStatus === "Half Day" || editData.halfDaySession;
      const leaveDays = isHalfDay ? 0.5 : 1;
      
      // Check if there's enough balance
      if (casualLeaveInfo.available < leaveDays) {
        const usedBreakdown = 
          casualLeaveInfo.usedFromAttendance > 0
            ? ` (${casualLeaveInfo.usedFromAttendance.toFixed(1)} from attendance)`
            : "";
        const availableDisplay = casualLeaveInfo.available > 0 ? casualLeaveInfo.available.toFixed(1) : 0;
        message.warning(
          `Insufficient casual leave balance. Available: ${availableDisplay} days, Required: ${leaveDays} days${usedBreakdown}. Marking as Absent instead.`
        );
        
        // Mark as Absent instead of leave
        try {
          const dateStr = format(selectedDate, "yyyy-MM-dd");
          const attendanceData: any = {
            status: "Absent",
            notes: editData.notes || editData.remarks || `Marked as Absent - Insufficient casual leave balance (Available: ${availableDisplay} days, Required: ${leaveDays} days)`,
            remarks: editData.notes || editData.remarks || `Marked as Absent - Insufficient casual leave balance (Available: ${availableDisplay} days, Required: ${leaveDays} days)`,
          };

          const dayData = daysAttendance.find((d) => selectedDate && isSameDay(d.date, selectedDate));
          
          if (dayData?.attendance?._id) {
            await updateAttendance({
              id: dayData.attendance._id,
              data: attendanceData,
            }).unwrap();
            message.success("Marked as Absent (insufficient casual leave balance)");
          } else {
            await markAttendance({
              date: dateStr,
              employeeId,
              ...attendanceData,
            }).unwrap();
            message.success("Marked as Absent (insufficient casual leave balance)");
          }
          
          setIsEditing(false);
          setEditData({});
          setIsDetailDialogOpen(false);
          refetchAttendance();
        } catch (error: any) {
          message.error(error?.data?.error?.message || "Failed to mark as Absent");
        }
        return; // Prevent saving as leave
      }
    }

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Handle Week Off status - convert to On Leave with weekOff compensation BEFORE creating attendanceData
      // This ensures we never send "Week Off" as status to the backend (it's not a valid enum)
      if (finalStatus === "Week Off") {
        finalStatus = "On Leave";
        // Ensure compensationType is set to weekOff for week off
        if (compensationType !== 'weekOff') {
          setCompensationType('weekOff');
        }
        // Ensure leaveType is set for week off
        if (!editData.leaveType) {
          editData.leaveType = "Unpaid Leave";
        }
      }
      
      // Prepare data - convert empty strings to undefined
      const attendanceData: any = {
        status: finalStatus, // Now finalStatus is always a valid enum value (never "Week Off")
        notes: editData.notes || editData.remarks || undefined,
        remarks: editData.notes || editData.remarks || undefined,
      };

      // Add half day session if status is Half Day
      if (editData.status === "Half Day" && editData.halfDaySession) {
        attendanceData.halfDaySession = editData.halfDaySession;
      }

      // Add compensation type and alternate date for Half Day
      if (finalStatus === "Half Day") {
        attendanceData.compensationType = compensationType;
        // Always send alternateWorkDate - null if not weekOff or no date selected
        if (compensationType === 'weekOff' && alternateWorkDate) {
          attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
        } else {
          attendanceData.alternateWorkDate = null; // Explicitly set to null to clear
        }
        // Set isPaidLeave based on compensation type
        if (compensationType === 'paid') {
          attendanceData.isPaidLeave = true;
        } else if (compensationType === 'unpaid') {
          attendanceData.isPaidLeave = false;
        } else if (compensationType === 'weekOff') {
          // Week off with alternate date - treated as paid for the alternate date
          attendanceData.isPaidLeave = true;
        }
      }

      // Handle Week Off status - add weekOff compensation details
      if (editData.status === "Week Off" || (finalStatus === "On Leave" && compensationType === 'weekOff')) {
        attendanceData.leaveType = "Unpaid Leave"; // Week off uses Unpaid Leave type
        attendanceData.compensationType = 'weekOff';
        if (alternateWorkDate) {
          attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
        }
        attendanceData.isPaidLeave = true; // Week off with alternate date is treated as paid
      }

      // Add leave type and compensation if status is On Leave
      if (finalStatus === "On Leave" && editData.leaveType) {
        attendanceData.leaveType = editData.leaveType;
        
        // Validate Paid Holiday requires note
        if (editData.leaveType === "Paid Holiday") {
          if (!paidHolidayNote && !editData.remarks && !editData.notes) {
            message.error("Please provide a reason/note for Paid Holiday");
            return;
          }
          attendanceData.remarks = paidHolidayNote || editData.notes || editData.remarks || "";
          attendanceData.notes = paidHolidayNote || editData.notes || editData.remarks || "";
        }
        
        // Validate Comp Off requires alternate work date
        if (editData.leaveType === "Comp Off" || compensationType === 'compOff') {
          if (!alternateWorkDate && !editData.alternateWorkDate) {
            message.error("Please select an alternate work date for Comp Off");
            return;
          }
          attendanceData.compensationType = 'compOff';
          if (alternateWorkDate) {
            attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
          } else if (editData.alternateWorkDate) {
            attendanceData.alternateWorkDate = typeof editData.alternateWorkDate === 'string' 
              ? editData.alternateWorkDate 
              : new Date(editData.alternateWorkDate).toISOString();
          }
        } else if (editData.leaveType === "Week Off" || compensationType === 'weekOff') {
          // Validate Week Off requires alternate work date
          if (!alternateWorkDate && !editData.alternateWorkDate) {
            message.error("Please select an alternate work date for Week Off");
            return;
          }
          attendanceData.compensationType = 'weekOff';
          if (alternateWorkDate) {
            attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
          } else if (editData.alternateWorkDate) {
            attendanceData.alternateWorkDate = typeof editData.alternateWorkDate === 'string' 
              ? editData.alternateWorkDate 
              : new Date(editData.alternateWorkDate).toISOString();
          }
        } else {
          attendanceData.compensationType = compensationType || 'paid';
          attendanceData.alternateWorkDate = null;
        }
        
        // Set isPaidLeave based on leave type and compensation type
        const currentCompType = attendanceData.compensationType || compensationType;
        if (editData.leaveType === "Paid Holiday" || editData.leaveType === "Casual Leave") {
          attendanceData.isPaidLeave = true;
        } else if (editData.leaveType === "Comp Off" || editData.leaveType === "Week Off") {
          // Comp Off and Week Off with alternate date - treated as paid
          attendanceData.isPaidLeave = true;
        } else if (currentCompType === 'paid') {
          attendanceData.isPaidLeave = true;
        } else if (currentCompType === 'unpaid') {
          attendanceData.isPaidLeave = false;
        } else if (currentCompType === 'weekOff' || currentCompType === 'compOff') {
          // Week off/Comp off with alternate date - treated as paid
          attendanceData.isPaidLeave = true;
        }
      }

      // Handle punch times
      // Track if punch times are being changed (for fine recalculation)
      const punchTimesChanged = editData.punchIn !== undefined || editData.punchOut !== undefined;
      
      if (editData.punchIn) {
        attendanceData.punchIn = editData.punchIn;
      }
      if (editData.punchOut) {
        attendanceData.punchOut = editData.punchOut;
      }

      // Fine adjustment logic
      // Only send fine adjustments if admin explicitly set them (not "auto")
      // If all are "auto" and only punch times changed, backend will recalculate fines from punch times
      
      const hasExplicitFineAdjustments = 
        lateFineAdjustment !== "auto" || 
        earlyFineAdjustment !== "auto" || 
        fineAdjustment !== "auto";
      
      if (hasExplicitFineAdjustments) {
        // Admin explicitly adjusted fines - send fine adjustment data
        
        // Handle late fine adjustment
        if (lateFineAdjustment === "0") {
          // Remove late fine - set late minutes to 0
          attendanceData.lateMinutes = 0;
        } else if (lateFineAdjustment === "1x" || lateFineAdjustment === "2x" || lateFineAdjustment === "3x") {
          // Set multiplier - backend will calculate fine based on late minutes × multiplier
          const multiplier = lateFineAdjustment === "1x" ? 1 : lateFineAdjustment === "2x" ? 2 : 3;
          attendanceData.lateFineMultiplier = multiplier;
          // Keep existing lateMinutes, backend will apply multiplier
        } else if (lateFineAdjustment === "custom") {
          // Custom late fine amount
          attendanceData.lateFineAmount = customLateFineAmount;
        }
        // If "auto", don't send lateMinutes - backend will recalculate from punch times
        
        // Handle early exit fine adjustment
        if (earlyFineAdjustment === "0") {
          // Remove early exit fine - set early minutes to 0
          attendanceData.earlyMinutes = 0;
        } else if (earlyFineAdjustment === "1x" || earlyFineAdjustment === "2x" || earlyFineAdjustment === "3x") {
          // Set multiplier - backend will calculate fine based on early minutes × multiplier
          const multiplier = earlyFineAdjustment === "1x" ? 1 : earlyFineAdjustment === "2x" ? 2 : 3;
          attendanceData.earlyFineMultiplier = multiplier;
          // Keep existing earlyMinutes, backend will apply multiplier
        } else if (earlyFineAdjustment === "custom") {
          // Custom early fine amount
          attendanceData.earlyFineAmount = customEarlyFineAmount;
        }
        // If "auto", don't send earlyMinutes - backend will recalculate from punch times
        
        // Calculate total fine amount from late + early
        // If individual adjustments are set, calculate total from them
        if (lateFineAdjustment !== "auto" || earlyFineAdjustment !== "auto") {
          // Individual adjustments are set - calculate total
          const lateFine = lateFineAdjustment === "custom" ? customLateFineAmount : 
                          (lateFineAdjustment === "0" ? 0 : null);
          const earlyFine = earlyFineAdjustment === "custom" ? customEarlyFineAmount : 
                           (earlyFineAdjustment === "0" ? 0 : null);
          
          // If we have concrete values (custom or 0), calculate total
          if (lateFine !== null && earlyFine !== null) {
            const total = (lateFine || 0) + (earlyFine || 0);
            attendanceData.fineAmount = total;
          }
          // For multipliers, backend will calculate total from late + early fines
        } else {
          // Individual adjustments are auto - use overall adjustment
          // This is allowed when admin manually sets attendance times
          if (fineAdjustment === "0") {
            // Remove all fines
            attendanceData.fineAmount = 0;
            attendanceData.lateMinutes = 0;
            attendanceData.earlyMinutes = 0;
            attendanceData.fineHours = 0;
          } else if (fineAdjustment === "custom") {
            // Overall custom fine amount (when admin manually sets times)
            attendanceData.fineAmount = customFineAmount || 0;
          }
          // If "auto", backend will calculate from punch times
        }
      } else {
        // All fine adjustments are "auto" - don't send any fine fields
        // Backend will recalculate fines from punch times automatically
        // This allows proper recalculation when admin only changes punch times or switches from custom to auto
      }
      
      if (editData._id) {
        // Update existing attendance
        const result = await updateAttendance({
          id: editData._id,
          data: attendanceData,
        }).unwrap();
        message.success("Attendance updated successfully");
        
        // Refetch attendance data to update leave balance display
        refetchAttendance();
        
        // If fine was auto-calculated, the backend will have recalculated it
        // Refresh attendance data to show updated fine
        if (fineAdjustment === "auto" && result?.data?.attendance) {
          console.log('[Attendance] Fine auto-calculated:', {
            fineAmount: result.data.attendance.fineAmount,
            lateMinutes: result.data.attendance.lateMinutes,
            earlyMinutes: result.data.attendance.earlyMinutes
          });
        }
      } else {
        // Create new attendance
        const result = await markAttendance({
          date: dateStr,
          employeeId,
          ...attendanceData,
        }).unwrap();
        message.success("Attendance marked successfully");
        
        // Refetch attendance data to update leave balance display
        refetchAttendance();
        
        // If fine was auto-calculated, the backend will have calculated it
        if (fineAdjustment === "auto" && result?.data?.attendance) {
          console.log('[Attendance] Fine auto-calculated:', {
            fineAmount: result.data.attendance.fineAmount,
            lateMinutes: result.data.attendance.lateMinutes,
            earlyMinutes: result.data.attendance.earlyMinutes
          });
        }
      }

      setIsEditing(false);
      setIsDetailDialogOpen(false);
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment("auto");
      setEarlyFineAdjustment("auto");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      
      // Always refetch to get updated fine information
      await refetchAttendance();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to save attendance");
    }
  };

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return daysAttendance.find((d) => isSameDay(d.date, selectedDate));
  }, [selectedDate, daysAttendance]);
  
  // Check if admin manually set attendance times (in editing mode)
  const isManuallySetAttendance = useMemo(() => {
    if (!selectedDayData?.attendance) return false;
    // If we're editing and punch times are set, admin has control
    return isEditing && (editData.punchIn || editData.punchOut || 
                         (selectedDayData.attendance.punchIn && selectedDayData.attendance.punchOut));
  }, [isEditing, editData, selectedDayData]);
  
  // Calculate fine from late minutes based on adjustment
  const calculateLateFine = useMemo(() => {
    if (!selectedDayData?.attendance) return 0;
    
    const lateMinutes = selectedDayData.attendance.lateMinutes || 0;
    if (lateMinutes <= 0) return 0;
    
    // If fine is removed (0), return 0
    if (lateFineAdjustment === "0") {
      return 0;
    }
    
    // If custom amount is set, use it
    if (lateFineAdjustment === "custom") {
      return customLateFineAmount || 0;
    }
    
    // For multipliers (1x, 2x, 3x) or auto, use stored fineAmount if available
    if (lateFineAdjustment === "1x" || lateFineAdjustment === "2x" || lateFineAdjustment === "3x" || lateFineAdjustment === "auto") {
      // If there's a stored fineAmount and we have late minutes, estimate late portion
      if (selectedDayData.attendance.fineAmount && selectedDayData.attendance.fineAmount > 0) {
        // If only late minutes exist (no early), use the full fineAmount
        const earlyMinutes = selectedDayData.attendance.earlyMinutes || 0;
        if (earlyMinutes <= 0) {
          return selectedDayData.attendance.fineAmount;
        }
        // If both exist, we can't split accurately without backend calculation
        return null;
      }
      return null;
    }
    
    return 0;
  }, [selectedDayData, lateFineAdjustment, customLateFineAmount]);
  
  // Calculate fine from early minutes based on adjustment
  const calculateEarlyFine = useMemo(() => {
    if (!selectedDayData?.attendance) return 0;
    
    const earlyMinutes = selectedDayData.attendance.earlyMinutes || 0;
    if (earlyMinutes <= 0) return 0;
    
    // If fine is removed (0), return 0
    if (earlyFineAdjustment === "0") {
      return 0;
    }
    
    // If custom amount is set, use it
    if (earlyFineAdjustment === "custom") {
      return customEarlyFineAmount || 0;
    }
    
    // For multipliers (1x, 2x, 3x) or auto, use stored fineAmount if available
    if (earlyFineAdjustment === "1x" || earlyFineAdjustment === "2x" || earlyFineAdjustment === "3x" || earlyFineAdjustment === "auto") {
      // If there's a stored fineAmount and we have early minutes, estimate early portion
      if (selectedDayData.attendance.fineAmount && selectedDayData.attendance.fineAmount > 0) {
        // If only early minutes exist (no late), use the full fineAmount
        const lateMinutes = selectedDayData.attendance.lateMinutes || 0;
        if (lateMinutes <= 0) {
          return selectedDayData.attendance.fineAmount;
        }
        // If both exist, we can't split accurately without backend calculation
        return null;
      }
      return null;
    }
    
    return 0;
  }, [selectedDayData, earlyFineAdjustment, customEarlyFineAmount]);
  
  // Calculate total fine amount from late + early
  const calculatedTotalFine = useMemo(() => {
    // Priority 1: If individual adjustments are set (custom or 0), calculate from them
    // Check if we have custom adjustments set (even if value is 0)
    const hasCustomLate = lateFineAdjustment === "custom";
    const hasCustomEarly = earlyFineAdjustment === "custom";
    
    if (hasCustomLate || hasCustomEarly) {
      // Calculate from custom amounts (including 0 values)
      const lateFine = hasCustomLate ? (customLateFineAmount || 0) : 0;
      const earlyFine = hasCustomEarly ? (customEarlyFineAmount || 0) : 0;
      const total = lateFine + earlyFine;
      return total;
    }
    
    // If fines are removed (set to 0), return 0
    if (lateFineAdjustment === "0" && earlyFineAdjustment === "0") {
      return 0;
    }
    if (lateFineAdjustment === "0" && earlyFineAdjustment === "auto") {
      // Only early fine exists
      const earlyFine = calculateEarlyFine;
      return earlyFine !== null ? (earlyFine || 0) : null;
    }
    if (earlyFineAdjustment === "0" && lateFineAdjustment === "auto") {
      // Only late fine exists
      const lateFine = calculateLateFine;
      return lateFine !== null ? (lateFine || 0) : null;
    }
    
    // Priority 2: If overall custom fine is set and individual adjustments are auto
    if (fineAdjustment === "custom" && lateFineAdjustment === "auto" && earlyFineAdjustment === "auto") {
      return customFineAmount;
    }
    
    // Priority 3: Use stored fineAmount from DB if available (when adjustments are auto)
    if (selectedDayData?.attendance && selectedDayData.attendance.fineAmount !== undefined && selectedDayData.attendance.fineAmount !== null) {
      // If individual adjustments are auto, use stored value
      if (lateFineAdjustment === "auto" && earlyFineAdjustment === "auto") {
        return selectedDayData.attendance.fineAmount;
      }
    }
    
    // Otherwise, return null (backend will calculate)
    return null;
  }, [calculateLateFine, calculateEarlyFine, lateFineAdjustment, earlyFineAdjustment, fineAdjustment, customFineAmount, customLateFineAmount, customEarlyFineAmount, selectedDayData]);
  
  // Auto-sync overall fine when individual adjustments change
  useEffect(() => {
    // If individual adjustments are set (not auto), calculate total and sync overall
    if (lateFineAdjustment !== "auto" || earlyFineAdjustment !== "auto") {
      const lateFine = calculateLateFine;
      const earlyFine = calculateEarlyFine;
      
      // Only sync if we have concrete values (not null)
      if (lateFine !== null && earlyFine !== null) {
        const total = (lateFine || 0) + (earlyFine || 0);
        // Always update overall fine when individual adjustments change
        if (Math.abs(total - customFineAmount) > 0.01) {
          setFineAdjustment("custom");
          setCustomFineAmount(total);
        }
        // If total is 0 and fines are removed, set overall to 0
        if (total === 0 && (lateFineAdjustment === "0" || earlyFineAdjustment === "0")) {
          setFineAdjustment("0");
          setCustomFineAmount(0);
        }
      }
    } else if (lateFineAdjustment === "auto" && earlyFineAdjustment === "auto") {
      // If both are auto, reset overall to auto (unless admin manually set overall custom)
      // Don't auto-reset if admin explicitly set overall custom
      if (fineAdjustment === "custom" && !isManuallySetAttendance) {
        // Reset to auto if not manually set
        setFineAdjustment("auto");
        setCustomFineAmount(0);
      }
    }
  }, [lateFineAdjustment, customLateFineAmount, earlyFineAdjustment, customEarlyFineAmount, calculateLateFine, calculateEarlyFine, isManuallySetAttendance, customFineAmount, fineAdjustment]);
  
  // Display fine amount - calculated total or stored value
  const displayFineAmount = useMemo(() => {
    if (!selectedDayData?.attendance) return 0;
    
    // If we have a calculated total from individual adjustments, use it
    if (calculatedTotalFine !== null && calculatedTotalFine > 0) {
      return calculatedTotalFine;
    }
    
    // Otherwise use stored fine amount
    return selectedDayData.attendance.fineAmount || 0;
  }, [selectedDayData, calculatedTotalFine]);

  if (!employeeId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-base sm:text-lg font-medium mb-2">Employee ID Required</p>
        <p className="text-sm">Please provide an employee ID to view attendance records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Payroll Book Stats - Working Days & Approval Status */}
      <div className="space-y-4">
        {/* Working Days Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Working Days Summary - {format(monthStart, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Working Days</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.totalWorkingDays}</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">With Attendance</div>
                <div className="text-2xl sm:text-3xl font-bold  ">{stats.workingDaysWithAttendance}</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Without Attendance</div>
                <div className="text-2xl sm:text-3xl font-bold ">{stats.workingDaysWithoutAttendance}</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Hours</div>
                <div className="text-lg sm:text-xl font-bold">{formatWorkHours(stats.totalWorkHours)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Status Section */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Approval Status - Current Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Approved</div>
                <div className="text-2xl sm:text-3xl font-bold  ">{stats.approvedCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.totalWorkingDays > 0 
                    ? `${Math.round((stats.approvedCount / stats.totalWorkingDays) * 100)}% of working days`
                    : '0%'}
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Pending Approval</div>
                <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pendingApprovalCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.totalWorkingDays > 0 
                    ? `${Math.round((stats.pendingApprovalCount / stats.totalWorkingDays) * 100)}% of working days`
                    : '0%'}
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Rejected</div>
                <div className="text-2xl sm:text-3xl font-bold   ">{stats.rejectedCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.totalWorkingDays > 0 
                    ? `${Math.round((stats.rejectedCount / stats.totalWorkingDays) * 100)}% of working days`
                    : '0%'}
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Not Marked</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-600">{stats.workingDaysWithoutAttendance}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.totalWorkingDays > 0 
                    ? `${Math.round((stats.workingDaysWithoutAttendance / stats.totalWorkingDays) * 100)}% of working days`
                    : '0%'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-[#efaa1f]">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold   ">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Half Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.halfDay}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">On Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.onLeave}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Holidays</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-xl sm:text-2xl font-bold ">{stats.holidays}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Week Offs</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-xl sm:text-2xl font-bold ">{stats.weekOffs}</div>
          </CardContent>
        </Card>
      </div>

        {/* Fine Hours Stats Section */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5   " />
              Fine Hours & Penalties Summary - {format(monthStart, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4   " />
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Fine Hours</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold   ">
                  {formatFineHours(stats.totalFineHours)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.daysWithFine} day{stats.daysWithFine !== 1 ? 's' : ''} with fine
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-orange-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 " />
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Late Hours</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold ">
                  {formatLateHours(stats.totalLateMinutes)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.daysWithLate} day{stats.daysWithLate !== 1 ? 's' : ''} late
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Early Hours</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-600">
                  {formatLateHours(stats.totalEarlyMinutes)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.daysWithEarly} day{stats.daysWithEarly !== 1 ? 's' : ''} early
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-300">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-red-700" />
                  <div className="text-xs sm:text-sm text-muted-foreground">Total Fine Amount</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-red-700">
                  {stats.totalFineAmount > 0 ? formatINR(stats.totalFineAmount) : '₹0'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.daysWithFine > 0 
                    ? `Avg: ${formatINR(Math.round((stats.totalFineAmount / stats.daysWithFine) * 100) / 100)}/day`
                    : 'No fines'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Header with Legend */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
          <CardTitle className="text-base sm:text-lg">
            {format(monthStart, "MMMM yyyy")} - Attendance Details 
          </CardTitle>
          <div className="text-xs sm:text-sm text-muted-foreground mt-2">
            Week Off Pattern: <span className="font-medium">
              {weeklyOffPattern === 'oddEvenSaturday' 
                ? 'Odd/Even Saturday (Odd Saturdays working, Even Saturdays & all Sundays off)'
                : `Standard (${weeklyHolidays.map((wh: any) => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    return dayNames[wh.day];
                  }).join(', ')})`}
            </span>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="[&_.ant-picker]:h-10 [&_.ant-picker]:w-full [&_.ant-picker-input]:h-10 [&_.ant-picker-input]:text-sm">
                <DatePicker
                  picker="month"
                  value={selectedMonthDate}
                  onChange={handleMonthChange}
                  format="MMMM YYYY"
                  allowClear={false}
                  style={{ width: '180px' }}
                  size="large"
                  disabledDate={(current) => {
                    // Disable future months - only allow current month and past months
                    if (!current) return false;
                    const today = new Date();
                    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const selectedMonth = new Date(current.year(), current.month(), 1);
                    return selectedMonth > currentMonth;
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-blue-300 bg-blue-50"></div>
              <span>Working Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-purple-300 bg-purple-50"></div>
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-indigo-300 bg-indigo-50"></div>
              <span>Week Off</span>
            </div>
            {weeklyOffPattern === 'oddEvenSaturday' && (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Odd Sat</Badge>
                  <span>Odd Saturday (Working)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs">Even Sat</Badge>
                  <span>Even Saturday (Week Off)</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 hover:bg-green-600 text-xs">✓ Approved</Badge>
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">⏳ Pending</Badge>
              <span>Pending Approval</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">✗ Rejected</Badge>
              <span>Rejected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Attendance Cards */}
      {isLoadingAttendance ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-auto min-h-[180px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {daysAttendance
            .filter((dayData) => {
              // Only show cards up to current date (hide future dates)
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const cardDate = new Date(dayData.date);
              cardDate.setHours(0, 0, 0, 0);
              return cardDate <= today;
            })
            .map((dayData) => {
            const { date, attendance, isHoliday, holidayName, isWeekOff, isWorkingDay, isToday, isPast, isApproved, isPending, isRejected } = dayData;
            const dateKey = format(date, "yyyy-MM-dd");
            const dayNumber = format(date, "d");
            const dayName = format(date, "EEE");

            let cardBg = "bg-card";
            let borderColor = "border-border";
            let statusText = "";
            let statusColor = "";
            let dayTypeBadge = null;

            // Determine day type and styling
            if (isHoliday) {
              cardBg = "bg-purple-50 dark:bg-purple-950/20";
              borderColor = "border-purple-200 dark:border-purple-800";
              statusText = holidayName || "Holiday";
              statusColor = "text-purple-700 dark:text-purple-300";
              dayTypeBadge = <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs">Holiday</Badge>;
            } else if (isWeekOff) {
              cardBg = "bg-indigo-50 dark:bg-indigo-950/20";
              borderColor = "border-indigo-200 dark:border-indigo-800";
              statusText = "Week Off";
              statusColor = "text-indigo-700 dark:text-indigo-300";
              // Show specific week off reason for odd/even pattern
              const dayOfWeek = getDay(date);
              const dayOfMonth = date.getDate();
              const weekOffLabel = weeklyOffPattern === 'oddEvenSaturday' && dayOfWeek === 6 
                ? `Even Sat (${dayOfMonth})` 
                : weeklyOffPattern === 'oddEvenSaturday' && dayOfWeek === 0
                ? "Sunday"
                : "Week Off";
              dayTypeBadge = <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs">{weekOffLabel}</Badge>;
            } else if (isWorkingDay) {
              // For odd/even pattern, show if it's an odd Saturday (working)
              const dayOfWeek = getDay(date);
              const dayOfMonth = date.getDate();
              const workingDayLabel = weeklyOffPattern === 'oddEvenSaturday' && dayOfWeek === 6
                ? `Odd Sat (${dayOfMonth})`
                : "Working Day";
              dayTypeBadge = <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">{workingDayLabel}</Badge>;
              
              // Working day with attendance
              if (attendance?.status) {
                if (attendance.status === "Present" && isApproved) {
                  cardBg = "bg-green-50 dark:bg-green-950/20";
                  borderColor = "border-green-200 dark:border-green-800";
                } else if (attendance.status === "Absent" && isApproved) {
                  cardBg = "bg-red-50 dark:bg-red-950/20";
                  borderColor = "border-red-200 dark:border-red-800";
                } else if (attendance.status === "Half Day" && isApproved) {
                  cardBg = "bg-yellow-50 dark:bg-yellow-950/20";
                  borderColor = "border-yellow-200 dark:border-yellow-800";
                } else if (attendance.status === "On Leave" && isApproved) {
                  cardBg = "bg-blue-50 dark:bg-blue-950/20";
                  borderColor = "border-blue-200 dark:border-blue-800";
                } else if (isPending) {
                  cardBg = "bg-amber-50 dark:bg-amber-950/20";
                  borderColor = "border-amber-200 dark:border-amber-800";
                } else if (isRejected) {
                  cardBg = "bg-red-100 dark:bg-red-950/30";
                  borderColor = "border-red-300 dark:border-red-700";
                }
              } else {
                // Working day without attendance
                cardBg = "bg-gray-50 dark:bg-gray-950/20";
                borderColor = "border-gray-200 dark:border-gray-800";
              }
            }

            // Calculate work hours and fine hours for display
            const workHours = attendance?.workHours || 0;
            const fineHours = attendance?.fineHours || 0;
            const workHoursDisplay = formatWorkHoursWithFine(workHours, fineHours);
            const timeRange = formatTimeRange(attendance?.punchIn, attendance?.punchOut);
            const hasNote = attendance?.notes || attendance?.remarks;
            const hasLogs = attendance?.createdBy || attendance?.updatedBy;

            // Determine active status button
            const activeStatus = attendance?.status || "";

            return (
              <Card
                key={dateKey}
                className={`${cardBg} ${borderColor} hover:shadow-md transition-all ${
                  isToday ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                    {/* Left Side: Date, Hours, Shift, Note/Logs */}
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      {/* Date */}
                      <div className="font-bold text-sm sm:text-base mb-1">
                        {format(date, "d MMM")} | {dayName}
                      </div>

                      {/* Work Hours */}
                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                        {workHoursDisplay}
                        {attendance && (
                          <span className="ml-2 text-xs">
                            1 Shift (s) <span className="text-muted-foreground">ℹ️</span>
                          </span>
                        )}
                      </div>

                      {/* Note */}
                      {hasNote && (
                        <div className="text-xs mb-1">
                          {attendance.leaveType === "Paid Holiday" ? (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-2">
                              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Paid Holiday Reason:</div>
                              <div className="text-blue-800 dark:text-blue-200 line-clamp-2">
                                {attendance.notes || attendance.remarks}
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground line-clamp-1">
                              <span className="font-medium">Note:</span> {attendance.notes || attendance.remarks}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Links */}
                      <div className="flex items-center gap-3 mt-2">
                        {hasNote ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateClick(dayData);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {attendance?.leaveType === "Paid Holiday" ? "Edit Reason" : "Edit Note"}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateClick(dayData);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {attendance?.leaveType === "Paid Holiday" ? "Add Reason" : "Add Note"}
                          </button>
                        )}
                        {(hasLogs || attendance) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateClick(dayData);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Logs
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Status Buttons - 3-3-1 Layout */}
                    {isWorkingDay && (
                      <div className="w-full sm:w-auto sm:flex-shrink-0">
                        <div className="grid grid-cols-3 gap-1.5">
                          {/* Row 1: P, HD, F */}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 px-2 text-xs flex-shrink-0 border-0 ${
                              activeStatus === "Present"
                                ? isPending && !isApproved
                                  ? "!bg-green-400 hover:!bg-green-500 !text-white font-semibold" // Lighter green for pending
                                  : "!bg-[#efaa1f] hover:!bg-[#d97706] !text-white font-semibold" // Darker orange for approved
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickStatusChange(dayData, "Present");
                            }}
                          >
                            <span className="font-semibold">P</span> |{" "}
                            <span className="hidden sm:inline">{timeRange || "Present"}</span>
                            <span className="sm:hidden">P</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 px-2 text-xs flex-shrink-0 border-0 ${
                              activeStatus === "Half Day"
                                ? "!bg-orange-500 hover:!bg-orange-600 !text-white font-semibold"
                                : attendance?.halfDaySession === "First Half Day" || attendance?.halfDaySession === "Second Half Day"
                                ? "bg-orange-100 hover:bg-orange-200 text-orange-700"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickStatusChange(dayData, "Half Day");
                            }}
                          >
                            <span className="font-semibold">HD</span> |{" "}
                            <span className="hidden sm:inline">
                              {attendance?.halfDaySession === "First Half Day"
                                ? "Session 1"
                                : attendance?.halfDaySession === "Second Half Day"
                                ? "Session 2"
                                : "Half Day"}
                            </span>
                            <span className="sm:hidden">
                              {attendance?.halfDaySession === "First Half Day"
                                ? "S1"
                                : attendance?.halfDaySession === "Second Half Day"
                                ? "S2"
                                : "HD"}
                            </span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 ${
                              attendance?.fineAmount && attendance.fineAmount > 0 && fineHours > 0
                                ? "bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateClick(dayData);
                            }}
                          >
                            <span className="font-semibold text-[10px] sm:text-xs">F</span>
                            {(() => {
                              const lateMinutes = attendance?.lateMinutes || 0;
                              const earlyMinutes = attendance?.earlyMinutes || 0;
                              const fineAmount = attendance?.fineAmount || 0;
                              
                              // Priority 1: Show fine amount if it exists (covers both auto-calculated and custom fines)
                              if (fineAmount > 0) {
                                return (
                                  <span className="hidden md:inline text-[10px] sm:text-xs"> | {formatINR(fineAmount)}</span>
                                );
                              }
                              
                              // Priority 2: Show late/early time if there are late or early minutes (but no fine amount yet)
                              if (lateMinutes > 0 || earlyMinutes > 0) {
                                const parts: string[] = [];
                                if (lateMinutes > 0) {
                                  const lateHours = Math.floor(lateMinutes / 60);
                                  const lateMins = lateMinutes % 60;
                                  if (lateHours > 0) {
                                    parts.push(`${lateHours}h ${lateMins}m`);
                                  } else {
                                    parts.push(`${lateMins}m`);
                                  }
                                }
                                if (earlyMinutes > 0) {
                                  const earlyHours = Math.floor(earlyMinutes / 60);
                                  const earlyMins = earlyMinutes % 60;
                                  if (earlyHours > 0) {
                                    parts.push(`-${earlyHours}h ${earlyMins}m`);
                                  } else {
                                    parts.push(`-${earlyMins}m`);
                                  }
                                }
                                return (
                                  <span className="hidden md:inline text-[10px] sm:text-xs"> | {parts.join(' ')}</span>
                                );
                              }
                              
                              // No fine or late/early time
                              return null;
                            })()}
                          </Button>
                          
                          {/* Row 2: OT, A, L */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs flex-shrink-0 bg-gray-100 hover:bg-gray-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              message.info("Overtime feature coming soon");
                            }}
                          >
                            <span className="font-semibold">OT</span> |{" "}
                            <span className="hidden sm:inline">OT</span>
                            <span className="sm:hidden">OT</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 px-2 text-xs flex-shrink-0 border-0 ${
                              activeStatus === "Absent"
                                ? "!bg-red-600 hover:!bg-red-700 !text-white font-semibold"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickStatusChange(dayData, "Absent");
                            }}
                          >
                            <span className="font-semibold">A</span> |{" "}
                            <span className="hidden sm:inline">A</span>
                            <span className="sm:hidden">A</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 px-2 text-xs flex-shrink-0 border-0 ${
                              activeStatus === "On Leave" && attendance?.compensationType !== 'weekOff'
                                ? "!bg-purple-600 hover:!bg-purple-700 !text-white font-semibold"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickStatusChange(dayData, "On Leave");
                            }}
                          >
                            <span className="font-semibold">L</span> |{" "}
                            <span className="hidden sm:inline">L</span>
                            <span className="sm:hidden">L</span>
                          </Button>

                          {/* Row 3: WO (spans full width) */}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 px-2 text-xs flex-shrink-0 border-0 col-span-3 ${
                              activeStatus === "On Leave" && attendance?.compensationType === 'weekOff'
                                ? "!bg-indigo-600 hover:!bg-indigo-700 !text-white font-semibold"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickStatusChange(dayData, "Week Off");
                            }}
                          >
                            <span className="font-semibold">WO</span> |{" "}
                            <span className="hidden sm:inline">WO</span>
                            <span className="sm:hidden">WO</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* For holidays and week offs, show status */}
                    {!isWorkingDay && (
                      <div className="flex flex-col items-end gap-1">
                        {dayTypeBadge}
                        {isToday && (
                          <Badge variant="default" className="text-xs">Today</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Attendance Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>
              Attendance Details - {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {isAdmin && !isEditing && selectedDayData?.attendance && (
                <Button variant="outline" size="sm" onClick={handleEdit} className="mt-2">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Attendance
                </Button>
              )}
              {isAdmin && !isEditing && !selectedDayData?.attendance && selectedDayData?.isWorkingDay && (
                <Button variant="default" size="sm" onClick={handleEdit} className="mt-2">
                  <Edit className="w-4 h-4 mr-2" />
                  Mark Attendance
                </Button>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDayData && (
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-4 mb-0">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="logs" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Activity Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
                <div className="space-y-4">
                  {/* Day Type Info */}
                  <div className="flex flex-wrap gap-2">
                    {selectedDayData.isWorkingDay && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        Working Day
                      </Badge>
                    )}
                    {selectedDayData.isHoliday && (
                      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                        Holiday: {selectedDayData.holidayName || "Holiday"}
                      </Badge>
                    )}
                    {selectedDayData.isWeekOff && !selectedDayData.isHoliday && (
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
                        Week Off
                      </Badge>
                    )}
                  </div>

                  {/* Holiday/Week Off Info */}
                  {(selectedDayData.isHoliday || selectedDayData.isWeekOff) && (
                <Card className={selectedDayData.isHoliday ? "bg-purple-50" : "bg-indigo-50"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <div>
                        <div className="font-medium">
                          {selectedDayData.isHoliday
                            ? selectedDayData.holidayName || "Holiday"
                            : "Week Off"}
                        </div>
                        {selectedDayData.isHoliday && (
                          <div className="text-sm text-muted-foreground">
                            This is a company holiday
                          </div>
                        )}
                      </div>
            </div>
                  </CardContent>
                </Card>
              )}

              {/* Attendance Details */}
              {selectedDayData.attendance ? (
                <div className="space-y-4">
                  {/* Approval Status for Working Days */}
                  {selectedDayData.isWorkingDay && (
                    <Card className={selectedDayData.isApproved ? "bg-green-50 border-green-200" : selectedDayData.isPending ? "bg-yellow-50 border-yellow-200" : selectedDayData.isRejected ? "bg-red-50 border-red-200" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium mb-1">Approval Status</div>
                            {selectedDayData.isApproved && (
                              <div className="text-sm text-muted-foreground">
                                Approved by {selectedDayData.attendance.approvedBy?.name || "Admin"} on {selectedDayData.attendance.approvedAt ? format(new Date(selectedDayData.attendance.approvedAt), "MMM d, yyyy h:mm a") : "N/A"}
            </div>
                            )}
                            {selectedDayData.isPending && (
                              <div className="text-sm text-muted-foreground">
                                Waiting for admin approval
            </div>
                            )}
                            {selectedDayData.isRejected && (
                              <div className="text-sm text-muted-foreground">
                                Rejected - Requires correction
                              </div>
                            )}
                          </div>
                          <div>
                            {selectedDayData.isApproved && (
                              <Badge className="bg-green-500 hover:bg-green-600">✓ Approved</Badge>
                            )}
                            {selectedDayData.isPending && (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600">⏳ Pending</Badge>
                            )}
                            {selectedDayData.isRejected && (
                              <Badge variant="destructive">✗ Rejected</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedDayData.attendance.status, selectedDayData.attendance)}</div>
                    </div>
                    {isEditing && isAdmin && (
                      <div>
                        <Label>Change Status *</Label>
              <Select
                          value={editData.status || ""}
                          onValueChange={(value) => {
                            const newData = { ...editData, status: value };
                            // Clear half day session if not half day
                            if (value !== "Half Day") {
                              delete newData.halfDaySession;
                            }
                            setEditData(newData);
                          }}
                        >
                          <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                            <SelectItem value="Present">Present</SelectItem>
                            <SelectItem value="Absent">Absent</SelectItem>
                            <SelectItem value="Half Day">Half Day</SelectItem>
                            <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
                    )}
                </div>

                  {/* Half Day Session Selection */}
                  {((isEditing && editData.status === "Half Day") || (!isEditing && selectedDayData.attendance.status === "Half Day" && selectedDayData.attendance.halfDaySession)) && (
                    <div>
                      <Label>Half Day Session</Label>
                      {isEditing && isAdmin ? (
                        <Select
                          value={editData.halfDaySession || ""}
                          onValueChange={(value) => setEditData({ ...editData, halfDaySession: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select session" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="First Half Day">First Half Day</SelectItem>
                            <SelectItem value="Second Half Day">Second Half Day</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{selectedDayData.attendance.halfDaySession || "Not specified"}</span>
                </div>
                      )}
                    </div>
                  )}

                  {/* Compensation Type for Half Day */}
                  {((isEditing && editData.status === "Half Day") || (!isEditing && selectedDayData.attendance.status === "Half Day")) && (
                    <div>
                      <Label>Compensation Type</Label>
                      {isEditing && isAdmin ? (
                        <>
                          <Select
                            value={compensationType || editData.compensationType || (editData.isPaidLeave === false ? 'unpaid' : 'paid')}
                            onValueChange={(value: 'paid' | 'unpaid' | 'weekOff') => {
                              setCompensationType(value);
                              const newData = { ...editData, compensationType: value };
                              if (value !== 'weekOff') {
                                setAlternateWorkDate(null);
                                newData.alternateWorkDate = null;
                              }
                              setEditData(newData);
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid (Full Salary)</SelectItem>
                              <SelectItem value="unpaid">Unpaid (Half Day Salary)</SelectItem>
                              <SelectItem value="weekOff">Week Off (Alternate Date)</SelectItem>
                            </SelectContent>
                          </Select>
                          {(compensationType === 'weekOff' || editData.compensationType === 'weekOff') && (
                            <div className="mt-2">
                              <Label className="text-sm">Alternate Work Date</Label>
                              <Input
                                type="date"
                                value={alternateWorkDate ? format(alternateWorkDate, "yyyy-MM-dd") : (editData.alternateWorkDate ? format(new Date(editData.alternateWorkDate), "yyyy-MM-dd") : "")}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const date = new Date(e.target.value);
                                    setAlternateWorkDate(date);
                                    setEditData({ ...editData, alternateWorkDate: date.toISOString() });
                                  } else {
                                    setAlternateWorkDate(null);
                                    setEditData({ ...editData, alternateWorkDate: null });
                                  }
                                }}
                                min={format(new Date(), "yyyy-MM-dd")}
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Employee will work on this date instead
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="capitalize">{selectedDayData.attendance.compensationType || 'paid'}</span>
                          {selectedDayData.attendance.alternateWorkDate && (
                            <span className="text-xs text-muted-foreground">
                              (Alternate: {format(new Date(selectedDayData.attendance.alternateWorkDate), "MMM d, yyyy")})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leave Type Selection */}
                  {((isEditing && editData.status === "On Leave") || (!isEditing && selectedDayData.attendance.status === "On Leave" && selectedDayData.attendance.leaveType)) && (
                    <div>
                      <Label>Leave Type</Label>
                      {isEditing && isAdmin ? (
                        <>
                          <Select
                            value={editData.leaveType || ""}
                            onValueChange={(value) => {
                              const newData = { ...editData, leaveType: value };
                              // Auto-set compensation type based on leave type
                              if (value === "Paid Holiday") {
                                setCompensationType('paid');
                                newData.compensationType = 'paid';
                              } else if (value === "Comp Off") {
                                setCompensationType('compOff');
                                newData.compensationType = 'compOff';
                              } else if (value === "Week Off") {
                                setCompensationType('weekOff');
                                newData.compensationType = 'weekOff';
                              } else if (value === "Casual Leave") {
                                setCompensationType('paid');
                                newData.compensationType = 'paid';
                              }
                              setEditData(newData);
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Only show the 4 allowed leave types */}
                              <SelectItem 
                                value="Casual Leave"
                                disabled={casualLeaveInfo.available <= 0 || editData.compensationType === 'weekOff' || compensationType === 'weekOff'}
                                className={(casualLeaveInfo.available <= 0 || editData.compensationType === 'weekOff' || compensationType === 'weekOff') ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                Casual Leave
                                {casualLeaveInfo.available <= 0 && " - Exhausted"}
                                {(editData.compensationType === 'weekOff' || compensationType === 'weekOff') && " - Not available for Week Off"}
                              </SelectItem>
                              <SelectItem value="Paid Holiday">Paid Holiday</SelectItem>
                              <SelectItem value="Comp Off">Comp Off (Compensation Off)</SelectItem>
                              <SelectItem value="Week Off">Week Off</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Show leave balance for Casual Leave */}
                          {(editData.leaveType === "Casual Leave" || selectedDayData.attendance.leaveType === "Casual Leave") && employeeId && (
                            <div className={`mt-2 p-2 border rounded-md ${
                              casualLeaveInfo.available <= 0 
                                ? "bg-red-50 border-red-200" 
                                : casualLeaveInfo.available < 1 
                                  ? "bg-yellow-50 border-yellow-200" 
                                  : "bg-green-50 border-green-200"
                            }`}>
                              <div className="text-xs space-y-1">
                                <div className="font-medium">
                                  Casual Leave Balance: <span className={casualLeaveInfo.available <= 0 ? "text-red-700 font-bold" : " font-bold"}>{casualLeaveInfo.available.toFixed(1)}</span> / {casualLeaveInfo.total} days
                                </div>
                                <div className="text-muted-foreground">
                                  Used: {casualLeaveInfo.used.toFixed(1)} days (from attendance records)
                                </div>
                                {casualLeaveInfo.available <= 0 && (
                                  <div className="text-red-700 font-medium">
                                    ⚠️ Leave balance exhausted. Cannot mark as Casual Leave.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{selectedDayData.attendance.leaveType || "Not specified"}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Paid Holiday Note */}
                  {((isEditing && (editData.leaveType === "Paid Holiday" || selectedDayData.attendance.leaveType === "Paid Holiday")) || 
                     (!isEditing && selectedDayData.attendance.leaveType === "Paid Holiday")) && (
                    <div>
                      <Label>Reason/Note for Paid Holiday *</Label>
                      {isEditing && isAdmin ? (
                        <Textarea
                          value={paidHolidayNote || selectedDayData.attendance.remarks || ""}
                          onChange={(e) => {
                            setPaidHolidayNote(e.target.value);
                            setEditData({ ...editData, remarks: e.target.value, notes: e.target.value });
                          }}
                          placeholder="Enter reason for paid holiday..."
                          className="mt-1"
                          rows={3}
                        />
                      ) : (
                        <div className="mt-1 p-2 bg-muted rounded-md">
                          <span>{selectedDayData.attendance.remarks || selectedDayData.attendance.notes || "No reason provided"}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compensation Type for Leave */}
                  {((isEditing && editData.status === "On Leave") || (!isEditing && selectedDayData.attendance.status === "On Leave")) && (
                    <div>
                      <Label>Compensation Type</Label>
                      {isEditing && isAdmin ? (
                        <>
                          <Select
                            value={compensationType || editData.compensationType || (editData.isPaidLeave === false ? 'unpaid' : 'paid')}
                            onValueChange={(value: 'paid' | 'unpaid' | 'weekOff' | 'compOff') => {
                              setCompensationType(value);
                              const newData = { ...editData, compensationType: value };
                              if (value !== 'weekOff' && value !== 'compOff') {
                                setAlternateWorkDate(null);
                                newData.alternateWorkDate = null;
                              }
                              setEditData(newData);
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid (Full Salary)</SelectItem>
                              <SelectItem value="unpaid">Unpaid (No Salary)</SelectItem>
                              <SelectItem value="weekOff">Week Off (Alternate Date)</SelectItem>
                              <SelectItem value="compOff">Comp Off (Compensation Off - Alternate Date)</SelectItem>
                            </SelectContent>
                          </Select>
                          {((compensationType === 'weekOff' || editData.compensationType === 'weekOff') || 
                            (compensationType === 'compOff' || editData.compensationType === 'compOff')) && (
                            <div className="mt-2">
                              <Label className="text-sm">Alternate Work Date</Label>
                              <Input
                                type="date"
                                value={alternateWorkDate ? format(alternateWorkDate, "yyyy-MM-dd") : (editData.alternateWorkDate ? format(new Date(editData.alternateWorkDate), "yyyy-MM-dd") : "")}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const date = new Date(e.target.value);
                                    setAlternateWorkDate(date);
                                    setEditData({ ...editData, alternateWorkDate: date.toISOString() });
                                  } else {
                                    setAlternateWorkDate(null);
                                    setEditData({ ...editData, alternateWorkDate: null });
                                  }
                                }}
                                min={format(new Date(), "yyyy-MM-dd")}
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Employee will work on this date instead
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="capitalize">{selectedDayData.attendance.compensationType || 'paid'}</span>
                          {selectedDayData.attendance.alternateWorkDate && (
                            <span className="text-xs text-muted-foreground">
                              (Alternate: {format(new Date(selectedDayData.attendance.alternateWorkDate), "MMM d, yyyy")})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fine Information - Always show if attendance exists */}
                  {selectedDayData.attendance && (
                    <Card className={selectedDayData.attendance.fineAmount === 0 ? "bg-green-50 border-green-200" : (selectedDayData.attendance.fineAmount && selectedDayData.attendance.fineAmount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className={`w-5 h-5 ${selectedDayData.attendance.fineAmount === 0 ? " " : (selectedDayData.attendance.fineAmount && selectedDayData.attendance.fineAmount > 0 ? "  " : "text-gray-600")}`} />
                          <Label className="text-base font-semibold">Fine Information</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {selectedDayData.attendance.fineHours !== undefined && selectedDayData.attendance.fineHours !== null && (
                            <div>
                              <span className="text-muted-foreground">Fine Hours:</span>
                              <span className="ml-2 font-medium">
                                {selectedDayData.attendance.fineHours > 0 
                                  ? formatWorkHours(selectedDayData.attendance.fineHours)
                                  : "0h"}
                              </span>
                            </div>
                          )}
                          {/* Show Late Login section if punch in exists or late minutes exist */}
                          {(selectedDayData.attendance.punchIn || (selectedDayData.attendance.lateMinutes !== undefined && selectedDayData.attendance.lateMinutes !== null)) && (
                            <div className="col-span-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Late Login:</span>
                                  <span className="font-medium">
                                    {/* Show fine amount if custom is set, otherwise show time */}
                                    {lateFineAdjustment === "custom" && customLateFineAmount > 0 ? (
                                      <span className="text-red-600 dark:text-red-400">
                                        {formatINR(customLateFineAmount)}
                                      </span>
                                    ) : lateFineAdjustment === "1x" || lateFineAdjustment === "2x" || lateFineAdjustment === "3x" ? (
                                      <span className="text-orange-600 dark:text-orange-400">
                                        {selectedDayData.attendance.lateMinutes > 0 
                                          ? formatLateHours(selectedDayData.attendance.lateMinutes)
                                          : "0h 0m"} ({lateFineAdjustment})
                                      </span>
                                    ) : (
                                      selectedDayData.attendance.lateMinutes > 0 
                                        ? formatLateHours(selectedDayData.attendance.lateMinutes)
                                        : "0h 0m (On time)"
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={lateFineAdjustment}
                                    onValueChange={(value) => {
                                      setLateFineAdjustment(value);
                                      if (value === "custom") {
                                        setCustomLateFineAmount(selectedDayData.attendance.fineAmount || 0);
                                      }
                                      if (!isEditing && isAdmin) {
                                        setIsEditing(true);
                                      }
                                    }}
                                    disabled={!isAdmin}
                                  >
                                    <SelectTrigger className="h-8 w-[150px] text-xs">
                                      <SelectValue placeholder="Fine Option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto">Auto Calculate</SelectItem>
                                      <SelectItem value="0">Remove Fine</SelectItem>
                                      <SelectItem value="1x">1x Rate</SelectItem>
                                      <SelectItem value="2x">2x Rate</SelectItem>
                                      <SelectItem value="3x">3x Rate</SelectItem>
                                      <SelectItem value="custom">Custom Amount</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {lateFineAdjustment === "custom" && (
                                    <Input
                                      type="number"
                                      placeholder="Amount"
                                      value={customLateFineAmount}
                                      onChange={(e) => setCustomLateFineAmount(Number(e.target.value))}
                                      className="h-8 w-[100px] text-xs"
                                      min="0"
                                      step="0.01"
                                      disabled={!isAdmin}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Show Early Exit section if punch out exists or early minutes exist */}
                          {(selectedDayData.attendance.punchOut || (selectedDayData.attendance.earlyMinutes !== undefined && selectedDayData.attendance.earlyMinutes !== null)) && (
                            <div className="col-span-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Early Exit:</span>
                                  <span className="font-medium">
                                    {/* Show fine amount if custom is set, otherwise show time */}
                                    {earlyFineAdjustment === "custom" && customEarlyFineAmount > 0 ? (
                                      <span className="text-red-600 dark:text-red-400">
                                        {formatINR(customEarlyFineAmount)}
                                      </span>
                                    ) : earlyFineAdjustment === "1x" || earlyFineAdjustment === "2x" || earlyFineAdjustment === "3x" ? (
                                      <span className="text-orange-600 dark:text-orange-400">
                                        {selectedDayData.attendance.earlyMinutes > 0 
                                          ? formatLateHours(selectedDayData.attendance.earlyMinutes)
                                          : "0h 0m"} ({earlyFineAdjustment})
                                      </span>
                                    ) : (
                                      selectedDayData.attendance.earlyMinutes > 0 
                                        ? formatLateHours(selectedDayData.attendance.earlyMinutes)
                                        : "0h 0m (On time)"
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={earlyFineAdjustment}
                                    onValueChange={(value) => {
                                      setEarlyFineAdjustment(value);
                                      if (value === "custom") {
                                        setCustomEarlyFineAmount(selectedDayData.attendance.fineAmount || 0);
                                      }
                                      if (!isEditing && isAdmin) {
                                        setIsEditing(true);
                                      }
                                    }}
                                    disabled={!isAdmin}
                                  >
                                    <SelectTrigger className="h-8 w-[150px] text-xs">
                                      <SelectValue placeholder="Fine Option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto">Auto Calculate</SelectItem>
                                      <SelectItem value="0">Remove Fine</SelectItem>
                                      <SelectItem value="1x">1x Rate</SelectItem>
                                      <SelectItem value="2x">2x Rate</SelectItem>
                                      <SelectItem value="3x">3x Rate</SelectItem>
                                      <SelectItem value="custom">Custom Amount</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {earlyFineAdjustment === "custom" && (
                                    <Input
                                      type="number"
                                      placeholder="Amount"
                                      value={customEarlyFineAmount}
                                      onChange={(e) => setCustomEarlyFineAmount(Number(e.target.value))}
                                      className="h-8 w-[100px] text-xs"
                                      min="0"
                                      step="0.01"
                                      disabled={!isAdmin}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Fine Amount:</span>
                              <span className={`ml-2 font-semibold text-lg ${
                                displayFineAmount > 0
                                  ? "  " 
                                  : " "
                              }`}>
                                {/* Show calculated or stored fine amount */}
                                {formatINR(displayFineAmount)}
                                {displayFineAmount === 0 && (
                                  <span className="ml-2 text-xs font-normal ">(No fine applied)</span>
                                )}
                                {/* Show indicator if multipliers are set (backend will calculate) */}
                                {((lateFineAdjustment === "1x" || lateFineAdjustment === "2x" || lateFineAdjustment === "3x") ||
                                  (earlyFineAdjustment === "1x" || earlyFineAdjustment === "2x" || earlyFineAdjustment === "3x")) && (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    (Multiplier applied - backend will calculate)
                                  </span>
                                )}
                              </span>
                            </div>
                        </div>

                        {/* Fine Adjustment (Admin Only) */}
                        {isEditing && isAdmin && (
                          <div className="mt-4 pt-4 border-t border-red-200 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-medium">Fine Adjustment</Label>
                              {(editData.punchIn || editData.punchOut) && 
                               lateFineAdjustment === "auto" && earlyFineAdjustment === "auto" && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  Fines will be recalculated from punch times
                                </span>
                              )}
                            </div>
                            
                            {/* Late Login Fine Adjustment - Show if punch in exists or late minutes exist */}
                            {(selectedDayData.attendance.punchIn || (selectedDayData.attendance.lateMinutes !== undefined && selectedDayData.attendance.lateMinutes !== null)) && (
                              <div>
                                <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                  Late Login Fine
                                  {selectedDayData.attendance.lateMinutes > 0 && (
                                    <span> ({Math.floor(selectedDayData.attendance.lateMinutes / 60)}h {selectedDayData.attendance.lateMinutes % 60}m)</span>
                                  )}
                                  {selectedDayData.attendance.lateMinutes === 0 && selectedDayData.attendance.punchIn && (
                                    <span className="text-muted-foreground"> (On time - can add fine manually)</span>
                                  )}
                                </Label>
                                <Select
                                  value={lateFineAdjustment}
                                  onValueChange={(value) => {
                                    setLateFineAdjustment(value);
                                    if (value === "custom") {
                                      setCustomLateFineAmount(selectedDayData.attendance.fineAmount || 0);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto Calculate (Based on Late Time)</SelectItem>
                                    <SelectItem value="0">Remove Late Fine (Waive Permission)</SelectItem>
                                    <SelectItem value="1x">1x Fine (Standard Rate)</SelectItem>
                                    <SelectItem value="2x">2x Fine (Double Rate)</SelectItem>
                                    <SelectItem value="3x">3x Fine (Triple Rate)</SelectItem>
                                    <SelectItem value="custom">Custom Amount</SelectItem>
                                  </SelectContent>
                                </Select>
                                {lateFineAdjustment === "custom" && (
                                  <Input
                                    type="number"
                                    placeholder="Enter custom fine amount"
                                    value={customLateFineAmount}
                                    onChange={(e) => {
                                      const value = Number(e.target.value);
                                      setCustomLateFineAmount(value);
                                    }}
                                    className="mt-2"
                                  />
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {lateFineAdjustment === "auto" && "Late fine will be calculated automatically"}
                                  {lateFineAdjustment === "0" && "Late fine will be removed (employee has permission for late login)"}
                                  {lateFineAdjustment === "1x" && "Standard fine rate will be applied"}
                                  {lateFineAdjustment === "2x" && "Double fine rate will be applied"}
                                  {lateFineAdjustment === "3x" && "Triple fine rate will be applied"}
                                  {lateFineAdjustment === "custom" && "Enter a custom fine amount"}
                                </p>
                              </div>
                            )}
                            
                            {/* Early Exit Fine Adjustment - Show if punch out exists or early minutes exist */}
                            {(selectedDayData.attendance.punchOut || (selectedDayData.attendance.earlyMinutes !== undefined && selectedDayData.attendance.earlyMinutes !== null)) && (
                              <div>
                                <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                  Early Exit Fine
                                  {selectedDayData.attendance.earlyMinutes > 0 && (
                                    <span> ({Math.floor(selectedDayData.attendance.earlyMinutes / 60)}h {selectedDayData.attendance.earlyMinutes % 60}m)</span>
                                  )}
                                  {selectedDayData.attendance.earlyMinutes === 0 && selectedDayData.attendance.punchOut && (
                                    <span className="text-muted-foreground"> (On time - can add fine manually)</span>
                                  )}
                                </Label>
                                <Select
                                  value={earlyFineAdjustment}
                                  onValueChange={(value) => {
                                    setEarlyFineAdjustment(value);
                                    if (value === "custom") {
                                      setCustomEarlyFineAmount(selectedDayData.attendance.fineAmount || 0);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto Calculate (Based on Early Exit Time)</SelectItem>
                                    <SelectItem value="0">Remove Early Exit Fine (Waive Permission)</SelectItem>
                                    <SelectItem value="1x">1x Fine (Standard Rate)</SelectItem>
                                    <SelectItem value="2x">2x Fine (Double Rate)</SelectItem>
                                    <SelectItem value="3x">3x Fine (Triple Rate)</SelectItem>
                                    <SelectItem value="custom">Custom Amount</SelectItem>
                                  </SelectContent>
                                </Select>
                                {earlyFineAdjustment === "custom" && (
                                  <Input
                                    type="number"
                                    placeholder="Enter custom fine amount"
                                    value={customEarlyFineAmount}
                                    onChange={(e) => {
                                      const value = Number(e.target.value);
                                      setCustomEarlyFineAmount(value);
                                    }}
                                    className="mt-2"
                                  />
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {earlyFineAdjustment === "auto" && "Early exit fine will be calculated automatically"}
                                  {earlyFineAdjustment === "0" && "Early exit fine will be removed (employee has permission for early exit)"}
                                  {earlyFineAdjustment === "1x" && "Standard fine rate will be applied"}
                                  {earlyFineAdjustment === "2x" && "Double fine rate will be applied"}
                                  {earlyFineAdjustment === "3x" && "Triple fine rate will be applied"}
                                  {earlyFineAdjustment === "custom" && "Enter a custom fine amount"}
                                </p>
                              </div>
                            )}
                            
                            {/* Overall Fine Adjustment - Only show when individual adjustments are auto and admin manually set times */}
                            {isManuallySetAttendance && lateFineAdjustment === "auto" && earlyFineAdjustment === "auto" && (
                              <div>
                                <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                  Overall Fine Adjustment
                                  <span className="text-muted-foreground text-xs ml-1">(Available since you set times manually)</span>
                                </Label>
                                <Select
                                  value={fineAdjustment}
                                  onValueChange={(value) => {
                                    setFineAdjustment(value);
                                    if (value === "custom") {
                                      setCustomFineAmount(selectedDayData.attendance.fineAmount || 0);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto Calculate (Based on Time)</SelectItem>
                                    <SelectItem value="0">Remove Fine (₹0)</SelectItem>
                                    <SelectItem value="custom">Custom Amount</SelectItem>
                                  </SelectContent>
                                </Select>
                                {fineAdjustment === "custom" && (
                                  <Input
                                    type="number"
                                    placeholder="Enter custom fine amount"
                                    value={customFineAmount}
                                    onChange={(e) => setCustomFineAmount(parseFloat(e.target.value) || 0)}
                                    className="mt-2"
                                    min="0"
                                    step="0.01"
                                  />
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {fineAdjustment === "auto" && "Fine will be calculated automatically based on late/early minutes"}
                                  {fineAdjustment === "0" && "Fine will be set to ₹0"}
                                  {fineAdjustment === "custom" && "Enter a custom fine amount"}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
        </CardContent>
      </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Punch In</Label>
                      {isEditing && isAdmin ? (
                  <Input
                          type="time"
                          value={editData.punchIn ? format(new Date(editData.punchIn), "HH:mm") : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(selectedDate!);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              setEditData({ ...editData, punchIn: newDate.toISOString() });
                            }
                          }}
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(selectedDayData.attendance.punchIn)}</span>
                </div>
              )}
            </div>

                    <div>
                      <Label>Punch Out</Label>
                      {isEditing && isAdmin ? (
                        <Input
                          type="time"
                          value={editData.punchOut ? format(new Date(editData.punchOut), "HH:mm") : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const newDate = new Date(selectedDate!);
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              setEditData({ ...editData, punchOut: newDate.toISOString() });
                            }
                          }}
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(selectedDayData.attendance.punchOut)}</span>
                            </div>
                              )}
                              </div>
                  </div>

                  {selectedDayData.attendance.workHours && (
                    <div>
                      <Label>Work Hours</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>{formatWorkHours(selectedDayData.attendance.workHours)}</span>
                      </div>
                                </div>
                              )}

                  {/* Selfies */}
                  {(selectedDayData.attendance.punchInSelfie || selectedDayData.attendance.punchOutSelfie) && (
                    <div>
                      <Label>Selfies</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {selectedDayData.attendance.punchInSelfie && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Punch In Selfie</div>
                            <img
                              src={selectedDayData.attendance.punchInSelfie}
                              alt="Punch In Selfie"
                              className="w-full h-32 object-cover rounded-lg border"
                              onClick={() => window.open(selectedDayData.attendance.punchInSelfie, "_blank")}
                              style={{ cursor: "pointer" }}
                            />
                            </div>
                        )}
                        {selectedDayData.attendance.punchOutSelfie && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Punch Out Selfie</div>
                            <img
                              src={selectedDayData.attendance.punchOutSelfie}
                              alt="Punch Out Selfie"
                              className="w-full h-32 object-cover rounded-lg border"
                              onClick={() => window.open(selectedDayData.attendance.punchOutSelfie, "_blank")}
                              style={{ cursor: "pointer" }}
                            />
                              </div>
                              )}
                            </div>
                                </div>
                              )}

                  {/* Location */}
                  {selectedDayData.attendance.location?.address && (
                    <div>
                      <Label>Location</Label>
                      <div className="mt-1 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1" />
                        <div>
                          <div className="text-sm">{selectedDayData.attendance.location.address}</div>
                          {selectedDayData.attendance.location.latitude && (
                            <div className="text-xs text-muted-foreground">
                              {selectedDayData.attendance.location.latitude.toFixed(4)},{" "}
                              {selectedDayData.attendance.location.longitude.toFixed(4)}
                            </div>
                                  )}
                                </div>
                              </div>
                    </div>
                  )}


                  {/* Notes */}
                  <div>
                    <Label>Notes</Label>
                    {isEditing && isAdmin ? (
                      <Textarea
                        value={editData.notes || editData.remarks || ""}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value, remarks: e.target.value })}
                        className="mt-1"
                        rows={3}
                        placeholder="Add notes or remarks about this attendance..."
                      />
                    ) : (
                      <div className="mt-1 text-sm">
                        {selectedDayData.attendance.notes || selectedDayData.attendance.remarks || "No notes"}
                      </div>
                    )}
                  </div>

                  {/* Activity Log */}
                  {(selectedDayData.attendance.createdBy || selectedDayData.attendance.updatedBy || selectedDayData.attendance.createdAt || selectedDayData.attendance.updatedAt) && (
                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <History className="w-5 h-5 text-gray-600" />
                          <Label className="text-base font-semibold">Activity Log</Label>
                        </div>
                        <div className="space-y-2 text-sm">
                          {selectedDayData.attendance.createdBy && (
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Created by:</span>
                              <span className="font-medium">{selectedDayData.attendance.createdBy.name}</span>
                              {selectedDayData.attendance.createdAt && (
                                <span className="text-muted-foreground">
                                  on {format(new Date(selectedDayData.attendance.createdAt), "MMM d, yyyy h:mm a")}
                                </span>
                              )}
                            </div>
                          )}
                          {selectedDayData.attendance.updatedBy && (
                            <div className="flex items-center gap-2">
                              <Edit className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Last updated by:</span>
                              <span className="font-medium">{selectedDayData.attendance.updatedBy.name}</span>
                              {selectedDayData.attendance.updatedAt && (
                                <span className="text-muted-foreground">
                                  on {format(new Date(selectedDayData.attendance.updatedAt), "MMM d, yyyy h:mm a")}
                                  </span>
                              )}
                            </div>
                          )}
                          {!selectedDayData.attendance.createdBy && !selectedDayData.attendance.updatedBy && (
                            <div className="text-muted-foreground">
                              {selectedDayData.attendance.createdAt && (
                                <span>Created: {format(new Date(selectedDayData.attendance.createdAt), "MMM d, yyyy h:mm a")}</span>
                              )}
                              {selectedDayData.attendance.updatedAt && selectedDayData.attendance.updatedAt !== selectedDayData.attendance.createdAt && (
                                <span className="ml-4">
                                  Updated: {format(new Date(selectedDayData.attendance.updatedAt), "MMM d, yyyy h:mm a")}
                                    </span>
                                  )}
                                </div>
                          )}
                              </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Edit Actions */}
                  {isEditing && isAdmin && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button onClick={handleSave} disabled={isUpdating || isMarking}>
                        {isUpdating || isMarking ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditData(selectedDayData.attendance || {});
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                              </div>
                            ) : (
              <div className="space-y-4">
                {/* Show message only if not in edit mode */}
                {!isEditing && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-base font-medium mb-2">No attendance marked for this day</p>
                    {isAdmin && selectedDayData.isWorkingDay && (
                      <Button
                        variant="default"
                        className="mt-4"
                        onClick={handleEdit}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Mark Attendance
                      </Button>
                    )}
                    {(!isAdmin || !selectedDayData.isWorkingDay) && (
                      <p className="text-sm">
                        {selectedDayData.isHoliday 
                          ? "This is a holiday - attendance marking not required"
                          : selectedDayData.isWeekOff
                          ? "This is a week off - attendance marking not required"
                          : "Attendance has not been marked for this day"}
                      </p>
                    )}
                  </div>
                )}

                {/* Edit Form for Marking New Attendance */}
                {isEditing && isAdmin && selectedDayData.isWorkingDay && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="text-sm font-medium mb-4">Mark Attendance for {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</div>
                      
                      <div>
                        <Label>Status *</Label>
                        <Select
                          value={editData.status === "On Leave" && compensationType === 'weekOff' ? "Week Off" : (editData.status || "Present")}
                          onValueChange={(value) => {
                            // If "Week Off" is selected, set up for week off with alternate date
                            if (value === "Week Off") {
                              setEditData({
                                ...editData,
                                status: "On Leave", // Store as "On Leave" with weekOff compensation
                                leaveType: "Unpaid Leave", // Default leave type for week off
                              });
                              setCompensationType('weekOff');
                              setAlternateWorkDate(null);
                              // Don't open leave modal, just show the alternate date field
                              return;
                            }
                            
                            // If "On Leave" is selected, open the leave modal instead
                            if (value === "On Leave") {
                              // Initialize with existing leave data if available
                              if (editData.leaveType) {
                                setSelectedLeaveType(editData.leaveType);
                                if (editData.leaveType === "Casual Leave") {
                                  setSelectedPaidLeave(editData.isPaidLeave !== false);
                                } else if (editData.leaveType === "Paid Holiday") {
                                  setSelectedPaidLeave(true);
                                  setPaidHolidayNote(editData.remarks || editData.notes || "");
                                } else if (editData.leaveType === "Comp Off") {
                                  setSelectedPaidLeave(true);
                                  setCompensationType('compOff');
                                } else if (editData.leaveType === "Week Off") {
                                  setSelectedPaidLeave(true);
                                  setCompensationType('weekOff');
                                } else {
                                  setSelectedPaidLeave(true);
                                }
                                // Initialize compensationType from existing data
                                setCompensationType(editData.compensationType || 'paid');
                                setAlternateWorkDate(editData.alternateWorkDate ? new Date(editData.alternateWorkDate) : null);
                              } else {
                                // Default to Casual Leave if available, otherwise Paid Holiday
                                if (casualLeaveInfo.available > 0) {
                                  setSelectedLeaveType("Casual Leave");
                                  setSelectedPaidLeave(true);
                                } else {
                                  // No casual leaves available - default to Paid Holiday
                                  setSelectedLeaveType("Paid Holiday");
                                  setSelectedPaidLeave(true);
                                }
                                // Initialize compensationType to default
                                setCompensationType('paid');
                                setAlternateWorkDate(null);
                                setPaidHolidayNote("");
                              }
                              setIsLeaveModalOpen(true);
                              // Don't change the status in editData, keep it as is
                              return;
                            }
                            
                            const newData = { ...editData, status: value };
                            // Clear half day session if not half day
                            if (value !== "Half Day") {
                              delete newData.halfDaySession;
                            }
                            setEditData(newData);
                          }}
                        >
                          <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Week Off">Week Off</SelectItem>
                </SelectContent>
              </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selecting "On Leave" will open the leave selection modal. "Week Off" requires an alternate work date.
                        </p>
            </div>

                      {/* Half Day Session Selection */}
                      {editData.status === "Half Day" && (
                        <div>
                          <Label>Half Day Session *</Label>
                          <Select
                            value={editData.halfDaySession || ""}
                            onValueChange={(value) => setEditData({ ...editData, halfDaySession: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select session" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="First Half Day">First Half Day</SelectItem>
                              <SelectItem value="Second Half Day">Second Half Day</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Select whether this is the first half or second half of the day
                          </p>
          </div>
                      )}

                      {/* Week Off - Alternate Work Date Selection */}
                      {(editData.status === "Week Off" || (editData.status === "On Leave" && compensationType === 'weekOff')) && (
                        <div className="space-y-2">
                          <Label>Alternate Work Date *</Label>
                          <Input
                            type="date"
                            value={alternateWorkDate ? format(alternateWorkDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                const date = new Date(e.target.value);
                                setAlternateWorkDate(date);
                              } else {
                                setAlternateWorkDate(null);
                              }
                            }}
                            className="mt-1"
                            min={format(new Date(), "yyyy-MM-dd")} // Can't select past dates
                          />
                          <p className="text-xs text-muted-foreground">
                            Select the date when the employee will work instead of this week off day
                          </p>
          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Punch In Time</Label>
                          <Input
                            type="time"
                            value={editData.punchIn ? format(new Date(editData.punchIn), "HH:mm") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                const [hours, minutes] = e.target.value.split(":");
                                const newDate = new Date(selectedDate!);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                setEditData({ ...editData, punchIn: newDate.toISOString() });
                              } else {
                                setEditData({ ...editData, punchIn: "" });
                              }
                            }}
                            className="mt-1"
                            placeholder="HH:mm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Optional - Leave empty if not applicable</p>
                        </div>

                        <div>
                          <Label>Punch Out Time</Label>
                          <Input
                            type="time"
                            value={editData.punchOut ? format(new Date(editData.punchOut), "HH:mm") : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                const [hours, minutes] = e.target.value.split(":");
                                const newDate = new Date(selectedDate!);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                setEditData({ ...editData, punchOut: newDate.toISOString() });
                              } else {
                                setEditData({ ...editData, punchOut: "" });
                              }
                            }}
                            className="mt-1"
                            placeholder="HH:mm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Optional - Leave empty if not applicable</p>
                        </div>
                      </div>

                      {/* Fine Adjustment Section */}
                      <div>
                        <Card className="bg-yellow-50 border-yellow-200">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <DollarSign className="w-5 h-5 text-yellow-600" />
                              <Label className="text-base font-semibold">Fine Adjustment</Label>
                            </div>
                            <Select
                              value={fineAdjustment}
                              onValueChange={(value) => {
                                setFineAdjustment(value);
                                if (value === "custom") {
                                  setCustomFineAmount(0);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto Calculate (Based on Time)</SelectItem>
                                <SelectItem value="0">Remove Fine (₹0)</SelectItem>
                                <SelectItem value="1x">1x Daily Salary</SelectItem>
                                <SelectItem value="2x">2x Daily Salary</SelectItem>
                                <SelectItem value="3x">3x Daily Salary</SelectItem>
                                <SelectItem value="custom">Custom Amount</SelectItem>
                              </SelectContent>
                            </Select>
                            {fineAdjustment === "custom" && (
                              <div className="mt-2">
                                <Input
                                  type="number"
                                  placeholder="Enter custom fine amount (₹)"
                                  value={customFineAmount}
                                  onChange={(e) => setCustomFineAmount(parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                  />
                </div>
              )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {fineAdjustment === "auto" && "Fine will be calculated automatically based on punch in/out times"}
                              {fineAdjustment === "0" && "Fine will be set to ₹0 (no fine applied)"}
                              {fineAdjustment === "1x" && "Fine will be set to 1x daily salary"}
                              {fineAdjustment === "2x" && "Fine will be set to 2x daily salary"}
                              {fineAdjustment === "3x" && "Fine will be set to 3x daily salary"}
                              {fineAdjustment === "custom" && "Enter a custom fine amount in rupees"}
                            </p>
        </CardContent>
      </Card>
                      </div>

                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={editData.notes || editData.remarks || ""}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value, remarks: e.target.value })}
                          className="mt-1"
                          rows={3}
                          placeholder="Add any notes or remarks about this attendance..."
                        />
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button onClick={handleSave} disabled={isUpdating || isMarking} className="flex-1">
                          {isUpdating || isMarking ? "Saving..." : "Save Attendance"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setEditData({});
                            setFineAdjustment("auto");
                            setCustomFineAmount(0);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
                {selectedDayData.attendance ? (
            <div className="space-y-4">
                    {/* Timeline View */}
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                      
                      <div className="space-y-6">
                        {/* Display logs from database if available */}
                        {selectedDayData.attendance.logs && selectedDayData.attendance.logs.length > 0 ? (
                          [...selectedDayData.attendance.logs]
                            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((log: any, index: number) => {
                              const getActionIcon = () => {
                                switch (log.action) {
                                  case 'PUNCH_IN':
                                    return <Clock className="w-4 h-4 text-white" />;
                                  case 'PUNCH_OUT':
                                    return <Clock className="w-4 h-4 text-white" />;
                                  case 'CREATED':
                                    return <UserCheck className="w-4 h-4 text-white" />;
                                  case 'UPDATED':
                                  case 'STATUS_CHANGED':
                                    return <Edit className="w-4 h-4 text-white" />;
                                  case 'APPROVED':
                                    return <History className="w-4 h-4 text-white" />;
                                  case 'REJECTED':
                                    return <X className="w-4 h-4 text-white" />;
                                  case 'FINE_CALCULATED':
                                  case 'FINE_ADJUSTED':
                                    return <DollarSign className="w-4 h-4 text-white" />;
                                  case 'LEAVE_MARKED':
                                    return <Calendar className="w-4 h-4 text-white" />;
                                  case 'NOTES_ADDED':
                                    return <FileText className="w-4 h-4 text-white" />;
                                  default:
                                    return <Activity className="w-4 h-4 text-white" />;
                                }
                              };

                              const getActionColor = () => {
                                switch (log.action) {
                                  case 'PUNCH_IN':
                                  case 'PUNCH_OUT':
                                    return 'bg-blue-500';
                                  case 'CREATED':
                                    return 'bg-blue-500';
                                  case 'UPDATED':
                                  case 'STATUS_CHANGED':
                                    return 'bg-orange-500';
                                  case 'APPROVED':
                                    return 'bg-green-500';
                                  case 'REJECTED':
                                    return 'bg-red-500';
                                  case 'FINE_CALCULATED':
                                  case 'FINE_ADJUSTED':
                                    return 'bg-yellow-500';
                                  case 'LEAVE_MARKED':
                                    return 'bg-purple-500';
                                  case 'NOTES_ADDED':
                                    return 'bg-gray-500';
                                  default:
                                    return 'bg-gray-500';
                                }
                              };

                              const getActionLabel = () => {
                                switch (log.action) {
                                  case 'PUNCH_IN':
                                    return 'Punch In';
                                  case 'PUNCH_OUT':
                                    return 'Punch Out';
                                  case 'CREATED':
                                    return 'Attendance Created';
                                  case 'UPDATED':
                                    return 'Attendance Updated';
                                  case 'STATUS_CHANGED':
                                    return 'Status Changed';
                                  case 'APPROVED':
                                    return 'Attendance Approved';
                                  case 'REJECTED':
                                    return 'Attendance Rejected';
                                  case 'FINE_CALCULATED':
                                    return 'Fine Calculated';
                                  case 'FINE_ADJUSTED':
                                    return 'Fine Adjusted';
                                  case 'LEAVE_MARKED':
                                    return 'Leave Marked';
                                  case 'NOTES_ADDED':
                                    return 'Notes Added';
                                  default:
                                    return log.action;
                                }
                              };

                              return (
                                <div key={log._id || index} className="relative pl-12">
                                  <div className={`absolute left-0 top-1 w-8 h-8 rounded-full ${getActionColor()} border-4 border-background flex items-center justify-center`}>
                                    {getActionIcon()}
            </div>
                                  <div className="bg-card border rounded-lg p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="font-semibold text-base">{getActionLabel()}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}
                                      </div>
                                    </div>
                                    {log.performedBy && (
                                      <div className="text-sm text-muted-foreground mb-3">
                                        Performed by <span className="font-medium text-foreground">
                                          {log.performedBy.name || log.performedByName || 'Unknown'}
                                        </span>
                                        {log.performedBy.email && (
                                          <span className="text-xs"> ({log.performedBy.email})</span>
              )}
            </div>
                                    )}
                                    {log.notes && (
                                      <div className="text-sm text-muted-foreground mb-3">
                                        <span className="font-medium">Note:</span> {log.notes}
            </div>
                                    )}
                                    {log.changes && log.changes.length > 0 && (
                                      <div className="mt-3 pt-3 border-t">
                                        <div className="text-sm font-medium mb-2">Changes:</div>
                                        <div className="space-y-1">
                                          {log.changes.map((change: any, changeIndex: number) => (
                                            <div key={changeIndex} className="text-xs bg-muted p-2 rounded">
                                              <span className="font-medium">{change.field}:</span>{' '}
                                              <span className="text-muted-foreground line-through">{String(change.oldValue || 'N/A')}</span>
                                              {' → '}
                                              <span className="font-medium">{String(change.newValue || 'N/A')}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {log.newValue && typeof log.newValue === 'object' && (
                                      <div className="mt-3 pt-3 border-t">
                                        <div className="text-sm font-medium mb-2">Details:</div>
                                        <div className="space-y-3">
                                          {/* PUNCH_IN specific details */}
                                          {(log.action === 'PUNCH_IN' || log.newValue.punchIn || log.newValue.punchInTime) && (
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                              <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                Punch In Details
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                  <span className="text-muted-foreground">Time:</span>
                                                  <span className="ml-2 font-medium">
                                                    {formatTime(log.newValue.punchIn || log.newValue.punchInTime)}
                                                  </span>
                                                </div>
                                                {/* {log.newValue.punchInIpAddress && (
                                                  <div>
                                                    <span className="text-muted-foreground">IP Address:</span>
                                                    <span className="ml-2 font-medium">{log.newValue.punchInIpAddress}</span>
                                                  </div>
                                                )} */}
                                                {log.newValue.location && (
                                                  <div className="sm:col-span-2">
                                                    <span className="text-muted-foreground">Location:</span>
                                                    <span className="ml-2 font-medium">
                                                      {log.newValue.location.address || 
                                                       `${log.newValue.location.latitude?.toFixed(6)}, ${log.newValue.location.longitude?.toFixed(6)}`}
                                                    </span>
                                                  </div>
                                                )}
                                                {log.newValue.punchInSelfie && (
                                                  <div className="sm:col-span-2">
                                                    <span className="text-muted-foreground">Selfie:</span>
                                                    <div className="mt-1">
                                                      <img 
                                                        src={log.newValue.punchInSelfie} 
                                                        alt="Punch In Selfie" 
                                                        className="w-24 h-24 object-cover rounded border"
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                                {log.newValue.punchInFaceMatch !== undefined && (
                                                  <div>
                                                    <span className="text-muted-foreground">Face Match:</span>
                                                    <span className={`ml-2 font-medium ${
                                                      log.newValue.punchInFaceMatch >= 80 ? ' ' : 
                                                      log.newValue.punchInFaceMatch >= 60 ? 'text-yellow-600' : '  '
                                                    }`}>
                                                      {log.newValue.punchInFaceMatch.toFixed(1)}%
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* PUNCH_OUT specific details */}
                                          {(log.action === 'PUNCH_OUT' || log.newValue.punchOut || log.newValue.punchOutTime) && (
                                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                              <div className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                Punch Out Details
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                  <span className="text-muted-foreground">Time:</span>
                                                  <span className="ml-2 font-medium">
                                                    {formatTime(log.newValue.punchOut || log.newValue.punchOutTime)}
                                                  </span>
                                                </div>
                                                {log.newValue.workHours && (
                                                  <div>
                                                    <span className="text-muted-foreground">Work Hours:</span>
                                                    <span className="ml-2 font-medium">
                                                      {Math.floor(log.newValue.workHours / 60)}h {log.newValue.workHours % 60}m
                                                    </span>
                                                  </div>
                                                )}
                                                {/* {log.newValue.punchOutIpAddress && (
                                                  <div>
                                                    <span className="text-muted-foreground">IP Address:</span>
                                                    <span className="ml-2 font-medium">{log.newValue.punchOutIpAddress}</span>
                                                  </div>
                                                )} */}
                                                {log.newValue.location && (
                                                  <div className="sm:col-span-2">
                                                    <span className="text-muted-foreground">Location:</span>
                                                    <span className="ml-2 font-medium">
                                                      {log.newValue.location.address || 
                                                       `${log.newValue.location.latitude?.toFixed(6)}, ${log.newValue.location.longitude?.toFixed(6)}`}
                                                    </span>
                                                  </div>
                                                )}
                                                {log.newValue.punchOutSelfie && (
                                                  <div className="sm:col-span-2">
                                                    <span className="text-muted-foreground">Selfie:</span>
                                                    <div className="mt-1">
                                                      <img 
                                                        src={log.newValue.punchOutSelfie} 
                                                        alt="Punch Out Selfie" 
                                                        className="w-24 h-24 object-cover rounded border"
                                                      />
                                                    </div>
                                                  </div>
                                                )}
                                                {log.newValue.punchOutFaceMatch !== undefined && (
                                                  <div>
                                                    <span className="text-muted-foreground">Face Match:</span>
                                                    <span className={`ml-2 font-medium ${
                                                      log.newValue.punchOutFaceMatch >= 80 ? ' ' : 
                                                      log.newValue.punchOutFaceMatch >= 60 ? 'text-yellow-600' : '  '
                                                    }`}>
                                                      {log.newValue.punchOutFaceMatch.toFixed(1)}%
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* NOTES_ADDED specific details */}
                                          {log.action === 'NOTES_ADDED' && (
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                              <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <FileText className="w-3 h-3" />
                                                Notes Details
                                              </div>
                                              <div className="space-y-2 text-xs">
                                                {log.oldValue && log.oldValue.remarks && (
                                                  <div>
                                                    <span className="text-muted-foreground">Previous Note:</span>
                                                    <div className="mt-1 p-2 bg-gray-100 rounded border border-gray-300 line-through text-gray-500">
                                                      {log.oldValue.remarks}
                                                    </div>
                                                  </div>
                                                )}
                                                {log.newValue && (log.newValue.remarks || log.newValue.notes) && (
                                                  <div>
                                                    <span className="text-muted-foreground">Current Note:</span>
                                                    <div className="mt-1 p-2 bg-white rounded border border-gray-300 font-medium">
                                                      {log.newValue.remarks || log.newValue.notes}
                                                    </div>
                                                  </div>
                                                )}
                                                {log.notes && (
                                                  <div className="pt-2 border-t">
                                                    <span className="text-muted-foreground">Log Note:</span>
                                                    <div className="mt-1 text-sm text-gray-600">
                                                      {log.notes}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {/* General details for other actions */}
                                          {log.action !== 'PUNCH_IN' && log.action !== 'PUNCH_OUT' && log.action !== 'NOTES_ADDED' && (
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          {log.newValue.punchIn && (
                                            <div>
                                              <span className="text-muted-foreground">Punch In:</span>
                                              <span className="ml-2 font-medium">{formatTime(log.newValue.punchIn)}</span>
                                            </div>
                                          )}
                                          {log.newValue.punchOut && (
                                            <div>
                                              <span className="text-muted-foreground">Punch Out:</span>
                                              <span className="ml-2 font-medium">{formatTime(log.newValue.punchOut)}</span>
                                            </div>
                                          )}
                                          {log.newValue.status && (
                                            <div>
                                              <span className="text-muted-foreground">Status:</span>
                                              <span className="ml-2 font-medium">{log.newValue.status}</span>
                                            </div>
                                          )}
                                          {log.newValue.fineAmount && (
                                            <div>
                                              <span className="text-muted-foreground">Fine Amount:</span>
                                              <span className="ml-2 font-medium   ">₹{log.newValue.fineAmount.toFixed(2)}</span>
                                            </div>
                                          )}
                                              {log.newValue.location && (
                                                <div className="col-span-2">
                                                  <span className="text-muted-foreground">Location:</span>
                                                  <span className="ml-2 font-medium">
                                                    {log.newValue.location.address || 
                                                     `${log.newValue.location.latitude?.toFixed(6)}, ${log.newValue.location.longitude?.toFixed(6)}`}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {/* {log.ipAddress && (
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        IP: {log.ipAddress}
                                      </div>
                                    )} */}
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          // Fallback to static timeline if no logs in database
                          <>
                            {/* Created Event */}
                            {selectedDayData.attendance.createdAt && (
                              <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-500 border-4 border-background flex items-center justify-center">
                                  <UserCheck className="w-4 h-4 text-white" />
                            </div>
                                <div className="bg-card border rounded-lg p-4 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-base">Attendance Created</div>
                                    <div className="text-sm text-muted-foreground">
                                      {format(new Date(selectedDayData.attendance.createdAt), "MMM d, yyyy h:mm a")}
                              </div>
                                </div>
                                  {selectedDayData.attendance.createdBy && (
                                    <div className="text-sm text-muted-foreground mb-3">
                                      Created by <span className="font-medium text-foreground">{selectedDayData.attendance.createdBy.name}</span>
                                      {selectedDayData.attendance.createdBy.email && (
                                        <span className="text-xs"> ({selectedDayData.attendance.createdBy.email})</span>
                              )}
                            </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Status:</span>
                                      <span className="ml-2 font-medium">{selectedDayData.attendance.status}</span>
                              </div>
                                    {selectedDayData.attendance.punchIn && (
                                      <div>
                                        <span className="text-muted-foreground">Punch In:</span>
                                        <span className="ml-2 font-medium">{formatTime(selectedDayData.attendance.punchIn)}</span>
                                </div>
                              )}
                            </div>
                            </div>
                              </div>
                            )}

                            {/* Updated Event */}
                            {selectedDayData.attendance.updatedAt && 
                             selectedDayData.attendance.updatedAt !== selectedDayData.attendance.createdAt && (
                              <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-orange-500 border-4 border-background flex items-center justify-center">
                                  <Edit className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-card border rounded-lg p-4 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-base">Attendance Updated</div>
                                    <div className="text-sm text-muted-foreground">
                                      {format(new Date(selectedDayData.attendance.updatedAt), "MMM d, yyyy h:mm a")}
                              </div>
                                  </div>
                                  {selectedDayData.attendance.updatedBy && (
                                    <div className="text-sm text-muted-foreground mb-3">
                                      Updated by <span className="font-medium text-foreground">{selectedDayData.attendance.updatedBy.name}</span>
                                      {selectedDayData.attendance.updatedBy.email && (
                                        <span className="text-xs"> ({selectedDayData.attendance.updatedBy.email})</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Approved Event */}
                            {selectedDayData.attendance.approvedAt && (
                              <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                                  <History className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-card border rounded-lg p-4 shadow-sm">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold text-base">Attendance Approved</div>
                                    <div className="text-sm text-muted-foreground">
                                      {format(new Date(selectedDayData.attendance.approvedAt), "MMM d, yyyy h:mm a")}
                                    </div>
                                  </div>
                                  {selectedDayData.attendance.approvedBy && (
                                    <div className="text-sm text-muted-foreground">
                                      Approved by <span className="font-medium text-foreground">{selectedDayData.attendance.approvedBy.name}</span>
                                      {selectedDayData.attendance.approvedBy.email && (
                                        <span className="text-xs"> ({selectedDayData.attendance.approvedBy.email})</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                              </div>
                            ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity logs available</p>
                    <p className="text-sm mt-2">Activity logs will appear here once attendance is marked</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Balance Info Modal */}
      <Dialog open={isLeaveBalanceModalOpen} onOpenChange={setIsLeaveBalanceModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Leave Balance Information</DialogTitle>
            <DialogDescription>
              View leave allocation and usage for {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Leave Template Info */}
            {leaveTemplate && (
              <div className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Leave Template:</span> {leaveTemplate.name || 'N/A'}
                {leaveTemplate.description && (
                  <span className="ml-2">({leaveTemplate.description})</span>
                )}
              </div>
            )}
            {!leaveTemplate && (
              <div className="text-xs text-amber-600 mb-2">
                ⚠️ No leave template assigned to this employee
              </div>
            )}

            {/* Leave Balance Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Monthly Allocated */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Monthly Allocated</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {leaveTemplate ? `${casualLeaveInfo.total} days` : '0 days (No template)'}
                    </div>
                  </div>

                  {/* Used Leaves */}
                  <div className="space-y-2 pt-2 border-t border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">Used This Month</div>
                      <div className="text-lg font-semibold ">
                        {casualLeaveInfo.used.toFixed(1)} days
                      </div>
                    </div>
                    
                    {casualLeaveInfo.used > 0 && (
                      <div className="pl-4 space-y-1 text-xs text-gray-500">
                        {casualLeaveInfo.usedFromAttendance > 0 && (
                          <div className="flex justify-between">
                            <span>• From Attendance Records:</span>
                            <span className="font-medium">{casualLeaveInfo.usedFromAttendance.toFixed(1)} days</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* This Month Available */}
                  <div className="pt-2 border-t-2 border-blue-300">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">This Month Available</div>
                      <div className={`text-2xl font-bold ${
                        casualLeaveInfo.available > 0 
                          ? " " 
                          : casualLeaveInfo.available === 0
                          ? "text-yellow-600"
                          : "  "
                      }`}>
                        {casualLeaveInfo.available.toFixed(1)} days
                      </div>
                    </div>
                    
                    {casualLeaveInfo.available <= 0 && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                        ⚠️ All casual leaves have been exhausted for this month
                      </div>
                    )}
                    {casualLeaveInfo.available > 0 && casualLeaveInfo.available < 1 && (
                      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-700">
                        ℹ️ Only half-day casual leave available
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={async () => {
                  // Mark as Absent
                  try {
                    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
                    if (!dateStr || !employeeId) {
                      message.error("Invalid date or employee ID");
                      return;
                    }

                    const dayData = daysAttendance.find((d) => selectedDate && isSameDay(d.date, selectedDate));
                    const attendanceData: any = {
                      status: "Absent",
                      notes: `Marked as Absent by admin`,
                      remarks: `Marked as Absent by admin`,
                    };

                    if (dayData?.attendance?._id) {
                      await updateAttendance({
                        id: dayData.attendance._id,
                        data: attendanceData,
                      }).unwrap();
                      message.success("Marked as Absent");
                    } else {
                      await markAttendance({
                        date: dateStr,
                        employeeId,
                        ...attendanceData,
                      }).unwrap();
                      message.success("Marked as Absent");
                    }
                    
                    setIsLeaveBalanceModalOpen(false);
                    refetchAttendance();
                  } catch (error: any) {
                    message.error(error?.data?.error?.message || "Failed to mark as Absent");
                  }
                }}
                className="flex-1"
              >
                Mark as Absent
              </Button>
              
              <Button
                onClick={() => {
                  // Open leave selection modal
                  setIsLeaveBalanceModalOpen(false);
                  
                  // Initialize with existing leave data if available
                  const dayData = daysAttendance.find((d) => selectedDate && isSameDay(d.date, selectedDate));
                  if (dayData?.attendance?.leaveType) {
                    setSelectedLeaveType(dayData.attendance.leaveType);
                    if (dayData.attendance.leaveType === "Casual Leave") {
                      setSelectedPaidLeave(dayData.attendance.isPaidLeave !== false);
                      setCompensationType(dayData.attendance.compensationType || (dayData.attendance.isPaidLeave ? 'paid' : 'unpaid'));
                    } else if (dayData.attendance.leaveType === "Unpaid Leave") {
                      setSelectedPaidLeave(false);
                      setCompensationType('unpaid');
                    } else {
                      setSelectedPaidLeave(true);
                      setCompensationType(dayData.attendance.compensationType || 'paid');
                    }
                    setAlternateWorkDate(dayData.attendance.alternateWorkDate ? new Date(dayData.attendance.alternateWorkDate) : null);
                  } else {
                    // Default to Casual Leave if available, otherwise default to Unpaid Leave
                    if (casualLeaveInfo.available > 0) {
                      setSelectedLeaveType("Casual Leave");
                      setSelectedPaidLeave(true);
                      setCompensationType('paid'); // Initialize to default
                    } else {
                      // No casual leaves available - default to Unpaid Leave
                      setSelectedLeaveType("Unpaid Leave");
                      setSelectedPaidLeave(false);
                      setCompensationType('unpaid'); // Initialize to unpaid
                    }
                    setAlternateWorkDate(null); // Initialize to null
                  }
                  
                  setIsLeaveModalOpen(true);
                }}
                disabled={casualLeaveInfo.available <= 0}
                className="flex-1"
              >
                {casualLeaveInfo.available > 0 ? "Mark as Leave" : "No Leaves Available"}
              </Button>
                </div>

            {casualLeaveInfo.available <= 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Cannot mark as leave - all casual leaves exhausted. Please mark as Absent instead.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Selection Modal */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mark Leave - {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</DialogTitle>
            <DialogDescription>
              Select the leave type and payment option for this day
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Leave Type Selection */}
            <div>
              <Label>Leave Type *</Label>
              <Select
                value={selectedLeaveType}
                onValueChange={(value) => {
                  // Prevent selecting Casual Leave if exhausted
                  if (value === "Casual Leave" && casualLeaveInfo.available <= 0) {
                    const usedBreakdown = 
                      casualLeaveInfo.usedFromAttendance > 0
                        ? ` (${casualLeaveInfo.usedFromAttendance} from attendance)`
                        : "";
                    message.error(`Casual leaves are exhausted for this month${usedBreakdown}.`);
                    return;
                  }
                  
                  setSelectedLeaveType(value);
                  
                  // Auto-set compensation type based on leave type
                  if (value === "Paid Holiday") {
                    setCompensationType('paid');
                    setPaidHolidayNote(""); // Reset note
                  } else if (value === "Comp Off") {
                    setCompensationType('compOff');
                    setAlternateWorkDate(null); // Reset alternate date
                  } else if (value === "Week Off") {
                    setCompensationType('weekOff');
                    setAlternateWorkDate(null); // Reset alternate date
                  } else if (value === "Casual Leave") {
                    setCompensationType('paid');
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    value="Casual Leave"
                    disabled={casualLeaveInfo.available <= 0}
                    className={casualLeaveInfo.available <= 0 ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    Casual Leave 
                    {casualLeaveInfo.available <= 0 && " - Exhausted"}
                  </SelectItem>
                  <SelectItem value="Paid Holiday">Paid Holiday</SelectItem>
                  <SelectItem value="Comp Off">Comp Off (Compensation Off)</SelectItem>
                  <SelectItem value="Week Off">Week Off</SelectItem>
                </SelectContent>
              </Select>
              {selectedLeaveType === "Casual Leave" && casualLeaveInfo.available <= 0 && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  ⚠️ Casual leaves are exhausted for this month
                  {casualLeaveInfo.usedFromAttendance > 0
                    ? ` (${casualLeaveInfo.usedFromAttendance} from attendance)`
                    : ""}. Please select another leave type.
                </p>
              )}
            </div>

            {/* Casual Leave Information and Paid/Unpaid Selection */}
            {selectedLeaveType === "Casual Leave" && (
              <Card className={`${casualLeaveInfo.available <= 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-blue-900 mb-2">Casual Leave Balance</div>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-blue-700">{casualLeaveInfo.available.toFixed(1)}</span>
                          <span className="text-sm text-blue-600">days available</span>
                        </div>
                        <div className="text-xs text-blue-600">
                          Total: <span className="font-medium">{casualLeaveInfo.total}</span> days ({casualLeaveInfo.total * 2} half-days) | 
                          Used: <span className="font-medium">{casualLeaveInfo.used.toFixed(1)}</span> days ({(casualLeaveInfo.used * 2).toFixed(1)} half-days)
                          {casualLeaveInfo.used > 0 && (
                            <span className="block mt-0.5 text-blue-500">
                              (from attendance records)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {casualLeaveInfo.available <= 0 && (
                      <Badge variant="destructive" className="ml-2 shrink-0">No Leaves Available</Badge>
                    )}
                    {casualLeaveInfo.available > 0 && (
                      <Badge className="bg-green-500 hover:bg-green-600 ml-2 shrink-0">
                        {casualLeaveInfo.available.toFixed(1)} Available
                      </Badge>
                    )}
                  </div>
                  
                  {casualLeaveInfo.available <= 0 ? (
                    <div className="border-t border-red-200 pt-3">
                      <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                        <p className="text-sm text-red-800 font-semibold mb-2">
                          ⚠️ Casual Leaves Exhausted
                        </p>
                        <p className="text-xs text-red-700">
                          All {casualLeaveInfo.total} casual leaves for this month have been used
                          {casualLeaveInfo.usedFromAttendance > 0 && ` (${casualLeaveInfo.usedFromAttendance} from attendance records`}
                          {casualLeaveInfo.usedFromAttendance > 0 ? ")" : ""}. 
                          Please select "Unpaid Leave" instead, which will deduct salary from payroll.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="border-t border-blue-200 pt-3">
                        <Label>Compensation Type *</Label>
                        <Select
                          value={compensationType}
                          onValueChange={(value: 'paid' | 'unpaid' | 'weekOff') => {
                            setCompensationType(value);
                            if (value === 'paid') {
                              setSelectedPaidLeave(true);
                            } else if (value === 'unpaid') {
                              setSelectedPaidLeave(false);
                            } else if (value === 'weekOff') {
                              setSelectedPaidLeave(true); // Week off with alternate date is treated as paid
                              // Clear Casual Leave if week off is selected (week off cannot be casual leave)
                              if (selectedLeaveType === "Casual Leave") {
                                setSelectedLeaveType("");
                              }
                            }
                            if (value !== 'weekOff') {
                              setAlternateWorkDate(null);
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid (Full Salary)</SelectItem>
                            <SelectItem value="unpaid">Unpaid (No Salary)</SelectItem>
                            {/* <SelectItem value="weekOff">Week Off (Alternate Date)</SelectItem> */}
                          </SelectContent>
                        </Select>
                        {compensationType === 'weekOff' && (
                          <div className="mt-2">
                            <Label className="text-sm">Alternate Work Date *</Label>
                            <Input
                              type="date"
                              value={alternateWorkDate ? format(alternateWorkDate, "yyyy-MM-dd") : ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setAlternateWorkDate(new Date(e.target.value));
                                }
                              }}
                              min={format(new Date(), "yyyy-MM-dd")}
                              className="mt-1"
                            />
                            <p className="text-xs text-blue-600 mt-1">
                              Employee will work on this date instead
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-blue-600 mt-2">
                          {compensationType === 'paid' && "✓ This leave will be paid - salary will be included in payroll"}
                          {compensationType === 'unpaid' && "⚠ This leave will be unpaid - salary will be deducted from payroll"}
                          {compensationType === 'weekOff' && "✓ Employee will work on alternate date - salary will be included in payroll"}
                        </p>
                      </div>
                      
                      {/* Half Day Selection */}
                      <div className="border-t border-blue-200 pt-3">
                        <Label>Leave Duration *</Label>
                        <Select
                          value={editData.status === "Half Day" || editData.halfDaySession ? "half" : "full"}
                          onValueChange={(value) => {
                            if (value === "half") {
                              setEditData({ ...editData, status: "Half Day", halfDaySession: editData.halfDaySession || "First Half Day" });
                            } else {
                              setEditData({ ...editData, status: "On Leave", halfDaySession: undefined });
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full Day (1 day)</SelectItem>
                            <SelectItem value="half">Half Day (0.5 days)</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Half Day Session Selection */}
                        {(editData.status === "Half Day" || editData.halfDaySession) && (
                          <div className="mt-2">
                            <Label className="text-sm">Half Day Session *</Label>
                            <Select
                              value={editData.halfDaySession || "First Half Day"}
                              onValueChange={(value) => setEditData({ ...editData, halfDaySession: value })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="First Half Day">First Half Day</SelectItem>
                                <SelectItem value="Second Half Day">Second Half Day</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {/* Show projected balance */}
                        <div className="mt-3 p-2 bg-blue-100 rounded-md">
                          <div className="text-xs text-blue-800">
                            <div className="font-semibold mb-1">
                              {(editData.status === "Half Day" || editData.halfDaySession) ? "Half Day Leave (0.5 days)" : "Full Day Leave (1 day)"}
                            </div>
                            <div>
                              Current Balance: <span className="font-bold">{casualLeaveInfo.available.toFixed(1)}</span> days ({casualLeaveInfo.available * 2} half-days)
                            </div>
                            {(editData.status === "Half Day" || editData.halfDaySession) ? (
                              <div className="mt-1">
                                After this leave: <span className="font-bold">{(casualLeaveInfo.available - 0.5).toFixed(1)}</span> days ({(casualLeaveInfo.available - 0.5) * 2} half-days) remaining
                              </div>
                            ) : (
                              <div className="mt-1">
                                After this leave: <span className="font-bold">{(casualLeaveInfo.available - 1).toFixed(1)}</span> days ({(casualLeaveInfo.available - 1) * 2} half-days) remaining
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
            </>
          )}
        </CardContent>
      </Card>
            )}


            {/* Paid Holiday Note */}
            {selectedLeaveType === "Paid Holiday" && (
              <div>
                <Label>Reason/Note for Paid Holiday *</Label>
                <Textarea
                  value={paidHolidayNote}
                  onChange={(e) => {
                    setPaidHolidayNote(e.target.value);
                    setEditData({ ...editData, notes: e.target.value, remarks: e.target.value });
                  }}
                  placeholder="Enter reason for paid holiday..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}

            {/* Comp Off Alternate Date */}
            {selectedLeaveType === "Comp Off" && (
              <div>
                <Label>Alternate Work Date *</Label>
                <Input
                  type="date"
                  value={alternateWorkDate ? format(alternateWorkDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setAlternateWorkDate(new Date(e.target.value));
                    } else {
                      setAlternateWorkDate(null);
                    }
                  }}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Employee will work on this date as compensation
                </p>
              </div>
            )}

            {/* Week Off Alternate Date */}
            {selectedLeaveType === "Week Off" && (
              <div>
                <Label>Alternate Work Date *</Label>
                <Input
                  type="date"
                  value={alternateWorkDate ? format(alternateWorkDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setAlternateWorkDate(new Date(e.target.value));
                    } else {
                      setAlternateWorkDate(null);
                    }
                  }}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Employee will work on this date instead
                </p>
              </div>
            )}

            {/* Notes (for other leave types) */}
            {selectedLeaveType && selectedLeaveType !== "Paid Holiday" && (
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={editData.notes || editData.remarks || ""}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value, remarks: e.target.value })}
                  className="mt-1"
                  rows={3}
                  placeholder="Add any notes about this leave..."
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={async () => {
                if (!selectedLeaveType) {
                  message.error("Please select a leave type");
                  return;
                }

                // Validate casual leave availability - check balance before marking
                if (selectedLeaveType === "Casual Leave") {
                  // Check if this is a half-day leave (check if status is "Half Day" or if halfDaySession is set)
                  const isHalfDay = editData.status === "Half Day" || editData.halfDaySession;
                  const leaveDays = isHalfDay ? 0.5 : 1;
                  
                  // Check if there's enough balance
                  if (casualLeaveInfo.available < leaveDays) {
                    const usedBreakdown = 
                      casualLeaveInfo.usedFromAttendance > 0
                        ? ` (${casualLeaveInfo.usedFromAttendance} from attendance)`
                        : "";
                    const availableDisplay = casualLeaveInfo.available > 0 ? casualLeaveInfo.available : 0;
                    message.warning(
                      `Insufficient casual leave balance. Available: ${availableDisplay} days, Required: ${leaveDays} days${usedBreakdown}. Marking as Absent instead.`
                    );
                    
                    // Mark as Absent instead
                    try {
                      const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
                      if (!dateStr || !employeeId) {
                        message.error("Invalid date or employee ID");
                        return;
                      }

                      const attendanceData: any = {
                        status: "Absent",
                        notes: `Marked as Absent - Insufficient casual leave balance (Available: ${availableDisplay} days, Required: ${leaveDays} days)`,
                        remarks: `Marked as Absent - Insufficient casual leave balance (Available: ${availableDisplay} days, Required: ${leaveDays} days)`,
                      };

                      const dayData = daysAttendance.find((d) => selectedDate && isSameDay(d.date, selectedDate));
                      
                      if (dayData?.attendance?._id) {
                        await updateAttendance({
                          id: dayData.attendance._id,
                          data: attendanceData,
                        }).unwrap();
                        message.success("Marked as Absent (insufficient casual leave balance)");
                      } else {
                        await markAttendance({
                          date: dateStr,
                          employeeId,
                          ...attendanceData,
                        }).unwrap();
                        message.success("Marked as Absent (insufficient casual leave balance)");
                      }
                      
                      setIsLeaveModalOpen(false);
                      setSelectedLeaveType("");
                      setSelectedPaidLeave(true);
                      refetchAttendance();
                    } catch (error: any) {
                      message.error(error?.data?.error?.message || "Failed to mark as Absent");
                    }
                    return;
                  }
                }

                try {
                  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
                  if (!dateStr || !employeeId) {
                    message.error("Invalid date or employee ID");
                    return;
                  }

                  // Validate Paid Holiday note requirement
                  if (selectedLeaveType === "Paid Holiday" && !paidHolidayNote && !editData.notes && !editData.remarks) {
                    message.error("Please provide a reason/note for Paid Holiday");
                    return;
                  }

                  // Validate Comp Off alternate date requirement
                  if (selectedLeaveType === "Comp Off" && !alternateWorkDate) {
                    message.error("Please select an alternate work date for Comp Off");
                    return;
                  }

                  // Validate Week Off alternate date requirement
                  if (selectedLeaveType === "Week Off" && !alternateWorkDate) {
                    message.error("Please select an alternate work date for Week Off");
                    return;
                  }

                  // Normalize leaveType to match enum values (always use "Casual Leave" not "casual")
                  let normalizedLeaveType = selectedLeaveType;
                  if (selectedLeaveType && (selectedLeaveType.toLowerCase().trim() === 'casual' || selectedLeaveType.toLowerCase().trim() === 'casual leave')) {
                    normalizedLeaveType = "Casual Leave";
                  }

                  const attendanceData: any = {
                    status: "On Leave",
                    leaveType: normalizedLeaveType,
                    compensationType: compensationType || 'paid', // Always include, default to 'paid' if not set
                    notes: selectedLeaveType === "Paid Holiday" 
                      ? (paidHolidayNote || editData.notes || editData.remarks || "")
                      : (editData.notes || editData.remarks || undefined),
                    remarks: selectedLeaveType === "Paid Holiday"
                      ? (paidHolidayNote || editData.notes || editData.remarks || "")
                      : (editData.notes || editData.remarks || undefined),
                  };

                  // Handle compensation type and alternate work date based on leave type
                  if (selectedLeaveType === "Comp Off") {
                    attendanceData.compensationType = 'compOff';
                    if (alternateWorkDate) {
                      attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
                    } else {
                      attendanceData.alternateWorkDate = null;
                    }
                    attendanceData.isPaidLeave = true; // Comp Off with alternate date - treated as paid
                  } else if (selectedLeaveType === "Week Off") {
                    attendanceData.compensationType = 'weekOff';
                    if (alternateWorkDate) {
                      attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
                    } else {
                      attendanceData.alternateWorkDate = null;
                    }
                    attendanceData.isPaidLeave = true; // Week Off with alternate date - treated as paid
                  } else {
                    // For Casual Leave and Paid Holiday, use the selected compensation type
                    attendanceData.compensationType = compensationType || 'paid';
                    attendanceData.alternateWorkDate = null;
                    
                    // Set isPaidLeave based on leave type and compensation type
                    if (selectedLeaveType === "Paid Holiday" || selectedLeaveType === "Casual Leave") {
                      attendanceData.isPaidLeave = true;
                    } else if (compensationType === 'paid') {
                      attendanceData.isPaidLeave = true;
                    } else if (compensationType === 'unpaid') {
                      attendanceData.isPaidLeave = false;
                    }
                  }

                  // Check if attendance already exists
                  const dayData = daysAttendance.find((d) => selectedDate && isSameDay(d.date, selectedDate));
                  
                  if (dayData?.attendance?._id) {
                    // Update existing attendance
                    await updateAttendance({
                      id: dayData.attendance._id,
                      data: attendanceData,
                    }).unwrap();
                    message.success("Leave updated successfully");
                  } else {
                    // Create new attendance
                    await markAttendance({
                      date: dateStr,
                      employeeId,
                      ...attendanceData,
                    }).unwrap();
                    message.success("Leave marked successfully");
                  }

                  // Close modal and reset
                  setIsLeaveModalOpen(false);
                  setSelectedLeaveType("");
                  setSelectedPaidLeave(true);
                  setCompensationType('paid');
                  setAlternateWorkDate(null);
                  setPaidHolidayNote("");
                  setEditData({});
                  
                  // Refetch attendance data
                  await refetchAttendance();
                } catch (error: any) {
                  message.error(error?.data?.error?.message || "Failed to mark leave");
                }
              }}
              disabled={
                !selectedLeaveType || 
                isUpdating || 
                isMarking || 
                (selectedLeaveType === "Paid Holiday" && !paidHolidayNote && !editData.notes && !editData.remarks) ||
                (selectedLeaveType === "Comp Off" && !alternateWorkDate) ||
                (selectedLeaveType === "Week Off" && !alternateWorkDate)
              }
              className="flex-1"
            >
              {isUpdating || isMarking ? "Saving..." : "Mark Leave"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsLeaveModalOpen(false);
                setSelectedLeaveType("");
                setSelectedPaidLeave(true);
                setCompensationType('paid');
                setAlternateWorkDate(null);
                setPaidHolidayNote("");
                setEditData({});
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeAttendance;
