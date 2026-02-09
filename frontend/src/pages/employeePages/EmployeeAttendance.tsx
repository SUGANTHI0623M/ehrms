import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Clock, MapPin, LogIn, LogOut, Calendar, AlertCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetTodayAttendanceQuery,
  useGetEmployeeAttendanceQuery,
  useMarkAttendanceMutation,
} from "@/store/api/attendanceApi";
import { message } from "antd";
import { useAppSelector } from "@/store/hooks";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Pagination } from "@/components/ui/Pagination";
import { getLocationWithAddress } from "@/utils/geocoding";

const EmployeeAttendance = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get today's attendance
  const { data: todayData, isLoading: isLoadingToday, refetch: refetchToday } = useGetTodayAttendanceQuery();

  // Get employee attendance history for current month - backend will resolve employeeId from current user
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  
  // Calculate current month date range
  const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: historyData, isLoading: isLoadingHistory } = useGetEmployeeAttendanceQuery(
    { 
      employeeId: "current", 
      startDate: currentMonthStart,
      endDate: currentMonthEnd,
      page: historyPage, 
      limit: historyPageSize 
    },
    { skip: !currentUser }
  );

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

  const canPunchIn = !todayAttendance?.punchIn;
  const canPunchOut = todayAttendance?.punchIn && !todayAttendance?.punchOut;

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

          {/* Attendance History - Current Month */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Attendance History - {format(new Date(), "MMMM yyyy")}</CardTitle>
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

