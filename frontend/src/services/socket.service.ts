import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
    const state = store.getState() as any;
    const token = state?.auth?.token || localStorage.getItem('token');
    const user = state?.auth?.user || JSON.parse(localStorage.getItem('user') || 'null');

    console.log('[Socket] 🔌 Attempting to connect...');
    console.log('[Socket] Token available:', !!token);
    console.log('[Socket] User available:', !!user);
    console.log('[Socket] Token length:', token?.length || 0);

    if (!token || !user) {
      console.warn('[Socket] ⚠️  No token or user found, skipping connection');
      return;
    }

    // Determine socket URL based on environment
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Determine socket URL: use VITE_SOCKET_URL or derive from VITE_API_URL, else localhost:9000
    let socketUrl: string;
    if (import.meta.env.VITE_SOCKET_URL) {
      socketUrl = (import.meta.env.VITE_SOCKET_URL as string).replace(/^https?:\/\//, '').split('/')[0];
    } else if (import.meta.env.VITE_API_URL) {
      const apiUrl = (import.meta.env.VITE_API_URL as string).replace(/^https?:\/\//, '').split('/')[0];
      socketUrl = apiUrl || hostname;
    } else if (isLocal) {
      socketUrl = 'localhost:9000';
    } else {
      socketUrl = hostname;
    }
    
    // Use wss when API URL is https (e.g. production); ws for local or http
    const apiUrlStr = (import.meta.env.VITE_API_URL as string) || '';
    const useSecureSocket = apiUrlStr.startsWith('https://');
    const protocol = useSecureSocket ? 'wss' : (isLocal ? 'ws' : (window.location.protocol === 'https:' ? 'wss' : 'ws'));
    const fullUrl = `${protocol}://${socketUrl}`;

    console.log('[Socket] 🌐 Connection details:', {
      hostname,
      isLocal,
      socketUrl,
      protocol,
      fullUrl,
      userId: user?.id || user?._id
    });

    // Disconnect existing socket if any
    if (this.socket) {
      console.log('[Socket] 🔄 Disconnecting existing socket...');
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(fullUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] ✅ Connected successfully');
      console.log('[Socket] 📊 Connection status:', {
        connected: this.socket?.connected,
        id: this.socket?.id,
        transport: this.socket?.io?.engine?.transport?.name
      });
      this.reconnectAttempts = 0;
      
      // Log connection status periodically
      const statusInterval = setInterval(() => {
        if (this.socket?.connected) {
          console.log('[Socket] 📊 Status check - Connected:', this.socket.connected, '| ID:', this.socket.id);
        } else {
          clearInterval(statusInterval);
        }
      }, 30000); // Every 30 seconds
      
      // Store interval to clear on disconnect
      (this.socket as any)._statusInterval = statusInterval;
      
      // Rooms are automatically joined on backend based on userId and companyId
      // No need to manually join rooms
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Disconnected:', reason);
      console.log('[Socket] 📊 Disconnect details:', {
        reason,
        wasConnected: this.socket?.connected,
        socketId: this.socket?.id
      });
      
      // Clear status interval
      if ((this.socket as any)?._statusInterval) {
        clearInterval((this.socket as any)._statusInterval);
      }
      
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        console.log('[Socket] 🔄 Server disconnected, attempting reconnect...');
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts === 1) {
        console.warn('[Socket] ❌ Connection error (reconnecting silently):', error.message || 'websocket error');
      }
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('[Socket] ❌ Max reconnection attempts reached. Stopping.');
      }
    });

    // Additional event listeners for debugging
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] ✅ Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket] 🔄 Reconnection attempt #${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[Socket] ❌ Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] ❌ Reconnection failed after max attempts');
    });

    // Register all existing listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.on(event, callback);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus() {
    if (!this.socket) {
      return {
        connected: false,
        status: 'not_initialized',
        socketId: null,
        transport: null,
        reconnectAttempts: this.reconnectAttempts
      };
    }

    return {
      connected: this.socket.connected,
      status: this.socket.connected ? 'connected' : 'disconnected',
      socketId: this.socket.id || null,
      transport: (this.socket.io?.engine?.transport as any)?.name || null,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  logConnectionStatus() {
    const status = this.getConnectionStatus();
    console.log('[Socket] 📊 Connection Status:', status);
    return status;
  }
}

export default new SocketService();

