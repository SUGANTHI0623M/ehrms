import Sidebar from "@/components/Sidebar";
import CandidateSidebar from "@/pages/candidate/CandidateSidebar";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { ReactNode, useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export default function MainLayout({ children, sidebar }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isCandidate = currentUser?.role === "Candidate";
  const isEmployee = currentUser?.role === "Employee" || currentUser?.role === "EmployeeAdmin";

  // Use custom sidebar if provided, otherwise use role-based default
  const renderSidebar = () => {
    if (sidebar) {
      return sidebar;
    }
    if (isCandidate) {
      return <CandidateSidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />;
    }
    if (isEmployee) {
      return (
        <EmployeeSidebar 
          mobileOpen={sidebarOpen}
          collapsed={collapsed}
          onClose={() => setSidebarOpen(false)} 
          onCollapse={(collapsed) => setCollapsed(collapsed)}
        />
      );
    }
    return <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />;
  };

  const handleMenuClick = () => {
    // Check screen size
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
      // Mobile: toggle mobile sidebar for all roles
      setSidebarOpen(!sidebarOpen);
    } else if (isEmployee) {
      // Desktop for employees: toggle collapse
      setCollapsed(!collapsed);
    }
    // For other roles on desktop, sidebar is always visible (no toggle needed)
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Handles both mobile (Drawer/Sheet) and desktop (Fixed) */}
      {renderSidebar()}

      {/* Main Content Area - Consistent layout matching CandidateSidebar pattern */}
      <div 
        className={`flex-1 w-full transition-all duration-300 ${
          // For desktop: apply margin based on role and collapse state
          isEmployee 
            ? (collapsed ? 'lg:ml-20' : 'lg:ml-64')  // Employee: 80px when collapsed, 256px when expanded
            : 'lg:ml-64'  // All other roles: always 256px (64 * 4)
        }`}
      >
        <Header onMenuClick={handleMenuClick} />

        <main className="pt-14 sm:pt-16 lg:pt-16 min-h-[calc(100vh-4rem)]">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
