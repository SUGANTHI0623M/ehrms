import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, List, Plus, BarChart3, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const AssignTask = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assign Task</h1>
            <p className="text-muted-foreground mt-1">Create and assign new tasks to staff members</p>
          </div>

          <Tabs defaultValue="assign" className="w-full">
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

            <TabsContent value="assign" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Task</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Create and assign new tasks to staff members</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Staff</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="harsha">Harsha Varthannan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Task Title</label>
                        <Input placeholder="Enter task title" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea 
                        className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                        placeholder="Enter task description"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Earliest Completion Date</label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Latest Completion Date</label>
                        <Input type="date" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Customer</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer1">Customer 1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Assign Task</Button>
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

export default AssignTask;
