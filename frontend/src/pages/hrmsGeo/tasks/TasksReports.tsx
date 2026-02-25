import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck,
  List,
  Plus,
  BarChart3,
  Settings,
  HelpCircle,
  Download,
  FileText,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const TasksReports = () => {
  const location = useLocation();

  // Determine active tab from route - use precise matching
  const getActiveTab = () => {
    const path = location.pathname.split("?")[0]; // Remove query params
    const normalizedPath = path.replace(/\/$/, ""); // Remove trailing slash
    
    // Use precise path matching instead of includes() to avoid false matches
    if (normalizedPath === "/hrms-geo/tasks/dashboard" || normalizedPath.startsWith("/hrms-geo/tasks/dashboard/")) {
      return "dashboard";
    }
    if (normalizedPath === "/hrms-geo/tasks/list" || normalizedPath.startsWith("/hrms-geo/tasks/list/")) {
      return "list";
    }
    if (normalizedPath === "/hrms-geo/tasks/assign" || normalizedPath.startsWith("/hrms-geo/tasks/assign/")) {
      return "assign";
    }
    if (normalizedPath === "/hrms-geo/tasks/reports" || normalizedPath.startsWith("/hrms-geo/tasks/reports/")) {
      return "reports";
    }
    if (normalizedPath === "/hrms-geo/tasks/settings" || normalizedPath.startsWith("/hrms-geo/tasks/settings/")) {
      return "settings";
    }
    // Default to reports if path doesn't match any specific tab
    return "reports";
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate task completion reports and analyze employee productivity
          </p>
        </div>

        <Tabs value={getActiveTab()} className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard" asChild>
              <Link to="/hrms-geo/tasks/dashboard">Dashboard</Link>
            </TabsTrigger>
            <TabsTrigger value="list" asChild>
              <Link to="/hrms-geo/tasks/list">Tasks List</Link>
            </TabsTrigger>
            <TabsTrigger value="assign" asChild>
              <Link to="/hrms-geo/tasks/assign">Assign Task</Link>
            </TabsTrigger>
            <TabsTrigger value="reports" asChild>
              <Link to="/hrms-geo/tasks/reports">Reports</Link>
            </TabsTrigger>
            <TabsTrigger value="settings" asChild>
              <Link to="/hrms-geo/tasks/settings">Task Settings</Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Task Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Overview of tasks done by employees
                  </p>
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Task Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Detailed view of tasks associated with employees
                  </p>
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default TasksReports;
