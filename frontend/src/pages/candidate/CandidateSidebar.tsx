import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Upload,
  FileCheck,
  Receipt,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const CandidateSidebar = ({
  mobileOpen = false,
  onClose = () => {},
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) => {
  const location = useLocation();

  const menus = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/candidate/dashboard" },
    { icon: Briefcase, label: "Job Openings", path: "/candidate/job-vacancies" },
    { icon: FileText, label: "Application Status", path: "/candidate/applications" },
    { icon: Receipt, label: "Job Offers", path: "/candidate/offers" },
    { icon: FileCheck, label: "Background Verification", path: "/candidate/background-verification" },
    { icon: Upload, label: "Onboarding Documents", path: "/candidate/onboarding-documents" },
    // { icon: Upload, label: "Update Resume", path: "/candidate/resume" },
    { icon: User, label: "Profile", path: "/candidate/profile" },
  ];

  const content = (
    <aside className="w-74 flex flex-col overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-sidebar-foreground text-center">askeva HRMS</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">Candidate Portal</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menus.map((item) => {
          // Special handling for Profile: highlight for both /profile and /candidate/history routes
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
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
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
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen w-64 bg-sidebar shadow-lg z-50 overflow-y-auto">
        {content}
      </div>

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar rounded-none overflow-y-auto">
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CandidateSidebar;

