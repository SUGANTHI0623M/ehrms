import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  MapPin,
  Navigation,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  Calendar,
  Car,
  Footprints,
  AlertCircle,
  Map as MapIcon,
  Loader2,
  Search,
  X,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Shield,
  FileCheck,
  User,
  Building2,
  Mail,
  Phone,
  MapPinned,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import MapView, { MapMarker, MapRoute } from "@/components/tracking/MapView";
import MainLayout from "@/components/MainLayout";
import {
  useLazyGetStaffTimelineQuery,
  useGetMultipleStaffTimelineQuery,
  TimelineEvent,
} from "@/store/api/trackingApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { format } from "date-fns";
import { message } from "antd";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";

const Timeline = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(
    null,
  );

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
    // Default to timeline if path doesn't match any specific tab
    return "timeline";
  };
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [showAllUsers, setShowAllUsers] = useState<boolean>(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>("");
  const [debouncedStaffSearch, setDebouncedStaffSearch] = useState<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // Infinite scroll state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allEvents, setAllEvents] = useState<TimelineEvent[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const scrollObserverRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 50;

  // Fetch all staff (not just with location access enabled)
  const {
    data: staffData,
    isLoading: isLoadingStaff,
    isError: isErrorStaff,
  } = useGetStaffQuery({ limit: 50, status: "Active", page: 1 });

  // Use lazy query for infinite scroll
  const [
    fetchTimeline,
    {
      data: timelineData,
      isLoading: isLoadingTimeline,
      isError: isErrorTimeline,
    },
  ] = useLazyGetStaffTimelineQuery();

  // Fetch initial page when staff or date changes
  useEffect(() => {
    if (selectedStaffId && !showAllUsers) {
      setCurrentPage(1);
      setAllEvents([]);
      setHasMore(true);
      fetchTimeline({
        staffId: selectedStaffId,
        date: selectedDate,
        page: 1,
        limit: pageSize,
      });
    }
  }, [selectedStaffId, selectedDate, showAllUsers, fetchTimeline]);

  // Accumulate events when new data arrives
  useEffect(() => {
    if (timelineData?.data?.events) {
      if (currentPage === 1) {
        // First page - replace all events
        setAllEvents(timelineData.data.events);
      } else {
        // Subsequent pages - append events
        setAllEvents((prev) => [...prev, ...timelineData.data.events]);
      }
      setHasMore(timelineData.data.pagination?.hasMore || false);
      setIsLoadingMore(false);
    }
  }, [timelineData, currentPage]);

  // Fetch timeline data for all staff (multiple users mode)
  const {
    data: multipleTimelineData,
    isLoading: isLoadingMultipleTimeline,
    isError: isErrorMultipleTimeline,
    refetch: refetchMultipleTimeline,
  } = useGetMultipleStaffTimelineQuery(
    { date: selectedDate },
    {
      skip: !showAllUsers,
      refetchOnMountOrArgChange: true, // Refetch when date changes
    },
  );

  // Debug: Log query parameters
  useEffect(() => {
    console.log("[Timeline] Query params:", {
      selectedStaffId,
      selectedDate,
      showAllUsers,
      timestamp: new Date().toISOString(),
    });
  }, [selectedStaffId, selectedDate, showAllUsers]);

  // Get staff list from the query result
  const staffList = staffData?.data?.staff || [];

  // Debounce staff search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedStaffSearch(staffSearchQuery);
    }, 300); // 300ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [staffSearchQuery]);

  // Filter staff list based on debounced search query
  const filteredStaffList = staffList.filter((staff) => {
    if (!debouncedStaffSearch.trim()) {
      return true;
    }
    const searchLower = debouncedStaffSearch.toLowerCase().trim();
    const nameMatch = staff.name?.toLowerCase().includes(searchLower);
    const employeeIdMatch = staff.employeeId
      ?.toLowerCase()
      .includes(searchLower);
    const emailMatch = staff.email?.toLowerCase().includes(searchLower);
    return nameMatch || employeeIdMatch || emailMatch;
  });

  // Reset selected staff if current selection is no longer in the list
  useEffect(() => {
    if (filteredStaffList.length > 0 && selectedStaffId) {
      const staffExists = filteredStaffList.some(
        (s) => s._id === selectedStaffId,
      );
      if (!staffExists) {
        setSelectedStaffId("");
      }
    }
  }, [filteredStaffList, selectedStaffId]);

  // Handle errors
  useEffect(() => {
    if (isErrorStaff) {
      message.error("Failed to load staff with location access");
    }
    if (isErrorTimeline) {
      message.error("Failed to load timeline data");
    }
    if (isErrorMultipleTimeline) {
      message.error("Failed to load multiple staff timeline data");
    }
  }, [isErrorStaff, isErrorTimeline, isErrorMultipleTimeline]);

  // Get timeline events based on mode
  const timelineEvents: TimelineEvent[] = showAllUsers
    ? multipleTimelineData?.data?.events || []
    : allEvents;

  // Group events by taskId for step-by-step display
  const eventsByTask = new Map<string, TimelineEvent[]>();
  const ungroupedEvents: TimelineEvent[] = [];

  timelineEvents.forEach((event) => {
    if (event.taskId) {
      if (!eventsByTask.has(event.taskId)) {
        eventsByTask.set(event.taskId, []);
      }
      eventsByTask.get(event.taskId)!.push(event);
    } else {
      ungroupedEvents.push(event);
    }
  });

  // Sort events within each task by timestamp
  eventsByTask.forEach((events) => {
    events.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  });

  // Sort ungrouped events by timestamp
  ungroupedEvents.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Format description with distance and duration
  const formatEventDescription = (event: TimelineEvent): string => {
    // Handle undefined descriptions
    if (
      !event.description ||
      event.description === "undefined" ||
      event.description === "null"
    ) {
      // Build description from available data
      const eventType = event.type || "stop";
      if (event.distance !== undefined && event.duration !== undefined) {
        if (eventType === "drive" || eventType === "walk") {
          return `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} - ${(event.distance || 0).toFixed(2)} km, ${event.duration}m duration`;
        } else if (eventType === "stop") {
          return `Stop - ${event.duration}m duration`;
        }
      }
      return eventType.charAt(0).toUpperCase() + eventType.slice(1);
    }
    return event.description;
  };

  // Generate color for each staff member (for multiple users view)
  const getStaffColor = (staffId?: string): string => {
    if (!staffId) return "#6b7280";
    const colors = [
      "#3b82f6", // Blue
      "#10b981", // Green
      "#f59e0b", // Orange
      "#8b5cf6", // Purple
      "#ef4444", // Red
      "#06b6d4", // Cyan
      "#ec4899", // Pink
      "#14b8a6", // Teal
    ];
    // Simple hash to get consistent color for each staff
    let hash = 0;
    for (let i = 0; i < staffId.length; i++) {
      hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Group events by staff for route generation (multiple users)
  const routesByStaff = new Map<string, [number, number][]>();
  if (showAllUsers) {
    timelineEvents.forEach((event) => {
      if (event.position && event.position.length === 2 && event.staffId) {
        if (!routesByStaff.has(event.staffId)) {
          routesByStaff.set(event.staffId, []);
        }
        routesByStaff.get(event.staffId)!.push(event.position);
      }
    });
  }

  // Generate route from timeline events (single user or combined)
  const route: [number, number][] = showAllUsers
    ? [] // Routes will be handled per staff in MapView
    : timelineEvents
        .filter((event) => event.position && event.position.length === 2)
        .map((event) => event.position!);

  // Generate markers from timeline events
  const markers: MapMarker[] = timelineEvents
    .filter((event) => event.position && event.position.length === 2)
    .map((event, index) => {
      const staffColor =
        showAllUsers && event.staffId
          ? getStaffColor(event.staffId)
          : undefined;
      return {
        id: event.id || `event-${index}`,
        position: event.position!,
        title:
          showAllUsers && event.staffName
            ? `${event.staffName} - ${event.time} - ${event.type || "stop"}`
            : `${event.time} - ${event.type || "stop"}`,
        description:
          formatEventDescription(event) +
          (showAllUsers && event.staffName ? ` (${event.staffName})` : ""),
        color:
          staffColor ||
          ((event.type || "stop") === "outage"
            ? "#ef4444" // Red for outage
            : (event.type || "stop") === "geotag"
              ? "#3b82f6" // Blue for geotag
              : (event.type || "stop") === "location" ||
                  (event.type || "stop") === "arrived"
                ? "#10b981" // Green for location/arrived
                : (event.type || "stop") === "exited"
                  ? "#f59e0b" // Orange for exited
                  : (event.type || "stop") === "live"
                    ? "#8b5cf6" // Purple for live
                    : (event.type || "stop") === "drive"
                      ? "#3b82f6" // Blue for drive
                      : (event.type || "stop") === "walk"
                        ? "#06b6d4" // Cyan for walk
                        : "#6b7280"), // Gray for others
      };
    });

  // Handle event click to highlight on map
  const handleEventClick = (index: number) => {
    setSelectedEventIndex(index);
  };

  // Load more events (infinite scroll)
  const loadMoreEvents = useCallback(() => {
    if (!isLoadingMore && hasMore && selectedStaffId && !showAllUsers) {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchTimeline({
        staffId: selectedStaffId,
        date: selectedDate,
        page: nextPage,
        limit: pageSize,
      });
    }
  }, [
    isLoadingMore,
    hasMore,
    selectedStaffId,
    showAllUsers,
    currentPage,
    selectedDate,
    fetchTimeline,
  ]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreEvents();
        }
      },
      { threshold: 0.1 },
    );

    if (scrollObserverRef.current) {
      observer.observe(scrollObserverRef.current);
    }

    return () => {
      if (scrollObserverRef.current) {
        observer.unobserve(scrollObserverRef.current);
      }
    };
  }, [hasMore, isLoadingMore, loadMoreEvents]);

  const getIcon = (type: string) => {
    switch (type) {
      case "location":
      case "geotag":
        return <MapPin className="w-4 h-4" />;
      case "drive":
        return <Car className="w-4 h-4" />;
      case "walk":
        return <Footprints className="w-4 h-4" />;
      case "stop":
        return <MapIcon className="w-4 h-4" />;
      case "arrived":
        return <MapPin className="w-4 h-4 text-green-500" />;
      case "exited":
        return <MapPin className="w-4 h-4 text-orange-500" />;
      case "live":
        return <Navigation className="w-4 h-4 text-purple-500" />;
      case "outage":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
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

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardHeader className="px-4 py-4 sm:px-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Timeline</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Individual staff member activity timeline
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                      <Checkbox
                        id="show-all-users"
                        checked={showAllUsers}
                        onCheckedChange={(checked) => {
                          setShowAllUsers(checked as boolean);
                          if (checked) {
                            setSelectedStaffId("");
                          }
                        }}
                      />
                      <label
                        htmlFor="show-all-users"
                        className="text-sm font-medium cursor-pointer flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Show All Users
                      </label>
                    </div>
                    <div className="relative">
                      <Select
                        value={selectedStaffId}
                        onValueChange={setSelectedStaffId}
                        disabled={isLoadingStaff || showAllUsers}
                      >
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue
                            placeholder={
                              showAllUsers
                                ? "All users selected"
                                : isLoadingStaff
                                  ? "Loading staff..."
                                  : filteredStaffList.length === 0
                                    ? "No staff available"
                                    : "Select Staff"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {/* Search input inside dropdown */}
                          <div className="sticky top-0 z-10 bg-popover border-b p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search employee..."
                                value={staffSearchQuery}
                                onChange={(e) => {
                                  setStaffSearchQuery(e.target.value);
                                }}
                                className="pl-8 pr-8 h-9"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              {staffSearchQuery && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStaffSearchQuery("");
                                  }}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Staff list */}
                          <div className="max-h-[250px] overflow-y-auto">
                            {filteredStaffList.length > 0 ? (
                              filteredStaffList.map((staff) => (
                                <SelectItem key={staff._id} value={staff._id}>
                                  {staff.name} ({staff.employeeId})
                                </SelectItem>
                              ))
                            ) : (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                {staffSearchQuery
                                  ? "No staff found"
                                  : "No staff available"}
                              </div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm bg-transparent border-none outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Timeline List */}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {isLoadingTimeline || isLoadingMultipleTimeline ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">
                          Loading timeline...
                        </span>
                      </div>
                    ) : !selectedStaffId && !showAllUsers ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Please select a staff member to view timeline</p>
                      </div>
                    ) : timelineEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No timeline events found for this date</p>
                      </div>
                    ) : (
                      <>
                        {/* Employee Address Header */}
                        {!showAllUsers && timelineData?.data?.staff && (
                          <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                            <div className="text-sm font-semibold mb-1">
                              {timelineData.data.staff.name} (
                              {timelineData.data.staff.employeeId})
                            </div>
                            {timelineEvents.length > 0 &&
                              timelineEvents[0].fullAddress && (
                                <div className="text-xs text-muted-foreground">
                                  {timelineEvents[0].fullAddress}
                                </div>
                              )}
                          </div>
                        )}

                        {/* Display events grouped by taskId */}
                        {Array.from(eventsByTask.entries()).map(
                          ([taskId, taskEvents]) => {
                            const isTaskCollapsed = collapsedTasks.has(taskId);
                            const taskTitle =
                              taskEvents[0]?.taskTitle || `Task: ${taskId}`;
                            const taskStatus =
                              taskEvents[0]?.taskStatus ||
                              taskEvents.find((e) => e.taskDetail)?.taskDetail
                                ?.status;
                            const taskDetail = taskEvents.find(
                              (e) => e.taskDetail,
                            )?.taskDetail;

                            return (
                              <div
                                key={taskId}
                                className="mb-6 border rounded-lg overflow-hidden bg-card shadow-sm"
                              >
                                {/* Collapsible Task Header */}
                                <div
                                  className="px-4 py-3 bg-primary/10 hover:bg-primary/15 transition-colors cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    setCollapsedTasks((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(taskId)) {
                                        newSet.delete(taskId);
                                      } else {
                                        newSet.add(taskId);
                                      }
                                      return newSet;
                                    });
                                  }}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {isTaskCollapsed ? (
                                      <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                                    )}
                                    <FileCheck className="w-4 h-4 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-foreground truncate">
                                          {taskTitle}
                                        </span>
                                        {taskStatus && (
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded ${
                                              taskStatus === "completed"
                                                ? "bg-green-100 text-green-700"
                                                : taskStatus === "in_progress"
                                                  ? "bg-blue-100 text-blue-700"
                                                  : "bg-gray-100 text-gray-700"
                                            }`}
                                          >
                                            {taskStatus}
                                          </span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          ({taskEvents.length} events)
                                        </span>
                                      </div>
                                      {taskDetail && (
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4 flex-wrap">
                                          {taskDetail.tripDistanceKm !==
                                            undefined && (
                                            <span className="flex items-center gap-1">
                                              <Navigation className="w-3 h-3" />
                                              {taskDetail.tripDistanceKm.toFixed(
                                                2,
                                              )}{" "}
                                              km
                                            </span>
                                          )}
                                          {taskDetail.tripDurationSeconds !==
                                            undefined && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {Math.round(
                                                taskDetail.tripDurationSeconds /
                                                  60,
                                              )}{" "}
                                              min
                                            </span>
                                          )}
                                          {taskDetail.arrived && (
                                            <span className="flex items-center gap-1 text-green-600">
                                              <CheckCircle2 className="w-3 h-3" />
                                              Arrived
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/hrms-geo/tracking/task/${taskId}`,
                                        );
                                      }}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      View Full
                                    </Button>
                                  </div>
                                </div>

                                {/* Task Events - Collapsible */}
                                {!isTaskCollapsed && (
                                  <div className="px-4 py-2">
                                    {taskEvents.map((event, eventIndex) => {
                                      const globalIndex =
                                        timelineEvents.findIndex(
                                          (e) => e.id === event.id,
                                        );
                                      const isExpanded = expandedEvents.has(
                                        event.id,
                                      );
                                      const hasTaskDetail =
                                        event.taskDetail !== undefined &&
                                        event.taskDetail !== null;

                                      return (
                                        <div
                                          key={event.id}
                                          className={`flex gap-4 transition-all p-3 rounded-lg border ${
                                            selectedEventIndex === globalIndex
                                              ? "bg-primary/10 border-primary shadow-sm"
                                              : "hover:bg-muted/50 border-border"
                                          }`}
                                        >
                                          <div className="flex flex-col items-center">
                                            <div
                                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                (event.type || "stop") ===
                                                "outage"
                                                  ? "bg-red-100 text-red-600"
                                                  : (event.type || "stop") ===
                                                      "geotag"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : (event.type || "stop") ===
                                                        "arrived"
                                                      ? "bg-green-100 text-green-600"
                                                      : (event.type ||
                                                            "stop") === "exited"
                                                        ? "bg-orange-100 text-orange-600"
                                                        : (event.type ||
                                                              "stop") === "live"
                                                          ? "bg-purple-100 text-purple-600"
                                                          : "bg-muted text-muted-foreground"
                                              }`}
                                            >
                                              {getIcon(event.type || "stop")}
                                            </div>
                                            {eventIndex <
                                              taskEvents.length - 1 && (
                                              <div className="w-0.5 h-full bg-border mt-2"></div>
                                            )}
                                          </div>
                                          <div className="flex-1 pb-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-base">
                                                  {event.time}
                                                </span>
                                                <span className="text-sm font-semibold capitalize">
                                                  {event.type || "stop"}
                                                </span>
                                                {event.stepNumber && (
                                                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">
                                                    Step {event.stepNumber}
                                                  </span>
                                                )}
                                                {event.isTaskStart && (
                                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                    Start
                                                  </span>
                                                )}
                                                {event.isTaskEnd && (
                                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                    End
                                                  </span>
                                                )}
                                                {showAllUsers &&
                                                  event.staffName && (
                                                    <span className="text-xs font-semibold text-primary">
                                                      {event.staffName}
                                                    </span>
                                                  )}
                                              </div>
                                              {/* Expand/Collapse button for events with taskDetail */}
                                              {hasTaskDetail && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedEvents(
                                                      (prev) => {
                                                        const newSet = new Set(
                                                          prev,
                                                        );
                                                        if (
                                                          newSet.has(event.id)
                                                        ) {
                                                          newSet.delete(
                                                            event.id,
                                                          );
                                                        } else {
                                                          newSet.add(event.id);
                                                        }
                                                        return newSet;
                                                      },
                                                    );
                                                  }}
                                                >
                                                  <Eye
                                                    className={`w-3 h-3 mr-1 ${isExpanded ? "text-primary" : ""}`}
                                                  />
                                                  {isExpanded ? "Hide" : "View"}{" "}
                                                  Details
                                                </Button>
                                              )}
                                            </div>

                                            {/* Description with distance/duration */}
                                            <div className="text-sm text-foreground mb-2 font-medium">
                                              {formatEventDescription(event)}
                                            </div>

                                            {/* Detailed Tracking Information Grid */}
                                            <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                                              {/* Distance and Duration */}
                                              {event.distance !== undefined && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                  <Navigation className="w-3 h-3" />
                                                  <span>
                                                    Distance:{" "}
                                                    <strong className="text-foreground">
                                                      {event.distance.toFixed(
                                                        2,
                                                      )}{" "}
                                                      km
                                                    </strong>
                                                  </span>
                                                </div>
                                              )}
                                              {event.duration !== undefined && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                  <Clock className="w-3 h-3" />
                                                  <span>
                                                    Duration:{" "}
                                                    <strong className="text-foreground">
                                                      {event.duration}m
                                                    </strong>
                                                  </span>
                                                </div>
                                              )}

                                              {/* GPS Accuracy */}
                                              {event.accuracy !== undefined && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                  <MapPin className="w-3 h-3" />
                                                  <span>
                                                    Accuracy:{" "}
                                                    <strong className="text-foreground">
                                                      ±
                                                      {event.accuracy.toFixed(
                                                        0,
                                                      )}
                                                      m
                                                    </strong>
                                                  </span>
                                                </div>
                                              )}

                                              {/* Speed */}
                                              {event.speed !== undefined &&
                                                event.speed > 0 && (
                                                  <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Car className="w-3 h-3" />
                                                    <span>
                                                      Speed:{" "}
                                                      <strong className="text-foreground">
                                                        {event.speed.toFixed(1)}{" "}
                                                        km/h
                                                      </strong>
                                                    </span>
                                                  </div>
                                                )}

                                              {/* Heading */}
                                              {event.heading !== undefined && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                  <Navigation className="w-3 h-3" />
                                                  <span>
                                                    Heading:{" "}
                                                    <strong className="text-foreground">
                                                      {event.heading.toFixed(0)}
                                                      °
                                                    </strong>
                                                  </span>
                                                </div>
                                              )}

                                              {/* Battery percentage */}
                                              {event.batteryPercent !==
                                                undefined && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                  <span>
                                                    🔋 Battery:{" "}
                                                    <strong className="text-foreground">
                                                      {event.batteryPercent}%
                                                    </strong>
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Address for stops and other events */}
                                            {event.fullAddress && (
                                              <div className="text-xs text-muted-foreground mt-2 mb-2 p-2 bg-muted/30 rounded border-l-2 border-primary/30">
                                                <MapPin className="w-3 h-3 inline mr-1" />
                                                {event.fullAddress}
                                                {event.city &&
                                                  event.pincode && (
                                                    <span className="ml-1">
                                                      ({event.city},{" "}
                                                      {event.pincode})
                                                    </span>
                                                  )}
                                              </div>
                                            )}

                                            {/* Presence status */}
                                            {event.presenceStatus && (
                                              <div className="text-xs text-muted-foreground mt-1">
                                                <span className="font-medium">
                                                  Presence:
                                                </span>{" "}
                                                <span className="capitalize">
                                                  {event.presenceStatus}
                                                </span>
                                              </div>
                                            )}

                                            {/* Task title if available */}
                                            {event.taskTitle && (
                                              <div className="text-xs text-primary font-medium mt-1 mb-2">
                                                📋 Task: {event.taskTitle}
                                                {event.taskStatus && (
                                                  <span
                                                    className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                                      event.taskStatus ===
                                                      "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : event.taskStatus ===
                                                            "in_progress"
                                                          ? "bg-blue-100 text-blue-700"
                                                          : "bg-gray-100 text-gray-700"
                                                    }`}
                                                  >
                                                    {event.taskStatus}
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                            {/* Notes */}
                                            {event.notes && (
                                              <div className="text-xs text-muted-foreground mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                                                <strong>Note:</strong>{" "}
                                                {event.notes}
                                              </div>
                                            )}

                                            {/* Alert messages */}
                                            {event.alert && (
                                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                                {event.alert}
                                              </div>
                                            )}

                                            {/* Special handling for outage */}
                                            {event.type === "outage" && (
                                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                                Tracking service terminated
                                              </div>
                                            )}

                                            {/* Special handling for geotag */}
                                            {event.type === "geotag" &&
                                              event.id && (
                                                <div className="mt-2 flex items-center gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs"
                                                  >
                                                    Punch Out
                                                  </Button>
                                                  <span className="text-xs text-muted-foreground font-mono">
                                                    {event.id.substring(0, 32)}
                                                    ...
                                                  </span>
                                                </div>
                                              )}

                                            {/* Tracking stopped indicator */}
                                            {event.type === "exited" && (
                                              <div className="mt-2 text-xs text-muted-foreground italic">
                                                Tracking Stopped
                                              </div>
                                            )}

                                            {/* Task Detail Information - Show for all events with taskDetail */}
                                            {hasTaskDetail && isExpanded && (
                                              <div className="mt-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-primary/20 space-y-4">
                                                <div className="flex items-center justify-between mb-3">
                                                  <div className="text-sm font-semibold text-primary flex items-center gap-2">
                                                    <FileCheck className="w-4 h-4" />
                                                    Complete Task Details
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {new Date(
                                                      event.timestamp,
                                                    ).toLocaleString()}
                                                  </div>
                                                </div>

                                                {/* Task Title & Description */}
                                                {event.taskDetail.taskTitle && (
                                                  <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                                      Task Title
                                                    </div>
                                                    <div className="text-sm">
                                                      {
                                                        event.taskDetail
                                                          .taskTitle
                                                      }
                                                    </div>
                                                  </div>
                                                )}
                                                {event.taskDetail
                                                  .description && (
                                                  <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                                      Description
                                                    </div>
                                                    <div className="text-sm">
                                                      {
                                                        event.taskDetail
                                                          .description
                                                      }
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Trip Information */}
                                                {(event.taskDetail
                                                  .tripDistanceKm !==
                                                  undefined ||
                                                  event.taskDetail
                                                    .tripDurationSeconds !==
                                                    undefined) && (
                                                  <div className="grid grid-cols-2 gap-2">
                                                    {event.taskDetail
                                                      .tripDistanceKm !==
                                                      undefined && (
                                                      <div>
                                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                                          Trip Distance
                                                        </div>
                                                        <div className="text-sm">
                                                          {event.taskDetail.tripDistanceKm.toFixed(
                                                            3,
                                                          )}{" "}
                                                          km
                                                        </div>
                                                      </div>
                                                    )}
                                                    {event.taskDetail
                                                      .tripDurationSeconds !==
                                                      undefined && (
                                                      <div>
                                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                                          Trip Duration
                                                        </div>
                                                        <div className="text-sm">
                                                          {Math.round(
                                                            event.taskDetail
                                                              .tripDurationSeconds /
                                                              60,
                                                          )}{" "}
                                                          minutes
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Progress Steps */}
                                                {event.taskDetail
                                                  .progressSteps && (
                                                  <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-2">
                                                      Progress Steps
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                      <div className="flex items-center gap-2">
                                                        {event.taskDetail
                                                          .progressSteps
                                                          .reachedLocation ? (
                                                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                          <XCircle className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <span className="text-xs">
                                                          Reached Location
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        {event.taskDetail
                                                          .progressSteps
                                                          .photoProof ? (
                                                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                          <XCircle className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <span className="text-xs">
                                                          Photo Proof
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        {event.taskDetail
                                                          .progressSteps
                                                          .formFilled ? (
                                                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                          <XCircle className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <span className="text-xs">
                                                          Form Filled
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        {event.taskDetail
                                                          .progressSteps
                                                          .otpVerified ? (
                                                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                          <XCircle className="w-4 h-4 text-gray-400" />
                                                        )}
                                                        <span className="text-xs">
                                                          OTP Verified
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Photo Proof */}
                                                {event.taskDetail
                                                  .photoProofUrl && (
                                                  <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                                      <ImageIcon className="w-3 h-3" />
                                                      Photo Proof
                                                    </div>
                                                    <div className="space-y-1">
                                                      <img
                                                        src={
                                                          event.taskDetail
                                                            .photoProofUrl
                                                        }
                                                        alt="Photo Proof"
                                                        className="w-full max-w-xs rounded border cursor-pointer hover:opacity-80"
                                                        onClick={() =>
                                                          window.open(
                                                            event.taskDetail
                                                              .photoProofUrl,
                                                            "_blank",
                                                          )
                                                        }
                                                      />
                                                      {event.taskDetail
                                                        .photoProofDescription && (
                                                        <div className="text-xs text-muted-foreground">
                                                          {
                                                            event.taskDetail
                                                              .photoProofDescription
                                                          }
                                                        </div>
                                                      )}
                                                      {event.taskDetail
                                                        .photoProofUploadedAt && (
                                                        <div className="text-xs text-muted-foreground">
                                                          Uploaded:{" "}
                                                          {new Date(
                                                            event.taskDetail
                                                              .photoProofUploadedAt,
                                                          ).toLocaleString()}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* OTP Verification */}
                                                {event.taskDetail.otpCode && (
                                                  <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                                      <Shield className="w-3 h-3" />
                                                      OTP Verification
                                                    </div>
                                                    <div className="space-y-1">
                                                      <div className="text-sm font-mono">
                                                        OTP:{" "}
                                                        {
                                                          event.taskDetail
                                                            .otpCode
                                                        }
                                                      </div>
                                                      {event.taskDetail
                                                        .otpVerifiedAt && (
                                                        <div className="text-xs text-muted-foreground">
                                                          Verified:{" "}
                                                          {new Date(
                                                            event.taskDetail
                                                              .otpVerifiedAt,
                                                          ).toLocaleString()}
                                                        </div>
                                                      )}
                                                      {event.taskDetail
                                                        .otpVerifiedAddress && (
                                                        <div className="text-xs text-muted-foreground">
                                                          Location:{" "}
                                                          {
                                                            event.taskDetail
                                                              .otpVerifiedAddress
                                                          }
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Locations */}
                                                <div className="grid grid-cols-1 gap-2">
                                                  {event.taskDetail
                                                    .sourceLocation
                                                    ?.fullAddress && (
                                                    <div>
                                                      <div className="text-xs font-medium text-muted-foreground mb-1">
                                                        Source Location
                                                      </div>
                                                      <div className="text-xs">
                                                        {
                                                          event.taskDetail
                                                            .sourceLocation
                                                            .fullAddress
                                                        }
                                                      </div>
                                                    </div>
                                                  )}
                                                  {event.taskDetail
                                                    .destinationLocation
                                                    ?.fullAddress && (
                                                    <div>
                                                      <div className="text-xs font-medium text-muted-foreground mb-1">
                                                        Destination Location
                                                      </div>
                                                      <div className="text-xs">
                                                        {
                                                          event.taskDetail
                                                            .destinationLocation
                                                            .fullAddress
                                                        }
                                                      </div>
                                                    </div>
                                                  )}
                                                  {event.taskDetail
                                                    .arrivedFullAddress && (
                                                    <div>
                                                      <div className="text-xs font-medium text-muted-foreground mb-1">
                                                        Arrived At
                                                      </div>
                                                      <div className="text-xs">
                                                        {
                                                          event.taskDetail
                                                            .arrivedFullAddress
                                                        }
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Exit Information */}
                                                {event.taskDetail.exit &&
                                                  event.taskDetail.exit.length >
                                                    0 && (
                                                    <div>
                                                      <div className="text-xs font-medium text-muted-foreground mb-2">
                                                        Exit History
                                                      </div>
                                                      {event.taskDetail.exit.map(
                                                        (
                                                          exit: any,
                                                          idx: number,
                                                        ) => (
                                                          <div
                                                            key={idx}
                                                            className="text-xs mb-1 p-2 bg-orange-50 rounded border border-orange-200"
                                                          >
                                                            <div>
                                                              Reason:{" "}
                                                              {exit.exitReason}
                                                            </div>
                                                            <div>
                                                              Status:{" "}
                                                              {exit.status}
                                                            </div>
                                                            {exit.exitedAt && (
                                                              <div>
                                                                Exited:{" "}
                                                                {new Date(
                                                                  exit.exitedAt,
                                                                ).toLocaleString()}
                                                              </div>
                                                            )}
                                                          </div>
                                                        ),
                                                      )}
                                                    </div>
                                                  )}

                                                {/* Task Status */}
                                                {event.taskDetail.status && (
                                                  <div>
                                                    <div className="text-xs font-medium text-muted-foreground mb-1">
                                                      Task Status
                                                    </div>
                                                    <div
                                                      className={`text-xs inline-block px-2 py-1 rounded ${
                                                        event.taskDetail
                                                          .status ===
                                                        "completed"
                                                          ? "bg-green-100 text-green-700"
                                                          : event.taskDetail
                                                                .status ===
                                                              "in_progress"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-gray-100 text-gray-700"
                                                      }`}
                                                    >
                                                      {event.taskDetail.status}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                        {/* Display ungrouped events (events without taskId) */}
                        {ungroupedEvents.length > 0 && (
                          <div className="mb-6">
                            <div className="mb-2 px-2 py-1 bg-muted rounded text-xs font-semibold text-muted-foreground">
                              Other Events
                            </div>
                            {ungroupedEvents.map((event) => {
                              const globalIndex = timelineEvents.findIndex(
                                (e) => e.id === event.id,
                              );
                              return (
                                <div
                                  key={event.id}
                                  className={`flex gap-4 cursor-pointer transition-colors p-2 rounded-lg ${
                                    selectedEventIndex === globalIndex
                                      ? "bg-primary/10 border border-primary"
                                      : "hover:bg-muted/50"
                                  }`}
                                  onClick={() => handleEventClick(globalIndex)}
                                >
                                  <div className="flex flex-col items-center">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        (event.type || "stop") === "outage"
                                          ? "bg-red-100 text-red-600"
                                          : (event.type || "stop") === "geotag"
                                            ? "bg-blue-100 text-blue-600"
                                            : (event.type || "stop") ===
                                                "arrived"
                                              ? "bg-green-100 text-green-600"
                                              : (event.type || "stop") ===
                                                  "exited"
                                                ? "bg-orange-100 text-orange-600"
                                                : (event.type || "stop") ===
                                                    "live"
                                                  ? "bg-purple-100 text-purple-600"
                                                  : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {getIcon(event.type || "stop")}
                                    </div>
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="font-medium text-base">
                                        {event.time}
                                      </span>
                                      <span className="text-sm font-semibold capitalize">
                                        {event.type || "stop"}
                                      </span>
                                      {showAllUsers && event.staffName && (
                                        <span className="text-xs font-semibold text-primary">
                                          {event.staffName}
                                        </span>
                                      )}
                                    </div>

                                    {/* Description with distance/duration */}
                                    <div className="text-sm text-foreground mb-1">
                                      {formatEventDescription(event)}
                                    </div>

                                    {/* Distance and Duration details - only show if not already in description */}
                                    {event.distance !== undefined &&
                                      event.duration !== undefined &&
                                      !event.description?.includes("km") && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          <span className="mr-2">
                                            Distance:{" "}
                                            {event.distance.toFixed(2)} km
                                          </span>
                                          <span>
                                            Duration: {event.duration}m
                                          </span>
                                        </div>
                                      )}

                                    {/* Address for stops and other events */}
                                    {event.fullAddress &&
                                      (event.type === "stop" ||
                                        event.type === "arrived" ||
                                        event.type === "geotag") && (
                                        <div className="text-xs text-muted-foreground mt-1 mb-1">
                                          {event.fullAddress}
                                        </div>
                                      )}

                                    {/* Battery percentage if available */}
                                    {event.batteryPercent !== undefined && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Battery: {event.batteryPercent}%
                                      </div>
                                    )}

                                    {/* Presence status */}
                                    {event.presenceStatus && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Status: {event.presenceStatus}
                                      </div>
                                    )}

                                    {/* Alert messages */}
                                    {event.alert && (
                                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 inline mr-1" />
                                        {event.alert}
                                      </div>
                                    )}

                                    {/* Special handling for outage */}
                                    {event.type === "outage" && (
                                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                                        <AlertCircle className="w-4 h-4 inline mr-1" />
                                        Tracking service terminated
                                      </div>
                                    )}

                                    {/* Special handling for geotag */}
                                    {event.type === "geotag" && event.id && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Punch Out
                                        </Button>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {event.id.substring(0, 32)}...
                                        </span>
                                      </div>
                                    )}

                                    {/* Tracking stopped indicator */}
                                    {event.type === "exited" && (
                                      <div className="mt-2 text-xs text-muted-foreground italic">
                                        Tracking Stopped
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Infinite scroll trigger */}
                        {!showAllUsers && hasMore && (
                          <div
                            ref={scrollObserverRef}
                            className="flex justify-center py-4"
                          >
                            {isLoadingMore ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">
                                  Loading more events...
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Scroll for more
                              </div>
                            )}
                          </div>
                        )}

                        {/* End of list indicator */}
                        {!showAllUsers && !hasMore && allEvents.length > 0 && (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            End of timeline ({allEvents.length} events)
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Map View */}
                  <div className="h-[600px] relative">
                    {markers.length > 0 ? (
                      <>
                        <MapView
                          useGoogleMaps={true}
                          googleMapsApiKey={
                            import.meta.env.VITE_GOOGLE_MAPS_API_KEY
                          }
                          markers={markers}
                          route={showAllUsers ? [] : route}
                          routes={
                            showAllUsers
                              ? Array.from(routesByStaff.entries()).map(
                                  ([staffId, positions]) => ({
                                    positions,
                                    color: getStaffColor(staffId),
                                  }),
                                )
                              : []
                          }
                          showRoute={true}
                          routeColor="#3b82f6"
                          height="100%"
                          zoom={12}
                        />
                        {/* Legend for multiple users */}
                        {showAllUsers &&
                          multipleTimelineData?.data?.staff &&
                          multipleTimelineData.data.staff.length > 0 && (
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg z-[1000] max-w-[200px]">
                              <h4 className="text-sm font-semibold mb-2">
                                Staff Locations
                              </h4>
                              <div className="space-y-1">
                                {multipleTimelineData.data.staff.map(
                                  (staff) => {
                                    const color = getStaffColor(staff._id);
                                    return (
                                      <div
                                        key={staff._id}
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <div
                                          className="w-3 h-3 rounded-full border border-white shadow-sm"
                                          style={{ backgroundColor: color }}
                                        />
                                        <span className="truncate">
                                          {staff.name}
                                        </span>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="h-full bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <MapIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-lg font-medium text-muted-foreground">
                            Map View
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Interactive map showing route and locations
                          </p>
                        </div>
                      </div>
                    )}
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

export default Timeline;
