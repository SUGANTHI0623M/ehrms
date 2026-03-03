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
    // For employees, check if they have sidebarPermissions that grant access
    if (userRole === 'Employee') {
      const sidebarPerms = (user as any).sidebarPermissions || [];
      if (sidebarPerms.length > 0) {
        // If employee has sidebarPermissions, allow access
        // The actual module-level permission will be checked by the component/API
        // This allows employees to access routes that are typically for Admin/HR/Manager
        // if they have been granted those permissions via sidebarPermissions
        return <>{children}</>;
      }
    }
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

  // Get user permissions (including sidebarPermissions for employees)
  const sidebarPerms = (user as any).sidebarPermissions || [];
  const userPermissions = getUserPermissions(user.role, user.roleId as any, user.permissions, sidebarPerms);

  // Map path to module (order matters - more specific paths first)
  const pathToModule: Array<{ path: string; module: string }> = [
    // Staff module paths
    { path: '/staff-profile', module: 'staff' },
    { path: '/staff-overview', module: 'staff' },
    { path: '/salary-structure', module: 'staff' },
    { path: '/staff/leaves-pending-approval', module: 'staff' },
    { path: '/staff/loans', module: 'staff' },
    { path: '/staff/expense-claims', module: 'staff' },
    { path: '/staff/payslip-requests', module: 'staff' },
    { path: '/staff/attendance', module: 'staff' },
    { path: '/staff', module: 'staff' },
    // Interview/Recruitment module paths (more specific paths first)
    { path: '/interview/templates', module: 'interview' },
    { path: '/interview/round/', module: 'interview' },
    { path: '/interview/round/1', module: 'interview' },
    { path: '/interview/round/2', module: 'interview' },
    { path: '/interview/round/3', module: 'interview' },
    { path: '/interview/round/final', module: 'interview' },
    { path: '/interview/selected', module: 'interview' },
    { path: '/interview/candidate/progress', module: 'interview' },
    { path: '/interview/candidate/', module: 'interview' },
    { path: '/interview/background-verification', module: 'interview' },
    { path: '/interview/celebrations', module: 'celebration' },
    { path: '/interview/', module: 'interview' },
    { path: '/interview', module: 'interview' },
    { path: '/candidates', module: 'interview' },
    { path: '/candidate/', module: 'interview' },
    { path: '/job-openings', module: 'interview' },
    { path: '/interview-appointments', module: 'interview' },
    { path: '/onboarding', module: 'interview' },
    { path: '/offer-letter', module: 'interview' },
    { path: '/refer-candidate', module: 'interview' },
    { path: '/hiring', module: 'interview' },
    // Performance/PMS module paths
    { path: '/performance', module: 'performance' },
    { path: '/performance/', module: 'performance' },
    { path: '/pms', module: 'performance' },
    { path: '/pms/', module: 'performance' },
    { path: '/kra', module: 'performance' },
    // Payroll module paths
    { path: '/payroll', module: 'payroll' },
    { path: '/payroll/', module: 'payroll' },
    // Admin LMS module paths (more specific first)
    { path: '/admin/lms/course-modern/', module: 'lms' },
    { path: '/admin/lms/course-detail/', module: 'lms' },
    { path: '/admin/lms/course/', module: 'lms' },
    { path: '/admin/lms/learning-engine', module: 'lms' },
    { path: '/admin/lms/live-sessions', module: 'lms' },
    { path: '/admin/lms/live/', module: 'lms' },
    { path: '/admin/lms/learners/', module: 'lms' },
    { path: '/admin/lms/scores-analytics', module: 'lms' },
    { path: '/admin/lms/assessment', module: 'lms' },
    { path: '/admin/lms/course-library', module: 'lms' },
    { path: '/admin/lms/dashboard', module: 'lms' },
    { path: '/admin/lms', module: 'lms' },
    // Employee LMS module paths
    { path: '/lms/employee/course/', module: 'lms' },
    { path: '/lms/employee/dashboard', module: 'lms' },
    { path: '/lms/employee/live-sessions', module: 'lms' },
    { path: '/lms/ai-quiz/attempt/', module: 'lms' },
    { path: '/lms/assessment/', module: 'lms' },
    { path: '/lms/employee', module: 'lms' },
    // Legacy paths (for backward compatibility)
    { path: '/lms-dashboard', module: 'lms' },
    { path: '/course-library', module: 'lms' },
    { path: '/live-session', module: 'lms' },
    { path: '/quiz-generator', module: 'lms' },
    { path: '/assessment', module: 'lms' },
    { path: '/score', module: 'lms' },
    { path: '/lms', module: 'lms' },
    { path: '/lms/', module: 'lms' },
    { path: '/lms/course/', module: 'lms' },
    // Assets module paths
    { path: '/assets-type', module: 'assets' },
    { path: '/assets', module: 'assets' },
    // Integrations module paths (more specific first)
    { path: '/integrations/sendpulse', module: 'integrations' },
    { path: '/integrations/askeva', module: 'integrations' },
    { path: '/integrations/email', module: 'integrations' },
    { path: '/integrations/exotel', module: 'integrations' },
    { path: '/integrations/google-calendar', module: 'integrations' },
    { path: '/integrations/rcs', module: 'integrations' },
    { path: '/integrations/sendgrid', module: 'integrations' },
    { path: '/integrations/sms', module: 'integrations' },
    { path: '/integrations/voice', module: 'integrations' },
    { path: '/integrations', module: 'integrations' },
    // Settings module paths
    { path: '/user-management', module: 'settings' },
    { path: '/role-management', module: 'settings' },
    { path: '/attendance-setting', module: 'settings' },
    { path: '/attendance-templates', module: 'settings' },
    { path: '/weekly-holiday-templates', module: 'settings' },
    { path: '/attendance-geofence', module: 'settings' },
    { path: '/attendance-shifts', module: 'settings' },
    { path: '/attendance-automation-rules', module: 'settings' },
    { path: '/business-setting', module: 'settings' },
    { path: '/business/', module: 'settings' },
    { path: '/payroll-setting', module: 'settings' },
    { path: '/settings/payroll/', module: 'settings' },
    { path: '/salary/', module: 'settings' },
    { path: '/businessinfo-setting', module: 'settings' },
    { path: '/business-info/', module: 'settings' },
    { path: '/others-setting', module: 'settings' },
    { path: '/others/', module: 'settings' },
    { path: '/onboarding-document-requirements', module: 'settings' },
    { path: '/alerts-notifications', module: 'settings' },
    { path: '/channel-partner-id', module: 'settings' },
    { path: '/settings', module: 'settings' },
    // Company Policy module paths
    { path: '/company', module: 'company-policy' },
    // Celebration module paths
    { path: '/admin/celebration', module: 'celebration' },
    // Announcements module paths
    { path: '/announcements', module: 'announcements' },
    { path: '/announcements/', module: 'announcements' },
    // HRMS Geo module paths
    { path: '/hrms-geo/', module: 'hrms-geo' },
    { path: '/hrms-geo', module: 'hrms-geo' },
  ];

  // Check if path requires a specific module (check more specific paths first)
  const requiredModule = pathToModule.find(p => path.startsWith(p.path));

  if (requiredModule) {
    const module = requiredModule.module;

    // Celebration: allow Admin and Employees with celebration permission
    if (module === 'celebration') {
      if (user.role === 'Admin' || user.role === 'Manager') {
        return <>{children}</>;
      }
      // For employees, check sidebarPermissions
      if (user.role === 'Employee' && sidebarPerms.length > 0) {
        const hasCelebrationAccess = sidebarPerms.includes('celebration');
        if (hasCelebrationAccess) {
          return <>{children}</>;
        }
      }
      return <AccessDenied />;
    }

    // LMS: allow Admin, Manager, and Employees with lms permission
    if (module === 'lms') {
      if (user.role === 'Admin' || user.role === 'Manager' || user.role === 'Super Admin') {
        return <>{children}</>;
      }
      // For employees, check sidebarPermissions
      if (user.role === 'Employee' && sidebarPerms.length > 0) {
        const hasLmsAccess = sidebarPerms.includes('lms') || 
                             sidebarPerms.includes('lms_dashboard') ||
                             sidebarPerms.includes('course_library') ||
                             sidebarPerms.includes('learners') ||
                             sidebarPerms.includes('live_session') ||
                             sidebarPerms.includes('assessment') ||
                             sidebarPerms.includes('score_analytics');
        if (hasLmsAccess) {
          return <>{children}</>;
        }
      }
      // Employees have default access to LMS (for their own learning)
      if (user.role === 'Employee') {
        return <>{children}</>;
      }
      return <AccessDenied />;
    }

    // Announcements: allow Admin, Manager, and Employees with announcements permission
    if (module === 'announcements') {
      if (user.role === 'Admin' || user.role === 'Manager') {
        return <>{children}</>;
      }
      // For employees, check sidebarPermissions
      if (user.role === 'Employee' && sidebarPerms.length > 0) {
        const hasAnnouncementsAccess = sidebarPerms.includes('announcements');
        if (hasAnnouncementsAccess) {
          return <>{children}</>;
        }
      }
      return <AccessDenied />;
    }

    // For employees with sidebarPermissions, check those first
    if (user.role === 'Employee' && sidebarPerms.length > 0) {
      const sidebarModuleMap: Record<string, string> = {
        'interview': 'interview',
        'celebration': 'celebration',
        'staff': 'staff',
        'payroll': 'payroll',
        'hrms-geo': 'hrms-geo',
        'performance': 'performance',
        'lms': 'lms',
        'announcements': 'announcements',
        'assets': 'assets',
        'integrations': 'integrations',
        'settings': 'settings',
      };
      
      // Map sub-modules to parent modules
      const subModuleToParentMap: Record<string, string> = {
        // Interview sub-modules
        'job_openings': 'interview',
        'candidates': 'interview',
        'interview_appointments': 'interview',
        'interview_process': 'interview',
        'offer_letter': 'interview',
        'document_collection': 'interview',
        'background_verification': 'interview',
        'refer_candidate': 'interview',
        // Staff sub-modules
        'staff_overview': 'staff',
        'salary_overview': 'staff',
        'salary_structure': 'staff',
        'attendance': 'staff',
        'leaves_approval': 'staff',
        'loans': 'staff',
        'expense_claims': 'staff',
        'payslip_requests': 'staff',
        // Performance sub-modules
        'performance_overview': 'performance',
        'performance_analytics': 'performance',
        'performance_reviews': 'performance',
        'review_cycles': 'performance',
        'manager_review': 'performance',
        'hr_review': 'performance',
        'goals_management': 'performance',
        'kra_kpi': 'performance',
        'pms_reports': 'performance',
        'pms_settings': 'performance',
        // Payroll sub-modules
        'payroll_management': 'payroll',
        // HRMS Geo sub-modules
        'hrms_geo_dashboard': 'hrms-geo',
        'tracking': 'hrms-geo',
        'forms': 'hrms-geo',
        'tasks': 'hrms-geo',
        'customers': 'hrms-geo',
        'geo_settings': 'hrms-geo',
        // LMS sub-modules
        'lms_dashboard': 'lms',
        'course_library': 'lms',
        'learners': 'lms',
        'live_session': 'lms',
        'assessment': 'lms',
        'score_analytics': 'lms',
        // Assets sub-modules
        'assets_type': 'assets',
        'assets': 'assets',
        // Integrations sub-modules
        'all_integrations': 'integrations',
        'exotel': 'integrations',
        'email': 'integrations',
        'google_calendar': 'integrations',
        'sms': 'integrations',
        'rcs': 'integrations',
        'voice': 'integrations',
        // Settings sub-modules
        'user_management': 'settings',
        'attendance_settings': 'settings',
        'business_settings': 'settings',
        'payroll_settings': 'settings',
        'business_info': 'settings',
        'company_policy': 'settings',
        'onboarding_documents': 'settings',
        'others': 'settings',
      };
      
      const hasSidebarAccess = sidebarPerms.some(sp => {
        // Check if it's a sub-module that maps to a parent
        let parentModule = sp;
        if (subModuleToParentMap[sp]) {
          parentModule = subModuleToParentMap[sp];
        }
        
        // Map to backend module
        const mappedModule = sidebarModuleMap[parentModule] || parentModule;
        return mappedModule === module;
      });
      
      if (hasSidebarAccess) {
        return <>{children}</>;
      }
    }

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
    // For employees, always allow access to employee routes
    if (user.role === 'Employee' && path.startsWith('/employee/')) {
      // Allow all employee routes
      return <>{children}</>;
    }
    
    // For employees with sidebarPermissions, check if path matches any sidebar module
    if (user.role === 'Employee' && sidebarPerms.length > 0) {
      // Map sub-modules to parent modules
      const subModuleToParentMap: Record<string, string> = {
        'job_openings': 'interview',
        'candidates': 'interview',
        'interview_appointments': 'interview',
        'interview_process': 'interview',
        'offer_letter': 'interview',
        'document_collection': 'interview',
        'background_verification': 'interview',
        'refer_candidate': 'interview',
        'staff_overview': 'staff',
        'salary_overview': 'staff',
        'salary_structure': 'staff',
        'attendance': 'staff',
        'leaves_approval': 'staff',
        'loans': 'staff',
        'expense_claims': 'staff',
        'payslip_requests': 'staff',
        'performance_overview': 'performance',
        'performance_analytics': 'performance',
        'performance_reviews': 'performance',
        'review_cycles': 'performance',
        'manager_review': 'performance',
        'hr_review': 'performance',
        'goals_management': 'performance',
        'kra_kpi': 'performance',
        'pms_reports': 'performance',
        'pms_settings': 'performance',
        'payroll_management': 'payroll',
        'hrms_geo_dashboard': 'hrms-geo',
        'tracking': 'hrms-geo',
        'forms': 'hrms-geo',
        'tasks': 'hrms-geo',
        'customers': 'hrms-geo',
        'geo_settings': 'hrms-geo',
        'course_library': 'lms',
        'live_session': 'lms',
        'quiz_generator': 'lms',
        'assessment': 'lms',
        'score_analytics': 'lms',
        'assets_type': 'assets',
        'assets': 'assets',
        'all_integrations': 'integrations',
        'exotel': 'integrations',
        'email': 'integrations',
        'google_calendar': 'integrations',
        'sms': 'integrations',
        'rcs': 'integrations',
        'voice': 'integrations',
        'user_management': 'settings',
        'attendance_settings': 'settings',
        'business_settings': 'settings',
        'payroll_settings': 'settings',
        'business_info': 'settings',
        'company_policy': 'settings',
        'onboarding_documents': 'settings',
        'others': 'settings',
      };
      
      const sidebarModuleMap: Record<string, string[]> = {
        'interview': ['/candidates', '/job-openings', '/interview', '/offer-letter', '/onboarding', '/refer-candidate', '/hiring', '/interview-appointments', '/interview/background-verification', '/interview/templates', '/interview/round/', '/interview/round/1', '/interview/round/2', '/interview/round/3', '/interview/round/final', '/interview/selected', '/interview/candidate/progress'],
        'celebration': ['/admin/celebration'],
        'staff': ['/staff', '/staff-profile', '/staff-overview', '/salary-structure', '/staff/attendance', '/staff/leaves-pending-approval', '/staff/loans', '/staff/expense-claims', '/staff/payslip-requests'],
        'payroll': ['/payroll'],
        'hrms-geo': ['/hrms-geo'],
        'performance': ['/performance', '/pms', '/kra'],
        'lms': ['/admin/lms/dashboard', '/admin/lms/course-library', '/admin/lms/learners', '/admin/lms/live-sessions', '/admin/lms/assessment', '/admin/lms/scores-analytics', '/course-library', '/live-session', '/assessment', '/score', '/lms/learners', '/lms/scores-analytics'],
        'announcements': ['/announcements'],
        'assets': ['/assets', '/assets-type'],
        'integrations': ['/integrations', '/integrations/sendpulse', '/integrations/sendgrid', '/integrations/askeva', '/integrations/email', '/integrations/exotel', '/integrations/google-calendar', '/integrations/rcs', '/integrations/sms', '/integrations/voice'],
        'settings': ['/settings', '/user-management', '/role-management', '/attendance-setting', '/attendance-templates', '/weekly-holiday-templates', '/attendance-geofence', '/attendance-shifts', '/attendance-automation-rules', '/business-setting', '/business/', '/payroll-setting', '/settings/payroll/', '/salary/', '/businessinfo-setting', '/business-info/', '/others-setting', '/others/', '/onboarding-document-requirements', '/alerts-notifications', '/channel-partner-id'],
      };
      
      const hasSidebarAccess = sidebarPerms.some(sp => {
        // Check if it's a sub-module that maps to a parent
        let parentModule = sp;
        if (subModuleToParentMap[sp]) {
          parentModule = subModuleToParentMap[sp];
        }
        
        // Check parent module paths
        const allowedPaths = sidebarModuleMap[parentModule] || [];
        if (allowedPaths.some(allowedPath => path.startsWith(allowedPath))) {
          return true;
        }
        
        // Also check direct sub-module paths if available
        const allowedPathsForSub = sidebarModuleMap[sp] || [];
        return allowedPathsForSub.some(allowedPath => path.startsWith(allowedPath));
      });
      if (hasSidebarAccess) {
        return <>{children}</>;
      }
    }
    
    // Default role-based check
    const hasAccess = hasRouteAccess(user.role, path);
    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
};

export default RoleGuard;

