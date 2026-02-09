import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, XCircle, FileCheck, FileText, AlertCircle, Video, CheckCircle } from 'lucide-react';
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
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    // Socket Listeners
    const handleSocketEvent = (event: string, data: any) => {
      // Refetch to get the persisted notification
      refetch();

      // Toast
      let description = data.message;
      if (event === 'new-live-session') description = `${data.title} at ${new Date(data.dateTime).toLocaleString()}`;

      toast.info(data.title || 'New Notification', {
        description: description,
      });
    };

    // Events to listen for
    const events = [
      'offer_sent', 'offer_accepted', 'offer_rejected',
      'onboarding_started', 'onboarding_completed',
      'background_verification_cleared', 'moved_to_onboarding', 'offer_moved_to_onboarding',
      'intern_period_notification', 'casual_leave_eligible',
      'new-live-session' // Added this
    ];

    events.forEach(evt => {
      socketService.on(evt, (data) => handleSocketEvent(evt, data));
    });

    return () => {
      events.forEach(evt => {
        socketService.off(evt);
      });
    };
  }, [refetch]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigation logic
    if (notification.type === 'new-live-session' || notification.link) {
      if (notification.link) {
        // Check if internal or external
        if (notification.link.startsWith('http')) {
          window.open(notification.link, '_blank');
        } else {
          navigate(notification.link);
        }
      } else {
        // Fallback for live sessions
        navigate('/lms/employee/live-sessions');
      }
      setIsOpen(false);
      return;
    }

    // Legacy type handling
    if (notification.type === 'offer_sent' && notification.data?.offerId) {
      navigate(`/candidate/offer/${notification.data.offerId}`);
    } else if (notification.type === 'onboarding_started') {
      navigate('/candidate/onboarding-documents');
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
      case 'new-live-session':
        return <Video className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

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
      <PopoverContent className="w-80 p-0" align="end">
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
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-accent cursor-pointer ${!notification.isRead ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title || notification.message}</p>
                      {notification.title && notification.message && notification.title !== notification.message && (
                        <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
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
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;

