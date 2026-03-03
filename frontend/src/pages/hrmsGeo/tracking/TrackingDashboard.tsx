import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import {
  MapPin,
  Navigation,
  BarChart3,
  FileText,
  Settings,
  Calendar,
  Search,
  RotateCw,
  Map,
  Loader2,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useGetTrackingDashboardStatsQuery } from "@/store/api/trackingApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const TrackingDashboard = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<
    "date" | "month" | "year" | "range"
  >("date");

  // Determine active tab from route - use precise matching
  const getActiveTab = () => {
    const path = location.pathname.split("?")[0]; // Remove query params
    const normalizedPath = path.replace(/\/$/, ""); // Remove trailing slash
    
    // Use precise path matching instead of includes() to avoid false matches
    if (normalizedPath === "/hrms-geo/tracking/live" || normalizedPath.startsWith("/hrms-geo/tracking/live/")) {
      return "live";
    }
    if (normalizedPath === "/hrms-geo/tracking/timeline" || normalizedPath.startsWith("/hrms-geo/tracking/timeline/")) {
      return "timeline";
    }
    if (normalizedPath === "/hrms-geo/tracking/dashboard" || normalizedPath.startsWith("/hrms-geo/tracking/dashboard/")) {
      return "dashboard";
    }
    if (normalizedPath === "/hrms-geo/tracking/reports" || normalizedPath.startsWith("/hrms-geo/tracking/reports/")) {
      return "reports";
    }
    if (normalizedPath === "/hrms-geo/tracking/settings" || normalizedPath.startsWith("/hrms-geo/tracking/settings/")) {
      return "settings";
    }
    // Default to dashboard if path doesn't match any specific tab
    return "dashboard";
  };
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(dayjs().month() + 1),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    String(dayjs().year()),
  );
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Staff search for dropdown
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [debouncedStaffSearch, setDebouncedStaffSearch] = useState("");

  // Debounce search for table
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce staff search for dropdown
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStaffSearch(staffSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [staffSearchQuery]);

  // Build query params based on filter type
  const queryParams: any = {
    page: currentPage,
    limit: pageSize,
  };

  if (filterType === "date" && selectedDate) {
    queryParams.date = selectedDate.format("YYYY-MM-DD");
  } else if (filterType === "month") {
    queryParams.month = selectedMonth;
    queryParams.year = selectedYear;
  } else if (filterType === "year") {
    queryParams.year = selectedYear;
  } else if (filterType === "range" && dateRange[0] && dateRange[1]) {
    queryParams.startDate = dateRange[0].format("YYYY-MM-DD");
    queryParams.endDate = dateRange[1].format("YYYY-MM-DD");
  }

  if (selectedStaffId !== "all") {
    queryParams.staffId = selectedStaffId;
  }

  if (debouncedSearch.trim()) {
    queryParams.search = debouncedSearch.trim();
  }

  // Fetch dashboard stats with pagination and search
  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useGetTrackingDashboardStatsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
  });

  // Fetch staff list for filter dropdown with search
  const { data: staffData, isLoading: isLoadingStaff } = useGetStaffQuery(
    {
      search: debouncedStaffSearch.trim() || undefined,
      status: "Active",
      limit: 100,
      page: 1,
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  // API returns { success, data: { summary, staffStats, dateRange, pagination } }
  const responseData = dashboardData?.data;
  const summary = responseData?.summary || {
    totalDistance: 0,
    totalTime: 0,
    totalTimeInMotion: 0,
    totalTimeAtRest: 0,
    totalStaff: 0,
  };

  const staffStats = responseData?.staffStats || [];
  const pagination = responseData?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 0,
  };

  // Format time helper
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} hrs ${mins} mins`;
    }
    return `${mins} mins`;
  };

  // Format distance helper
  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)} m`;
    }
    return `${km.toFixed(2)} km`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      Active: { bg: "bg-[#fef3c7]", text: "text-[#b45309]" },
      Inactive: { bg: "bg-yellow-100", text: "text-yellow-800" },
      Offline: { bg: "bg-gray-100", text: "text-gray-800" },
      "No Activity": { bg: "bg-gray-100", text: "text-gray-800" },
    };
    const colors = statusColors[status] || statusColors["No Activity"];
    return <Badge className={`${colors.bg} ${colors.text}`}>{status}</Badge>;
  };

  // Get display date string
  const getDisplayDate = () => {
    if (filterType === "date" && selectedDate) {
      return selectedDate.format("DD MMM YYYY");
    } else if (filterType === "month") {
      return `${dayjs()
        .month(parseInt(selectedMonth) - 1)
        .format("MMMM")} ${selectedYear}`;
    } else if (filterType === "year") {
      return selectedYear;
    } else if (filterType === "range" && dateRange[0] && dateRange[1]) {
      return `${dateRange[0].format("DD MMM")} - ${dateRange[1].format("DD MMM YYYY")}`;
    }
    return dayjs().format("DD MMM YYYY");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const allStaff = staffData?.data?.staff || [];

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor real-time and historical location data of field teams
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={getActiveTab()} className="w-full">
          <TabsList>
            <TabsTrigger value="live" asChild>
              <Link to="/hrms-geo/tracking/live">
                <Navigation className="w-4 h-4 mr-2" />
                Live Tracking
              </Link>
            </TabsTrigger>
            <TabsTrigger value="timeline" asChild>
              <Link to="/hrms-geo/tracking/timeline">
                <MapPin className="w-4 h-4 mr-2" />
                Timeline
              </Link>
            </TabsTrigger>
            <TabsTrigger value="dashboard" asChild>
              <Link to="/hrms-geo/tracking/dashboard">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </TabsTrigger>
            <TabsTrigger value="reports" asChild>
              <Link to="/hrms-geo/tracking/reports">
                <FileText className="w-4 h-4 mr-2" />
                Reports
              </Link>
            </TabsTrigger>
            <TabsTrigger value="settings" asChild>
              <Link to="/hrms-geo/tracking/settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle>Dashboard</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Date-based tracking metrics
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <DatePicker
                      picker="date"
                      value={selectedDate}
                      onChange={(date) => {
                        setSelectedDate(date);
                        setCurrentPage(1);
                      }}
                      className="w-full sm:w-[150px]"
                      allowClear
                    />
                    <Select
                      value={selectedStaffId}
                      onValueChange={(value) => {
                        setSelectedStaffId(value);
                        setCurrentPage(1);
                      }}
                      disabled={isLoadingStaff}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              placeholder="Search staff..."
                              className="pl-8 h-8 text-sm"
                              value={staffSearchQuery}
                              onChange={(e) =>
                                setStaffSearchQuery(e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <SelectItem value="all">All Staff</SelectItem>
                        {allStaff.map((staff) => (
                          <SelectItem key={staff._id} value={staff._id}>
                            {staff.name}{" "}
                            {staff.employeeId ? `(${staff.employeeId})` : ""}
                          </SelectItem>
                        ))}
                        {allStaff.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No staff found
                          </div>
                        )}
                      </SelectContent>
                    </Select>

                    {/* <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{getDisplayDate()}</span>
                    </div> */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isLoading || isRefreshing}
                    >
                      <RotateCw
                        className={`w-4 h-4 mr-2 ${isLoading || isRefreshing ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Loading dashboard data...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Distance
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {formatDistance(summary.totalDistance)}
                              </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-[#fef3c7] flex items-center justify-center">
                              <Map className="w-6 h-6 text-[#efaa1f]" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Time
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {formatTime(summary.totalTime)}
                              </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Time Spent in Motion
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {formatTime(summary.totalTimeInMotion)}
                              </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Navigation className="w-6 h-6 text-purple-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Time Spent in Rest
                              </p>
                              <p className="text-2xl font-bold mt-1">
                                {formatTime(summary.totalTimeAtRest)}
                              </p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search by name or staff ID"
                          className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium">
                              Name
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Status
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Current Location
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Last Updated
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Total Distance
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Total Time
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Time in Motion
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Time at Rest
                            </th>
                            <th className="text-left p-3 text-sm font-medium">
                              Tracking Points
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffStats.length === 0 ? (
                            <tr>
                              <td
                                colSpan={9}
                                className="p-8 text-center text-muted-foreground"
                              >
                                {debouncedSearch
                                  ? "No staff found matching your search"
                                  : "No tracking data available"}
                              </td>
                            </tr>
                          ) : (
                            staffStats.map((stat) => (
                              <tr
                                key={stat.staffId}
                                className="border-b hover:bg-muted/50"
                              >
                                <td className="p-3">
                                  <div className="flex flex-col">
                                    <span className="text-blue-600 cursor-pointer font-medium">
                                      {stat.staffName}
                                    </span>
                                    {stat.employeeId && (
                                      <span className="text-xs text-muted-foreground mt-1">
                                        {stat.employeeId}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-sm">
                                  {getStatusBadge(stat.status)}
                                </td>
                                <td className="p-3 text-sm">
                                  {stat.currentLocation ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="font-medium text-foreground">
                                        {stat.currentLocation.fullAddress ||
                                          stat.currentLocation.address ||
                                          (stat.currentLocation.city &&
                                          stat.currentLocation.pincode
                                            ? `${stat.currentLocation.city}, ${stat.currentLocation.pincode}`
                                            : "Location not available")}
                                      </div>
                                      {stat.currentLocation.movementType && (
                                        <div className="text-xs text-muted-foreground capitalize">
                                          {stat.currentLocation.movementType}
                                        </div>
                                      )}
                                      {stat.currentLocation.batteryPercent !==
                                        undefined && (
                                        <div className="text-xs text-muted-foreground">
                                          Battery:{" "}
                                          {stat.currentLocation.batteryPercent}%
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic">
                                      No location data
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-sm">
                                  {stat.currentLocation ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-muted-foreground">
                                        {stat.currentLocation.lastUpdated}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {dayjs(
                                          stat.currentLocation.timestamp,
                                        ).format("DD MMM YYYY, hh:mm A")}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic">
                                      -
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-sm">
                                  {formatDistance(stat.totalDistance)}
                                </td>
                                <td className="p-3 text-sm">
                                  {formatTime(stat.totalTime)}
                                </td>
                                <td className="p-3 text-sm">
                                  {formatTime(stat.totalTimeInMotion)}
                                </td>
                                <td className="p-3 text-sm">
                                  {formatTime(stat.totalTimeAtRest)}
                                </td>
                                <td className="p-3 text-sm">
                                  <span className="text-muted-foreground">
                                    {stat.trackingPoints}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination.total > 0 && (
                      <div className="mt-4">
                        <Pagination
                          page={currentPage}
                          total={pagination.total}
                          pageSize={pageSize}
                          pages={pagination.pages}
                          onPageChange={(newPage) => setCurrentPage(newPage)}
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
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TrackingDashboard;
