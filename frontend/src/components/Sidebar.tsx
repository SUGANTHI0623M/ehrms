import { useState, useMemo, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { hasModuleAccess, getPermittedModules, getRoleDashboard } from "@/utils/roleUtils";
import { canViewModule, getUserPermissions } from "@/utils/permissionUtils";
import { useGetKRAStatsQuery } from "@/store/api/kraApi";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  TrendingUp,
  DollarSign,
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
} from "lucide-react";

import { Sheet, SheetContent } from "./ui/sheet";

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
  
  // Fetch KRA statistics for dynamic badge
  const { data: kraStats } = useGetKRAStatsQuery(undefined, {
    skip: !currentUser, // Skip if no user
    pollingInterval: 30000, // Poll every 30 seconds for updates
  });
  
  const kraPriorityCount = kraStats?.data?.priorityCount || 0;

  // Check if user is Super Admin
  const isSuperAdmin = useMemo(() => {
    if (!currentUser || !currentUser.role) {
      return false;
    }
    const role = String(currentUser.role).trim();
    return role === "Super Admin";
  }, [currentUser]);

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
      { icon: DollarSign, label: "Payroll", path: "/payroll/management", module: "payroll" },
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
    ];

    // Filter menus based on permissions
    const filteredMenus = allMenus.filter((menu) => {
      // For dashboard, always show (everyone needs access to dashboard)
      if (menu.module === "dashboard") {
        return true;
      }

      // For HRMS Geo, always show for Admin and Manager roles
      if (menu.module === "hrms-geo" && (userRole === "Admin" || userRole === "Manager")) {
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

    // Debug logging in development
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('[Sidebar] Menu filtering:', {
    //     totalMenus: allMenus.length,
    //     filteredCount: filteredMenus.length,
    //     filteredModules: filteredMenus.map(m => m.module),
    //     userPermissionsCount: userPermissions.length,
    //     userPermissions: userPermissions
    //   });
    // }

    return filteredMenus;
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
        { icon: LayoutDashboard, label: "Dashboard", path: "/hrms-geo/dashboard" },
        { icon: Navigation, label: "Tracking", path: "/hrms-geo/tracking/live" },
        { icon: FileTextIcon, label: "Forms", path: "/hrms-geo/forms/responses" },
        { icon: ClipboardCheck, label: "Tasks", path: "/hrms-geo/tasks/dashboard" },
        { icon: UserCircle2, label: "Customers", path: "/hrms-geo/customers/dashboard" },
        // { icon: HelpCircle, label: "Help", path: "/hrms-geo/help/outage" }, // Hidden
        { icon: Settings, label: "Geo Settings", path: "/hrms-geo/settings" },
      ],
      "super-admin-settings": superAdminSettings,
      settings: baseSettings,
      assets: [
        { icon: CalendarDays, label: "Assets Type", path: "/assets-type" },
        { icon: Receipt, label: "Assets", path: "/assets" },
      ],
      lms: [
        { icon: Library, label: "Course Library", path: "/course-library" },
        { icon: ListVideo, label: "Live Session", path: "/live-session" },
        { icon: Wand2, label: "Auto Quiz Generator", path: "/quiz-generator" },
        { icon: ListChecks, label: "Quiz / Assessment", path: "/assessment" },
        { icon: BarChart2, label: "Score / Analytics", path: "/score" },
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
          // Exact match gets higher priority
          if (pathWithoutQuery === subPath) {
            matches.push({ mainKey: key, subKey: sub.key || null, isExact: true, pathLength: subPath.length });
          } else if (pathWithoutQuery.startsWith(subPath + "/")) {
            matches.push({ mainKey: key, subKey: sub.key || null, isExact: false, pathLength: subPath.length });
          }
        }
      }
    }
    
    // Return the most specific match
    // Priority: 1) Exact matches, 2) Longest path length
    if (matches.length > 0) {
      matches.sort((a, b) => {
        // Exact matches first
        if (a.isExact && !b.isExact) return -1;
        if (!a.isExact && b.isExact) return 1;
        // Then by path length (descending)
        return b.pathLength - a.pathLength;
      });
      return { mainKey: matches[0].mainKey, subKey: matches[0].subKey };
    }
    
    return { mainKey: null, subKey: null };
  };

  // Auto-open/close based on route
  useEffect(() => {
    const { mainKey, subKey } = getMenuKeyFromPath();

    // If we're in a submenu route, expand it
    if (mainKey) {
      if (activeMenu !== mainKey) {
        setActiveMenu(mainKey);
      }
      if (subKey && activeSubMenu !== subKey) {
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
  }, [location.pathname, location.search, isSuperAdmin]);

  const content = (
    <aside className={`w-74 flex flex-col overflow-y-auto transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-2xl font-bold text-sidebar-foreground text-center flex-1">
            AskEVA HRMS
          </h1>
        )}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="p-2 rounded-lg hover:bg-sidebar-accent/10 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft className={`w-5 h-5 text-sidebar-foreground/80 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {mainMenus.map((item) => {
          const isActiveParent = item.key === activeMenu;
          const isActiveLink =
            item.path && location.pathname.startsWith(item.path.split("?")[0]);

          // Check if any submenu item is active (for parent highlighting)
          const hasActiveSubmenu = item.key && subMenus[item.key]?.some((sub: any) => {
            const subPathBase = sub.path?.split("?")[0] || "";
            const subPathQuery = sub.path?.includes("?") ? sub.path.split("?")[1] : null;
            return sub.path &&
              location.pathname.startsWith(subPathBase) &&
              (subPathQuery ? location.search.includes(subPathQuery) : true);
          });

          return (
            <div key={item.label}>
              {item.path && !item.key ? (
                // Direct path items (Dashboard, Payroll) - make entire column clickable
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/10"
                    }`
                  }
                  onClick={onClose}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${isActiveLink ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80"}`} />
                    {!collapsed && (
                      <span className={isActiveLink ? "text-sidebar-accent-foreground" : ""}>
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
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${isActiveParent || isActiveLink || hasActiveSubmenu
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/10"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${isActiveParent || isActiveLink || hasActiveSubmenu ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80"}`} />
                    {!collapsed && (
                      item.path ? (
                        <NavLink
                          to={item.path}
                          className={({ isActive }) => isActive ? "text-sidebar-accent-foreground" : ""}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.label}
                        </NavLink>
                      ) : (
                        <span>{item.label}</span>
                      )
                    )}
                  </div>

                  {!collapsed && item.key &&
                    (isActiveParent ? (
                      <ChevronDown className="w-4 h-4 text-sidebar-accent-foreground/80" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-sidebar-foreground/60" />
                    ))}
                </div>
              )}

              {!collapsed && item.key === activeMenu && (() => {
                const menuItems = subMenus[item.key] || [];
                const pathWithoutQuery = location.pathname.split("?")[0];
                
                // First, find the most specific matching path from all menu items
                // Check exact matches first, then prefix matches
                const allMatches: Array<{ path: string; isExact: boolean; pathLength: number }> = [];
                
                for (const sub of menuItems) {
                  if (!sub.path) continue;
                  
                  // Normalize paths by removing trailing slashes and query parameters
                  const subPathBase = (sub.path.split("?")[0] || "").replace(/\/$/, "");
                  const normalizedPath = pathWithoutQuery.replace(/\/$/, "");
                  
                  // Exact match gets highest priority
                  if (normalizedPath === subPathBase) {
                    allMatches.push({ path: sub.path, isExact: true, pathLength: subPathBase.length });
                  }
                  // Prefix match (current path is a child of this menu path)
                  else if (normalizedPath.startsWith(subPathBase + "/")) {
                    allMatches.push({ path: sub.path, isExact: false, pathLength: subPathBase.length });
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
                  <div className="ml-4 mt-0.5 mb-1 pl-3 border-l-2 border-sidebar-accent/20 bg-sidebar-accent/5 rounded-r-md py-1.5 space-y-0.5">
                    {menuItems.map((sub: any) => {
                      // Check if user has access to this submenu item
                      // If module is defined, check explicit permission
                      // Otherwise fall back to role checks (for legacy/settings items)
                      const hasAccess = sub.module
                        ? canViewModule(userPermissions, sub.module)
                        : !sub.roles || sub.roles.includes(userRole);

                      if (!hasAccess) return null;

                      // Check if this submenu has nested items
                      const hasSubItems = sub.subItems && sub.subItems.length > 0;
                      const isSubMenuActive = activeSubMenu === sub.key;
                      const subPathBase = sub.path?.split("?")[0] || "";
                      const subPathQuery = sub.path?.includes("?") ? sub.path.split("?")[1] : null;
                      
                      // Check if this is the most specific active path
                      // Compare paths without query parameters and trailing slashes for consistency
                      const subPathForComparison = (sub.path?.split("?")[0] || "").replace(/\/$/, "");
                      const mostSpecificPathForComparison = (mostSpecificActivePath?.split("?")[0] || "").replace(/\/$/, "");
                      const isSubMenuPathActive = subPathForComparison === mostSpecificPathForComparison;
                      
                      // Also check query string if present
                      let finalIsActive = isSubMenuPathActive;
                      if (finalIsActive && subPathQuery && !location.search.includes(subPathQuery)) {
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
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm cursor-pointer transition-colors relative ${isSubMenuActive || finalIsActive
                                ? "bg-sidebar-accent/30 text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-accent"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/15 hover:text-sidebar-foreground/90"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <sub.icon className={`w-3.5 h-3.5 ${isSubMenuActive || finalIsActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60"}`} />
                                <span>{sub.label}</span>
                              </div>
                              {isSubMenuActive ? (
                                <ChevronDown className="w-3 h-3 text-sidebar-foreground/50" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-sidebar-foreground/40" />
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
                                        `flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${isActive
                                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/15 hover:text-sidebar-foreground/75"
                                        }`
                                      }
                                    >
                                      <subItem.icon className="w-3 h-3" />
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
                              return `flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors relative ${active
                                ? "bg-sidebar-accent/30 text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-accent"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/15 hover:text-sidebar-foreground/90"
                              }`;
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <sub.icon className={`w-3.5 h-3.5 ${finalIsActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60"}`} />
                              {sub.label}
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
      <div className={`hidden lg:block fixed left-0 top-0 h-screen bg-sidebar shadow-lg z-50 overflow-y-auto transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        {content}
      </div>

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={onClose}>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-sidebar rounded-none overflow-y-auto"
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
