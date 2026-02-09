import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import socketService from '@/services/socket.service';
import { toast } from 'sonner';

const SocketInitializer = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect socket when user is authenticated
      console.log('[SocketInitializer] 🔌 User authenticated, connecting socket...', {
        userId: user.id,
        email: user.email
      });
      socketService.connect();

      // Log connection status after a short delay
      setTimeout(() => {
        const status = socketService.getConnectionStatus();
        console.log('[SocketInitializer] 📊 Initial connection status:', status);
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

