import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { getRoleDashboard } from "@/utils/roleUtils";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard component that ensures only Super Admin users can access Super Admin routes
 */
const SuperAdminRoute = ({ children }: SuperAdminRouteProps) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // Also check localStorage as fallback
  const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  let storedUser = null;
  try {
    storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
  } catch (e) {
    // Invalid JSON
  }
  
  const user = currentUser || storedUser;

  // Check if user is authenticated
  if (!user) {
    console.warn('[SuperAdminRoute] No user found, redirecting to login');
    return <Navigate to="/" replace />;
  }

  // Check if user is Super Admin
  const role = String(user.role || "").trim();
  if (role !== "Super Admin") {
    console.warn('[SuperAdminRoute] User is not Super Admin, redirecting to dashboard', {
      role: role,
      userId: user.id
    });
    // Redirect company-level users to their role-based dashboard
    const dashboardPath = getRoleDashboard(role);
    return <Navigate to={dashboardPath} replace />;
  }

  // Super Admin should not have a companyId, but allow it if present
  // (Some Super Admins might be associated with a company for historical reasons)
  if (user.companyId) {
    console.warn("[SuperAdminRoute] Super Admin user has companyId - this is unusual but allowing access", {
      userId: user.id,
      companyId: user.companyId
    });
    // Don't block access, just log a warning
  }

  console.log('[SuperAdminRoute] Access granted to Super Admin', {
    userId: user.id,
    role: role
  });

  return <>{children}</>;
};

export default SuperAdminRoute;

