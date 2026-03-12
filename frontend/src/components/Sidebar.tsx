import { useState, useMemo, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { hasModuleAccess, getPermittedModules, getRoleDashboard } from "@/utils/roleUtils";
import { canViewModule, getUserPermissions } from "@/utils/permissionUtils";
import { useGetKRAStatsQuery } from "@/store/api/kraApi";
import { useGetBusinessQuery } from "@/store/api/settingsApi";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  TrendingUp,
  FileText,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CalendarCog,
  Building2,
  BadgeDollarSign,
  CreditCard,
  Wrench,
  Settings,
  FilePlus,
  UserRoundPlus,
  FileBadge,
  Briefcase,
  UserPlus,
  CalendarCheck,
  ClipboardList as CheckList,
  Notebook,
  Target,
  BarChart3,
  LineChart,
  ShieldCheck,
  CalendarDays,
  Receipt,
  Wallet,
  UploadCloud,
  Library,
  Wand2,
  ListChecks,
  BarChart2,
  ListVideo,
  Plug2,
  UserCircle,
  Award,
  CheckCircle2,
  FileCheck,
  TrendingDown,
  Banknote,
  Home,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  PhoneCall,
  Shield,
  Building,
  Download,
  MapPin,
  Navigation,
  FileText as FileTextIcon,
  ClipboardCheck,
  UserCircle2,
  ShoppingCart,
  HelpCircle,
  Map,
  Activity,
  BarChart,
  List,
  PlayCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Video,
  FileQuestion,
  Bell,
  Megaphone,
  Cake,
} from "lucide-react";

import { Sheet, SheetContent } from "./ui/sheet";

// Rupee Icon Component
const RupeeIcon = ({ className, size, ...props }: { className?: string; size?: number | string; [key: string]: any }) => {
  // Convert size prop to inline style (lucide-react icons use size prop)
  const sizeValue = typeof size === 'number' ? `${size}px` : size || '16px';
  return (
    <span 
      className={`${className || ''} font-semibold inline-flex items-center justify-center`} 
      style={{ width: sizeValue, height: sizeValue, fontSize: sizeValue }}
      {...props}
    >
      ₹
    </span>
  );
};

const Sidebar = ({
  mobileOpen = false,
  collapsed = false,
  onClose = () => { },
  onCollapse = () => { },
}: {
  mobileOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onCollapse?: (collapsed: boolean) => void;
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const location = useLocation();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // Check if user is Super Admin
  const isSuperAdmin = useMemo(() => {
    if (!currentUser || !currentUser.role) {
      return false;
    }
    const role = String(currentUser.role).trim();
    return role === "Super Admin";
  }, [currentUser]);
  
  // Fetch business data for company logo
  const { data: businessData } = useGetBusinessQuery(undefined, {
    skip: isSuperAdmin, // Skip for Super Admin as they don't have a company
  });
  
  // Fetch KRA statistics for dynamic badge
  const { data: kraStats } = useGetKRAStatsQuery(undefined, {
    skip: !currentUser, // Skip if no user
    pollingInterval: 60000, // Poll every 60 seconds for updates (increased for better performance)
  });
  
  const kraPriorityCount = kraStats?.data?.priorityCount || 0;
  const companyLogo = businessData?.data?.business?.logo;

  // Check if user has access to User Management
  // Allow access for Super Admin and Admin roles
  const canAccessUserManagement = useMemo(() => {
    if (!currentUser || !currentUser.role) {
      return false;
    }
    const role = String(currentUser.role).trim();
    return role === "Super Admin" || role === "Admin";
  }, [currentUser]);

  const userRole = useMemo(() => {
    if (!currentUser || !currentUser.role) return null;
    return String(currentUser.role).trim();
  }, [currentUser]);

  // Get user permissions from roleId
  const userPermissions = useMemo(() => {
    if (!currentUser) return [];
    const roleId = typeof currentUser.roleId === 'object' ? currentUser.roleId : null;
    const permissions = getUserPermissions(currentUser.role, roleId as any, currentUser.permissions || []);

    // Debug logging to help troubleshoot
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('[Sidebar] User permissions:', {
    //     role: currentUser.role,
    //     hasRoleId: !!roleId,
    //     hasDirectPermissions: !!(currentUser.permissions && currentUser.permissions.length > 0),
    //     permissionsCount: permissions.length,
    //     permissions: permissions
    //   });
    // }

    return permissions;
  }, [currentUser]);

  const mainMenus = useMemo(() => {
    if (!userRole) return [];

    // Super Admin menu - completely isolated
    if (isSuperAdmin) {
      return [
        {
          icon: LayoutDashboard,
          label: "Dashboard",
          path: "/super-admin/dashboard",
        },
        {
          icon: Building,
          label: "Manage Companies",
          path: "/super-admin/companies",
        },
        {
          icon: Shield,
          label: "Settings",
          key: "super-admin-settings",
          path: "/super-admin/settings"
        },
        {
          icon: Bell,
          label: "Notifications",
          path: "/notifications",
        },
      ];
    }

    // Candidate menu - use CandidateSidebar (handled in MainLayout)
    if (userRole === "Candidate") {
      return [];
    }

    // Role-based menu filtering with dynamic permissions
    // NOW STRICT PERMISSION BASED
    // Get role-based dashboard path
    const dashboardPath = getRoleDashboard(userRole);

    const allMenus = [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        path: dashboardPath,
        module: "dashboard",
      },
      {
        icon: ClipboardList,
        label: "Interview",
        key: "interview",
        module: "interview",
      },
      { icon: Users, label: "Staff", key: "staff", module: "staff" },
      { icon: RupeeIcon, label: "Payroll", path: "/payroll/management", module: "payroll" },
      {
        icon: MapPin,
        label: "HRMS Geo",
        key: "hrms-geo",
        module: "hrms-geo",
      },
      {
        icon: TrendingUp,
        label: "Performance",
        key: "performance",
        module: "performance",
      },
      { icon: FileText, label: "LMS", key: "lms", module: "lms" },
      {
        icon: Cake,
        label: "Celebration",
        path: "/admin/celebration",
        module: "celebration",
      },
      {
        icon: Megaphone,
        label: "Announcements",
        path: "/announcements",
        module: "announcements",
      },
      {
        icon: AlertCircle,
        label: "Grievance",
        key: "grievance",
        module: "grievance",
      },
      {
        icon: SettingsIcon,
        label: "Asset Management",
        key: "assets",
        module: "assets",
      },
      {
        icon: Plug2,
        label: "Integrations",
        key: "integrations",
        module: "integrations",
      },
      {
        icon: SettingsIcon,
        label: "Settings",
        key: "settings",
        module: "settings",
      },
      {
        icon: Bell,
        label: "Notifications",
        path: "/notifications",
        module: "notifications",
      },
    ];

    // Filter menus based on permissions
    const filteredMenus = allMenus.filter((menu) => {
      // For dashboard, always show (everyone needs access to dashboard)
      if (menu.module === "dashboard") {
        return true;
      }

      // For notifications, always show for all authenticated users
      if (menu.module === "notifications") {
        return true;
      }

      // For HRMS Geo, always show for Admin and Manager roles
      if (menu.module === "hrms-geo" && (userRole === "Admin" || userRole === "Manager")) {
        return true;
      }

      // For Announcements, always show for Admin and Manager roles
      if (menu.module === "announcements" && (userRole === "Admin" || userRole === "Manager")) {
        return true;
      }

      // For Grievance, always show for Admin and Manager roles
      if (menu.module === "grievance" && (userRole === "Admin" || userRole === "Manager" || userRole === "HR" || userRole === "Senior HR")) {
        return true;
      }

      // Strict permission check
      // User must have explicit permission for the module or its sub-modules
      const hasAccess = canViewModule(userPermissions, menu.module);

      // Debug logging in development
      // if (process.env.NODE_ENV === 'development') {
      //   console.log(`[Sidebar] Checking access for ${menu.module}:`, hasAccess, 'Permissions:', userPermissions);
      // }

      return hasAccess;
    });

    // Ensure Notifications is always at the end
    const notificationsMenu = filteredMenus.find(m => m.module === 'notifications');
    const otherMenus = filteredMenus.filter(m => m.module !== 'notifications');
    
    // Sort other menus to maintain order, then append notifications at the end
    const sortedMenus = [...otherMenus];
    if (notificationsMenu) {
      sortedMenus.push(notificationsMenu);
    }

    // Debug logging in development
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('[Sidebar] Menu filtering:', {
    //     totalMenus: allMenus.length,
    //     filteredCount: sortedMenus.length,
    //     filteredModules: sortedMenus.map(m => m.module),
    //     userPermissionsCount: userPermissions.length,
    //     userPermissions: userPermissions
    //   });
    // }

    return sortedMenus;
  }, [isSuperAdmin, userRole, userPermissions]);

  const subMenus = useMemo(() => {
    if (!userRole) return {};

    // Super Admin settings submenu
    const superAdminSettings = [
      {
        icon: Settings,
        label: "General",
        path: "/super-admin/settings?tab=general",
      },
      {
        icon: FileText,
        label: "Subscriptions",
        path: "/super-admin/settings?tab=subscriptions",
      },
      {
        icon: Settings,
        label: "Subscription Config",
        path: "/super-admin/settings?tab=subscription",
      },
      {
        icon: ShieldCheck,
        label: "Security",
        path: "/super-admin/settings?tab=security",
      },
      {
        icon: CreditCard,
        label: "Billing",
        path: "/super-admin/settings?tab=billing",
      },
      {
        icon: FileText,
        label: "Audit Logs",
        path: "/super-admin/settings?tab=audit",
      },
    ];

    // Admin-only settings
    const adminSettings = [
      ...(canAccessUserManagement
        ? [
          {
            icon: UserRoundPlus,
            label: "User Management",
            path: "/user-management",
          },
        ]
        : []),
      {
        icon: CalendarCog,
        label: "Attendance Settings",
        path: "/attendance-setting",
      },
      {
        icon: Building2,
        label: "Business Settings",
        path: "/business-setting",
      },
      // {
      //   icon: BadgeDollarSign,
      //   label: "Salary Settings",
      //   path: "/salary-setting",
      // },
      {
        icon: Receipt,
        label: "Payroll Settings",
        path: "/payroll-setting",
      },
      { icon: FileText, label: "Business Info", path: "/businessinfo-setting" },
      { icon: FilePlus, label: "Company Policy", path: "/company" },
      { icon: FileCheck, label: "Onboarding Documents", path: "/onboarding-document-requirements" },
      { icon: Wrench, label: "Others", path: "/others-setting" },
    ];

    // Manager settings (limited)
    const managerSettings = [
      {
        icon: CalendarCog,
        label: "Attendance Settings",
        path: "/attendance-setting",
      },
    ];

    // Base settings based on role
    const baseSettings =
      userRole === "Admin"
        ? adminSettings
        : userRole === "Manager"
          ? managerSettings
          : [];

    return {
      interview: [
        { icon: Briefcase, label: "Job Openings", path: "/job-openings", module: "job_openings" },
        { icon: UserPlus, label: "Candidates", path: "/candidates", module: "candidates" },
        {
          icon: CalendarCheck,
          label: "Interview Appointments",
          path: "/interview-appointments",
          module: "interview_appointments"
        },
        {
          icon: FilePlus,
          label: "Interview Process",
          key: "interview-process",
          module: "interview_process",
          subItems: [
            {
              icon: FileText,
              label: "Interview Flows",
              path: "/interview/templates",
            },
            {
              icon: UserCircle,
              label: "Round 1 (First Round)",
              path: "/interview/round/1",
            },
            {
              icon: UserCircle,
              label: "Round 2 (Second Round)",
              path: "/interview/round/2",
            },
            {
              icon: UserCircle,
              label: "Round 3 (Optional)",
              path: "/interview/round/3",
            },
            {
              icon: UserCircle,
              label: "Final Round",
              path: "/interview/round/final",
            },
            {
              icon: Award,
              label: "Selected / Rejected",
              path: "/interview/selected",
            },
            {
              icon: BarChart2,
              label: "Interview Progress",
              path: "/interview/candidate/progress",
            },
          ],
        },
        {
          icon: FileBadge,
          label: "Offer Letter",
          path: "/offer-letter",
          module: "offer_letter"
        },
        { icon: CheckList, label: "Document Collection", path: "/onboarding", module: "document_collection" },
        { icon: FileCheck, label: "Background Verification", path: "/interview/background-verification", module: "background_verification" },
        {
          icon: UserRoundPlus,
          label: "Refer a Candidate",
          path: "/refer-candidate",
          module: "refer_candidate"
        },
      ],
      staff: [
        { icon: Users, label: "Staff Overview", path: "/staff" },
        { icon: Banknote, label: "Salary Overview", path: "/staff-overview" },
        {
          icon: FileText,
          label: "Salary Structure",
          path: "/salary-structure",
        },
        {
          icon: CalendarCheck,
          label: "Attendance",
          path: "/staff/attendance",
        },
        {
          icon: Activity,
          label: "Attendance Monitoring",
          path: "/staff/attendance-monitoring",
          module: "attendance_monitoring",
        },
        {
          icon: Calendar,
          label: "Leaves Pending Approval",
          path: "/staff/leaves-pending-approval",
        },
        {
          icon: Wallet,
          label: "Loans",
          path: "/staff/loans",
        },
        {
          icon: Receipt,
          label: "Expense Claims",
          path: "/staff/expense-claims",
        },
        {
          icon: Download,
          label: "Payslip Requests",
          path: "/staff/payslip-requests",
        },
      ],
      performance: [
        { icon: TrendingUp, label: "Performance Overview", path: "/performance" },
        { icon: BarChart3, label: "Performance Analytics", path: "/performance/analytics" },
        { icon: FileText, label: "Performance Reviews", path: "/performance/reviews" },
        { icon: Calendar, label: "Review Cycles", path: "/performance/cycles" },

        { icon: Users, label: "Manager Review", path: "/pms/manager-review" },
        { icon: ShieldCheck, label: "HR Review", path: "/pms/hr-review" },
        { icon: Target, label: "Goals Management", path: "/pms/goals" },
        { icon: Target, label: "My Goals", path: "/pms/my-goals" },
        { icon: BarChart3, label: "Goal Progress", path: "/pms/goal-progress" },
        {
          icon: CheckCircle2,
          label: "Goal Approval",
          path: "/pms/goal-approval",
        },
       
        { icon: Award, label: "KRA / KPI", path: "/kra" },
        { icon: Notebook, label: "PMS Reports", path: "/pms/reports" },
        { icon: Target, label: "PMS Settings", path: "/pms/settings" },
        // { icon: FileCheck, label: "Compliance", path: "/compliance" },
        // { icon: FileText, label: "SOP", path: "/sop" },
      ],
      payroll: [
        // { icon: Home, label: "Payroll Hub", path: "/payroll" },
        {
          icon: Receipt,
          label: "Payroll Management",
          path: "/payroll/management",
        },
      ],
      "hrms-geo": [
        { icon: LayoutDashboard, label: "Dashboard", path: "/hrms-geo/dashboard", key: "hrms-geo-dashboard" },
        { icon: Navigation, label: "Tracking", path: "/hrms-geo/tracking/live", key: "tracking" },
        { icon: FileTextIcon, label: "Forms", path: "/hrms-geo/forms/responses", key: "forms" },
        { icon: ClipboardCheck, label: "Tasks", path: "/hrms-geo/tasks/dashboard", key: "tasks" },
        { icon: UserCircle2, label: "Customers", path: "/hrms-geo/customers/dashboard", key: "customers" },
        // { icon: HelpCircle, label: "Help", path: "/hrms-geo/help/outage" }, // Hidden
        { icon: Settings, label: "Geo Settings", path: "/hrms-geo/settings", key: "geo-settings" },
      ],
      "super-admin-settings": superAdminSettings,
      settings: baseSettings,
      assets: [
        { icon: CalendarDays, label: "Assets Type", path: "/assets-type" },
        { icon: Receipt, label: "Assets", path: "/assets" },
      ],
      grievance: [
        { icon: AlertCircle, label: "All Grievances", path: "/grievances", module: "grievance" },
        { icon: BarChart3, label: "Analytics", path: "/grievances/analytics", module: "grievance" },
        { icon: Settings, label: "Settings", path: "/grievances/settings", module: "grievance" },
      ],
      lms: [
        { icon: Library, label: "Course Library", path: "/admin/lms/course-library" },
        { icon: Users, label: "Learners", path: "/admin/lms/learners" },
        { icon: ListVideo, label: "Live Sessions", path: "/admin/lms/live-sessions" },
        { icon: ListChecks, label: "Assessment Management", path: "/admin/lms/assessment" },
        { icon: BarChart3, label: "Scores & Analytics", path: "/admin/lms/scores-analytics" },
      ],
      integrations: [
        { icon: Plug2, label: "All Integrations", path: "/integrations" },
        { icon: PhoneCall, label: "Exotel", path: "/integrations/exotel" },
        { icon: Mail, label: "Email", path: "/integrations/email" },
        {
          icon: Calendar,
          label: "Google Calendar",
          path: "/integrations/google-calendar",
        },
        { icon: MessageSquare, label: "SMS", path: "/integrations/sms" },
        { icon: MessageSquare, label: "RCS", path: "/integrations/rcs" },
        { icon: Phone, label: "Voice", path: "/integrations/voice" },
      ],
    };
  }, [canAccessUserManagement, userRole]);

  const getMenuKeyFromPath = () => {
    // Check Super Admin settings first
    if (isSuperAdmin && location.pathname.startsWith("/super-admin/settings")) {
      return { mainKey: "super-admin-settings", subKey: null };
    }

    const pathWithoutQuery = location.pathname.split("?")[0];
    
    // Get dashboard path to exclude it from submenu matching
    const dashboardPath = getRoleDashboard(userRole || "");
    const dashboardPathBase = dashboardPath.split("?")[0];
    
    // If we're on the dashboard path, don't match any submenus
    if (pathWithoutQuery === dashboardPathBase || pathWithoutQuery === "/") {
      return { mainKey: null, subKey: null };
    }
    
    const matches: Array<{ mainKey: string; subKey: string | null; isExact: boolean; pathLength: number }> = [];

    // Collect all matches with their path lengths and exact match status
    for (const key in subMenus) {
      const menuItems = subMenus[key];
      
      for (const sub of menuItems) {
        // Check nested subItems first (more specific)
        if (sub.subItems) {
          for (const subItem of sub.subItems) {
            if (subItem.path) {
              const subItemPath = subItem.path.split("?")[0];
              // Skip if this matches dashboard path
              if (subItemPath === dashboardPathBase || subItemPath === "/") continue;
              // Exact match gets highest priority
              if (pathWithoutQuery === subItemPath) {
                matches.push({ mainKey: key, subKey: sub.key || null, isExact: true, pathLength: subItemPath.length });
              } else if (pathWithoutQuery.startsWith(subItemPath + "/")) {
                matches.push({ mainKey: key, subKey: sub.key || null, isExact: false, pathLength: subItemPath.length });
              }
            }
          }
        }
        
        // Then check main submenu path
        if (sub.path) {
          const subPath = sub.path.split("?")[0];
          // Skip if this matches dashboard path
          if (subPath === dashboardPathBase || subPath === "/") continue;
          
          // For HRMS Geo modules, check if current path starts with the base module path
          // e.g., /hrms-geo/tracking/live -> base is /hrms-geo/tracking
          // This allows matching /hrms-geo/tracking/dashboard, /hrms-geo/tracking/timeline, etc.
          if (subPath.startsWith("/hrms-geo/")) {
            const pathSegments = subPath.split("/").filter(Boolean);
            if (pathSegments.length >= 3) {
              const baseModulePath = "/" + pathSegments.slice(0, 2).join("/");
              
              // Normalize paths for comparison (remove trailing slashes)
              const normalizedCurrentPath = pathWithoutQuery.replace(/\/$/, "");
              const normalizedSubPath = subPath.replace(/\/$/, "");
              const normalizedBasePath = baseModulePath.replace(/\/$/, "");
              
              // Exact match gets higher priority
              if (normalizedCurrentPath === normalizedSubPath) {
                matches.push({ mainKey: key, subKey: sub.key || null, isExact: true, pathLength: subPath.length });
              } 
              // Check if current path is within the base module (e.g., /hrms-geo/tracking/*)
              // This matches any route that starts with the base module path
              else if (normalizedCurrentPath.startsWith(normalizedBasePath + "/") || normalizedCurrentPath === normalizedBasePath) {
                matches.push({ mainKey: key, subKey: sub.key || null, isExact: false, pathLength: normalizedBasePath.length });
              }
            }
          } else {
            // For other modules, use exact path matching
            // Exact match gets higher priority
            if (pathWithoutQuery === subPath) {
              matches.push({ mainKey: key, subKey: sub.key || null, isExact: true, pathLength: subPath.length });
            } else if (pathWithoutQuery.startsWith(subPath + "/")) {
              matches.push({ mainKey: key, subKey: sub.key || null, isExact: false, pathLength: subPath.length });
            }
          }
        }
      }
    }
    
    // Return the most specific match
    // Priority: 1) Exact matches, 2) Longest path length
    if (matches.length > 0) {
      // First, filter out less specific matches if a more specific one exists
      // This prevents /staff from matching when on /staff/attendance
      const filteredMatches = matches.filter((match) => {
        // Get the actual path for this match
        const matchMenuItems = subMenus[match.mainKey] || [];
        const matchSubItem = matchMenuItems.find((sub: any) => sub.key === match.subKey);
        const matchPath = (matchSubItem?.path?.split("?")[0] || "").replace(/\/$/, "");
        
        // Check if there's a more specific match (longer path) that the current path starts with
        const hasMoreSpecific = matches.some((otherMatch) => {
          if (otherMatch.mainKey === match.mainKey && otherMatch.subKey !== match.subKey) {
            const otherMenuItems = subMenus[otherMatch.mainKey] || [];
            const otherSubItem = otherMenuItems.find((sub: any) => sub.key === otherMatch.subKey);
            const otherPath = (otherSubItem?.path?.split("?")[0] || "").replace(/\/$/, "");
            
            // If the other path is longer and the current path starts with it, it's more specific
            if (otherPath.length > matchPath.length && pathWithoutQuery.startsWith(otherPath)) {
              return true;
            }
            // Also check if the other path is a child of the match path and the current path matches the other path
            if (otherPath.startsWith(matchPath + "/") && pathWithoutQuery.startsWith(otherPath)) {
              return true;
            }
          }
          return false;
        });
        
        // Keep this match only if there's no more specific one
        return !hasMoreSpecific;
      });
      
      // Sort: exact matches first, then by path length (descending)
      filteredMatches.sort((a, b) => {
        // Exact matches first
        if (a.isExact && !b.isExact) return -1;
        if (!a.isExact && b.isExact) return 1;
        // Then by path length (descending) - longer paths are more specific
        return b.pathLength - a.pathLength;
      });
      
      return { mainKey: filteredMatches[0].mainKey, subKey: filteredMatches[0].subKey };
    }
    
    return { mainKey: null, subKey: null };
  };

  // Auto-open/close based on route
  useEffect(() => {
    const pathWithoutQuery = location.pathname.split("?")[0];
    
    // Special handling for HRMS Geo routes - check first before getMenuKeyFromPath
    // This ensures HRMS Geo menu is always expanded when on any HRMS Geo route
    if (pathWithoutQuery.startsWith("/hrms-geo/")) {
      // Always set the parent menu to hrms-geo when on any HRMS Geo route
      setActiveMenu("hrms-geo");
      
      const pathSegments = pathWithoutQuery.split("/").filter(Boolean);
      if (pathSegments.length >= 2 && subMenus["hrms-geo"]) {
        // Find the matching submenu item
        const hrmsGeoSubmenus = subMenus["hrms-geo"] || [];
        let bestMatch: { key: string; priority: number } | null = null;
        const normalizedCurrentPath = pathWithoutQuery.replace(/\/$/, "");
        
        for (const sub of hrmsGeoSubmenus) {
          if (sub.path && sub.key) {
            const subPath = sub.path.split("?")[0];
            if (subPath.startsWith("/hrms-geo/")) {
              const subPathSegments = subPath.split("/").filter(Boolean);
              const normalizedSubPath = subPath.replace(/\/$/, "");
              
              // Priority 1: Exact path match (highest priority)
              if (normalizedCurrentPath === normalizedSubPath) {
                setActiveSubMenu(sub.key);
                return; // Exact match found, return immediately
              }
              
              // Priority 2: Check base module path for 3+ segment paths
              if (subPathSegments.length >= 3) {
                // Extract base module path (e.g., /hrms-geo/tracking from /hrms-geo/tracking/live)
                const subBaseModulePath = "/" + subPathSegments.slice(0, 2).join("/");
                const normalizedBasePath = subBaseModulePath.replace(/\/$/, "");
                
                // Also check current path's base module path
                const currentPathSegments = normalizedCurrentPath.split("/").filter(Boolean);
                const currentBaseModulePath = currentPathSegments.length >= 3 
                  ? "/" + currentPathSegments.slice(0, 2).join("/")
                  : normalizedCurrentPath;
                
                // Check if current path is within this submenu's base module
                // This matches routes like /hrms-geo/tracking/* to the Tracking submenu
                // Match if:
                // 1. Current path equals the base module path
                // 2. Current path starts with base module path + "/"
                // 3. Current path's base module matches the submenu's base module
                if (normalizedCurrentPath === normalizedBasePath || 
                    normalizedCurrentPath.startsWith(normalizedBasePath + "/") ||
                    currentBaseModulePath === normalizedBasePath) {
                  // Store as potential match (priority 2)
                  if (!bestMatch || bestMatch.priority > 2) {
                    bestMatch = { key: sub.key, priority: 2 };
                  }
                }
              } else if (subPathSegments.length === 2) {
                // Priority 3: For 2-segment paths (dashboard, settings), use exact match only
                // This is already handled by the exact match check above
                // But we can also check if current path starts with this path
                if (normalizedCurrentPath === normalizedSubPath ||
                    normalizedCurrentPath.startsWith(normalizedSubPath + "/")) {
                  if (!bestMatch || bestMatch.priority > 3) {
                    bestMatch = { key: sub.key, priority: 3 };
                  }
                }
              }
            }
          }
        }
        
        // If we found a best match, set it
        if (bestMatch) {
          setActiveSubMenu(bestMatch.key);
          return;
        }
        
        // Fallback: Try to match by extracting base module from current path
        // This handles cases where the current path might not exactly match any submenu path
        // but shares the same base module (e.g., /hrms-geo/tracking/timeline should match Tracking)
        if (pathSegments.length >= 3) {
          const currentBaseModulePath = "/" + pathSegments.slice(0, 2).join("/");
          for (const sub of hrmsGeoSubmenus) {
            if (sub.path && sub.key) {
              const subPath = sub.path.split("?")[0];
              const subPathSegments = sub.path.split("?")[0].split("/").filter(Boolean);
              if (subPathSegments.length >= 3) {
                const subBaseModulePath = "/" + subPathSegments.slice(0, 2).join("/");
                if (currentBaseModulePath === subBaseModulePath) {
                  setActiveSubMenu(sub.key);
                  return;
                }
              }
            }
          }
        }
        
        // Even if no exact submenu match found, keep HRMS Geo menu expanded
        // This ensures the menu stays open when navigating between tabs
        // Don't change activeSubMenu if no match found - keep the current state
        return;
      }
    }
    
    // Special handling for admin LMS routes - keep LMS menu expanded on any /admin/lms/* route
    if (pathWithoutQuery.startsWith("/admin/lms/")) {
      setActiveMenu("lms");
      return;
    }
    
    // Special handling for grievance routes - keep Grievance menu expanded on any /grievances/* route
    if (pathWithoutQuery.startsWith("/grievances")) {
      setActiveMenu("grievance");
      return;
    }
    
    // For non-HRMS Geo routes, use the standard logic
    const { mainKey, subKey } = getMenuKeyFromPath();

    // If we're in a submenu route, expand it
    if (mainKey) {
      // Always expand the parent menu if we're in a submenu route
      if (activeMenu !== mainKey) {
        setActiveMenu(mainKey);
      }
      
      // For HRMS Geo modules, ensure we always identify the correct submenu item
      if (mainKey === "hrms-geo") {
        let foundSubKey = subKey;
        
        // If subKey wasn't found, try to find it by matching the current path
        if (!foundSubKey) {
          const hrmsGeoSubmenus = subMenus["hrms-geo"] || [];
          for (const sub of hrmsGeoSubmenus) {
            if (sub.path && sub.key) {
              const subPath = sub.path.split("?")[0];
              if (subPath.startsWith("/hrms-geo/")) {
                const pathSegments = subPath.split("/").filter(Boolean);
                if (pathSegments.length >= 3) {
                  const baseModulePath = "/" + pathSegments.slice(0, 2).join("/");
                  const normalizedCurrentPath = pathWithoutQuery.replace(/\/$/, "");
                  const normalizedBasePath = baseModulePath.replace(/\/$/, "");
                  // Check if current path is within the base module
                  if (normalizedCurrentPath.startsWith(normalizedBasePath + "/") || normalizedCurrentPath === normalizedBasePath) {
                    foundSubKey = sub.key;
                    break;
                  }
                }
              }
            }
          }
        }
        
        // Set the active submenu if found
        if (foundSubKey && activeSubMenu !== foundSubKey) {
          setActiveSubMenu(foundSubKey);
        }
      } else if (subKey && activeSubMenu !== subKey) {
        setActiveSubMenu(subKey);
      } else if (!subKey) {
        setActiveSubMenu(null);
      }
    } else {
      // If we're not in any submenu route, collapse all menus
      if (activeMenu !== null) {
        setActiveMenu(null);
      }
      if (activeSubMenu !== null) {
        setActiveSubMenu(null);
      }
    }
  }, [location.pathname, location.search, isSuperAdmin, subMenus]);

  const content = (
    <aside className={`w-74 flex flex-col overflow-y-auto transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`} style={{ backgroundColor: '#2C2C2C' }}>
      <div className="p-6 flex items-center justify-between border-b border-gray-700">
        {!collapsed && (
          <div className="flex-1 flex items-center justify-center">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="h-12 w-auto object-contain max-w-full"
              />
            ) : (
              <h1 className="text-2xl font-bold text-white text-center">
                EKTA HRMS
              </h1>
            )}
          </div>
        )}
        {collapsed && companyLogo && (
          <img 
            src={companyLogo} 
            alt="Company Logo" 
            className="h-10 w-10 object-contain mx-auto"
          />
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="p-2 rounded-[5px] hover:bg-yellow-500/20 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft className={`w-5 h-5 text-white/80 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {mainMenus.map((item) => {
          const isActiveParent = item.key === activeMenu;
          const isActiveLink =
            item.path && location.pathname.startsWith(item.path.split("?")[0]);

          // Only highlight parent if the parent path itself is active, not when a child is active
          // This ensures only the active child is highlighted, not the parent

          return (
            <div key={item.label}>
              {item.path && !item.key ? (
                // Direct path items (Dashboard, Payroll) - make entire column clickable
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 cursor-pointer rounded-[5px] transition-all ${isActive
                      ? "bg-primary text-white font-semibold shadow-md"
                      : "text-white/80 hover:bg-primary/30"
                    }`
                  }
                  onClick={onClose}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${isActiveLink ? "text-white" : "text-white/80"}`} />
                    {!collapsed && (
                      <span className={isActiveLink ? "text-white" : "text-white/80"}>
                        {item.label}
                      </span>
                    )}
                  </div>
                </NavLink>
              ) : (
                // Items with submenus
                <div
                  onClick={() =>
                    item.key
                      ? setActiveMenu(isActiveParent ? null : item.key)
                      : null
                  }
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-[5px] transition-all ${isActiveParent || isActiveLink
                    ? "bg-primary text-white font-semibold shadow-md"
                    : "text-white/80 hover:bg-primary/30"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${isActiveParent || isActiveLink ? "text-white" : "text-white/80"}`} />
                    {!collapsed && (
                      item.path ? (
                        <NavLink
                          to={item.path}
                          className={({ isActive }) => isActive ? "text-white" : "text-white/80"}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.label}
                        </NavLink>
                      ) : (
                        <span className="text-white/80">{item.label}</span>
                      )
                    )}
                  </div>

                  {!collapsed && item.key &&
                    (isActiveParent ? (
                      <ChevronDown className="w-4 h-4 text-white/80" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/60" />
                    ))}
                </div>
              )}

              {!collapsed && item.key === activeMenu && (() => {
                const menuItems = subMenus[item.key] || [];
                const pathWithoutQuery = location.pathname.split("?")[0];
                
                // Get dashboard path to exclude it from matching
                const dashboardPath = getRoleDashboard(userRole || "");
                const dashboardPathBase = dashboardPath.split("?")[0];
                
                // First, find the most specific matching path from all menu items
                // Check exact matches first, then prefix matches
                const allMatches: Array<{ path: string; isExact: boolean; pathLength: number }> = [];
                
                for (const sub of menuItems) {
                  if (!sub.path) continue;
                  
                  // Normalize paths by removing trailing slashes and query parameters
                  const subPathBase = (sub.path.split("?")[0] || "").replace(/\/$/, "");
                  const normalizedPath = pathWithoutQuery.replace(/\/$/, "");
                  
                  // Skip if this matches dashboard path
                  if (subPathBase === dashboardPathBase || subPathBase === "/") continue;
                  
                  // For HRMS Geo modules, check if current path starts with the base module path
                  if (subPathBase.startsWith("/hrms-geo/")) {
                    const pathSegments = subPathBase.split("/").filter(Boolean);
                    if (pathSegments.length >= 3) {
                      const baseModulePath = "/" + pathSegments.slice(0, 2).join("/");
                      // Exact match gets highest priority
                      if (normalizedPath === subPathBase) {
                        allMatches.push({ path: sub.path, isExact: true, pathLength: subPathBase.length });
                      }
                      // Check if current path is within the base module (e.g., /hrms-geo/tracking/*)
                      else if (normalizedPath.startsWith(baseModulePath + "/") || normalizedPath === baseModulePath) {
                        allMatches.push({ path: sub.path, isExact: false, pathLength: baseModulePath.length });
                      }
                    }
                  } else {
                    // For other modules, use exact path matching only
                    // Only match if the paths are exactly equal - don't match parent paths when on child paths
                    // This prevents /staff from being highlighted when on /staff/attendance
                    if (normalizedPath === subPathBase) {
                      allMatches.push({ path: sub.path, isExact: true, pathLength: subPathBase.length });
                    }
                    // Don't do prefix matching for non-HRMS-Geo modules
                    // This ensures only the exact matching path is highlighted
                  }
                }
                
                // Find the most specific active path
                // Priority: 1) Exact matches, 2) Longest path length
                let mostSpecificActivePath: string | null = null;
                if (allMatches.length > 0) {
                  // Sort: exact matches first, then by path length (descending)
                  allMatches.sort((a, b) => {
                    if (a.isExact && !b.isExact) return -1;
                    if (!a.isExact && b.isExact) return 1;
                    return b.pathLength - a.pathLength;
                  });
                  mostSpecificActivePath = allMatches[0].path;
                }
                
                return (
                  <div className="ml-4 mt-0.5 mb-1 space-y-0.5">
                    {menuItems.map((sub: any) => {
                      // Check if user has access to this submenu item
                      // Special handling for grievance module - always show for Admin, Manager, HR, Senior HR
                      let hasAccess = false;
                      if (sub.module === 'grievance' && (userRole === 'Admin' || userRole === 'Manager' || userRole === 'HR' || userRole === 'Senior HR')) {
                        hasAccess = true;
                      } else if (sub.module) {
                        hasAccess = canViewModule(userPermissions, sub.module);
                      } else {
                        hasAccess = !sub.roles || sub.roles.includes(userRole);
                      }

                      if (!hasAccess) return null;

                      // Check if this submenu has nested items
                      const hasSubItems = sub.subItems && sub.subItems.length > 0;
                      const isSubMenuActive = activeSubMenu === sub.key;
                      const subPathBase = sub.path?.split("?")[0] || "";
                      const subPathQuery = sub.path?.includes("?") ? sub.path.split("?")[1] : null;
                      
                      // Check if this is the most specific active path
                      // Compare paths without query parameters and trailing slashes for consistency
                      const subPathForComparison = (sub.path?.split("?")[0] || "").replace(/\/$/, "");
                      const normalizedPathForComparison = pathWithoutQuery.replace(/\/$/, "");
                      
                      // For HRMS Geo modules, check if current path starts with the base module path
                      let isSubMenuPathActive = false;
                      if (subPathForComparison.startsWith("/hrms-geo/")) {
                        const pathSegments = subPathForComparison.split("/").filter(Boolean);
                        if (pathSegments.length >= 3) {
                          const baseModulePath = "/" + pathSegments.slice(0, 2).join("/");
                          const normalizedBasePath = baseModulePath.replace(/\/$/, "");
                          // Check if current path is within the base module (e.g., /hrms-geo/tracking/*)
                          isSubMenuPathActive = normalizedPathForComparison.startsWith(normalizedBasePath + "/") || 
                                                normalizedPathForComparison === normalizedBasePath ||
                                                normalizedPathForComparison === subPathForComparison;
                        }
                      } else {
                        // For other modules, use exact path matching only
                        // Only match if the current path exactly equals the submenu path
                        // This prevents parent paths (like /staff) from being active when on child paths (like /staff/attendance)
                        
                        // First check if this is the most specific active path (from the matching logic above)
                        if (mostSpecificActivePath) {
                          const mostSpecificPathForComparison = (mostSpecificActivePath.split("?")[0] || "").replace(/\/$/, "");
                          if (mostSpecificPathForComparison === subPathForComparison) {
                            isSubMenuPathActive = true;
                          } else {
                            // If there's a more specific match, this item should not be active
                            isSubMenuPathActive = false;
                          }
                        } else {
                          // Fallback to exact match if no most specific path was found
                          isSubMenuPathActive = normalizedPathForComparison === subPathForComparison;
                        }
                      }
                      
                      // For HRMS Geo modules, prioritize activeSubMenu state to ensure consistency
                      // If activeSubMenu is set for this item, it should always be highlighted
                      let finalIsActive = false;
                      if (subPathForComparison.startsWith("/hrms-geo/")) {
                        // For HRMS Geo, use state-based check first, then path matching as fallback
                        finalIsActive = isSubMenuActive || isSubMenuPathActive;
                      } else {
                        // For other modules, prioritize path matching over state
                        // This ensures the most specific path match is highlighted, not the state
                        // The state might be set incorrectly if there are parent/child path conflicts
                        finalIsActive = isSubMenuPathActive;
                        
                        // Only use activeSubMenu state if path matching didn't find anything AND it matches exactly
                        // This prevents parent paths from being highlighted when on child paths
                        if (!finalIsActive && isSubMenuActive) {
                          // Double-check that the activeSubMenu state matches the current path exactly
                          const activeSubMenuItem = menuItems.find((s: any) => s.key === activeSubMenu);
                          if (activeSubMenuItem?.path) {
                            const activeSubMenuPath = (activeSubMenuItem.path.split("?")[0] || "").replace(/\/$/, "");
                            if (normalizedPathForComparison === activeSubMenuPath) {
                              finalIsActive = true;
                            }
                          }
                        }
                      }
                      
                      // Check query string if present (only if path-based matching was used)
                      if (finalIsActive && subPathQuery && !location.search.includes(subPathQuery) && !isSubMenuActive) {
                        finalIsActive = false;
                      }

                    return (
                      <div key={sub.path || sub.key}>
                        {hasSubItems ? (
                          <>
                            <div
                              onClick={() =>
                                setActiveSubMenu(
                                  isSubMenuActive ? null : sub.key
                                )
                              }
                              className={`flex items-center justify-between px-3 py-2 rounded-[5px] text-base cursor-pointer transition-all relative ${isSubMenuActive || finalIsActive
                                ? "bg-primary/50 text-white font-medium border-l-2 border-primary"
                                : "text-white/70 hover:bg-primary/20 hover:text-white/90"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <sub.icon className={`w-4 h-4 ${isSubMenuActive || finalIsActive ? "text-white" : "text-white/60"}`} />
                                <span className={isSubMenuActive || finalIsActive ? "text-white" : "text-white/70"}>{sub.label}</span>
                              </div>
                              {isSubMenuActive ? (
                                <ChevronDown className="w-3 h-3 text-white/50" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-white/40" />
                              )}
                            </div>
                            {isSubMenuActive && (
                              <div className="ml-3 mt-0.5 space-y-0.5">
                                {sub.subItems
                                  .filter(
                                    (subItem: any) =>
                                      !subItem.roles ||
                                      subItem.roles.includes(userRole)
                                  )
                                  .map((subItem: any) => (
                                    <NavLink
                                      key={subItem.path}
                                      to={subItem.path}
                                      onClick={onClose}
                                      className={({ isActive }) =>
                                        `flex items-center gap-2 px-3 py-2 rounded-[5px] text-sm transition-all ${isActive
                                          ? "bg-primary text-white font-medium"
                                          : "text-white/60 hover:bg-primary/30 hover:text-white/75"
                                        }`
                                      }
                                    >
                                      <subItem.icon className="w-4 h-4" />
                                      {subItem.label}
                                    </NavLink>
                                  ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <NavLink
                            to={sub.path}
                            onClick={onClose}
                            className={({ isActive }) => {
                              // Use our custom finalIsActive logic for more precise matching
                              const active = finalIsActive || isActive;
                              return `flex items-center justify-between px-3 py-2 rounded-[5px] text-base transition-all relative ${active
                                ? "bg-primary/50 text-white font-medium border-l-2 border-primary"
                                : "text-white/70 hover:bg-primary/20 hover:text-white/90"
                              }`;
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <sub.icon className={`w-4 h-4 ${finalIsActive ? "text-white" : "text-white/60"}`} />
                              <span className={finalIsActive ? "text-white" : "text-white/70"}>{sub.label}</span>
                            </div>
                            {/* Dynamic badge for KRA/KPI showing priority count */}
                            {sub.path === "/kra" && kraPriorityCount > 0 && (
                              <span className="bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex items-center justify-center">
                                {kraPriorityCount > 99 ? "99+" : kraPriorityCount}
                              </span>
                            )}
                          </NavLink>
                        )}
                      </div>
                    );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar FIXED */}
      <div className={`hidden lg:block fixed left-0 top-0 h-screen shadow-lg z-[105] overflow-y-auto transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`} style={{ backgroundColor: '#2C2C2C' }}>
        {content}
      </div>

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={onClose}>
        <SheetContent
          side="left"
          className="p-0 w-64 rounded-none overflow-y-auto"
          style={{ backgroundColor: '#2C2C2C' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted"
          >
            {/* <X className="w-5 h-5" /> */}
          </button>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Sidebar;
