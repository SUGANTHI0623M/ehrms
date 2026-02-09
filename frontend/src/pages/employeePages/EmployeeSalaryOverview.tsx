import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  DollarSign, 
  Calendar as CalendarIcon, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  FileText
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetPayrollsQuery, useGeneratePayslipMutation, useLazyViewPayslipQuery, useLazyDownloadPayslipQuery } from "@/store/api/payrollApi";
import { useGetStaffByIdQuery } from "@/store/api/staffApi";
import { useGetEmployeeAttendanceQuery } from "@/store/api/attendanceApi";
import { useGetEmployeeHolidaysQuery } from "@/store/api/holidayApi";
import { useGetEmployeeProfileQuery } from "@/store/api/employeeApi";
import { useGetBusinessQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { 
  calculateWorkingDays
} from "@/utils/salaryCalculation.util";
import {
  calculateSalaryStructure,
  calculateProratedSalary,
  formatCurrency as formatSalaryCurrency,
  type SalaryStructureInputs,
  type CalculatedSalaryStructure
} from "@/utils/salaryStructureCalculation.util";
import { calculateTotalFine } from "@/utils/fineCalculation.util";
import { format, startOfMonth, endOfMonth, parseISO, isSameDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { message } from "antd";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/Pagination";

const EmployeeSalaryOverview = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // Get employee's staff record from profile API (this already includes salary structure)
  const { data: employeeProfileData, isLoading: isLoadingProfile } = useGetEmployeeProfileQuery(undefined, {
    skip: !currentUser?.id
  });
  
  const staffData = employeeProfileData?.data?.staffData;
  const staffId = staffData?._id;
  
  // Try to fetch full staff details using staff ID (as fallback for complete data)
  // But use staffData from profile as primary source since it already has salary
  const { data: staffDataResponse, isLoading: isLoadingStaff } = useGetStaffByIdQuery(
    staffId || "",
    { skip: !staffId || !currentUser?.id }
  );
  
  // Use staffData from profile first (it has salary), fallback to staffDataResponse if available
  // The profile API already returns the complete staff data including salary structure
  const staff = staffData || staffDataResponse?.data?.staff;
  
  // Debug: Log staff data to help diagnose issues
  useEffect(() => {
    if (staff) {
      console.log('[EmployeeSalaryOverview] Staff data loaded:', {
        hasStaff: !!staff,
        hasSalary: !!staff?.salary,
        salaryKeys: staff?.salary ? Object.keys(staff.salary) : [],
        staffId: staff._id,
        basicSalary: staff?.salary?.basicSalary,
        gross: (staff?.salary as any)?.gross,
        fullSalary: staff?.salary
      });
    } else if (!isLoadingProfile && !isLoadingStaff) {
      console.warn('[EmployeeSalaryOverview] No staff data found after loading', {
        hasProfileData: !!employeeProfileData,
        hasStaffData: !!staffData,
        hasStaffResponse: !!staffDataResponse
      });
    }
  }, [staff, isLoadingProfile, isLoadingStaff, employeeProfileData, staffData, staffDataResponse]);

  // Calculate date range for the selected month
  const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
  const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1));
  const startDateStr = format(monthStart, "yyyy-MM-dd");
  const endDateStr = format(monthEnd, "yyyy-MM-dd");

  // Fetch attendance for the selected month
  const { data: attendanceData, isLoading: isLoadingAttendance } = useGetEmployeeAttendanceQuery(
    {
      employeeId: staffId || "",
      startDate: startDateStr,
      endDate: endDateStr,
      page: 1,
      limit: 100,
    },
    { skip: !staffId }
  );

  // Fetch holidays for the selected month
  const { data: holidaysData, isLoading: isLoadingHolidays } = useGetEmployeeHolidaysQuery(
    {
      year: selectedYear,
      month: selectedMonth,
    },
    { skip: !staffId }
  );

  // Fetch business settings to get weekly-off pattern
  const { data: businessData } = useGetBusinessQuery();
  const weeklyOffPattern = businessData?.data?.business?.settings?.business?.weeklyOffPattern || 'standard';

  // State for payroll pagination
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollPageSize, setPayrollPageSize] = useState(10);

  // Fetch payroll for the selected month/year specifically
  const { data: currentMonthPayrollData, isLoading: isLoadingCurrentPayroll } = useGetPayrollsQuery({
    month: selectedMonth,
    year: selectedYear,
    page: 1,
    limit: 1,
    // Backend will automatically filter by employee role
  }, {
    skip: !currentUser?.id
  });

  // Fetch all payrolls for history table (with pagination)
  const { data: payrollData, isLoading: isLoadingPayroll, refetch: refetchPayroll } = useGetPayrollsQuery({
    page: payrollPage,
    limit: payrollPageSize,
    // Backend will automatically filter by employee role
  }, {
    skip: !currentUser?.id
  });

  const [generatePayslip, { isLoading: isGeneratingPayslip }] = useGeneratePayslipMutation();
  const [viewPayslip] = useLazyViewPayslipQuery();
  const [downloadPayslip] = useLazyDownloadPayslipQuery();

  const handleViewPayslip = async (payrollId: string) => {
    try {
      const blob = await viewPayslip(payrollId).unwrap();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up the URL after a delay to allow the browser to load it
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to view payslip");
    }
  };

  const handleDownloadPayslip = async (payrollId: string, month: number, year: number) => {
    try {
      const blob = await downloadPayslip(payrollId).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      a.download = `Payslip_${monthNames[month - 1]}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Payslip downloaded successfully!");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to download payslip");
    }
  };

  const attendanceRecords = attendanceData?.data?.attendance || [];
  const holidays = holidaysData?.data?.holidays || [];
  const payrolls = payrollData?.data?.payrolls || [];
  const payrollPagination = payrollData?.data?.pagination;
  // Get current month's payroll from the specific query
  const currentPayroll = currentMonthPayrollData?.data?.payrolls?.[0];

  // Calculate present days from attendance
  const presentDays = attendanceRecords.filter(
    (record: any) => record.status === "Present" || record.status === "Approved"
  ).length;

  // Convert holidays to Date array
  const holidayDates = holidays.map((holiday: any) => new Date(holiday.date));

  // Calculate working days info
  const workingDaysInfo = calculateWorkingDays(
    selectedYear,
    selectedMonth - 1, // JavaScript month is 0-indexed
    holidayDates,
    weeklyOffPattern
  );

  // Calculate fine information from attendance records
  const fineInfo = calculateTotalFine(attendanceRecords);

  // Get salary structure from staff and calculate dynamically
  const staffSalary = staff?.salary;
  let calculatedSalary: CalculatedSalaryStructure | null = null;
  let proratedSalary: { proratedGrossSalary: number; proratedDeductions: number; proratedNetSalary: number; attendancePercentage: number } | null = null;
  
  // Check if staff has new salary structure format
  if (staffSalary && 'basicSalary' in staffSalary && typeof staffSalary.basicSalary === 'number' && staffSalary.basicSalary > 0) {
    // New format - calculate from inputs
    calculatedSalary = calculateSalaryStructure(staffSalary as SalaryStructureInputs);
    
    // Calculate prorated salary based on attendance
    proratedSalary = calculateProratedSalary(
      calculatedSalary,
      workingDaysInfo.workingDays,
      presentDays
    );
    
    // Apply fine deductions to prorated net salary
    if (proratedSalary && fineInfo.totalFineAmount > 0) {
      proratedSalary.proratedNetSalary = Math.max(0, proratedSalary.proratedNetSalary - fineInfo.totalFineAmount);
    }
  } else if (staffSalary && (staffSalary as any).gross) {
    // Old format - fallback to basic calculation for legacy data
    const oldSalary = staffSalary as any;
    calculatedSalary = {
      monthly: {
        basicSalary: oldSalary.gross * 0.5, // Estimate
        dearnessAllowance: 0,
        houseRentAllowance: 0,
        specialAllowance: 0,
        grossFixedSalary: oldSalary.gross * 0.8,
        employerPF: 0,
        employerESI: 0,
        grossSalary: oldSalary.gross,
        employeePF: 0,
        employeeESI: 0,
        totalMonthlyDeductions: oldSalary.gross - (oldSalary.net || oldSalary.gross * 0.8),
        netMonthlySalary: oldSalary.net || oldSalary.gross * 0.8,
      },
      yearly: {
        annualGrossSalary: (oldSalary.gross || 0) * 12,
        annualIncentive: 0,
        annualGratuity: 0,
        annualStatutoryBonus: 0,
        medicalInsuranceAmount: 0,
        totalAnnualBenefits: 0,
        annualMobileAllowance: 0,
        annualNetSalary: (oldSalary.net || oldSalary.gross * 0.8) * 12,
      },
      totalCTC: (oldSalary.ctcYearly || oldSalary.gross * 12) || 0,
    };
    
    proratedSalary = calculateProratedSalary(
      calculatedSalary,
      workingDaysInfo.workingDays,
      presentDays
    );
    
    // Apply fine deductions to prorated net salary
    if (proratedSalary && fineInfo.totalFineAmount > 0) {
      proratedSalary.proratedNetSalary = Math.max(0, proratedSalary.proratedNetSalary - fineInfo.totalFineAmount);
    }
  }

  // Calendar modifiers for highlighting days
  const getCalendarModifiers = () => {
    const modifiers: any = {};
    
    // Mark present days
    attendanceRecords.forEach((record: any) => {
      if (record.status === "Present" || record.status === "Approved") {
        const date = new Date(record.date);
        const dateKey = format(date, "yyyy-MM-dd");
        if (!modifiers.present) modifiers.present = [];
        modifiers.present.push(date);
      }
    });

    // Mark absent days
    attendanceRecords.forEach((record: any) => {
      if (record.status === "Absent") {
        const date = new Date(record.date);
        if (!modifiers.absent) modifiers.absent = [];
        modifiers.absent.push(date);
      }
    });

    // Mark holidays
    holidayDates.forEach((date) => {
      if (!modifiers.holiday) modifiers.holiday = [];
      modifiers.holiday.push(date);
    });

    return modifiers;
  };

  const calendarModifiers = getCalendarModifiers();

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      value: month.toString(),
      label: new Date(2000, month - 1).toLocaleString("default", { month: "long" }),
    };
  });

  // Generate year options (last 2 years to current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const isLoading = isLoadingProfile || isLoadingStaff || isLoadingAttendance || isLoadingHolidays;

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Salary Overview</h1>
              <p className="text-muted-foreground mt-1">
                View your salary details based on attendance
              </p>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(Number(value))}
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
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !staff ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Staff record not found. Please contact HR.</p>
              </CardContent>
            </Card>
          ) : !calculatedSalary ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Salary structure not found. Please contact HR to set up your salary structure.</p>
                {staffSalary && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Debug: Salary object exists but missing basicSalary field. Salary keys: {Object.keys(staffSalary || {}).join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
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
                      {formatSalaryCurrency(calculatedSalary.monthly.grossSalary)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Prorated Gross
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
                      {formatSalaryCurrency(calculatedSalary.monthly.netMonthlySalary)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Prorated Net
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {currentPayroll?.netPay !== undefined 
                        ? formatSalaryCurrency(currentPayroll.netPay)
                        : proratedSalary 
                        ? formatSalaryCurrency(proratedSalary.proratedNetSalary) 
                        : "-"}
                    </div>
                    {currentPayroll ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        From processed payroll
                      </p>
                    ) : proratedSalary && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on {presentDays} days {fineInfo.totalFineAmount > 0 && `(Fine: ₹${fineInfo.totalFineAmount.toFixed(2)})`}
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
                      month={new Date(selectedYear, selectedMonth - 1)}
                      className="rounded-md border"
                      modifiers={calendarModifiers}
                      modifiersClassNames={{
                        present: "bg-green-100 text-green-700 font-semibold",
                        absent: "bg-red-100 text-red-700 font-semibold",
                        holiday: "bg-yellow-100 text-yellow-700 font-semibold",
                      }}
                    />
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                        <span>Present Days ({presentDays})</span>
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
                        <span className="text-lg font-bold text-green-600">{presentDays}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="font-medium">Absent Days</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">
                          {workingDaysInfo.workingDays - presentDays}
                        </span>
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
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payroll History Table */}
              {payrolls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payroll History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Gross</TableHead>
                            <TableHead className="text-right">Deductions</TableHead>
                            <TableHead className="text-right">Net Pay</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrolls.map((payroll: any) => {
                            const monthName = monthOptions[payroll.month - 1]?.label;
                            return (
                              <TableRow key={payroll._id}>
                                <TableCell>{monthName} {payroll.year}</TableCell>
                                <TableCell className="text-right">₹{formatSalaryCurrency(payroll.grossSalary || 0)}</TableCell>
                                <TableCell className="text-right text-red-600">₹{formatSalaryCurrency(payroll.deductions || 0)}</TableCell>
                                <TableCell className="text-right text-green-600 font-semibold">₹{formatSalaryCurrency(payroll.netPay || 0)}</TableCell>
                                <TableCell>
                                  <Badge variant={payroll.status === "Paid" ? "default" : payroll.status === "Processed" ? "secondary" : "outline"}>
                                    {payroll.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {payroll.payslipUrl ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadPayslip(payroll._id, payroll.month, payroll.year)}
                                      title="Download PDF"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download PDF
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const result = await generatePayslip(payroll._id).unwrap();
                                          if (result.data.payslipUrl) {
                                            await handleDownloadPayslip(payroll._id, payroll.month, payroll.year);
                                            refetchPayroll();
                                          }
                                        } catch (error: any) {
                                          console.error('Failed to generate payslip:', error);
                                          message.error(error?.data?.error?.message || "Failed to generate payslip");
                                        }
                                      }}
                                      disabled={isGeneratingPayslip}
                                      title="Generate and download payslip"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Generate
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {payrollPagination && payrollPagination.pages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {((payrollPagination.page - 1) * payrollPagination.limit) + 1} to {Math.min(payrollPagination.page * payrollPagination.limit, payrollPagination.total)} of {payrollPagination.total} results
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPayrollPage(p => Math.max(1, p - 1))}
                            disabled={payrollPagination.page === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPayrollPage(p => Math.min(payrollPagination.pages, p + 1))}
                            disabled={payrollPagination.page === payrollPagination.pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Salary Breakdown */}
              {calculatedSalary && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <CardTitle>Salary Breakdown - {monthOptions[selectedMonth - 1]?.label} {selectedYear}</CardTitle>
                      <div className="flex gap-2">
                        {currentPayroll?.payslipUrl && currentPayroll?._id ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => handleViewPayslip(currentPayroll._id)}
                              className="w-full sm:w-auto"
                              title="View in new tab"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Payslip
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDownloadPayslip(currentPayroll._id, currentPayroll.month, currentPayroll.year)}
                              className="w-full sm:w-auto"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                          </>
                        ) : currentPayroll && (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                const result = await generatePayslip(currentPayroll._id).unwrap();
                                if (result.data.payslipUrl) {
                                  await handleViewPayslip(currentPayroll._id);
                                  refetchPayroll();
                                }
                              } catch (error: any) {
                                console.error('Failed to generate payslip:', error);
                                message.error(error?.data?.error?.message || "Failed to generate payslip");
                              }
                            }}
                            disabled={isGeneratingPayslip}
                            className="w-full sm:w-auto"
                            title="Generate and view payslip"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            {isGeneratingPayslip ? "Generating..." : "Generate Payslip"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Show payroll data if available, otherwise show calculated salary */}
                      {currentPayroll ? (
                        <>
                          {/* Payroll Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Gross Salary</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">
                                  {formatSalaryCurrency(currentPayroll.grossSalary || 0)}
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Deductions</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-destructive">
                                  {formatSalaryCurrency(currentPayroll?.deductions || 0)}
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                  {formatSalaryCurrency(currentPayroll?.netPay || 0)}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Payroll Components */}
                          {currentPayroll?.components && currentPayroll.components.length > 0 && (
                            <div className="space-y-6">
                              {/* Earnings */}
                              <div>
                                <h3 className="font-semibold text-lg mb-3 text-green-600">Earnings</h3>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Component</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {currentPayroll.components
                                        .filter((comp: any) => comp.type === 'earning')
                                        .map((comp: any, i: number) => (
                                          <TableRow key={i}>
                                            <TableCell>{comp.name}</TableCell>
                                            <TableCell className="text-right">
                                              {formatSalaryCurrency(comp.amount || 0)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* Deductions */}
                              <div>
                                <h3 className="font-semibold text-lg mb-3 text-red-600">Deductions</h3>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Component</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {currentPayroll.components
                                        .filter((comp: any) => comp.type === 'deduction')
                                        .map((comp: any, i: number) => (
                                          <TableRow key={i}>
                                            <TableCell>{comp.name}</TableCell>
                                            <TableCell className="text-right text-destructive">
                                              {formatSalaryCurrency(comp.amount || 0)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      {currentPayroll.components.filter((comp: any) => comp.type === 'deduction').length === 0 && (
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

                          {/* Status */}
                          {currentPayroll?.status && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-lg mt-6">
                              <div>
                                <p className="text-sm text-muted-foreground">Payroll Status</p>
                                <p className="font-semibold capitalize">{currentPayroll.status}</p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Calculated Salary Breakdown (when payroll not available) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-semibold text-green-600 mb-3">Earnings</h4>
                              <div className="space-y-2">
                                {calculatedSalary.monthly.basicSalary > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>Basic Salary</span>
                                    <span className="font-medium text-green-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.basicSalary)}
                                    </span>
                                  </div>
                                )}
                                {calculatedSalary.monthly.dearnessAllowance > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>DA</span>
                                    <span className="font-medium text-green-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.dearnessAllowance)}
                                    </span>
                                  </div>
                                )}
                                {calculatedSalary.monthly.houseRentAllowance > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>HRA</span>
                                    <span className="font-medium text-green-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.houseRentAllowance)}
                                    </span>
                                  </div>
                                )}
                                {calculatedSalary.monthly.specialAllowance > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>Special Allowance</span>
                                    <span className="font-medium text-green-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.specialAllowance)}
                                    </span>
                                  </div>
                                )}
                                {calculatedSalary.monthly.employerPF > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>Employer PF</span>
                                    <span className="font-medium text-green-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.employerPF)}
                                    </span>
                                  </div>
                                )}
                                {calculatedSalary.monthly.employerESI > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>Employer ESI</span>
                                    <span className="font-medium text-green-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.employerESI)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm p-2 border rounded bg-green-50 dark:bg-green-950 font-bold">
                                  <span>Gross Salary</span>
                                  <span className="font-medium text-green-600">
                                    {formatSalaryCurrency(calculatedSalary.monthly.grossSalary)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-red-600 mb-3">Deductions</h4>
                              <div className="space-y-2">
                                {calculatedSalary.monthly.employeePF > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>Employee PF</span>
                                    <span className="font-medium text-red-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.employeePF)}
                                    </span>
                                  </div>
                                )}
                                {calculatedSalary.monthly.employeeESI > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded">
                                    <span>Employee ESI</span>
                                    <span className="font-medium text-red-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.employeeESI)}
                                    </span>
                                  </div>
                                )}
                                {calculatedSalary.monthly.totalMonthlyDeductions === 0 && (
                                  <div className="text-sm p-2 text-muted-foreground">No deductions</div>
                                )}
                                {calculatedSalary.monthly.totalMonthlyDeductions > 0 && (
                                  <div className="flex justify-between text-sm p-2 border rounded bg-red-50 dark:bg-red-950 font-bold">
                                    <span>Total Deductions</span>
                                    <span className="font-medium text-red-600">
                                      {formatSalaryCurrency(calculatedSalary.monthly.totalMonthlyDeductions)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold">Net Salary (Prorated)</span>
                              <span className="text-2xl font-bold text-primary">
                                {proratedSalary ? formatSalaryCurrency(proratedSalary.proratedNetSalary) : formatSalaryCurrency(calculatedSalary.monthly.netMonthlySalary)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Based on {presentDays} present days out of {workingDaysInfo.workingDays} working days
                              {proratedSalary && ` (${proratedSalary.attendancePercentage.toFixed(1)}% attendance)`}
                            </p>
                            {!currentPayroll && (
                              <p className="text-xs text-yellow-600 mt-2">
                                * This is an estimated calculation. Final amount will be based on processed payroll.
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payroll History Table */}
              {payrolls.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payroll History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month/Year</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Gross Salary</TableHead>
                            <TableHead className="text-right">Deductions</TableHead>
                            <TableHead className="text-right">Net Pay</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingPayroll ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8">
                                Loading payroll history...
                              </TableCell>
                            </TableRow>
                          ) : payrolls.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No payroll records found
                              </TableCell>
                            </TableRow>
                          ) : (
                            payrolls.map((payroll: any) => {
                              const payrollDate = new Date(payroll.year, payroll.month - 1, 1);
                              const monthName = format(payrollDate, "MMMM yyyy");
                              return (
                                <TableRow key={payroll._id}>
                                  <TableCell className="font-medium">{monthName}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        payroll.status === "Paid"
                                          ? "default"
                                          : payroll.status === "Processed"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {payroll.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatSalaryCurrency(payroll.grossSalary || 0)}
                                  </TableCell>
                                  <TableCell className="text-right text-destructive">
                                    {formatSalaryCurrency(payroll.deductions || 0)}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-600">
                                    {formatSalaryCurrency(payroll.netPay || 0)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {payroll.payslipUrl ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadPayslip(payroll._id, payroll.month, payroll.year)}
                                        title="Download PDF"
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download PDF
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Not available</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination for Payroll History */}
                    {payrollPagination && payrollPagination.pages > 1 && (
                      <div className="mt-4">
                        <Pagination
                          page={payrollPage}
                          pageSize={payrollPageSize}
                          total={payrollPagination.total}
                          pages={payrollPagination.pages}
                          onPageChange={(newPage) => {
                            setPayrollPage(newPage);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onPageSizeChange={(newSize) => {
                            setPayrollPageSize(newSize);
                            setPayrollPage(1);
                          }}
                          showPageSizeSelector={true}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeSalaryOverview;
