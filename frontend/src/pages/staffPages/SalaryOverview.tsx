import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft, Users, Search, DollarSign, X } from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useGetPayrollsQuery, useLazyViewPayslipQuery } from "@/store/api/payrollApi";
import { useGetStaffQuery, useGetStaffByIdQuery } from "@/store/api/staffApi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  calculateSalaryStructure,
  formatCurrency as formatSalaryCurrency,
  type SalaryStructureInputs,
  type CalculatedSalaryStructure
} from "@/utils/salaryStructureCalculation.util";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth, parseISO, isSameDay } from "date-fns";
import MainLayout from "@/components/MainLayout";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { useGetEmployeeAttendanceQuery } from "@/store/api/attendanceApi";
import { useGetEmployeeHolidaysQuery } from "@/store/api/holidayApi";
import { useGetBusinessQuery } from "@/store/api/settingsApi";
import { calculateWorkingDays } from "@/utils/salaryCalculation.util";
import { calculateProratedSalary } from "@/utils/salaryStructureCalculation.util";
import { calculateTotalFine } from "@/utils/fineCalculation.util";

interface SalaryOverviewProps {
  employeeId?: string; // For when used in a tab
}

const SalaryOverview = ({ employeeId: propEmployeeId }: SalaryOverviewProps = {}) => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const employeeId = propEmployeeId || routeId; // Use prop if provided, otherwise route param
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeId || "");
  
  // Month/Year selection for current month salary overview
  const currentDate = new Date();
  const [selectedViewMonth, setSelectedViewMonth] = useState(currentDate.getMonth() + 1);
  const [selectedViewYear, setSelectedViewYear] = useState(currentDate.getFullYear());
  
  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      value: month.toString(),
      label: new Date(2000, month - 1).toLocaleString("default", { month: "long" }),
    };
  });

  // Generate year options (50 years back to 50 years ahead)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);
  
  // Staff list state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("all");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const normalizeSearch = (q: string) => q.trim().replace(/\s+/g, " ");

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(normalizeSearch(searchQuery));
      setCurrentPage(1);
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch staff list for selection (only when no employeeId and not in tab)
  const { data: staffListData, isLoading: isLoadingStaff } = useGetStaffQuery(
    {
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: pageSize,
    },
    { skip: !!employeeId || !!propEmployeeId }
  );

  const staffList = staffListData?.data?.staff || [];
  const staffPagination = staffListData?.data?.pagination;

  // Update selectedEmployeeId when route changes - this ensures component updates on navigation
  useEffect(() => {
    const newEmployeeId = propEmployeeId || routeId;
    if (newEmployeeId && newEmployeeId !== selectedEmployeeId) {
      setSelectedEmployeeId(newEmployeeId);
    } else if (!newEmployeeId) {
      setSelectedEmployeeId("");
    }
  }, [routeId, propEmployeeId, location.pathname]); // Added location.pathname to detect route changes

  // Handle employee selection
  const handleEmployeeSelect = (staffId: string) => {
    setSelectedEmployeeId(staffId);
    navigate(`/staff-overview/${staffId}`);
  };

  // Use selectedEmployeeId for fetching payroll data
  const currentEmployeeId = employeeId || selectedEmployeeId;

  // Fetch employee details when viewing individual employee - refetch when route changes
  const { data: employeeData } = useGetStaffByIdQuery(currentEmployeeId || "", {
    skip: !currentEmployeeId || (!propEmployeeId && !routeId),
    refetchOnMountOrArgChange: true // Ensure data refetches when route changes
  });

  // Lazy query to view payslip (open PDF in new tab)
  const [viewPayslip] = useLazyViewPayslipQuery();

  // Fetch payroll data for the staff member
  const { data: payrollData, isLoading: isLoadingPayroll } = useGetPayrollsQuery({
    employeeId: currentEmployeeId,
    page: 1,
    limit: 100, // Get all payroll records
  }, {
    skip: !currentEmployeeId
  });

  const payrolls = payrollData?.data?.payrolls || [];

  // Fetch attendance data for selected month/year (for detailed salary overview)
  const monthStart = startOfMonth(new Date(selectedViewYear, selectedViewMonth - 1));
  const monthEnd = endOfMonth(new Date(selectedViewYear, selectedViewMonth - 1));
  const isCurrentMonth = currentDate.getMonth() + 1 === selectedViewMonth && currentDate.getFullYear() === selectedViewYear;
  const attendanceEndDate = isCurrentMonth ? currentDate : monthEnd;
  
  const startDateStr = format(monthStart, "yyyy-MM-dd");
  const endDateStr = format(attendanceEndDate, "yyyy-MM-dd");

  const { data: attendanceData, isLoading: isLoadingAttendance } = useGetEmployeeAttendanceQuery(
    {
      employeeId: currentEmployeeId || "",
      startDate: startDateStr,
      endDate: endDateStr,
      page: 1,
      limit: 100,
    },
    { skip: !currentEmployeeId }
  );

  // Fetch holidays for selected month/year
  const { data: holidaysData, isLoading: isLoadingHolidays } = useGetEmployeeHolidaysQuery(
    {
      year: selectedViewYear,
      month: selectedViewMonth,
    },
    { skip: !currentEmployeeId }
  );

  // Get weekly holiday settings from staff template or business settings
  const { data: businessData } = useGetBusinessQuery();
  
  // Check if staff has a weekly holiday template assigned
  const weeklyHolidayTemplate = employeeData?.data?.staff?.weeklyHolidayTemplateId;
  const isWeeklyHolidayTemplatePopulated = weeklyHolidayTemplate && 
    typeof weeklyHolidayTemplate === 'object' && 
    (weeklyHolidayTemplate as any).settings;
  
  // Extract weekly holiday settings - priority: staff template > business settings
  const weeklyHolidaySettings = useMemo(() => {
    if (isWeeklyHolidayTemplatePopulated && (weeklyHolidayTemplate as any).isActive) {
      // Use staff's weekly holiday template
      const template = weeklyHolidayTemplate as any;
      return {
        weeklyOffPattern: template.settings?.weeklyOffPattern || 'standard',
        weeklyHolidays: template.settings?.weeklyHolidays || [],
        allowAttendanceOnWeeklyOff: template.settings?.allowAttendanceOnWeeklyOff || false
      };
    } else {
      // Fall back to business settings
      return {
        weeklyOffPattern: businessData?.data?.business?.settings?.business?.weeklyOffPattern || 'standard',
        weeklyHolidays: businessData?.data?.business?.settings?.business?.weeklyHolidays || [],
        allowAttendanceOnWeeklyOff: businessData?.data?.business?.settings?.business?.allowAttendanceOnWeeklyOff || false
      };
    }
  }, [weeklyHolidayTemplate, isWeeklyHolidayTemplatePopulated, businessData, employeeData]);
  
  const weeklyOffPattern = weeklyHolidaySettings.weeklyOffPattern;
  
  const attendanceRecords = attendanceData?.data?.attendance || [];
  const holidays = holidaysData?.data?.holidays || [];
  const holidayDates = holidays.map((holiday: any) => new Date(holiday.date));
  
  // Calculate present days from attendance
  const presentDays = attendanceRecords.reduce((sum: number, record: any) => {
    if (record.status === "Present" || record.status === "Approved") {
      if (record.halfDaySession) {
        return sum + 0.5;
      } else {
        return sum + 1;
      }
    } else if (record.status === "Half Day") {
      return sum + 0.5;
    } else if (record.status === "Pending" && record.halfDaySession) {
      return sum + 0.5;
    }
    return sum;
  }, 0);

  // Calculate working days
  const fullMonthWorkingDaysInfo = calculateWorkingDays(
    selectedViewYear,
    selectedViewMonth - 1,
    holidayDates,
    weeklyOffPattern,
    undefined, // No endDate - calculate for full month
    weeklyHolidaySettings.weeklyHolidays // Pass custom weekly holidays for standard pattern
  );
  
  const workingDaysInfo = calculateWorkingDays(
    selectedViewYear,
    selectedViewMonth - 1,
    holidayDates,
    weeklyOffPattern,
    isCurrentMonth ? currentDate : undefined,
    weeklyHolidaySettings.weeklyHolidays // Pass custom weekly holidays for standard pattern
  );

  // Calculate fine information
  const fineInfo = calculateTotalFine(attendanceRecords);
  
  // Calculate prorated salary if staff has salary structure
  let proratedSalary: { proratedGrossSalary: number; proratedDeductions: number; proratedNetSalary: number; attendancePercentage: number } | null = null;
  if (employeeData?.data?.staff?.salary && 'basicSalary' in employeeData.data.staff.salary) {
    const staffSalary = employeeData.data.staff.salary as SalaryStructureInputs;
    const calculatedSalary = calculateSalaryStructure(staffSalary);
    proratedSalary = calculateProratedSalary(
      calculatedSalary,
      fullMonthWorkingDaysInfo.workingDays,
      presentDays
    );
    
    // Apply fine deductions
    if (proratedSalary && fineInfo.totalFineAmount > 0) {
      proratedSalary.proratedNetSalary = Math.max(0, proratedSalary.proratedNetSalary - fineInfo.totalFineAmount);
    }
  }

  // Calendar modifiers for attendance
  const getDayStatus = (date: Date) => {
    if (holidayDates.some(h => isSameDay(h, date))) return "holiday";
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    if (weeklyOffPattern === 'oddEvenSaturday') {
      if (dayOfWeek === 0) return "weekend";
      if (dayOfWeek === 6) {
        if (dayOfMonth % 2 === 0) return "weekend";
      }
    } else {
      // Standard pattern: Use weeklyHolidays array if provided, otherwise default to Saturday and Sunday
      if (weeklyHolidaySettings.weeklyHolidays && weeklyHolidaySettings.weeklyHolidays.length > 0) {
        if (weeklyHolidaySettings.weeklyHolidays.some((wh: any) => wh.day === dayOfWeek)) return "weekend";
      } else {
        // Default: Saturday and Sunday are weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";
      }
    }

    const attendance = attendanceRecords.find(record => isSameDay(parseISO(record.date), date));
    if (attendance) {
      const status = attendance.status as string;
      if (status === "Present" || status === "Approved") return "present";
      if (attendance.status === "Absent") return "absent";
      if (attendance.status === "Half Day") return "half-day";
      if (attendance.status === "On Leave") return "on-leave";
      if (attendance.status === "Pending") return "pending";
    }
    return "not-marked";
  };

  const daysArray = Array.from({ length: new Date(selectedViewYear, selectedViewMonth, 0).getDate() }, (_, i) =>
    new Date(selectedViewYear, selectedViewMonth - 1, i + 1)
  );

  const calendarModifiers = {
    present: daysArray.filter(date => getDayStatus(date) === "present"),
    absent: daysArray.filter(date => getDayStatus(date) === "absent"),
    holiday: daysArray.filter(date => getDayStatus(date) === "holiday"),
    weekend: daysArray.filter(date => getDayStatus(date) === "weekend"),
    "half-day": daysArray.filter(date => getDayStatus(date) === "half-day"),
    "on-leave": daysArray.filter(date => getDayStatus(date) === "on-leave"),
    "pending": daysArray.filter(date => getDayStatus(date) === "pending"),
    "not-marked": daysArray.filter(date => getDayStatus(date) === "not-marked"),
  };

  // Transform payroll data to display format
  const salaryData = payrolls.map((payroll) => {
    const date = new Date(payroll.year, payroll.month - 1, 1);
    const lastDay = new Date(payroll.year, payroll.month, 0);
    return {
      id: payroll._id,
      month: format(date, "MMMM yyyy"),
      duration: `${format(date, "dd MMMM yyyy")} - ${format(lastDay, "dd MMMM yyyy")}`,
      dueAmount: formatSalaryCurrency(payroll.netPay ?? 0),
      payroll: payroll
    };
  }).sort((a, b) => {
    // Sort by date descending (newest first)
    const dateA = new Date(a.payroll.year, a.payroll.month - 1);
    const dateB = new Date(b.payroll.year, b.payroll.month - 1);
    return dateB.getTime() - dateA.getTime();
  });

  // If no employee ID and not in tab, show staff list
  if (!currentEmployeeId && !propEmployeeId) {
    const staffListContent = (
      <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
              Salary Overview
            </h1>
            <Button variant="outline" onClick={() => navigate('/staff')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Staff
            </Button>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Select Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, employee ID, or designation (case-insensitive)..."
                    className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted rounded-sm"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
              </div>

              {isLoadingStaff ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No employees found</p>
                  <p className="text-sm">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffList.map((staff) => (
                          <TableRow
                            key={staff._id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleEmployeeSelect(staff._id)}
                          >
                            <TableCell className="font-medium">{staff.employeeId}</TableCell>
                            <TableCell className="font-medium">{staff.name}</TableCell>
                            <TableCell>{staff.designation}</TableCell>
                            <TableCell>{staff.department}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  staff.status === "Active"
                                    ? "default"
                                    : staff.status === "On Leave"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {staff.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmployeeSelect(staff._id);
                                }}
                              >
                                View Salary
                                <ChevronRight className="w-4 h-4 ml-2" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {staffPagination && (
                    <div className="mt-4">
                      <Pagination
                        page={currentPage}
                        pageSize={pageSize}
                        total={staffPagination.total}
                        pages={staffPagination.pages}
                        onPageChange={(newPage) => {
                          setCurrentPage(newPage);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
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
      </div>
    );

    return <MainLayout>{staffListContent}</MainLayout>;
  }

  // Get selected employee name for display
  const selectedEmployee = staffList.find((s) => s._id === currentEmployeeId);

  // If used standalone (not in a tab), wrap with MainLayout
  const content = (
    <div className={`w-full ${propEmployeeId ? '' : 'container max-w-7xl mx-auto p-4 sm:p-6'}`}>
      <div className="space-y-6">
        {/* Header - Only show when not in tab */}
        {!propEmployeeId && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/staff-overview');
                  }
                }}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Salary Overview</h1>
                {(selectedEmployee || employeeData?.data?.staff) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {(selectedEmployee || employeeData?.data?.staff)?.name} ({(selectedEmployee || employeeData?.data?.staff)?.employeeId})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Salary Structure */}
        {employeeData?.data?.staff?.salary && 'basicSalary' in employeeData.data.staff.salary && (
          <Card>
            <CardHeader>
              <CardTitle>Current Salary Structure</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const staffSalary = employeeData.data.staff.salary as SalaryStructureInputs;
                const calculatedSalary = calculateSalaryStructure(staffSalary);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Monthly Gross</p>
                        <p className="text-2xl font-bold">
                          {formatSalaryCurrency(calculatedSalary.monthly.grossSalary)}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Monthly Net</p>
                        <p className="text-2xl font-bold text-[#efaa1f]">
                          {formatSalaryCurrency(calculatedSalary.monthly.netMonthlySalary)}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total CTC</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatSalaryCurrency(calculatedSalary.totalCTC)}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Basic: {formatSalaryCurrency(calculatedSalary.monthly.basicSalary)} | 
                      DA: {formatSalaryCurrency(calculatedSalary.monthly.dearnessAllowance)} | 
                      HRA: {formatSalaryCurrency(calculatedSalary.monthly.houseRentAllowance)}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Selected Month Salary Overview with Attendance Details */}
        {currentEmployeeId && employeeData?.data?.staff?.salary && 'basicSalary' in employeeData.data.staff.salary && (
          <Card>
            <CardHeader>
              <CardTitle>
                Salary Overview — {format(new Date(selectedViewYear, selectedViewMonth - 1, 1), "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingAttendance || isLoadingHolidays ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  {/* Salary Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Monthly Gross
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {(() => {
                            const staffSalary = employeeData.data.staff.salary as SalaryStructureInputs;
                            const calculatedSalary = calculateSalaryStructure(staffSalary);
                            return formatSalaryCurrency(calculatedSalary.monthly.grossSalary);
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Monthly Gross
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {proratedSalary ? formatSalaryCurrency(proratedSalary.proratedGrossSalary) : "-"}
                        </div>
                        {proratedSalary && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {proratedSalary.attendancePercentage.toFixed(1)}% attendance
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Monthly Net
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {(() => {
                            const staffSalary = employeeData.data.staff.salary as SalaryStructureInputs;
                            const calculatedSalary = calculateSalaryStructure(staffSalary);
                            return formatSalaryCurrency(calculatedSalary.monthly.netMonthlySalary);
                          })()}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Monthly Net
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary">
                          {proratedSalary ? formatSalaryCurrency(proratedSalary.proratedNetSalary) : "-"}
                        </div>
                        {proratedSalary && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on {presentDays % 1 === 0 ? presentDays : presentDays.toFixed(1)} days
                            {fineInfo.totalFineAmount > 0 && ` (Fine: ${formatSalaryCurrency(fineInfo.totalFineAmount)})`}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Calendar View */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarIcon className="w-5 h-5" />
                          Attendance Calendar
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Calendar
                          mode="single"
                          month={new Date(selectedViewYear, selectedViewMonth - 1)}
                          className="rounded-md border"
                          modifiers={calendarModifiers}
                          modifiersClassNames={{
                            present: "bg-green-100 text-green-700 font-semibold",
                            absent: "bg-red-100 text-red-700 font-semibold",
                            holiday: "bg-yellow-100 text-yellow-700 font-semibold",
                            weekend: "bg-gray-100 text-gray-600",
                            "half-day": "bg-blue-100 text-blue-700",
                            "on-leave": "bg-purple-100 text-purple-700",
                            "pending": "bg-orange-100 text-orange-700",
                            "not-marked": "text-muted-foreground",
                          }}
                        />
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                            <span>Present Days ({presentDays % 1 === 0 ? presentDays : presentDays.toFixed(1)})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                            <span>Absent Days ({Math.max(0, workingDaysInfo.workingDays - presentDays)})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                            <span>Holidays ({workingDaysInfo.holidayCount})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
                            <span>Weekends ({workingDaysInfo.weekends})</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Attendance Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Attendance Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <span className="font-medium">Present Days</span>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                              {presentDays % 1 === 0 ? presentDays : presentDays.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="font-medium">Absent Days</span>
                            </div>
                            <span className="text-lg font-bold text-red-600">
                              {Math.max(0, workingDaysInfo.workingDays - presentDays)}
                            </span>
                          </div>
                          {/* Detailed Breakdown */}
                          <div className="mt-2 pt-3 border-t">
                            <div className="text-xs font-medium text-muted-foreground mb-2">Attendance Breakdown</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
                                <span className="text-muted-foreground">Full Day Present:</span>
                                <span className="font-semibold text-green-600">
                                  {attendanceRecords.filter((r: any) => 
                                    (r.status === 'Present' || r.status === 'Approved') && !r.halfDaySession
                                  ).length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950 rounded">
                                <span className="text-muted-foreground">Half Day Present:</span>
                                <span className="font-semibold text-blue-600">
                                  {attendanceRecords.filter((r: any) => 
                                    (r.status === 'Present' || r.status === 'Approved' || r.status === 'Pending') && r.halfDaySession
                                  ).length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950 rounded">
                                <span className="text-muted-foreground">Full Day Leaves:</span>
                                <span className="font-semibold text-purple-600">
                                  {attendanceRecords.filter((r: any) => r.status === 'On Leave').length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950 rounded">
                                <span className="text-muted-foreground">Half Day Leaves:</span>
                                <span className="font-semibold text-orange-600">
                                  {attendanceRecords.filter((r: any) => 
                                    r.status === 'Half Day' || (r.status === 'Pending' && r.halfDaySession && r.leaveType === 'Half Day')
                                  ).length}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-5 h-5 text-yellow-600" />
                              <span className="font-medium">Holidays</span>
                            </div>
                            <span className="text-lg font-bold text-yellow-600">
                              {workingDaysInfo.holidayCount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-blue-600" />
                              <span className="font-medium">Working Days</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600">
                              {workingDaysInfo.workingDays}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-primary" />
                              <span className="font-medium">Attendance %</span>
                            </div>
                            <span className="text-lg font-bold text-primary">
                              {proratedSalary?.attendancePercentage.toFixed(1) || 0}%
                            </span>
                          </div>
                          {/* Fine Summary */}
                          {fineInfo.totalFineAmount > 0 && (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                              <div className="flex items-center gap-2">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="font-medium text-red-600">Total Fines</span>
                              </div>
                              <span className="text-lg font-bold text-red-600">
                                {formatSalaryCurrency(fineInfo.totalFineAmount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Current Month Salary Overview (Payroll Record) */}
        {(() => {
          const currentMonthPayroll = salaryData.find(
            (item) =>
              item.payroll.month === currentDate.getMonth() + 1 &&
              item.payroll.year === currentDate.getFullYear()
          );
          
          if (currentMonthPayroll) {
            const earnings = currentMonthPayroll.payroll.components?.filter((c: any) => c.type === 'earning') || [];
            const deductions = currentMonthPayroll.payroll.components?.filter((c: any) => c.type === 'deduction') || [];
            const fines = deductions.filter((d: any) => 
              d.name?.toLowerCase().includes('fine') || 
              d.name?.toLowerCase().includes('late') ||
              d.name?.toLowerCase().includes('attendance')
            );
            const otherDeductions = deductions.filter((d: any) => 
              !d.name?.toLowerCase().includes('fine') && 
              !d.name?.toLowerCase().includes('late') &&
              !d.name?.toLowerCase().includes('attendance')
            );
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Current Month Salary Overview — {format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), "MMMM yyyy")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gross Salary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatSalaryCurrency(currentMonthPayroll.payroll.grossSalary)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-destructive">{formatSalaryCurrency(currentMonthPayroll.payroll.deductions)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-[#efaa1f]">{formatSalaryCurrency(currentMonthPayroll.payroll.netPay)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Earnings Breakdown */}
                  {earnings.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Earnings</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {earnings.map((comp: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell>{comp.name}</TableCell>
                                <TableCell className="text-right">{formatSalaryCurrency(comp.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Fines Breakdown */}
                  {fines.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-red-600">Fines & Penalties</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fine Type</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fines.map((fine: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="text-red-600 font-medium">{fine.name}</TableCell>
                                <TableCell className="text-right text-red-600 font-medium">{formatSalaryCurrency(fine.amount)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-red-50 dark:bg-red-950/20">
                              <TableCell className="font-semibold">Total Fines</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">
                                {formatSalaryCurrency(fines.reduce((sum: number, f: any) => sum + (f.amount || 0), 0))}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Other Deductions */}
                  {otherDeductions.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Other Deductions</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {otherDeductions.map((comp: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell>{comp.name}</TableCell>
                                <TableCell className="text-right">{formatSalaryCurrency(comp.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{currentMonthPayroll.payroll.status}</p>
                    </div>
                    {currentMonthPayroll.payroll.payslipUrl && currentMonthPayroll.payroll._id && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const blob = await viewPayslip(currentMonthPayroll.payroll._id).unwrap();
                            const url = window.URL.createObjectURL(blob);
                            window.open(url, '_blank');
                            setTimeout(() => window.URL.revokeObjectURL(url), 100);
                          } catch (error: any) {
                            console.error('Failed to view payslip:', error);
                          }
                        }}
                      >
                        View Payslip
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        <Card>
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Salary Records</CardTitle>
              {/* Month/Year Selector with Calendar Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(new Date(selectedViewYear, selectedViewMonth - 1, 1), "MMMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 border-b">
                    <div className="flex gap-2">
                      <Select
                        value={selectedViewMonth.toString()}
                        onValueChange={(value) => setSelectedViewMonth(Number(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={selectedViewYear.toString()}
                        onValueChange={(value) => setSelectedViewYear(Number(value))}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={new Date(selectedViewYear, selectedViewMonth - 1, 1)}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedViewMonth(date.getMonth() + 1);
                        setSelectedViewYear(date.getFullYear());
                      }
                    }}
                    month={new Date(selectedViewYear, selectedViewMonth - 1)}
                    onMonthChange={(date) => {
                      setSelectedViewMonth(date.getMonth() + 1);
                      setSelectedViewYear(date.getFullYear());
                    }}
                    defaultMonth={new Date(selectedViewYear, selectedViewMonth - 1)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 mt-4">
            {isLoadingPayroll ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                {/* Check if selected month/year has a payroll record */}
                {(() => {
                  const selectedPayroll = salaryData.find(
                    (item) =>
                      item.payroll.month === selectedViewMonth &&
                      item.payroll.year === selectedViewYear
                  );
                  
                  // If payroll exists for selected month/year, show it (unless a specific month is clicked from list)
                  if (selectedPayroll && !selectedMonth) {
                    return (
                      <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">
                            Salary Details — {selectedPayroll.month}
                          </h2>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedViewMonth(currentDate.getMonth() + 1);
                              setSelectedViewYear(currentDate.getFullYear());
                            }}
                          >
                            View All Records
                          </Button>
                        </div>

                        {/* Salary Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Salary</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{formatSalaryCurrency(selectedPayroll.payroll.grossSalary)}</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Deductions</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-destructive">{formatSalaryCurrency(selectedPayroll.payroll.deductions)}</div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-[#efaa1f]">{formatSalaryCurrency(selectedPayroll.payroll.netPay)}</div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Salary Components */}
                        {selectedPayroll.payroll.components && selectedPayroll.payroll.components.length > 0 && (
                          <div className="space-y-6">
                            {/* Earnings */}
                            <div>
                              <h3 className="font-semibold text-lg mb-3">Earnings</h3>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Component</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedPayroll.payroll.components
                                      .filter((comp: any) => comp.type === 'earning')
                                      .map((comp: any, i: number) => (
                                        <TableRow key={i}>
                                          <TableCell>{comp.name}</TableCell>
                                          <TableCell className="text-right">{formatSalaryCurrency(comp.amount)}</TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Deductions */}
                            <div>
                              <h3 className="font-semibold text-lg mb-3">Deductions</h3>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Component</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedPayroll.payroll.components
                                      .filter((comp: any) => comp.type === 'deduction')
                                      .map((comp: any, i: number) => (
                                        <TableRow key={i}>
                                          <TableCell>{comp.name}</TableCell>
                                          <TableCell className="text-right">{formatSalaryCurrency(comp.amount)}</TableCell>
                                        </TableRow>
                                      ))}
                                    {selectedPayroll.payroll.components.filter((comp: any) => comp.type === 'deduction').length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground">No deductions</TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Status and Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="font-semibold capitalize">{selectedPayroll.payroll.status}</p>
                          </div>
                          {selectedPayroll.payroll.payslipUrl && selectedPayroll.payroll._id && (
                            <Button
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const blob = await viewPayslip(selectedPayroll.payroll._id).unwrap();
                                  const url = window.URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                  setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                } catch (error: any) {
                                  console.error('Failed to view payslip:', error);
                                }
                              }}
                            >
                              View Payslip
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  // If no payroll for selected month/year, show message
                  if (!selectedPayroll && !selectedMonth) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">
                          No payroll record found for {format(new Date(selectedViewYear, selectedViewMonth - 1, 1), "MMMM yyyy")}
                        </p>
                        <p className="text-sm">Select a different month/year or view all records below.</p>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
                
                {/* If NO MONTH SELECTED AND NO SELECTED VIEW → List View */}
                {!selectedMonth && !salaryData.find(
                  (item) =>
                    item.payroll.month === selectedViewMonth &&
                    item.payroll.year === selectedViewYear
                ) && (
                  <>

                    {salaryData.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No salary records found</p>
                        <p className="text-sm">No payroll records available for this employee.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {salaryData.map((item, index) => (
                          <div
                            key={index}
                            onClick={() => setSelectedMonth(item)}
                            className="border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/40 cursor-pointer transition"
                          >
                            <div className="flex items-start gap-4 w-full sm:w-auto">
                              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-semibold shrink-0">
                                ₹
                              </div>
                              <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-semibold">{item.month}</h2>
                                <p className="text-sm text-muted-foreground">
                                  Duration: {item.duration}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-left sm:text-right">
                                <p className="text-sm text-muted-foreground">Due Amount</p>
                                <p className="text-lg font-semibold">{item.dueAmount}</p>
                              </div>
                              <ChevronRight className="text-muted-foreground shrink-0" size={22} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* If MONTH SELECTED → Detailed Salary Structure UI */}
                {selectedMonth && selectedMonth.payroll && (
                  <div className="space-y-6">
                    {/* Back Button */}
                    <Button
                      onClick={() => setSelectedMonth(null)}
                      className="w-full sm:w-auto"
                    >
                      <ArrowLeft size={18} className="mr-1" /> Back
                    </Button>

                    {/* Header */}
                    <h2 className="text-xl font-semibold">
                      Salary Details — {selectedMonth.month}
                    </h2>

                    {/* Salary Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Gross Salary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatSalaryCurrency(selectedMonth.payroll.grossSalary)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Deductions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-destructive">{formatSalaryCurrency(selectedMonth.payroll.deductions)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-[#efaa1f]">{formatSalaryCurrency(selectedMonth.payroll.netPay)}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Salary Components */}
                    {selectedMonth.payroll.components && selectedMonth.payroll.components.length > 0 && (
                      <div className="space-y-6">
                        {/* Earnings */}
                        <div>
                          <h3 className="font-semibold text-lg mb-3">Earnings</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Component</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedMonth.payroll.components
                                  .filter((comp: any) => comp.type === 'earning')
                                  .map((comp: any, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell>{comp.name}</TableCell>
                                      <TableCell className="text-right">{formatSalaryCurrency(comp.amount)}</TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Deductions */}
                        <div>
                          <h3 className="font-semibold text-lg mb-3">Deductions</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Component</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedMonth.payroll.components
                                  .filter((comp: any) => comp.type === 'deduction')
                                  .map((comp: any, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell>{comp.name}</TableCell>
                                      <TableCell className="text-right">{formatSalaryCurrency(comp.amount)}</TableCell>
                                    </TableRow>
                                  ))}
                                {selectedMonth.payroll.components.filter((comp: any) => comp.type === 'deduction').length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">No deductions</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status and Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-semibold capitalize">{selectedMonth.payroll.status}</p>
                      </div>
                      {selectedMonth.payroll.payslipUrl && selectedMonth.payroll._id && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              const blob = await viewPayslip(selectedMonth.payroll._id).unwrap();
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, '_blank');
                              setTimeout(() => window.URL.revokeObjectURL(url), 100);
                            } catch (error: any) {
                              console.error('Failed to view payslip:', error);
                            }
                          }}
                        >
                          View Payslip
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // If used in a tab (propEmployeeId provided), return without MainLayout
  if (propEmployeeId) {
    return content;
  }

  // If used standalone, wrap with MainLayout
  return <MainLayout>{content}</MainLayout>;
};

export default SalaryOverview;
