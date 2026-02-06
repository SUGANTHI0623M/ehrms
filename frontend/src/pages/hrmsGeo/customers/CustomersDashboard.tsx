import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useGetCustomerStatsQuery, useGetCustomersByDateRangeQuery, useGetCustomersByStaffQuery } from "@/store/api/customerApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Calendar } from "lucide-react";

const { RangePicker } = DatePicker;

const CustomersDashboard = () => {
  // Date pickers start empty, but backend will default to last 7 days when no dates provided
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [staffChartDateRange, setStaffChartDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");

  // Handle period filter change
  useEffect(() => {
    if (periodFilter) {
      const today = dayjs();
      let startDate: Dayjs;
      
      switch (periodFilter) {
        case "last7days":
          startDate = today.subtract(6, 'days');
          setDateRange([startDate, today]);
          setStaffChartDateRange([startDate, today]);
          break;
        case "last2weeks":
          startDate = today.subtract(13, 'days');
          setDateRange([startDate, today]);
          setStaffChartDateRange([startDate, today]);
          break;
        case "last1month":
          startDate = today.subtract(29, 'days');
          setDateRange([startDate, today]);
          setStaffChartDateRange([startDate, today]);
          break;
        default:
          // Keep current date range
          break;
      }
    }
  }, [periodFilter]);

  const { data: statsData, isLoading: isLoadingStats } = useGetCustomerStatsQuery(undefined, {
    // Refetch when filters change
    refetchOnMountOrArgChange: true,
  });
  const { data: chartData, isLoading: isLoadingChart } = useGetCustomersByDateRangeQuery({
    startDate: dateRange[0]?.format('YYYY-MM-DD'),
    endDate: dateRange[1]?.format('YYYY-MM-DD')
  }, {
    refetchOnMountOrArgChange: true,
  });

  const { data: staffChartData, isLoading: isLoadingStaffChart } = useGetCustomersByStaffQuery({
    startDate: staffChartDateRange[0]?.format('YYYY-MM-DD'),
    endDate: staffChartDateRange[1]?.format('YYYY-MM-DD'),
    staffId: selectedStaffId && selectedStaffId !== 'all' ? selectedStaffId : undefined
  }, {
    refetchOnMountOrArgChange: true,
  });

  // Handle date range clear
  const handleDateRangeClear = () => {
    setDateRange([null, null]);
    setPeriodFilter("");
  };

  const stats = statsData?.data?.stats || {
    totalCustomers: 0,
    notYetStarted: 0,
    inProgress: 0,
    completedTasks: 0,
    reopenedTasks: 0
  };

  const chartDataArray = chartData?.data?.chartData || [];
  const staffChartDataArray = staffChartData?.data?.chartData || [];
  
  // Fetch staff for filter
  const { data: staffData } = useGetStaffQuery({ limit: 1000 });
  const staffList = staffData?.data?.staff || [];

  // Calculate max count for chart scaling
  const maxCount = chartDataArray.length > 0 
    ? Math.max(...chartDataArray.map(d => d.count), 1) 
    : 1;

  const maxStaffCount = staffChartDataArray.length > 0 
    ? Math.max(...staffChartDataArray.map(d => d.count), 1) 
    : 1;

  // Format dates for display
  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('DD MMM');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customers Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor customer service metrics and track service coverage</p>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/customers/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/customers/list">Customers List</Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/customers/settings">Customers Settings</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-purple-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Customers</p>
                        <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.totalCustomers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-purple-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Not yet Started</p>
                        <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.notYetStarted}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-blue-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">In progress</p>
                        <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.inProgress}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-green-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Tasks</p>
                        <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.completedTasks || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-red-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reopened</p>
                        <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.reopenedTasks || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Customers Overview</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Number of Customers Added per Day</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setDateRange([dates[0], dates[1]]);
                            setPeriodFilter(""); // Clear period filter when manually selecting dates
                          } else {
                            setDateRange([null, null]);
                            setPeriodFilter("");
                          }
                        }}
                        format="DD MMM YYYY"
                        className="w-[300px]"
                        allowClear={true}
                        placeholder={['Start Date', 'End Date']}
                        disabledDate={(current) => {
                          // Disable future dates
                          return current && current > dayjs().endOf('day');
                        }}
                      />
                      <Select
                        value={periodFilter || undefined}
                        onValueChange={(value) => {
                          if (value) {
                            setPeriodFilter(value);
                          } else {
                            setPeriodFilter("");
                          }
                        }}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Quick Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last7days">Last 7 Days</SelectItem>
                          <SelectItem value="last2weeks">Last 2 Weeks</SelectItem>
                          <SelectItem value="last1month">Last 1 Month</SelectItem>
                        </SelectContent>
                      </Select>
                      {periodFilter && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPeriodFilter("");
                            setDateRange([null, null]);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingChart ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Loading chart data...
                    </div>
                  ) : chartDataArray.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No data available for selected date range
                    </div>
                  ) : (
                    <div className="h-64 flex items-end justify-between gap-2">
                      {chartDataArray.map((item, i) => {
                        const heightPercent = (item.count / maxCount) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                              className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer" 
                              style={{ height: `${Math.max(heightPercent, 4)}%`, minHeight: '4px' }}
                              title={`${item.count} customers on ${formatDate(item.date)}`}
                            ></div>
                            <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                            <span className="text-xs font-semibold">{item.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Staff-based Chart */}
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Customers by Staff</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Number of Customers Assigned per Staff</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RangePicker
                        value={staffChartDateRange}
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setStaffChartDateRange([dates[0], dates[1]]);
                          } else {
                            // Clear the date range
                            setStaffChartDateRange([null, null]);
                          }
                        }}
                        format="DD MMM YYYY"
                        className="w-[300px]"
                        allowClear={true}
                        placeholder={['Start Date', 'End Date']}
                        disabledDate={(current) => {
                          return current && current > dayjs().endOf('day');
                        }}
                      />
                      <Select
                        value={selectedStaffId}
                        onValueChange={setSelectedStaffId}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Staff</SelectItem>
                          {staffList.map((staff: any) => (
                            <SelectItem key={staff._id} value={staff._id}>
                              {staff.name} ({staff.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedStaffId && selectedStaffId !== "all" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStaffId("all")}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingStaffChart ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Loading chart data...
                    </div>
                  ) : staffChartDataArray.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No data available for selected date range
                    </div>
                  ) : (
                    <div className="h-64 flex items-end justify-between gap-2">
                      {staffChartDataArray.map((item, i) => {
                        const heightPercent = (item.count / maxStaffCount) * 100;
                        const displayName = item.staffName.length > 10 ? item.staffName.substring(0, 10) + '...' : item.staffName;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                              className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600 cursor-pointer" 
                              style={{ height: `${Math.max(heightPercent, 4)}%`, minHeight: '4px' }}
                              title={`${item.count} customers assigned to ${item.staffName}`}
                            ></div>
                            <span className="text-xs text-muted-foreground text-center break-words" style={{ maxWidth: '100%' }}>
                              {displayName}
                            </span>
                            <span className="text-xs font-semibold">{item.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CustomersDashboard;
