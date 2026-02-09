/**
 * Role-based routing and permission utilities
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Senior HR' | 'HR' | 'Manager' | 'Team Leader' | 'Employee' | 'Candidate';

/**
 * Get default dashboard route for a role
 */
export const getRoleDashboard = (role: string): string => {
  const roleMap: Record<string, string> = {
    'Super Admin': '/super-admin/dashboard',
    'Admin': '/admin/dashboard',
    'Senior HR': '/dashboard',
    'HR': '/dashboard',
    'Manager': '/dashboard',
    'Team Leader': '/dashboard',
    'Employee': '/employee/dashboard',
    'EmployeeAdmin': '/dashboard',
    'Candidate': '/candidate/dashboard',
  };
  return roleMap[role] || '/dashboard';
};

/**
 * Get profile route for a role
 */
export const getProfileRoute = (role: string): string => {
  const roleMap: Record<string, string> = {
    'Candidate': '/candidate/profile',
    'Super Admin': '/profile',
    'Admin': '/profile',
    'Senior HR': '/profile',
    'HR': '/profile',
    'Recruiter': '/profile',
    'Manager': '/profile',
    'Team Leader': '/profile',
    'Employee': '/profile',
    'EmployeeAdmin': '/profile',
  };
  return roleMap[role] || '/profile';
};

/**
 * Check if a role has access to a module
 */
export const hasModuleAccess = (role: string, module: string): boolean => {
  const roleModules: Record<string, string[]> = {
    'Super Admin': [
      'super-admin-dashboard',
      'manage-companies',
      'super-admin-settings',
      'subscription-management',
    ],
    'Admin': [
      'dashboard',
      'interview',
      'staff',
      'performance',
      'payroll',
      'lms',
      'assets',
      'integrations',
      'settings',
      'company-policy',
    ],
    'Senior HR': [
      'dashboard',
      'interview',
      'candidates',
      'staff',
    ],
    'HR': [
      'dashboard',
      'interview',
      'candidates',
    ],
    'Manager': [
      'dashboard',
      'interview',
      'staff',
      'performance',
      'payroll',
      'lms',
    ],
    'Team Leader': [
      'dashboard',
      'staff',
      'performance',
      'payroll',
      'lms',
    ],
    'Employee': [
      'dashboard',
      'performance',
      'payroll',
      'lms',
    ],
    'EmployeeAdmin': [
      'dashboard',
      'staff',
      'payroll',
      'company-policy',
    ],
    'Candidate': [
      'dashboard',
      'jobs',
      'applications',
    ],
  };

  const modules = roleModules[role] || [];
  return modules.includes(module);
};

/**
 * Check if a role has access to a specific route
 */
export const hasRouteAccess = (role: string, path: string): boolean => {
  // Super Admin routes
  if (path.startsWith('/super-admin')) {
    return role === 'Super Admin';
  }

  // Admin routes
  if (path.startsWith('/admin')) {
    return role === 'Admin';
  }

  // Public routes (accessible to all authenticated users)
  const publicRoutes = ['/profile', '/dashboard'];
  if (publicRoutes.some(route => path.startsWith(route))) {
    return true;
  }

  // Candidate routes (accessible to Candidate role)
  if (path.startsWith('/candidate')) {
    return role === 'Candidate';
  }

  // Role-specific route access
  const routeAccess: Record<string, string[]> = {
    'Super Admin': [
      '/super-admin',
    ],
    'Admin': [
      '/admin',
      '/candidates',
      '/staff',
      '/staff-profile',
      '/staff-overview',
      '/salary-structure',
      '/performance',
      '/payroll',
      '/course-library',
      '/assets',
      '/integrations',
      '/settings',
      '/user-management',
      '/company',
    ],
    'Senior HR': [
      '/candidates',
      '/interview',
      '/staff',
      '/staff-profile',
      '/staff-overview',
      '/salary-structure',
    ],
    'HR': [
      '/candidates',
      '/interview',
      '/staff',
      '/staff-profile',
    ],
    'Manager': [
      '/candidates',
      '/staff',
      '/staff-profile',
      '/staff-overview',
      '/performance',
      '/payroll',
      '/course-library',
      '/pms',
    ],
    'Team Leader': [
      '/staff',
      '/staff-profile',
      '/performance',
      '/payroll',
      '/course-library',
      '/pms',
    ],
    'Employee': [
      '/performance',
      '/payroll',
      '/course-library',
      '/pms',
    ],
    'Candidate': [
      '/candidate',
      '/jobs',
      '/applications',
    ],
  };

  const allowedRoutes = routeAccess[role] || [];
  return allowedRoutes.some(route => path.startsWith(route));
};

/**
 * Get permitted modules for a role (for sidebar)
 */
export const getPermittedModules = (role: string): string[] => {
  const moduleMap: Record<string, string[]> = {
    'Super Admin': [
      'super-admin-dashboard',
      'manage-companies',
      'super-admin-settings',
      'subscription-management',
    ],
    'Admin': [
      'dashboard',
      'interview',
      'staff',
      'performance',
      'payroll',
      'lms',
      'assets',
      'integrations',
      'settings',
      'company-policy',
    ],
    'Senior HR': [
      'dashboard',
      'interview',
      'candidates',
      'staff',
    ],
    'HR': [
      'dashboard',
      'interview',
      'candidates',
    ],
    'Manager': [
      'dashboard',
      'interview',
      'staff',
      'performance',
      'payroll',
      'lms',
    ],
    'Team Leader': [
      'dashboard',
      'staff',
      'performance',
      'payroll',
      'lms',
    ],
    'Employee': [
      'dashboard',
      'performance',
      'payroll',
      'lms',
    ],
    'Candidate': [
      'dashboard',
      'jobs',
    ],
  };

  return moduleMap[role] || [];
};

