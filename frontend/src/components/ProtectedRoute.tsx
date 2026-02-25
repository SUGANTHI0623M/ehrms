import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { getRoleDashboard } from "@/utils/roleUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that ensures user is authenticated
 * Redirects to login if not authenticated
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, user, token } = useAppSelector((state) => state.auth);
  
  // Also check localStorage as a fallback (in case Redux state hasn't updated yet)
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  let storedUser = null;
  
  try {
    storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
  } catch (e) {
    // Invalid JSON, ignore
  }
  
  // Check if we have authentication data (either in Redux or localStorage)
  const hasAuth = (isAuthenticated && user && token) || (storedToken && storedUser);
  
  if (!hasAuth) {
    console.warn('[ProtectedRoute] User not authenticated, redirecting to login', {
      isAuthenticated,
      hasUser: !!user,
      hasToken: !!token,
      hasStoredToken: !!storedToken,
      hasStoredUser: !!storedUser,
      currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
    });
    return <Navigate to="/" replace />;
  }

  // If we have stored auth but Redux state isn't updated yet, log it
  if (storedToken && storedUser && (!isAuthenticated || !user || !token)) {
    console.log('[ProtectedRoute] Using stored auth data, Redux state not yet updated', {
      hasStoredToken: !!storedToken,
      hasStoredUser: !!storedUser,
      reduxAuthenticated: isAuthenticated
    });
  }

  return <>{children}</>;
};

export default ProtectedRoute;

