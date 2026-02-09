import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, List, Plus, BarChart3, Settings, HelpCircle, Download, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const TasksReports = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks Reports</h1>
            <p className="text-muted-foreground mt-1">Generate task completion reports and analyze employee productivity</p>
          </div>

          <Tabs defaultValue="reports" className="w-full">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Overview of tasks done by employees</p>
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
                    <p className="text-sm text-muted-foreground mb-4">Detailed view of tasks associated with employees</p>
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Form Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Details of forms filled during task completion</p>
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
      </main>
    </div>
  );
};

export default TasksReports;
