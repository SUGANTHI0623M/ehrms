import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
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
import {
  MapPin,
  Navigation,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  RefreshCw,
  Loader2,
  Calendar,
  Search,
  X,
} from "lucide-react";
import MapView, { MapMarker, MapRoute } from "@/components/tracking/MapView";
import { useGetLiveTrackingQuery } from "@/store/api/trackingApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { format } from "date-fns";

const LiveTracking = () => {
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>("");
  const [debouncedStaffSearch, setDebouncedStaffSearch] = useState<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    // Default to live if path doesn't match any specific tab
    return "live";
  };

  // Debounce staff search query - send to API
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedStaffSearch(staffSearchQuery);
    }, 500); // 500ms debounce for API calls

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [staffSearchQuery]);

  // Fetch all staff for dropdown with server-side search
  // Use a high limit to get all staff in one request
  const { data: staffData, isLoading: isLoadingStaff } = useGetStaffQuery(
    {
      search: debouncedStaffSearch.trim() || undefined,
      status: "Active",
      limit: 50, // Reduced from 10000 - enough for dropdown/filter
      page: 1,
    },
    {
      // Refetch when search changes
      refetchOnMountOrArgChange: false,
      keepUnusedDataFor: 60,
    },
  );

  // Get staff list from the query result
  const staffList = staffData?.data?.staff || [];
  const staffPagination = staffData?.data?.pagination;

  // Debug: Log to verify all staff are received
  useEffect(() => {
    if (staffList.length > 0 && staffPagination) {
      console.log(
        `[LiveTracking] API Response - Received: ${staffList.length} staff, Total: ${staffPagination.total}, Pages: ${staffPagination.pages}`,
      );
      if (
        staffList.length !== staffPagination.total &&
        staffPagination.pages === 1
      ) {
        console.warn(
          `[LiveTracking] WARNING: API returned ${staffList.length} staff but total is ${staffPagination.total}. Some staff may be missing.`,
        );
      }
    }
  }, [staffList.length, staffPagination]);

  // Use staff list directly (already filtered by API search)
  // Ensure we're using ALL staff from the API response - no client-side filtering or limiting
  const filteredStaffList = staffList;

  // Debug: Verify filtered list matches staff list and log all staff
  useEffect(() => {
    console.log(`[LiveTracking] Staff Data:`, {
      staffListLength: staffList.length,
      filteredStaffListLength: filteredStaffList.length,
      paginationTotal: staffPagination?.total,
      paginationPages: staffPagination?.pages,
      paginationLimit: staffPagination?.limit,
    });

    if (filteredStaffList.length !== staffList.length) {
      console.error(
        `[LiveTracking] ERROR: filteredStaffList (${filteredStaffList.length}) doesn't match staffList (${staffList.length})`,
      );
    }

    // Check for duplicate IDs
    const staffIds = filteredStaffList.map((s) => s._id);
    const uniqueIds = new Set(staffIds);
    if (staffIds.length !== uniqueIds.size) {
      console.warn(
        `[LiveTracking] WARNING: Found ${staffIds.length - uniqueIds.size} duplicate staff IDs`,
      );
    }

    // Log all staff names and IDs for verification
    console.log(
      `[LiveTracking] All staff in filteredStaffList (${filteredStaffList.length}):`,
      filteredStaffList.map(
        (s, i) => `${i + 1}. ${s.name} (${s.employeeId}) - ID: ${s._id}`,
      ),
    );
  }, [filteredStaffList, staffList.length, staffPagination]);

  // Fetch live tracking data based on selected date and staff
  const {
    data: liveData,
    isLoading,
    isError,
    refetch,
  } = useGetLiveTrackingQuery(
    {
      date: selectedDate,
      staffId:
        selectedStaffId && selectedStaffId !== "all"
          ? selectedStaffId
          : undefined,
    },
    {
      pollingInterval: selectedStaffId === "all" ? 60000 : 0,
      refetchOnMountOrArgChange: true,
      keepUnusedDataFor: 30,
    },
  );

  // Debug: Log query parameters
  useEffect(() => {
    console.log("[LiveTracking] Query params:", {
      date: selectedDate,
      staffId:
        selectedStaffId && selectedStaffId !== "all"
          ? selectedStaffId
          : undefined,
      timestamp: new Date().toISOString(),
    });
  }, [selectedDate, selectedStaffId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Generate color for each staff member
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
    let hash = 0;
    for (let i = 0; i < staffId.length; i++) {
      hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Get tracking points from API response
  const trackingPoints =
    liveData?.data?.trackingPoints || liveData?.trackingPoints || [];
  const liveWorkers =
    liveData?.data?.liveWorkers || liveData?.liveWorkers || [];

  // Debug: Log data received
  useEffect(() => {
    console.log("[LiveTracking] Data received:", {
      trackingPointsCount: trackingPoints.length,
      liveWorkersCount: liveWorkers.length,
      selectedStaffId,
      hasData: !!liveData,
    });
  }, [trackingPoints.length, liveWorkers.length, selectedStaffId, liveData]);

  // Helper function to check if coordinates are valid (not [0, 0])
  const isValidPosition = (
    position: [number, number] | undefined | null,
  ): boolean => {
    if (!position || position.length !== 2) return false;
    // Filter out [0, 0] coordinates
    return !(position[0] === 0 && position[1] === 0);
  };

  // Group tracking points by staff for route generation
  const routesByStaff = new Map<string, [number, number][]>();
  const markersByStaff = new Map<string, MapMarker[]>();
  const latestMarkerByStaff = new Map<string, MapMarker>(); // Store latest marker per staff

  trackingPoints.forEach((point) => {
    if (point.position && isValidPosition(point.position) && point.staffId) {
      // Add to route (only valid positions)
      if (!routesByStaff.has(point.staffId)) {
        routesByStaff.set(point.staffId, []);
      }
      // Only add valid positions to routes
      if (isValidPosition(point.position)) {
        routesByStaff.get(point.staffId)!.push(point.position);
      }

      // Add to markers
      if (!markersByStaff.has(point.staffId)) {
        markersByStaff.set(point.staffId, []);
      }
      const staffColor = getStaffColor(point.staffId);
      const marker: MapMarker = {
        id: point.id || `${point.staffId}-${point.timestamp}`,
        position: point.position,
        title: point.staffName || "Unknown Staff",
        description: [
          point.staffId ? `Employee ID: ${point.staffId}` : null,
          point.taskId ? `Task ID: ${point.taskId}` : null,
          point.movementType ? `Movement: ${point.movementType}` : null,
          point.address ? `Address: ${point.address}` : null,
          point.timestamp
            ? `Time: ${new Date(point.timestamp).toLocaleTimeString()}`
            : null,
        ]
          .filter(Boolean)
          .join(" | "),
        color: staffColor,
      };

      markersByStaff.get(point.staffId)!.push(marker);

      // Track latest marker per staff (for "all" view)
      if (!latestMarkerByStaff.has(point.staffId)) {
        latestMarkerByStaff.set(point.staffId, marker);
      } else {
        const existingMarker = latestMarkerByStaff.get(point.staffId)!;
        const existingTime = existingMarker.id.includes("-")
          ? new Date(existingMarker.id.split("-").pop() || 0).getTime()
          : 0;
        const currentTime = point.timestamp
          ? new Date(point.timestamp).getTime()
          : 0;
        if (currentTime > existingTime) {
          latestMarkerByStaff.set(point.staffId, marker);
        }
      }
    }
  });

  // Also create markers from liveWorkers (current locations)
  liveWorkers.forEach((worker: any) => {
    if (worker.position && isValidPosition(worker.position) && worker.staffId) {
      const staffColor = getStaffColor(worker.staffId);
      const marker: MapMarker = {
        id: `live-${worker.staffId}`,
        position: worker.position,
        title: worker.name || "Unknown Staff",
        description: [
          worker.employeeId ? `Employee ID: ${worker.employeeId}` : null,
          worker.address ? `Address: ${worker.address}` : null,
          worker.lastUpdated ? `Last Updated: ${worker.lastUpdated}` : null,
          worker.isActive ? "Status: Active" : "Status: Inactive",
        ]
          .filter(Boolean)
          .join(" | "),
        color: staffColor,
      };

      // Update latest marker if this is more recent
      if (!latestMarkerByStaff.has(worker.staffId)) {
        latestMarkerByStaff.set(worker.staffId, marker);
      } else {
        // Prefer live worker marker as it's the most current
        latestMarkerByStaff.set(worker.staffId, marker);
      }
    }
  });

  // If a specific staff is selected, show only their data
  // Otherwise, show all staff data (latest marker per staff for better visibility)
  const displayRoutes: MapRoute[] =
    selectedStaffId && selectedStaffId !== "all"
      ? routesByStaff.has(selectedStaffId)
        ? [
            {
              positions: routesByStaff.get(selectedStaffId)!,
              color: getStaffColor(selectedStaffId),
            },
          ]
        : []
      : Array.from(routesByStaff.entries()).map(([staffId, positions]) => ({
          positions,
          color: getStaffColor(staffId),
        }));

  const displayMarkers: MapMarker[] =
    selectedStaffId && selectedStaffId !== "all"
      ? markersByStaff.get(selectedStaffId) || []
      : Array.from(latestMarkerByStaff.values()); // Show only latest marker per staff when showing all

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

          <TabsContent value="live" className="mt-6">
            <Card>
              <CardHeader className="px-4 py-4 sm:px-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Live Tracking</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Real-time location map view. Shows active workers on map.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm bg-transparent border-none outline-none cursor-pointer"
                      />
                    </div>
                    <div className="relative">
                      <Select
                        value={selectedStaffId}
                        onValueChange={setSelectedStaffId}
                        disabled={isLoadingStaff}
                      >
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue
                            placeholder={
                              isLoadingStaff
                                ? "Loading staff..."
                                : filteredStaffList.length === 0
                                  ? "No staff available"
                                  : selectedStaffId === "all"
                                    ? staffPagination
                                      ? `All Staff (${staffPagination.total})`
                                      : "All Staff"
                                    : filteredStaffList.find(
                                        (s) => s._id === selectedStaffId,
                                      )?.name || "Select Staff"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="!max-h-[600px] w-[300px]">
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
                            {/* Show search status */}
                            {isLoadingStaff && debouncedStaffSearch && (
                              <div className="text-xs text-muted-foreground mt-1 px-1">
                                Searching...
                              </div>
                            )}
                          </div>
                          {/* Staff list - Show all staff with proper scrolling - increased height */}
                          <div className="max-h-[550px] overflow-y-auto">
                            <SelectItem value="all">
                              All Staff{" "}
                              {staffPagination
                                ? `(${staffPagination.total})`
                                : staffList.length > 0
                                  ? `(${staffList.length})`
                                  : ""}
                            </SelectItem>
                            {filteredStaffList.length > 0 ? (
                              <>
                                {/* Render ALL staff items - no limiting, ensure all are rendered */}
                                {filteredStaffList.map((staff, index) => {
                                  // Log first and last item to verify all are being processed
                                  if (index === 0) {
                                    console.log(
                                      `[LiveTracking] Rendering first staff: ${staff.name} (index 0)`,
                                    );
                                  }
                                  if (index === filteredStaffList.length - 1) {
                                    console.log(
                                      `[LiveTracking] Rendering last staff: ${staff.name} (index ${index}, total: ${filteredStaffList.length})`,
                                    );
                                  }
                                  // Use staff._id as key (should be unique)
                                  return (
                                    <SelectItem
                                      key={staff._id}
                                      value={staff._id}
                                    >
                                      {staff.name} ({staff.employeeId})
                                    </SelectItem>
                                  );
                                })}
                                {/* Show count info - always display to verify */}
                                <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 sticky bottom-0 bg-popover">
                                  {staffPagination ? (
                                    <>
                                      Displaying {filteredStaffList.length} of{" "}
                                      {staffPagination.total} staff
                                      {debouncedStaffSearch && " (filtered)"}
                                      {staffPagination.pages > 1 &&
                                        " - All pages loaded"}
                                      {filteredStaffList.length <
                                        staffPagination.total &&
                                        staffPagination.pages === 1 && (
                                          <span className="text-orange-600">
                                            {" "}
                                            ⚠️ Some staff may not be visible
                                          </span>
                                        )}
                                    </>
                                  ) : (
                                    `Displaying ${filteredStaffList.length} staff`
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                {isLoadingStaff
                                  ? "Loading..."
                                  : debouncedStaffSearch
                                    ? "No staff found"
                                    : "No staff available"}
                              </div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isLoading || isRefreshing}
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${isLoading || isRefreshing ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {isLoading ? (
                  <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Loading live tracking data...
                      </p>
                    </div>
                  </div>
                ) : isError ? (
                  <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">
                        Failed to load live tracking
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Please try refreshing
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : displayMarkers.length > 0 || displayRoutes.length > 0 ? (
                  <div className="relative">
                    <MapView
                      useGoogleMaps={true}
                      googleMapsApiKey={
                        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
                      }
                      markers={displayMarkers}
                      routes={displayRoutes}
                      showRoute={true}
                      height="600px"
                      zoom={undefined}
                    />
                    {/* Summary overlay */}
                    <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-auto bg-white/95 backdrop-blur-sm border rounded-lg p-2 sm:p-3 shadow-lg z-[1000]">
                      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Total
                          </p>
                          <p className="text-sm sm:text-lg font-semibold">
                            {liveWorkers.length}
                          </p>
                        </div>
                        <div className="h-6 sm:h-8 w-px bg-border"></div>
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Points
                          </p>
                          <p className="text-sm sm:text-lg font-semibold">
                            {trackingPoints.length}
                          </p>
                        </div>
                        <div className="h-6 sm:h-8 w-px bg-border"></div>
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium text-green-600">
                            Active
                          </p>
                          <p className="text-sm sm:text-lg font-semibold text-green-600">
                            {liveWorkers.filter((w: any) => w.isActive)
                              .length || 0}
                          </p>
                        </div>
                        <div className="h-6 sm:h-8 w-px bg-border"></div>
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium text-gray-600">
                            Inactive
                          </p>
                          <p className="text-sm sm:text-lg font-semibold text-gray-600">
                            {liveWorkers.filter((w: any) => !w.isActive)
                              .length || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Staff legend for multiple users */}
                    {selectedStaffId === "all" &&
                      (routesByStaff.size > 0 ||
                        latestMarkerByStaff.size > 0) && (
                        <div className="absolute top-2 right-2 hidden sm:block bg-white/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg z-[1000] max-w-[250px]">
                          <h4 className="text-sm font-semibold mb-2">
                            Staff ({latestMarkerByStaff.size} on map)
                          </h4>
                          <div className="space-y-1 max-h-[400px] overflow-y-auto">
                            {Array.from(latestMarkerByStaff.keys()).map(
                              (staffId) => {
                                const staff = staffList.find(
                                  (s) => s._id === staffId,
                                );
                                const marker = latestMarkerByStaff.get(staffId);
                                const color = getStaffColor(staffId);
                                const hasRoute = routesByStaff.has(staffId);
                                return (
                                  <div
                                    key={staffId}
                                    className="flex items-center gap-2 text-xs py-1 border-b last:border-b-0"
                                  >
                                    <div
                                      className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate font-medium">
                                        {staff?.name ||
                                          marker?.title ||
                                          "Unknown"}
                                      </div>
                                      {marker?.description && (
                                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                          {marker.description.split(" | ")[0]}
                                        </div>
                                      )}
                                    </div>
                                    {hasRoute && (
                                      <span
                                        className="text-[10px] text-muted-foreground"
                                        title="Has route"
                                      >
                                        📍
                                      </span>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">
                        No workers currently being tracked
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Workers will appear here when they are actively being
                        tracked
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        Check for Workers
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default LiveTracking;
