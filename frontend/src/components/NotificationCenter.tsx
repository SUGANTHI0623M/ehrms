import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCircle, XCircle, FileCheck, FileText, AlertCircle } from 'lucide-react';
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

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const notificationsRef = useRef<Notification[]>([]);
  
  const userRole = user?.role || '';

  useEffect(() => {
    // Load notifications from localStorage and filter by role
    const stored = localStorage.getItem('notifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      const notificationsWithDates = parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
      
      // Filter notifications based on current user role
      const filtered = notificationsWithDates.filter((n: Notification) => {
        const notificationType = n.type;
        
        // Candidate-only notifications
        const candidateOnlyNotifications = ['background_verification_cleared', 'moved_to_onboarding'];
        if (candidateOnlyNotifications.includes(notificationType)) {
          return userRole === 'Candidate';
        }
        
        // Admin/HR/Manager-only notifications
        const adminOnlyNotifications = ['offer_accepted', 'offer_rejected', 'offer_moved_to_onboarding'];
        if (adminOnlyNotifications.includes(notificationType)) {
          return ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager'].includes(userRole);
        }
        
        // Shared notifications (candidates and admins)
        const sharedNotifications = ['offer_sent', 'onboarding_started', 'onboarding_completed'];
        if (sharedNotifications.includes(notificationType)) {
          return userRole === 'Candidate' || ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager'].includes(userRole);
        }
        
        // Intern period and casual leave notifications - show to both admin and employee
        const employeeNotifications = ['intern_period_notification', 'casual_leave_eligible'];
        if (employeeNotifications.includes(notificationType)) {
          return ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager', 'Employee'].includes(userRole);
        }
        
        // Default: show notification
        return true;
      });
      
      setNotifications(filtered);
      notificationsRef.current = filtered;
      // Update localStorage with filtered notifications
      localStorage.setItem('notifications', JSON.stringify(filtered));
    }

    // Set up socket listeners
    const handleOfferSent = (data: any) => {
      // Only show to candidates (they receive offers) or admins/HR (they send offers)
      if (userRole === 'Candidate') {
        const notification: Notification = {
          id: `offer_sent_${Date.now()}`,
          type: 'offer_sent',
          message: data.message || 'You have received a job offer',
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
        toast.info('New offer received!', {
          description: data.message,
        });
      } else if (['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager'].includes(userRole)) {
        // Show to admins/HR that an offer was sent
        const notification: Notification = {
          id: `offer_sent_${Date.now()}`,
          type: 'offer_sent',
          message: data.message || `Offer sent to ${data.candidateName || 'candidate'}`,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
      }
    };

    const handleOfferAccepted = (data: any) => {
      // Show to admins/HR/Manager (candidate accepted offer)
      if (['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager'].includes(userRole)) {
        const notification: Notification = {
          id: `offer_accepted_${Date.now()}`,
          type: 'offer_accepted',
          message: data.message || `Offer accepted by ${data.candidateName || 'candidate'}`,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
      }
    };

    const handleOfferRejected = (data: any) => {
      // Show to admins/HR/Manager (candidate rejected offer)
      if (['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager'].includes(userRole)) {
        const notification: Notification = {
          id: `offer_rejected_${Date.now()}`,
          type: 'offer_rejected',
          message: data.message || `Offer rejected by ${data.candidateName || 'candidate'}`,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
      }
    };

    const handleInternPeriodNotification = (data: any) => {
      // Show to both admin and employee
      const notification: Notification = {
        id: `intern_period_${Date.now()}`,
        type: 'intern_period_notification',
        message: data.message || 'This intern period is over please convert to employee',
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        data,
      };
      addNotification(notification);
      if (userRole === 'Employee' || userRole === 'Candidate') {
        toast.info('Intern Period Notification', {
          description: data.message || 'This intern period is over please convert to employee',
        });
      }
    };

    const handleCasualLeaveEligible = (data: any) => {
      // Show to both admin and employee
      const notification: Notification = {
        id: `casual_leave_eligible_${Date.now()}`,
        type: 'casual_leave_eligible',
        message: data.message || (userRole === 'Employee' ? 'You are eligible for casual leave' : 'This user eligible for casual leave'),
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        data,
      };
      addNotification(notification);
      if (userRole === 'Employee') {
        toast.info('Casual Leave Eligibility', {
          description: 'You are eligible for casual leave',
        });
      }
    };

    const handleOnboardingStarted = (data: any) => {
      // Show to candidates (they need to upload documents) or admins/HR (they started onboarding)
      if (userRole === 'Candidate') {
        const notification: Notification = {
          id: `onboarding_started_${Date.now()}`,
          type: 'onboarding_started',
          message: data.message || 'Onboarding process has started',
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
        toast.info('Onboarding started!', {
          description: 'Please upload the required documents',
        });
      } else if (['Admin', 'HR', 'Senior HR', 'Manager'].includes(userRole)) {
        const notification: Notification = {
          id: `onboarding_started_${Date.now()}`,
          type: 'onboarding_started',
          message: data.message || `Onboarding started for ${data.candidateName || 'candidate'}`,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
      }
    };

    const handleOnboardingCompleted = (data: any) => {
      // Show to candidates (their documents verified) or admins/HR (they verified documents)
      if (userRole === 'Candidate') {
        const notification: Notification = {
          id: `onboarding_completed_${Date.now()}`,
          type: 'onboarding_completed',
          message: data.message || 'Onboarding documents verified',
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
      } else if (['Admin', 'HR', 'Senior HR', 'Manager'].includes(userRole)) {
        const notification: Notification = {
          id: `onboarding_completed_${Date.now()}`,
          type: 'onboarding_completed',
          message: data.message || `Onboarding completed for ${data.candidateName || 'candidate'}`,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
      }
    };

    const handleBackgroundVerificationCleared = (data: any) => {
      // Only show to candidates (they cleared background verification)
      if (userRole === 'Candidate') {
        const notification: Notification = {
          id: `bgv_cleared_${Date.now()}`,
          type: 'background_verification_cleared',
          message: data.message || 'Background verification cleared',
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
        toast.success('Congratulations!', {
          description: 'Background verification cleared. You are now a staff member.',
        });
      }
    };

    const handleMovedToOnboarding = (data: any) => {
      // Show to candidates (they were moved to onboarding)
      if (userRole === 'Candidate') {
        const notification: Notification = {
          id: `moved_to_onboarding_${Date.now()}`,
          type: 'moved_to_onboarding',
          message: data.message || 'You have been moved to onboarding',
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
        toast.info('Onboarding started!', {
          description: 'Please check your onboarding dashboard',
        });
      }
    };

    const handleOfferMovedToOnboarding = (data: any) => {
      // Show to admins/HR/Manager (candidate moved to onboarding)
      if (['Admin', 'HR', 'Senior HR', 'Manager'].includes(userRole)) {
        const notification: Notification = {
          id: `offer_moved_to_onboarding_${Date.now()}`,
          type: 'offer_moved_to_onboarding',
          message: data.message || `Candidate moved to onboarding`,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
      }
    };

    const handleCandidateApplied = (data: any) => {
      // Show to admins/HR/Manager/Recruiter (new candidate applied)
      if (['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager', 'Super Admin'].includes(userRole)) {
        const notification: Notification = {
          id: `candidate_applied_${Date.now()}_${data.candidateId}`,
          type: 'candidate_applied',
          message: data.message || `New candidate application: ${data.candidateName || 'Candidate'} applied for ${data.jobTitle || 'position'}`,
          timestamp: new Date(data.timestamp || Date.now()),
          read: false,
          data,
        };
        addNotification(notification);
        toast.info('New Candidate Application', {
          description: data.message || `New candidate applied for ${data.jobTitle || 'position'}`,
        });
      }
    };

    socketService.on('offer_sent', handleOfferSent);
    socketService.on('offer_accepted', handleOfferAccepted);
    socketService.on('offer_rejected', handleOfferRejected);
    socketService.on('onboarding_started', handleOnboardingStarted);
    socketService.on('onboarding_completed', handleOnboardingCompleted);
    socketService.on('background_verification_cleared', handleBackgroundVerificationCleared);
    socketService.on('moved_to_onboarding', handleMovedToOnboarding);
    socketService.on('offer_moved_to_onboarding', handleOfferMovedToOnboarding);
    socketService.on('intern_period_notification', handleInternPeriodNotification);
    socketService.on('casual_leave_eligible', handleCasualLeaveEligible);
    socketService.on('candidate_applied', handleCandidateApplied);

    return () => {
      socketService.off('offer_sent', handleOfferSent);
      socketService.off('offer_accepted', handleOfferAccepted);
      socketService.off('offer_rejected', handleOfferRejected);
      socketService.off('onboarding_started', handleOnboardingStarted);
      socketService.off('onboarding_completed', handleOnboardingCompleted);
      socketService.off('background_verification_cleared', handleBackgroundVerificationCleared);
      socketService.off('moved_to_onboarding', handleMovedToOnboarding);
      socketService.off('offer_moved_to_onboarding', handleOfferMovedToOnboarding);
      socketService.off('candidate_applied', handleCandidateApplied);
    };
  }, [userRole]);

  const addNotification = (notification: Notification) => {
    const updated = [notification, ...notificationsRef.current].slice(0, 50); // Keep last 50
    setNotifications(updated);
    notificationsRef.current = updated;
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'offer_sent' && notification.data?.offerId) {
      navigate(`/candidate/offer/${notification.data.offerId}`);
      setIsOpen(false);
    } else if (notification.type === 'onboarding_started') {
      navigate('/candidate/onboarding-documents');
      setIsOpen(false);
    } else if (notification.type === 'candidate_applied' && notification.data?.candidateId) {
      // Navigate to candidate profile or candidates list
      navigate(`/candidates`);
      setIsOpen(false);
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    notificationsRef.current = updated;
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    notificationsRef.current = updated;
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    notificationsRef.current = [];
    localStorage.removeItem('notifications');
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
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Filter notifications based on user role
  const shouldShowNotification = (notificationType: string, notificationData?: any): boolean => {
    // Candidate-only notifications (not shown to admins)
    const candidateOnlyNotifications = ['background_verification_cleared', 'moved_to_onboarding'];
    if (candidateOnlyNotifications.includes(notificationType)) {
      return userRole === 'Candidate';
    }
    
        // Admin/HR/Manager-only notifications (not shown to candidates)
        const adminOnlyNotifications = ['offer_accepted', 'offer_rejected', 'offer_moved_to_onboarding', 'candidate_applied'];
        if (adminOnlyNotifications.includes(notificationType)) {
          return ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager', 'Super Admin'].includes(userRole);
        }
    
    // Notifications that can show to both candidates and admins (with different messages)
    const sharedNotifications = ['offer_sent', 'onboarding_started', 'onboarding_completed'];
    if (sharedNotifications.includes(notificationType)) {
      // Show to candidates OR admins/HR/Manager
      return userRole === 'Candidate' || ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager'].includes(userRole);
    }
    
    // Intern period and casual leave notifications - show to both admin and employee
    const employeeNotifications = ['intern_period_notification', 'casual_leave_eligible'];
    if (employeeNotifications.includes(notificationType)) {
      return ['Admin', 'HR', 'Senior HR', 'Recruiter', 'Manager', 'Employee'].includes(userRole);
    }
    
    // Default: show notification
    return true;
  };

  const filteredNotifications = notifications.filter(n => shouldShowNotification(n.type, n.data));
  const unreadCount = filteredNotifications.filter(n => !n.read).length;

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
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
            {filteredNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs"
              >
                Clear all
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
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
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

