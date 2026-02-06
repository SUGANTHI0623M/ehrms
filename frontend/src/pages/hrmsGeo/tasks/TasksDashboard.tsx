import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, List, Plus, BarChart3, Settings, HelpCircle, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useGetTaskStatsQuery, useGetTasksByDateRangeQuery } from "@/store/api/taskApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const TasksDashboard = () => {
  // Date picker starts empty, but backend will default to last 7 days when no dates provided
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  // Handle period filter change
  useEffect(() => {
    if (periodFilter) {
      const today = dayjs();
      let startDate: Dayjs;
      
      switch (periodFilter) {
        case "last7days":
          startDate = today.subtract(6, 'days');
          setDateRange([startDate, today]);
          break;
        case "last2weeks":
          startDate = today.subtract(13, 'days');
          setDateRange([startDate, today]);
          break;
        case "last1month":
          startDate = today.subtract(29, 'days');
          setDateRange([startDate, today]);
          break;
        default:
          // Keep current date range
          break;
      }
    }
  }, [periodFilter]);

  // Fetch staff for dropdown
  const { data: staffData } = useGetStaffQuery({ limit: 1000, status: 'Active' });
  const staffList = staffData?.data?.staff || [];

  // Fetch task stats
  const { data: statsData, isLoading: isLoadingStats } = useGetTaskStatsQuery({
    staffId: selectedStaffId !== "all" ? selectedStaffId : undefined,
    startDate: dateRange[0]?.format('YYYY-MM-DD'),
    endDate: dateRange[1]?.format('YYYY-MM-DD'),
  }, {
    // Refetch when filters change
    refetchOnMountOrArgChange: true,
  });

  // Fetch chart data
  const { data: chartData, isLoading: isLoadingChart } = useGetTasksByDateRangeQuery({
    staffId: selectedStaffId !== "all" ? selectedStaffId : undefined,
    startDate: dateRange[0]?.format('YYYY-MM-DD'),
    endDate: dateRange[1]?.format('YYYY-MM-DD'),
  }, {
    refetchOnMountOrArgChange: true,
  });

  const stats = statsData?.data || {
    totalTasks: 0,
    notYetStarted: 0,
    delayedTasks: 0,
    inProgress: 0,
    completedTasks: 0,
    reopenedTasks: 0,
  };

  const chartDataArray = chartData?.data?.chartData || [];

  // Handle date range clear
  const handleDateRangeClear = () => {
    setDateRange([null, null]);
    setPeriodFilter("");
  };

  // Format date range for display
  const formatDateRange = () => {
    if (dateRange[0] && dateRange[1]) {
      return `${dateRange[0].format('DD MMM')} - ${dateRange[1].format('DD MMM')}`;
    }
    return "Select date range";
  };

  // Format dates for chart
  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('DD MMM');
  };

  // Calculate max count for chart scaling
  const maxCount = chartDataArray.length > 0 
    ? Math.max(...chartDataArray.map(d => 
        d.notYetStarted + d.inProgress + d.reopenedTasks + d.completedTasks
      ), 1) 
    : 1;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor task performance metrics and track daily task trends</p>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/tasks/dashboard">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/tasks/list">
                  <List className="w-4 h-4 mr-2" />
                  Tasks List
                </Link>
              </TabsTrigger>
              <TabsTrigger value="assign" asChild>
                <Link to="/hrms-geo/tasks/assign">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Task
                </Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/tasks/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Task Settings
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-purple-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tasks</p>
                        <p className="text-2xl font-bold">{isLoadingStats ? "..." : stats.totalTasks}</p>
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
                      <CardTitle>Tasks per Day</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">A breakdown of tasks, status wise per day</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select Staff" />
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
                          <SelectValue placeholder="Time Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last7days">Last 7 days</SelectItem>
                          <SelectItem value="last2weeks">Last 2 weeks</SelectItem>
                          <SelectItem value="last1month">Last 1 month</SelectItem>
                        </SelectContent>
                      </Select>
                      <RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                          if (dates) {
                            setDateRange(dates);
                            setPeriodFilter("");
                          } else {
                            handleDateRangeClear();
                          }
                        }}
                        format="DD MMM YY"
                        className="w-[250px]"
                        allowClear
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingChart ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Loading chart data...
                    </div>
                  ) : chartDataArray.length > 0 ? (
                    <div>
                      <div className="h-64 flex items-end justify-between gap-2 mb-4">
                        {chartDataArray.map((item, i) => {
                          const total = item.notYetStarted + item.inProgress + item.reopenedTasks + item.completedTasks;
                          const totalHeight = total > 0 ? (total / maxCount) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                              <div className="w-full flex flex-col justify-end" style={{ height: '200px' }}>
                                {item.completedTasks > 0 && (
                                  <div 
                                    className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600 cursor-pointer" 
                                    style={{ 
                                      height: `${(item.completedTasks / maxCount) * 200}px`, 
                                      minHeight: '4px' 
                                    }}
                                    title={`Completed: ${item.completedTasks}`}
                                  ></div>
                                )}
                                {item.inProgress > 0 && (
                                  <div 
                                    className="w-full bg-blue-500 transition-all hover:bg-blue-600 cursor-pointer" 
                                    style={{ 
                                      height: `${(item.inProgress / maxCount) * 200}px`, 
                                      minHeight: '4px' 
                                    }}
                                    title={`In Progress: ${item.inProgress}`}
                                  ></div>
                                )}
                                {item.reopenedTasks > 0 && (
                                  <div 
                                    className="w-full bg-red-500 transition-all hover:bg-red-600 cursor-pointer" 
                                    style={{ 
                                      height: `${(item.reopenedTasks / maxCount) * 200}px`, 
                                      minHeight: '4px' 
                                    }}
                                    title={`Reopened: ${item.reopenedTasks}`}
                                  ></div>
                                )}
                                {item.notYetStarted > 0 && (
                                  <div 
                                    className="w-full bg-purple-500 rounded-b transition-all hover:bg-purple-600 cursor-pointer" 
                                    style={{ 
                                      height: `${(item.notYetStarted / maxCount) * 200}px`, 
                                      minHeight: '4px' 
                                    }}
                                    title={`Not Yet Started: ${item.notYetStarted}`}
                                  ></div>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                              <span className="text-xs font-semibold">{total}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded"></div>
                          <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span>In Progress</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded"></div>
                          <span>Reopened</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-purple-500 rounded"></div>
                          <span>Not Started</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No data available for selected period
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

export default TasksDashboard;
