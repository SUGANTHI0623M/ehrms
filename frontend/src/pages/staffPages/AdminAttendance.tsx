import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, UserCheck, UserX, Users, CheckCircle2, XCircle, AlertCircle, AlertTriangle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetAttendanceQuery, useGetAttendanceStatsQuery, useApproveAttendanceMutation, useUpdateAttendanceMutation, useMarkAttendanceMutation } from "@/store/api/attendanceApi";
import { format, isToday, isSameDay, addDays, subDays, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { message } from "antd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClockTimePicker from "@/components/ui/clock-time-picker";

const AdminAttendance = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("Present");
  const [remarks, setRemarks] = useState<string>("");
  const [punchInTime, setPunchInTime] = useState<Date | undefined>(undefined);
  const [punchOutTime, setPunchOutTime] = useState<Date | undefined>(undefined);
  
  const [updateAttendance] = useUpdateAttendanceMutation();
  const [markAttendance] = useMarkAttendanceMutation();

  // Format selected date for API
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch attendance for selected date - include all employees
  const { data: attendanceData, isLoading: isLoadingAttendance, refetch } = useGetAttendanceQuery({
    date: selectedDateStr,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    limit: pageSize,
    includeAllEmployees: true, // Show all employees even if they haven't marked attendance
  });

  const [approveAttendance] = useApproveAttendanceMutation();

  // Fetch stats for selected date
  const { data: statsData, isLoading: isLoadingStats } = useGetAttendanceStatsQuery({
    date: selectedDateStr
  });

  const attendanceRecords = attendanceData?.data?.attendance || [];
  const pagination = attendanceData?.data?.pagination;
  const stats = statsData?.data?.stats;

  // Reset page when date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  // Navigate to previous/next day
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
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
      case "Pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-100">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      default:
        return <Badge variant="secondary">Not Marked</Badge>;
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
      message.error(error?.data?.error?.message || "Failed to approve attendance");
    }
  };

  const handleUpdate = async () => {
    if (!selectedAttendance) return;

    try {
      // If record doesn't have _id, it means it's a new record - create it
      if (!selectedAttendance._id) {
        const employeeId = (selectedAttendance.employeeId as any)?._id;
        if (!employeeId) {
          message.error("Employee ID is required");
          return;
        }

        const markData: any = {
          employeeId: employeeId,
          date: selectedDateStr,
          status: approvalStatus,
        };

        if (remarks) {
          markData.remarks = remarks;
        }

        if (punchInTime) {
          // Combine selected date with punch in time
          const punchInDate = new Date(selectedDate);
          punchInDate.setHours(punchInTime.getHours());
          punchInDate.setMinutes(punchInTime.getMinutes());
          punchInDate.setSeconds(punchInTime.getSeconds());
          markData.punchIn = punchInDate.toISOString();
        }

        if (punchOutTime) {
          // Combine selected date with punch out time
          const punchOutDate = new Date(selectedDate);
          punchOutDate.setHours(punchOutTime.getHours());
          punchOutDate.setMinutes(punchOutTime.getMinutes());
          punchOutDate.setSeconds(punchOutTime.getSeconds());
          markData.punchOut = punchOutDate.toISOString();
        }

        await markAttendance(markData).unwrap();
        message.success("Attendance created successfully");
      } else {
        // Update existing record
        const updateData: any = {
          status: approvalStatus,
        };

        if (remarks) {
          updateData.remarks = remarks;
        }

        if (punchInTime) {
          // Combine selected date with punch in time
          const punchInDate = new Date(selectedDate);
          punchInDate.setHours(punchInTime.getHours());
          punchInDate.setMinutes(punchInTime.getMinutes());
          punchInDate.setSeconds(punchInTime.getSeconds());
          updateData.punchIn = punchInDate.toISOString();
        } else if (selectedAttendance.punchIn) {
          // Keep existing punch in if not updating
          updateData.punchIn = selectedAttendance.punchIn;
        }

        if (punchOutTime) {
          // Combine selected date with punch out time
          const punchOutDate = new Date(selectedDate);
          punchOutDate.setHours(punchOutTime.getHours());
          punchOutDate.setMinutes(punchOutTime.getMinutes());
          punchOutDate.setSeconds(punchOutTime.getSeconds());
          updateData.punchOut = punchOutDate.toISOString();
        } else if (selectedAttendance.punchOut) {
          // Keep existing punch out if not updating
          updateData.punchOut = selectedAttendance.punchOut;
        }

        await updateAttendance({
          id: selectedAttendance._id,
          data: updateData,
        }).unwrap();
        message.success("Attendance updated successfully");
      }
      
      setSelectedAttendance(null);
      setRemarks("");
      setApprovalStatus("Present");
      setPunchInTime(undefined);
      setPunchOutTime(undefined);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update attendance");
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
          status: status,
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
      message.error(error?.data?.error?.message || "Failed to approve attendance");
    }
  };

  // Get calendar modifiers for highlighting days with attendance
  const getCalendarModifiers = () => {
    // This would need to fetch attendance for the month to highlight days
    // For now, we'll just highlight today
    return {
      today: (date: Date) => isToday(date),
      selected: (date: Date) => isSameDay(date, selectedDate),
    };
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6 max-w-7xl">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Employee Attendance</h1>
              <p className="text-sm text-muted-foreground mt-1">View and manage employee attendance records</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    modifiers={getCalendarModifiers()}
                    modifiersClassNames={{
                      today: "bg-accent text-accent-foreground font-bold",
                      selected: "bg-primary text-primary-foreground",
                    }}
                    className="rounded-md border"
                  />
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <span>Selected Date</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-accent"></div>
                      <span>Today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium">Present</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">{stats?.present || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <UserX className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-medium">Absent</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">{stats?.absent || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium">Punched In</span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">{stats?.punchedIn || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-medium">On Leave</span>
                        </div>
                        <span className="text-lg font-bold text-yellow-600">{stats?.onLeave || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm font-medium">Not Marked</span>
                        </div>
                        <span className="text-lg font-bold text-muted-foreground">{stats?.notMarked || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg border-yellow-200 bg-yellow-50">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-medium">Pending</span>
                        </div>
                        <span className="text-lg font-bold text-yellow-600">{stats?.pending || 0}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Employee List Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <CardTitle>
                      Attendance for {format(selectedDate, "EEEE, MMMM d, yyyy")}
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
                  <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="Pending">
                        Pending
                        {attendanceRecords.filter((r: any) => r.status === "Pending").length > 0 && (
                          <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                            {attendanceRecords.filter((r: any) => r.status === "Pending").length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="Present">Present</TabsTrigger>
                      <TabsTrigger value="Absent">Absent</TabsTrigger>
                      <TabsTrigger value="On Leave">On Leave</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {isLoadingAttendance ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : attendanceRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No attendance records found</p>
                      <p className="text-sm">No employees have marked attendance for this date.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Joining Date</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Punch In</TableHead>
                              <TableHead>Punch Out</TableHead>
                              <TableHead>Work Hours</TableHead>
                              <TableHead>Late/Early</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Leave Type</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceRecords.map((record: any) => {
                              const employee = record.employeeId;
                              const name = (employee as any)?.name || "N/A";
                              const employeeId = (employee as any)?.employeeId || "N/A";
                              const department = (employee as any)?.department || "N/A";
                              const joiningDate = (employee as any)?.joiningDate;
                              
                              return (
                                <TableRow key={record._id || `emp-${employee?._id}`}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{name}</div>
                                      <div className="text-sm text-muted-foreground">{employeeId}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {joiningDate ? format(parseISO(joiningDate), "MMM dd, yyyy") : "-"}
                                  </TableCell>
                                  <TableCell className="text-sm">{department}</TableCell>
                                  <TableCell>
                                    {record.punchIn ? (
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                          <div className="font-medium">{formatTime(record.punchIn)}</div>
                                          {record.punchInIpAddress && (
                                            <div className="text-xs text-muted-foreground">
                                              IP: {record.punchInIpAddress}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {record.punchOut ? (
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                          <div className="font-medium">{formatTime(record.punchOut)}</div>
                                          {record.punchOutIpAddress && (
                                            <div className="text-xs text-muted-foreground">
                                              IP: {record.punchOutIpAddress}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{formatWorkHours(record.workHours)}</TableCell>
                                  <TableCell>
                                    {record.lateMinutes && record.lateMinutes > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-xs text-red-600">
                                          <AlertTriangle className="w-3 h-3" />
                                          <span>Late: {Math.floor(record.lateMinutes / 60)}h {record.lateMinutes % 60}m</span>
                                        </div>
                                        {record.fineAmount && record.fineAmount > 0 && (
                                          <div className="text-xs text-red-600 font-medium">
                                            Fine: ₹{record.fineAmount.toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                                  <TableCell>
                                    {record.leaveType ? (
                                      <Badge variant="outline" className="text-xs">
                                        {record.leaveType}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {record.location ? (
                                      <div className="flex items-start gap-1 text-xs max-w-[250px]">
                                        <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                          {record.location.address ? (
                                            <>
                                              <span 
                                                className="block break-words font-medium" 
                                                title={record.location.address}
                                              >
                                                {record.location.address}
                                              </span>
                                              {record.location.latitude && record.location.longitude && (
                                                <span className="text-muted-foreground text-[10px] mt-0.5 block">
                                                  {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <>
                                              <span className="block break-words text-muted-foreground">
                                                {record.location.latitude?.toFixed(4)}, {record.location.longitude?.toFixed(4)}
                                              </span>
                                              <span className="text-[10px] text-muted-foreground mt-0.5 block italic">
                                                Address not available
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {record.status === "Pending" ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="default"
                                            className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                                            onClick={() => handleQuickApprove(record, "Present")}
                                            title="Mark as Present"
                                          >
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Present
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                              setSelectedAttendance(record);
                                              setApprovalStatus("Present");
                                              setRemarks("");
                                              setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
                                              setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
                                            }}
                                            title="More Options"
                                          >
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Options
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => {
                                            setSelectedAttendance(record);
                                            setApprovalStatus(record.status || "Not Marked");
                                            setRemarks(record.remarks || "");
                                            setPunchInTime(record.punchIn ? parseISO(record.punchIn) : undefined);
                                            setPunchOutTime(record.punchOut ? parseISO(record.punchOut) : undefined);
                                          }}
                                          title="Update Attendance"
                                        >
                                          {record._id ? "Edit" : "Add"}
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
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
        </div>

        {/* Edit/Approve Dialog */}
        <Dialog open={!!selectedAttendance} onOpenChange={() => {
          setSelectedAttendance(null);
          setRemarks("");
          setApprovalStatus("Present");
          setPunchInTime(undefined);
          setPunchOutTime(undefined);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAttendance?._id ? "Edit Attendance" : "Add Attendance"}</DialogTitle>
            </DialogHeader>
            
            {selectedAttendance && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    <div className="font-medium">
                      {(selectedAttendance.employeeId as any)?.name || "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(selectedAttendance.employeeId as any)?.employeeId || "N/A"}
                    </div>
                    {(selectedAttendance.employeeId as any)?.joiningDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Joining Date: {format(parseISO((selectedAttendance.employeeId as any).joiningDate), "MMM dd, yyyy")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </div>
                </div>

                {/* Late/Early Info */}
                {(selectedAttendance.lateMinutes || selectedAttendance.fineAmount) && (
                  <div className="p-3 border rounded-md bg-yellow-50 border-yellow-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Fine Information
                    </div>
                    {selectedAttendance.lateMinutes && selectedAttendance.lateMinutes > 0 && (
                      <div className="text-sm text-yellow-700">
                        Late Login: {Math.floor(selectedAttendance.lateMinutes / 60)}h {selectedAttendance.lateMinutes % 60}m
                      </div>
                    )}
                    {selectedAttendance.fineAmount && selectedAttendance.fineAmount > 0 && (
                      <div className="text-sm font-medium text-yellow-800 mt-1">
                        Fine Amount: ₹{selectedAttendance.fineAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}

                {/* Editable Punch In Time */}
                <div className="space-y-2">
                  <Label htmlFor="punchIn">Punch In Time</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Clock className="mr-2 h-4 w-4" />
                          {punchInTime ? formatTime(punchInTime.toISOString()) : (selectedAttendance.punchIn ? formatTime(selectedAttendance.punchIn) : "Not set")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <ClockTimePicker
                          date={punchInTime || (selectedAttendance.punchIn ? parseISO(selectedAttendance.punchIn) : selectedDate)}
                          setDate={(date) => {
                            if (date) {
                              // Combine selected date with punch in time
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
                    {selectedAttendance.punchIn && !punchInTime && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPunchInTime(parseISO(selectedAttendance.punchIn))}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Editable Punch Out Time */}
                <div className="space-y-2">
                  <Label htmlFor="punchOut">Punch Out Time</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Clock className="mr-2 h-4 w-4" />
                          {punchOutTime ? formatTime(punchOutTime.toISOString()) : (selectedAttendance.punchOut ? formatTime(selectedAttendance.punchOut) : "Not set")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <ClockTimePicker
                          date={punchOutTime || (selectedAttendance.punchOut ? parseISO(selectedAttendance.punchOut) : selectedDate)}
                          setDate={(date) => {
                            if (date) {
                              // Combine selected date with punch out time
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
                    {selectedAttendance.punchOut && !punchOutTime && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPunchOutTime(parseISO(selectedAttendance.punchOut))}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="Half Day">Half Day</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Add any remarks or notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAttendance(null);
                  setRemarks("");
                  setApprovalStatus("Present");
                  setPunchInTime(undefined);
                  setPunchOutTime(undefined);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
};

export default AdminAttendance;

