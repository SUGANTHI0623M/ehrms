import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  CalendarCheck,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  X,
  Eye,
  FileText,
  Activity,
  Edit,
  DollarSign,
  TrendingUp,
  Calendar as CalendarIcon2,
  Filter,
  SlidersHorizontal,
  X as XIcon,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetAttendanceQuery,
  useGetAttendanceStatsQuery,
  useApproveAttendanceMutation,
  useUpdateAttendanceMutation,
  useMarkAttendanceMutation,
  useProcessFaceMatchingMutation,
  useGetAttendanceByIdQuery,
  useGetEmployeeAttendanceQuery,
} from "@/store/api/attendanceApi";
import { useGetCasualLeaveBalanceQuery, useGetLeavesQuery } from "@/store/api/leaveApi";
import { useGetLeaveTemplateByIdQuery, useGetBusinessQuery, useGetAttendanceTemplatesQuery } from "@/store/api/settingsApi";
import { useUpdateStaffMutation, useGetStaffByIdQuery } from "@/store/api/staffApi";
import {
  format,
  isToday,
  isSameDay,
  addDays,
  subDays,
  parseISO,
} from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { message } from "antd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClockTimePicker from "@/components/ui/clock-time-picker";
import { formatINR } from "@/utils/currencyUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";

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

// Leave Balance Display Component - Uses same calculation as EmployeeAttendance
const LeaveBalanceDisplay = ({ 
  employeeId, 
  selectedDate, 
  attendanceRecords, 
  excludeAttendanceId,
  currentStatus,
  currentHalfDaySession,
  currentLeaveType
}: { 
  employeeId: string; 
  selectedDate: Date;
  attendanceRecords?: any[];
  excludeAttendanceId?: string;
  currentStatus?: string;
  currentHalfDaySession?: string;
  currentLeaveType?: string;
}) => {
  // Get staff data to get leave template ID
  const { data: staffData } = useGetStaffByIdQuery(employeeId || "", {
    skip: !employeeId,
  });
  
  const staff = staffData?.data?.staff;
  const leaveTemplateId = staff?.leaveTemplateId;
  
  // Check if leaveTemplateId is already populated (full object) or just an ID
  const isPopulatedTemplate = leaveTemplateId && 
    typeof leaveTemplateId === 'object' && 
    (leaveTemplateId as any).name && 
    Array.isArray((leaveTemplateId as any).leaveTypes);
  
  // Extract leaveTemplateId for fetching if not already populated
  const extractedLeaveTemplateId = useMemo(() => {
    if (!leaveTemplateId) return null;
    if (typeof leaveTemplateId === 'string') {
      return leaveTemplateId;
    }
    if (typeof leaveTemplateId === 'object' && leaveTemplateId._id) {
      return leaveTemplateId._id.toString();
    }
    return null;
  }, [leaveTemplateId]);
  
  // Fetch leave template if not already populated
  const { data: leaveTemplateData } = useGetLeaveTemplateByIdQuery(
    extractedLeaveTemplateId || "",
    { skip: !extractedLeaveTemplateId || isPopulatedTemplate }
  );
  
  // Use populated template or fetched template
  const leaveTemplate = isPopulatedTemplate 
    ? (leaveTemplateId as any)
    : leaveTemplateData?.data?.template;
  
  // Get all approved leave requests for this employee
  const { data: leavesData } = useGetLeavesQuery(
    {
      employeeId: employeeId || "",
      status: "Approved",
      page: 1,
      limit: 100,
    },
    { skip: !employeeId }
  );

  // Calculate month start and end for fetching all attendance records
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  
  const monthStartStr = format(monthStart, "yyyy-MM-dd");
  const monthEndStr = format(monthEnd, "yyyy-MM-dd");
  
  // Fetch all attendance records for this employee for the entire month
  const { data: monthAttendanceData, refetch: refetchMonthAttendance } = useGetEmployeeAttendanceQuery(
    {
      employeeId: employeeId || "",
      startDate: monthStartStr,
      endDate: monthEndStr,
    },
    { skip: !employeeId }
  );
  
  // RTK Query will automatically refetch when Attendance tag is invalidated
  // No need for manual refetch - the cache invalidation from updateAttendance mutation will trigger it
  
  // Use fetched month attendance records if available, otherwise use provided records
  const allAttendanceRecords = monthAttendanceData?.data?.attendance || attendanceRecords || [];

  // Calculate leave balance using same logic as EmployeeAttendance
  const leaveBalanceInfo = useMemo(() => {
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

    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

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

    // Count used leaves from attendance records in current month
    // Filter for this employee from all attendance records
    const employeeAttendanceRecords = allAttendanceRecords.filter((record: any) => {
      const recordEmployeeId = (record.employeeId as any)?._id || (record.employeeId as any)?.toString();
      const employeeIdStr = employeeId.toString();
      return recordEmployeeId === employeeIdStr || recordEmployeeId === employeeId;
    });

    // Group by date to avoid counting duplicate records for the same date (matching backend logic)
    const dateLeaveMap = new Map<string, number>();
    
    employeeAttendanceRecords.forEach((record: any) => {
      // Exclude the current attendance record if updating
      if (excludeAttendanceId && record._id === excludeAttendanceId) {
        return;
      }

      const recordDate = new Date(record.date);
      const isInCurrentMonth = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      
      if (!isInCurrentMonth) {
        return;
      }
      
      // Check if it matches any leave type from template
      const matchesTemplateLeave = record.leaveType && 
        matchesTemplateLeaveType(record.leaveType.trim(), templateLeaveTypes);
      
      if (matchesTemplateLeave && (record.status === 'On Leave' || record.status === 'Half Day')) {
        // IMPORTANT: Exclude week off compensation - week off does NOT count as leave usage
        if (record.compensationType === 'weekOff' || record.compensationType === 'compOff') {
          return;
        }
        
        // Check if it's a half-day leave
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
    
    // If current selection is a leave that matches template leave type, add it to the calculation
    const selectedDateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    const isSelectedDateInCurrentMonth = selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
    
    if (isSelectedDateInCurrentMonth && currentStatus && 
        (currentStatus === 'On Leave' || currentStatus === 'Half Day') &&
        currentLeaveType) {
      const matchesCurrentTemplateLeave = matchesTemplateLeaveType(currentLeaveType.trim(), templateLeaveTypes);
      
      if (matchesCurrentTemplateLeave) {
        // Check if it's a half-day leave
        const isCurrentHalfDay = currentStatus === "Half Day" || 
                                (currentStatus === "On Leave" && currentHalfDaySession) ||
                                (currentHalfDaySession && (currentHalfDaySession === "First Half Day" || currentHalfDaySession === "Second Half Day"));
        
        const currentLeaveDays = isCurrentHalfDay ? 0.5 : 1;
        
        // Only add if this date doesn't already have a leave recorded (or if we're updating the same record)
        if (!dateLeaveMap.has(selectedDateKey) || excludeAttendanceId) {
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
    
    return { 
      total, 
      used: Math.round(used * 10) / 10,
      usedFromAttendance: Math.round(usedFromAttendance * 10) / 10,
      usedFromRequests: 0, // Not used anymore - all leaves are in attendance collection
      available: Math.round(available * 10) / 10 
    };
  }, [leaveTemplate, allAttendanceRecords, leavesData, selectedDate, excludeAttendanceId, employeeId, currentStatus, currentHalfDaySession, currentLeaveType]);

  if (!leaveTemplate) {
    return (
      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
        <span className="text-xs text-yellow-700">No leave template configured</span>
      </div>
    );
  }

  const isExhausted = leaveBalanceInfo.available <= 0;

  // Calculate half-day equivalents
  const totalHalfDays = leaveBalanceInfo.total * 2;
  const usedHalfDays = leaveBalanceInfo.used * 2;
  const availableHalfDays = leaveBalanceInfo.available * 2;
  
  // Check if current selection is half-day
  const isCurrentHalfDay = currentStatus === "Half Day" || 
                           (currentStatus === "On Leave" && currentHalfDaySession) ||
                           (currentHalfDaySession && (currentHalfDaySession === "First Half Day" || currentHalfDaySession === "Second Half Day"));
  
  // Calculate projected balance if half-day is selected
  const projectedAvailable = isCurrentHalfDay 
    ? Math.max(0, leaveBalanceInfo.available - 0.5)
    : leaveBalanceInfo.available;
  const projectedAvailableHalfDays = projectedAvailable * 2;

  return (
    <div className={`mt-2 p-2 border rounded-md ${
      isExhausted 
        ? "bg-red-50 border-red-200" 
        : leaveBalanceInfo.available < 1 
          ? "bg-yellow-50 border-yellow-200" 
          : "bg-green-50 border-green-200"
    }`}>
      <div className="text-xs space-y-1">
        <div className="font-medium">
          Leave Balance: <span className={isExhausted ? "text-red-700 font-bold" : " font-bold"}>{leaveBalanceInfo.available.toFixed(1)}</span> / {leaveBalanceInfo.total} days
        </div>
        <div className="text-muted-foreground text-[10px]">
          ({availableHalfDays.toFixed(1)} / {totalHalfDays.toFixed(0)} half-days)
        </div>
        <div className="text-muted-foreground">
          Used: {leaveBalanceInfo.used.toFixed(1)} days ({usedHalfDays.toFixed(1)} half-days)
        </div>
        {isCurrentHalfDay && (
          <div className="mt-1 pt-1 border-t border-blue-200">
            <div className="text-blue-700 font-medium text-[10px]">
              Half-Day Selected (0.5 days)
            </div>
            <div className="text-blue-600 text-[10px]">
              After this leave: <span className="font-bold">{projectedAvailable.toFixed(1)}</span> days ({projectedAvailableHalfDays.toFixed(1)} half-days) remaining
            </div>
          </div>
        )}
        {isExhausted && (
          <div className="text-red-700 font-medium">
            ⚠️ Leave balance exhausted. Cannot mark as Leave.
          </div>
        )}
      </div>
    </div>
  );
};

const AdminAttendance = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("Present");
  const [remarks, setRemarks] = useState<string>("");
  const [punchInTime, setPunchInTime] = useState<Date | undefined>(undefined);
  const [punchOutTime, setPunchOutTime] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState<boolean>(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState<boolean>(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState<boolean>(false);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<any>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editData, setEditData] = useState<any>({});
  const [fineAdjustment, setFineAdjustment] = useState<string>("auto"); // "auto", "0", "1x", "2x", "3x", "custom"
  const [customFineAmount, setCustomFineAmount] = useState<number>(0);
  const [lateFineAdjustment, setLateFineAdjustment] = useState<string>("auto"); // "auto", "0", "custom"
  const [earlyFineAdjustment, setEarlyFineAdjustment] = useState<string>("auto"); // "auto", "0", "custom"
  const [customLateFineAmount, setCustomLateFineAmount] = useState<number>(0);
  const [customEarlyFineAmount, setCustomEarlyFineAmount] = useState<number>(0);
  const [compensationType, setCompensationType] = useState<'paid' | 'unpaid' | 'weekOff' | 'compOff'>('paid');
  const [alternateWorkDate, setAlternateWorkDate] = useState<Date | null>(null);
  const [paidHolidayNote, setPaidHolidayNote] = useState<string>("");
  
  // Check if admin manually set attendance times (in editing mode)
  const isManuallySetAttendance = useMemo(() => {
    if (!selectedAttendance) return false;
    // If we're editing and punch times are set, admin has control
    return isEditing && (punchInTime !== undefined || punchOutTime !== undefined || 
                         (selectedAttendance.punchIn && selectedAttendance.punchOut));
  }, [isEditing, punchInTime, punchOutTime, selectedAttendance]);
  
  // Calculate fine from late minutes based on adjustment
  const calculateLateFine = useMemo(() => {
    if (!selectedAttendance) return 0;
    
    const lateMinutes = selectedAttendance.lateMinutes || 0;
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
    // Otherwise, backend will calculate
    if (lateFineAdjustment === "1x" || lateFineAdjustment === "2x" || lateFineAdjustment === "3x" || lateFineAdjustment === "auto") {
      // If there's a stored fineAmount and we have late minutes, estimate late portion
      // For now, we'll use the stored fineAmount as reference, but backend will recalculate
      // Return the stored fineAmount as an estimate (backend will apply multipliers correctly)
      if (selectedAttendance.fineAmount && selectedAttendance.fineAmount > 0) {
        // If only late minutes exist (no early), use the full fineAmount
        const earlyMinutes = selectedAttendance.earlyMinutes || 0;
        if (earlyMinutes <= 0) {
          return selectedAttendance.fineAmount;
        }
        // If both exist, we can't split accurately without backend calculation
        // Return null to indicate backend calculation needed
        return null;
      }
      return null;
    }
    
    return 0;
  }, [selectedAttendance, lateFineAdjustment, customLateFineAmount]);
  
  // Calculate fine from early minutes based on adjustment
  const calculateEarlyFine = useMemo(() => {
    if (!selectedAttendance) return 0;
    
    const earlyMinutes = selectedAttendance.earlyMinutes || 0;
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
      if (selectedAttendance.fineAmount && selectedAttendance.fineAmount > 0) {
        // If only early minutes exist (no late), use the full fineAmount
        const lateMinutes = selectedAttendance.lateMinutes || 0;
        if (lateMinutes <= 0) {
          return selectedAttendance.fineAmount;
        }
        // If both exist, we can't split accurately without backend calculation
        return null;
      }
      return null;
    }
    
    return 0;
  }, [selectedAttendance, earlyFineAdjustment, customEarlyFineAmount]);
  
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
    if (selectedAttendance && selectedAttendance.fineAmount !== undefined && selectedAttendance.fineAmount !== null) {
      // If individual adjustments are auto, use stored value
      if (lateFineAdjustment === "auto" && earlyFineAdjustment === "auto") {
        return selectedAttendance.fineAmount;
      }
    }
    
    // Otherwise, return null (backend will calculate)
    return null;
  }, [calculateLateFine, calculateEarlyFine, lateFineAdjustment, earlyFineAdjustment, fineAdjustment, customFineAmount, customLateFineAmount, customEarlyFineAmount, selectedAttendance]);
  
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
  }, [lateFineAdjustment, customLateFineAmount, earlyFineAdjustment, customEarlyFineAmount, calculateLateFine, calculateEarlyFine, isManuallySetAttendance]);
  
  // Display fine amount - calculated total or stored value
  const displayFineAmount = useMemo(() => {
    if (!selectedAttendance) return 0;
    
    // If we have a calculated total from individual adjustments, use it
    if (calculatedTotalFine !== null && calculatedTotalFine > 0) {
      return calculatedTotalFine;
    }
    
    // Otherwise use stored fine amount
    return selectedAttendance.fineAmount || 0;
  }, [selectedAttendance, calculatedTotalFine]);
  
  // Template assignment states
  const [isAssignTemplateModalOpen, setIsAssignTemplateModalOpen] = useState<boolean>(false);
  const [selectedEmployeeForTemplate, setSelectedEmployeeForTemplate] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [updateStaff, { isLoading: isUpdatingStaff }] = useUpdateStaffMutation();
  
  
  // Filter and Group By states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'filter' | 'group'>('filter');
  const [selectedStaffType, setSelectedStaffType] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [groupBy, setGroupBy] = useState<'shiftTemplate' | 'department' | 'salaryType' | 'none'>('shiftTemplate');
  
  // Fetch business data for shifts
  const { data: businessData } = useGetBusinessQuery();
  const availableShifts = businessData?.data?.business?.settings?.attendance?.shifts || [];
  
  // Fetch attendance templates for filtering and grouping
  const { data: attendanceTemplatesData } = useGetAttendanceTemplatesQuery();
  const attendanceTemplates = attendanceTemplatesData?.data?.templates || [];
  
  // Fetch attendance by ID for logs
  const { data: attendanceByIdData, refetch: refetchAttendanceById } = useGetAttendanceByIdQuery(
    selectedAttendance?._id || "",
    { skip: !selectedAttendance?._id }
  );

  const [updateAttendance] = useUpdateAttendanceMutation();
  const [markAttendance] = useMarkAttendanceMutation();
  const [processFaceMatching, { isLoading: isProcessingFaceMatch }] = useProcessFaceMatchingMutation();

  // Format selected date for API
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch attendance for selected date - include all employees
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    refetch,
  } = useGetAttendanceQuery({
    date: selectedDateStr,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    limit: pageSize,
    includeAllEmployees: true, // Show all employees even if they haven't marked attendance
    search: debouncedSearchQuery || undefined, // Send search query to backend (already normalized)
  });

  const [approveAttendance] = useApproveAttendanceMutation();

  // Fetch stats for selected date
  const { data: statsData, isLoading: isLoadingStats } =
    useGetAttendanceStatsQuery({
      date: selectedDateStr,
    });

  const attendanceRecords = attendanceData?.data?.attendance || [];
  const pagination = attendanceData?.data?.pagination;
  const stats = statsData?.data?.stats;

  // Extract unique departments, staff types, and attendance templates from attendance records
  const { uniqueDepartments, uniqueStaffTypes, uniqueAttendanceTemplates } = useMemo(() => {
    const depts = new Set<string>();
    const staffTypes = new Set<string>();
    const templates = new Set<string>();
    
    attendanceRecords.forEach((record: any) => {
      const employee = record.employeeId;
      if ((employee as any)?.department) {
        depts.add((employee as any).department);
      }
      if ((employee as any)?.staffType) {
        staffTypes.add((employee as any).staffType);
      }
      // Extract attendance template name
      const attendanceTemplate = (employee as any)?.attendanceTemplateId;
      if (attendanceTemplate?.name) {
        templates.add(attendanceTemplate.name);
      } else if ((employee as any)?.shiftName) {
        // Fallback to shiftName if no attendance template
        templates.add((employee as any).shiftName);
      }
    });
    
    return {
      uniqueDepartments: Array.from(depts).sort(),
      uniqueStaffTypes: Array.from(staffTypes).sort(),
      uniqueAttendanceTemplates: Array.from(templates).sort()
    };
  }, [attendanceRecords]);

  // Apply filters to attendance records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record: any) => {
      const employee = record.employeeId;
      
      // Filter by Staff Type
      if (selectedStaffType && (employee as any)?.staffType !== selectedStaffType) {
        return false;
      }
      
      // Filter by Shift/Attendance Template
      if (selectedShift) {
        const attendanceTemplate = (employee as any)?.attendanceTemplateId;
        const templateName = attendanceTemplate?.name || null;
        const shiftName = (employee as any)?.shiftName || "No Shift Template Assigned";
        const employeeShift = templateName || shiftName;
        if (employeeShift !== selectedShift) {
          return false;
        }
      }
      
      // Filter by Department
      if (selectedDepartment && (employee as any)?.department !== selectedDepartment) {
        return false;
      }
      
      return true;
    });
  }, [attendanceRecords, selectedStaffType, selectedShift, selectedDepartment]);

  // Group filtered records based on groupBy option
  const groupedRecords = useMemo(() => {
    if (groupBy === 'none') {
      return {
        grouped: { 'All Employees': filteredRecords },
        sortedGroups: ['All Employees'],
        groupDetails: { 'All Employees': { shiftHours: null } }
      };
    }
    
    const grouped: { [key: string]: any[] } = {};
    const groupDetails: { [key: string]: { shiftHours: { startTime: string; endTime: string } | null } } = {};
    
    filteredRecords.forEach((record: any) => {
      const employee = record.employeeId;
      let groupKey = "Unassigned";
      let shiftHours: { startTime: string; endTime: string } | null = null;
      
      if (groupBy === 'shiftTemplate') {
        // Use attendanceTemplateId name if available, otherwise fall back to shiftName
        const attendanceTemplate = (employee as any)?.attendanceTemplateId;
        const shiftName = (employee as any)?.shiftName;
        
        if (attendanceTemplate && attendanceTemplate.name) {
          groupKey = attendanceTemplate.name;
        } else {
          groupKey = shiftName || "No Shift Template Assigned";
        }
        
        // Get shift hours from business settings based on shiftName
        if (shiftName && availableShifts.length > 0) {
          const shift = availableShifts.find((s: any) => s.name === shiftName);
          if (shift) {
            shiftHours = {
              startTime: shift.startTime,
              endTime: shift.endTime
            };
          }
        }
      } else if (groupBy === 'department') {
        groupKey = (employee as any)?.department || "No Department";
      } else if (groupBy === 'salaryType') {
        // Determine salary type based on salary structure
        const salary = (employee as any)?.salary;
        if (salary) {
          // You can customize this logic based on your salary structure
          if (salary.basicSalary) {
            groupKey = "Fixed Salary";
          } else {
            groupKey = "Variable Salary";
          }
        } else {
          groupKey = "No Salary Info";
        }
      }
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
        groupDetails[groupKey] = { shiftHours };
      }
      grouped[groupKey].push(record);
    });
    
    // Sort groups alphabetically, but put "Unassigned"/"No..." at the end
    const sortedGroups = Object.keys(grouped).sort((a, b) => {
      if (a.startsWith("No ") || a === "Unassigned") return 1;
      if (b.startsWith("No ") || b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    
    return { grouped, sortedGroups, groupDetails };
  }, [filteredRecords, groupBy, availableShifts]);

  // Reset page when date or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, statusFilter, debouncedSearchQuery]);

  const normalizeSearch = (q: string) => q.trim().replace(/\s+/g, " ");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(normalizeSearch(searchQuery));
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Navigate to previous/next day
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (nextDay <= today) {
      setSelectedDate(nextDay);
    } else {
      message.warning("Cannot navigate to future dates");
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    return format(parseISO(dateString), "hh:mm a");
  };

  const formatWorkHours = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatWorkHoursWithFine = (workHours?: number, fineHours?: number) => {
    if (!workHours && !fineHours) return "0:00 Hrs";
    
    // Calculate net work hours (work hours minus fine hours)
    const netWorkHours = (workHours || 0) - (fineHours || 0);
    const h = Math.floor(Math.max(0, netWorkHours) / 60);
    const m = Math.max(0, netWorkHours) % 60;
    return `${h}:${String(m).padStart(2, '0')} Hrs`;
  };

  const formatTimeRange = (punchIn?: string, punchOut?: string) => {
    if (!punchIn) return "";
    const inTime = formatTime(punchIn);
    const outTime = punchOut ? formatTime(punchOut) : "";
    return outTime ? `${inTime} - ${outTime}` : inTime;
  };

  const getStatusBadge = (status: string) => {
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
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600 font-semibold">
            On Leave
          </Badge>
        );
      case "Pending":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500 font-semibold">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
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

  const handleApprove = async () => {
    if (!selectedAttendance) return;

    try {
      await approveAttendance({
        id: selectedAttendance._id,
        status: approvalStatus,
        remarks: remarks || undefined,
      }).unwrap();

      message.success(`Attendance marked as ${approvalStatus} successfully`);
      setSelectedAttendance(null);
      setRemarks("");
      setApprovalStatus("Present");
      setPunchInTime(undefined);
      setPunchOutTime(undefined);
      refetch();
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to approve attendance",
      );
    }
  };

  const handleUpdate = async () => {
    if (!selectedAttendance) return;

    try {
      const employeeId = (selectedAttendance.employeeId as any)?._id;
      if (!employeeId) {
        message.error("Employee ID is required");
        return;
      }

      // Use approvalStatus from state (updated via Select)
      let finalStatus = approvalStatus;
      
      // Auto-mark as Present if punch times are set but status is not set
      if (!finalStatus && (punchInTime || punchOutTime)) {
        finalStatus = "Present";
      }

      // Validate required fields
      if (!finalStatus) {
        message.error("Please select a status");
        return;
      }

      // Validate half day session if status is Half Day
      if (finalStatus === "Half Day" && editData.halfDaySession && !editData.halfDaySession) {
        message.error("Please select a half day session (First Half Day or Second Half Day)");
        return;
      }

      // Prepare data
      const attendanceData: any = {
        status: finalStatus,
      };

      // Always include notes/remarks if provided (not just for Paid Holiday)
      // Check all possible sources for notes
      const finalNotes = paidHolidayNote || remarks || editData.notes || editData.remarks || selectedAttendance?.remarks || selectedAttendance?.notes || "";
      
      // Always send remarks (backend uses remarks field)
      // Send empty string if no notes provided (to clear existing notes if needed)
      attendanceData.remarks = finalNotes;
      // Also send notes for backward compatibility
      attendanceData.notes = finalNotes;

      // Add half day session if status is Half Day
      if (finalStatus === "Half Day" && editData.halfDaySession) {
        attendanceData.halfDaySession = editData.halfDaySession;
      }

      // Add compensation type and alternate date for Half Day
      if (finalStatus === "Half Day") {
        attendanceData.compensationType = compensationType || editData.compensationType || 'paid';
        if (compensationType === 'weekOff' && alternateWorkDate) {
          attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
        } else {
          attendanceData.alternateWorkDate = null;
        }
      }

      // Add leave type and compensation if status is On Leave
      if (finalStatus === "On Leave") {
        if (editData.leaveType) {
          attendanceData.leaveType = editData.leaveType;
        }
        
        // Validate Paid Holiday requires note
        if (editData.leaveType === "Paid Holiday") {
          if (!paidHolidayNote && !remarks && !editData.remarks && !editData.notes) {
            message.error("Please provide a reason/note for Paid Holiday");
            return;
          }
          // Notes are already set above, but ensure they're not empty for Paid Holiday
          if (!attendanceData.remarks && !attendanceData.notes) {
            attendanceData.remarks = paidHolidayNote || remarks || editData.remarks || editData.notes || "";
            attendanceData.notes = paidHolidayNote || remarks || editData.notes || editData.remarks || "";
          }
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
        } else {
          attendanceData.compensationType = compensationType || editData.compensationType || 'paid';
          if (compensationType === 'weekOff' && alternateWorkDate) {
            attendanceData.alternateWorkDate = alternateWorkDate.toISOString();
          } else {
            attendanceData.alternateWorkDate = null;
          }
        }
      }

      // Handle punch times
      if (punchInTime) {
        const punchInDate = new Date(selectedDate);
        punchInDate.setHours(punchInTime.getHours());
        punchInDate.setMinutes(punchInTime.getMinutes());
        punchInDate.setSeconds(punchInTime.getSeconds());
        attendanceData.punchIn = punchInDate.toISOString();
      } else if (selectedAttendance.punchIn && !isEditing) {
        // Keep existing punch in if not editing
        const existing = selectedAttendance.punchIn;
        attendanceData.punchIn = typeof existing === "string" ? existing : new Date(existing).toISOString();
      }

      if (punchOutTime) {
        const punchOutDate = new Date(selectedDate);
        punchOutDate.setHours(punchOutTime.getHours());
        punchOutDate.setMinutes(punchOutTime.getMinutes());
        punchOutDate.setSeconds(punchOutTime.getSeconds());
        attendanceData.punchOut = punchOutDate.toISOString();
      } else if (selectedAttendance.punchOut && !isEditing) {
        // Keep existing punch out if not editing
        const existing = selectedAttendance.punchOut;
        attendanceData.punchOut = typeof existing === "string" ? existing : new Date(existing).toISOString();
      }

      // Fine adjustment logic
      // Only send fine adjustments if admin explicitly set them (not "auto")
      // If all are "auto" and only punch times changed, backend will recalculate fines from punch times
      
      const hasExplicitFineAdjustments = 
        lateFineAdjustment !== "auto" || 
        earlyFineAdjustment !== "auto" || 
        fineAdjustment !== "auto";
      
      // Track if punch times were changed (for backend recalculation)
      const punchTimesChanged = punchInTime !== undefined || punchOutTime !== undefined;
      
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
        // This allows proper recalculation when admin only changes punch times
      }

      // If record doesn't have _id, create new attendance record
      if (!selectedAttendance._id) {
        await markAttendance({
          employeeId: employeeId,
          date: selectedDateStr,
          ...attendanceData,
        }).unwrap();
        message.success("Attendance created successfully");
      } else {
        // Update existing record
        await updateAttendance({
          id: selectedAttendance._id,
          data: attendanceData,
        }).unwrap();
        
        // Explicitly approve the attendance if it was pending or not approved
        // This ensures that when admin saves, the attendance is approved
        const wasPending = selectedAttendance.status === "Pending" || 
                          (!selectedAttendance.approvedBy && selectedAttendance.punchIn && selectedAttendance.punchOut);
        const needsApproval = !selectedAttendance.approvedBy || wasPending;
        
        if (needsApproval) {
          try {
            await approveAttendance({
              id: selectedAttendance._id,
              status: finalStatus,
              remarks: remarks || editData.notes || undefined,
            }).unwrap();
          } catch (approveError: any) {
            // If approval fails, still show success for update
            console.warn("Failed to approve attendance:", approveError);
          }
        }
        
        message.success("Attendance updated and approved successfully");
      }

      // Refetch attendance data to update leave balance display
      refetch();
      
      setIsDetailDialogOpen(false);
      setIsEditing(false);
      setSelectedAttendance(null);
      setSelectedRecordForModal(null);
      setRemarks("");
      setApprovalStatus("Present");
      setPunchInTime(undefined);
      setPunchOutTime(undefined);
      setEditData({});
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment("auto");
      setEarlyFineAdjustment("auto");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType('paid');
      setAlternateWorkDate(null);
      setPaidHolidayNote("");
      refetch();
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to update attendance",
      );
    }
  };

  const handleQuickApprove = async (attendance: any, status: string) => {
    try {
      // If record doesn't have _id, create new attendance record
      if (!attendance._id) {
        const employeeId = (attendance.employeeId as any)?._id;
        if (!employeeId) {
          message.error("Employee ID is required");
          return;
        }

        await markAttendance({
          employeeId: employeeId,
          date: selectedDateStr,
          status: status as
            | "Present"
            | "Pending"
            | "Absent"
            | "On Leave"
            | "Half Day"
            | "Not Marked",
        }).unwrap();
        message.success(`Attendance marked as ${status} successfully`);
      } else {
        await approveAttendance({
          id: attendance._id,
          status: status,
        }).unwrap();
        message.success(`Attendance marked as ${status} successfully`);
      }
      refetch();
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to approve attendance",
      );
    }
  };

  // Handle opening modal for attendance details
  const handleOpenModal = async (record: any, editMode: boolean = false) => {
    setSelectedRecordForModal(record);
    setSelectedAttendance(record);
    
    // If record has _id, fetch full attendance with logs
    if (record._id) {
      try {
        // The query will automatically fetch when selectedAttendance._id is set
        // We'll use the fetched data in the logs tab
      } catch (error) {
        console.error("Error fetching attendance details:", error);
      }
    }
    setApprovalStatus(record.status || "Not Marked");
    setRemarks(record.remarks || record.notes || "");
    setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
    setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
    
    // Initialize edit data with all fields
    setEditData({
      ...record,
      status: record.status || "Present",
      punchIn: record.punchIn || "",
      punchOut: record.punchOut || "",
      notes: record.remarks || record.notes || "",
      remarks: record.remarks || record.notes || "",
      halfDaySession: record.halfDaySession || "",
      leaveType: record.leaveType || "",
      compensationType: record.compensationType || 'paid',
      alternateWorkDate: record.alternateWorkDate || null,
    });
    
    // Initialize paid holiday note if leave type is Paid Holiday
    if (record.leaveType === "Paid Holiday") {
      setPaidHolidayNote(record.remarks || record.notes || "");
    } else {
      setPaidHolidayNote("");
    }
    
    // Initialize fine adjustment based on stored values
    const existingFine = record.fineAmount || 0;
    const lateMinutes = record.lateMinutes || 0;
    const earlyMinutes = record.earlyMinutes || 0;
    
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
    
    // Initialize compensation type
    setCompensationType(record.compensationType || 'paid');
    setAlternateWorkDate(record.alternateWorkDate ? new Date(record.alternateWorkDate) : null);
    
    setIsEditing(editMode);
    setIsDetailDialogOpen(true);
  };

  // Handle edit button click
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Handle quick status change - opens modal for Present/Half Day, quick approve for others
  const handleQuickStatusChange = async (record: any, newStatus: string) => {
    // For Present, open modal in edit mode
    if (newStatus === "Present") {
      setEditData({
        ...record,
        date: selectedDateStr,
        employeeId: (record.employeeId as any)?._id,
        status: "Present",
        punchIn: record.punchIn || "",
        punchOut: record.punchOut || "",
        notes: record.remarks || "",
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment(record.lateMinutes > 0 ? "auto" : "0");
      setEarlyFineAdjustment(record.earlyMinutes > 0 ? "auto" : "0");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType('paid');
      setAlternateWorkDate(null);
      setIsEditing(true);
      setSelectedRecordForModal(record);
      setSelectedAttendance(record);
      setApprovalStatus("Present");
      setRemarks(record.remarks || "");
      setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
      setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
      setIsDetailDialogOpen(true);
      return;
    }

    // For Half Day, open modal in edit mode
    if (newStatus === "Half Day") {
      setEditData({
        ...record,
        date: selectedDateStr,
        employeeId: (record.employeeId as any)?._id,
        status: "Half Day",
        halfDaySession: record.halfDaySession || "",
        punchIn: record.punchIn || "",
        punchOut: record.punchOut || "",
        notes: record.remarks || "",
        compensationType: record.compensationType || 'paid',
        alternateWorkDate: record.alternateWorkDate || null,
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment(record.lateMinutes > 0 ? "auto" : "0");
      setEarlyFineAdjustment(record.earlyMinutes > 0 ? "auto" : "0");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType(record.compensationType || 'paid');
      setAlternateWorkDate(record.alternateWorkDate ? new Date(record.alternateWorkDate) : null);
      setIsEditing(true);
      setSelectedRecordForModal(record);
      setSelectedAttendance(record);
      setApprovalStatus("Half Day");
      setRemarks(record.remarks || "");
      setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
      setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
      setIsDetailDialogOpen(true);
      return;
    }

    // For Absent, open modal in edit mode
    if (newStatus === "Absent") {
      setEditData({
        ...record,
        date: selectedDateStr,
        employeeId: (record.employeeId as any)?._id,
        status: "Absent",
        punchIn: record.punchIn || "",
        punchOut: record.punchOut || "",
        notes: record.remarks || "",
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment(record.lateMinutes > 0 ? "auto" : "0");
      setEarlyFineAdjustment(record.earlyMinutes > 0 ? "auto" : "0");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType('paid');
      setAlternateWorkDate(null);
      setIsEditing(true);
      setSelectedRecordForModal(record);
      setSelectedAttendance(record);
      setApprovalStatus("Absent");
      setRemarks(record.remarks || "");
      setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
      setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
      setIsDetailDialogOpen(true);
      return;
    }

    // For On Leave, open modal in edit mode
    if (newStatus === "On Leave") {
      setEditData({
        ...record,
        date: selectedDateStr,
        employeeId: (record.employeeId as any)?._id,
        status: "On Leave",
        leaveType: record.leaveType || "",
        isPaidLeave: record.isPaidLeave !== undefined ? record.isPaidLeave : true,
        punchIn: record.punchIn || "",
        punchOut: record.punchOut || "",
        notes: record.remarks || "",
        compensationType: record.compensationType || 'paid',
        alternateWorkDate: record.alternateWorkDate || null,
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment(record.lateMinutes > 0 ? "auto" : "0");
      setEarlyFineAdjustment(record.earlyMinutes > 0 ? "auto" : "0");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType(record.compensationType || 'paid');
      setAlternateWorkDate(record.alternateWorkDate ? new Date(record.alternateWorkDate) : null);
      setIsEditing(true);
      setSelectedRecordForModal(record);
      setSelectedAttendance(record);
      setApprovalStatus("On Leave");
      setRemarks(record.remarks || "");
      setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
      setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
      setIsDetailDialogOpen(true);
      return;
    }

    // For Week Off, open modal in edit mode
    if (newStatus === "Week Off") {
      setEditData({
        ...record,
        date: selectedDateStr,
        employeeId: (record.employeeId as any)?._id,
        status: "On Leave", // Week Off uses On Leave status with weekOff compensation
        leaveType: "Unpaid Leave",
        compensationType: 'weekOff',
        alternateWorkDate: record.alternateWorkDate || null,
        punchIn: record.punchIn || "",
        punchOut: record.punchOut || "",
        notes: record.remarks || "",
      });
      setFineAdjustment("auto");
      setCustomFineAmount(0);
      setLateFineAdjustment(record.lateMinutes > 0 ? "auto" : "0");
      setEarlyFineAdjustment(record.earlyMinutes > 0 ? "auto" : "0");
      setCustomLateFineAmount(0);
      setCustomEarlyFineAmount(0);
      setCompensationType('weekOff');
      setAlternateWorkDate(record.alternateWorkDate ? new Date(record.alternateWorkDate) : null);
      setIsEditing(true);
      setSelectedRecordForModal(record);
      setSelectedAttendance(record);
      setApprovalStatus("On Leave");
      setRemarks(record.remarks || "");
      setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
      setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
      setIsDetailDialogOpen(true);
      return;
    }
    
    // For other statuses, quick approve
    await handleQuickApprove(record, newStatus);
  };

  // Handle individual checkbox toggle
  const handleToggleEmployee = (recordId: string) => {
    // Find the record to check if it's pending
    const allVisibleRecords: any[] = [];
    Object.values(groupedRecords.grouped).forEach((group: any) => {
      allVisibleRecords.push(...group);
    });
    
    const record = allVisibleRecords.find((r: any) => {
      const rId = r._id || `emp-${(r.employeeId as any)?._id}`;
      return rId === recordId;
    });
    
    // Only allow selecting/deselecting if the record is pending
    if (record) {
      const status = record.status;
      const isApproved = record.approvedBy;
      const isPending = status === "Pending" || (status === "Present" && !isApproved && record.punchIn && record.punchOut);
      
      if (!isPending) {
        // Don't allow selecting non-pending records
        message.warning("Only pending approvals can be selected for bulk approval");
        return;
      }
    }
    
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedEmployees(newSelected);
  };

  // Handle select all toggle - only select records with Pending status
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Get all records from grouped records (which are already filtered by status and other filters)
      const allVisibleRecords: any[] = [];
      Object.values(groupedRecords.grouped).forEach((group: any) => {
        allVisibleRecords.push(...group);
      });
      
      // Filter to only select records with Pending status
      // A record is pending if: status is "Pending" OR status is "Present" with punch in/out but not approved
      const pendingRecords = allVisibleRecords.filter((record: any) => {
        const status = record.status;
        const isApproved = record.approvedBy;
        const isPending = status === "Pending" || (status === "Present" && !isApproved && record.punchIn && record.punchOut);
        return isPending;
      });
      
      const allIds = new Set(
        pendingRecords.map((record: any) => record._id || `emp-${(record.employeeId as any)?._id}`)
      );
      setSelectedEmployees(allIds);
    } else {
      setSelectedEmployees(new Set());
    }
  };

  // Check if all pending records are selected
  const allVisibleRecords: any[] = [];
  Object.values(groupedRecords.grouped).forEach((group: any) => {
    allVisibleRecords.push(...group);
  });
  
  // Filter to only pending records
  const pendingRecords = allVisibleRecords.filter((record: any) => {
    const status = record.status;
    const isApproved = record.approvedBy;
    const isPending = status === "Pending" || (status === "Present" && !isApproved && record.punchIn && record.punchOut);
    return isPending;
  });
  
  const isAllSelected = pendingRecords.length > 0 && 
    pendingRecords.every((record: any) => 
      selectedEmployees.has(record._id || `emp-${(record.employeeId as any)?._id}`)
    );

  // Handle bulk mark as present - show confirmation first
  const handleBulkMarkPresent = () => {
    if (selectedEmployees.size === 0) {
      message.warning("Please select at least one employee");
      return;
    }
    
    // Show confirmation modal
    setShowBulkConfirmModal(true);
  };

  // Actually perform the bulk mark as present after confirmation
  const confirmBulkMarkPresent = async () => {
    setShowBulkConfirmModal(false);
    setIsBulkApproving(true);
    const promises: Promise<any>[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const recordId of selectedEmployees) {
      const record = attendanceRecords.find(
        (r: any) => (r._id || `emp-${(r.employeeId as any)?._id}`) === recordId
      );

      if (!record) continue;

      // Only process records that are actually pending
      const status = record.status;
      const isApproved = record.approvedBy;
      const isPending = status === "Pending" || (status === "Present" && !isApproved && record.punchIn && record.punchOut);
      
      if (!isPending) {
        // Skip non-pending records
        continue;
      }

      const promise = (async () => {
        try {
          const employeeId = (record.employeeId as any)?._id;
          if (!employeeId) {
            errorCount++;
            return;
          }

          // If record doesn't have _id, create new attendance record
          if (!record._id) {
            // Mark as Present - if employee has punched in/out, this will be marked as Present but needs approval
            await markAttendance({
              employeeId: employeeId,
              date: selectedDateStr,
              status: "Present",
            }).unwrap();
            successCount++;
          } else {
            // For existing records with pending status, approve as Present
            await approveAttendance({
              id: record._id,
              status: "Present",
            }).unwrap();
            successCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(`Failed to mark attendance for ${recordId}:`, error);
        }
      })();

      promises.push(promise);
    }

    try {
      await Promise.all(promises);
      if (successCount > 0) {
        message.success(`Successfully marked ${successCount} employee(s) as Present`);
      }
      if (errorCount > 0) {
        message.warning(`Failed to mark ${errorCount} employee(s)`);
      }
      setSelectedEmployees(new Set());
      refetch();
    } catch (error) {
      message.error("Some operations failed");
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Get selected employee names for confirmation modal
  const getSelectedEmployeeNames = () => {
    // Get all visible records from grouped records
    const allVisibleRecords: any[] = [];
    Object.values(groupedRecords.grouped).forEach((group: any) => {
      allVisibleRecords.push(...group);
    });
    
    const selectedRecords = allVisibleRecords.filter((record: any) => {
      const recordId = record._id || `emp-${(record.employeeId as any)?._id}`;
      return selectedEmployees.has(recordId);
    });
    
    return selectedRecords.map((record: any) => {
      const employee = (record.employeeId as any);
      return employee?.name || employee?.employeeId || 'Unknown Employee';
    });
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6 max-w-7xl">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Employee Attendance
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                <span className="hidden sm:inline">View and manage employee attendance records</span>
                <span className="sm:hidden">Manage attendance</span>
              </p>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[180px] sm:w-[240px] justify-start text-left font-normal text-xs sm:text-sm"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{format(selectedDate, "PPP")}</span>
                      <span className="sm:hidden">{format(selectedDate, "MMM d, yyyy")}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          // Only allow dates up to today (no future dates)
                          if (date <= today) {
                            setSelectedDate(date);
                          } else {
                            message.warning("Cannot select future dates");
                          }
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        return date > today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={goToNextDay}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {!isToday(selectedDate) && (
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                )}
              </div>

              {/* Statistics Section - Moved to Top */}
              <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                  <Skeleton className="h-16 sm:h-20 w-full" />
                  <Skeleton className="h-16 sm:h-20 w-full" />
                  <Skeleton className="h-16 sm:h-20 w-full" />
                  <Skeleton className="h-16 sm:h-20 w-full" />
                  <Skeleton className="h-16 sm:h-20 w-full" />
                  <Skeleton className="h-16 sm:h-20 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                  <div className="flex items-center justify-between p-3 border-2 border-[#efaa1f] rounded-lg bg-[#efaa1f]/10">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-[#efaa1f]" />
                      <span className="text-sm font-medium">Present</span>
                    </div>
                    <span className="text-lg font-bold text-[#efaa1f]">
                      {stats?.present || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 border-2 border-red-600 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <UserX className="w-4 h-4 sm:w-5 sm:h-5   " />
                      <span className="text-xs sm:text-sm font-medium">Absent</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold   ">
                      {stats?.absent || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 border-2 border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      <span className="text-xs sm:text-sm font-medium">Punched In</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-blue-600">
                      {stats?.punchedIn || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 border-2 border-purple-600 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 " />
                      <span className="text-xs sm:text-sm font-medium">On Leave</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold ">
                      {stats?.onLeave || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 border-2 border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-950/20">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                      <span className="text-xs sm:text-sm font-medium">Not Marked</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-500">
                      {stats?.notMarked || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 border-2 border-amber-500 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                      <span className="text-xs sm:text-sm font-medium">Pending</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-amber-500">
                      {stats?.pending || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee List Section - Full Width */}
          <div className="w-full">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle className="text-base sm:text-lg md:text-xl">
                    <span className="hidden sm:inline">Attendance for {format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                    <span className="sm:hidden">Attendance for {format(selectedDate, "MMM d, yyyy")}</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Status Filter Tabs */}
                <Tabs
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1); // Reset to first page when switching tabs
                  }}
                  className="mb-4"
                >
                  <TabsList className="flex-wrap sm:flex-nowrap overflow-x-auto">
                    <TabsTrigger value="all">
                      All
                      {pagination?.total !== undefined && pagination.total > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {pagination.total}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="Pending">
                      Pending
                      {stats?.pending !== undefined && stats.pending > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {stats.pending}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="Present">
                      Present
                      {stats?.present !== undefined && stats.present > 0 && (
                        <Badge
                          variant="default"
                          className="ml-2 px-1.5 py-0 text-xs bg-[#efaa1f] hover:bg-[#efaa1f]"
                        >
                          {stats.present}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="Absent">
                      Absent
                      {stats?.absent !== undefined && stats.absent > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {stats.absent}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="On Leave">
                      On Leave
                      {stats?.onLeave !== undefined && stats.onLeave > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {stats.onLeave}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {isLoadingAttendance ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-auto min-h-[200px] w-full" />
                    ))}
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      No attendance records found
                    </p>
                    <p className="text-sm">
                      No employees have marked attendance for this date.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search Bar and Bulk Actions */}
                    <div className="mb-4 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Search by employee name or ID (case-insensitive)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setSearchQuery("")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Bulk Selection and Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                            />
                            <Label className="text-xs sm:text-sm font-medium cursor-pointer whitespace-nowrap">
                              {statusFilter === "Pending" 
                                ? `Select All Pending Approvals (${selectedEmployees.size} selected)`
                                : `Select All (${selectedEmployees.size} selected)`}
                            </Label>
                          </div>
                          {selectedEmployees.size > 0 && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-[#efaa1f] hover:bg-[#d97706] w-full sm:w-auto text-xs sm:text-sm"
                              onClick={handleBulkMarkPresent}
                              disabled={isBulkApproving}
                            >
                              {isBulkApproving ? (
                                <>Processing...</>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                  {statusFilter === "Pending" ? (
                                    <>
                                      <span className="hidden sm:inline">Approve {selectedEmployees.size} Pending Approval{selectedEmployees.size !== 1 ? 's' : ''}</span>
                                      <span className="sm:hidden">Approve {selectedEmployees.size}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="hidden sm:inline">Mark {selectedEmployees.size} as Present</span>
                                      <span className="sm:hidden">Mark {selectedEmployees.size} Present</span>
                                    </>
                                  )}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cards Grid - Grouped by Selected Option */}
                    <div className="space-y-6">
                      {groupedRecords.sortedGroups.length > 0 ? (
                        groupedRecords.sortedGroups.map((groupName) => {
                          const groupRecords = groupedRecords.grouped[groupName] || [];
                          if (groupRecords.length === 0) return null;
                          
                          return (
                            <div key={groupName} className="space-y-3">
                              {/* Group Header */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 pb-2 border-b-2 border-[#efaa1f]">
                                <div className="flex items-center gap-3 flex-1">
                                  <Clock className="w-5 h-5 text-[#efaa1f]" />
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                    <h3 className="text-lg sm:text-xl font-bold text-[#efaa1f]">
                                      {groupName}
                                    </h3>
                                    {groupBy === 'shiftTemplate' && groupedRecords.groupDetails[groupName]?.shiftHours && (
                                      <span className="text-xs sm:text-sm text-muted-foreground">
                                        ({groupedRecords.groupDetails[groupName].shiftHours.startTime} - {groupedRecords.groupDetails[groupName].shiftHours.endTime})
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-[#efaa1f]/10 text-[#efaa1f] border-[#efaa1f]">
                                  {groupRecords.length} {groupRecords.length === 1 ? 'Employee' : 'Employees'}
                                </Badge>
                              </div>
                              
                              {/* Cards for this group */}
                              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                                {groupRecords.map((record: any) => {
                            const employee = record.employeeId;
                            const name = (employee as any)?.name || "N/A";
                            const employeeId =
                              (employee as any)?.employeeId || "N/A";
                            const department =
                              (employee as any)?.department || "N/A";
                            const recordId = record._id || `emp-${employee?._id}`;
                            const isSelected = selectedEmployees.has(recordId);
                            
                            // Determine card styling based on status
                            let cardBg = "bg-card";
                            let borderColor = "border-border";
                            
                            const status = record.status || "Not Marked";
                            const isApproved = record.approvedBy && record.approvedAt;
                            // Pending: status is "Pending" OR status is "Present" with punch in/out but not approved
                            const isPending = status === "Pending" || (status === "Present" && !isApproved && record.punchIn && record.punchOut);
                            
                            if (status === "Present" && isApproved) {
                              // Darker green for approved Present
                              cardBg = "bg-green-100 dark:bg-green-900/30";
                              borderColor = "border-green-300 dark:border-green-700";
                            } else if (status === "Present" && isPending) {
                              // Lighter green for pending Present (has punch in/out but not approved)
                              cardBg = "bg-green-50 dark:bg-green-950/20";
                              borderColor = "border-green-200 dark:border-green-800";
                            } else if (status === "Absent" && isApproved) {
                              cardBg = "bg-red-50 dark:bg-red-950/20";
                              borderColor = "border-red-200 dark:border-red-800";
                            } else if (status === "Half Day" && isApproved) {
                              cardBg = "bg-yellow-50 dark:bg-yellow-950/20";
                              borderColor = "border-yellow-200 dark:border-yellow-800";
                            } else if (status === "On Leave" && isApproved) {
                              cardBg = "bg-blue-50 dark:bg-blue-950/20";
                              borderColor = "border-blue-200 dark:border-blue-800";
                            } else if (isPending && status !== "Present") {
                              // Other pending statuses (not Present)
                              cardBg = "bg-amber-50 dark:bg-amber-950/20";
                              borderColor = "border-amber-200 dark:border-amber-800";
                            } else {
                              cardBg = "bg-gray-50 dark:bg-gray-950/20";
                              borderColor = "border-gray-200 dark:border-gray-800";
                            }
                            
                            // Calculate work hours and fine hours
                            const workHours = record.workHours || 0;
                            const fineHours = record.fineHours || 0;
                            const workHoursDisplay = formatWorkHoursWithFine(workHours, fineHours);
                            const timeRange = formatTimeRange(record.punchIn, record.punchOut);
                            
                            // Determine active status (for button highlighting)
                            // Present button should be highlighted if status is Present (whether pending or approved)
                            const activeStatus = status;

                            return (
                              <Card
                                key={recordId}
                                className={`${cardBg} ${borderColor} hover:shadow-md transition-all ${
                                  isSelected ? "ring-2 ring-[#efaa1f]" : ""
                                }`}
                              >
                                <CardContent className="p-2 sm:p-3 md:p-4">
                                  <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
                                    {/* Top Section: Checkbox and Employee Info */}
                                    <div className="flex items-start gap-2 w-full">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggleEmployee(recordId)}
                                        disabled={!isPending}
                                        className="mt-1 flex-shrink-0"
                                        title={!isPending ? "Only pending approvals can be selected" : ""}
                                      />
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {(employee as any)?.avatar ? (
                                          <img
                                            src={(employee as any).avatar}
                                            alt={name}
                                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0">
                                            {name.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (employee?._id) {
                                                navigate(`/staff-profile/${employee._id}?tab=attendance`);
                                              }
                                            }}
                                            className="font-bold text-sm sm:text-base md:text-lg break-words text-left hover:text-[#efaa1f] hover:underline transition-colors cursor-pointer block w-full"
                                          >
                                            {name}
                                          </button>
                                          <div className="text-xs sm:text-sm text-muted-foreground break-words">
                                            <span className="block sm:inline">{employeeId}</span>
                                            <span className="hidden sm:inline"> | </span>
                                            <span className="block sm:inline">{department}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Middle Section: Status Badge, Work Hours, and Note */}
                                    <div className="flex-1 min-w-0 w-full">

                                      {/* Work Hours */}
                                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                                        {workHoursDisplay}
                                        {record.punchIn && record.punchOut && (
                                          <span className="ml-2 text-xs">
                                            1 Shift (s) <span className="text-muted-foreground">ℹ️</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Note/Remarks Display */}
                                      {(record.remarks || record.notes) && (
                                        <div className="text-xs mb-1">
                                          {record.leaveType === "Paid Holiday" ? (
                                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-2">
                                              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">Paid Holiday Reason:</div>
                                              <div className="text-blue-800 dark:text-blue-200 line-clamp-2">
                                                {record.remarks || record.notes}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-muted-foreground line-clamp-1">
                                              <span className="font-medium">Note:</span> {record.remarks || record.notes}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Links - Add Note, View Logs, and Assign Template */}
                                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        {(record.remarks || record.notes) ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenModal(record);
                                            }}
                                            className="text-xs text-blue-600 hover:underline"
                                          >
                                            {record.leaveType === "Paid Holiday" ? "Edit Reason" : "Edit Note"}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenModal(record);
                                            }}
                                            className="text-xs text-blue-600 hover:underline"
                                          >
                                            {record.leaveType === "Paid Holiday" ? "Add Reason" : "Add Note"}
                                          </button>
                                        )}
                                        {(record.createdBy || record.updatedBy || record._id) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenModal(record);
                                            }}
                                            className="text-xs text-blue-600 hover:underline"
                                          >
                                            Logs
                                          </button>
                                        )}
                                        {/* Show Assign Template button if employee has no attendance template */}
                                        {(!(employee as any)?.attendanceTemplateId || !(employee as any)?.attendanceTemplateId?._id) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedEmployeeForTemplate(employee);
                                              setIsAssignTemplateModalOpen(true);
                                            }}
                                            className="text-xs  hover:underline font-medium"
                                          >
                                            Assign Template
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Bottom Section: Status Buttons - 3-3-1 Layout */}
                                    <div className="w-full mt-2">
                                      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                                        {/* Row 1: P, HD, F */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={`h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 border-0 ${
                                            activeStatus === "Present"
                                              ? isPending && !isApproved
                                                ? "!bg-green-400 hover:!bg-green-500 !text-white font-semibold" // Lighter green for pending
                                                : "!bg-[#efaa1f] hover:!bg-[#d97706] !text-white font-semibold" // Darker orange for approved
                                              : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickStatusChange(record, "Present");
                                          }}
                                        >
                                          <span className="font-semibold text-[10px] sm:text-xs">P</span>
                                          <span className="hidden md:inline text-[10px] sm:text-xs"> | {timeRange || "Present"}</span>
                                        </Button>

                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={`h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 border-0 ${
                                            activeStatus === "Half Day"
                                              ? "!bg-orange-500 hover:!bg-orange-600 !text-white font-semibold"
                                              : record.halfDaySession === "First Half Day" || record.halfDaySession === "Second Half Day"
                                              ? "bg-orange-100 hover:bg-orange-200 text-orange-700"
                                              : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickStatusChange(record, "Half Day");
                                          }}
                                        >
                                          <span className="font-semibold text-[10px] sm:text-xs">HD</span>
                                          <span className="hidden md:inline text-[10px] sm:text-xs">
                                            {record.halfDaySession === "First Half Day"
                                              ? " | S1"
                                              : record.halfDaySession === "Second Half Day"
                                              ? " | S2"
                                              : " | HD"}
                                          </span>
                                        </Button>

                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={`h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 ${
                                            record.fineAmount && record.fineAmount > 0 && fineHours > 0
                                              ? "bg-red-100 hover:bg-red-200 text-red-700 border-red-300"
                                              : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenModal(record);
                                          }}
                                        >
                                          <span className="font-semibold text-[10px] sm:text-xs">F</span>
                                          {(() => {
                                            const lateMinutes = record.lateMinutes || 0;
                                            const earlyMinutes = record.earlyMinutes || 0;
                                            const fineAmount = record.fineAmount || 0;
                                            
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
                                            
                                            // Priority 3: Show fine hours if available (fallback)
                                            const totalFineMinutes = fineHours || 0;
                                            if (totalFineMinutes > 0) {
                                              const hours = Math.floor(totalFineMinutes / 60);
                                              const minutes = totalFineMinutes % 60;
                                              const formattedHours = String(hours).padStart(1, '0');
                                              const formattedMinutes = String(minutes).padStart(2, '0');
                                              const hoursDisplay = `${formattedHours}:${formattedMinutes}`;
                                              return (
                                                <span className="hidden md:inline text-[10px] sm:text-xs"> | -{hoursDisplay}</span>
                                              );
                                            }
                                            
                                            return null;
                                          })()}
                                        </Button>

                                        {/* Row 2: OT, A, L */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 bg-gray-100 hover:bg-gray-200"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            message.info("Overtime feature coming soon");
                                          }}
                                        >
                                          <span className="font-semibold text-[10px] sm:text-xs">OT</span>
                                        </Button>

                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={`h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 border-0 ${
                                            activeStatus === "Absent"
                                              ? "!bg-red-600 hover:!bg-red-700 !text-white font-semibold"
                                              : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickStatusChange(record, "Absent");
                                          }}
                                        >
                                          <span className="font-semibold text-[10px] sm:text-xs">A</span>
                                        </Button>

                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={`h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 border-0 ${
                                            activeStatus === "On Leave" && record.compensationType !== 'weekOff'
                                              ? "!bg-purple-600 hover:!bg-purple-700 !text-white font-semibold"
                                              : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickStatusChange(record, "On Leave");
                                          }}
                                        >
                                          <span className="font-semibold text-[10px] sm:text-xs">L</span>
                                        </Button>

                                        {/* Row 3: WO (spans full width) */}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className={`h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs flex-shrink-0 border-0 col-span-3 ${
                                            activeStatus === "On Leave" && record.compensationType === 'weekOff'
                                              ? "!bg-indigo-600 hover:!bg-indigo-700 !text-white font-semibold"
                                              : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickStatusChange(record, "Week Off");
                                          }}
                                        >
                                          <span className="font-semibold text-[10px] sm:text-xs">WO</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                                );
                              })}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No employees found</p>
                        </div>
                      )}
                    </div>

                    {/* Pagination */}
                    {pagination && (
                      <div className="mt-4 pt-4 border-t">
                        <Pagination
                          page={currentPage}
                          pageSize={pageSize}
                          total={pagination.total}
                          pages={pagination.pages}
                          onPageChange={(newPage) => {
                            setCurrentPage(newPage);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setCurrentPage(1);
                          }}
                          showPageSizeSelector={true}
                        />
                      </div>
                    )}
                  </>
                    )}
                  </CardContent>
                </Card>
              </div>

        {/* Edit/Approve Dialog */}
        <Dialog
          open={isDetailDialogOpen || !!selectedAttendance}
          onOpenChange={(open) => {
            if (!open) {
              setIsDetailDialogOpen(false);
              setIsEditing(false);
              setSelectedAttendance(null);
              setSelectedRecordForModal(null);
              setRemarks("");
              setApprovalStatus("Present");
              setPunchInTime(undefined);
              setPunchOutTime(undefined);
              setEditData({});
              setFineAdjustment("auto");
              setCustomFineAmount(0);
              setLateFineAdjustment("auto");
              setEarlyFineAdjustment("auto");
              setCustomLateFineAmount(0);
              setCustomEarlyFineAmount(0);
              setCompensationType('paid');
              setAlternateWorkDate(null);
              setPaidHolidayNote("");
            }
          }}
        >
          <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle>
                Attendance Details - {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                {selectedAttendance?.employeeId && (
                  <div className="text-sm font-normal text-muted-foreground mt-1">
                    {(selectedAttendance.employeeId as any)?.name || "N/A"} - {(selectedAttendance.employeeId as any)?.employeeId || "N/A"}
                  </div>
                )}
              </DialogTitle>
              <DialogDescription>
                {!isEditing && selectedAttendance?._id && (
                  <Button variant="outline" size="sm" onClick={handleEdit} className="mt-2">
                    <Eye className="w-4 h-4 mr-2" />
                    Edit Attendance
                  </Button>
                )}
                {!isEditing && !selectedAttendance?._id && (
                  <Button variant="default" size="sm" onClick={handleEdit} className="mt-2">
                    <Eye className="w-4 h-4 mr-2" />
                    Mark Attendance
                  </Button>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedAttendance && (
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
                    {/* Approval Status Card */}
                    {selectedAttendance._id && (
                      <Card className={
                        selectedAttendance.approvedBy && selectedAttendance.approvedAt
                          ? "bg-green-50 border-green-200"
                          : (selectedAttendance.status === "Pending" || (!selectedAttendance.approvedBy && selectedAttendance.punchIn && selectedAttendance.punchOut))
                          ? "bg-yellow-50 border-yellow-200"
                          : ""
                      }>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium mb-1">Approval Status</div>
                              {selectedAttendance.approvedBy && selectedAttendance.approvedAt && (
                                <div className="text-sm text-muted-foreground">
                                  Approved by {typeof selectedAttendance.approvedBy === "object" ? selectedAttendance.approvedBy?.name || "Admin" : "Admin"} on {format(parseISO(selectedAttendance.approvedAt.toString()), "MMM d, yyyy h:mm a")}
                                </div>
                              )}
                              {(selectedAttendance.status === "Pending" || (!selectedAttendance.approvedBy && selectedAttendance.punchIn && selectedAttendance.punchOut)) && (
                                <div className="text-sm text-muted-foreground">
                                  Waiting for admin approval
                                </div>
                              )}
                            </div>
                            <div>
                              {selectedAttendance.approvedBy && selectedAttendance.approvedAt && (
                                <Badge className="bg-green-500 hover:bg-green-600">✓ Approved</Badge>
                              )}
                              {(selectedAttendance.status === "Pending" || (!selectedAttendance.approvedBy && selectedAttendance.punchIn && selectedAttendance.punchOut)) && (
                                <Badge className="bg-yellow-500 hover:bg-yellow-600">⏳ Pending</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <div className="mt-1">{getStatusBadge(selectedAttendance.status || "Not Marked")}</div>
                      </div>
                      {isEditing && (
                        <div>
                          <Label>Change Status *</Label>
                          <Select
                            value={approvalStatus || editData.status || ""}
                            onValueChange={(value) => {
                              setApprovalStatus(value);
                              const newData = { ...editData, status: value };
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
                    {((isEditing && approvalStatus === "Half Day") || (!isEditing && selectedAttendance.status === "Half Day" && selectedAttendance.halfDaySession)) && (
                      <div>
                        <Label>Half Day Session</Label>
                        {isEditing ? (
                          <Select
                            value={editData.halfDaySession || selectedAttendance.halfDaySession || ""}
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
                            <CalendarIcon2 className="w-4 h-4" />
                            <span>{selectedAttendance.halfDaySession || "Not specified"}</span>
                          </div>
                        )}
                        
                        {/* Show leave balance for Half Day with Casual Leave or other template leave types */}
                        {selectedAttendance?.employeeId && (
                          <LeaveBalanceDisplay
                            employeeId={(selectedAttendance.employeeId as any)?._id}
                            selectedDate={selectedDate}
                            attendanceRecords={attendanceRecords}
                            excludeAttendanceId={selectedAttendance?._id}
                            currentStatus={isEditing ? approvalStatus : selectedAttendance.status}
                            currentHalfDaySession={isEditing ? editData.halfDaySession : selectedAttendance.halfDaySession}
                            currentLeaveType={isEditing ? editData.leaveType : selectedAttendance.leaveType}
                          />
                        )}
                      </div>
                    )}

                    {/* Compensation Type for Half Day */}
                    {((isEditing && approvalStatus === "Half Day") || (!isEditing && selectedAttendance.status === "Half Day")) && (
                      <div>
                        <Label>Compensation Type</Label>
                        {isEditing ? (
                          <>
                            <Select
                              value={compensationType || selectedAttendance.compensationType || 'paid'}
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
                            <span className="capitalize">{selectedAttendance.compensationType || 'paid'}</span>
                            {selectedAttendance.alternateWorkDate && (
                              <span className="text-xs text-muted-foreground">
                                (Alternate: {format(new Date(selectedAttendance.alternateWorkDate), "MMM d, yyyy")})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Leave Type Selection */}
                    {((isEditing && approvalStatus === "On Leave") || (!isEditing && selectedAttendance.status === "On Leave" && selectedAttendance.leaveType)) && (
                      <div>
                        <Label>Leave Type</Label>
                        {isEditing ? (
                          <>
                            <Select
                              value={editData.leaveType || selectedAttendance.leaveType || ""}
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
                                <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                                <SelectItem value="Paid Holiday">Paid Holiday</SelectItem>
                                <SelectItem value="Comp Off">Comp Off (Compensation Off)</SelectItem>
                                <SelectItem value="Week Off">Week Off</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Show leave balance for Casual Leave */}
                            {/* Show leave balance for any leave type from template (not Paid Holiday, Week Off, or Comp Off) */}
                            {((editData.leaveType && editData.leaveType !== "Paid Holiday" && editData.leaveType !== "Week Off" && editData.leaveType !== "Comp Off") || 
                              (selectedAttendance.leaveType && selectedAttendance.leaveType !== "Paid Holiday" && selectedAttendance.leaveType !== "Week Off" && selectedAttendance.leaveType !== "Comp Off")) && 
                              selectedAttendance?.employeeId && (
                              <LeaveBalanceDisplay
                                employeeId={(selectedAttendance.employeeId as any)?._id}
                                selectedDate={selectedDate}
                                attendanceRecords={attendanceRecords}
                                excludeAttendanceId={selectedAttendance?._id}
                                currentStatus={isEditing ? approvalStatus : selectedAttendance.status}
                                currentHalfDaySession={isEditing ? editData.halfDaySession : selectedAttendance.halfDaySession}
                                currentLeaveType={isEditing ? editData.leaveType : selectedAttendance.leaveType}
                              />
                            )}
                          </>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            <CalendarIcon2 className="w-4 h-4" />
                            <span>{selectedAttendance.leaveType || "Not specified"}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Paid Holiday Note */}
                    {((isEditing && (editData.leaveType === "Paid Holiday" || selectedAttendance.leaveType === "Paid Holiday")) || 
                       (!isEditing && selectedAttendance.leaveType === "Paid Holiday")) && (
                      <div>
                        <Label>Reason/Note for Paid Holiday *</Label>
                        {isEditing ? (
                          <Textarea
                            value={paidHolidayNote || selectedAttendance.remarks || ""}
                            onChange={(e) => {
                              setPaidHolidayNote(e.target.value);
                              setRemarks(e.target.value);
                              setEditData({ ...editData, remarks: e.target.value, notes: e.target.value });
                            }}
                            placeholder="Enter reason for paid holiday..."
                            className="mt-1"
                            rows={3}
                          />
                        ) : (
                          <div className="mt-1 p-2 bg-muted rounded-md">
                            <span>{selectedAttendance.remarks || selectedAttendance.notes || "No reason provided"}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Compensation Type for Leave */}
                    {((isEditing && approvalStatus === "On Leave") || (!isEditing && selectedAttendance.status === "On Leave")) && (
                      <div>
                        <Label>Compensation Type</Label>
                        {isEditing ? (
                          <>
                            <Select
                              value={compensationType || selectedAttendance.compensationType || 'paid'}
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
                            <span className="capitalize">{selectedAttendance.compensationType || 'paid'}</span>
                            {selectedAttendance.alternateWorkDate && (
                              <span className="text-xs text-muted-foreground">
                                (Alternate: {format(new Date(selectedAttendance.alternateWorkDate), "MMM d, yyyy")})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fine Information Card */}
                    {selectedAttendance._id && (
                      <Card className={selectedAttendance.fineAmount === 0 ? "bg-green-50 border-green-200" : (selectedAttendance.fineAmount && selectedAttendance.fineAmount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <DollarSign className={`w-5 h-5 ${selectedAttendance.fineAmount === 0 ? " " : (selectedAttendance.fineAmount && selectedAttendance.fineAmount > 0 ? "  " : "text-gray-600")}`} />
                            <Label className="text-base font-semibold">Fine Information</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {selectedAttendance.fineHours !== undefined && selectedAttendance.fineHours !== null && (
                              <div>
                                <span className="text-muted-foreground">Fine Hours:</span>
                                <span className="ml-2 font-medium">
                                  {selectedAttendance.fineHours > 0 
                                    ? formatWorkHours(selectedAttendance.fineHours)
                                    : "0h"}
                                </span>
                              </div>
                            )}
                            {/* Show Late Login section if punch in exists or late minutes exist */}
                            {(selectedAttendance.punchIn || (selectedAttendance.lateMinutes !== undefined && selectedAttendance.lateMinutes !== null)) && (
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
                                          {selectedAttendance.lateMinutes > 0 
                                            ? `${Math.floor(selectedAttendance.lateMinutes / 60)}h ${selectedAttendance.lateMinutes % 60}m`
                                            : "0h 0m"} ({lateFineAdjustment})
                                        </span>
                                      ) : (
                                        selectedAttendance.lateMinutes > 0 
                                          ? `${Math.floor(selectedAttendance.lateMinutes / 60)}h ${selectedAttendance.lateMinutes % 60}m`
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
                                          // Initialize with existing fine amount or 0
                                          setCustomLateFineAmount(selectedAttendance.fineAmount || 0);
                                        }
                                        if (!isEditing) {
                                          setIsEditing(true);
                                        }
                                      }}
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
                                        onChange={(e) => {
                                          const value = Number(e.target.value);
                                          setCustomLateFineAmount(value);
                                          // Auto-sync will handle updating overall fine via useEffect
                                        }}
                                        className="h-8 w-[100px] text-xs"
                                        min="0"
                                        step="0.01"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Show Early Exit section if punch out exists or early minutes exist */}
                            {(selectedAttendance.punchOut || (selectedAttendance.earlyMinutes !== undefined && selectedAttendance.earlyMinutes !== null)) && (
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
                                          {selectedAttendance.earlyMinutes > 0 
                                            ? `${Math.floor(selectedAttendance.earlyMinutes / 60)}h ${selectedAttendance.earlyMinutes % 60}m`
                                            : "0h 0m"} ({earlyFineAdjustment})
                                        </span>
                                      ) : (
                                        selectedAttendance.earlyMinutes > 0 
                                          ? `${Math.floor(selectedAttendance.earlyMinutes / 60)}h ${selectedAttendance.earlyMinutes % 60}m`
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
                                          setCustomEarlyFineAmount(selectedAttendance.fineAmount || 0);
                                        }
                                        if (!isEditing) {
                                          setIsEditing(true);
                                        }
                                      }}
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
                                        onChange={(e) => {
                                          const value = Number(e.target.value);
                                          setCustomEarlyFineAmount(value);
                                          // Auto-sync will handle updating overall fine via useEffect
                                        }}
                                        className="h-8 w-[100px] text-xs"
                                        min="0"
                                        step="0.01"
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
                          {isEditing && (
                            <div className="mt-4 pt-4 border-t border-red-200 space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium">Fine Adjustment</Label>
                                {(punchInTime !== undefined || punchOutTime !== undefined) && 
                                 lateFineAdjustment === "auto" && earlyFineAdjustment === "auto" && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400">
                                    Fines will be recalculated from punch times
                                  </span>
                                )}
                              </div>
                              
                              {/* Late Login Fine Adjustment - Show if punch in exists or late minutes exist */}
                              {(selectedAttendance.punchIn || (selectedAttendance.lateMinutes !== undefined && selectedAttendance.lateMinutes !== null)) && (
                                <div>
                                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                    Late Login Fine
                                    {selectedAttendance.lateMinutes > 0 && (
                                      <span> ({Math.floor(selectedAttendance.lateMinutes / 60)}h {selectedAttendance.lateMinutes % 60}m)</span>
                                    )}
                                    {selectedAttendance.lateMinutes === 0 && selectedAttendance.punchIn && (
                                      <span className="text-muted-foreground"> (On time - can add fine manually)</span>
                                    )}
                                  </Label>
                                  <Select
                                    value={lateFineAdjustment}
                                    onValueChange={(value) => {
                                      setLateFineAdjustment(value);
                                      if (value === "custom") {
                                        setCustomLateFineAmount(selectedAttendance.fineAmount || 0);
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
                                        // Auto-sync will handle updating overall fine via useEffect
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
                              {(selectedAttendance.punchOut || (selectedAttendance.earlyMinutes !== undefined && selectedAttendance.earlyMinutes !== null)) && (
                                <div>
                                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                    Early Exit Fine
                                    {selectedAttendance.earlyMinutes > 0 && (
                                      <span> ({Math.floor(selectedAttendance.earlyMinutes / 60)}h {selectedAttendance.earlyMinutes % 60}m)</span>
                                    )}
                                    {selectedAttendance.earlyMinutes === 0 && selectedAttendance.punchOut && (
                                      <span className="text-muted-foreground"> (On time - can add fine manually)</span>
                                    )}
                                  </Label>
                                  <Select
                                    value={earlyFineAdjustment}
                                    onValueChange={(value) => {
                                      setEarlyFineAdjustment(value);
                                      if (value === "custom") {
                                        setCustomEarlyFineAmount(selectedAttendance.fineAmount || 0);
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
                                        // Auto-sync will handle updating overall fine via useEffect
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
                              
                              {/* Overall Fine Adjustment - Available when admin manually sets times */}
                              {isManuallySetAttendance && lateFineAdjustment === "auto" && earlyFineAdjustment === "auto" && (
                                <div>
                                  <Label className="text-xs font-medium mb-1 block text-muted-foreground">
                                    Overall Fine Adjustment
                                    <span className="ml-1 text-xs text-blue-600">(Available since you set times manually)</span>
                                  </Label>
                                  <Select
                                    value={fineAdjustment}
                                    onValueChange={(value) => {
                                      setFineAdjustment(value);
                                      if (value === "custom") {
                                        setCustomFineAmount(selectedAttendance.fineAmount || 0);
                                      }
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="auto">Auto Calculate (Based on Late/Early Time)</SelectItem>
                                      <SelectItem value="0">Remove All Fines (₹0)</SelectItem>
                                      <SelectItem value="custom">Custom Amount</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {fineAdjustment === "custom" && (
                                    <div className="mt-2">
                                      <Input
                                        type="number"
                                        placeholder="Enter custom fine amount"
                                        value={customFineAmount}
                                        onChange={(e) => {
                                          const value = parseFloat(e.target.value) || 0;
                                          setCustomFineAmount(value);
                                        }}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {fineAdjustment === "auto" && 
                                      "Total fine will be calculated automatically from late + early minutes"}
                                    {fineAdjustment === "0" && 
                                      "All fines will be set to ₹0 (removes all late/early fines)"}
                                    {fineAdjustment === "custom" && 
                                      "Enter a custom total fine amount (overrides auto calculation)"}
                                  </p>
                                </div>
                              )}
                              
                              {/* Show info when individual adjustments are set */}
                              {(lateFineAdjustment !== "auto" || earlyFineAdjustment !== "auto") && (
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-muted-foreground">
                                  <strong>Note:</strong> Overall fine is calculated from Late Fine + Early Fine based on your adjustments above.
                                  {calculatedTotalFine !== null && calculatedTotalFine > 0 && (
                                    <span className="block mt-1">Total: {formatINR(calculatedTotalFine)}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Punch In/Out Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Punch In</Label>
                        {isEditing ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal mt-1"
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                {punchInTime
                                  ? formatTime(punchInTime.toISOString())
                                  : selectedAttendance.punchIn
                                    ? formatTime(selectedAttendance.punchIn)
                                    : "Not set"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[140]" align="start">
                              <ClockTimePicker
                                date={
                                  punchInTime ||
                                  (selectedAttendance.punchIn
                                    ? parseISO(selectedAttendance.punchIn)
                                    : selectedDate)
                                }
                                setDate={(date) => {
                                  if (date) {
                                    const newDate = new Date(selectedDate);
                                    newDate.setHours(date.getHours());
                                    newDate.setMinutes(date.getMinutes());
                                    newDate.setSeconds(date.getSeconds());
                                    setPunchInTime(newDate);
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{selectedAttendance.punchIn ? formatTime(selectedAttendance.punchIn) : "-"}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Punch Out</Label>
                        {isEditing ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal mt-1"
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                {punchOutTime
                                  ? formatTime(punchOutTime.toISOString())
                                  : selectedAttendance.punchOut
                                    ? formatTime(selectedAttendance.punchOut)
                                    : "Not set"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[140]" align="start">
                              <ClockTimePicker
                                date={
                                  punchOutTime ||
                                  (selectedAttendance.punchOut
                                    ? parseISO(selectedAttendance.punchOut)
                                    : selectedDate)
                                }
                                setDate={(date) => {
                                  if (date) {
                                    const newDate = new Date(selectedDate);
                                    newDate.setHours(date.getHours());
                                    newDate.setMinutes(date.getMinutes());
                                    newDate.setSeconds(date.getSeconds());
                                    setPunchOutTime(newDate);
                                  }
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{selectedAttendance.punchOut ? formatTime(selectedAttendance.punchOut) : "-"}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Hours */}
                    {selectedAttendance.workHours && (
                      <div>
                        <Label>Work Hours</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>{formatWorkHours(selectedAttendance.workHours)}</span>
                        </div>
                      </div>
                    )}

                    {/* Selfies */}
                    {(selectedAttendance.punchInSelfie || selectedAttendance.punchOutSelfie) && (
                      <div>
                        <Label>Selfies</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          {selectedAttendance.punchInSelfie && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Punch In Selfie</div>
                              <img
                                src={selectedAttendance.punchInSelfie}
                                alt="Punch In Selfie"
                                className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                                onClick={() => {
                                  setSelectedAttendance({ ...selectedAttendance, viewSelfie: 'punchIn' });
                                }}
                              />
                              <div className="flex items-center justify-between mt-1">
                                {selectedAttendance.punchInFaceMatch !== undefined && selectedAttendance.punchInFaceMatch !== null ? (
                                  <div className="text-xs text-muted-foreground">
                                    Face Match: {Math.round(selectedAttendance.punchInFaceMatch)}%
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">Face Match: Not processed</div>
                                )}
                                {selectedAttendance._id && (selectedAttendance.punchInFaceMatch === undefined || selectedAttendance.punchInFaceMatch === null) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (selectedAttendance._id) {
                                        try {
                                          const result = await processFaceMatching({ attendanceId: selectedAttendance._id }).unwrap();
                                          message.success("Face matching processed successfully");
                                          // Refetch attendance to get updated face match percentages
                                          refetch();
                                        } catch (error: any) {
                                          message.error(error?.data?.error?.message || "Failed to process face matching");
                                        }
                                      }
                                    }}
                                    disabled={isProcessingFaceMatch}
                                  >
                                    {isProcessingFaceMatch ? "Processing..." : "Process Match"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          {selectedAttendance.punchOutSelfie && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Punch Out Selfie</div>
                              <img
                                src={selectedAttendance.punchOutSelfie}
                                alt="Punch Out Selfie"
                                className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                                onClick={() => {
                                  setSelectedAttendance({ ...selectedAttendance, viewSelfie: 'punchOut' });
                                }}
                              />
                              <div className="flex items-center justify-between mt-1">
                                {selectedAttendance.punchOutFaceMatch !== undefined && selectedAttendance.punchOutFaceMatch !== null ? (
                                  <div className="text-xs text-muted-foreground">
                                    Face Match: {Math.round(selectedAttendance.punchOutFaceMatch)}%
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">Face Match: Not processed</div>
                                )}
                                {selectedAttendance._id && (selectedAttendance.punchOutFaceMatch === undefined || selectedAttendance.punchOutFaceMatch === null) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (selectedAttendance._id) {
                                        try {
                                          const result = await processFaceMatching({ attendanceId: selectedAttendance._id }).unwrap();
                                          message.success("Face matching processed successfully");
                                          // Refetch attendance to get updated face match percentages
                                          refetch();
                                        } catch (error: any) {
                                          message.error(error?.data?.error?.message || "Failed to process face matching");
                                        }
                                      }
                                    }}
                                    disabled={isProcessingFaceMatch}
                                  >
                                    {isProcessingFaceMatch ? "Processing..." : "Process Match"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Location Information */}
                    {(selectedAttendance.location || selectedAttendance.punchIn || selectedAttendance.punchOut) && (
                      <div>
                        <Label>Location Information</Label>
                        <div className="space-y-2 mt-2">
                          {selectedAttendance.punchIn && (
                            <div className="p-2 border rounded-md bg-muted/30">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Punch In</div>
                                  <div className="text-sm">
                                    {selectedAttendance.punchIn && (
                                      <div className="mb-1">
                                        <span className="font-medium">{formatTime(selectedAttendance.punchIn)}</span>
                                      </div>
                                    )}
                                    {selectedAttendance.location?.address ? (
                                      <div className="text-muted-foreground">{selectedAttendance.location.address}</div>
                                    ) : selectedAttendance.location?.latitude && selectedAttendance.location?.longitude ? (
                                      <div className="text-muted-foreground">
                                        {selectedAttendance.location.latitude.toFixed(6)}, {selectedAttendance.location.longitude.toFixed(6)}
                                      </div>
                                    ) : (
                                      <div className="text-muted-foreground text-xs">Location not available</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {selectedAttendance.punchOut && (
                            <div className="p-2 border rounded-md bg-muted/30">
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Punch Out</div>
                                  <div className="text-sm">
                                    {selectedAttendance.punchOut && (
                                      <div className="mb-1">
                                        <span className="font-medium">{formatTime(selectedAttendance.punchOut)}</span>
                                      </div>
                                    )}
                                    {selectedAttendance.location?.address ? (
                                      <div className="text-muted-foreground">{selectedAttendance.location.address}</div>
                                    ) : selectedAttendance.location?.latitude && selectedAttendance.location?.longitude ? (
                                      <div className="text-muted-foreground">
                                        {selectedAttendance.location.latitude.toFixed(6)}, {selectedAttendance.location.longitude.toFixed(6)}
                                      </div>
                                    ) : (
                                      <div className="text-muted-foreground text-xs">Location not available</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes/Remarks */}
                    <div>
                      <Label>Notes/Remarks</Label>
                      {isEditing ? (
                        <Textarea
                          placeholder="Add any remarks or notes..."
                          value={remarks || editData.notes || editData.remarks || ""}
                          onChange={(e) => {
                            setRemarks(e.target.value);
                            setEditData({ ...editData, notes: e.target.value, remarks: e.target.value });
                          }}
                          rows={3}
                          className="mt-1"
                        />
                      ) : (
                        <div className="mt-1 p-2 border rounded-md bg-muted/50">
                          {selectedAttendance.remarks || selectedAttendance.notes || "No remarks"}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
                  {selectedAttendance ? (
                    <div className="space-y-4">
                      {/* Timeline View */}
                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                        
                        <div className="space-y-6">
                          {/* Display logs from database if available */}
                          {(() => {
                            // Use logs from fetched attendance data if available, otherwise use logs from selectedAttendance
                            const logs = attendanceByIdData?.data?.attendance?.logs || selectedAttendance?.logs || [];
                            return logs && logs.length > 0 ? (
                              [...logs]
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
                                      return <CheckCircle2 className="w-4 h-4 text-white" />;
                                    case 'REJECTED':
                                      return <XCircle className="w-4 h-4 text-white" />;
                                    case 'FINE_CALCULATED':
                                    case 'FINE_ADJUSTED':
                                      return <DollarSign className="w-4 h-4 text-white" />;
                                    case 'LEAVE_MARKED':
                                      return <CalendarIcon2 className="w-4 h-4 text-white" />;
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

                                const performedByName = typeof log.performedBy === 'object' 
                                  ? log.performedBy?.name 
                                  : log.performedByName || 'Unknown';

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
                                      {performedByName && (
                                        <div className="text-sm text-muted-foreground mb-3">
                                          Performed by <span className="font-medium text-foreground">{performedByName}</span>
                                          {log.performedByEmail && (
                                            <span className="text-xs"> ({log.performedByEmail})</span>
                                          )}
                                        </div>
                                      )}
                                      {log.notes && (
                                        <div className="text-sm text-muted-foreground mb-3">
                                          <span className="font-medium">Note:</span> {log.notes}
                                        </div>
                                      )}
                                      {/* LEAVE_MARKED specific details */}
                                      {log.action === 'LEAVE_MARKED' && log.newValue && (
                                        <div className="mt-3 pt-3 border-t">
                                          <div className="text-sm font-medium mb-2">Leave Details:</div>
                                          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                              {log.newValue.leaveType && (
                                                <div>
                                                  <span className="text-muted-foreground">Leave Type:</span>
                                                  <span className="ml-2 font-medium">{log.newValue.leaveType}</span>
                                                </div>
                                              )}
                                              {log.newValue.isPaidLeave !== undefined && (
                                                <div>
                                                  <span className="text-muted-foreground">Paid Leave:</span>
                                                  <span className="ml-2 font-medium">{log.newValue.isPaidLeave ? 'Yes' : 'No'}</span>
                                                </div>
                                              )}
                                              {log.newValue.compensationType && (
                                                <div>
                                                  <span className="text-muted-foreground">Compensation:</span>
                                                  <span className="ml-2 font-medium capitalize">{log.newValue.compensationType}</span>
                                                </div>
                                              )}
                                              {log.newValue.alternateWorkDate && (
                                                <div>
                                                  <span className="text-muted-foreground">Alternate Date:</span>
                                                  <span className="ml-2 font-medium">{format(new Date(log.newValue.alternateWorkDate), "MMM d, yyyy")}</span>
                                                </div>
                                              )}
                                              {log.newValue.remarks && (
                                                <div className="sm:col-span-2">
                                                  <span className="text-muted-foreground">Reason/Note:</span>
                                                  <div className="mt-1 font-medium">{log.newValue.remarks}</div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {/* PUNCH_IN specific details */}
                                      {(log.action === 'PUNCH_IN' || log.newValue?.punchIn || log.newValue?.punchInTime || log.punchInDateTime) && (
                                        <div className="mt-3 pt-3 border-t">
                                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                              <Clock className="w-3 h-3" />
                                              Punch In Details
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                              <div>
                                                <span className="text-muted-foreground">Time:</span>
                                                <span className="ml-2 font-medium">
                                                  {formatTime(log.newValue?.punchIn || log.newValue?.punchInTime || log.punchInDateTime)}
                                                </span>
                                              </div>
                                              {log.punchInAddress && (
                                                <div className="sm:col-span-2">
                                                  <span className="text-muted-foreground">Address:</span>
                                                  <span className="ml-2 font-medium">{log.punchInAddress}</span>
                                                </div>
                                              )}
                                              {log.selfieUrl && log.action === 'PUNCH_IN' && (
                                                <div className="sm:col-span-2">
                                                  <span className="text-muted-foreground">Selfie:</span>
                                                  <div className="mt-1">
                                                    <img 
                                                      src={log.selfieUrl} 
                                                      alt="Punch In Selfie" 
                                                      className="w-24 h-24 object-cover rounded border"
                                                    />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {/* PUNCH_OUT specific details */}
                                      {(log.action === 'PUNCH_OUT' || log.newValue?.punchOut || log.newValue?.punchOutTime || log.punchOutDateTime) && (
                                        <div className="mt-3 pt-3 border-t">
                                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                              <Clock className="w-3 h-3" />
                                              Punch Out Details
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                              <div>
                                                <span className="text-muted-foreground">Time:</span>
                                                <span className="ml-2 font-medium">
                                                  {formatTime(log.newValue?.punchOut || log.newValue?.punchOutTime || log.punchOutDateTime)}
                                                </span>
                                              </div>
                                              {log.punchOutAddress && (
                                                <div className="sm:col-span-2">
                                                  <span className="text-muted-foreground">Address:</span>
                                                  <span className="ml-2 font-medium">{log.punchOutAddress}</span>
                                                </div>
                                              )}
                                              {log.selfieUrl && log.action === 'PUNCH_OUT' && (
                                                <div className="sm:col-span-2">
                                                  <span className="text-muted-foreground">Selfie:</span>
                                                  <div className="mt-1">
                                                    <img 
                                                      src={log.selfieUrl} 
                                                      alt="Punch Out Selfie" 
                                                      className="w-24 h-24 object-cover rounded border"
                                                    />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
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
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No activity logs available</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No attendance record selected</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter className="px-6 pb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailDialogOpen(false);
                  setIsEditing(false);
                  setSelectedAttendance(null);
                  setSelectedRecordForModal(null);
                  setRemarks("");
                  setApprovalStatus("Present");
                  setPunchInTime(undefined);
                  setPunchOutTime(undefined);
                }}
              >
                Cancel
              </Button>
              {isEditing && (
                <Button
                  onClick={handleUpdate}
                  className="bg-[#efaa1f] hover:bg-[#d97706]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Update
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Selfie View Dialog */}
        <Dialog
          open={!!selectedAttendance?.viewSelfie}
          onOpenChange={() => {
            if (selectedAttendance) {
              setSelectedAttendance({ ...selectedAttendance, viewSelfie: undefined });
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAttendance?.viewSelfie === 'punchIn' ? 'Punch In Selfie' : 'Punch Out Selfie'}
              </DialogTitle>
            </DialogHeader>
            {selectedAttendance && (
              <div className="space-y-4">
                {selectedAttendance.viewSelfie === 'punchIn' && selectedAttendance.punchInSelfie && (
                  <div className="space-y-3">
                    <div className="relative w-full">
                      <img
                        src={selectedAttendance.punchInSelfie}
                        alt="Punch In Selfie"
                        className="w-full h-auto rounded-lg border object-contain max-h-[70vh]"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      {selectedAttendance.punchInFaceMatch !== undefined && selectedAttendance.punchInFaceMatch !== null ? (
                        <>
                          <span className="font-medium">Face Match Percentage:</span>
                          <Badge
                            variant={
                              selectedAttendance.punchInFaceMatch >= 80
                                ? "default"
                                : selectedAttendance.punchInFaceMatch >= 60
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-lg font-bold px-4 py-2"
                          >
                            {Math.round(selectedAttendance.punchInFaceMatch)}%
                          </Badge>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">Face Match: Not processed</span>
                          {selectedAttendance._id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (selectedAttendance._id) {
                                  try {
                                    await processFaceMatching({ attendanceId: selectedAttendance._id }).unwrap();
                                    message.success("Face matching processed successfully");
                                    // Refetch attendance to get updated face match percentages
                                    refetch();
                                    // Update local state to show new face match
                                    const updatedAttendance = { ...selectedAttendance };
                                    // We'll need to refetch to get the updated values
                                    refetch();
                                  } catch (error: any) {
                                    message.error(error?.data?.error?.message || "Failed to process face matching");
                                  }
                                }
                              }}
                              disabled={isProcessingFaceMatch}
                            >
                              {isProcessingFaceMatch ? "Processing..." : "Process Match"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {(selectedAttendance.employeeId as any)?.avatar && (
                      <div className="space-y-2">
                        <Label>Profile Avatar for Comparison:</Label>
                        <img
                          src={(selectedAttendance.employeeId as any).avatar}
                          alt="Profile Avatar"
                          className="w-32 h-32 rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
                {selectedAttendance.viewSelfie === 'punchOut' && selectedAttendance.punchOutSelfie && (
                  <div className="space-y-3">
                    <div className="relative w-full">
                      <img
                        src={selectedAttendance.punchOutSelfie}
                        alt="Punch Out Selfie"
                        className="w-full h-auto rounded-lg border object-contain max-h-[70vh]"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      {selectedAttendance.punchOutFaceMatch !== undefined && selectedAttendance.punchOutFaceMatch !== null ? (
                        <>
                          <span className="font-medium">Face Match Percentage:</span>
                          <Badge
                            variant={
                              selectedAttendance.punchOutFaceMatch >= 80
                                ? "default"
                                : selectedAttendance.punchOutFaceMatch >= 60
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-lg font-bold px-4 py-2"
                          >
                            {Math.round(selectedAttendance.punchOutFaceMatch)}%
                          </Badge>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">Face Match: Not processed</span>
                          {selectedAttendance._id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (selectedAttendance._id) {
                                  try {
                                    await processFaceMatching({ attendanceId: selectedAttendance._id }).unwrap();
                                    message.success("Face matching processed successfully");
                                    // Refetch attendance to get updated face match percentages
                                    refetch();
                                  } catch (error: any) {
                                    message.error(error?.data?.error?.message || "Failed to process face matching");
                                  }
                                }
                              }}
                              disabled={isProcessingFaceMatch}
                            >
                              {isProcessingFaceMatch ? "Processing..." : "Process Match"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {(selectedAttendance.employeeId as any)?.avatar && (
                      <div className="space-y-2">
                        <Label>Profile Avatar for Comparison:</Label>
                        <img
                          src={(selectedAttendance.employeeId as any).avatar}
                          alt="Profile Avatar"
                          className="w-32 h-32 rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Filter & Group Modal */}
        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Filter & Group</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="h-6 w-6"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as 'filter' | 'group')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="filter">Filter By</TabsTrigger>
                <TabsTrigger value="group">Group By</TabsTrigger>
              </TabsList>
              
              <TabsContent value="filter" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Staff Type</Label>
                    <Select value={selectedStaffType} onValueChange={setSelectedStaffType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Staff Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Staff Types</SelectItem>
                        {uniqueStaffTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Shifts</Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Shift Template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Shift Templates</SelectItem>
                        {/* Show attendance templates first */}
                        {attendanceTemplates
                          .filter((template: any) => template.isActive)
                          .map((template: any) => (
                            <SelectItem key={template._id} value={template.name}>
                              {template.name}
                            </SelectItem>
                          ))}
                        {/* Then show unique templates from records (for backward compatibility) */}
                        {uniqueAttendanceTemplates
                          .filter((name) => !attendanceTemplates.some((t: any) => t.name === name))
                          .map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        <SelectItem value="No Shift Template Assigned">No Shift Template Assigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Departments</SelectItem>
                        {uniqueDepartments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="group" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Group By</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="group-shift"
                          name="groupBy"
                          value="shiftTemplate"
                          checked={groupBy === 'shiftTemplate'}
                          onChange={(e) => setGroupBy(e.target.value as any)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="group-shift" className="font-normal cursor-pointer">
                          Shift Template
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="group-department"
                          name="groupBy"
                          value="department"
                          checked={groupBy === 'department'}
                          onChange={(e) => setGroupBy(e.target.value as any)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="group-department" className="font-normal cursor-pointer">
                          Department
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="group-salary"
                          name="groupBy"
                          value="salaryType"
                          checked={groupBy === 'salaryType'}
                          onChange={(e) => setGroupBy(e.target.value as any)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="group-salary" className="font-normal cursor-pointer">
                          Salary Type
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="group-none"
                          name="groupBy"
                          value="none"
                          checked={groupBy === 'none'}
                          onChange={(e) => setGroupBy(e.target.value as any)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="group-none" className="font-normal cursor-pointer">
                          None
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStaffType("");
                  setSelectedShift("");
                  setSelectedDepartment("");
                  setGroupBy('shiftTemplate');
                }}
                className="w-full sm:w-auto"
              >
                Clear Filter
              </Button>
              <Button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-full sm:w-auto bg-[#efaa1f] hover:bg-[#d97706]"
              >
                Apply Filter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Mark as Present Confirmation Modal */}
        <Dialog open={showBulkConfirmModal} onOpenChange={setShowBulkConfirmModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {statusFilter === "Pending" 
                  ? "Confirm Approve Pending Approvals"
                  : "Confirm Mark as Present"}
              </DialogTitle>
              <DialogDescription>
                {statusFilter === "Pending"
                  ? `Are you sure you want to approve ${selectedEmployees.size} pending approval${selectedEmployees.size !== 1 ? 's' : ''} and mark them as Present?`
                  : `Are you sure you want to mark ${selectedEmployees.size} selected employee${selectedEmployees.size !== 1 ? 's' : ''} as Present?`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {statusFilter === "Pending" 
                    ? `Selected Pending Approvals (${selectedEmployees.size}):`
                    : `Selected Employees (${selectedEmployees.size}):`}
                </Label>
                <div className="max-h-[200px] overflow-y-auto border rounded-md p-3 bg-gray-50">
                  <ul className="space-y-1">
                    {getSelectedEmployeeNames().map((name, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        • {name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will {statusFilter === "Pending" ? "approve and " : ""}mark all selected employees as Present for {format(selectedDate, "MMM d, yyyy")}.
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowBulkConfirmModal(false)}
                className="w-full sm:w-auto"
                disabled={isBulkApproving}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBulkMarkPresent}
                className="w-full sm:w-auto bg-[#efaa1f] hover:bg-[#d97706]"
                disabled={isBulkApproving}
              >
                {isBulkApproving 
                  ? "Processing..." 
                  : statusFilter === "Pending"
                    ? `Confirm & Approve ${selectedEmployees.size} Pending Approval${selectedEmployees.size !== 1 ? 's' : ''}`
                    : `Confirm & Mark ${selectedEmployees.size} as Present`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Template Modal */}
        <Dialog open={isAssignTemplateModalOpen} onOpenChange={setIsAssignTemplateModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Assign Attendance Template</DialogTitle>
              <DialogDescription>
                Assign an attendance template to {selectedEmployeeForTemplate?.name || 'this employee'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Attendance Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceTemplates
                      .filter((template: any) => template.isActive)
                      .map((template: any) => (
                        <SelectItem key={template._id} value={template._id}>
                          {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignTemplateModalOpen(false);
                  setSelectedEmployeeForTemplate(null);
                  setSelectedTemplateId("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedEmployeeForTemplate?._id || !selectedTemplateId) {
                    message.warning("Please select a template");
                    return;
                  }
                  
                  try {
                    await updateStaff({
                      id: selectedEmployeeForTemplate._id,
                      data: {
                        attendanceTemplateId: selectedTemplateId
                      }
                    }).unwrap();
                    
                    message.success("Attendance template assigned successfully");
                    setIsAssignTemplateModalOpen(false);
                    setSelectedEmployeeForTemplate(null);
                    setSelectedTemplateId("");
                    refetch(); // Refresh attendance data
                  } catch (error: any) {
                    message.error(error?.data?.error?.message || "Failed to assign template");
                  }
                }}
                disabled={isUpdatingStaff || !selectedTemplateId}
                className="bg-[#efaa1f] hover:bg-[#d97706]"
              >
                {isUpdatingStaff ? "Assigning..." : "Assign Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </MainLayout>
  );
};

export default AdminAttendance;
