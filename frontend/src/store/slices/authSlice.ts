import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Permission {
  module: string;
  actions: string[];
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  companyId?: string;
  permissions?: string[];
  roleId?: {
    _id: string;
    name: string;
    permissions: Permission[];
  };
  subRole?: 'Senior HR' | 'Junior HR' | 'Manager';
  sidebarPermissions?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Get stored token from localStorage
const getStoredToken = (): string | null => {
  // First check for the standard token key
  const token = localStorage.getItem('token');
  if (token) return token;

  // Fallback: check old role-based keys for backward compatibility
  const roleKeys = ['admin_token', 'hr_token', 'manager_token', 'employee_token', 'user_token'];
  for (const key of roleKeys) {
    const storedToken = localStorage.getItem(key);
    if (storedToken) {
      // Migrate to new token key
      localStorage.setItem('token', storedToken);
      localStorage.removeItem(key);
      return storedToken;
    }
  }
  return null;
};

// Get stored user
const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

const storedToken = getStoredToken();
const storedUser = getStoredUser();

const initialState: AuthState = {
  user: storedUser,
  token: storedToken,
  isAuthenticated: !!storedToken && !!storedUser,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      const { user, token } = action.payload;

      // Validate token exists
      if (!token) {
        console.error('[Auth] setCredentials called without token');
        return;
      }

      // Update state
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;

      // Store token in localStorage (single key, not role-based)
      try {
        localStorage.setItem('token', token);
        console.log('[Auth] Token stored in localStorage successfully');
      } catch (error) {
        console.error('[Auth] Failed to store token in localStorage:', error);
      }

      // Store user info
      try {
        localStorage.setItem('user', JSON.stringify(user));
        console.log('[Auth] User data stored in localStorage successfully');
      } catch (error) {
        console.error('[Auth] Failed to store user data in localStorage:', error);
      }

      // Clean up old role-based token keys (migration)
      ['admin_token', 'hr_token', 'manager_token', 'employee_token', 'user_token'].forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          // Ignore errors when removing old keys
        }
      });
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;

      // Clear all token keys from localStorage
      ['token', 'admin_token', 'hr_token', 'manager_token', 'employee_token', 'user_token'].forEach(key => {
        localStorage.removeItem(key);
      });
      localStorage.removeItem('user');

      // Clear sessionStorage
      sessionStorage.clear();
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

