import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout, setCredentials } from '../slices/authSlice';
import type { RootState } from '../store';

// Get token from localStorage or Redux state
const getToken = (state?: RootState): string | null => {
  // First check Redux state (most up-to-date)
  if (state) {
    const authState = (state as any).auth;
    if (authState?.token) {
      return authState.token;
    }
  }
  // Fallback to localStorage
  return localStorage.getItem('token');
};

// Determine API URL based on hostname
const getApiUrl = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Check if hostname is local (localhost, 127.0.0.1, or any local IP)
    const isLocal = hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname === '[::1]';

    if (isLocal) {
      // Use localhost for local development
      return 'http://localhost:8000/api';
    }
  }

  // For production/non-local environments, use VITE_API_URL from environment
  // This will be set in .env.production for production builds
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback: if no VITE_API_URL is set and not local, use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api';
  }

  // Default fallback for SSR or other cases
  return 'http://localhost:8000/api';
};

const baseQuery = fetchBaseQuery({
  baseUrl: getApiUrl(),
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = getToken(state);
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    return headers;
  },
  fetchFn: async (input, init) => {
    // If body is FormData, remove Content-Type header to let browser set it with boundary
    if (init?.body instanceof FormData && init.headers) {
      const headers = new Headers(init.headers);
      headers.delete('Content-Type');
      init.headers = headers;
    }
    return fetch(input, init);
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Enhanced base query with error handling and automatic token refresh
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  // Get the endpoint URL to check if it's an auth endpoint
  const endpoint = typeof args === 'string' ? args : args?.url || '';
  const isAuthEndpoint = endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh');

  // Handle 401 errors (unauthorized) - token expired or invalid
  // BUT exclude auth endpoints (login/register/refresh) from auto-logout
  if (result.error && result.error.status === 401 && !isAuthEndpoint) {
    const state = api.getState() as any;
    const currentToken = state?.auth?.token || localStorage.getItem('token');

    // Only attempt refresh if we actually had a token (meaning it expired/invalid)
    // If there's no token, it's likely a first-time access or the login failed
    if (currentToken) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<any>((resolve, reject) => {
          failedQueue.push({
            resolve: async () => {
              // Retry the original request after refresh completes
              try {
                const retryResult = await baseQuery(args, api, extraOptions);
                resolve(retryResult);
              } catch (error) {
                reject(error);
              }
            },
            reject
          });
        });
      }

      isRefreshing = true;
      console.log('[Auth] 401 Unauthorized - Attempting to refresh token...', {
        endpoint,
        hasToken: !!currentToken
      });

      // Attempt to refresh the token using the refresh token cookie
      try {
        // Don't include Authorization header for refresh request (token is expired)
        const refreshResult = await fetch(`${getApiUrl()}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Include cookies (refresh token)
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        const refreshData = await refreshResult.json();

        if (refreshResult.ok && refreshData?.success && refreshData?.data?.accessToken) {
          const newAccessToken = refreshData.data.accessToken;
          console.log('[Auth] Token refreshed successfully');

          // Update the token in Redux state and localStorage
          const currentUser = state?.auth?.user || JSON.parse(localStorage.getItem('user') || 'null');
          if (currentUser) {
            api.dispatch(setCredentials({ user: currentUser, token: newAccessToken }));
          } else {
            // If no user in state, just update the token
            localStorage.setItem('token', newAccessToken);
          }

          // Process queued requests
          processQueue(null, newAccessToken);

          // Retry the original request with the new token
          result = await baseQuery(args, api, extraOptions);
          console.log('[Auth] Original request retried after token refresh', {
            endpoint,
            success: !result.error
          });
        } else {
          throw new Error(refreshData?.error?.message || 'Token refresh failed');
        }
      } catch (refreshError: any) {
        // Refresh failed - token is expired or invalid, logout user
        console.warn('[Auth] Token refresh failed - Logging out...', {
          endpoint,
          error: refreshError?.message || refreshError
        });

        // Process queued requests with error
        processQueue(refreshError, null);

        // Clear all auth data
        api.dispatch(logout());

        // Redirect to login if we're in browser (but not if we're already on login page)
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
          // Use a small delay to ensure state is cleared
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }
      } finally {
        isRefreshing = false;
      }
    } else {
      console.warn('[Auth] 401 Unauthorized - No token found. This might be expected for unauthenticated requests.', {
        endpoint
      });
    }
  }

  // Handle 403 errors (forbidden) - insufficient permissions
  if (result.error && result.error.status === 403) {
    const errorData = result.error.data as any;
    const errorMessage = errorData?.error?.message || '';

    // Only logout for account deactivation, not for permission issues
    if (errorMessage.includes('deactivated') || errorMessage.includes('inactive')) {
      console.warn('[Auth] 403 Forbidden - Account deactivated. Logging out...', {
        endpoint,
        errorMessage
      });

      api.dispatch(logout());
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } else {
      console.warn('[Auth] 403 Forbidden - Insufficient permissions', {
        endpoint,
        errorMessage
      });
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'InterviewTemplate',
    'InterviewResponse',
    'Interview',
    'JobOpening',
    'JobInterviewFlow',
    'Offer',
    'User',
    'Staff',
    'Candidate',
    'Payroll',
    'Attendance',
    'Dashboard',
    'Performance',
    'PMS',
    'LMS',
    'Assets',
    'Settings',
    'Reimbursement',
    'Loan',
    'Leave',
    'KRA',
    'Exotel',
    'Askeva',
    'SendGrid',
    'SendPulse',
    'SuperAdmin',
    'Referral',
    'Hiring',
    'BackgroundVerification',
    'OfferTemplate',
    'Onboarding',
    'DocumentRequirements',
    'Holiday',
    'Notifications',
  ],
  endpoints: () => ({}),
});

