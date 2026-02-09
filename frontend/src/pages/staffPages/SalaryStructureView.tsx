import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Receipt, Users, Search, ChevronRight, Upload, FileText, Calendar as CalendarIcon, DollarSign, TrendingUp } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetStaffByIdQuery, useGetStaffQuery, useUploadOfferLetterMutation } from "@/store/api/staffApi";
import { useGetEmployeeAttendanceQuery } from "@/store/api/attendanceApi";
import { useGetEmployeeHolidaysQuery } from "@/store/api/holidayApi";
import { useGetBusinessQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  calculateWorkingDays, 
  calculateSalaryByWorkingDays,
  formatCurrency,
  type SalaryStructure,
  type WorkingDaysInfo 
} from "@/utils/salaryCalculation.util";
import { format } from "date-fns";

interface SalaryStructureViewProps {
  employeeId?: string; // For when used in a tab
}

const SalaryStructureView = ({ employeeId: propEmployeeId }: SalaryStructureViewProps = {}) => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAppSelector((state) => state.auth.user);
  const isEmployee = currentUser?.role === "Employee" || currentUser?.role === "EmployeeAdmin";
  const employeeId = propEmployeeId || routeId;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeId || "");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Staff list state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("all");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch staff list (only when no employeeId)
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
    navigate(`/salary-structure/${staffId}`);
  };

  // Fetch staff details - refetch when selectedEmployeeId or route changes
  const { data: staffDataResponse, isLoading: isLoadingStaffDetail } = useGetStaffByIdQuery(selectedEmployeeId || "", {
    skip: !selectedEmployeeId,
    refetchOnMountOrArgChange: true // Ensure data refetches when route changes
  });

  const staff = staffDataResponse?.data?.staff;
  const currentEmployeeId = selectedEmployeeId;

  // Calculate date range for current month
  const startDate = new Date(selectedYear, selectedMonth - 1, 1);
  const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch attendance for current month
  const { data: attendanceData, isLoading: isLoadingAttendance } = useGetEmployeeAttendanceQuery(
    {
      employeeId: currentEmployeeId || "",
      startDate: startDateStr,
      endDate: endDateStr,
      limit: 1000
    },
    { skip: !currentEmployeeId }
  );

  // Fetch holidays for current year
  const { data: holidaysData, isLoading: isLoadingHolidays } = useGetEmployeeHolidaysQuery(
    {
      year: selectedYear,
      limit: 1000
    },
    { skip: !currentEmployeeId }
  );

  // Fetch business settings to get weekly-off pattern
  const { data: businessData } = useGetBusinessQuery();
  const weeklyOffPattern = businessData?.data?.business?.settings?.business?.weeklyOffPattern || 'standard';

  // Offer letter upload
  const [uploadOfferLetter, { isLoading: isUploadingOfferLetter }] = useUploadOfferLetterMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOfferLetterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedEmployeeId) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      return;
    }

    try {
      await uploadOfferLetter({
        staffId: selectedEmployeeId,
        file,
      }).unwrap();
      
      toast.success('Offer letter uploaded and salary structure extracted!');
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || 'Failed to upload offer letter');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Calculate present days from attendance
  const attendanceRecords = Array.isArray(attendanceData?.data?.attendance) 
    ? attendanceData.data.attendance 
    : [];
  const presentDays = attendanceRecords.filter(a => a && a.status === 'Present').length;
  const absentDays = attendanceRecords.filter(a => a && a.status === 'Absent').length;

  // Get holidays for current month
  const holidays = Array.isArray(holidaysData?.data?.holidays) 
    ? holidaysData.data.holidays 
    : [];
  const monthHolidays = holidays
    .filter((h: any) => {
      if (!h || !h.date) return false;
      try {
        const holidayDate = new Date(h.date);
        return holidayDate.getMonth() + 1 === selectedMonth && holidayDate.getFullYear() === selectedYear;
      } catch {
        return false;
      }
    })
    .map((h: any) => {
      try {
        return new Date(h.date);
      } catch {
        return null;
      }
    })
    .filter((d: Date | null): d is Date => d !== null);

  // Calculate working days
  const workingDaysInfo = calculateWorkingDays(selectedYear, selectedMonth - 1, monthHolidays, weeklyOffPattern);
  
  // Prepare salary structure
  const salaryData = staff?.salary;
  let calculatedSalary = null;
  
  if (salaryData && salaryData.components && Array.isArray(salaryData.components) && salaryData.components.length > 0) {
    // Use monthly amounts from the parsed structure
    const salaryStructure: SalaryStructure = {
      gross: salaryData.grossMonthly || salaryData.gross || 0,
      net: salaryData.netMonthly || salaryData.net || 0,
      components: salaryData.components
        .filter((c: any) => c && typeof c === 'object')
        .map((c: any) => ({
          name: c.name || 'Unknown',
          amount: c.amountMonthly || c.amount || 0,
          type: c.type || 'earning'
        }))
    };

    const workingDaysData: WorkingDaysInfo = {
      totalDaysInMonth: workingDaysInfo.totalDays,
      workingDays: workingDaysInfo.workingDays,
      presentDays,
      absentDays: workingDaysInfo.workingDays - presentDays,
      holidays: workingDaysInfo.holidayCount,
      weekends: workingDaysInfo.weekends
    };

    calculatedSalary = calculateSalaryByWorkingDays(salaryStructure, workingDaysData);
  }

  // If no employee ID, show staff list
  if (!selectedEmployeeId) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Receipt className="w-6 h-6 sm:w-8 sm:h-8" />
                Salary Structure
              </h1>
              <Button variant="outline" onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/staff');
                }
              }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Select Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, employee ID, or designation..."
                      className="w-full pl-10 pr-4 py-2 border rounded-md"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
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
                            <TableHead className="text-right">Action</TableHead>
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
                                  View Structure
                                  <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

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
      </MainLayout>
    );
  }

  if (isLoadingStaffDetail) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full mt-4" />
        </div>
      </MainLayout>
    );
  }

  if (!staff) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
          <div className="text-center py-8 text-muted-foreground">
            Staff member not found.
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
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
                      navigate('/salary-structure');
                    }
                  }}
                  className="shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Salary Structure</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {staff.name} ({staff.employeeId})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Info Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                    <AvatarFallback className="text-lg sm:text-xl">
                      {staff.name?.charAt(0).toUpperCase() || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">{staff.name}</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      ID {staff.employeeId} | {staff.staffType} ({staff.designation})
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleOfferLetterUpload}
                    className="hidden"
                    id="offer-letter-upload"
                    disabled={isUploadingOfferLetter}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingOfferLetter}
                    className="w-full sm:w-auto"
                  >
                    {isUploadingOfferLetter ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-pulse" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Offer Letter
                      </>
                    )}
                  </Button>
                  {staff?.offerLetterUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(staff.offerLetterUrl, '_blank')}
                      className="w-full sm:w-auto"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Offer Letter
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month/Year Selector */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle>Salary Calculation</CardTitle>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {format(new Date(selectedYear, month - 1, 1), 'MMMM')}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-2 border rounded-md"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Attendance Summary */}
              {isLoadingAttendance ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Working Days</p>
                    <p className="text-2xl font-bold">{workingDaysInfo.workingDays}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-muted-foreground">Present Days</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{presentDays}</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-sm text-muted-foreground">Absent Days</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {workingDaysInfo.workingDays - presentDays}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-muted-foreground">Holidays</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{workingDaysInfo.holidayCount}</p>
                  </div>
                </div>
              )}

              {/* Salary Breakdown */}
              {!salaryData || !salaryData.components || salaryData.components.length === 0 ? (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    No salary structure found. Please upload an offer letter to extract the salary structure.
                  </AlertDescription>
                </Alert>
              ) : calculatedSalary ? (
                <>
                  {/* Calculated Salary Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-primary/5">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Monthly Gross</p>
                        <p className="text-2xl font-bold">{formatCurrency(salaryData.gross || 0)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 dark:bg-green-950">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Prorated Gross</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(calculatedSalary.gross)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {calculatedSalary.breakdown.attendancePercentage.toFixed(1)}% attendance
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 dark:bg-blue-950">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Prorated Net</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(calculatedSalary.net)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          After deductions
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Salary Components */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Salary Components</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Component</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Monthly Amount</TableHead>
                            <TableHead className="text-right">Prorated Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {calculatedSalary.components.map((comp, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{comp.name}</TableCell>
                              <TableCell>
                                <Badge variant={comp.type === 'earning' ? 'default' : 'secondary'}>
                                  {comp.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(salaryData.components[idx]?.amountMonthly || salaryData.components[idx]?.amount || 0)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(comp.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Calendar View for Employees */}
          {isEmployee && calculatedSalary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Monthly Calendar - {format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Calendar */}
                  <div className="lg:col-span-2">
                    <Calendar
                      mode="single"
                      month={new Date(selectedYear, selectedMonth - 1, 1)}
                      onMonthChange={(date) => {
                        if (date) {
                          setSelectedMonth(date.getMonth() + 1);
                          setSelectedYear(date.getFullYear());
                        }
                      }}
                      className="rounded-md border"
                      modifiers={{
                        present: attendanceRecords
                          .filter(a => a && a.status === 'Present' && a.date)
                          .map(a => {
                            try {
                              const date = new Date(a.date);
                              if (isNaN(date.getTime())) return null;
                              return new Date(selectedYear, selectedMonth - 1, date.getDate());
                            } catch {
                              return null;
                            }
                          })
                          .filter((d): d is Date => d !== null),
                        absent: attendanceRecords
                          .filter(a => a && a.status === 'Absent' && a.date)
                          .map(a => {
                            try {
                              const date = new Date(a.date);
                              if (isNaN(date.getTime())) return null;
                              return new Date(selectedYear, selectedMonth - 1, date.getDate());
                            } catch {
                              return null;
                            }
                          })
                          .filter((d): d is Date => d !== null),
                        holiday: monthHolidays.map(h => {
                          return new Date(selectedYear, selectedMonth - 1, h.getDate());
                        }),
                        weekend: (() => {
                          const weekends: Date[] = [];
                          for (let day = 1; day <= workingDaysInfo.totalDays; day++) {
                            const date = new Date(selectedYear, selectedMonth - 1, day);
                            const dayOfWeek = date.getDay();
                            if (dayOfWeek === 0 || dayOfWeek === 6) {
                              weekends.push(date);
                            }
                          }
                          return weekends;
                        })()
                      }}
                      modifiersClassNames={{
                        present: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-semibold",
                        absent: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 font-semibold",
                        holiday: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold",
                        weekend: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      }}
                    />
                  </div>

                  {/* Legend and Summary */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Legend</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700"></div>
                          <span className="text-sm">Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700"></div>
                          <span className="text-sm">Absent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"></div>
                          <span className="text-sm">Holiday</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                          <span className="text-sm">Weekend</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <h3 className="font-semibold mb-3">Salary Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Working Days:</span>
                          <span className="font-semibold">{workingDaysInfo.workingDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Present Days:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">{presentDays}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Absent Days:</span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {workingDaysInfo.workingDays - presentDays}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Holidays:</span>
                          <span className="font-semibold">{workingDaysInfo.holidayCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Attendance:</span>
                          <span className="font-semibold">
                            {calculatedSalary.breakdown.attendancePercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Estimated Salary:</span>
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(calculatedSalary.net)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on {presentDays} present days
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Holiday List */}
                    {monthHolidays.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Holidays This Month</h3>
                        <div className="space-y-2">
                          {monthHolidays.map((holiday, idx) => {
                            const holidayData = holidays.find((h: any) => {
                              const hDate = new Date(h.date);
                              return hDate.getTime() === holiday.getTime();
                            });
                            return (
                              <div key={idx} className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                                <div className="font-medium">{format(holiday, 'MMM dd')}</div>
                                {holidayData && (
                                  <div className="text-xs text-muted-foreground">{holidayData.name}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SalaryStructureView;

