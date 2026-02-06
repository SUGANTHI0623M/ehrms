import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, BarChart3, FileText, Settings, HelpCircle, Download } from "lucide-react";
import { Link } from "react-router-dom";

const TrackingReports = () => {
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
          <Tabs defaultValue="reports" className="w-full">
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

            <TabsContent value="reports" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tracking Reports</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generate downloadable reports for compliance, audits, or client deliverables
                      </p>
                    </div>
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Download Timeline Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">Timeline Report</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        List of timeline activities performed by staff over date-range
                      </p>
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </Button>
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

export default TrackingReports;
