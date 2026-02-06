import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, MapPin, Wifi, TrendingUp } from "lucide-react";
import { useGetEmployeeAttendanceQuery } from "@/store/api/attendanceApi";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Pagination } from "@/components/ui/Pagination";

interface EmployeeAttendanceProps {
  employeeId?: string;
}

const EmployeeAttendance = ({ employeeId }: EmployeeAttendanceProps) => {
  const [dateRange, setDateRange] = useState<"week" | "month" | "custom">("month");
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case "week":
        return {
          start: format(subDays(today, 7), "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
        };
      case "month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
        };
      default:
        return { start: startDate, end: endDate };
    }
  };

  const { start, end } = getDateRange();

  const { data: attendanceData, isLoading, isError, error } = useGetEmployeeAttendanceQuery(
    {
      employeeId: employeeId || "",
      startDate: start,
      endDate: end,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      limit: pageSize,
    },
    { 
      skip: !employeeId,
      refetchOnMountOrArgChange: true // Ensure data is refetched when employeeId changes
    }
  );

  const attendanceRecords = attendanceData?.data?.attendance || [];
  const pagination = attendanceData?.data?.pagination;

  // Calculate stats from all records in current view
  const stats = {
    present: attendanceRecords.filter((r) => r.status === "Present").length,
    absent: attendanceRecords.filter((r) => r.status === "Absent").length,
    halfDay: attendanceRecords.filter((r) => r.status === "Half Day").length,
    onLeave: attendanceRecords.filter((r) => r.status === "On Leave").length,
    totalDays: attendanceRecords.length,
    totalWorkHours: attendanceRecords.reduce(
      (sum, r) => sum + (r.workHours || 0),
      0
    ),
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "hh:mm a");
  };

  const formatWorkHours = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-500">Present</Badge>;
      case "Absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "Half Day":
        return <Badge variant="secondary">Half Day</Badge>;
      case "On Leave":
        return <Badge variant="outline">On Leave</Badge>;
      default:
        return <Badge variant="secondary">Not Marked</Badge>;
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateRange, startDate, endDate, statusFilter]);

  // Debug logging (can be removed in production)
  useEffect(() => {
    if (employeeId) {
      console.log('[EmployeeAttendance] Component mounted/updated with employeeId:', employeeId);
      console.log('[EmployeeAttendance] Date range:', { start, end, dateRange });
      console.log('[EmployeeAttendance] Query params:', {
        employeeId,
        startDate: start,
        endDate: end,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit: pageSize
      });
    }
  }, [employeeId, start, end, dateRange, statusFilter, page, pageSize]);

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
      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.absent}</div>
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
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-bold">{formatWorkHours(stats.totalWorkHours)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Responsive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Date Range</label>
              <Select
                value={dateRange}
                onValueChange={(value: "week" | "month" | "custom") => {
                  setDateRange(value);
                  if (value === "month") {
                    const today = new Date();
                    setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
                    setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
                  } else if (value === "week") {
                    const today = new Date();
                    setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
                    setEndDate(format(today, "yyyy-MM-dd"));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === "custom" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Not Marked">Not Marked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records Table - Responsive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 sm:py-12 text-destructive">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium mb-2">Error loading attendance</p>
              <p className="text-sm">{(error as any)?.data?.error?.message || "Failed to load attendance records"}</p>
              {employeeId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Employee ID: {employeeId}
                </p>
              )}
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium mb-2">No attendance records found</p>
              <p className="text-sm">No records available for the selected period.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Date</TableHead>
                        <TableHead className="min-w-[100px]">Punch In</TableHead>
                        <TableHead className="min-w-[100px]">Punch Out</TableHead>
                        <TableHead className="min-w-[100px]">Work Hours</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[150px] hidden lg:table-cell">Location</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-xs sm:text-sm">{format(new Date(record.date), "PPP")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                                <span className="text-xs sm:text-sm">{formatTime(record.punchIn)}</span>
                              </div>
                              {record.punchInIpAddress && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 lg:hidden">
                                  <Wifi className="w-3 h-3" />
                                  {record.punchInIpAddress}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                                <span className="text-xs sm:text-sm">{formatTime(record.punchOut)}</span>
                              </div>
                              {record.punchOutIpAddress && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 lg:hidden">
                                  <Wifi className="w-3 h-3" />
                                  {record.punchOutIpAddress}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                              <span className="text-xs sm:text-sm">{formatWorkHours(record.workHours)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[250px]">
                            {record.location?.address ? (
                              <div className="flex items-start gap-1">
                                <MapPin className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs break-words block" title={record.location.address}>
                                    {record.location.address}
                                  </span>
                                  {record.location.latitude && record.location.longitude && (
                                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                      {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {record.ipAddress ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Wifi className="w-3 h-3" />
                                <span className="truncate max-w-[100px]" title={record.ipAddress}>
                                  {record.ipAddress}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </div>

              {/* Pagination - Responsive */}
              {pagination && (
                <div className="mt-4 pt-4 border-t">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={pagination.total}
                    pages={pagination.pages}
                    onPageChange={(newPage) => {
                      setPage(newPage);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setPage(1);
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
  );
};

export default EmployeeAttendance;
