import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  DollarSign,
  Calendar,
  ClipboardList,
  Clock,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  BookOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";

interface EmployeeSidebarProps {
  mobileOpen?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onCollapse?: (collapsed: boolean) => void;
}

const EmployeeSidebar = ({
  mobileOpen = false,
  collapsed = false,
  onClose = () => { },
  onCollapse = () => { },
}: EmployeeSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuProps["items"] = [
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
      key: "/lms/employee/dashboard",
      icon: <BookOutlined />,
      label: "My Learning",
    },
    {
      key: "/lms/employee/live-sessions",
      icon: <VideoCameraOutlined />,
      label: "Live Sessions",
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    // Close mobile drawer when navigating
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const selectedKeys = [location.pathname];
  const openKeys: string[] = [];

  // Sidebar content - reusable for both desktop and mobile
  const sidebarContent = (
    <aside className="w-64 flex flex-col overflow-y-auto h-full bg-white">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-sidebar-foreground text-center">Employee Portal</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">askeva HRMS</p>
      </div>

      <nav className="flex-1 p-4">
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          inlineCollapsed={collapsed}
          style={{
            borderRight: 0,
            height: "100%"
          }}
        />
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar - Fixed position exactly like CandidateSidebar */}
      <div
        className="hidden lg:block fixed left-0 top-0 h-screen bg-white shadow-lg z-50 overflow-y-auto"
        style={{
          width: collapsed ? '80px' : '256px',
          transition: 'width 0.2s',
        }}
      >
        {sidebarContent}
      </div>

      {/* Mobile Sidebar - Use Sheet like CandidateSidebar */}
      <Sheet open={mobileOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="p-0 w-64 bg-white rounded-none overflow-y-auto">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default EmployeeSidebar;
