import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, BarChart3, FileText, Settings, HelpCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const LiveTracking = () => {
  const location = useLocation();

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
          <Tabs defaultValue="live" className="w-full">
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

            <TabsContent value="live" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Live Tracking</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Real-time location map view powered by HyperTrack. Shows active workers on map.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">No workers currently being tracked</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Workers will appear here when they are actively being tracked
                      </p>
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

export default LiveTracking;
