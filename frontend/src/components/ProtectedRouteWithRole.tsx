import ProtectedRoute from "./ProtectedRoute";
import RoleGuard, { RouteAccessGuard } from "./RoleGuard";

interface ProtectedRouteWithRoleProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireRole?: string;
  path?: string;
}

/**
 * Combined route guard that checks both authentication and role
 */
const ProtectedRouteWithRole = ({ 
  children, 
  allowedRoles, 
  requireRole,
  path 
}: ProtectedRouteWithRoleProps) => {
  // If path is provided, use RouteAccessGuard
  if (path) {
    return (
      <ProtectedRoute>
        <RouteAccessGuard path={path}>
          {children}
        </RouteAccessGuard>
      </ProtectedRoute>
    );
  }

  // Otherwise use RoleGuard with allowedRoles or requireRole
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={allowedRoles} requireRole={requireRole}>
        {children}
      </RoleGuard>
    </ProtectedRoute>
  );
};

export default ProtectedRouteWithRole;

