import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import {
  useGetCustomerStatsQuery,
  useGetCustomersByDateRangeQuery,
  useGetCustomersByStaffQuery,
} from "@/store/api/customerApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const { RangePicker } = DatePicker;

const CustomersDashboard = () => {
  const location = useLocation();

  // Determine active tab from route - use precise matching
  const getActiveTab = () => {
    const path = location.pathname.split("?")[0]; // Remove query params
    const normalizedPath = path.replace(/\/$/, ""); // Remove trailing slash
    
    // Use precise path matching instead of includes() to avoid false matches
    if (normalizedPath === "/hrms-geo/customers/dashboard" || normalizedPath.startsWith("/hrms-geo/customers/dashboard/")) {
      return "dashboard";
    }
    if (normalizedPath === "/hrms-geo/customers/list" || normalizedPath.startsWith("/hrms-geo/customers/list/")) {
      return "list";
    }
    if (normalizedPath === "/hrms-geo/customers/settings" || normalizedPath.startsWith("/hrms-geo/customers/settings/")) {
      return "settings";
    }
    // Default to dashboard if path doesn't match any specific tab
    return "dashboard";
  };
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [staffChartDateRange, setStaffChartDateRange] = useState<
    [Dayjs | null, Dayjs | null]
  >([null, null]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");

  // Handle period filter change
  useEffect(() => {
    if (periodFilter) {
      const today = dayjs();
      let startDate: Dayjs;

      switch (periodFilter) {
        case "last7days":
          startDate = today.subtract(6, "days");
          setDateRange([startDate, today]);
          setStaffChartDateRange([startDate, today]);
          break;
        case "last2weeks":
          startDate = today.subtract(13, "days");
          setDateRange([startDate, today]);
          setStaffChartDateRange([startDate, today]);
          break;
        case "last1month":
          startDate = today.subtract(29, "days");
          setDateRange([startDate, today]);
          setStaffChartDateRange([startDate, today]);
          break;
      }
    }
  }, [periodFilter]);

  const { data: statsData, isLoading: isLoadingStats } =
    useGetCustomerStatsQuery(undefined, {
      // Refetch when filters change
      refetchOnMountOrArgChange: true,
    });
  const { data: chartData, isLoading: isLoadingChart } =
    useGetCustomersByDateRangeQuery(
      {
        startDate: dateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: dateRange?.[1]?.format("YYYY-MM-DD"),
      },
      {
        refetchOnMountOrArgChange: true,
      },
    );

  const { data: staffChartData, isLoading: isLoadingStaffChart } =
    useGetCustomersByStaffQuery(
      {
        startDate: staffChartDateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: staffChartDateRange?.[1]?.format("YYYY-MM-DD"),
        staffId:
          selectedStaffId && selectedStaffId !== "all"
            ? selectedStaffId
            : undefined,
      },
      {
        refetchOnMountOrArgChange: true,
      },
    );

  // Handle date range clear
  const handleDateRangeClear = () => {
    setDateRange([null, null]);
    setPeriodFilter("");
  };

  const handleStaffDateRangeClear = () => {
    setStaffChartDateRange([null, null]);
  };

  const stats = statsData?.data?.stats || {
    totalCustomers: 0,
    notYetStarted: 0,
    inProgress: 0,
    completedTasks: 0,
    reopenedTasks: 0,
  };

  const chartDataArray = chartData?.data?.chartData || [];
  const staffChartDataArray = staffChartData?.data?.staffChartData || [];

  // Fetch staff for filter
  const { data: staffData } = useGetStaffQuery({ limit: 50, page: 1 });
  const staffList = staffData?.data?.staff || [];

  // Calculate max count for chart scaling
  const maxCount =
    chartDataArray.length > 0
      ? Math.max(...chartDataArray.map((d) => d.count), 1)
      : 1;

  const maxStaffCount =
    staffChartDataArray.length > 0
      ? Math.max(...staffChartDataArray.map((d) => d.count), 1)
      : 1;

  // Format dates for display
  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format("DD MMM");
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Customers Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Monitor customer service metrics and track service coverage
          </p>
        </div>

        <Tabs value={getActiveTab()} className="w-full">
          <div className="flex overflow-x-auto pb-1">
            <TabsList className="h-auto p-1 bg-muted/50 justify-start inline-flex min-w-full sm:min-w-0">
              <TabsTrigger
                value="dashboard"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/customers/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild className="flex-1 sm:flex-none">
                <Link to="/hrms-geo/customers/list">Customers List</Link>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/customers/settings">
                  Customers Settings
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-purple-500 rounded"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Customers
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {isLoadingStats ? "..." : stats.totalCustomers}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-amber-500 rounded"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Not yet Started
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {isLoadingStats ? "..." : stats.notYetStarted}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-500 rounded"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        In progress
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {isLoadingStats ? "..." : stats.inProgress}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-green-500 rounded"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Completed Tasks
                      </p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {isLoadingStats ? "..." : stats.completedTasks || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-red-500 rounded"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reopened</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {isLoadingStats ? "..." : stats.reopenedTasks || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6">
              {/* Added Customers per Day Chart */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Customers Overview
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Number of Customers Added per Day
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <RangePicker
                      value={dateRange}
                      onChange={(dates) =>
                        setDateRange(dates as [Dayjs | null, Dayjs | null])
                      }
                      format="DD MMM YYYY"
                      className="flex-1 sm:w-[280px]"
                      allowClear={true}
                      placeholder={["Start Date", "End Date"]}
                      disabledDate={(current) => {
                        return current && current > dayjs().endOf("day");
                      }}
                    />
                    <Select
                      value={periodFilter}
                      onValueChange={setPeriodFilter}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Quick Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last7days">Last 7 Days</SelectItem>
                        <SelectItem value="last2weeks">Last 2 Weeks</SelectItem>
                        <SelectItem value="last1month">Last 1 Month</SelectItem>
                      </SelectContent>
                    </Select>
                    {dateRange?.[0] && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDateRangeClear}
                        title="Clear Filters"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingChart ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Loading chart data...
                    </div>
                  ) : chartDataArray.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No customer data for selected range
                    </div>
                  ) : (
                    <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 pt-6">
                      {chartDataArray.map((item, i) => {
                        const heightPercent = (item.count / maxCount) * 100;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-2 group"
                          >
                            <div
                              className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer relative"
                              style={{
                                height: `${Math.max(heightPercent, 4)}%`,
                                minHeight: "4px",
                              }}
                              title={
                                item.count +
                                " customers on " +
                                formatDate(item.date)
                              }
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border px-1 rounded text-[10px] font-bold z-10 whitespace-nowrap">
                                {item.count}
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-xs text-muted-foreground rotate-45 sm:rotate-0 mt-2 sm:mt-0">
                              {formatDate(item.date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customers by Staff Chart */}
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Customers by Staff
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Number of Customers Assigned per Staff
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <RangePicker
                      value={staffChartDateRange}
                      onChange={(dates) =>
                        setStaffChartDateRange(
                          dates as [Dayjs | null, Dayjs | null],
                        )
                      }
                      format="DD MMM YYYY"
                      className="flex-1 sm:w-[280px]"
                      allowClear={true}
                      placeholder={["Start Date", "End Date"]}
                      disabledDate={(current) => {
                        return current && current > dayjs().endOf("day");
                      }}
                    />
                    <Select
                      value={selectedStaffId}
                      onValueChange={setSelectedStaffId}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Staff</SelectItem>
                        {staffList.map((staff) => (
                          <SelectItem key={staff._id} value={staff._id}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {staffChartDateRange?.[0] && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStaffDateRangeClear}
                        title="Clear Filters"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingStaffChart ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Loading staff chart data...
                    </div>
                  ) : staffChartDataArray.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No customer data for selected range and staff
                    </div>
                  ) : (
                    <div className="h-64 flex items-end justify-between gap-1 sm:gap-2 pt-6">
                      {staffChartDataArray.map((item, i) => {
                        const heightPercent =
                          (item.count / maxStaffCount) * 100;
                        const displayName =
                          item.staffName.length > 8
                            ? item.staffName.substring(0, 8) + "..."
                            : item.staffName;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-2 group"
                          >
                            <div
                              className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600 cursor-pointer relative"
                              style={{
                                height: `${Math.max(heightPercent, 4)}%`,
                                minHeight: "4px",
                              }}
                              title={
                                item.count +
                                " customers assigned to " +
                                item.staffName
                              }
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border px-1 rounded text-[10px] font-bold z-10 whitespace-nowrap">
                                {item.count}
                              </div>
                            </div>
                            <span
                              className="text-[10px] sm:text-xs text-muted-foreground text-center break-words rotate-45 sm:rotate-0 mt-4 sm:mt-0"
                              style={{ maxWidth: "100%" }}
                            >
                              {displayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default CustomersDashboard;
