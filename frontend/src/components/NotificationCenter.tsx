import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, XCircle, FileCheck, FileText, AlertCircle, Video, CheckCircle, Target, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import socketService from '@/services/socket.service';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hooks';
import { useGetNotificationsQuery, useMarkAsReadMutation } from '@/store/api/notificationApi';

interface NotificationItem {
  _id: string;
  type: string;
  notificationType?: string; // The actual event type (e.g., 'goal_assigned', 'offer_sent')
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  data?: any;
}

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);

  // API Hooks
  const { data: apiData, refetch } = useGetNotificationsQuery();
  const [markAsRead] = useMarkAsReadMutation();

  const notifications = apiData?.data || [];
  const userRole = user?.role ?? '';

  useEffect(() => {
    // Socket Listeners
    const handleSocketEvent = (event: string, data: any) => {
      // Refetch to get the persisted notification
      refetch();

      const title = (data?.title ?? '').trim() || 'New Notification';
      let description = (data?.message ?? '').trim();
      if (event === 'new-live-session') description = data?.dateTime ? `${title} at ${new Date(data.dateTime).toLocaleString()}` : (description || 'Live session scheduled.');
      if (event === 'live-session-cancelled') {
        description = description || (data?.cancellationReason ? `Reason: ${data.cancellationReason}` : 'Session was cancelled.');
        toast.warning(title || 'Session cancelled', { description: description || undefined });
        return;
      }
      if (event === 'assessment-cancelled') {
        toast.warning(data.title || 'Assessment cancelled', { description: data.message });
        return;
      }
      if (event === 'live-assessment-rescheduled') {
        toast.info(data.title || 'Assessment rescheduled', { description: data.message });
        return;
      }

      // Only show toast when we have at least title or description to avoid blank toasts
      if (title || description) {
        toast.info(title, { description: description || undefined });
      }
    };

    // Events to listen for
    const events = [
      'offer_sent', 'offer_accepted', 'offer_rejected',
      'onboarding_started', 'onboarding_completed',
      'background_verification_cleared', 'moved_to_onboarding', 'offer_moved_to_onboarding',
      'intern_period_notification', 'casual_leave_eligible',
      'new-live-session',
      'live-session-cancelled',
      'assessment-cancelled',
      'live-assessment-rescheduled',
      'announcement_published',
      'candidate_applied',
      'goal_assigned',
      'goal_approved',
      'goal_rejected',
      'goal_completed',
      'goal_completion_approved',
      'leave_applied',
      'leave_approved',
      'leave_rejected',
      'performance_review_assigned',
      'celebration_birthday',
      'celebration_anniversary',
    ];

    events.forEach(evt => {
      socketService.on(evt, (data: any) => handleSocketEvent(evt, data));
    });

    return () => {
      events.forEach(evt => {
        socketService.off(evt);
      });
    };
  }, [refetch, userRole]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Use notificationType if available, otherwise fall back to type
    const notificationType = notification.notificationType || notification.type;
    
    // Celebration notifications: open dashboard to show celebration card
    if (notificationType === 'celebration_birthday' || notificationType === 'celebration_anniversary') {
      if (notification.link) {
        navigate(notification.link);
      } else {
        navigate('/employee/dashboard');
      }
      setIsOpen(false);
      return;
    }

    // Navigation logic (announcement, live session, or any notification with link)
    if (notificationType === 'announcement_published' || notificationType === 'new-live-session' || notificationType === 'live-session-cancelled' || notificationType === 'assessment-cancelled' || notificationType === 'live-assessment-rescheduled' || notification.link) {
      if (notification.link) {
        // Check if internal or external
        if (notification.link.startsWith('http')) {
          window.open(notification.link, '_blank');
        } else {
          navigate(notification.link);
        }
      } else if (notificationType === 'new-live-session' || notificationType === 'live-session-cancelled') {
        navigate('/lms/employee/live-sessions');
      } else if (notificationType === 'assessment-cancelled' || notificationType === 'live-assessment-rescheduled') {
        navigate('/lms/employee/dashboard');
      }
      setIsOpen(false);
      return;
    }

    // Goal notifications
    if (notificationType === 'goal_assigned' || notificationType === 'goal_approved' || 
        notificationType === 'goal_rejected' || notificationType === 'goal_completed' || 
        notificationType === 'goal_completion_approved') {
      if (notification.link) {
        navigate(notification.link);
      } else if (notification.data?.goalId) {
        navigate(`/pms/goals/${notification.data.goalId}`);
      } else {
        navigate('/pms/goals');
      }
      setIsOpen(false);
      return;
    }

    // Leave notifications
    if (notificationType === 'leave_applied' || notificationType === 'leave_approved' || notificationType === 'leave_rejected') {
      if (notification.link) {
        navigate(notification.link);
      } else if (notification.data?.leaveId) {
        navigate(`/employee/requests`);
      } else {
        navigate('/employee/requests');
      }
      setIsOpen(false);
      return;
    }

    // Performance review notifications
    if (notificationType === 'performance_review_assigned') {
      if (notification.link) {
        navigate(notification.link);
      } else if (notification.data?.reviewId) {
        navigate(`/employee/performance/reviews/${notification.data.reviewId}`);
      } else {
        navigate('/employee/performance/reviews');
      }
      setIsOpen(false);
      return;
    }

    // Legacy type handling
    if (notificationType === 'offer_sent' && notification.data?.offerId) {
      navigate(`/candidate/offer/${notification.data.offerId}`);
    } else if (notificationType === 'onboarding_started') {
      navigate('/candidate/onboarding-documents');
      setIsOpen(false);
    } else if (notificationType === 'candidate_applied' && notification.data?.candidateId) {
      // Navigate to candidate profile or candidates list
      navigate(`/candidates`);
      setIsOpen(false);
    }

    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAsRead('all');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'offer_sent':
      case 'offer_accepted':
        return <FileCheck className="w-4 h-4 text-blue-500" />;
      case 'offer_rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'onboarding_started':
      case 'onboarding_completed':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'background_verification_cleared':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'intern_period_notification':
      case 'casual_leave_eligible':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'candidate_applied':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'new-live-session':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'goal_assigned':
      case 'goal_approved':
      case 'goal_completed':
      case 'goal_completion_approved':
        return <Target className="w-4 h-4 text-green-500" />;
      case 'goal_rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'leave_applied':
      case 'leave_approved':
      case 'leave_rejected':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'performance_review_assigned':
        return <FileCheck className="w-4 h-4 text-purple-500" />;
      case 'announcement_published':
        return <Megaphone className="w-4 h-4 text-green-500" />;
      case 'celebration_birthday':
        return <span className="w-4 h-4 inline-block text-center" aria-hidden>🎂</span>;
      case 'celebration_anniversary':
        return <span className="w-4 h-4 inline-block text-center" aria-hidden>🌟</span>;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Filter notifications based on user role
  const shouldShowNotification = (notificationType: string, _notificationData?: any): boolean => {
    const candidateOnlyNotifications = ['background_verification_cleared', 'moved_to_onboarding'];
    if (candidateOnlyNotifications.includes(notificationType)) {
      return userRole === 'Candidate';
    }
    const adminOnlyNotifications = ['offer_accepted', 'offer_rejected', 'offer_moved_to_onboarding', 'candidate_applied'];
    if (adminOnlyNotifications.includes(notificationType)) {
      return ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager', 'Super Admin'].includes(userRole);
    }
    const sharedNotifications = ['offer_sent', 'onboarding_started', 'onboarding_completed'];
    if (sharedNotifications.includes(notificationType)) {
      return userRole === 'Candidate' || ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager'].includes(userRole);
    }
    const employeeNotifications = ['intern_period_notification', 'casual_leave_eligible'];
    if (employeeNotifications.includes(notificationType)) {
      return ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager', 'Employee'].includes(userRole);
    }
    // Goal notifications - show to employees and admins
    if (['goal_assigned', 'goal_approved', 'goal_completed', 'goal_completion_approved', 'goal_rejected'].includes(notificationType)) {
      return ['Admin', 'HR', 'Senior HR', 'Manager', 'Employee', 'EmployeeAdmin', 'Super Admin'].includes(userRole);
    }
    // Leave notifications - admins see when employees apply, employees see when approved/rejected
    if (['leave_applied'].includes(notificationType)) {
      return ['Admin', 'HR', 'Senior HR', 'Manager', 'Super Admin'].includes(userRole);
    }
    if (['leave_approved', 'leave_rejected'].includes(notificationType)) {
      return ['Employee', 'EmployeeAdmin'].includes(userRole);
    }
    // Performance review notifications - employees see when assigned
    if (['performance_review_assigned'].includes(notificationType)) {
      return ['Employee', 'EmployeeAdmin'].includes(userRole);
    }
    // LMS and other notifications - show to relevant roles
    if (['new-live-session', 'live-session-cancelled'].includes(notificationType)) {
      return true;
    }
    // Announcement - show to employees (staff) who receive it
    if (notificationType === 'announcement_published') {
      return true;
    }
    // Default: show all other notifications
    return true;
  };

  const filteredNotifications = notifications.filter((n: NotificationItem) => {
    // Use notificationType if available, otherwise fall back to type
    const notificationType = n.notificationType || n.type;
    if (!shouldShowNotification(notificationType, n.data)) return false;
    // Exclude blank notifications so the stack never shows empty cards
    const hasContent = (n.title && String(n.title).trim()) || (n.message && String(n.message).trim());
    return !!hasContent;
  });
  const unreadCount = filteredNotifications.filter((n) => !n.isRead).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 notification-popover" 
        align="end" 
        side="bottom"
        sideOffset={8}
        alignOffset={-12}
        collisionPadding={24}
        style={{ zIndex: 150, maxHeight: 'calc(100vh - 80px)' }}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const displayTitle = (notification.title && String(notification.title).trim()) || (notification.message && String(notification.message).trim()) || 'Notification';
                const displayMessage = notification.title && notification.message && String(notification.title).trim() !== String(notification.message).trim()
                  ? String(notification.message).trim()
                  : '';
                const type = notification.notificationType || notification.type;
                const isCelebration = type === 'celebration_birthday' || type === 'celebration_anniversary';
                return (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-accent cursor-pointer ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''} ${isCelebration ? 'notification-item-celebration' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{displayTitle}</p>
                        {displayMessage && (
                          <p className="text-xs text-muted-foreground mt-0.5">{displayMessage}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;

