import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  TrendingUp,
  Download,
  Search,
  Calendar,
  BarChart3,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useGetHRMSGeoDashboardQuery, useLazyGetHRMSGeoDashboardQuery } from "@/store/api/hrmsGeoApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "antd";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { X } from "lucide-react";

const { RangePicker } = DatePicker;

const HRMSGeoDashboard = () => {
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useGetHRMSGeoDashboardQuery(
    {
      staffId: selectedEmployee !== "all" ? selectedEmployee : undefined,
      startDate: dateRange[0]?.format("YYYY-MM-DD"),
      endDate: dateRange[1]?.format("YYYY-MM-DD"),
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const [fetchForDownload, { isLoading: isDownloading }] = useLazyGetHRMSGeoDashboardQuery();

  // Fetch staff list for employee filter
  const { data: staffData } = useGetStaffQuery({
    status: "Active",
    limit: 50,
    page: 1,
  });

  const dashboard = dashboardData?.data;

  // Employee status
  const totalEmployees = dashboard?.employeeStatus?.totalEmployees || 0;
  const notStarted = dashboard?.employeeStatus?.notStarted || 0;
  const punchedIn = dashboard?.employeeStatus?.punchedIn || 0;
  const punchedOut = dashboard?.employeeStatus?.punchedOut || 0;

  // Tasks
  const totalTasks = dashboard?.tasks?.totalTasks || 0;
  const pendingTasks = dashboard?.tasks?.pendingTasks || 0;
  const notYetStarted = dashboard?.tasks?.notYetStarted || 0;
  const inProgress = dashboard?.tasks?.inProgress || 0;
  const waitingForApproval = dashboard?.tasks?.waitingForApproval || 0;
  const completedTasks = dashboard?.tasks?.completedTasks || 0;
  const exitOnArrival = dashboard?.tasks?.exitOnArrival || 0;
  const exited = dashboard?.tasks?.exited || 0;
  const reopened = dashboard?.tasks?.reopened || 0;
  const rejected = dashboard?.tasks?.rejected || 0;
  const hold = dashboard?.tasks?.hold || 0;
  const delayedTasks = dashboard?.tasks?.delayedTasks || 0;

  // Customers
  const customersAddedToday = dashboard?.customers?.customersAddedToday || 0;
  const customersServedToday = dashboard?.customers?.customersServedToday || 0;

  // Distance data
  const distanceData = dashboard?.distanceData || [];

  // Business overview
  const businessOverviewData = dashboard?.businessOverview || [];
  const businessOverviewPagination = dashboard?.businessOverviewPagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 0,
  };

  // Calculate max distance for chart scaling
  const maxDistance = Math.max(...distanceData.map((d) => d.distance), 1);

  const handleMenuClick = () => {
    // No-op for Header component
  };

  const handleDownloadReport = async () => {
    try {
      const result = await fetchForDownload({
        staffId: selectedEmployee !== "all" ? selectedEmployee : undefined,
        startDate: dateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: dateRange?.[1]?.format("YYYY-MM-DD"),
        page: 1,
        limit: 5000,
        search: debouncedSearch.trim() || undefined,
      }).unwrap();
      const rows = result?.data?.businessOverview || [];
      const headers = ["Name", "Email", "Staff ID", "Punched In At", "Punched Out At", "Total Tasks Completed", "Total Forms Added", "Average (min)"];
      const escapeCsv = (v: string | number) => {
        const s = String(v ?? "");
        if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const csvRows = [headers.join(","), ...rows.map((r: any) => [r.name, r.email ?? "", r.staffId, r.punchedInAt, r.punchedOutAt, r.totalTasksCompleted, r.totalFormsAdded, r.average].map(escapeCsv).join(","))];
      const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `business-overview-${dateRange?.[0]?.format("YYYY-MM-DD") ?? "today"}-${dateRange?.[1]?.format("YYYY-MM-DD") ?? "today"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor workforce activity, customer engagement, and task completion
            rates
          </p>
        </div>

        {/* Employee Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Employees
                  </p>
                  <p className="text-2xl font-bold mt-1">{totalEmployees}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Not Started</p>
                  <p className="text-2xl font-bold mt-1">{notStarted}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Punched In</p>
                  <p className="text-2xl font-bold mt-1">{punchedIn}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <LogIn className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Punched Out</p>
                  <p className="text-2xl font-bold mt-1">{punchedOut}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-xl font-bold">{totalTasks}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-yellow-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{pendingTasks}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-gray-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Not Started</p>
                  <p className="text-xl font-bold">{notYetStarted}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-purple-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-xl font-bold">{inProgress}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-orange-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Waiting Approval
                  </p>
                  <p className="text-xl font-bold">{waitingForApproval}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-green-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold">{completedTasks}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-red-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Exit on Arrival
                  </p>
                  <p className="text-xl font-bold">{exitOnArrival}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-red-600 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Exited</p>
                  <p className="text-xl font-bold">{exited}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-cyan-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Reopened</p>
                  <p className="text-xl font-bold">{reopened}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-pink-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-xl font-bold">{rejected}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-amber-500 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Hold</p>
                  <p className="text-xl font-bold">{hold}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-orange-600 rounded"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Delayed</p>
                  <p className="text-xl font-bold">{delayedTasks}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Customers Added Today
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {customersAddedToday}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                0 no change since yesterday
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Customers Served Today
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {customersServedToday}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                0 no change since yesterday
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Distance Travelled */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Distance Travelled</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  See the distance travelled by your employees for the selected
                  time frame
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Select
                  value={selectedEmployee}
                  onValueChange={(value) => {
                    setSelectedEmployee(value);
                    refetch();
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {staffData?.data?.staff?.map((staff: any) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => {
                    if (dates) {
                      setDateRange(dates);
                    } else {
                      setDateRange([null, null]);
                    }
                  }}
                  format="DD MMM YY"
                  className="w-full sm:w-[250px]"
                  allowClear
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {distanceData.length > 0 ? (
                distanceData.map((item, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-full bg-pink-300 rounded-t hover:bg-pink-400 transition-colors"
                      style={{
                        height: `${Math.max((item.distance / maxDistance) * 100, item.distance > 0 ? 2 : 0)}%`,
                        minHeight: item.distance > 0 ? "4px" : "0",
                      }}
                      title={`${item.distance.toFixed(2)} km`}
                    ></div>
                    <span className="text-xs text-muted-foreground">
                      {item.date}
                    </span>
                  </div>
                ))
              ) : (
                <div className="w-full text-center text-muted-foreground py-8">
                  No distance data available
                </div>
              )}
            </div>
            {distanceData.length > 0 && (
              <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                <span>0 Km</span>
                <span>{(maxDistance / 4).toFixed(1)} Km</span>
                <span>{(maxDistance / 2).toFixed(1)} Km</span>
                <span>{((maxDistance * 3) / 4).toFixed(1)} Km</span>
                <span>{maxDistance.toFixed(1)} Km</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Overview */}
        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <CardTitle>Business Overview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  See staff punch-in / punch-out times, number of tasks done,
                  and average task duration
                </p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name or staff ID"
                    className="pl-10 pr-8 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                  format="DD MMM YYYY"
                  allowClear
                  placeholder={["Start date", "End date"]}
                  className="w-[260px]"
                  maxDate={dayjs()}
                />
                <Button onClick={handleDownloadReport} disabled={isDownloading}>
                  <Download className="w-4 h-4 mr-2" />
                  {isDownloading ? "Preparing…" : "Download"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Name</th>
                    <th className="text-left p-3 text-sm font-medium">Email</th>
                    <th className="text-left p-3 text-sm font-medium">
                      Staff ID
                    </th>
                    <th className="text-left p-3 text-sm font-medium">
                      Punched In At
                    </th>
                    <th className="text-left p-3 text-sm font-medium">
                      Punched Out At
                    </th>
                    <th className="text-left p-3 text-sm font-medium">
                      Total Tasks Completed
                    </th>
                    <th className="text-left p-3 text-sm font-medium">
                      Total Forms Added
                    </th>
                    <th className="text-left p-3 text-sm font-medium">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {businessOverviewData.length > 0 ? (
                    businessOverviewData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                            <span className="text-blue-600 cursor-pointer">
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{row.email ?? "—"}</td>
                        <td className="p-3 text-sm">{row.staffId}</td>
                        <td className="p-3 text-sm">{row.punchedInAt}</td>
                        <td className="p-3 text-sm">{row.punchedOutAt}</td>
                        <td className="p-3 text-sm">
                          {row.totalTasksCompleted}
                        </td>
                        <td className="p-3 text-sm">{row.totalFormsAdded}</td>
                        <td className="p-3 text-sm">{row.average}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {businessOverviewPagination.total > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  {(businessOverviewPagination.page - 1) *
                    businessOverviewPagination.limit +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    businessOverviewPagination.page *
                      businessOverviewPagination.limit,
                    businessOverviewPagination.total,
                  )}{" "}
                  of {businessOverviewPagination.total} staff
                </div>
                <Pagination
                  page={currentPage}
                  pageSize={pageSize}
                  total={businessOverviewPagination.total}
                  pages={businessOverviewPagination.pages}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default HRMSGeoDashboard;
