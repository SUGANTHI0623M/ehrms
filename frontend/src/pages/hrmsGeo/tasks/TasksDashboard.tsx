import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, List, Plus, BarChart3, Settings, HelpCircle, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const TasksDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor task performance metrics and track daily task trends</p>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/tasks/dashboard">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/tasks/list">
                  <List className="w-4 h-4 mr-2" />
                  Tasks List
                </Link>
              </TabsTrigger>
              <TabsTrigger value="assign" asChild>
                <Link to="/hrms-geo/tasks/assign">
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Task
                </Link>
              </TabsTrigger>
              <TabsTrigger value="reports" asChild>
                <Link to="/hrms-geo/tasks/reports">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/tasks/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Task Settings
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-purple-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tasks</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-purple-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Not yet Started</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-yellow-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Delayed Tasks</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-blue-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">In progress</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-green-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Tasks</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tasks per Day</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">A breakdown of tasks, status wise per day</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="harsha">
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="harsha">Harsha Varthannan</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="last7days">
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last7days">Last 7 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">22 Jan '26 - 28 Jan '26</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-2">
                    {[0, 0, 0, 0, 0, 0, 0].map((_, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-green-200 rounded-t" style={{ height: '4px' }}></div>
                        <span className="text-xs text-muted-foreground">{['22', '23', '24', '25', '26', '27', '28'][i]} Jan</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Top Performers</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Your top performers based on the selected time frame</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="last7days">
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last7days">Last 7 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">22 Jan '26 - 28 Jan '26</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No data available
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

export default TasksDashboard;
