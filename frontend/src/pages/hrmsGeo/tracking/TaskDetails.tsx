import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Steps } from "antd";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Image as ImageIcon,
  Shield,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Navigation,
  FileText,
  AlertCircle,
  Route,
  Timer,
  MapPinned,
  Camera,
  KeyRound,
  LogOut,
  PlayCircle,
  Flag,
  Circle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useGetTaskDetailsQuery } from "@/store/api/taskApi";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { StepsProps } from "antd";
import MainLayout from "@/components/MainLayout";

const TaskDetails = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetTaskDetailsQuery(taskId || "", {
    skip: !taskId,
  });

  const handleMenuClick = () => {
    // Sidebar toggle functionality can be added here if needed
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className="text-center">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">
              Loading task details...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !data?.success || !data.data) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <Card className="p-6 sm:p-8 w-full max-w-md">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg sm:text-xl font-semibold mb-2">
                Task Not Found
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                The task you're looking for doesn't exist or you don't have
                access to it.
              </p>
              <Button
                onClick={() => navigate("/hrms-geo/tracking/timeline")}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Timeline
              </Button>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const { task, taskDetails } = data.data;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: {
        label: "Completed",
        className: "bg-green-100 text-green-700 border-green-300",
      },
      in_progress: {
        label: "In Progress",
        className: "bg-blue-100 text-blue-700 border-blue-300",
      },
      pending: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-700 border-yellow-300",
      },
      assigned: {
        label: "Assigned",
        className: "bg-purple-100 text-purple-700 border-purple-300",
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-100 text-red-700 border-red-300",
      },
    };
    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
    return (
      <Badge className={`${config.className} border font-semibold`}>
        {config.label}
      </Badge>
    );
  };

  // Build timeline events in chronological order
  const timelineEvents: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    icon: any;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    timestamp?: Date;
    data?: any;
    updatedBy?: string;
  }> = [];

  // 1. Task Created/Assigned
  if (task.assignedDate) {
    const assignedToName =
      typeof task.assignedTo === "object" && task.assignedTo?.name
        ? task.assignedTo.name
        : "N/A";
    timelineEvents.push({
      id: "assigned",
      type: "assigned",
      title: "Task Assigned",
      description: `Assigned to ${assignedToName}`,
      icon: FileText,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-300",
      timestamp: new Date(task.assignedDate),
      data: { task },
    });
  }

  // 2. Ride Started
  if (taskDetails?.rideStartedAt) {
    timelineEvents.push({
      id: "ride-started",
      type: "ride-started",
      title: "Ride Started",
      description:
        taskDetails.rideStartLocation?.address || "Location recorded",
      icon: PlayCircle,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-300",
      timestamp: new Date(taskDetails.rideStartedAt),
      data: { location: taskDetails.rideStartLocation },
    });
  }

  // 3. Start Location
  if (taskDetails?.startTime) {
    timelineEvents.push({
      id: "start-location",
      type: "start-location",
      title: "Start Location",
      description:
        taskDetails.sourceLocation?.fullAddress || "Location recorded",
      icon: MapPinned,
      iconColor: "text-teal-600",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-300",
      timestamp: new Date(taskDetails.startTime),
      data: {
        location: taskDetails.startLocation || taskDetails.sourceLocation,
      },
    });
  }

  // 4. Travel Segments
  if (
    taskDetails?.taskTravelDistance &&
    taskDetails.taskTravelDistance.length > 0
  ) {
    taskDetails.taskTravelDistance.forEach((segment: any, idx: number) => {
      const durationSegment = taskDetails.taskTravelDuration?.[idx];
      timelineEvents.push({
        id: `travel-segment-${idx}`,
        type: "travel",
        title: `Travel Segment ${idx + 1}`,
        description: `${segment.distanceKm?.toFixed(3) || 0} km in ${durationSegment ? Math.round(durationSegment.durationSeconds / 60) : 0} min`,
        icon: Navigation,
        iconColor: "text-indigo-600",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-300",
        timestamp: segment.endTime ? new Date(segment.endTime) : undefined,
        data: { segment, durationSegment },
      });
    });
  }

  // 5. Destination Location
  if (taskDetails?.destinationLocation) {
    timelineEvents.push({
      id: "destination",
      type: "destination",
      title: "Destination Location",
      description:
        taskDetails.destinationLocation.fullAddress || "Destination set",
      icon: Flag,
      iconColor: "text-cyan-600",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-300",
      timestamp: taskDetails.arrivalTime
        ? new Date(taskDetails.arrivalTime)
        : undefined,
      data: { location: taskDetails.destinationLocation },
    });
  }

  // 6. Arrival
  if (
    taskDetails?.arrived ||
    taskDetails?.arrivalTime ||
    taskDetails?.arrivedAt
  ) {
    const arrivalTimestamp =
      taskDetails.arrived ||
      taskDetails.arrivalTime ||
      taskDetails.arrivedAt ||
      taskDetails.arrivalLocation?.recordedAt;
    timelineEvents.push({
      id: "arrived",
      type: "arrived",
      title: "Arrived at Location",
      description:
        taskDetails.arrivedFullAddress ||
        taskDetails.arrivalLocation?.address ||
        "Location reached",
      icon: CheckCircle2,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-300",
      timestamp: arrivalTimestamp ? new Date(arrivalTimestamp) : undefined,
      data: {
        location: taskDetails.arrivalLocation,
        address: taskDetails.arrivedFullAddress,
        arrivedLatitude: taskDetails.arrivedLatitude,
        arrivedLongitude: taskDetails.arrivedLongitude,
        arrivedPincode: taskDetails.arrivedPincode,
        arrivedTime: taskDetails.arrivedTime,
      },
    });
  }

  // 7. Photo Proof
  if (taskDetails?.photoProofUrl) {
    timelineEvents.push({
      id: "photo-proof",
      type: "photo-proof",
      title: "Photo Proof Uploaded",
      description: taskDetails.photoProofDescription || "Photo uploaded",
      icon: Camera,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-300",
      timestamp: taskDetails.photoProofUploadedAt
        ? new Date(taskDetails.photoProofUploadedAt)
        : undefined,
      data: {
        photo: taskDetails.photoProofUrl,
        description: taskDetails.photoProofDescription,
        address: taskDetails.photoProofAddress,
        photoProofLat: taskDetails.photoProofLat,
        photoProofLng: taskDetails.photoProofLng,
      },
    });
  }

  // 8. OTP Sent
  if (taskDetails?.otpSentAt) {
    timelineEvents.push({
      id: "otp-sent",
      type: "otp-sent",
      title: "OTP Sent",
      description: `OTP Code: ${taskDetails.otpCode || "N/A"}`,
      icon: Shield,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-300",
      timestamp: new Date(taskDetails.otpSentAt),
      data: { code: taskDetails.otpCode },
    });
  }

  // 8.1. OTP Verification
  if (taskDetails?.otpCode && taskDetails?.otpVerifiedAt) {
    timelineEvents.push({
      id: "otp-verified",
      type: "otp-verified",
      title: "OTP Verified",
      description: `OTP Code: ${taskDetails.otpCode}`,
      icon: Shield,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-300",
      timestamp: new Date(taskDetails.otpVerifiedAt),
      data: {
        code: taskDetails.otpCode,
        address: taskDetails.otpVerifiedAddress,
        otpVerifiedLat: taskDetails.otpVerifiedLat,
        otpVerifiedLng: taskDetails.otpVerifiedLng,
      },
    });
  }

  // 9. Task Completed
  if (taskDetails?.completedDate || taskDetails?.completedAt) {
    const completedByName =
      typeof taskDetails.completedBy === "object" &&
      taskDetails.completedBy?.name
        ? taskDetails.completedBy.name
        : "N/A";
    const approvedByName =
      typeof taskDetails.approvedBy === "object" && taskDetails.approvedBy?.name
        ? taskDetails.approvedBy.name
        : null;

    // If approvedBy exists, it means admin approved the completion
    const description = approvedByName
      ? `Completed by ${completedByName}, Approved by ${approvedByName}`
      : `Completed by ${completedByName}`;

    timelineEvents.push({
      id: "completed",
      type: "completed",
      title: approvedByName ? "Task Completed & Approved" : "Task Completed",
      description: description,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-300",
      timestamp: new Date(taskDetails.completedDate || taskDetails.completedAt),
      data: {
        completedBy: taskDetails.completedBy,
        approvedBy: taskDetails.approvedBy,
        approvedAt: taskDetails.approvedAt,
      },
      updatedBy: completedByName,
    });
  }

  // 10. Exit History
  if (task?.task_exit && (task.task_exit.status || task.task_exit.exitReason)) {
    timelineEvents.push({
      id: "exit",
      type: "exit",
      title: "Task Exited",
      description: task.task_exit.exitReason || "Task exited",
      icon: LogOut,
      iconColor: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-300",
      timestamp: task.task_exit.exitedAt
        ? new Date(task.task_exit.exitedAt)
        : undefined,
      data: { exit: task.task_exit },
    });
  }

  if (taskDetails?.exit && taskDetails.exit.length > 0) {
    taskDetails.exit.forEach((exit: any, idx: number) => {
      timelineEvents.push({
        id: `exit-${idx}`,
        type: "exit",
        title: "Task Exited",
        description: exit.exitReason || "Task exited",
        icon: LogOut,
        iconColor: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-300",
        timestamp: exit.exitedAt ? new Date(exit.exitedAt) : undefined,
        data: { exit },
      });
    });
  }

  // 11. Admin Reopen History (from tasks_restarted array) - Shows admin reopen details
  if (
    task?.tasks_restarted &&
    Array.isArray(task.tasks_restarted) &&
    task.tasks_restarted.length > 0
  ) {
    task.tasks_restarted.forEach((reopen: any, idx: number) => {
      const reopenedByName = reopen.reopenedBy
        ? typeof reopen.reopenedBy === "object" && reopen.reopenedBy.name
          ? reopen.reopenedBy.name
          : "Admin"
        : "Admin";
      timelineEvents.push({
        id: `admin-reopen-${idx}`,
        type: "admin-reopen",
        title: "Task Reopened by Admin",
        description: reopen.reason || "Task has been reopened by admin",
        icon: RotateCcw,
        iconColor: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-300",
        timestamp: reopen.reopenedAt ? new Date(reopen.reopenedAt) : undefined,
        data: {
          reason: reopen.reason,
          reopenedBy: reopen.reopenedBy,
          reopenedAt: reopen.reopenedAt,
          reopen: reopen,
        },
        updatedBy: reopenedByName,
      });
    });
  }

  // 12. Restart History
  if (taskDetails?.restarted && taskDetails.restarted.length > 0) {
    taskDetails.restarted.forEach((restart: any, idx: number) => {
      timelineEvents.push({
        id: `restart-${idx}`,
        type: "restart",
        title: "Task Restarted",
        description: restart.restartLocation?.address || "Task restarted",
        icon: PlayCircle,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-300",
        timestamp: restart.restartedAt
          ? new Date(restart.restartedAt)
          : undefined,
        data: { restart },
      });
    });
  }

  // Sort timeline events by timestamp
  timelineEvents.sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return a.timestamp.getTime() - b.timestamp.getTime();
  });

  return (
    <MainLayout>
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/hrms-geo/tracking/timeline")}
                className="hover:bg-primary/10 shrink-0 flex items-center gap-2 px-3 sm:px-4"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 truncate">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary shrink-0" />
                  <span className="truncate">
                    {task.taskTitle || "Task Details"}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                  Task ID: {task.taskId}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              {getStatusBadge(task.status || taskDetails?.status || "pending")}
            </div>
          </div>

          {/* Task Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Customer Info */}
            {task.customerId && typeof task.customerId === "object" && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Customer
                    </span>
                  </div>
                  <p className="text-sm font-semibold">
                    {task.customerId.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.customerId.customerNumber}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Assigned To */}
            {task.assignedTo && typeof task.assignedTo === "object" && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Assigned To
                    </span>
                  </div>
                  <p className="text-sm font-semibold">
                    {task.assignedTo.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.assignedTo.employeeId}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Trip Distance */}
            {taskDetails?.tripDistanceKm !== undefined && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Distance
                    </span>
                  </div>
                  <p className="text-lg font-bold text-blue-700">
                    {taskDetails.tripDistanceKm.toFixed(3)} km
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Trip Duration */}
            {taskDetails?.tripDurationSeconds !== undefined && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Duration
                    </span>
                  </div>
                  <p className="text-lg font-bold text-indigo-700">
                    {Math.round(taskDetails.tripDurationSeconds / 60)} min
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timeline using Ant Design Steps */}
          <Card className="shadow-lg border-2 w-full overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              {timelineEvents.length > 0 ? (
                <Steps
                  direction="vertical"
                  size="default"
                  current={timelineEvents.length - 1}
                  items={timelineEvents.map((event, index) => {
                    const Icon = event.icon;
                    const isCompleted = index < timelineEvents.length - 1;
                    const isLast = index === timelineEvents.length - 1;

                    return {
                      status: isLast
                        ? "finish"
                        : isCompleted
                          ? "finish"
                          : "process",
                      title: (
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="text-base font-semibold text-foreground">
                            {event.title}
                          </span>
                          {event.timestamp && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3" />
                              {format(
                                event.timestamp,
                                "MMM dd, yyyy 'at' hh:mm a",
                              )}
                            </span>
                          )}
                        </div>
                      ),
                      description: (
                        <div className="mt-2 space-y-3">
                          {event.description && (
                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}

                          {/* Additional Details based on event type */}
                          <div
                            className={`p-4 rounded-lg border-2 ${event.borderColor} ${event.bgColor}`}
                          >
                            {event.type === "assigned" && event.data?.task && (
                              <div className="space-y-2 text-xs">
                                {event.data.task.description && (
                                  <p className="text-muted-foreground">
                                    {event.data.task.description}
                                  </p>
                                )}
                                {event.data.task.expectedCompletionDate && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      Expected:{" "}
                                      {format(
                                        new Date(
                                          event.data.task
                                            .expectedCompletionDate,
                                        ),
                                        "MMM dd, yyyy",
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {event.type === "ride-started" &&
                              event.data?.location && (
                                <div className="space-y-1 text-xs">
                                  {event.data.location.address && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span>{event.data.location.address}</span>
                                    </div>
                                  )}
                                  {event.data.location.lat &&
                                    event.data.location.lng && (
                                      <p className="text-muted-foreground">
                                        Coordinates:{" "}
                                        {event.data.location.lat.toFixed(6)},{" "}
                                        {event.data.location.lng.toFixed(6)}
                                      </p>
                                    )}
                                  {event.data.location.pincode && (
                                    <p className="text-muted-foreground">
                                      Pincode: {event.data.location.pincode}
                                    </p>
                                  )}
                                  {event.data.location.recordedAt && (
                                    <p className="text-muted-foreground">
                                      Recorded:{" "}
                                      {format(
                                        new Date(
                                          event.data.location.recordedAt,
                                        ),
                                        "MMM dd, yyyy 'at' hh:mm a",
                                      )}
                                    </p>
                                  )}
                                </div>
                              )}

                            {event.type === "start-location" &&
                              event.data?.location && (
                                <div className="space-y-1 text-xs">
                                  {event.data.location.fullAddress && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span>
                                        {event.data.location.fullAddress}
                                      </span>
                                    </div>
                                  )}
                                  {event.data.location.pincode && (
                                    <p className="text-muted-foreground">
                                      Pincode: {event.data.location.pincode}
                                    </p>
                                  )}
                                </div>
                              )}

                            {event.type === "travel" && event.data?.segment && (
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                {event.data.segment.distanceKm !==
                                  undefined && (
                                  <div className="flex items-center gap-2">
                                    <Navigation className="w-3 h-3 text-blue-600" />
                                    <span className="font-semibold">
                                      {event.data.segment.distanceKm.toFixed(3)}{" "}
                                      km
                                    </span>
                                  </div>
                                )}
                                {event.data.durationSegment?.durationSeconds !==
                                  undefined && (
                                  <div className="flex items-center gap-2">
                                    <Timer className="w-3 h-3 text-indigo-600" />
                                    <span className="font-semibold">
                                      {Math.round(
                                        event.data.durationSegment
                                          .durationSeconds / 60,
                                      )}{" "}
                                      min
                                    </span>
                                  </div>
                                )}
                                {event.data.segment.endType && (
                                  <p className="text-muted-foreground col-span-2">
                                    End Type: {event.data.segment.endType}
                                  </p>
                                )}
                              </div>
                            )}

                            {event.type === "destination" &&
                              event.data?.location && (
                                <div className="space-y-1 text-xs">
                                  {event.data.location.fullAddress && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span>
                                        {event.data.location.fullAddress}
                                      </span>
                                    </div>
                                  )}
                                  {event.data.location.pincode && (
                                    <p className="text-muted-foreground">
                                      Pincode: {event.data.location.pincode}
                                    </p>
                                  )}
                                </div>
                              )}

                            {event.type === "arrived" && (
                              <div className="space-y-1 text-xs">
                                {event.data?.address && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    <span>{event.data.address}</span>
                                  </div>
                                )}
                                {(event.data?.location?.lat &&
                                  event.data?.location?.lng) ||
                                (event.data?.arrivedLatitude &&
                                  event.data?.arrivedLongitude) ? (
                                  <p className="text-muted-foreground">
                                    Coordinates:{" "}
                                    {(
                                      event.data.location?.lat ||
                                      event.data.arrivedLatitude
                                    ).toFixed(6)}
                                    ,{" "}
                                    {(
                                      event.data.location?.lng ||
                                      event.data.arrivedLongitude
                                    ).toFixed(6)}
                                  </p>
                                ) : null}
                                {event.data?.arrivedPincode && (
                                  <p className="text-muted-foreground">
                                    Pincode: {event.data.arrivedPincode}
                                  </p>
                                )}
                                {event.data?.arrivedTime && (
                                  <p className="text-muted-foreground">
                                    Time: {event.data.arrivedTime}
                                  </p>
                                )}
                              </div>
                            )}

                            {event.type === "photo-proof" &&
                              event.data?.photo && (
                                <div className="space-y-2">
                                  <img
                                    src={event.data.photo}
                                    alt="Photo Proof"
                                    className="w-full max-w-xs rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() =>
                                      window.open(event.data.photo, "_blank")
                                    }
                                  />
                                  {event.data.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {event.data.description}
                                    </p>
                                  )}
                                  {event.data.address && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span>{event.data.address}</span>
                                    </div>
                                  )}
                                  {event.data.photoProofLat &&
                                    event.data.photoProofLng && (
                                      <p className="text-xs text-muted-foreground">
                                        Coordinates:{" "}
                                        {event.data.photoProofLat.toFixed(6)},{" "}
                                        {event.data.photoProofLng.toFixed(6)}
                                      </p>
                                    )}
                                </div>
                              )}

                            {event.type === "otp-sent" && event.data?.code && (
                              <div className="space-y-1 text-xs">
                                <div className="p-2 bg-blue-100 rounded border border-blue-300">
                                  <p className="font-mono font-bold text-blue-700">
                                    OTP: {event.data.code}
                                  </p>
                                </div>
                              </div>
                            )}

                            {event.type === "otp-verified" &&
                              event.data?.code && (
                                <div className="space-y-1 text-xs">
                                  <div className="p-2 bg-amber-100 rounded border border-amber-300">
                                    <p className="font-mono font-bold text-amber-700">
                                      OTP: {event.data.code}
                                    </p>
                                  </div>
                                  {event.data.address && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span>{event.data.address}</span>
                                    </div>
                                  )}
                                  {event.data.otpVerifiedLat &&
                                    event.data.otpVerifiedLng && (
                                      <p className="text-muted-foreground">
                                        Coordinates:{" "}
                                        {event.data.otpVerifiedLat.toFixed(6)},{" "}
                                        {event.data.otpVerifiedLng.toFixed(6)}
                                      </p>
                                    )}
                                </div>
                              )}

                            {event.type === "completed" &&
                              event.data?.completedBy && (
                                <div className="text-xs space-y-2">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span>
                                      Completed by:{" "}
                                      {typeof event.data.completedBy ===
                                        "object" && event.data.completedBy?.name
                                        ? `${event.data.completedBy.name}${event.data.completedBy.employeeId ? ` (${event.data.completedBy.employeeId})` : ""}`
                                        : "N/A"}
                                    </span>
                                  </div>
                                  {event.data.approvedBy && (
                                    <div className="flex items-center gap-2 text-green-700 font-medium">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>
                                        Approved by:{" "}
                                        {typeof event.data.approvedBy ===
                                          "object" &&
                                        event.data.approvedBy?.name
                                          ? event.data.approvedBy.name
                                          : "Admin"}
                                      </span>
                                      {event.data.approvedAt && (
                                        <span className="text-muted-foreground ml-2">
                                          (
                                          {format(
                                            new Date(event.data.approvedAt),
                                            "MMM dd, yyyy 'at' hh:mm a",
                                          )}
                                          )
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                            {event.type === "exit" && event.data?.exit && (
                              <div className="space-y-1 text-xs">
                                {event.data.exit.exitReason && (
                                  <p className="text-muted-foreground">
                                    Reason: {event.data.exit.exitReason}
                                  </p>
                                )}
                                {event.data.exit.exitLocation?.address && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    <span>
                                      {event.data.exit.exitLocation.address}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {event.type === "restart" &&
                              event.data?.restart && (
                                <div className="space-y-1 text-xs">
                                  {event.data.restart.restartLocation
                                    ?.address && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      <span>
                                        {
                                          event.data.restart.restartLocation
                                            .address
                                        }
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                            {event.type === "admin-reopen" &&
                              event.data?.reopen && (
                                <div className="space-y-2 text-xs">
                                  <div className="p-3 bg-orange-100 rounded-lg border-2 border-orange-300">
                                    <p className="font-semibold text-orange-800 mb-1">
                                      Admin Reopen Comment:
                                    </p>
                                    <p className="text-orange-900 font-medium">
                                      {event.data.reason ||
                                        event.data.reopen.reason ||
                                        "Task has been reopened by admin"}
                                    </p>
                                  </div>
                                  {event.data.reopenedBy && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <User className="w-3 h-3" />
                                      <span>
                                        Reopened by:{" "}
                                        {typeof event.data.reopenedBy ===
                                          "object" &&
                                        event.data.reopenedBy?.name
                                          ? event.data.reopenedBy.name
                                          : "Admin"}
                                      </span>
                                    </div>
                                  )}
                                  {event.data.reopenedAt && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        Reopened at:{" "}
                                        {format(
                                          new Date(event.data.reopenedAt),
                                          "MMM dd, yyyy 'at' hh:mm a",
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      ),
                      icon: <Icon className={`w-5 h-5 ${event.iconColor}`} />,
                    };
                  })}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No timeline events available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TaskDetails;
