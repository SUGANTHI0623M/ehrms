import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  Calendar, 
  Clock, 
  Wallet as DollarSign, 
  FileText, 
  Wallet, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  LogIn,
  LogOut,
  MapPin
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetEmployeeDashboardQuery, useGetEmployeeProfileQuery } from "@/store/api/employeeApi";
import { useGetEmployeeAttendanceQuery, useGetTodayAttendanceQuery, useMarkAttendanceMutation } from "@/store/api/attendanceApi";
import { useGetEmployeeHolidaysQuery } from "@/store/api/holidayApi";
import { useGetBusinessQuery } from "@/store/api/settingsApi";
import { useGetStaffByIdQuery } from "@/store/api/staffApi";
import { useGetPayrollsQuery, useLazyViewPayslipQuery } from "@/store/api/payrollApi";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO, getDaysInMonth } from "date-fns";
import { useAppSelector } from "@/store/hooks";
import { getLocationWithAddress } from "@/utils/geocoding";
import { message } from "antd";
import { calculateWorkingDays, type WorkingDaysInfo, type FineInfo } from "@/utils/salaryCalculation.util";
import { calculateTotalFine } from "@/utils/fineCalculation.util";
import { 
  calculateSalaryStructure, 
  calculateProratedSalary, 
  formatCurrency,
  type SalaryStructureInputs, 
  type CalculatedSalaryStructure 
} from "@/utils/salaryStructureCalculation.util";
// Helper function to format date
const formatDate = (dateString: string | Date) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const EmployeeDashboard = () => {
  const { data, isLoading, error } = useGetEmployeeDashboardQuery();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const dashboardData = data?.data;
  const stats = dashboardData?.stats;
  const staffId = (dashboardData?.staff as any)?._id;

  // Get current month date range
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDateStr = format(monthStart, "yyyy-MM-dd");
  const endDateStr = format(monthEnd, "yyyy-MM-dd");

  // Fetch attendance for current month
  const { data: attendanceData, isLoading: isLoadingAttendance, refetch: refetchAttendance } = useGetEmployeeAttendanceQuery(
    {
      employeeId: staffId || "current",
      startDate: startDateStr,
      endDate: endDateStr,
      limit: 1000
    },
    { skip: !staffId && !currentUser }
  );

  // Fetch holidays for current month
  const { data: holidaysData, isLoading: isLoadingHolidays } = useGetEmployeeHolidaysQuery(
    {
      year: currentDate.getFullYear(),
      limit: 1000
    },
    { skip: !staffId && !currentUser }
  );

  // Fetch business settings to get weekly-off pattern
  const { data: businessData } = useGetBusinessQuery();
  const weeklyOffPattern = businessData?.data?.business?.settings?.business?.weeklyOffPattern || 'standard';
  const standardWeeklyHolidays = businessData?.data?.business?.settings?.business?.weeklyHolidays || [];

  // Get employee's staff record to fetch salary structure
  const { data: employeeProfileData } = useGetEmployeeProfileQuery(undefined, {
    skip: !currentUser?.id
  });
  const staffDataFromProfile = employeeProfileData?.data?.staffData;
  const staffIdForSalary = staffDataFromProfile?._id || staffId;

  // Fetch full staff details to get complete salary structure
  const { data: staffDataResponse } = useGetStaffByIdQuery(
    staffIdForSalary || "",
    { skip: !staffIdForSalary }
  );
  const staffWithSalary = staffDataResponse?.data?.staff || staffDataFromProfile;

  // Fetch current month payroll data
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const { data: payrollData, isLoading: isLoadingPayroll } = useGetPayrollsQuery({
    employeeId: staffIdForSalary || "",
    month: currentMonth,
    year: currentYear,
    page: 1,
    limit: 1,
  }, {
    skip: !staffIdForSalary
  });
  const currentPayroll = payrollData?.data?.payrolls?.[0];

  // Get today's attendance for quick punch in/out
  const { data: todayData, refetch: refetchToday } = useGetTodayAttendanceQuery();
  const todayAttendance = todayData?.data?.attendance;

  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  const attendanceRecords = attendanceData?.data?.attendance || [];
  const holidays = holidaysData?.data?.holidays || [];
  const monthHolidays = holidays
    .filter(h => new Date(h.date).getMonth() === currentDate.getMonth())
    .map(h => new Date(h.date));

  // Calculate present days from attendance
  const presentDays = attendanceRecords.filter(
    (record: any) => record.status === "Present" || record.status === "Approved"
  ).length;

  // Calculate working days, holidays, and week offs for the month
  const workingDaysInfo = calculateWorkingDays(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    monthHolidays,
    weeklyOffPattern
  );

  // Get salary structure from staff (set by admin)
  const staffSalary = staffWithSalary?.salary;
  
  // Calculate salary structure dynamically from inputs (admin-set structure)
  let calculatedSalary: CalculatedSalaryStructure | null = null;
  let proratedSalary: { proratedGrossSalary: number; proratedDeductions: number; proratedNetSalary: number; attendancePercentage: number } | null = null;
  
  // Check if staff has new salary structure format (set by admin)
  if (staffSalary && 'basicSalary' in staffSalary && staffSalary.basicSalary) {
    // New format - calculate from admin-set inputs
    calculatedSalary = calculateSalaryStructure(staffSalary as SalaryStructureInputs);
    
    // Calculate prorated salary based on attendance (present days / working days)
    proratedSalary = calculateProratedSalary(
      calculatedSalary,
      workingDaysInfo.workingDays,
      presentDays
    );
  } else if (staffSalary && (staffSalary as any).gross) {
    // Old format - fallback to basic calculation
    // This handles legacy data that hasn't been migrated yet
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
  }

  // Always use admin-set salary structure for calculations
  // If payroll is processed, we can show it as reference, but still calculate prorated values
  // based on current attendance for real-time display
  if (currentPayroll && (currentPayroll.status === 'Processed' || currentPayroll.status === 'Paid')) {
    // Update calculatedSalary to reflect processed payroll values for reference
    // But we still use proratedSalary based on current attendance
    if (calculatedSalary) {
      calculatedSalary.monthly.grossSalary = currentPayroll.grossSalary || calculatedSalary.monthly.grossSalary;
      calculatedSalary.monthly.netMonthlySalary = currentPayroll.netPay || calculatedSalary.monthly.netMonthlySalary;
      calculatedSalary.monthly.totalMonthlyDeductions = currentPayroll.deductions || calculatedSalary.monthly.totalMonthlyDeductions;
    }
  }

  // Calculate fine information from attendance records
  const fineInfo: FineInfo = calculateTotalFine(attendanceRecords);
  
  // Apply fine to prorated net salary
  if (proratedSalary && fineInfo.totalFineAmount > 0) {
    proratedSalary.proratedNetSalary = Math.max(0, proratedSalary.proratedNetSalary - fineInfo.totalFineAmount);
  }

  // Calculate week off days based on pattern
  const totalDaysInMonth = getDaysInMonth(currentDate);
  let weekOffDays = 0;
  if (weeklyOffPattern === 'oddEvenSaturday') {
    // Count all Sundays + even Saturdays
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) {
        // All Sundays are off
        weekOffDays++;
      } else if (dayOfWeek === 6 && day % 2 === 0) {
        // Even Saturdays are off
        weekOffDays++;
      }
    }
  } else {
    // Standard pattern: count weekends (Saturday + Sunday)
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekOffDays++;
      }
    }
  }

  // Get user's location
  const getLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    try {
      const locationData = await getLocationWithAddress({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      const address = locationData.address || locationData.formattedAddress;
      const hasValidAddress = address && 
        address !== "Location captured" && 
        !address.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/);
      
      if (!hasValidAddress) {
        const addressParts: string[] = [];
        if (locationData.city) addressParts.push(locationData.city);
        if (locationData.state) addressParts.push(locationData.state);
        if (locationData.country) addressParts.push(locationData.country);
        const builtAddress = addressParts.length > 0 
          ? addressParts.join(', ')
          : `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
        setLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: builtAddress,
        });
      } else {
        setLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: address,
        });
      }
      setIsGettingLocation(false);
    } catch (error: any) {
      setLocationError(error.message || "Failed to get location");
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handlePunchIn = async () => {
    if (!location) {
      message.warning("Please allow location access to punch in");
      getLocation();
      return;
    }
    if (!location.address || location.address === "Location captured") {
      message.warning("Getting location address, please wait...");
      await getLocation();
      if (!location.address || location.address === "Location captured") {
        message.error("Could not get location address. Please try again.");
        return;
      }
    }
    try {
      const now = new Date().toISOString();
      await markAttendance({
        date: new Date().toISOString().split("T")[0],
        punchIn: now,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
      }).unwrap();
      message.success("Punched in successfully!");
      refetchToday();
      refetchAttendance();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to punch in");
    }
  };

  const handlePunchOut = async () => {
    if (!todayAttendance?.punchIn) {
      message.warning("Please punch in first");
      return;
    }
    if (!location) {
      message.warning("Please allow location access to punch out");
      getLocation();
      return;
    }
    if (!location.address || location.address === "Location captured") {
      message.warning("Getting location address, please wait...");
      await getLocation();
      if (!location.address || location.address === "Location captured") {
        message.error("Could not get location address. Please try again.");
        return;
      }
    }
    try {
      const now = new Date().toISOString();
      await markAttendance({
        date: new Date().toISOString().split("T")[0],
        punchOut: now,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
      }).unwrap();
      message.success("Punched out successfully!");
      refetchToday();
      refetchAttendance();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to punch out");
    }
  };

  // Calendar modifiers for attendance status
  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => 
    new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  const getDayStatus = (date: Date) => {
    if (monthHolidays.some(h => isSameDay(h, date))) return "holiday";
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    
    // Check week off based on pattern
    if (weeklyOffPattern === 'oddEvenSaturday') {
      if (dayOfWeek === 0) return "weekend"; // All Sundays are off
      if (dayOfWeek === 6) {
        if (dayOfMonth % 2 === 0) return "weekend"; // Even Saturdays are off
        // Odd Saturdays are working days, continue to check attendance
      }
    } else {
      // Standard pattern: Saturday and Sunday are weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";
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

  const calendarModifiersClassNames = {
    present: "bg-green-100 text-green-800 font-semibold",
    absent: "bg-red-100 text-red-800 font-semibold",
    holiday: "bg-yellow-100 text-yellow-800 font-semibold",
    weekend: "bg-gray-100 text-gray-600",
    "half-day": "bg-blue-100 text-blue-800",
    "on-leave": "bg-purple-100 text-purple-800",
    "pending": "bg-orange-100 text-orange-800",
    "not-marked": "text-muted-foreground",
  };

  // Disable punch in if already punched in, or if status is Present/Absent (manually marked by admin/HR)
  const canPunchIn = !todayAttendance?.punchIn && 
                     todayAttendance?.status !== "Present" && 
                     todayAttendance?.status !== "Absent";
  const canPunchOut = todayAttendance?.punchIn && !todayAttendance?.punchOut;

  const quickActions = [
    { label: "Apply Leave", icon: Calendar, path: "/employee/requests?tab=leave", color: "bg-blue-500" },
    { label: "Request Loan", icon: Wallet, path: "/employee/requests?tab=loan", color: "bg-green-500" },
    { label: "Expense Claim", icon: FileText, path: "/employee/requests?tab=expense", color: "bg-orange-500" },
    { label: "Request Payslip", icon: DollarSign, path: "/employee/requests?tab=payslip", color: "bg-purple-500" },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-destructive">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Error loading dashboard data</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Welcome, {dashboardData?.staff?.name || "Employee"}!</h1>
            <p className="text-muted-foreground mt-1">
              {dashboardData?.staff?.designation} • {dashboardData?.staff?.department}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Leaves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingLeaves || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Loans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeLoans || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Month Salary</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingPayroll ? (
                  <div className="text-sm text-muted-foreground">Loading payroll...</div>
                ) : proratedSalary && calculatedSalary ? (
                  <>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(proratedSalary.proratedNetSalary)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {presentDays} present days out of {workingDaysInfo.workingDays} working days
                    </p>
                    {calculatedSalary && (
                      <p className="text-xs text-green-600 mt-1">
                        Monthly Net: {formatCurrency(calculatedSalary.monthly.netMonthlySalary)}
                      </p>
                    )}
                    {currentPayroll && (currentPayroll.status === 'Processed' || currentPayroll.status === 'Paid') ? (
                      <>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          Processed: {formatCurrency(currentPayroll.netPay || 0)}
                        </p>
                        {currentPayroll.payslipUrl && currentPayroll._id && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto mt-2 text-xs"
                            onClick={async () => {
                              try {
                                const blob = await viewPayslip(currentPayroll._id).unwrap();
                                const url = window.URL.createObjectURL(blob);
                                window.open(url, '_blank');
                                setTimeout(() => window.URL.revokeObjectURL(url), 100);
                              } catch (error: any) {
                                message.error(error?.data?.error?.message || "Failed to view payslip");
                              }
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Payslip
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Payroll not processed yet (Estimated)</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">₹{stats?.currentMonthSalary?.toLocaleString() || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stats?.payrollStatus || "Pending"}</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {presentDays} / {workingDaysInfo.workingDays}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {presentDays} present out of {workingDaysInfo.workingDays} working days
                </p>
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Days:</span>
                    <span className="font-medium">{workingDaysInfo.totalDays}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Holidays:</span>
                    <span className="font-medium text-yellow-600">{workingDaysInfo.holidayCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Salary Overview Card - Based on Admin Salary Structure */}
          {calculatedSalary && proratedSalary && staffSalary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Salary Overview ({format(currentDate, "MMMM yyyy")})
                  {currentPayroll && (currentPayroll.status === 'Processed' || currentPayroll.status === 'Paid') && (
                    <Badge variant="outline" className="ml-2">
                      Processed
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Salary Summary Cards - Showing prorated values based on attendance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="text-sm text-muted-foreground mb-1">Monthly Gross</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(calculatedSalary.monthly.grossSalary)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {currentPayroll && (currentPayroll.status === 'Processed' || currentPayroll.status === 'Paid') 
                          ? 'From processed payroll' 
                          : 'From salary structure'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                      <div className="text-sm text-muted-foreground mb-1">This Month Gross</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(proratedSalary.proratedGrossSalary)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Based on {presentDays} present days out of {workingDaysInfo.workingDays} working days
                      </div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        {proratedSalary.attendancePercentage.toFixed(1)}% attendance
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="text-sm text-muted-foreground mb-1">Monthly Net</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(calculatedSalary.monthly.netMonthlySalary)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {currentPayroll && (currentPayroll.status === 'Processed' || currentPayroll.status === 'Paid') 
                          ? 'From processed payroll' 
                          : 'From salary structure'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-primary/10">
                      <div className="text-sm text-muted-foreground mb-1">This Month Net</div>
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(proratedSalary.proratedNetSalary)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expected take-home this month
                      </div>
                      <div className="text-xs text-primary mt-1 font-medium">
                        {presentDays} days present
                      </div>
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Attendance Summary</span>
                      <Badge variant="outline" className="text-sm">
                        {proratedSalary.attendancePercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Working Days</div>
                        <div className="font-semibold">{workingDaysInfo.workingDays}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Present Days</div>
                        <div className="font-semibold text-green-600">{presentDays}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Absent Days</div>
                        <div className="font-semibold text-red-600">
                          {workingDaysInfo.workingDays - presentDays}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Holidays</div>
                        <div className="font-semibold text-yellow-600">
                          {workingDaysInfo.holidayCount}
                        </div>
                      </div>
                    </div>
                    {/* Fine Summary */}
                    {fineInfo.totalFineAmount > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-red-600">Late Login Fine</span>
                          <span className="text-sm font-bold text-red-600">
                            {formatCurrency(fineInfo.totalFineAmount)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {fineInfo.lateDays} late day(s) • {fineInfo.totalLateMinutes} min late
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Earnings */}
                    <div>
                      <h4 className="text-sm font-semibold text-green-600 mb-2">Monthly Earnings</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm p-2 border rounded bg-green-50 dark:bg-green-950">
                          <span>Basic Salary</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(calculatedSalary.monthly.basicSalary)}
                          </span>
                        </div>
                        {calculatedSalary.monthly.dearnessAllowance > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-green-50 dark:bg-green-950">
                            <span>DA</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(calculatedSalary.monthly.dearnessAllowance)}
                            </span>
                          </div>
                        )}
                        {calculatedSalary.monthly.houseRentAllowance > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-green-50 dark:bg-green-950">
                            <span>HRA</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(calculatedSalary.monthly.houseRentAllowance)}
                            </span>
                          </div>
                        )}
                        {calculatedSalary.monthly.specialAllowance > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-green-50 dark:bg-green-950">
                            <span>Special Allowance</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(calculatedSalary.monthly.specialAllowance)}
                            </span>
                          </div>
                        )}
                        {calculatedSalary.monthly.employerPF > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-green-50 dark:bg-green-950">
                            <span>Employer PF</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(calculatedSalary.monthly.employerPF)}
                            </span>
                          </div>
                        )}
                        {calculatedSalary.monthly.employerESI > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-green-50 dark:bg-green-950">
                            <span>Employer ESI</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(calculatedSalary.monthly.employerESI)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <h4 className="text-sm font-semibold text-red-600 mb-2">Monthly Deductions</h4>
                      <div className="space-y-2">
                        {calculatedSalary.monthly.employeePF > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-red-50 dark:bg-red-950">
                            <span>Employee PF</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(calculatedSalary.monthly.employeePF)}
                            </span>
                          </div>
                        )}
                        {calculatedSalary.monthly.employeeESI > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-red-50 dark:bg-red-950">
                            <span>Employee ESI</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(calculatedSalary.monthly.employeeESI)}
                            </span>
                          </div>
                        )}
                        {fineInfo.totalFineAmount > 0 && (
                          <div className="flex justify-between text-sm p-2 border rounded bg-red-50 dark:bg-red-950">
                            <span>Late Login Fine</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(fineInfo.totalFineAmount)}
                            </span>
                          </div>
                        )}
                        {calculatedSalary.monthly.totalMonthlyDeductions === 0 && fineInfo.totalFineAmount === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No deductions</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTC Summary */}
                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                    <h4 className="text-sm font-semibold mb-3">Total CTC (Annual)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Gross Salary</span>
                        <span className="font-medium">{formatCurrency(calculatedSalary.yearly.annualGrossSalary)}</span>
                      </div>
                      {calculatedSalary.yearly.annualIncentive > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Annual Incentive</span>
                          <span className="font-medium">{formatCurrency(calculatedSalary.yearly.annualIncentive)}</span>
                        </div>
                      )}
                      {calculatedSalary.yearly.totalAnnualBenefits > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Annual Benefits</span>
                          <span className="font-medium">{formatCurrency(calculatedSalary.yearly.totalAnnualBenefits)}</span>
                        </div>
                      )}
                      {calculatedSalary.yearly.annualMobileAllowance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mobile Allowance</span>
                          <span className="font-medium">{formatCurrency(calculatedSalary.yearly.annualMobileAllowance)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t font-bold text-lg">
                        <span>Total CTC</span>
                        <span className="text-blue-600">{formatCurrency(calculatedSalary.totalCTC)}</span>
                      </div>
                    </div>
                  </div>

                  {/* View Full Details Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/employee/salary")}
                  >
                    View Full Salary Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.path}
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => navigate(action.path)}
                    >
                      <div className={`${action.color} p-2 rounded-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Leaves & Today's Attendance */}
          <div >
            {/* This Month Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  This Month Attendance ({format(currentDate, "MMMM yyyy")})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAttendance || isLoadingHolidays ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Quick Punch In/Out for Today */}
                    {isSameDay(new Date(), currentDate) && (
                      <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Today ({format(new Date(), "dd MMM")})</span>
                          {todayAttendance?.status && (
                            <Badge 
                              variant={(todayAttendance.status as string) === 'Present' || (todayAttendance.status as string) === 'Approved' ? 'default' : 'secondary'}
                              className={(todayAttendance.status as string) === 'Present' || (todayAttendance.status as string) === 'Approved' ? 'bg-green-500' : ''}
                            >
                              {todayAttendance.status}
                            </Badge>
                          )}
                        </div>
                        {todayAttendance?.punchIn && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Punch In</span>
                            <span className="font-medium">
                              {new Date(todayAttendance.punchIn).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        {todayAttendance?.punchOut && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Punch Out</span>
                            <span className="font-medium">
                              {new Date(todayAttendance.punchOut).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {canPunchIn && (
                            <Button
                              size="sm"
                              onClick={handlePunchIn}
                              disabled={isMarking || isGettingLocation}
                              className="flex-1"
                            >
                              <LogIn className="w-4 h-4 mr-2" />
                              {isMarking ? "Punching In..." : "Punch In"}
                            </Button>
                          )}
                          {canPunchOut && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handlePunchOut}
                              disabled={isMarking || isGettingLocation}
                              className="flex-1"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              {isMarking ? "Punching Out..." : "Punch Out"}
                            </Button>
                          )}
                        </div>
                        {location && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 mt-0.5" />
                            <span className="line-clamp-2">{location.address}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Month Summary - Working Days, Holidays, Week Offs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{workingDaysInfo.workingDays}</div>
                        <div className="text-xs text-muted-foreground mt-1">Working Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{workingDaysInfo.holidayCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">Holidays</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{weekOffDays}</div>
                        <div className="text-xs text-muted-foreground mt-1">Week Offs</div>
                      </div>
                    </div>

                    {/* Calendar View */}
                    <div className="w-full flex justify-center">
                      <div className="w-full max-w-[350px]">
                        <CalendarComponent
                          mode="single"
                          month={currentDate}
                          selected={undefined}
                          modifiers={calendarModifiers}
                          modifiersClassNames={calendarModifiersClassNames}
                          className="rounded-md border w-full"
                        />
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 shrink-0"></div>
                        <span>Present</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 shrink-0"></div>
                        <span>Absent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 shrink-0"></div>
                        <span>Holiday</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400 shrink-0"></div>
                        <span>Weekend</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
                        <span>Half Day</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0"></div>
                        <span>On Leave</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></div>
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-200 shrink-0"></div>
                        <span>Not Marked</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/employee/attendance")}
                    >
                      View Full Attendance
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeDashboard;

