import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, List, Plus, BarChart3, Settings, Search, Filter, Download, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const TasksList = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks List</h1>
            <p className="text-muted-foreground mt-1">Access Tasks completed by your staff here</p>
          </div>

          <Tabs defaultValue="list" className="w-full">
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

            <TabsContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tasks List</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input placeholder="Search" className="pl-10 w-[200px]" />
                      </div>
                      <Button variant="outline">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">29...</span>
                      </div>
                      <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Tabs defaultValue="all" className="w-full">
                      <TabsList>
                        <TabsTrigger value="all">All Tasks</TabsTrigger>
                        <TabsTrigger value="pending">Pending Verification</TabsTrigger>
                        <TabsTrigger value="requests">Tasks Requests</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Task ID</th>
                            <th className="text-left p-3 text-sm font-medium">Status</th>
                            <th className="text-left p-3 text-sm font-medium">Earliest Completion Date</th>
                            <th className="text-left p-3 text-sm font-medium">Latest Completion Date</th>
                            <th className="text-left p-3 text-sm font-medium">Actual Start Date</th>
                            <th className="text-left p-3 text-sm font-medium">Task Completion Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={7} className="p-8 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <ClipboardCheck className="w-16 h-16 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">No Tasks Found</p>
                                <p className="text-sm text-muted-foreground mt-2">No tasks match your search criteria</p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
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

export default TasksList;
