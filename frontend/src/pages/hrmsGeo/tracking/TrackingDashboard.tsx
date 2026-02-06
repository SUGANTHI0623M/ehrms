import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, BarChart3, FileText, Settings, HelpCircle, Calendar, Search, Download, RotateCw, Map } from "lucide-react";
import { Link } from "react-router-dom";

const TrackingDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor real-time and historical location data of field teams</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList>
              <TabsTrigger value="live" asChild>
                <Link to="/hrms-geo/tracking/live">
                  <Navigation className="w-4 h-4 mr-2" />
                  Live Tracking
                </Link>
              </TabsTrigger>
              <TabsTrigger value="timeline" asChild>
                <Link to="/hrms-geo/tracking/timeline">
                  <MapPin className="w-4 h-4 mr-2" />
                  Timeline
                </Link>
              </TabsTrigger>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/tracking/dashboard">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </TabsTrigger>
              <TabsTrigger value="reports" asChild>
                <Link to="/hrms-geo/tracking/reports">
                  <FileText className="w-4 h-4 mr-2" />
                  Reports
                </Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/tracking/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Dashboard</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Date-based tracking metrics
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">29 Jan 2026</span>
                      </div>
                      <Button variant="outline" size="sm">
                        <RotateCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                      <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Distance</p>
                            <p className="text-2xl font-bold mt-1">4.1 kms</p>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                            <Map className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Time</p>
                            <p className="text-2xl font-bold mt-1">8 hrs 53 mins</p>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Time Spent in Motion</p>
                            <p className="text-2xl font-bold mt-1">55 mins</p>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Navigation className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Time Spent in Rest</p>
                            <p className="text-2xl font-bold mt-1">7 hrs 57 mins</p>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Search and Filter */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search by name or staff ID"
                        className="pl-10"
                      />
                    </div>
                    <Button variant="outline">Filter</Button>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Name</th>
                          <th className="text-left p-3 text-sm font-medium">Status</th>
                          <th className="text-left p-3 text-sm font-medium">Total Distance</th>
                          <th className="text-left p-3 text-sm font-medium">Total Time</th>
                          <th className="text-left p-3 text-sm font-medium">Total time in motion</th>
                          <th className="text-left p-3 text-sm font-medium">Total time at rest</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <span className="text-blue-600 cursor-pointer">Harsha Varthannan</span>
                          </td>
                          <td className="p-3 text-sm">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Traveled</span>
                          </td>
                          <td className="p-3 text-sm">4.1 kms</td>
                          <td className="p-3 text-sm">8 hrs 53 mins</td>
                          <td className="p-3 text-sm">55 mins</td>
                          <td className="p-3 text-sm">7 hrs 57 mins</td>
                        </tr>
                      </tbody>
                    </table>
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

export default TrackingDashboard;
