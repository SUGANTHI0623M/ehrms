import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Navigation,
  BarChart3,
  FileText,
  Settings,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLazyGenerateTrackingReportQuery } from "@/store/api/trackingApi";
import { useGetStaffWithLocationAccessQuery } from "@/store/api/trackingApi";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const TrackingReports = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    // Default to reports if path doesn't match any specific tab
    return "reports";
  };
  const [dateValue, setDateValue] = useState<any>(dayjs());
  const [monthValue, setMonthValue] = useState<any>(dayjs());
  const [yearValue, setYearValue] = useState<any>(dayjs());
  const [rangeValue, setRangeValue] = useState<any>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");

  // Fetch staff list for filter
  const { data: staffData } = useGetStaffWithLocationAccessQuery();

  // Generate report
  const [generateReport, { isLoading: isGeneratingReport }] =
    useLazyGenerateTrackingReportQuery();

  // Build query params based on filter type
  const buildQueryParams = () => {
    const params: any = {};
    if (filterType === "date" && dateValue) {
      params.date = dateValue.format("YYYY-MM-DD");
    } else if (filterType === "month" && monthValue && yearValue) {
      params.month = monthValue.format("MM");
      params.year = yearValue.format("YYYY");
    } else if (filterType === "year" && yearValue) {
      params.year = yearValue.format("YYYY");
    } else if (
      filterType === "range" &&
      rangeValue &&
      rangeValue[0] &&
      rangeValue[1]
    ) {
      params.startDate = rangeValue[0].format("YYYY-MM-DD");
      params.endDate = rangeValue[1].format("YYYY-MM-DD");
    }

    if (selectedStaffId !== "all") {
      params.staffId = selectedStaffId;
    }

    return params;
  };

  // Handle download report
  const handleDownloadReport = async () => {
    try {
      const queryParams = buildQueryParams();
      const result = await generateReport({
        ...queryParams,
        format: "excel",
      }).unwrap();

      // Create blob and download
      const url = window.URL.createObjectURL(result);
      const a = document.createElement("a");
      a.href = url;

      // Generate filename
      let filename = "tracking-report";
      if (filterType === "date" && dateValue) {
        filename += `-${dateValue.format("YYYY-MM-DD")}`;
      } else if (filterType === "month" && monthValue && yearValue) {
        filename += `-${yearValue.format("YYYY")}-${monthValue.format("MM")}`;
      } else if (filterType === "year" && yearValue) {
        filename += `-${yearValue.format("YYYY")}`;
      } else if (
        filterType === "range" &&
        rangeValue &&
        rangeValue[0] &&
        rangeValue[1]
      ) {
        filename += `-${rangeValue[0].format("YYYY-MM-DD")}-to-${rangeValue[1].format("YYYY-MM-DD")}`;
      } else {
        filename += `-${dayjs().format("YYYY-MM-DD")}`;
      }
      filename += ".xlsx";

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Downloaded",
        description: "Tracking report has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error?.data?.error?.message || "Failed to download report",
        variant: "destructive",
      });
    }
  };

  // Get display date string
  const getDisplayDate = () => {
    if (filterType === "date" && dateValue) {
      return dateValue.format("DD MMM YYYY");
    } else if (filterType === "month" && monthValue && yearValue) {
      return `${monthValue.format("MMMM")} ${yearValue.format("YYYY")}`;
    } else if (filterType === "year" && yearValue) {
      return yearValue.format("YYYY");
    } else if (
      filterType === "range" &&
      rangeValue &&
      rangeValue[0] &&
      rangeValue[1]
    ) {
      return `${rangeValue[0].format("DD MMM")} - ${rangeValue[1].format("DD MMM YYYY")}`;
    }
    return dayjs().format("DD MMM YYYY");
  };

  // No-op for Header component - MainLayout handles sidebar state
  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader className="px-4 py-4 sm:px-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Tracking Reports</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate downloadable reports for compliance, audits, or
                      client deliverables
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-6">
                  {/* Filter Section */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-semibold mb-4">Filter Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {/* Filter Type */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Filter Type
                        </label>
                        <Select
                          value={filterType}
                          onValueChange={(value: any) => setFilterType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">By Date</SelectItem>
                            <SelectItem value="month">By Month</SelectItem>
                            <SelectItem value="year">By Year</SelectItem>
                            <SelectItem value="range">Date Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Filter */}
                      {filterType === "date" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Select Date
                          </label>
                          <DatePicker
                            value={dateValue}
                            onChange={(date) => setDateValue(date)}
                            format="DD MMM YYYY"
                            className="w-full"
                            allowClear
                          />
                        </div>
                      )}

                      {/* Month Filter */}
                      {filterType === "month" && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Select Month
                            </label>
                            <Select
                              value={monthValue}
                              onValueChange={setMonthValue}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(
                                  { length: 12 },
                                  (_, i) => i + 1,
                                ).map((month) => (
                                  <SelectItem key={month} value={String(month)}>
                                    {dayjs()
                                      .month(month - 1)
                                      .format("MMMM")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Select Year
                            </label>
                            <Select
                              value={yearValue}
                              onValueChange={setYearValue}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(
                                  { length: 10 },
                                  (_, i) => dayjs().year() - 5 + i,
                                ).map((year) => (
                                  <SelectItem key={year} value={String(year)}>
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* Year Filter */}
                      {filterType === "year" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Select Year
                          </label>
                          <Select
                            value={yearValue}
                            onValueChange={setYearValue}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from(
                                { length: 10 },
                                (_, i) => dayjs().year() - 5 + i,
                              ).map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Date Range Filter */}
                      {filterType === "range" && (
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">
                            Select Date Range
                          </label>
                          <RangePicker
                            value={rangeValue}
                            onChange={(dates) => {
                              if (dates) {
                                setRangeValue(dates);
                              } else {
                                setRangeValue(null);
                              }
                            }}
                            format="DD MMM YYYY"
                            className="w-full"
                            allowClear
                          />
                        </div>
                      )}

                      {/* Staff Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Staff (Optional)
                        </label>
                        <Select
                          value={selectedStaffId}
                          onValueChange={setSelectedStaffId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Staff" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Staff</SelectItem>
                            {staffData?.data?.staff.map((staff) => (
                              <SelectItem key={staff._id} value={staff._id}>
                                {staff.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Selected Filter Display */}
                    <div className="mt-4 p-3 bg-background rounded-md border">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Selected Period:
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getDisplayDate()}
                        </span>
                        {selectedStaffId !== "all" && (
                          <>
                            <span className="text-sm font-medium ml-4">
                              Staff:
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {staffData?.data?.staff.find(
                                (s) => s._id === selectedStaffId,
                              )?.name || "All Staff"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Report Types */}
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">
                            Tracking Summary Report
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Comprehensive tracking report with distance, time,
                            motion, and rest statistics for selected period
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              • Total distance traveled by each staff member
                            </p>
                            <p>
                              • Total time, time in motion, and time at rest
                            </p>
                            <p>• Tracking points count and activity status</p>
                            <p>• Start and end times for the selected period</p>
                          </div>
                        </div>
                        <Button
                          onClick={handleDownloadReport}
                          disabled={isGeneratingReport}
                          className="ml-4"
                        >
                          {isGeneratingReport ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download Report
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TrackingReports;
