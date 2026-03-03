import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  XCircle,
  FileCheck,
  FileText,
  AlertCircle,
  Video,
  CheckCircle,
  Target,
  Search,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import MainLayout from "@/components/MainLayout";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
} from "@/store/api/notificationApi";
import { useAppSelector } from "@/store/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";

interface NotificationItem {
  _id: string;
  type: string;
  notificationType?: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  data?: any;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [readFilter, setReadFilter] = useState<string>("all");
  const limit = 20;

  // Debounce search term
  const debouncedSearch = useDebounce(searchTerm, 500);

  // API query with filters
  const { data, isLoading, refetch } = useGetNotificationsQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    isRead: readFilter !== "all" ? readFilter : undefined,
  });

  const [markAsRead] = useMarkAsReadMutation();

  const notifications = data?.data || [];
  const pagination = data?.pagination;
  const userRole = user?.role ?? "";

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, readFilter]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    const notificationType = notification.notificationType || notification.type;

    // Navigation logic
    if (
      notificationType === "new-live-session" ||
      notificationType === "live-session-cancelled" ||
      notificationType === "assessment-cancelled" ||
      notificationType === "assessment-cancelled-by-learner" ||
      notificationType === "live-assessment-rescheduled" ||
      notification.link
    ) {
      if (notification.link) {
        if (notification.link.startsWith("http")) {
          window.open(notification.link, "_blank");
        } else {
          navigate(notification.link);
        }
      } else if (notificationType === "assessment-cancelled" || notificationType === "assessment-cancelled-by-learner" || notificationType === "live-assessment-rescheduled") {
        navigate(notification.link || "/lms/employee/dashboard");
      } else {
        navigate("/lms/employee/live-sessions");
      }
      return;
    }

    // Goal notifications
    if (
      notificationType === "goal_assigned" ||
      notificationType === "goal_approved" ||
      notificationType === "goal_rejected" ||
      notificationType === "goal_completed" ||
      notificationType === "goal_completion_approved"
    ) {
      if (notification.link) {
        navigate(notification.link);
      } else if (notification.data?.goalId) {
        navigate(`/pms/goals/${notification.data.goalId}`);
      } else {
        navigate("/pms/goals");
      }
      return;
    }

    // Leave notifications
    if (
      notificationType === "leave_applied" ||
      notificationType === "leave_approved" ||
      notificationType === "leave_rejected"
    ) {
      if (notification.link) {
        navigate(notification.link);
      } else if (notification.data?.leaveId) {
        navigate(`/employee/requests`);
      } else {
        navigate("/employee/requests");
      }
      return;
    }

    // Performance review notifications
    if (notificationType === "performance_review_assigned") {
      if (notification.link) {
        navigate(notification.link);
      } else if (notification.data?.reviewId) {
        navigate(`/employee/performance/reviews/${notification.data.reviewId}`);
      } else {
        navigate("/employee/performance/reviews");
      }
      return;
    }

    // Legacy type handling
    if (notificationType === "offer_sent" && notification.data?.offerId) {
      navigate(`/candidate/offer/${notification.data.offerId}`);
    } else if (notificationType === "onboarding_started") {
      navigate("/candidate/onboarding-documents");
    } else if (
      notificationType === "candidate_applied" &&
      notification.data?.candidateId
    ) {
      navigate(`/candidates`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAsRead("all");
    refetch();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "offer_sent":
      case "offer_accepted":
        return <FileCheck className="w-5 h-5 text-blue-500" />;
      case "offer_rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "onboarding_started":
      case "onboarding_completed":
        return <FileText className="w-5 h-5 text-green-500" />;
      case "background_verification_cleared":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "intern_period_notification":
      case "casual_leave_eligible":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "candidate_applied":
        return <FileText className="w-5 h-5 text-blue-500" />;
      case "new-live-session":
        return <Video className="w-5 h-5 text-purple-500" />;
      case "goal_assigned":
      case "goal_approved":
      case "goal_completed":
      case "goal_completion_approved":
        return <Target className="w-5 h-5 text-green-500" />;
      case "goal_rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "leave_applied":
      case "leave_approved":
      case "leave_rejected":
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case "performance_review_assigned":
        return <FileCheck className="w-5 h-5 text-purple-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Filter notifications based on user role
  const shouldShowNotification = (notificationType: string): boolean => {
    const candidateOnlyNotifications = [
      "background_verification_cleared",
      "moved_to_onboarding",
    ];
    if (candidateOnlyNotifications.includes(notificationType)) {
      return userRole === "Candidate";
    }
    const adminOnlyNotifications = [
      "offer_accepted",
      "offer_rejected",
      "offer_moved_to_onboarding",
      "candidate_applied",
    ];
    if (adminOnlyNotifications.includes(notificationType)) {
      return [
        "Admin",
        "HR",
        "Senior HR",
        "Recruiter",
        "Manager",
        "Super Admin",
      ].includes(userRole);
    }
    const sharedNotifications = [
      "offer_sent",
      "onboarding_started",
      "onboarding_completed",
    ];
    if (sharedNotifications.includes(notificationType)) {
      return (
        userRole === "Candidate" ||
        ["Admin", "HR", "Senior HR", "Recruiter", "Manager"].includes(userRole)
      );
    }
    const employeeNotifications = [
      "intern_period_notification",
      "casual_leave_eligible",
    ];
    if (employeeNotifications.includes(notificationType)) {
      return [
        "Admin",
        "HR",
        "Senior HR",
        "Recruiter",
        "Manager",
        "Employee",
      ].includes(userRole);
    }
    if (
      [
        "goal_assigned",
        "goal_approved",
        "goal_completed",
        "goal_completion_approved",
        "goal_rejected",
      ].includes(notificationType)
    ) {
      return [
        "Admin",
        "HR",
        "Senior HR",
        "Manager",
        "Employee",
        "EmployeeAdmin",
        "Super Admin",
      ].includes(userRole);
    }
    if (["leave_applied"].includes(notificationType)) {
      return ["Admin", "HR", "Senior HR", "Manager", "Super Admin"].includes(
        userRole,
      );
    }
    if (["leave_approved", "leave_rejected"].includes(notificationType)) {
      return ["Employee", "EmployeeAdmin"].includes(userRole);
    }
    if (["performance_review_assigned"].includes(notificationType)) {
      return ["Employee", "EmployeeAdmin"].includes(userRole);
    }
    if (
      ["new-live-session", "live-session-cancelled", "assessment-cancelled", "assessment-cancelled-by-learner", "live-assessment-rescheduled"].includes(notificationType)
    ) {
      return true;
    }
    return true;
  };

  const filteredNotifications = notifications.filter((n: NotificationItem) => {
    const notificationType = n.notificationType || n.type;
    return shouldShowNotification(notificationType);
  });

  const unreadCount = filteredNotifications.filter((n) => !n.isRead).length;

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                View and manage all your notifications
              </p>
            </div>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllRead} variant="outline">
                Mark all as read
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Select value={readFilter} onValueChange={setReadFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="false">Unread</SelectItem>
                    <SelectItem value="true">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No notifications found</p>
                  <p className="text-sm mt-2">
                    {searchTerm || readFilter !== "all"
                      ? "Try adjusting your filters"
                      : "You're all caught up!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => {
                    const notificationType =
                      notification.notificationType || notification.type;
                    return (
                      <div
                        key={notification._id}
                        className={`p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
                          !notification.isRead
                            ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200"
                            : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1 flex-shrink-0">
                            {getNotificationIcon(notificationType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {notification.title || notification.message}
                                </p>
                                {notification.title &&
                                  notification.message &&
                                  notification.title !==
                                    notification.message && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {notification.message}
                                    </p>
                                  )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(
                                    new Date(notification.createdAt),
                                    { addSuffix: true },
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {notificationType && (
                                  <Badge variant="outline" className="text-xs">
                                    {notificationType
                                      .replace(/-/g, " ")
                                      .replace(/_/g, " ")}
                                  </Badge>
                                )}
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, pagination.total)} of{" "}
                    {pagination.total} notifications
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default Notifications;
