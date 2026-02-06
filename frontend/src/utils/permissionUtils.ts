/**
 * Permission utilities for dynamic sidebar and route access
 */

import { Permission } from "@/store/api/roleApi";

export interface ModulePermission {
  module: string;
  actions: string[];
}

/**
 * Check if user has a specific action on a module
 */
export const hasAction = (
  permissions: ModulePermission[],
  module: string,
  action: string
): boolean => {
  const modulePermission = permissions.find((p) => p.module === module);
  if (!modulePermission) return false;
  return modulePermission.actions.includes(action);
};

/**
 * Check if user can view a module (has read or view action)
 * Also checks for sub-modules (e.g., if checking "interview", also checks "job_openings", "candidates", etc.)
 */
export const canViewModule = (
  permissions: ModulePermission[],
  module: string
): boolean => {
  // Direct check for the module
  if (
    hasAction(permissions, module, "read") ||
    hasAction(permissions, module, "view")
  ) {
    return true;
  }

  // Check for sub-modules if it's a parent module
  const subModuleMap: Record<string, string[]> = {
    'interview': [
      'job_openings',
      'candidates',
      'interview_appointments',
      'interview_process',
      'offer_letter',
      'document_collection',
      'background_verification',
      'refer_candidate'
    ],
    // Add other parent modules if needed
  };

  // If this is a parent module, check if user has permission for any sub-module
  if (subModuleMap[module]) {
    return subModuleMap[module].some(subModule =>
      hasAction(permissions, subModule, "read") ||
      hasAction(permissions, subModule, "view")
    );
  }

  return false;
};

/**
 * Map module names to sidebar menu items
 */
export const getModuleMenuItems = (
  permissions: ModulePermission[],
  role: string
): Array<{ module: string; label: string; path: string; icon?: string }> => {
  // Import getRoleDashboard dynamically to avoid circular dependency
  const { getRoleDashboard } = require("./roleUtils");
  const dashboardPath = getRoleDashboard(role);
  
  const allModules = [
    { module: "dashboard", label: "Dashboard", path: dashboardPath },
    { module: "interview", label: "Interview", path: "/candidates" },
    { module: "staff", label: "Staff", path: "/staff" },
    { module: "performance", label: "Performance", path: "/performance" },
    { module: "payroll", label: "Payroll", path: "/payroll" },
    { module: "lms", label: "LMS", path: "/course-library" },
    { module: "assets", label: "Asset Management", path: "/assets" },
    { module: "integrations", label: "Integrations", path: "/integrations" },
    { module: "settings", label: "Settings", path: "/settings" },
    { module: "company-policy", label: "Company Policy", path: "/company" },
  ];

  // For system roles, use default permissions
  if (role === "Super Admin") {
    return [
      { module: "super-admin-dashboard", label: "Dashboard", path: "/super-admin/dashboard" },
      { module: "manage-companies", label: "Manage Companies", path: "/super-admin/companies" },
      { module: "super-admin-settings", label: "Settings", path: "/super-admin/settings" },
    ];
  }

  if (role === "Candidate") {
    return [
      { module: "candidate-dashboard", label: "Dashboard", path: "/candidate/dashboard" },
      { module: "jobs", label: "Job Openings", path: "/candidate/job-vacancies" },
      { module: "applications", label: "Application Status", path: "/candidate/applications" },
      { module: "candidate-profile", label: "Profile", path: "/candidate/profile" },
    ];
  }

  // For custom roles or system roles with permissions, filter by permissions
  return allModules.filter((item) => canViewModule(permissions, item.module));
};

/**
 * Get user permissions from role
 */
export const getUserPermissions = (
  role: string,
  roleId?: { permissions: Permission[] } | null,
  userPermissionsArr?: string[] | ModulePermission[],
  sidebarPermissions?: string[]
): ModulePermission[] => {
  // Priority 0: Admin always has full access
  if (role === 'Admin' || role === 'admin') {
    return [
      { module: 'dashboard', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'interview', actions: ['view', 'read', 'create', 'update', 'delete'] },
      // Granular Interview Modules
      { module: 'job_openings', actions: ['view', 'read', 'create', 'update', 'delete', 'add', 'edit'] },
      { module: 'candidates', actions: ['view', 'read', 'create', 'update', 'delete', 'add', 'start_interview', 'view_profile', 'convert_to_staff', 'view_offer'] },
      { module: 'interview_appointments', actions: ['view', 'read', 'create', 'update', 'delete', 'schedule', 'edit'] },
      { module: 'interview_process', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'offer_letter', actions: ['view', 'read', 'create', 'update', 'delete', 'template', 'generate', 'add_dummy'] },
      { module: 'document_collection', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'background_verification', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'refer_candidate', actions: ['view', 'read', 'create', 'update', 'delete'] },

      { module: 'staff', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'performance', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'payroll', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'lms', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'assets', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'company-policy', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'integrations', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'settings', actions: ['view', 'read', 'create', 'update', 'delete'] },
      { module: 'hrms-geo', actions: ['view', 'read', 'create', 'update', 'delete'] },
    ];
  }

  // For Employee role: Check sidebarPermissions first and add them as permissions
  if (role === 'Employee' && sidebarPermissions && Array.isArray(sidebarPermissions) && sidebarPermissions.length > 0) {
    const sidebarPerms: ModulePermission[] = [];
    
    // Map sidebar modules to permission modules
    const sidebarModuleMap: Record<string, string> = {
      'interview': 'interview',
      'staff': 'staff',
      'payroll': 'payroll',
      'hrms-geo': 'hrms-geo',
      'performance': 'performance',
      'lms': 'lms',
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
      'course_library': 'lms',
      'live_session': 'lms',
      'quiz_generator': 'lms',
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
    
    sidebarPermissions.forEach((sidebarModule) => {
      // Check if it's a sub-module that maps to a parent
      let parentModule = sidebarModule;
      if (subModuleToParentMap[sidebarModule]) {
        parentModule = subModuleToParentMap[sidebarModule];
      }
      
      // Map to backend module
      const module = sidebarModuleMap[parentModule] || parentModule;
      
      // Employees with sidebar permissions get read/view access
      sidebarPerms.push({
        module,
        actions: ['read', 'view', 'export']
      });
      
      // Add sub-modules for interview
      if (sidebarModule === 'interview' || parentModule === 'interview') {
        sidebarPerms.push(
          { module: 'candidates', actions: ['read', 'view'] },
          { module: 'job_openings', actions: ['read', 'view'] },
          { module: 'interview_appointments', actions: ['read', 'view'] },
          { module: 'interview_process', actions: ['read', 'view'] },
          { module: 'offer_letter', actions: ['read', 'view'] },
          { module: 'document_collection', actions: ['read', 'view'] },
          { module: 'background_verification', actions: ['read', 'view'] },
          { module: 'refer_candidate', actions: ['read', 'view'] }
        );
      }
    });
    
    // Merge with user-specific permissions if they exist
    if (userPermissionsArr && userPermissionsArr.length > 0) {
      const firstPerm = userPermissionsArr[0] as any;
      if (typeof firstPerm === 'object' && firstPerm !== null && firstPerm.module && Array.isArray(firstPerm.actions)) {
        // Already formatted - merge with sidebar permissions
        const existingPerms = userPermissionsArr as ModulePermission[];
        existingPerms.forEach(perm => {
          const existing = sidebarPerms.find(p => p.module === perm.module);
          if (existing) {
            // Merge actions
            perm.actions.forEach(action => {
              if (!existing.actions.includes(action)) {
                existing.actions.push(action);
              }
            });
          } else {
            sidebarPerms.push(perm);
          }
        });
      }
    }
    
    return sidebarPerms;
  }

  // Priority 1: User-specific permissions (can be string array or formatted permissions)
  if (userPermissionsArr && userPermissionsArr.length > 0) {
    // Check if permissions are already in module/actions format
    const firstPerm = userPermissionsArr[0] as any;
    if (typeof firstPerm === 'object' && firstPerm !== null && firstPerm.module && Array.isArray(firstPerm.actions)) {
      // Already in formatted format, return as-is (highest priority - user's direct permissions)
      return userPermissionsArr as ModulePermission[];
    }
    
    // Otherwise, treat as string array and parse
    const stringPermissions = userPermissionsArr as string[];
    if (stringPermissions.includes('full_hrms_access')) {
      return [
        { module: 'dashboard', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'interview', actions: ['view', 'read', 'create', 'update', 'delete'] },
        // Granular Interview Modules
        { module: 'job_openings', actions: ['view', 'read', 'create', 'update', 'delete', 'add', 'edit'] },
        { module: 'candidates', actions: ['view', 'read', 'create', 'update', 'delete', 'add', 'start_interview', 'view_profile', 'convert_to_staff', 'view_offer'] },
        { module: 'interview_appointments', actions: ['view', 'read', 'create', 'update', 'delete', 'schedule', 'edit'] },
        { module: 'interview_process', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'offer_letter', actions: ['view', 'read', 'create', 'update', 'delete', 'template', 'generate', 'add_dummy'] },
        { module: 'document_collection', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'background_verification', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'refer_candidate', actions: ['view', 'read', 'create', 'update', 'delete'] },

        { module: 'staff', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'performance', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'payroll', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'lms', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'assets', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'company-policy', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'integrations', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'settings', actions: ['view', 'read', 'create', 'update', 'delete'] },
        { module: 'hrms-geo', actions: ['view', 'read', 'create', 'update', 'delete'] },
      ];
    }

    // Parse specific permissions from string array
    const permissions: ModulePermission[] = [];
    const moduleMap: Record<string, string> = {
      'job_openings': 'job_openings',
      'candidates': 'candidates',
      'interview_appointments': 'interview_appointments',
      'interview_process': 'interview_process',
      'offer_letter': 'offer_letter',
      'document_collection': 'document_collection',
      'background_verification': 'background_verification',
      'refer_candidate': 'refer_candidate',
      'asset_management': 'assets', // Map asset_management_view to assets module
      'company_policy': 'company-policy',
      // Legacy / Shared
      'interview': 'interview',
      'payroll': 'payroll',
      'employees': 'staff',
      'staff': 'staff',
      'policies': 'company-policy',
      'company_policies': 'company-policy',
      'company-policy': 'company-policy',
      'dashboard': 'dashboard',
      'performance': 'performance',
      'assets': 'assets',
      'lms': 'lms',
      'integrations': 'integrations',
      'settings': 'settings',
      'hrms-geo': 'hrms-geo',
      'hrms_geo': 'hrms-geo',
      'requisition': 'requisition',
      'jobs': 'jobs', // Keeping for backward compat if needed
      'jobs_timeline': 'jobs_timeline',
      'all_candidates': 'all_candidates',
      'all_cvs': 'cvs',
      'cvs': 'cvs',
      'interview_candidates': 'interview_candidates',
      'assigned_interviews': 'assigned_interviews',
      'staged_candidates': 'staged_candidates',
      'completed_candidates': 'completed_candidates',
      'approvals': 'approvals',
      'notifications': 'notifications',
    };

    stringPermissions.forEach(perm => {
      // Handle explicit complex keys first
      if (perm === 'candidate_action_start_interview') {
        permissions.push({ module: 'candidates', actions: ['start_interview'] });
        return;
      }
      if (perm === 'candidate_action_view_profile') {
        permissions.push({ module: 'candidates', actions: ['view_profile'] });
        return;
      }
      if (perm === 'candidate_action_convert_to_staff') {
        permissions.push({ module: 'candidates', actions: ['convert_to_staff'] });
        return;
      }
      if (perm === 'candidate_action_view_offer') {
        permissions.push({ module: 'candidates', actions: ['view_offer'] });
        return;
      }
      if (perm === 'offer_letter_add_dummy') {
        permissions.push({ module: 'offer_letter', actions: ['add_dummy'] });
        return;
      }

      let moduleName = '';
      let action = 'view'; // Default action

      // PRIORITY 1: Try dot format: module.action (e.g., job_openings.view, candidates.read)
      // This is the format used when saving permissions from the frontend
      if (perm.includes('.')) {
        const [possibleModule, possibleAction] = perm.split('.');
        
        // Check if the module exists in moduleMap
        if (moduleMap[possibleModule]) {
          moduleName = moduleMap[possibleModule];
          // Validate action
          const allowedActions = [
            'view', 'read', 'create', 'update', 'delete', 'approve', 'reject',
            'add', 'edit', 'schedule', 'generate', 'template', 'start_interview',
            'view_profile', 'convert_to_staff', 'view_offer', 'add_dummy', 'publish',
            'assign', 'cancel', 'complete', 'submit', 'activate', 'deactivate',
            'close', 'export', 'import', 'manage', 'configure', 'review', 'rate',
            'process', 'verify'
          ];
          if (allowedActions.includes(possibleAction)) {
            action = possibleAction;
          } else {
            // If action is not in allowed list, default to 'view'
            action = 'view';
          }
        }
      }

      // PRIORITY 2: Try underscore format: module_action (e.g., dashboard_view, payroll_create)
      // This is for backward compatibility
      if (!moduleName && perm.includes('_')) {
        const parts = perm.split('_');
        if (parts.length >= 2) {
          const possibleAction = parts[parts.length - 1];
          const possibleModule = parts.slice(0, parts.length - 1).join('_');

          if (moduleMap[possibleModule]) {
            moduleName = moduleMap[possibleModule];
            // Map common actions or keep as is
            // Expanded allowed actions for granular permissions
            const allowedActions = [
              'view', 'read', 'create', 'update', 'delete', 'approve', 'reject',
              'add', 'edit', 'schedule', 'generate', 'template'
            ];
            if (allowedActions.includes(possibleAction)) {
              action = possibleAction;
            }
          }
        }
      }

      // 2. Fallback to legacy fuzzy matching if not found
      if (!moduleName) {
        if (perm.includes('policies')) moduleName = 'company-policy';
        else if (perm.includes('employees')) moduleName = 'staff';
        else if (perm.includes('payroll')) moduleName = 'payroll';
        else if (perm.includes('dashboard')) moduleName = 'dashboard';
        else if (perm.includes('performance')) moduleName = 'performance';
        else if (perm.includes('assets')) moduleName = 'assets';
        else if (perm.includes('lms')) moduleName = 'lms';
        else if (perm.includes('settings')) moduleName = 'settings';
        else if (perm.includes('interview')) moduleName = 'interview';
        else if (perm.includes('hrms-geo') || perm.includes('hrms_geo')) moduleName = 'hrms-geo';
      }

      if (moduleName) {
        // Check if already added
        const existing = permissions.find(p => p.module === moduleName);
        if (existing) {
          if (!existing.actions.includes(action)) existing.actions.push(action);
        } else {
          permissions.push({ module: moduleName, actions: [action] });
        }
      }
    });

    return permissions;
  }

  // If user has a custom role, use its permissions
  if (roleId && roleId.permissions) {
    return roleId.permissions.map((p) => ({
      module: p.module,
      actions: p.actions,
    }));
  }

  // Otherwise, return empty array (will use default role permissions)
  return [];
};

