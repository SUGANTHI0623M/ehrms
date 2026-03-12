import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { User, Edit, Save, X, Ban, CheckCircle, Calendar, FileText, Receipt, CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, Download, Eye, Upload, Check, Activity, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import ExpenseClaim from "./ExpenseClaim";
import LeavesPendingApproval from "./LeavesPendingApproval";
import SalaryOverview from "./SalaryOverview";
import Loans from "./Loans";
import EmployeeAttendance from "./EmployeeAttendance";
import PayslipRequests from "./PayslipRequests";
import { useGetStaffByIdQuery, useGetStaffQuery, useUpdateStaffMutation, useGetAvailableShiftsQuery, useGetAvailableTemplatesQuery, useUploadStaffAvatarMutation } from "@/store/api/staffApi";
import { useGetOnboardingByStaffIdQuery, useVerifyDocumentMutation, useUploadOnboardingDocumentMutation } from "@/store/api/onboardingApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
import { useGetDepartmentsQuery, useCreateDepartmentMutation } from "@/store/api/jobOpeningApi";
import { useGetUsersQuery } from "@/store/api/userApi";
import { useGetEmployeeMonitoringDetailsQuery } from "@/store/api/monitoringApi";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import SalaryStructureForm from "@/components/SalaryStructureForm";
import { Skeleton } from "@/components/ui/skeleton";
import { message } from "antd";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateSalaryStructure,
  type SalaryStructureInputs,
} from "@/utils/salaryStructureCalculation.util";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { formatErrorMessage } from "@/utils/errorFormatter";
import { storeUserAvatar } from "@/utils/userAvatar";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { Monitor, MonitorSpeaker, FileText as FileTextIcon, MousePointerClick, TrendingUp, Camera } from "lucide-react";

// Monitoring Tab Component
const MonitoringTabContent = ({ employeeId, isTabActive = true }: { employeeId: string; isTabActive?: boolean }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [activeMonitoringTab, setActiveMonitoringTab] = useState("device");
  
  // Pagination states for different sections
  const [activityLogsPage, setActivityLogsPage] = useState(1);
  const [productivityScoresPage, setProductivityScoresPage] = useState(1);
  const [breaksPage, setBreaksPage] = useState(1);
  const [screenshotsPage, setScreenshotsPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Screenshot preview state
  const [selectedScreenshot, setSelectedScreenshot] = useState<{ url: string; timestamp: string } | null>(null);
  
  // Set start date to beginning of current month
  useEffect(() => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setEndDate(now);
  }, []);

  const { data: monitoringData, isLoading, refetch } = useGetEmployeeMonitoringDetailsQuery(
    {
      employeeId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      page: activityLogsPage,
      limit: pageSize,
    },
    { 
      skip: !employeeId || !isTabActive, 
      refetchOnMountOrArgChange: true,
      // Polling interval to automatically refresh data every 30 seconds when tab is active
      pollingInterval: isTabActive ? 30000 : 0, // Only poll when tab is active
    }
  );
  
  // Reset pagination when date range changes
  useEffect(() => {
    setActivityLogsPage(1);
    setProductivityScoresPage(1);
    setBreaksPage(1);
    setScreenshotsPage(1);
  }, [startDate, endDate]);

  // Refetch data when parent tab becomes active
  useEffect(() => {
    if (employeeId && isTabActive) {
      refetch();
    }
  }, [isTabActive, employeeId, refetch]);

  // Refetch data when switching between monitoring sub-tabs
  useEffect(() => {
    if (employeeId && activeMonitoringTab && isTabActive) {
      refetch();
    }
  }, [activeMonitoringTab, employeeId, isTabActive, refetch]);

  // Refetch data when date range changes
  useEffect(() => {
    if (employeeId && isTabActive) {
      refetch();
    }
  }, [startDate, endDate, employeeId, isTabActive, refetch]);

  const monitoring = monitoringData?.data;

  // Calculate statistics
  const activityStats = useMemo(() => {
    if (!monitoring?.activityLogs || monitoring.activityLogs.length === 0) {
      return null;
    }
    
    const totalKeystrokes = monitoring.activityLogs.reduce((sum: number, log: any) => sum + (log.keystrokes || 0), 0);
    const totalMouseClicks = monitoring.activityLogs.reduce((sum: number, log: any) => sum + (log.mouseClicks || 0), 0);
    const totalIdleSeconds = monitoring.activityLogs.reduce((sum: number, log: any) => sum + (log.idleSeconds || 0), 0);
    const totalScrolls = monitoring.activityLogs.reduce((sum: number, log: any) => sum + (log.scrollCount || 0), 0);
    const activeTime = monitoring.activityLogs.length * 5; // Assuming 5 minutes per log entry
    
    return {
      totalKeystrokes,
      totalMouseClicks,
      totalIdleSeconds,
      totalIdleMinutes: Math.round(totalIdleSeconds / 60),
      totalIdleHours: Math.round(totalIdleSeconds / 3600 * 10) / 10,
      totalScrolls,
      activeTimeMinutes: activeTime,
      logCount: monitoring.activityLogs.length
    };
  }, [monitoring?.activityLogs]);

  const productivityStats = useMemo(() => {
    if (!monitoring?.productivityScores || monitoring.productivityScores.length === 0) {
      return null;
    }
    
    const scores = monitoring.productivityScores.map((s: any) => s.score || 0);
    const avgScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    return {
      average: Math.round(avgScore * 100) / 100,
      max: Math.round(maxScore * 100) / 100,
      min: Math.round(minScore * 100) / 100,
      count: scores.length
    };
  }, [monitoring?.productivityScores]);

  const breakStats = useMemo(() => {
    if (!monitoring?.breaks || monitoring.breaks.length === 0) {
      return null;
    }
    
    const completedBreaks = monitoring.breaks.filter((b: any) => b.endTime);
    const totalBreakSeconds = completedBreaks.reduce((sum: number, b: any) => sum + (b.totalSeconds || 0), 0);
    const activeBreaks = monitoring.breaks.filter((b: any) => !b.endTime);
    
    return {
      total: monitoring.breaks.length,
      completed: completedBreaks.length,
      active: activeBreaks.length,
      totalBreakMinutes: Math.round(totalBreakSeconds / 60),
      totalBreakHours: Math.round(totalBreakSeconds / 3600 * 10) / 10
    };
  }, [monitoring?.breaks]);

  // Aggregate active window/app usage - group by appName and windowTitle, calculate total time
  const aggregatedAppUsage = useMemo(() => {
    if (!monitoring?.activityLogs || monitoring.activityLogs.length === 0) {
      return [];
    }

    const appMap = new Map<string, {
      appName: string;
      processName?: string;
      windowTitle?: string;
      totalDurationSeconds: number;
      totalKeystrokes: number;
      totalMouseClicks: number;
      totalScrolls: number;
      firstSeen: Date;
      lastSeen: Date;
      count: number;
    }>();

    monitoring.activityLogs.forEach((log: any) => {
      if (!log.activeWindow || (!log.activeWindow.appName && !log.activeWindow.windowTitle)) {
        return;
      }

      // Create a unique key for grouping
      const appName = log.activeWindow.appName || 'Unknown App';
      const windowTitle = log.activeWindow.windowTitle || '';
      const key = `${appName}|||${windowTitle}`;

      if (!appMap.has(key)) {
        appMap.set(key, {
          appName,
          processName: log.activeWindow.processName,
          windowTitle: windowTitle || undefined,
          totalDurationSeconds: 0,
          totalKeystrokes: 0,
          totalMouseClicks: 0,
          totalScrolls: 0,
          firstSeen: new Date(log.timestamp),
          lastSeen: new Date(log.timestamp),
          count: 0
        });
      }

      const entry = appMap.get(key)!;
      entry.totalDurationSeconds += log.activeWindow.durationSeconds || 0;
      entry.totalKeystrokes += log.keystrokes || 0;
      entry.totalMouseClicks += log.mouseClicks || 0;
      entry.totalScrolls += log.scrollCount || 0;
      entry.count += 1;

      const logDate = new Date(log.timestamp);
      if (logDate < entry.firstSeen) {
        entry.firstSeen = logDate;
      }
      if (logDate > entry.lastSeen) {
        entry.lastSeen = logDate;
      }
    });

    // Convert to array and sort by total duration (most used first)
    return Array.from(appMap.values())
      .map(entry => ({
        ...entry,
        totalDurationMinutes: Math.round(entry.totalDurationSeconds / 60),
        totalDurationHours: Math.round(entry.totalDurationSeconds / 3600 * 10) / 10
      }))
      .sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);
  }, [monitoring?.activityLogs]);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">Monitoring Period</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="w-full sm:w-auto"
            >
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs sm:text-sm mb-1.5 block">Start Date</Label>
              <Input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-full text-sm sm:text-base"
              />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs sm:text-sm mb-1.5 block">End Date</Label>
              <Input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="w-full text-sm sm:text-base"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Monitoring Sections */}
      <Tabs value={activeMonitoringTab} onValueChange={setActiveMonitoringTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="device" className="text-xs sm:text-sm">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Device
          </TabsTrigger>
          <TabsTrigger value="apps" className="text-xs sm:text-sm">
            <Monitor className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Apps Usage
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm">
            <MousePointerClick className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="productivity" className="text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Productivity
          </TabsTrigger>
          <TabsTrigger value="breaks" className="text-xs sm:text-sm">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Breaks
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="text-xs sm:text-sm">
            <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
            Screenshots
          </TabsTrigger>
        </TabsList>

        {/* Device Tab */}
        <TabsContent value="device" className="mt-4">
          <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : monitoring?.device ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Device ID</Label>
                <p className="text-sm sm:text-base font-medium break-all">{monitoring.device.deviceId || '-'}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Machine Name</Label>
                <p className="text-sm sm:text-base font-medium">{monitoring.device.machineName || '-'}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">OS Version</Label>
                <p className="text-sm sm:text-base font-medium">{monitoring.device.osVersion || '-'}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">System IP</Label>
                <p className="text-sm sm:text-base font-medium">{monitoring.device.systemIp || '-'}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">System Model</Label>
                <p className="text-sm sm:text-base font-medium">{monitoring.device.systemModel || '-'}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Last Seen</Label>
                <p className="text-sm sm:text-base font-medium">
                  {monitoring.device.lastSeenAt
                    ? format(new Date(monitoring.device.lastSeenAt), "MMM d, yyyy HH:mm")
                    : '-'}
                </p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Agent Version</Label>
                <p className="text-sm sm:text-base font-medium">{monitoring.device.agentVersion || '-'}</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/30">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={monitoring.device.status === 'active' ? 'default' : 'secondary'}
                    className={`text-xs sm:text-sm ${monitoring.device.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    {monitoring.device.status ? monitoring.device.status.charAt(0).toUpperCase() + monitoring.device.status.slice(1) : 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Activity className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm sm:text-base font-medium mb-1">No device information available</p>
              <p className="text-xs sm:text-sm">No monitoring device is currently registered for this employee</p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Apps Usage Tab - Aggregated */}
        <TabsContent value="apps" className="mt-4">
          <Card>
            <CardHeader className="pb-3 sm:pb-6 bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Application Usage Summary
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Total time spent in each application/window
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : aggregatedAppUsage && aggregatedAppUsage.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {aggregatedAppUsage.map((app: any, index: number) => (
                    <div key={index} className="p-3 sm:p-4 border-2 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <MonitorSpeaker className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-semibold text-foreground mb-1">
                                {app.appName}
                              </p>
                              {app.processName && app.processName !== app.appName && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  Process: {app.processName}
                                </p>
                              )}
                              {app.windowTitle && (
                                <p className="text-xs sm:text-sm text-muted-foreground truncate" title={app.windowTitle}>
                                  <FileTextIcon className="w-3 h-3 inline mr-1" />
                                  {app.windowTitle}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="default" className="text-xs sm:text-sm">
                                {app.totalDurationHours > 0 
                                  ? `${app.totalDurationHours}h ${app.totalDurationMinutes % 60}m`
                                  : `${app.totalDurationMinutes}m`}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {app.count} session{app.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Total Keystrokes</p>
                              <p className="text-sm font-semibold">{app.totalKeystrokes.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total Clicks</p>
                              <p className="text-sm font-semibold">{app.totalMouseClicks.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total Scrolls</p>
                              <p className="text-sm font-semibold">{app.totalScrolls.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">First Seen</p>
                              <p className="text-sm font-semibold">{format(app.firstSeen, "MMM d, HH:mm")}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Last seen: {format(app.lastSeen, "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-muted-foreground">
                  <Monitor className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base font-medium mb-1">No application usage data</p>
                  <p className="text-xs sm:text-sm">No active window data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4 space-y-4 sm:space-y-6">
              <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 sm:h-28 w-full" />
              ))}
            </div>
          ) : activityStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Total Keystrokes</Label>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {activityStats.totalKeystrokes.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activityStats.logCount} log entries</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Total Mouse Clicks</Label>
                <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">
                  {activityStats.totalMouseClicks.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Across all sessions</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Total Scrolls</Label>
                <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {activityStats.totalScrolls.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Scroll events</p>
              </div>
              <div className="p-3 sm:p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Total Idle Time</Label>
                <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {activityStats.totalIdleHours > 0 
                    ? `${activityStats.totalIdleHours}h ${activityStats.totalIdleMinutes % 60}m`
                    : `${activityStats.totalIdleMinutes}m`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{activityStats.totalIdleSeconds.toLocaleString()} seconds</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Activity className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm sm:text-base font-medium mb-1">No activity data available</p>
              <p className="text-xs sm:text-sm">No activity logs found for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>

          {/* Recent Activity Logs with Pagination */}
          {monitoring?.activityLogs && monitoring.activityLogs.length > 0 && (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Activity Logs</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {monitoring.activityLogs
                    .slice((activityLogsPage - 1) * pageSize, activityLogsPage * pageSize)
                    .map((log: any, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium mb-1">
                            {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                          </p>
                          {log.activeWindow && (
                            <div className="space-y-1 mt-1">
                              {log.activeWindow.appName && (
                                <p className="text-xs text-muted-foreground">
                                  <Monitor className="w-3 h-3 inline mr-1" />
                                  App: <span className="font-medium text-foreground">{log.activeWindow.appName}</span>
                                </p>
                              )}
                              {log.activeWindow.windowTitle && (
                                <p className="text-xs text-muted-foreground truncate" title={log.activeWindow.windowTitle}>
                                  <FileTextIcon className="w-3 h-3 inline mr-1" />
                                  {log.activeWindow.windowTitle}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {log.keystrokes > 0 && (
                            <Badge variant="outline" className="text-xs">
                              ⌨️ {log.keystrokes} keys
                            </Badge>
                          )}
                          {log.mouseClicks > 0 && (
                            <Badge variant="outline" className="text-xs">
                              🖱️ {log.mouseClicks} clicks
                            </Badge>
                          )}
                          {log.scrollCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              📜 {log.scrollCount} scrolls
                            </Badge>
                          )}
                          {log.idleSeconds > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              ⏸️ {Math.round(log.idleSeconds / 60)}m idle
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                {monitoring.activityLogs.length > pageSize && (
                  <Pagination
                    page={activityLogsPage}
                    pageSize={pageSize}
                    total={monitoring.activityLogs.length}
                    pages={Math.ceil(monitoring.activityLogs.length / pageSize)}
                    onPageChange={(newPage) => {
                      setActivityLogsPage(newPage);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setActivityLogsPage(1);
                    }}
                    showPageSizeSelector={true}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="mt-4 space-y-4 sm:space-y-6">
          {/* Productivity Summary */}
          {productivityStats && (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Productivity Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Average Score</Label>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {productivityStats.average}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Based on {productivityStats.count} scores</p>
                  </div>
                  <div className="p-3 sm:p-4 border rounded-lg bg-teal-50 dark:bg-teal-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Highest Score</Label>
                    <p className="text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-400">
                      {productivityStats.max}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Peak performance</p>
                  </div>
                  <div className="p-3 sm:p-4 border rounded-lg bg-rose-50 dark:bg-rose-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Lowest Score</Label>
                    <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">
                      {productivityStats.min}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Minimum recorded</p>
                  </div>
                  <div className="p-3 sm:p-4 border rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Total Scores</Label>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                      {productivityStats.count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Score entries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Productivity Scores Detail with Pagination */}
          {monitoring?.productivityScores && monitoring.productivityScores.length > 0 && (
            <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Productivity Scores</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 sm:space-y-3">
              {monitoring.productivityScores
                .slice((productivityScoresPage - 1) * pageSize, productivityScoresPage * pageSize)
                .map((score: any, index: number) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium mb-1">
                      {format(new Date(score.timestamp), "MMM d, yyyy HH:mm:ss")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Productivity Score: <span className="font-semibold text-foreground">{Math.round(score.score * 100) / 100}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      ⌨️ {score.keystrokes || 0} keys
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      🖱️ {score.mouseClicks || 0} clicks
                    </Badge>
                    {score.idleSeconds > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ⏸️ {Math.round(score.idleSeconds / 60)}m idle
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {monitoring.productivityScores.length > pageSize && (
              <Pagination
                page={productivityScoresPage}
                pageSize={pageSize}
                total={monitoring.productivityScores.length}
                pages={Math.ceil(monitoring.productivityScores.length / pageSize)}
                onPageChange={(newPage) => {
                  setProductivityScoresPage(newPage);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setProductivityScoresPage(1);
                }}
                showPageSizeSelector={true}
              />
            )}
          </CardContent>
        </Card>
          )}
        </TabsContent>

        {/* Breaks Tab */}
        <TabsContent value="breaks" className="mt-4 space-y-4 sm:space-y-6">
          {/* Break Summary */}
          {breakStats && (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Break Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 border rounded-lg bg-sky-50 dark:bg-sky-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Total Breaks</Label>
                    <p className="text-xl sm:text-2xl font-bold text-sky-700 dark:text-sky-400">
                      {breakStats.total}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">All break records</p>
                  </div>
                  <div className="p-3 sm:p-4 border rounded-lg bg-cyan-50 dark:bg-cyan-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Completed</Label>
                    <p className="text-xl sm:text-2xl font-bold text-cyan-700 dark:text-cyan-400">
                      {breakStats.completed}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">With end time</p>
                  </div>
                  <div className="p-3 sm:p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Active Breaks</Label>
                    <p className="text-xl sm:text-2xl font-bold text-orange-700 dark:text-orange-400">
                      {breakStats.active}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Currently ongoing</p>
                  </div>
                  <div className="p-3 sm:p-4 border rounded-lg bg-pink-50 dark:bg-pink-950/20">
                    <Label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Total Break Time</Label>
                    <p className="text-xl sm:text-2xl font-bold text-pink-700 dark:text-pink-400">
                      {breakStats.totalBreakHours > 0 
                        ? `${breakStats.totalBreakHours}h ${breakStats.totalBreakMinutes % 60}m`
                        : `${breakStats.totalBreakMinutes}m`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breaks Detail with Pagination */}
          {monitoring?.breaks && monitoring.breaks.length > 0 && (
            <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Break Records</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 sm:space-y-3">
              {monitoring.breaks
                .slice((breaksPage - 1) * pageSize, breaksPage * pageSize)
                .map((breakItem: any, index: number) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium mb-1">
                      {format(new Date(breakItem.startTime), "MMM d, yyyy HH:mm:ss")}
                      {breakItem.endTime && (
                        <span className="text-muted-foreground">
                          {' - '}{format(new Date(breakItem.endTime), "HH:mm:ss")}
                        </span>
                      )}
                    </p>
                    {breakItem.totalSeconds ? (
                      <p className="text-xs text-muted-foreground">
                        Duration: <span className="font-medium text-foreground">
                          {breakItem.totalSeconds >= 3600 
                            ? `${Math.floor(breakItem.totalSeconds / 3600)}h ${Math.floor((breakItem.totalSeconds % 3600) / 60)}m ${breakItem.totalSeconds % 60}s`
                            : breakItem.totalSeconds >= 60
                            ? `${Math.floor(breakItem.totalSeconds / 60)}m ${breakItem.totalSeconds % 60}s`
                            : `${breakItem.totalSeconds}s`}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Ongoing break</p>
                    )}
                  </div>
                  <Badge variant={breakItem.endTime ? "default" : "secondary"} className="text-xs">
                    {breakItem.source || 'Unknown'} {!breakItem.endTime && '(Active)'}
                  </Badge>
                </div>
              ))}
            </div>
            {monitoring.breaks.length > pageSize && (
              <Pagination
                page={breaksPage}
                pageSize={pageSize}
                total={monitoring.breaks.length}
                pages={Math.ceil(monitoring.breaks.length / pageSize)}
                onPageChange={(newPage) => {
                  setBreaksPage(newPage);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setBreaksPage(1);
                }}
                showPageSizeSelector={true}
              />
            )}
          </CardContent>
        </Card>
          )}
        </TabsContent>

        {/* Screenshots Tab */}
        <TabsContent value="screenshots" className="mt-4 space-y-4 sm:space-y-6">
          {monitoring?.screenshots && monitoring.screenshots.length > 0 ? (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Screenshots</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {monitoring.screenshots.length} screenshot{monitoring.screenshots.length !== 1 ? 's' : ''} captured
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {monitoring.screenshots
                    .slice((screenshotsPage - 1) * pageSize, screenshotsPage * pageSize)
                    .map((screenshot: any, index: number) => (
                      <div key={index} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card">
                        {screenshot.secureUrl || screenshot.cloudinaryUrl ? (
                          <div 
                            className="relative group cursor-pointer"
                            onClick={() => setSelectedScreenshot({
                              url: screenshot.secureUrl || screenshot.cloudinaryUrl,
                              timestamp: screenshot.timestamp
                            })}
                          >
                            <img
                              src={screenshot.secureUrl || screenshot.cloudinaryUrl}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-48 object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                              <Eye className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-muted flex items-center justify-center">
                            <Camera className="w-8 h-8 text-muted-foreground opacity-50" />
                          </div>
                        )}
                        <div className="p-2 sm:p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            {format(new Date(screenshot.timestamp), "MMM d, yyyy HH:mm")}
                          </p>
                          {screenshot.width && screenshot.height && (
                            <p className="text-xs text-muted-foreground">
                              {screenshot.width} × {screenshot.height}px
                            </p>
                          )}
                          {screenshot.size && (
                            <p className="text-xs text-muted-foreground">
                              {(screenshot.size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                {monitoring.screenshots.length > pageSize && (
                  <Pagination
                    page={screenshotsPage}
                    pageSize={pageSize}
                    total={monitoring.screenshots.length}
                    pages={Math.ceil(monitoring.screenshots.length / pageSize)}
                    onPageChange={(newPage) => {
                      setScreenshotsPage(newPage);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setScreenshotsPage(1);
                    }}
                    showPageSizeSelector={true}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Screenshots</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center py-8 sm:py-12 text-muted-foreground">
                  <Camera className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm sm:text-base font-medium mb-1">No screenshots available</p>
                  <p className="text-xs sm:text-sm">No screenshots were captured for the selected period</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Screenshot Preview Dialog */}
          <Dialog open={!!selectedScreenshot} onOpenChange={(open) => !open && setSelectedScreenshot(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Screenshot Preview</DialogTitle>
                {selectedScreenshot && (
                  <DialogDescription>
                    Captured on {format(new Date(selectedScreenshot.timestamp), "MMM d, yyyy 'at' HH:mm:ss")}
                  </DialogDescription>
                )}
              </DialogHeader>
              {selectedScreenshot && (
                <div className="space-y-4">
                  <div className="relative w-full flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                    <img
                      src={selectedScreenshot.url}
                      alt="Screenshot Preview"
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedScreenshot.url, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedScreenshot.url;
                        link.download = `screenshot-${format(new Date(selectedScreenshot.timestamp), 'yyyy-MM-dd-HH-mm-ss')}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StaffProfile = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "profile");
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // Tab scroll functionality - removed since we're using grid layout now

  // If no ID, redirect to staff list
  useEffect(() => {
    if (!id) {
      navigate('/staff');
    }
  }, [id, navigate]);

  const { data: staffDataResponse, isLoading, error, refetch } = useGetStaffByIdQuery(id || "", {
    skip: !id,
    refetchOnMountOrArgChange: true
  });

  const { data: onboardingData, isLoading: isLoadingOnboarding, refetch: refetchOnboarding } = useGetOnboardingByStaffIdQuery(id || "", {
    skip: !id
  });

  // Fetch templates and shifts for editing
  const { data: shiftsData } = useGetAvailableShiftsQuery();
  const { data: templatesData } = useGetAvailableTemplatesQuery();
  const { data: branchesData } = useGetActiveBranchesQuery();
  
  const shifts = shiftsData?.data?.shifts || [];
  const attendanceTemplates = templatesData?.data?.attendanceTemplates || [];
  const leaveTemplates = templatesData?.data?.leaveTemplates || [];
  const holidayTemplates = templatesData?.data?.holidayTemplates || [];
  const weeklyHolidayTemplates = templatesData?.data?.weeklyHolidayTemplates || [];
  const branches = branchesData?.data?.branches || [];

  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [verifyDocument, { isLoading: isVerifying }] = useVerifyDocumentMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadStaffAvatarMutation();
  const [uploadDocument, { isLoading: isUploadingDocument }] = useUploadOnboardingDocumentMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document verification state
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"COMPLETED" | "REJECTED">("COMPLETED");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [openDepartment, setOpenDepartment] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");

  // Permission checks
  const { user } = useAppSelector((state) => state.auth);
  const permissions = user ? getUserPermissions(user.role, user.roleId as any, user.permissions) : [];
  const canVerifyDocuments = hasAction(permissions, 'staff', 'update') || hasAction(permissions, 'staff', 'edit') || user?.role === 'Admin' || user?.role === 'Super Admin';

  // Fetch departments
  const { data: departmentsData, refetch: refetchDepartments } = useGetDepartmentsQuery();
  const [createDepartment] = useCreateDepartmentMutation();
  const departments = departmentsData?.data?.departments || [];
  
  // Get all staff to extract unique departments
  const { data: allStaffForDepartments } = useGetStaffQuery({ limit: 100, page: 1 });
  const allStaffMembers = allStaffForDepartments?.data?.staff || [];
  
  // Get unique departments from all staff data and combine with API departments
  const uniqueDepartments = useMemo(() => {
    const departmentsSet = new Set<string>();
    
    // Add departments from the API (source of truth)
    departments.forEach((dept: any) => {
      if (dept.name) {
        departmentsSet.add(dept.name);
      }
    });
    
    // Add departments from all staff records (to catch any that might not be in the departments table)
    allStaffMembers.forEach((member: any) => {
      if (member.department) {
        departmentsSet.add(member.department);
      }
    });
    
    return Array.from(departmentsSet).sort();
  }, [departments, allStaffMembers]);

  // Get users with role Employee and subRole Manager for reporting manager selection
  const { data: usersData } = useGetUsersQuery({ 
    limit: 100, 
    page: 1,
    isActive: 'true'
  });
  const allUsers = usersData?.data?.users || [];
  const managerUserIds = allUsers
    .filter((user: any) => user.role === 'Employee' && user.subRole === 'Manager')
    .map((user: any) => user._id);
  
  // Get all staff for reporting manager selection - filter to only those with manager users
  const { data: allStaffForManagerData } = useGetStaffQuery({ limit: 100, status: "Active", page: 1 });
  const allStaffForManager = (allStaffForManagerData?.data?.staff || []).filter((staffMember: any) => {
    const staffUserId = typeof staffMember.userId === 'object' ? staffMember.userId?._id : staffMember.userId;
    return staffUserId && managerUserIds.includes(staffUserId);
  });

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast.error("Please enter a department name");
      return;
    }

    // Check if department already exists (case-insensitive)
    const existing = departments.find((d: any) => d.name.toLowerCase() === newDepartmentName.trim().toLowerCase());
    if (existing) {
      toast.info("Department already exists");
      handleInputChange('department', existing.name);
      setNewDepartmentName("");
      setDepartmentSearch("");
      setOpenDepartment(false);
      return;
    }

    try {
      const result = await createDepartment({ name: newDepartmentName.trim() }).unwrap();
      if (result.success) {
        handleInputChange('department', result.data.department.name);
        toast.success("Department created successfully");
        setNewDepartmentName("");
        setDepartmentSearch("");
        setOpenDepartment(false);
        refetchDepartments();
      }
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to create department";
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
        toast.info("Department already exists");
        refetchDepartments().then(() => {
          const existingDept = departments.find((d: any) => d.name.toLowerCase() === newDepartmentName.trim().toLowerCase());
          if (existingDept) {
            handleInputChange('department', existingDept.name);
          }
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const employeeData = staffDataResponse?.data?.staff;
  const candidateData = employeeData?.candidateId && typeof employeeData.candidateId === 'object' ? employeeData.candidateId : null;
  const onboarding = onboardingData?.data?.onboarding;

  useEffect(() => {
    if (employeeData) {
      // Extract template IDs - handle both string and populated object cases
      const getTemplateId = (template: any) => {
        if (!template) return "";
        if (typeof template === 'string') return template;
        if (typeof template === 'object' && template._id) return template._id;
        return "";
      };

      // Extract ID from object or string - helper function for type safety
      const getId = (value: any): string => {
        if (!value) return "";
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value !== null && '_id' in value) {
          return (value as { _id: string })._id || "";
        }
        return "";
      };

      setFormData({
        name: employeeData.name || "",
        email: employeeData.email || "",
        phone: employeeData.phone || "",
        alternativePhone: employeeData.alternativePhone || "",
        countryCode: employeeData.countryCode || "",
        designation: employeeData.designation || "",
        department: employeeData.department || "",
        staffType: employeeData.staffType || "Full Time",
        joiningDate: employeeData.joiningDate ? new Date(employeeData.joiningDate).toISOString().split('T')[0] : '',
        gender: employeeData.gender || "",
        dob: employeeData.dob ? new Date(employeeData.dob).toISOString().split('T')[0] : '',
        maritalStatus: employeeData.maritalStatus || "",
        bloodGroup: employeeData.bloodGroup || "",
        branchId: getId(employeeData.branchId),
        employeeId: employeeData.employeeId || "",
        managerId: getId(employeeData.managerId),
        shiftName: employeeData.shiftName || "",
        attendanceTemplateId: getTemplateId(employeeData.attendanceTemplateId),
        leaveTemplateId: getTemplateId(employeeData.leaveTemplateId),
        holidayTemplateId: getTemplateId(employeeData.holidayTemplateId),
        weeklyHolidayTemplateId: getTemplateId(employeeData.weeklyHolidayTemplateId),
        address: {
          line1: employeeData.address?.line1 || "",
          city: employeeData.address?.city || "",
          state: employeeData.address?.state || "",
          postalCode: employeeData.address?.postalCode || "",
          country: employeeData.address?.country || ""
        },
        bankDetails: {
          bankName: employeeData.bankDetails?.bankName || "",
          accountNumber: employeeData.bankDetails?.accountNumber || "",
          ifscCode: employeeData.bankDetails?.ifscCode || "",
          accountHolderName: employeeData.bankDetails?.accountHolderName || "",
          upiId: employeeData.bankDetails?.upiId || ""
        },
        uan: employeeData.uan || "",
        pan: employeeData.pan || "",
        aadhaar: employeeData.aadhaar || "",
        pfNumber: employeeData.pfNumber || "",
        esiNumber: employeeData.esiNumber || ""
      });
    }
  }, [employeeData]);

  // Scroll functionality removed - using grid layout instead

  const handleSave = async () => {
    if (!id) return;
    try {
      // Helper function to clean empty strings from nested objects
      const cleanNestedObject = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        const cleaned: any = {};
        for (const key in obj) {
          const value = obj[key];
          if (value !== null && value !== undefined && value !== "") {
            cleaned[key] = value;
          }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
      };

      // Prepare update data - convert "none" to undefined and empty strings to undefined
      const updateData: any = {
        name: formData.name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        alternativePhone: formData.alternativePhone && formData.alternativePhone.trim() ? formData.alternativePhone.trim() : undefined,
        countryCode: formData.countryCode && formData.countryCode.trim() ? formData.countryCode.trim() : undefined,
        designation: formData.designation || undefined,
        department: formData.department || undefined,
        staffType: formData.staffType || undefined,
        joiningDate: formData.joiningDate && formData.joiningDate.trim() ? formData.joiningDate : undefined,
        employeeId: formData.employeeId && formData.employeeId.trim() ? formData.employeeId.trim() : undefined,
        managerId: formData.managerId && formData.managerId !== "none" && formData.managerId.trim() ? formData.managerId : undefined,
        gender: formData.gender && formData.gender !== "" && formData.gender !== "none" ? formData.gender : undefined,
        dob: formData.dob && formData.dob.trim() ? formData.dob : undefined,
        maritalStatus: formData.maritalStatus && formData.maritalStatus !== "" && formData.maritalStatus !== "none" ? formData.maritalStatus : undefined,
        bloodGroup: formData.bloodGroup && formData.bloodGroup.trim() ? formData.bloodGroup.trim() : undefined,
        shiftName: formData.shiftName && formData.shiftName !== "none" && formData.shiftName.trim() ? formData.shiftName.trim() : undefined,
        attendanceTemplateId: formData.attendanceTemplateId && formData.attendanceTemplateId !== "none" && formData.attendanceTemplateId.trim() ? formData.attendanceTemplateId : undefined,
        leaveTemplateId: formData.leaveTemplateId && formData.leaveTemplateId !== "none" && formData.leaveTemplateId.trim() ? formData.leaveTemplateId : undefined,
        holidayTemplateId: formData.holidayTemplateId && formData.holidayTemplateId !== "none" && formData.holidayTemplateId.trim() ? formData.holidayTemplateId : undefined,
        branchId: formData.branchId && formData.branchId !== "none" && formData.branchId.trim() ? formData.branchId : undefined,
        address: cleanNestedObject(formData.address),
        bankDetails: cleanNestedObject(formData.bankDetails),
        uan: formData.uan && formData.uan.trim() ? formData.uan.trim() : undefined,
        pan: formData.pan && formData.pan.trim() ? formData.pan.trim() : undefined,
        aadhaar: formData.aadhaar && formData.aadhaar.trim() ? formData.aadhaar.trim() : undefined,
        pfNumber: formData.pfNumber && formData.pfNumber.trim() ? formData.pfNumber.trim() : undefined,
        esiNumber: formData.esiNumber && formData.esiNumber.trim() ? formData.esiNumber.trim() : undefined,
      };

      // Remove undefined values to avoid sending them
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      await updateStaff({
        id,
        data: updateData
      }).unwrap();
      message.success("Profile updated successfully");
      setIsEditing(false);
      refetch(); // Refresh the data
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      message.error(errorMessage);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await updateStaff({
        id,
        data: { status: newStatus } as any
      }).unwrap();
      message.success(`Staff ${newStatus.toLowerCase()} successfully`);
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      message.error(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev: any) => ({
        ...prev,
        [parent]: {
          ...prev[parent] || {},
          [child]: value
        }
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!employeeData) {
    return (
      <MainLayout>
        <div className="p-6 text-red-500">
          Employee not found or failed to load.
          {error && <p className="text-sm text-muted-foreground mt-2">{JSON.stringify(error)}</p>}
        </div>
      </MainLayout>
    );
  }

  // Helper to safely get manager name if populated or string
  const getManagerName = (manager: any) => {
    if (!manager) return "";
    return typeof manager === 'object' ? manager.name : "";
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Staff Profile</h1>
          <Button variant="outline" onClick={() => navigate('/staff')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Staff
          </Button>
        </div>

        <div className="space-y-6">

          {/* HEADER CARD */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={employeeData.avatar} />
                      <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                        {employeeData.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity cursor-pointer">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && id) {
                          try {
                            const result = await uploadAvatar({
                              staffId: id,
                              file,
                            }).unwrap();
                            message.success("Avatar uploaded successfully");
                            // Store avatar in localStorage if this is the current user's profile
                            const employeeData = staffDataResponse?.data?.staff;
                            if (currentUser && employeeData?.userId && 
                                (typeof employeeData.userId === 'object' 
                                  ? employeeData.userId._id?.toString() 
                                  : employeeData.userId?.toString()) === currentUser.id) {
                              if (result.data?.avatar) {
                                storeUserAvatar(result.data.avatar);
                              }
                            }
                            refetch();
                          } catch (error: any) {
                            message.error(
                              error?.data?.error?.message ||
                                "Failed to upload avatar"
                            );
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="absolute inset-0 rounded-full"
                      disabled={isUploadingAvatar}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {isEditing ? (
                        <Input
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="text-2xl font-bold h-10"
                        />
                      ) : employeeData.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge>{employeeData.employeeId}</Badge>
                      <Badge variant="secondary">{employeeData.staffType}</Badge>
                      <span className="text-muted-foreground">{employeeData.designation}</span>
                      <Badge variant={employeeData.status === 'Active' ? 'default' : 'secondary'}>{employeeData.status}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeTab === "profile" && (
                    <>
                      {isEditing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                            <X className="w-4 h-4 mr-2" /> Cancel
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                            <Save className="w-4 h-4 mr-2" /> {isUpdating ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Profile
                        </Button>
                      )}
                    </>
                  )}

                  {employeeData.status === 'Active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange('Deactivated')}
                      className="   hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Ban className="w-4 h-4 mr-2" /> Deactivate Staff
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange('Active')}
                      className="text-[#efaa1f] hover:text-[#d97706] hover:bg-[#fffbeb] border-[#fde68a]"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Activate Staff
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            {/* TOP TABS WITH GRID LAYOUT - ALL TABS VISIBLE WITHOUT SCROLLING */}
            <div className="w-full mb-6">
              <TabsList
                className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 h-auto gap-1.5 p-1.5"
              >
              <TabsTrigger 
                value="profile"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                value="attendance"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Attendance</span>
              </TabsTrigger>
              {(currentUser?.role === 'Admin' || currentUser?.role === 'HR' || currentUser?.role === 'Manager' || currentUser?.role === 'Super Admin') && (
                <TabsTrigger 
                  value="monitoring"
                  className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
                >
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                  <span>Monitoring</span>
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="salary"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <span className="text-base sm:text-lg mr-1.5 flex-shrink-0 font-semibold">₹</span>
                <span>Salary Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="salaryStructure"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Salary Structure</span>
              </TabsTrigger>
              <TabsTrigger 
                value="leaves"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Leaves</span>
              </TabsTrigger>
              <TabsTrigger 
                value="loans"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Loans</span>
              </TabsTrigger>
              <TabsTrigger 
                value="documents"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Documents</span>
              </TabsTrigger>
              <TabsTrigger 
                value="claim"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Expense Claim</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payslips"
                className="text-xs sm:text-sm flex items-center justify-center whitespace-nowrap"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                <span>Payslip Requests</span>
              </TabsTrigger>
            </TabsList>
            </div>

            {/* TAB CONTENT */}
            <div className="w-full">

                {/* TAB: PROFILE */}
                <TabsContent value="profile" className="space-y-6 mt-4">
                  <Card>
                    <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={isEditing ? formData.name : employeeData.name || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employee ID</Label>
                        {isEditing ? (
                          <Input
                            value={formData.employeeId || ""}
                            onChange={(e) => handleInputChange('employeeId', e.target.value)}
                            placeholder="Enter employee code"
                          />
                        ) : (
                          <Input value={employeeData.employeeId || "N/A"} readOnly className="bg-muted" />
                        )}
                        {isEditing && (
                          <p className="text-xs text-muted-foreground">
                            Employee code must be unique. If the code already exists, you will see an error message.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Designation</Label>
                        <Input
                          value={isEditing ? formData.designation : employeeData.designation || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('designation', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Staff Type</Label>
                        {isEditing ? (
                          <Select
                            value={formData.staffType}
                            onValueChange={(val) => handleInputChange('staffType', val)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Full Time">Full Time</SelectItem>
                              <SelectItem value="Part Time">Part Time</SelectItem>
                              <SelectItem value="Contract">Contract</SelectItem>
                              <SelectItem value="Intern">Intern</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={employeeData.staffType || "N/A"} readOnly />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Number</Label>
                        <Input
                          value={isEditing ? formData.phone : employeeData.phone || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country Code</Label>
                        <Input
                          value={isEditing ? formData.countryCode : employeeData.countryCode || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('countryCode', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                          placeholder="e.g., 91 for India"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alternative Phone (Optional)</Label>
                        <Input
                          value={isEditing ? formData.alternativePhone : employeeData.alternativePhone || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('alternativePhone', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                          placeholder="Alternative contact number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        {isEditing ? (
                          <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={openDepartment} className="w-full justify-between">
                                {formData.department ? formData.department : "Select or enter department..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput
                                  placeholder="Search or type new department..."
                                  value={departmentSearch}
                                  onValueChange={(value) => {
                                    setDepartmentSearch(value);
                                    setNewDepartmentName(value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && departmentSearch.trim()) {
                                      e.preventDefault();
                                      setNewDepartmentName(departmentSearch);
                                      handleCreateDepartment();
                                    }
                                  }}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="p-2 space-y-2">
                                      <div className="text-sm text-muted-foreground text-center">
                                        No department found.
                                      </div>
                                      {departmentSearch.trim() && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => {
                                            setNewDepartmentName(departmentSearch);
                                            handleCreateDepartment();
                                          }}
                                        >
                                          <X className="h-4 w-4 mr-2 rotate-45" />
                                          Add "{departmentSearch}"
                                        </Button>
                                      )}
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {departments
                                      .filter((dept: any) =>
                                        !departmentSearch || dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
                                      )
                                      .map((dept: any) => (
                                        <CommandItem
                                          key={dept._id}
                                          value={dept.name}
                                          onSelect={(currentValue) => {
                                            handleInputChange('department', dept.name);
                                            setOpenDepartment(false);
                                            setDepartmentSearch("");
                                          }}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", formData.department === dept.name ? "opacity-100" : "opacity-0")} />
                                          {dept.name}
                                        </CommandItem>
                                      ))}
                                    {uniqueDepartments
                                      .filter((dept) => !departments.some((d: any) => d.name.toLowerCase() === dept.toLowerCase()))
                                      .filter((dept) =>
                                        !departmentSearch || dept.toLowerCase().includes(departmentSearch.toLowerCase())
                                      )
                                      .map((dept) => (
                                        <CommandItem
                                          key={dept}
                                          value={dept}
                                          onSelect={(currentValue) => {
                                            handleInputChange('department', dept);
                                            setOpenDepartment(false);
                                            setDepartmentSearch("");
                                          }}
                                        >
                                          <Check className={cn("mr-2 h-4 w-4", formData.department === dept ? "opacity-100" : "opacity-0")} />
                                          {dept}
                                        </CommandItem>
                                      ))}
                                    {departmentSearch.trim() && 
                                     !departments.some((d: any) => d.name.toLowerCase() === departmentSearch.toLowerCase()) &&
                                     !uniqueDepartments.some((d) => d.toLowerCase() === departmentSearch.toLowerCase()) && (
                                      <CommandItem
                                        onSelect={() => {
                                          setNewDepartmentName(departmentSearch);
                                          handleCreateDepartment();
                                        }}
                                        className="text-primary font-medium"
                                      >
                                        <X className="h-4 w-4 mr-2 rotate-45" />
                                        Add "{departmentSearch}" as new department
                                      </CommandItem>
                                    )}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Input value={employeeData.department || "N/A"} readOnly />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Reporting Manager</Label>
                        {isEditing ? (
                          <Select
                            value={formData.managerId || "none"}
                            onValueChange={(value) => handleInputChange('managerId', value === "none" ? "" : value)}
                          >
                            <SelectTrigger><SelectValue placeholder="Select reporting manager (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {allStaffForManager.map((staffMember: any) => (
                                <SelectItem key={staffMember._id} value={staffMember._id}>
                                  {staffMember.name} ({staffMember.employeeId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={getManagerName(employeeData.managerId) || ""} readOnly className="bg-muted" placeholder="Not assigned" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input value={employeeData.designation || ""} readOnly className="bg-muted" placeholder="Not assigned" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Salary Cycle" value="Monthly" />
                      {employeeData.salary && (() => {
                        // Check if salary has basicSalary (new structure) or gross/net (old structure)
                        const salary = employeeData.salary as any;
                        const hasBasicSalary = salary && typeof salary.basicSalary === 'number';
                        
                        if (hasBasicSalary) {
                          // Use new salary structure calculation
                          const staffSalary = salary as SalaryStructureInputs;
                          try {
                            const calculatedSalary = calculateSalaryStructure(staffSalary);
                            return (
                              <>
                                <Field 
                                  label="Gross Salary" 
                                  value={`₹ ${calculatedSalary.monthly.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                                />
                                <Field 
                                  label="Net Salary" 
                                  value={`₹ ${calculatedSalary.monthly.netMonthlySalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                                />
                              </>
                            );
                          } catch (error) {
                            console.error('Error calculating salary structure:', error);
                            return null;
                          }
                        } else {
                          // Fallback to old structure (if gross/net exist directly)
                          return (
                            <>
                              <Field 
                                label="Gross Salary" 
                                value={`₹ ${salary.gross?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`} 
                              />
                              <Field 
                                label="Net Salary" 
                                value={`₹ ${salary.net?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`} 
                              />
                            </>
                          );
                        }
                      })()}
                      {employeeData.offerLetterUrl && (
                        <div className="space-y-2">
                          <Label>Offer Letter</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(employeeData.offerLetterUrl, '_blank')}
                            className="w-full"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Offer Letter
                          </Button>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Shift</Label>
                        {isEditing ? (
                          <Select
                            value={formData.shiftName || undefined}
                            onValueChange={(value) => setFormData({ ...formData, shiftName: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select shift (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {shifts.map((shift, index) => (
                                <SelectItem key={index} value={shift.name}>
                                  {shift.name} ({shift.startTime} - {shift.endTime})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.shiftName 
                                ? `${employeeData.shiftName}${shifts.find(s => s.name === employeeData.shiftName) ? ` (${shifts.find(s => s.name === employeeData.shiftName)?.startTime} - ${shifts.find(s => s.name === employeeData.shiftName)?.endTime})` : ''}`
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Attendance Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.attendanceTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, attendanceTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select attendance template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {attendanceTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.attendanceTemplateId 
                                ? (typeof employeeData.attendanceTemplateId === 'object' 
                                    ? employeeData.attendanceTemplateId.name 
                                    : attendanceTemplates.find(t => t._id === employeeData.attendanceTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Leave Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.leaveTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, leaveTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select leave template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {leaveTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.leaveTemplateId 
                                ? (typeof employeeData.leaveTemplateId === 'object' 
                                    ? employeeData.leaveTemplateId.name 
                                    : leaveTemplates.find(t => t._id === employeeData.leaveTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Holiday Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.holidayTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, holidayTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select holiday template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {holidayTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.holidayTemplateId 
                                ? (typeof employeeData.holidayTemplateId === 'object' 
                                    ? employeeData.holidayTemplateId.name 
                                    : holidayTemplates.find(t => t._id === employeeData.holidayTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Weekly Holiday Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.weeklyHolidayTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, weeklyHolidayTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select weekly holiday template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {weeklyHolidayTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.weeklyHolidayTemplateId 
                                ? (typeof employeeData.weeklyHolidayTemplateId === 'object' 
                                    ? employeeData.weeklyHolidayTemplateId.name 
                                    : weeklyHolidayTemplates.find(t => t._id === employeeData.weeklyHolidayTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      {branches.length > 0 && (
                        <div className="space-y-2">
                          <Label>Branch</Label>
                          {isEditing ? (
                            <Select
                              value={formData.branchId || undefined}
                              onValueChange={(value) => {
                                const newBranchId = value === "none" ? "" : value;
                                setFormData({ ...formData, branchId: newBranchId });
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Select branch (optional)" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {branches.map((branch) => (
                                  <SelectItem key={branch._id} value={branch._id}>
                                    {branch.branchName} {(branch as any).isHeadOffice ? "(Head Office)" : ""} - {branch.branchCode}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              value={
                                employeeData.branchId 
                                  ? (typeof employeeData.branchId === 'object' && employeeData.branchId !== null
                                      ? `${(employeeData.branchId as any).branchName} ${(employeeData.branchId as any).isHeadOffice ? "(Head Office)" : ""} - ${(employeeData.branchId as any).branchCode}`
                                      : branches.find(b => b._id === employeeData.branchId) 
                                        ? (() => {
                                            const branch = branches.find(b => b._id === employeeData.branchId);
                                            return `${branch?.branchName} ${(branch as any)?.isHeadOffice ? "(Head Office)" : ""} - ${branch?.branchCode}`;
                                          })()
                                        : "Unknown")
                                  : "Not assigned"
                              } 
                              readOnly 
                              className="bg-muted" 
                            />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={isEditing ? formData.email : employeeData.email || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        {isEditing ? (
                          <Select value={formData.gender} onValueChange={(val) => handleInputChange('gender', val)}>
                            <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={employeeData.gender || "N/A"} readOnly className="bg-muted" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input
                          type={isEditing ? "date" : "text"}
                          value={isEditing ? formData.dob : (employeeData.dob ? new Date(employeeData.dob).toLocaleDateString() : "N/A")}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('dob', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Marital Status</Label>
                        {isEditing ? (
                          <Select value={formData.maritalStatus} onValueChange={(val) => handleInputChange('maritalStatus', val)}>
                            <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Divorced">Divorced</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={employeeData.maritalStatus || "N/A"} readOnly className="bg-muted" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Group</Label>
                        <Input
                          value={isEditing ? formData.bloodGroup : employeeData.bloodGroup || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Current Address</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Address Line 1</Label>
                        <Input
                          value={isEditing ? formData.address.line1 : employeeData.address?.line1 || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.line1', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={isEditing ? formData.address.city : employeeData.address?.city || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.city', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                          value={isEditing ? formData.address.state : employeeData.address?.state || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.state', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input
                          value={isEditing ? formData.address.postalCode : employeeData.address?.postalCode || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input
                          value={isEditing ? formData.address.country : employeeData.address?.country || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.country', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Employment Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date of Joining</Label>
                        {isEditing ? (
                          <DatePicker
                            value={formData.joiningDate && formData.joiningDate.trim() ? new Date(formData.joiningDate) : undefined}
                            onChange={(date) => {
                              if (date) {
                                handleInputChange('joiningDate', format(date, 'yyyy-MM-dd'));
                              } else {
                                handleInputChange('joiningDate', '');
                              }
                            }}
                            placeholder="Select joining date"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={employeeData.joiningDate ? format(new Date(employeeData.joiningDate), 'PPP') : "N/A"}
                            readOnly
                            className="bg-muted"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>UAN</Label>
                        <Input
                          value={isEditing ? formData.uan : employeeData.uan || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('uan', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PAN Number</Label>
                        <Input
                          value={isEditing ? formData.pan : employeeData.pan || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('pan', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aadhaar Number</Label>
                        <Input
                          value={isEditing ? formData.aadhaar : employeeData.aadhaar || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PF Number</Label>
                        <Input
                          value={isEditing ? formData.pfNumber : employeeData.pfNumber || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('pfNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ESI Number</Label>
                        <Input
                          value={isEditing ? formData.esiNumber : employeeData.esiNumber || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('esiNumber', e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name of Bank</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.bankName : employeeData.bankDetails?.bankName || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.bankName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IFSC Code</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.ifscCode : employeeData.bankDetails?.ifscCode || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.ifscCode', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.accountNumber : employeeData.bankDetails?.accountNumber || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.accountNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.accountHolderName : employeeData.bankDetails?.accountHolderName || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.accountHolderName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UPI ID</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.upiId : employeeData.bankDetails?.upiId || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.upiId', e.target.value)}
                        />
                      </div>
                      {/* <div>
                        <Label>Verification Status</Label>
                        <div className="pt-2"><Badge variant="outline">Pending</Badge></div>
                      </div> */}
                    </CardContent>
                  </Card>

                  {/* Candidate Details Section */}
                  {candidateData && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Previous Candidate Details</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Information from candidate application</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Education */}
                        {candidateData.education && candidateData.education.length > 0 && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Education</Label>
                            <div className="space-y-3">
                              {candidateData.education.map((edu: any, idx: number) => (
                                <div key={idx} className="p-3 border rounded-lg">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div><span className="font-medium">Qualification:</span> {edu.qualification || "N/A"}</div>
                                    <div><span className="font-medium">Course:</span> {edu.courseName || "N/A"}</div>
                                    <div><span className="font-medium">Institution:</span> {edu.institution || "N/A"}</div>
                                    <div><span className="font-medium">University:</span> {edu.university || "N/A"}</div>
                                    <div><span className="font-medium">Year:</span> {edu.yearOfPassing || "N/A"}</div>
                                    {(edu.percentage || edu.cgpa) && (
                                      <div><span className="font-medium">Score:</span> {edu.percentage || edu.cgpa}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {candidateData.experience && candidateData.experience.length > 0 && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Work Experience</Label>
                            <div className="space-y-3">
                              {candidateData.experience.map((exp: any, idx: number) => (
                                <div key={idx} className="p-3 border rounded-lg">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div><span className="font-medium">Company:</span> {exp.company || "N/A"}</div>
                                    <div><span className="font-medium">Role:</span> {exp.role || exp.designation || "N/A"}</div>
                                    <div><span className="font-medium">Duration:</span> {exp.durationFrom} - {exp.durationTo || "Present"}</div>
                                    {exp.keyResponsibilities && (
                                      <div className="sm:col-span-2"><span className="font-medium">Responsibilities:</span> {exp.keyResponsibilities}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {candidateData.skills && candidateData.skills.length > 0 && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Skills</Label>
                            <div className="flex flex-wrap gap-2">
                              {candidateData.skills.map((skill: string, idx: number) => (
                                <Badge key={idx} variant="secondary">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Total Experience */}
                        {candidateData.totalYearsOfExperience && (
                          <div>
                            <Label className="text-base font-semibold mb-2 block">Total Years of Experience</Label>
                            <p className="text-sm">{candidateData.totalYearsOfExperience} years</p>
                          </div>
                        )}

                        {/* Referral Information */}
                        {candidateData.source === 'REFERRAL' && (candidateData.referrerId || candidateData.referralMetadata) && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Referral Information</Label>
                            <div className="p-3 border rounded-lg space-y-2 text-sm">
                              {candidateData.referrerId && typeof candidateData.referrerId === 'object' && (
                                <div>
                                  <span className="font-medium">Referred by:</span> {candidateData.referrerId.name} ({candidateData.referrerId.email})
                                </div>
                              )}
                              {candidateData.referralMetadata && (
                                <>
                                  {candidateData.referralMetadata.relationship && (
                                    <div><span className="font-medium">Relationship:</span> {candidateData.referralMetadata.relationship}</div>
                                  )}
                                  {candidateData.referralMetadata.knownPeriod && (
                                    <div><span className="font-medium">Known Period:</span> {candidateData.referralMetadata.knownPeriod}</div>
                                  )}
                                  {candidateData.referralMetadata.notes && (
                                    <div><span className="font-medium">Notes:</span> {candidateData.referralMetadata.notes}</div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ... other tabs ... */}
                {/* OTHER TABS */}
                <TabsContent value="attendance" className="mt-4">
                  <div className="w-full">
                    {id ? (
                    <EmployeeAttendance employeeId={id} />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-base font-medium mb-2">Staff ID Required</p>
                        <p className="text-sm">Unable to load attendance. Please ensure a valid staff ID is provided.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {(currentUser?.role === 'Admin' || currentUser?.role === 'HR' || currentUser?.role === 'Manager' || currentUser?.role === 'Super Admin') && (
                  <TabsContent value="monitoring" className="mt-4">
                    <MonitoringTabContent employeeId={id || ''} isTabActive={activeTab === 'monitoring'} />
                  </TabsContent>
                )}
                
                <TabsContent value="salary" className="mt-4 space-y-6">
                  <div className="w-full">
                    <SalaryOverview employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="salaryStructure" className="mt-4 space-y-6">
                  <SalaryStructureForm 
                    staffId={id || ''} 
                    staff={employeeData}
                    onSave={() => refetch()}
                  />
                </TabsContent>

                <TabsContent value="leaves" className="mt-4">
                  <div className="w-full">
                    <LeavesPendingApproval employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="loans" className="mt-4">
                  <div className="w-full">
                    <Loans employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <div className="w-full space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Onboarding Documents</CardTitle>
                        {onboarding && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Progress: {onboarding.progress}% • Status: {onboarding.status.replace('_', ' ')}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {isLoadingOnboarding ? (
                          <div className="text-center py-12">
                            <Skeleton className="h-8 w-full mb-4" />
                            <Skeleton className="h-8 w-full mb-4" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        ) : !onboarding || !onboarding.documents || onboarding.documents.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">No documents available</p>
                            <p className="text-sm text-muted-foreground">No onboarding documents have been uploaded yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {onboarding.documents.map((doc) => {
                              const getStatusBadge = () => {
                                switch (doc.status) {
                                  case 'COMPLETED':
                                    return (
                                      <Badge className="bg-[#efaa1f]">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Approved
                                      </Badge>
                                    );
                                  case 'REJECTED':
                                    return (
                                      <Badge className="bg-red-500">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Rejected
                                      </Badge>
                                    );
                                  case 'PENDING':
                                    return (
                                      <Badge className="bg-yellow-500">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Under Review
                                      </Badge>
                                    );
                                  default:
                                    return (
                                      <Badge variant="outline">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Not Started
                                      </Badge>
                                    );
                                }
                              };

                              return (
                                <div key={doc._id} className="border rounded-lg p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <h4 className="font-medium">{doc.name}</h4>
                                        {doc.required && (
                                          <Badge variant="destructive" className="text-xs">Required</Badge>
                                        )}
                                        {getStatusBadge()}
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">Type: {doc.type}</p>
                                      {doc.uploadedAt && (
                                        <p className="text-xs text-muted-foreground">
                                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </p>
                                      )}
                                      {doc.notes && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                          <span className="font-medium">Notes:</span> {doc.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {doc.url ? (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(doc.url, '_blank')}
                                          >
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              try {
                                                const response = await fetch(doc.url!);
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = doc.name;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                window.URL.revokeObjectURL(url);
                                              } catch (error) {
                                                console.error("Failed to download document:", error);
                                                // Fallback to opening in new tab if download fails
                                                window.open(doc.url!, '_blank');
                                              }
                                            }}
                                          >
                                            <Download className="w-4 h-4" />
                                          </Button>
                                          {canVerifyDocuments && doc.status === 'PENDING' && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                setSelectedDocument(doc);
                                                setVerifyStatus("COMPLETED");
                                                setVerifyNotes("");
                                                setIsVerifyDialogOpen(true);
                                              }}
                                            >
                                              Review
                                            </Button>
                                          )}
                                          {canVerifyDocuments && (
                                            <label className="cursor-pointer">
                                              <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                onChange={async (e) => {
                                                  const file = e.target.files?.[0];
                                                  if (file && onboarding?._id) {
                                                    setUploadingDocId(doc._id);
                                                    try {
                                                      await uploadDocument({
                                                        onboardingId: onboarding._id,
                                                        documentId: doc._id,
                                                        file,
                                                      }).unwrap();
                                                      message.success("Document uploaded successfully");
                                                      refetchOnboarding();
                                                    } catch (error: any) {
                                                      message.error(
                                                        error?.data?.error?.message ||
                                                          "Failed to upload document"
                                                      );
                                                    } finally {
                                                      setUploadingDocId(null);
                                                      e.target.value = "";
                                                    }
                                                  }
                                                }}
                                                disabled={isUploadingDocument || uploadingDocId === doc._id}
                                              />
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                                disabled={isUploadingDocument || uploadingDocId === doc._id}
                                              >
                                                <span>
                                                  <Upload className="w-3 h-3 mr-1" />
                                                  {uploadingDocId === doc._id
                                                    ? "Uploading..."
                                                    : "Replace"}
                                                </span>
                                              </Button>
                                            </label>
                                          )}
                                        </>
                                      ) : (
                                        canVerifyDocuments ? (
                                          <label className="cursor-pointer">
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file && onboarding?._id) {
                                                  setUploadingDocId(doc._id);
                                                  try {
                                                    await uploadDocument({
                                                      onboardingId: onboarding._id,
                                                      documentId: doc._id,
                                                      file,
                                                    }).unwrap();
                                                    message.success("Document uploaded successfully");
                                                    refetchOnboarding();
                                                  } catch (error: any) {
                                                    message.error(
                                                      error?.data?.error?.message ||
                                                        "Failed to upload document"
                                                    );
                                                  } finally {
                                                    setUploadingDocId(null);
                                                    e.target.value = "";
                                                  }
                                                }
                                              }}
                                              disabled={isUploadingDocument || uploadingDocId === doc._id}
                                            />
                                            <Button
                                              size="sm"
                                              variant="default"
                                              asChild
                                              disabled={isUploadingDocument || uploadingDocId === doc._id}
                                            >
                                              <span>
                                                <Upload className="w-3 h-3 mr-1" />
                                                {uploadingDocId === doc._id
                                                  ? "Uploading..."
                                                  : "Upload"}
                                              </span>
                                            </Button>
                                          </label>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">Not uploaded</span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="claim" className="mt-4">
                  <div className="w-full">
                    <ExpenseClaim employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="payslips" className="mt-4">
                  <div className="w-full">
                    <PayslipRequests employeeId={id} />
                  </div>
                </TabsContent>
            </div>
          </Tabs>

          {/* Document Verification Dialog */}
          <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review Document</DialogTitle>
                <DialogDescription>
                  Review and verify the document for {employeeData?.name} ({employeeData?.employeeId})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Document Name</Label>
                  <p className="text-sm font-medium">{selectedDocument?.name}</p>
                </div>
                {selectedDocument?.url && (
                  <div>
                    <Label>Document Preview</Label>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedDocument.url, "_blank")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Document
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Label>Verification Status *</Label>
                  <Select
                    value={verifyStatus}
                    onValueChange={(value: "COMPLETED" | "REJECTED") =>
                      setVerifyStatus(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLETED">Approve (Verified)</SelectItem>
                      <SelectItem value="REJECTED">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes or comments about this document..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsVerifyDialogOpen(false);
                      setSelectedDocument(null);
                      setVerifyNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedDocument || !onboarding?._id) return;
                      try {
                        await verifyDocument({
                          onboardingId: onboarding._id,
                          documentId: selectedDocument._id,
                          status: verifyStatus,
                          notes: verifyNotes || undefined,
                        }).unwrap();
                        message.success(
                          `Document ${verifyStatus === "COMPLETED" ? "approved" : "rejected"} successfully`
                        );
                        setIsVerifyDialogOpen(false);
                        setSelectedDocument(null);
                        setVerifyNotes("");
                        refetchOnboarding();
                      } catch (error: any) {
                        const errorMessage = formatErrorMessage(error);
                        message.error(errorMessage);
                      }
                    }}
                    disabled={isVerifying}
                  >
                    {isVerifying
                      ? "Processing..."
                      : verifyStatus === "COMPLETED"
                      ? "Approve Document"
                      : "Reject Document"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </MainLayout>
  );
};

export default StaffProfile;


const Field = ({ label, value, className = "" }) => (
  <div className={`${className} space-y-2`}>
    <Label>{label}</Label>
    <Input value={value} readOnly />
  </div>
);
