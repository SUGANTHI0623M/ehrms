import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ClipboardCheck, List, Plus, BarChart3, Settings, HelpCircle, ChevronRight, FileText, Users, CheckCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const TaskSettings = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Settings</h1>
            <p className="text-muted-foreground mt-1">Access settings related to task assignment here</p>
          </div>

          <Tabs defaultValue="settings" className="w-full">
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

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Settings</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Access settings related to task assignment here</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Manage Custom Fields</h3>
                          <p className="text-sm text-muted-foreground mt-1">Manage custom fields to capture additional details on tasks</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Staff who can schedule tasks</h3>
                          <p className="text-sm text-muted-foreground mt-1">Select staff who will be able to schedule tasks</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Auto Approve Tasks</h3>
                          <p className="text-sm text-muted-foreground mt-1">Tasks sent by employees will be auto approved</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Require Approval on Completed Tasks</h3>
                          <p className="text-sm text-muted-foreground mt-1">Select staff who will require their tasks to be approved upon completion</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Enable OTP Verification</h3>
                        <p className="text-sm text-muted-foreground mt-1">Mandatorily require your staff to complete tasks by filling in a customer-sent OTP</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Enable Geo Fence</h3>
                        <p className="text-sm text-muted-foreground mt-1">Mandatorily require your staff to complete tasks within a specified geo-fence</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TaskSettings;
