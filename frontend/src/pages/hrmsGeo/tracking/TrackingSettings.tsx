import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, BarChart3, FileText, Settings, HelpCircle, ChevronRight, Users } from "lucide-react";
import { Link } from "react-router-dom";

const TrackingSettings = () => {
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
          <Tabs defaultValue="settings" className="w-full">
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

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Settings</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Access settings related to task assignment here
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Select Staff for Timeline Access</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select staff who will be able to see their timeline on the staff app
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
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

export default TrackingSettings;
