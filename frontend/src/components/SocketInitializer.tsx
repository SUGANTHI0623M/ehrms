import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import socketService from '@/services/socket.service';

const SocketInitializer = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect socket when user is authenticated
      console.log('[SocketInitializer] 🔌 User authenticated, connecting socket...', {
        userId: user.id || (user as any)._id,
        email: user.email
      });
      socketService.connect();
      
      // Log connection status after a short delay
      setTimeout(() => {
        const status = socketService.getConnectionStatus();
        // console.log('[SocketInitializer] 📊 Initial connection status:', status);
      }, 2000);
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

