import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Clock, MapPin, LogIn, LogOut, Calendar, AlertCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetTodayAttendanceQuery,
  useGetEmployeeAttendanceQuery,
  useMarkAttendanceMutation,
  useCanMarkAttendanceQuery,
} from "@/store/api/attendanceApi";
import { useGetEmployeeHolidaysQuery } from "@/store/api/holidayApi";
import { useGetBusinessQuery } from "@/store/api/settingsApi";
import { useGetEmployeeProfileQuery } from "@/store/api/employeeApi";
import { useGetStaffByIdQuery } from "@/store/api/staffApi";
import { message } from "antd";
import { useAppSelector } from "@/store/hooks";
import { format, startOfMonth, endOfMonth, subDays, isSameDay, parseISO, getDaysInMonth, getDay } from "date-fns";
import { Pagination } from "@/components/ui/pagination";
import { getLocationWithAddress } from "@/utils/geocoding";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const EmployeeAttendance = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get today's attendance
  const { data: todayData, isLoading: isLoadingToday, refetch: refetchToday } = useGetTodayAttendanceQuery();
  
  // Check if attendance can be marked
  const { data: canMarkData } = useCanMarkAttendanceQuery({ date: format(new Date(), "yyyy-MM-dd") });

  // Get employee attendance history - backend will resolve employeeId from current user
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<"week" | "month" | "custom">("month");
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Calculate date range based on selection - useMemo to ensure it updates when filters change
  const { start, end } = useMemo(() => {
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
  }, [dateRange, startDate, endDate]);

  const { data: historyData, isLoading: isLoadingHistory } = useGetEmployeeAttendanceQuery(
    { 
      employeeId: "current", 
      startDate: start,
      endDate: end,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: historyPage, 
      limit: historyPageSize 
    },
    { 
      skip: !currentUser,
      refetchOnMountOrArgChange: true
    }
  );

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [dateRange, startDate, endDate, statusFilter]);

  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  const todayAttendance = todayData?.data?.attendance;
  const attendanceHistory = historyData?.data?.attendance || [];
  const historyPagination = historyData?.data?.pagination;

  // Get user's location with address
  const getLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const locationData = await getLocationWithAddress({
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for geocoding
        maximumAge: 0,
        // OpenCage API key is automatically loaded from environment variable
        // Set VITE_OPENCAGE_API_KEY in your .env file
      });

      // Ensure we have a proper address (not just coordinates or "Location captured")
      const address = locationData.address || locationData.formattedAddress;
      const hasValidAddress = address && 
        address !== "Location captured" && 
        !address.match(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/); // Not just coordinates

      if (!hasValidAddress) {
        // If address is not valid, try to build it from components
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

  // Auto-get location on component mount
  useEffect(() => {
    getLocation();
  }, []);

  const handlePunchIn = async () => {
    if (!location) {
      message.warning("Please allow location access to punch in");
      getLocation();
      return;
    }

    // Ensure address is present
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
          address: location.address, // Ensure address is included
        },
      }).unwrap();

      message.success("Punched in successfully!");
      refetchToday();
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

    // Ensure address is present - refresh location if needed
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
          address: location.address, // Ensure address is included
        },
      }).unwrap();

      message.success("Punched out successfully!");
      refetchToday();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to punch out");
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatWorkHours = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Use the canMarkAttendance endpoint to determine if attendance can be marked
  const canPunchIn = canMarkData?.data?.canPunchIn ?? (!todayAttendance?.punchIn && 
                     todayAttendance?.status !== "Present" && 
                     todayAttendance?.status !== "Absent");
  const canPunchOut = canMarkData?.data?.canPunchOut ?? (todayAttendance?.punchIn && !todayAttendance?.punchOut);
  const attendanceReason = canMarkData?.data?.reason;
  const shiftHalfDayInfo = canMarkData?.data?.shiftHalfDayInfo;

  // Fetch staff data to get weekly holiday template
  const { data: employeeProfileData } = useGetEmployeeProfileQuery(undefined, {
    skip: !currentUser?.id
  });
  const staffIdForTemplate = employeeProfileData?.data?.staffData?._id;
  
  const { data: staffDataResponse } = useGetStaffByIdQuery(
    staffIdForTemplate || "",
    { skip: !staffIdForTemplate }
  );
  const staffWithTemplate = staffDataResponse?.data?.staff || employeeProfileData?.data?.staffData;

  // Get weekly holiday settings from staff template or business settings
  const { data: businessData } = useGetBusinessQuery();
  
  // Check if staff has a weekly holiday template assigned
  const weeklyHolidayTemplate = (staffWithTemplate as any)?.weeklyHolidayTemplateId;
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
  }, [weeklyHolidayTemplate, isWeeklyHolidayTemplatePopulated, businessData, staffWithTemplate]);
  
  const weeklyOffPattern = weeklyHolidaySettings.weeklyOffPattern;
  const weeklyHolidays = weeklyHolidaySettings.weeklyHolidays;

  // Debug logging for weekly holiday settings
  useEffect(() => {
    if (staffWithTemplate && currentUser) {
      console.log('[EmployeeAttendance] Weekly Holiday Settings:', {
        employeeId: (staffWithTemplate as any).employeeId || (staffWithTemplate as any)._id,
        employeeName: (staffWithTemplate as any).name,
        hasWeeklyHolidayTemplate: !!weeklyHolidayTemplate,
        isTemplatePopulated: isWeeklyHolidayTemplatePopulated,
        templateName: (weeklyHolidayTemplate as any)?.name,
        weeklyOffPattern,
        weeklyHolidays: weeklyHolidays.map((wh: any) => ({ day: wh.day, name: wh.name })),
        source: isWeeklyHolidayTemplatePopulated ? 'staff_template' : 'business_settings'
      });
    }
  }, [staffWithTemplate, currentUser, weeklyHolidayTemplate, isWeeklyHolidayTemplatePopulated, weeklyOffPattern, weeklyHolidays]);

  // Fetch holidays for current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const { data: holidaysData } = useGetEmployeeHolidaysQuery(
    {
      year: currentYear,
      month: currentMonth,
    },
    { skip: !currentUser }
  );
  const holidays = holidaysData?.data?.holidays || [];
  const monthHolidays = holidays
    .filter((h: any) => {
      const holidayDate = new Date(h.date);
      return holidayDate.getMonth() === currentDate.getMonth() && holidayDate.getFullYear() === currentYear;
    })
    .map((h: any) => new Date(h.date));

  // Get all attendance records for current month for calendar display
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const { data: monthAttendanceData } = useGetEmployeeAttendanceQuery(
    {
      employeeId: "current",
      startDate: format(monthStart, "yyyy-MM-dd"),
      endDate: format(monthEnd, "yyyy-MM-dd"),
      page: 1,
      limit: 100
    },
    {
      skip: !currentUser
    }
  );
  const monthAttendanceRecords = monthAttendanceData?.data?.attendance || [];

  // Calculate total days in month
  const totalDaysInMonth = getDaysInMonth(currentDate);

  // Check if a day is week off
  const isWeekOff = (date: Date): boolean => {
    const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
    const dayOfMonth = date.getDate();

    if (weeklyOffPattern === 'oddEvenSaturday') {
      // Odd/Even Saturday pattern
      if (dayOfWeek === 0) {
        return true; // All Sundays are off
      } else if (dayOfWeek === 6) {
        return dayOfMonth % 2 === 0; // Even Saturdays are off
      }
      return false;
    } else {
      // Standard pattern: Use weeklyHolidays array if provided
      if (weeklyHolidays && weeklyHolidays.length > 0) {
        return weeklyHolidays.some((wh: any) => wh.day === dayOfWeek);
      } else {
        // Default: Saturday and Sunday are weekends
        return dayOfWeek === 0 || dayOfWeek === 6;
      }
    }
  };

  // Build calendar day statuses
  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) =>
    new Date(currentYear, currentDate.getMonth(), i + 1)
  );

  const getDayStatus = (date: Date) => {
    if (monthHolidays.some(h => isSameDay(h, date))) return "holiday";
    const dayOfWeek = getDay(date);
    const dayOfMonth = date.getDate();

    // Check week off based on pattern
    if (weeklyOffPattern === 'oddEvenSaturday') {
      if (dayOfWeek === 0) return "weekend"; // All Sundays are off
      if (dayOfWeek === 6) {
        if (dayOfMonth % 2 === 0) return "weekend"; // Even Saturdays are off
        // Odd Saturdays are working days, continue to check attendance
      }
    } else {
      // Standard pattern: Use weeklyHolidays array if provided, otherwise default to Saturday and Sunday
      if (weeklyHolidays && weeklyHolidays.length > 0) {
        if (weeklyHolidays.some((wh: any) => wh.day === dayOfWeek)) return "weekend";
      } else {
        // Default: Saturday and Sunday are weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) return "weekend";
      }
    }

    const attendance = monthAttendanceRecords.find((record: any) => isSameDay(parseISO(record.date), date));
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

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Attendance</h1>
            <p className="text-muted-foreground mt-1">Mark your daily attendance</p>
          </div>

          {/* Today's Attendance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Today's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingToday ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Location Status */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium mb-1">Location Status</div>
                        {isGettingLocation ? (
                          <div className="text-sm text-muted-foreground">Getting location...</div>
                        ) : location ? (
                          <div className="text-sm">
                            <div className="text-green-600 font-medium">Location captured</div>
                            <div className="text-muted-foreground mt-1">{location.address}</div>
                          </div>
                        ) : locationError ? (
                          <div className="text-sm text-destructive">
                            {locationError}
                            <Button
                              variant="link"
                              size="sm"
                              className="ml-2 h-auto p-0"
                              onClick={getLocation}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Location not available</div>
                        )}
                      </div>
                      {!location && !isGettingLocation && (
                        <Button variant="outline" size="sm" onClick={getLocation}>
                          Get Location
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Punch In/Out Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Punch In</div>
                          <div className="text-sm text-muted-foreground">
                            {todayAttendance?.punchIn
                              ? formatTime(todayAttendance.punchIn)
                              : "Not punched in"}
                          </div>
                        </div>
                        {todayAttendance?.punchInIpAddress && (
                          <Badge variant="outline" className="text-xs">
                            IP: {todayAttendance.punchInIpAddress}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={handlePunchIn}
                        disabled={!canPunchIn || isMarking || !location}
                        className="w-full"
                        size="lg"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        {isMarking ? "Processing..." : "Punch In"}
                      </Button>
                      {attendanceReason && !canPunchIn && (
                        <div className="space-y-1 mt-2">
                          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{attendanceReason}</span>
                          </div>
                          {shiftHalfDayInfo && (
                            <div className="text-xs text-muted-foreground ml-5">
                              {shiftHalfDayInfo.midpointTime && (
                                <span>Midpoint: {shiftHalfDayInfo.midpointTime} • </span>
                              )}
                              {shiftHalfDayInfo.firstHalfEndTime && (
                                <span>First Half ends: {shiftHalfDayInfo.firstHalfEndTime} • </span>
                              )}
                              {shiftHalfDayInfo.secondHalfStartTime && (
                                <span>Second Half starts: {shiftHalfDayInfo.secondHalfStartTime}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Punch Out</div>
                          <div className="text-sm text-muted-foreground">
                            {todayAttendance?.punchOut
                              ? formatTime(todayAttendance.punchOut)
                              : "Not punched out"}
                          </div>
                        </div>
                        {todayAttendance?.punchOutIpAddress && (
                          <Badge variant="outline" className="text-xs">
                            IP: {todayAttendance.punchOutIpAddress}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={handlePunchOut}
                        disabled={!canPunchOut || isMarking || !location}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {isMarking ? "Processing..." : "Punch Out"}
                      </Button>
                    </div>
                  </div>

                  {/* Today's Summary */}
                  {todayAttendance && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="mt-1">
                          <Badge
                            variant={
                              todayAttendance.status === "Present"
                                ? "default"
                                : todayAttendance.status === "On Leave"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {todayAttendance.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Work Hours</div>
                        <div className="mt-1 font-medium">
                          {formatWorkHours(todayAttendance.workHours)}
                        </div>
                      </div>
                      {todayAttendance.location && (
                        <div>
                          <div className="text-sm text-muted-foreground">Location</div>
                          <div className="mt-1 text-sm font-medium break-words">
                            {todayAttendance.location.address || "Location captured"}
                          </div>
                          {todayAttendance.location.latitude && todayAttendance.location.longitude && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {todayAttendance.location.latitude.toFixed(4)}, {todayAttendance.location.longitude.toFixed(4)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!todayAttendance && (
                    <div className="text-center py-4 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No attendance marked for today</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Attendance Calendar - {format(currentDate, "MMMM yyyy")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <CalendarComponent
                  mode="single"
                  className="rounded-md border"
                  modifiers={calendarModifiers}
                  modifiersClassNames={calendarModifiersClassNames}
                />
                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
                    <span>Week Off</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
                    <span>Half Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
                    <span>On Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                    <span>Pending</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
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

          {/* Attendance History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Attendance History
                  {dateRange === "month" && ` - ${format(new Date(), "MMMM yyyy")}`}
                  {dateRange === "week" && " - Last 7 Days"}
                  {dateRange === "custom" && ` - ${format(new Date(startDate), "MMM dd")} to ${format(new Date(endDate), "MMM dd, yyyy")}`}
                </CardTitle>
                {historyPagination && (
                  <span className="text-sm text-muted-foreground">
                    {historyPagination.total} records
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : attendanceHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No attendance records found for this month</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Punch In</TableHead>
                          <TableHead>Punch Out</TableHead>
                          <TableHead>Work Hours</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceHistory.map((record: any) => (
                          <TableRow key={record._id}>
                            <TableCell>{formatDate(record.date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                {formatTime(record.punchIn)}
                              </div>
                              {record.punchInIpAddress && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  IP: {record.punchInIpAddress}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.punchOut ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    {formatTime(record.punchOut)}
                                  </div>
                                  {record.punchOutIpAddress && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      IP: {record.punchOutIpAddress}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{formatWorkHours(record.workHours)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.status === "Present"
                                    ? "default"
                                    : record.status === "On Leave"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {record.leaveType ? (
                                <Badge variant="outline" className="text-xs">
                                  {record.leaveType}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">
                                {record.ipAddress || record.punchInIpAddress || "-"}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {historyPagination && (
                    <div className="mt-4 pt-4 border-t">
                      <Pagination
                        page={historyPage}
                        pageSize={historyPageSize}
                        total={historyPagination.total}
                        pages={historyPagination.pages}
                        onPageChange={(newPage) => {
                          setHistoryPage(newPage);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onPageSizeChange={(newSize) => {
                          setHistoryPageSize(newSize);
                          setHistoryPage(1);
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
};

export default EmployeeAttendance;

