import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Upload,
  FileCheck,
  Receipt,
  Bell,
  ChevronLeft,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useGetBusinessQuery } from "@/store/api/settingsApi";

const CandidateSidebar = ({
  mobileOpen = false,
  onClose = () => {},
  collapsed = false,
  onCollapse = () => {},
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}) => {
  const location = useLocation();
  
  // Fetch business data for company logo
  const { data: businessData } = useGetBusinessQuery();
  const companyLogo = businessData?.data?.business?.logo;

  const menus = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/candidate/dashboard" },
    { icon: Briefcase, label: "Job Openings", path: "/candidate/job-vacancies" },
    { icon: FileText, label: "Application Status", path: "/candidate/applications" },
    { icon: Receipt, label: "Job Offers", path: "/candidate/offers" },
    { icon: FileCheck, label: "Background Verification", path: "/candidate/background-verification" },
    { icon: Upload, label: "Onboarding Documents", path: "/candidate/onboarding-documents" },
    { icon: User, label: "Profile", path: "/candidate/profile" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
  ];

  // Desktop sidebar content with toggle and collapse support
  const desktopContent = (
    <aside
      data-collapsed={collapsed ? "true" : undefined}
      className={`flex flex-col h-full transition-all duration-300 ${collapsed ? "w-20 overflow-x-hidden" : "w-64 overflow-y-auto"}`}
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
                <h1 className="text-xl font-bold text-white truncate">askeva HRMS</h1>
                <p className="text-xs text-white/60 mt-0.5">Candidate Portal</p>
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onCollapse(!collapsed)}
          className="p-2 rounded-[5px] hover:bg-yellow-500/20 flex-shrink-0 h-9 w-9"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`w-5 h-5 text-white/80 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${collapsed ? "px-0 py-2" : "p-4"} space-y-1`}>
        {menus.map((item) => {
          const isActive = item.path === "/candidate/profile"
            ? (location.pathname === "/candidate/profile" ||
               location.pathname === "/candidate/history" ||
               location.pathname === "/profile")
            : (location.pathname === item.path || location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center rounded-[5px] transition-all ${
                collapsed ? "justify-center p-2.5" : "gap-3 p-2"
              } ${
                isActive
                  ? "bg-primary text-white font-semibold shadow-md"
                  : "text-white/80 hover:bg-primary/30"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );

  // Mobile: full content (no collapse)
  const mobileContent = (
    <aside className="w-64 flex flex-col overflow-y-auto" style={{ backgroundColor: '#2C2C2C' }}>
      <div className="p-6 border-b border-gray-700">
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
            <h1 className="text-2xl font-bold text-white text-center">askeva HRMS</h1>
            <p className="text-sm text-white/60 text-center mt-1">Candidate Portal</p>
          </>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menus.map((item) => {
          const isActive = item.path === "/candidate/profile"
            ? (location.pathname === "/candidate/profile" ||
               location.pathname === "/candidate/history" ||
               location.pathname === "/profile")
            : (location.pathname === item.path || location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 p-2 rounded-[5px] transition-all ${
                isActive
                  ? "bg-primary text-white font-semibold shadow-md"
                  : "text-white/80 hover:bg-primary/30"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar - fixed with toggle, same pattern as EmployeeSidebar / Sidebar */}
      <div
        data-collapsed={collapsed ? "true" : undefined}
        className={`hidden lg:block fixed left-0 top-0 h-screen shadow-lg z-[105] transition-all duration-300 ${collapsed ? "w-20 overflow-hidden" : "w-64 overflow-y-auto"}`}
        style={{ backgroundColor: '#2C2C2C' }}
      >
        {desktopContent}
      </div>

      {/* Mobile Drawer - no collapse, full menu */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="left" className="p-0 w-64 rounded-none overflow-y-auto" style={{ backgroundColor: '#2C2C2C' }}>
          {mobileContent}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CandidateSidebar;

