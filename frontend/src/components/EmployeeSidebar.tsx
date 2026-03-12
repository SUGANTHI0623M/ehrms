import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Clock,
  Users,
  TrendingUp,
  FileText,
  Settings as SettingsIcon,
  MapPin,
  Plug2,
  Briefcase,
  UserPlus,
  CalendarCheck,
  FilePlus,
  UserCircle,
  Award,
  BarChart2,
  FileBadge,
  ClipboardList as CheckList,
  FileCheck,
  UserRoundPlus,
  Banknote,
  Wallet,
  Receipt,
  Download,
  BarChart3,
  ShieldCheck,
  Target,
  CheckCircle2,
  Notebook,
  Navigation,
  ClipboardCheck,
  UserCircle2,
  Library,
  ListVideo,
  Wand2,
  ListChecks,
  PhoneCall,
  Mail,
  MessageSquare,
  Phone,
  CalendarDays,
  Building2,
  ChevronLeft,
  Cake,
  Megaphone,
  AlertCircle,
  Activity,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu, Divider } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  BookOutlined,
  VideoCameraOutlined,
  BellOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "@/store/hooks";
import { useGetBusinessQuery } from "@/store/api/settingsApi";

import { lmsService } from "@/services/lmsService";

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

interface EmployeeSidebarProps {
  mobileOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

// Admin submenu definitions (matching Sidebar.tsx structure)
const ADMIN_SUBMENUS: Record<string, Array<{
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  module?: string;
  key?: string;
  subItems?: Array<{ icon: React.ComponentType<any>; label: string; path: string }>;
}>> = {
  interview: [
    { icon: Briefcase, label: "Job Openings", path: "/job-openings", module: "job_openings" },
    { icon: UserPlus, label: "Candidates", path: "/candidates", module: "candidates" },
    { icon: CalendarCheck, label: "Interview Appointments", path: "/interview-appointments", module: "interview_appointments" },
    {
      icon: FilePlus,
      label: "Interview Process",
      key: "interview-process",
      path: "/interview/templates",
      module: "interview_process",
      subItems: [
        { icon: FileText, label: "Interview Flows", path: "/interview/templates" },
        { icon: UserCircle, label: "Round 1 (First Round)", path: "/interview/round/1" },
        { icon: UserCircle, label: "Round 2 (Second Round)", path: "/interview/round/2" },
        { icon: UserCircle, label: "Round 3 (Optional)", path: "/interview/round/3" },
        { icon: UserCircle, label: "Final Round", path: "/interview/round/final" },
        { icon: Award, label: "Selected / Rejected", path: "/interview/selected" },
        { icon: BarChart2, label: "Interview Progress", path: "/interview/candidate/progress" },
      ],
    },
    { icon: FileBadge, label: "Offer Letter", path: "/offer-letter", module: "offer_letter" },
    { icon: CheckList, label: "Document Collection", path: "/onboarding", module: "document_collection" },
    { icon: FileCheck, label: "Background Verification", path: "/interview/background-verification", module: "background_verification" },
    { icon: UserRoundPlus, label: "Refer a Candidate", path: "/refer-candidate", module: "refer_candidate" },
  ],
  staff: [
    { icon: Users, label: "Staff Overview", path: "/staff" },
    { icon: Banknote, label: "Salary Overview", path: "/staff-overview" },
    { icon: FileText, label: "Salary Structure", path: "/salary-structure" },
    { icon: CalendarCheck, label: "Attendance", path: "/staff/attendance" },
    { icon: Activity, label: "Attendance Monitoring", path: "/staff/attendance-monitoring", module: "attendance_monitoring" },
    { icon: Calendar, label: "Leaves Pending Approval", path: "/staff/leaves-pending-approval" },
    { icon: Wallet, label: "Loans", path: "/staff/loans" },
    { icon: Receipt, label: "Expense Claims", path: "/staff/expense-claims" },
    { icon: Download, label: "Payslip Requests", path: "/staff/payslip-requests" },
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
    { icon: CheckCircle2, label: "Goal Approval", path: "/pms/goal-approval" },
    { icon: Award, label: "KRA / KPI", path: "/kra" },
    { icon: Notebook, label: "PMS Reports", path: "/pms/reports" },
    { icon: Target, label: "PMS Settings", path: "/pms/settings" },
  ],
  payroll: [
    { icon: Receipt, label: "Payroll Management", path: "/payroll/management" },
  ],
  "hrms-geo": [
    { icon: LayoutDashboard, label: "Dashboard", path: "/hrms-geo/dashboard" },
    { icon: Navigation, label: "Tracking", path: "/hrms-geo/tracking/live" },
    { icon: FileText, label: "Forms", path: "/hrms-geo/forms/responses" },
    { icon: ClipboardCheck, label: "Tasks", path: "/hrms-geo/tasks/dashboard" },
    { icon: UserCircle2, label: "Customers", path: "/hrms-geo/customers/dashboard" },
    { icon: SettingsIcon, label: "Geo Settings", path: "/hrms-geo/settings" },
  ],
  assets: [
    { icon: CalendarDays, label: "Assets Type", path: "/assets-type" },
    { icon: Receipt, label: "Assets", path: "/assets" },
  ],
  lms: [
    { icon: LayoutDashboard, label: "LMS Dashboard", path: "/admin/lms/dashboard", module: "lms_dashboard" },
    { icon: Library, label: "Course Library", path: "/admin/lms/course-library", module: "course_library" },
    { icon: Users, label: "Learners", path: "/admin/lms/learners", module: "learners" },
    { icon: ListVideo, label: "Live Sessions", path: "/admin/lms/live-sessions", module: "live_session" },
    { icon: ListChecks, label: "Assessment Management", path: "/admin/lms/assessment", module: "assessment" },
    { icon: BarChart2, label: "Scores & Analytics", path: "/admin/lms/scores-analytics", module: "score_analytics" },
  ],
  integrations: [
    { icon: Plug2, label: "All Integrations", path: "/integrations" },
    { icon: PhoneCall, label: "Exotel", path: "/integrations/exotel" },
    { icon: Mail, label: "Email", path: "/integrations/email" },
    { icon: Calendar, label: "Google Calendar", path: "/integrations/google-calendar" },
    { icon: MessageSquare, label: "SMS", path: "/integrations/sms" },
    { icon: MessageSquare, label: "RCS", path: "/integrations/rcs" },
    { icon: Phone, label: "Voice", path: "/integrations/voice" },
  ],
  celebration: [
    { icon: Cake, label: "Celebration", path: "/admin/celebration", module: "celebration" },
  ],
  announcements: [
    { icon: Megaphone, label: "Announcements", path: "/announcements", module: "announcements" },
  ],
  grievance: [
    // For employees with admin access - show admin options (NO Settings for employees)
    { icon: AlertCircle, label: "All Grievances", path: "/grievances", module: "grievance" },
    { icon: BarChart3, label: "Analytics", path: "/grievances/analytics", module: "grievance" },
    // Settings is admin-only, not shown to employees even with admin access
  ],
  settings: [
    { icon: UserRoundPlus, label: "User Management", path: "/user-management" },
    { icon: CalendarCheck, label: "Attendance Settings", path: "/attendance-setting" },
    { icon: Building2, label: "Business Settings", path: "/business-setting" },
    { icon: Receipt, label: "Payroll Settings", path: "/payroll-setting" },
    { icon: FileText, label: "Business Info", path: "/businessinfo-setting" },
    { icon: FilePlus, label: "Company Policy", path: "/company" },
    { icon: FileCheck, label: "Onboarding Documents", path: "/onboarding-document-requirements" },
    { icon: SettingsIcon, label: "Others", path: "/others-setting" },
  ],
};

// Admin menu main items (for top-level menu) - using component types for icons
const ADMIN_MENU_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; mainPath: string }> = {
  'interview': { label: 'Interview', icon: ClipboardList, mainPath: '/candidates' },
  'celebration': { label: 'Celebration', icon: Cake, mainPath: '/admin/celebration' },
  'staff': { label: 'Staff', icon: Users, mainPath: '/staff' },
  'payroll': { label: 'Payroll', icon: RupeeIcon, mainPath: '/payroll/management' },
  'hrms-geo': { label: 'HRMS Geo', icon: MapPin, mainPath: '/hrms-geo/dashboard' },
  'performance': { label: 'Performance', icon: TrendingUp, mainPath: '/performance' },
  'lms': { label: 'LMS', icon: FileText, mainPath: '/admin/lms/course-library' },
  'announcements': { label: 'Announcements', icon: Megaphone, mainPath: '/announcements' },
  'grievance': { label: 'Grievance', icon: AlertCircle, mainPath: '/grievances' },
  'assets': { label: 'Asset Management', icon: SettingsIcon, mainPath: '/assets' },
  'integrations': { label: 'Integrations', icon: Plug2, mainPath: '/integrations' },
  'settings': { label: 'Settings', icon: SettingsIcon, mainPath: '/settings' },
};
/** Only "My Learning" is hidden when LMS access is disabled; Live Sessions stays visible. */
const MY_LEARNING_MENU_KEY = "/lms/employee/dashboard";

const EmployeeSidebar = ({
  mobileOpen = false,
  collapsed = false,
  onClose = () => { },
  onCollapse = () => { },
}: EmployeeSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const currentUser = useAppSelector((state) => state.auth.user);
  const [lmsAccessEnabled, setLmsAccessEnabled] = useState(true);
  
  // Fetch business data for company logo
  const { data: businessData } = useGetBusinessQuery();
  const companyLogo = businessData?.data?.business?.logo;

  useEffect(() => {
    lmsService.getMyLmsAccess().then((res) => {
      setLmsAccessEnabled(res?.data?.lmsAccessEnabled !== false);
    }).catch(() => setLmsAccessEnabled(true));
  }, []);

  const employeeMenuItems: MenuProps["items"] = [
    {
      key: "/employee/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "/employee/requests",
      icon: <FileTextOutlined />,
      label: "My Requests",
    },
    {
      key: "/employee/salary",
      icon: <DollarOutlined />,
      label: "Salary Overview",
    },
    {
      key: "/employee/performance",
      icon: <TrophyOutlined />,
      label: "Performance",
      children: [
        {
          key: "/employee/performance/overview",
          icon: <DashboardOutlined />,
          label: "My Performance",
        },
        {
          key: "/employee/performance/reviews",
          icon: <CheckCircleOutlined />,
          label: "My Reviews",
        },
        {
          key: "/employee/performance/self-assessment",
          icon: <FileTextOutlined />,
          label: "Self Assessment",
        },
        {
          key: "/employee/performance/my-goals",
          icon: <TrophyOutlined />,
          label: "My Goals",
        },
      ],
    },
    {
      key: "/employee/holidays",
      icon: <CalendarOutlined />,
      label: "Holidays",
    },
    {
      key: "/employee/attendance",
      icon: <ClockCircleOutlined />,
      label: "Attendance",
    },
    {
      key: "/employee/assets",
      icon: <AppstoreOutlined />,
      label: "My Assets",
    },
    {
      key: "/employee/tasks",
      icon: <FileTextOutlined />,
      label: "My Tasks",
    },
    {
      key: "/employee/announcements",
      icon: <SoundOutlined />,
      label: "Announcements",
    },
    {
      key: "/grievances/my",
      icon: <FileTextOutlined />,
      label: "My Grievances",
    },
    // {
    //   key: "/employee/hrms-geo",
    //   icon: <AppstoreOutlined />,
    //   label: "HRMS Geo",
    // },
    {
      key: "/lms/employee/dashboard",
      icon: <BookOutlined />,
      label: "My Learning",
    },
    {
      key: "/lms/employee/live-sessions",
      icon: <VideoCameraOutlined />,
      label: "Live Sessions",
    },
    {
      key: "/notifications",
      icon: <BellOutlined />,
      label: "Notifications",
    },
  ];

  // Get admin menu items with submenus based on sidebarPermissions
  const adminMenuItems: MenuProps["items"] = useMemo(() => {
    if (!currentUser || currentUser.role !== 'Employee') {
      return [];
    }
    
    // Type guard: check if sidebarPermissions exists
    const sidebarPerms = (currentUser as any).sidebarPermissions;
    if (!sidebarPerms || !Array.isArray(sidebarPerms) || sidebarPerms.length === 0) {
      return [];
    }
    
    // Create a stable reference for sidebarPermissions to ensure memoization works correctly
    const sidebarPermsKey = JSON.stringify([...sidebarPerms].sort());
    
    // Map sub-modules to parent modules for display
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
      'attendance_monitoring': 'staff',
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
      // Grievance sub-modules
      'grievance_all': 'grievance',
      'grievance_analytics': 'grievance',
      'grievance_settings': 'grievance',
    };
    
    // Get unique parent modules from sidebarPermissions (either direct parent or mapped from sub-module)
    const parentModules = new Set<string>();
    sidebarPerms.forEach((perm: string) => {
      if (ADMIN_MENU_CONFIG[perm]) {
        // It's a parent module
        parentModules.add(perm);
      } else if (subModuleToParentMap[perm]) {
        // It's a sub-module, map to parent
        parentModules.add(subModuleToParentMap[perm]);
      }
    });

    return Array.from(parentModules)
      .filter((module: string) => ADMIN_MENU_CONFIG[module])
      .map((module: string) => {
        const config = ADMIN_MENU_CONFIG[module];
        const submenuItems = ADMIN_SUBMENUS[module];
        
        // Handle single-item modules (like celebration) that don't have submenus
        if (!submenuItems || submenuItems.length === 0) {
          // Single menu item - check if module is in permissions
          if (sidebarPerms.includes(module)) {
            const IconComponent = config.icon;
            return {
              key: config.mainPath,
              icon: <IconComponent size={16} />,
              label: config.label,
            };
          }
          return null;
        }
        
        // Check if parent module is fully selected (has all access) or only sub-modules are selected
        const isParentFullySelected = sidebarPerms.includes(module);
        
        // Map submenu paths to sub-module names for permission checking
        const pathToSubModuleMap: Record<string, string> = {
          '/job-openings': 'job_openings',
          '/candidates': 'candidates',
          '/interview-appointments': 'interview_appointments',
          '/interview/templates': 'interview_process',
          '/offer-letter': 'offer_letter',
          '/onboarding': 'document_collection',
          '/interview/background-verification': 'background_verification',
          '/refer-candidate': 'refer_candidate',
          '/staff': 'staff_overview',
          '/staff-overview': 'salary_overview',
          '/salary-structure': 'salary_structure',
          '/staff/attendance': 'attendance',
          '/staff/attendance-monitoring': 'attendance_monitoring',
          '/staff/leaves-pending-approval': 'leaves_approval',
          '/staff/loans': 'loans',
          '/staff/expense-claims': 'expense_claims',
          '/staff/payslip-requests': 'payslip_requests',
          '/performance': 'performance_overview',
          '/performance/analytics': 'performance_analytics',
          '/performance/reviews': 'performance_reviews',
          '/performance/cycles': 'review_cycles',
          '/pms/manager-review': 'manager_review',
          '/pms/hr-review': 'hr_review',
          '/pms/goals': 'goals_management',
          '/pms/my-goals': 'goals_management',
          '/employee/performance/my-goals': 'goals_management',
          '/pms/goal-progress': 'goals_management',
          '/pms/goal-approval': 'goals_management',
          '/kra': 'kra_kpi',
          '/pms/reports': 'pms_reports',
          '/pms/settings': 'pms_settings',
          '/payroll/management': 'payroll_management',
          '/admin/celebration': 'celebration',
          '/announcements': 'announcements',
          '/grievances': 'grievance_all',
          '/grievances/analytics': 'grievance_analytics',
          '/grievances/settings': 'grievance_settings',
          '/hrms-geo/dashboard': 'hrms_geo_dashboard',
          '/hrms-geo/tracking/live': 'tracking',
          '/hrms-geo/forms/responses': 'forms',
          '/hrms-geo/tasks/dashboard': 'tasks',
          '/hrms-geo/customers/dashboard': 'customers',
          '/hrms-geo/settings': 'geo_settings',
          '/assets-type': 'assets_type',
          '/assets': 'assets',
          '/admin/lms/dashboard': 'lms_dashboard',
          '/admin/lms/course-library': 'course_library',
          '/admin/lms/learners': 'learners',
          '/admin/lms/learners/': 'learners',
          '/admin/lms/live-sessions': 'live_session',
          '/admin/lms/assessment': 'assessment',
          '/admin/lms/scores-analytics': 'score_analytics',
          '/course-library': 'course_library',
          '/live-session': 'live_session',
          '/quiz-generator': 'course_library',
          '/assessment': 'assessment',
          '/score': 'score_analytics',
          '/lms/learners': 'learners',
          '/lms/scores-analytics': 'score_analytics',
          '/integrations': 'all_integrations',
          '/integrations/exotel': 'exotel',
          '/integrations/email': 'email',
          '/integrations/google-calendar': 'google_calendar',
          '/integrations/sms': 'sms',
          '/integrations/rcs': 'rcs',
          '/integrations/voice': 'voice',
          '/user-management': 'user_management',
          '/attendance-setting': 'attendance_settings',
          '/business-setting': 'business_settings',
          '/payroll-setting': 'payroll_settings',
          '/businessinfo-setting': 'business_info',
          '/company': 'company_policy',
          '/onboarding-document-requirements': 'onboarding_documents',
          '/others-setting': 'others',
        };
        
        // Filter submenu items based on granular permissions
        // If parent module is selected, show all items; otherwise filter by sub-module permissions
        const filteredSubmenuItems = submenuItems.filter((item) => {
          // Special handling for grievance module
          if (module === 'grievance') {
            // Settings is admin-only - never show to employees, even with admin permissions
            if (item.path === '/grievances/settings') {
              return false; // Settings is admin-only, not for employees
            }
            
            // Check if user has parent module permission or specific sub-module permission
            const hasParentPermission = sidebarPerms.includes(module);
            const subModuleName = pathToSubModuleMap[item.path] || item.module;
            const hasSubModulePermission = subModuleName && sidebarPerms.includes(subModuleName);
            
            // If user has admin grievance permission (parent or sub-module), show admin items
            if (hasParentPermission || hasSubModulePermission) {
              // Show admin items (exclude employee-specific items with roles property)
              if (item.roles && item.roles.includes('Employee')) {
                return false; // Don't show employee items in admin submenu
              }
              return true;
            }
            // If user is employee without admin permission, show only employee-specific items
            if (item.roles && item.roles.includes('Employee')) {
              return true;
            }
            // Don't show admin items to employees without admin permission
            return false;
          }
          
          // For other modules, use existing logic
          // If parent module is in permissions, show all submenu items
          if (sidebarPerms.includes(module)) {
            return true;
          }
          // Check if specific sub-module is in permissions
          // First try to get from pathToSubModuleMap, then fallback to item.module
          const subModuleName = pathToSubModuleMap[item.path] || item.module;
          
          // Also check if the item has a module property that matches
          if (item.module && sidebarPerms.includes(item.module)) {
            return true;
          }
          
          // Check the mapped sub-module name
          if (subModuleName && sidebarPerms.includes(subModuleName)) {
            return true;
          }
          
          return false;
        });
        
        // Convert submenu items to Ant Design menu format
        const children = filteredSubmenuItems.map((item) => {
          const IconComponent = item.icon;
          const menuItem: any = {
            key: item.path,
            icon: <IconComponent size={16} />,
            label: item.label,
          };

          // Handle nested subItems (like Interview Process)
          // Only include nested subItems if parent module is selected OR if the parent item's sub-module is selected
          if (item.subItems && item.subItems.length > 0) {
            // Check if we should show nested subItems
            const shouldShowNestedItems = sidebarPerms.includes(module) || 
              sidebarPerms.includes(pathToSubModuleMap[item.path] || item.module);
            
            if (shouldShowNestedItems) {
              // Map nested subItem paths to their sub-module names
              const nestedSubItemPathMap: Record<string, string> = {
                '/interview/templates': 'interview_process',
                '/interview/round/1': 'interview_process',
                '/interview/round/2': 'interview_process',
                '/interview/round/3': 'interview_process',
                '/interview/round/final': 'interview_process',
                '/interview/selected': 'interview_process',
                '/interview/candidate/progress': 'interview_process',
              };
              
              // Filter nested subItems if parent module is not selected
              let filteredNestedItems = item.subItems;
              if (!sidebarPerms.includes(module)) {
                // Only show nested items if the parent item's sub-module is selected
                // For interview_process, all nested items should be shown if interview_process is selected
                filteredNestedItems = item.subItems; // Show all nested items for the selected sub-module
              }
              
              menuItem.children = filteredNestedItems.map((subItem) => {
                const SubIconComponent = subItem.icon;
                return {
                  key: subItem.path,
                  icon: <SubIconComponent size={16} />,
                  label: subItem.label,
                };
              });
            }
          }

          return menuItem;
        });

        // Only create parent menu item if there are accessible children
        // This ensures that if only sub-modules are selected but none match, the parent won't show
        if (children.length === 0) {
          return null; // Don't show parent if no accessible children
        }
        
        // Create parent menu item
        const IconComponent = config.icon;
        const parentItem: any = {
          key: config.mainPath,
          icon: <IconComponent size={16} />,
          label: config.label,
          children: children,
        };
        
        return parentItem;
      })
      .filter((item: any) => item !== null && item !== undefined); // Remove null/undefined items (modules with no accessible children or no permission)
  }, [currentUser, (currentUser as any)?.sidebarPermissions ? JSON.stringify([...(currentUser as any).sidebarPermissions].sort()) : '']);

  // Combine employee and admin menu items (hide My Learning when LMS access is disabled)
  const menuItems: MenuProps["items"] = useMemo(() => {
    const baseEmployeeItems = lmsAccessEnabled
      ? employeeMenuItems
      : (employeeMenuItems ?? []).filter((item) => item != null && "key" in item && item.key !== MY_LEARNING_MENU_KEY);
    
    // Separate notifications from other items to ensure it's always last
    const notificationsItem = baseEmployeeItems.find((item) => item != null && "key" in item && item.key === "/notifications");
    const otherEmployeeItems = baseEmployeeItems.filter((item) => item == null || !("key" in item) || item.key !== "/notifications");
    
    const items: MenuProps["items"] = [...otherEmployeeItems];
    
    // Add divider and admin section if admin items exist
    if (adminMenuItems.length > 0) {
      items.push({
        type: 'divider' as const,
        key: 'admin-divider',
      });
      
      // Add admin section header (only visible when not collapsed)
      if (!collapsed) {
        items.push({
          key: 'admin-section',
          label: <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase' }}>Admin Access</span>,
          type: 'group' as const,
          children: adminMenuItems,
        });
      } else {
        // When collapsed, just add the items without group
        items.push(...adminMenuItems);
      }
    }
    
    // Always add notifications at the end
    if (notificationsItem) {
      items.push(notificationsItem);
    }
    
    return items;
  }, [employeeMenuItems, adminMenuItems, collapsed, lmsAccessEnabled]);

  const handleMenuClick = ({ key, keyPath }: { key: string; keyPath?: string[] }) => {
    // Only navigate if it's a valid path (not a group or divider)
    if (key && key !== 'admin-section' && key !== 'admin-divider' && !key.startsWith('admin-')) {
      // Check if key is a valid route path
      if (key.startsWith('/')) {
        const sidebarPerms = currentUser && currentUser.role === 'Employee' 
          ? ((currentUser as any).sidebarPermissions || [])
          : [];
        
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
          'attendance_monitoring': 'staff',
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
          // Grievance sub-modules
          'grievance_all': 'grievance',
          'grievance_analytics': 'grievance',
          'grievance_settings': 'grievance',
        };
        
        // Get unique parent modules from sidebarPermissions
        const parentModules = new Set<string>();
        sidebarPerms.forEach((perm: string) => {
          if (ADMIN_MENU_CONFIG[perm]) {
            parentModules.add(perm);
          } else if (subModuleToParentMap[perm]) {
            parentModules.add(subModuleToParentMap[perm]);
          }
        });
        
        // First, check if this key matches any submenu item (including nested subItems)
        // This ensures submenu items navigate directly
        let isSubmenuItem = false;
        for (const module of parentModules) {
          const submenus = ADMIN_SUBMENUS[module];
          if (submenus) {
            for (const submenu of submenus) {
              // Check main submenu path
              if (key === submenu.path) {
                isSubmenuItem = true;
                break;
              }
              // Check nested subItems
              if (submenu.subItems) {
                for (const subItem of submenu.subItems) {
                  if (key === subItem.path) {
                    isSubmenuItem = true;
                    break;
                  }
                }
              }
              if (isSubmenuItem) break;
            }
          }
          if (isSubmenuItem) break;
        }
        
        // If it's a submenu item, navigate directly
        if (isSubmenuItem) {
          try {
            navigate(key);
            if (window.innerWidth < 1024) {
              onClose();
            }
            return;
          } catch (error) {
            console.error('Navigation error:', error);
            return;
          }
        }
        
        // Check if this is a parent menu item with children
        // Only check if it's not already identified as a submenu item
        let isParentMenu = false;
        for (const module of parentModules) {
          const config = ADMIN_MENU_CONFIG[module];
          if (config && key === config.mainPath) {
            // This is a parent menu - check if it has children
            const submenus = ADMIN_SUBMENUS[module];
            if (submenus && submenus.length > 0) {
              isParentMenu = true;
              // Navigate to first child instead
              const firstChild = submenus[0];
              if (firstChild && firstChild.path) {
                try {
                  navigate(firstChild.path);
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                  return;
                } catch (error) {
                  console.error('Navigation error:', error);
                  return;
                }
              }
            }
            break;
          }
        }
        
        // Regular navigation for other items (not parent menus or submenu items)
        if (!isParentMenu && !isSubmenuItem) {
          try {
            navigate(key);
            // Close mobile drawer when navigating
            if (window.innerWidth < 1024) {
              onClose();
            }
          } catch (error) {
            console.error('Navigation error:', error);
          }
        }
      }
    }
  };

  const handleOpenChange = (keys: string[]) => {
    // Get currently selected keys (active menu items)
    const selectedKeys = getSelectedKeys();
    
    // Find all parent menu keys that should remain open because they have active children
    const requiredOpenKeys = new Set<string>();
    
    // Check employee menu items
    if (selectedKeys.some(key => key.startsWith('/employee/performance'))) {
      requiredOpenKeys.add('/employee/performance');
    }
    
    // Check admin menu items
    const sidebarPerms = currentUser && currentUser.role === 'Employee' 
      ? ((currentUser as any).sidebarPermissions || [])
      : [];
    
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
      'attendance_monitoring': 'staff',
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
      'lms_dashboard': 'lms',
      'course_library': 'lms',
      'learners': 'lms',
      'live_session': 'lms',
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
      // Grievance sub-modules
      'grievance_all': 'grievance',
      'grievance_analytics': 'grievance',
      'grievance_settings': 'grievance',
    };
    
    // Get unique parent modules
    const parentModules = new Set<string>();
    sidebarPerms.forEach((perm: string) => {
      if (ADMIN_MENU_CONFIG[perm]) {
        parentModules.add(perm);
      } else if (subModuleToParentMap[perm]) {
        parentModules.add(subModuleToParentMap[perm]);
      }
    });
    
    // Check if any selected key is a child of an admin menu
    for (const module of parentModules) {
      const config = ADMIN_MENU_CONFIG[module];
      const submenus = ADMIN_SUBMENUS[module];
      
      if (config && submenus) {
        const mainPath = config.mainPath;
        
        // Check if any selected key matches this module's submenus
        const hasActiveChild = selectedKeys.some(selectedKey => {
          // Check main path
          if (selectedKey === mainPath || selectedKey.startsWith(mainPath + '/')) {
            return true;
          }
          
          // Check submenu paths
          for (const submenu of submenus) {
            if (selectedKey === submenu.path || selectedKey.startsWith(submenu.path + '/')) {
              return true;
            }
            // Check nested subItems
            if (submenu.subItems) {
              for (const subItem of submenu.subItems) {
                if (selectedKey === subItem.path || selectedKey.startsWith(subItem.path + '/')) {
                  return true;
                }
              }
            }
          }
          return false;
        });
        
        if (hasActiveChild) {
          requiredOpenKeys.add(mainPath);
        }
      }
    }
    
    // Merge required keys with user-selected keys
    // If a required key is being closed, keep it open
    const finalOpenKeys = [...new Set([...keys, ...Array.from(requiredOpenKeys)])];
    
    setOpenKeys(finalOpenKeys);
  };

  // Determine selected keys based on current path
  const getSelectedKeys = () => {
    const path = location.pathname;
    const selected: string[] = [];
    const pathWithoutQuery = path.split('?')[0];
    
    // Check if path matches any admin submenu item
    const sidebarPerms = currentUser && currentUser.role === 'Employee' 
      ? ((currentUser as any).sidebarPermissions || [])
      : [];
    
    // Map sub-modules to parent modules for permission checking
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
      'attendance_monitoring': 'staff',
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
      'lms_dashboard': 'lms',
      'course_library': 'lms',
      'learners': 'lms',
      'live_session': 'lms',
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
      // Grievance sub-modules
      'grievance_all': 'grievance',
      'grievance_analytics': 'grievance',
      'grievance_settings': 'grievance',
    };
    
    // Get unique parent modules from sidebarPermissions (either direct parent or mapped from sub-module)
    const parentModules = new Set<string>();
    sidebarPerms.forEach((perm: string) => {
      if (ADMIN_MENU_CONFIG[perm]) {
        // It's a parent module
        parentModules.add(perm);
      } else if (subModuleToParentMap[perm]) {
        // It's a sub-module, map to parent
        parentModules.add(subModuleToParentMap[perm]);
      }
    });
    
    // Collect all possible matches with their specificity (higher = more specific)
    const matches: Array<{ path: string; specificity: number; pathLength: number }> = [];
    
    // First, collect all possible matches from admin submenus
    // Sort submenus by path length (longer paths first) to prioritize more specific matches
    for (const module of parentModules) {
      const submenus = ADMIN_SUBMENUS[module];
      if (submenus) {
        // Sort submenus by path length (descending) to check more specific paths first
        const sortedSubmenus = [...submenus].sort((a, b) => {
          const aPath = a.path.split('?')[0];
          const bPath = b.path.split('?')[0];
          return bPath.length - aPath.length;
        });
        
        for (const submenu of sortedSubmenus) {
          // Check nested subItems first (most specific - specificity 4)
          if (submenu.subItems && submenu.subItems.length > 0) {
            // Sort subItems by path length (descending) to check more specific paths first
            const sortedSubItems = [...submenu.subItems].sort((a, b) => {
              const aPath = a.path.split('?')[0];
              const bPath = b.path.split('?')[0];
              return bPath.length - aPath.length;
            });
            
            for (const subItem of sortedSubItems) {
              const subItemPath = subItem.path.split('?')[0];
              // Exact match gets highest priority
              if (pathWithoutQuery === subItemPath) {
                matches.push({ path: subItem.path, specificity: 4, pathLength: subItemPath.length });
              } else if (pathWithoutQuery.startsWith(subItemPath + '/')) {
                matches.push({ path: subItem.path, specificity: 3, pathLength: subItemPath.length });
              }
            }
          }
          // Then check main submenu path (specificity 2)
          const submenuPath = submenu.path.split('?')[0];
          // Exact match gets higher priority
          if (pathWithoutQuery === submenuPath) {
            matches.push({ path: submenu.path, specificity: 2, pathLength: submenuPath.length });
          } else if (pathWithoutQuery.startsWith(submenuPath + '/')) {
            matches.push({ path: submenu.path, specificity: 2, pathLength: submenuPath.length });
          }
        }
      }
      
      // Check main menu path (specificity 1 - lowest priority)
      // Only add if no submenu item has matched yet
      const config = ADMIN_MENU_CONFIG[module];
      if (config) {
        const mainPath = config.mainPath.split('?')[0];
        // Check if any submenu item matches this exact path
        const hasExactSubmenuMatch = submenus?.some(submenu => {
          const submenuPath = submenu.path.split('?')[0];
          return pathWithoutQuery === submenuPath;
        });
        
        // Only add main path if:
        // 1. We're on the exact main path AND no submenu item matches it exactly
        // 2. OR we're on a child path of main path AND no submenu matches
        if (pathWithoutQuery === mainPath && !hasExactSubmenuMatch) {
          matches.push({ path: config.mainPath, specificity: 1, pathLength: mainPath.length });
        } else if (pathWithoutQuery.startsWith(mainPath + '/')) {
          // Only add main path if no submenu matches
          const hasSubmenuMatch = matches.some(m => m.specificity >= 2);
          if (!hasSubmenuMatch) {
            matches.push({ path: config.mainPath, specificity: 1, pathLength: mainPath.length });
          }
        }
      }
    }
    
    // Select the most specific match (highest specificity, then longest path)
    if (matches.length > 0) {
      matches.sort((a, b) => {
        // First sort by specificity (higher is better)
        if (b.specificity !== a.specificity) {
          return b.specificity - a.specificity;
        }
        // If specificity is equal, sort by path length (longer is more specific)
        return b.pathLength - a.pathLength;
      });
      selected.push(matches[0].path);
      return selected;
    }
    
    
    // Handle employee routes (check most specific first)
    if (pathWithoutQuery.startsWith('/employee/performance/self-assessment')) {
      if (pathWithoutQuery === '/employee/performance/self-assessment' || pathWithoutQuery.startsWith('/employee/performance/self-assessment/')) {
        selected.push('/employee/performance/self-assessment');
        return selected;
      }
    }
    if (pathWithoutQuery.startsWith('/employee/performance/review/')) {
      selected.push('/employee/performance/reviews');
      return selected;
    }
    if (pathWithoutQuery === '/employee/performance/my-goals') {
      selected.push('/employee/performance/my-goals');
      return selected;
    }
    if (pathWithoutQuery.startsWith('/employee/performance/')) {
      // Match specific employee performance routes
      const perfRoutes = [
        '/employee/performance/overview',
        '/employee/performance/reviews',
        '/employee/performance/self-assessment',
        '/employee/performance/my-goals',
      ];
      for (const route of perfRoutes) {
        if (pathWithoutQuery === route || pathWithoutQuery.startsWith(route + '/')) {
          selected.push(route);
          return selected;
        }
      }
      // Fallback to general performance
      selected.push('/employee/performance/overview');
      return selected;
    }
    
    // Check other employee routes
    const employeeRoutes = [
      '/employee/dashboard',
      '/employee/requests',
      '/employee/salary',
      '/employee/holidays',
      '/employee/attendance',
      '/employee/assets',
      '/employee/tasks',
      '/employee/announcements',
      '/employee/profile',
      '/grievances/my',
      '/grievances/raise',
    ];
    for (const route of employeeRoutes) {
      if (pathWithoutQuery === route || pathWithoutQuery.startsWith(route + '/')) {
        selected.push(route);
        return selected;
      }
    }
    
    // Default: return current path
    if (pathWithoutQuery) {
      selected.push(pathWithoutQuery);
    }
    return selected;
  };

  // Auto-open submenus based on current route
  useEffect(() => {
    const path = location.pathname;
    const newOpenKeys: string[] = [];
    
    // Open employee performance submenu
    if (path.startsWith('/employee/performance')) {
      newOpenKeys.push('/employee/performance');
    }
    
    // Open admin menu submenus based on current path
    const sidebarPerms = currentUser && currentUser.role === 'Employee' 
      ? ((currentUser as any).sidebarPermissions || [])
      : [];
    
    const pathWithoutQuery = path.split('?')[0];
    
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
      'attendance_monitoring': 'staff',
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
      'lms_dashboard': 'lms',
      'course_library': 'lms',
      'learners': 'lms',
      'live_session': 'lms',
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
    
    // Get unique parent modules from sidebarPermissions
    const parentModules = new Set<string>();
    sidebarPerms.forEach((perm: string) => {
      if (ADMIN_MENU_CONFIG[perm]) {
        parentModules.add(perm);
      } else if (subModuleToParentMap[perm]) {
        parentModules.add(subModuleToParentMap[perm]);
      }
    });
    
    for (const module of parentModules) {
      const config = ADMIN_MENU_CONFIG[module];
      const submenus = ADMIN_SUBMENUS[module];
      
      if (config && submenus) {
        const mainPath = config.mainPath.split('?')[0];
        
        // Check if we're in any submenu of this module (including nested)
        const isInModule = submenus.some((submenu) => {
          const submenuPath = submenu.path.split('?')[0];
          // Check main submenu path
          if (pathWithoutQuery === submenuPath || pathWithoutQuery.startsWith(submenuPath + '/')) {
            return true;
          }
          // Check nested subItems
          if (submenu.subItems) {
            return submenu.subItems.some((subItem) => {
              const subItemPath = subItem.path.split('?')[0];
              return pathWithoutQuery === subItemPath || pathWithoutQuery.startsWith(subItemPath + '/');
            });
          }
          return false;
        });
        
        // Also check if we're on the main path
        const isOnMainPath = pathWithoutQuery === mainPath || pathWithoutQuery.startsWith(mainPath + '/');
        
        if (isInModule || isOnMainPath) {
          newOpenKeys.push(config.mainPath);
        }
      }
    }
    
    // Update open keys
    if (newOpenKeys.length > 0) {
      setOpenKeys((prevKeys) => {
        // Keep existing keys that are still relevant, add new ones
        const relevantKeys = prevKeys.filter(key => {
          // Keep if it's an employee menu key
          if (key.startsWith('/employee/')) {
            return path.startsWith(key);
          }
          // Keep if it's an admin menu key that's still relevant
          return newOpenKeys.includes(key);
        });
        return [...new Set([...relevantKeys, ...newOpenKeys])];
      });
    } else {
      // If no keys should be open, clear employee performance if not on that path
      setOpenKeys((prevKeys) => {
        return prevKeys.filter(key => {
          if (key === '/employee/performance') {
            return path.startsWith('/employee/performance');
          }
          return true;
        });
      });
    }
  }, [location.pathname, currentUser]);

  const selectedKeys = getSelectedKeys();

  // Sidebar content - reusable for both desktop and mobile (matches admin Sidebar layout with toggle)
  const sidebarContent = (
    <aside
      data-collapsed={collapsed ? "true" : undefined}
      className={`employee-sidebar-aside flex flex-col h-full transition-all duration-300 ${collapsed ? "w-20 overflow-x-hidden" : "w-64 overflow-y-auto"}`}
      style={{ backgroundColor: '#2C2C2C' }}
    >
      <div
        className={`flex items-center border-b border-gray-700 min-h-[4.5rem] transition-all duration-300 ${collapsed ? "justify-center p-2" : "justify-between p-4"}`}
      >
        {!collapsed && (
          <div className="flex-1 flex items-center justify-center min-w-0">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="h-12 w-auto object-contain max-w-full"
              />
            ) : (
              <div className="text-center">
                <h1 className="text-xl font-bold text-white truncate">Employee Portal</h1>
                <p className="text-xs text-white/60 mt-0.5">askeva HRMS</p>
              </div>
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
          type="button"
          onClick={() => onCollapse(!collapsed)}
          className="p-2 rounded-[5px] hover:bg-yellow-500/20 transition-colors flex-shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`w-5 h-5 text-white/80 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? "px-0 py-2" : "p-4"}`}>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          onOpenChange={handleOpenChange}
          inlineCollapsed={collapsed}
          className="employee-sidebar-menu"
          style={{
            borderRight: 0,
            height: "100%",
            background: "transparent",
            width: collapsed ? 80 : "100%",
          }}
          theme="dark"
        />
        <style>{`
          .employee-sidebar-menu {
            background: transparent !important;
          }
          .employee-sidebar-menu .ant-menu-item {
            border-radius: 5px !important;
            margin: 4px 0 !important;
            height: auto !important;
            line-height: 1.5 !important;
            padding: 8px 12px !important;
          }
          .employee-sidebar-menu .ant-menu-item-selected {
            background: hsl(var(--primary)) !important;
            color: white !important;
            font-weight: 600 !important;
          }
          .employee-sidebar-menu .ant-menu-item:hover {
            background: hsl(var(--primary) / 0.3) !important;
            color: white !important;
          }
          .employee-sidebar-menu .ant-menu-item a,
          .employee-sidebar-menu .ant-menu-item span {
            color: rgba(255, 255, 255, 0.8) !important;
          }
          .employee-sidebar-menu .ant-menu-item-selected a,
          .employee-sidebar-menu .ant-menu-item-selected span {
            color: white !important;
          }
          .employee-sidebar-menu .ant-menu-submenu {
            border-radius: 5px !important;
            margin: 4px 0 !important;
          }
          .employee-sidebar-menu .ant-menu-submenu-title {
            border-radius: 5px !important;
            padding: 8px 12px !important;
            margin: 0 !important;
          }
          .employee-sidebar-menu .ant-menu-submenu-selected > .ant-menu-submenu-title {
            background: hsl(var(--primary)) !important;
            color: white !important;
          }
          .employee-sidebar-menu .ant-menu-submenu-title:hover {
            background: hsl(var(--primary) / 0.3) !important;
            color: white !important;
          }
          .employee-sidebar-menu .ant-menu-submenu-inline > .ant-menu-submenu-title .ant-menu-submenu-arrow {
            color: rgba(255, 255, 255, 0.6) !important;
          }
          .employee-sidebar-menu .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-submenu-arrow {
            color: white !important;
          }
          .employee-sidebar-menu .ant-menu-sub .ant-menu-item {
            margin-left: 16px !important;
            padding-left: 24px !important;
          }
          .employee-sidebar-menu .ant-menu-sub .ant-menu-item-selected {
            background: hsl(var(--primary) / 0.5) !important;
            border-left: 2px solid hsl(var(--primary)) !important;
          }
        `}</style>
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar - Fixed position with toggle, same pattern as admin Sidebar */}
      <div
        data-collapsed={collapsed ? "true" : undefined}
        className={`employee-sidebar hidden lg:block fixed left-0 top-0 h-screen shadow-lg z-[105] transition-all duration-300 ${collapsed ? "w-20 overflow-hidden" : "w-64 overflow-y-auto"}`}
        style={{ backgroundColor: '#2C2C2C' }}
      >
        {sidebarContent}
      </div>

      {/* Mobile Sidebar - Use Sheet; no collapse on mobile, full width */}
      <Sheet open={mobileOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64 rounded-none overflow-y-auto" style={{ backgroundColor: '#2C2C2C' }}>
          <aside className="w-64 flex flex-col overflow-y-auto h-full" style={{ backgroundColor: '#2C2C2C' }}>
            <div className="p-4 border-b border-gray-700">
              {companyLogo ? (
                <div className="flex justify-center">
                  <img 
                    src={companyLogo} 
                    alt="Company Logo" 
                    className="h-12 w-auto object-contain"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-white text-center">Employee Portal</h1>
                  <p className="text-xs text-white/60 text-center mt-0.5">askeva HRMS</p>
                </>
              )}
            </div>
            <nav className="flex-1 p-4">
              <Menu
                mode="inline"
                selectedKeys={selectedKeys}
                openKeys={openKeys}
                items={menuItems}
                onClick={handleMenuClick}
                onOpenChange={handleOpenChange}
                inlineCollapsed={false}
                className="employee-sidebar-menu"
                theme="dark"
                style={{ borderRight: 0, height: "100%", background: "transparent" }}
              />
            </nav>
          </aside>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default EmployeeSidebar;
