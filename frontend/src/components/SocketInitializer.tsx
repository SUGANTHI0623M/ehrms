import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import socketService from '@/services/socket.service';
import { toast } from 'sonner';

const SocketInitializer = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect socket when user is authenticated (non-blocking; never break app if socket fails)
      try {
        console.log('[SocketInitializer] 🔌 User authenticated, connecting socket...', {
          userId: user?.id ?? (user as any)?._id,
          email: user.email
        });
        socketService.connect();
      } catch (err) {
        console.warn('[SocketInitializer] Socket connect failed (app continues):', err);
      }

      // Log connection status after a short delay
      setTimeout(() => {
        const status = socketService.getConnectionStatus();
        // console.log('[SocketInitializer] 📊 Initial connection status:', status);
      }, 2000);

      // Listen for notification events
      const handleNewSession = (data: any) => {
        toast.info(data.message || 'New Live Session Scheduled', {
          description: `${data.title} at ${new Date(data.dateTime).toLocaleString()}`,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/lms/employee/live-sessions'
          },
          duration: 5000,
        });
      };

      socketService.on('new-live-session', handleNewSession);

      const handleSessionCancelled = (data: any) => {
        toast.warning(data.title || 'Session cancelled', {
          description: data.message,
          duration: 6000,
        });
      };
      socketService.on('live-session-cancelled', handleSessionCancelled);

      const handleAssessmentCancelled = (data: any) => {
        toast.warning(data.title || 'Assessment cancelled', {
          description: data.message,
          duration: 6000,
          action: data.link ? {
            label: 'Open course',
            onClick: () => window.location.href = data.link,
          } : undefined,
        });
      };
      socketService.on('assessment-cancelled', handleAssessmentCancelled);

      const handleAssessmentRescheduled = (data: any) => {
        toast.info(data.title || 'Assessment rescheduled', {
          description: data.message,
          duration: 6000,
          action: data.link ? {
            label: 'View',
            onClick: () => window.location.href = data.link,
          } : undefined,
        });
      };
      socketService.on('live-assessment-rescheduled', handleAssessmentRescheduled);

    } else {
      // Disconnect socket when user logs out
      console.log('[SocketInitializer] 🔌 User not authenticated, disconnecting socket...');
      socketService.disconnect();
    }

    return () => {
      // Cleanup on unmount
      if (!isAuthenticated) {
        console.log('[SocketInitializer] 🧹 Cleaning up socket connection...');
        socketService.disconnect();
      }
      socketService.off('new-live-session');
      socketService.off('live-session-cancelled');
      socketService.off('assessment-cancelled');
      socketService.off('live-assessment-rescheduled');
    };
  }, [isAuthenticated, user]);

  // Expose socket service to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).socketService = socketService;
      console.log('[SocketInitializer] 🔧 Socket service exposed to window.socketService for debugging');
      console.log('[SocketInitializer] 💡 Use window.socketService.logConnectionStatus() to check connection');
    }
  }, []);

  return null;
};

export default SocketInitializer;

