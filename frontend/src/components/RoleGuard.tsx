import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { hasRouteAccess, getRoleDashboard } from "@/utils/roleUtils";
import { canViewModule, getUserPermissions } from "@/utils/permissionUtils";
import AccessDenied from "@/pages/AccessDenied";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireRole?: string;
}

/**
 * Route guard that checks role-based access
 * Redirects to appropriate dashboard or shows access denied
 */
const RoleGuard = ({ children, allowedRoles, requireRole }: RoleGuardProps) => {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userRole = user.role;

  // If specific role is required
  if (requireRole && String(userRole).toLowerCase() !== String(requireRole).toLowerCase()) {
    const dashboard = getRoleDashboard(userRole);
    return <Navigate to={dashboard} replace />;
  }

  // If allowed roles are specified
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

interface RouteAccessGuardProps {
  children: React.ReactNode;
  path: string;
}

/**
 * Component that checks if user's role has access to a specific route path
 */
export const RouteAccessGuard = ({ children, path }: RouteAccessGuardProps) => {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Get user permissions
  // Get user permissions
  const userPermissions = getUserPermissions(user.role, user.roleId as any, user.permissions);

  // Map path to module (order matters - more specific paths first)
  const pathToModule: Array<{ path: string; module: string }> = [
    { path: '/staff-profile', module: 'staff' },
    { path: '/staff-overview', module: 'staff' },
    { path: '/salary-structure', module: 'staff' },
    { path: '/staff/leaves-pending-approval', module: 'staff' },
    { path: '/staff/loans', module: 'staff' },
    { path: '/staff/expense-claims', module: 'staff' },
    { path: '/staff/payslip-requests', module: 'staff' },
    { path: '/staff', module: 'staff' },
    { path: '/candidates', module: 'interview' },
    { path: '/performance', module: 'performance' },
    { path: '/payroll', module: 'payroll' },
    { path: '/course-library', module: 'lms' },
    { path: '/assets', module: 'assets' },
    { path: '/integrations', module: 'integrations' },
    { path: '/settings', module: 'settings' },
    { path: '/company', module: 'company-policy' },
  ];

  // Check if path requires a specific module (check more specific paths first)
  const requiredModule = pathToModule.find(p => path.startsWith(p.path));

  if (requiredModule) {
    const module = requiredModule.module;

    // If user has custom role permissions, check those
    if (userPermissions.length > 0) {
      const hasAccess = canViewModule(userPermissions, module);
      if (!hasAccess) {
        return <AccessDenied />;
      }
    } else {
      // Otherwise use default role-based access
      const hasAccess = hasRouteAccess(user.role, path);
      if (!hasAccess) {
        return <AccessDenied />;
      }
    }
  } else {
    // For other paths, use default role-based check
    const hasAccess = hasRouteAccess(user.role, path);
    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
};

export default RoleGuard;

