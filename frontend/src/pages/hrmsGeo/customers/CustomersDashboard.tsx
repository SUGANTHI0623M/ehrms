import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle2, List, Settings, HelpCircle, Calendar, Users, PlayCircle, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const CustomersDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customers Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor customer service metrics and track service coverage</p>
          </div>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/customers/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/customers/list">Customers List</Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/customers/settings">Customers Settings</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-purple-500 rounded"></div>
                      <div>
                        <p className="text-sm text-muted-foreground">Serving Today</p>
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
                      <CardTitle>Customers Overview</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Number of Customers Added per Day</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="added">
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="added">Customers Added</SelectItem>
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
                        <div className="w-full bg-gray-200 rounded-t" style={{ height: '4px' }}></div>
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
                      <CardTitle>Top Customers Served</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">See the number of tasks performed against customers</p>
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

export default CustomersDashboard;
