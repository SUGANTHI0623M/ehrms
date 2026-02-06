import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, BarChart3, FileText, Settings, HelpCircle, Calendar, Car, Footprints, AlertCircle, Map } from "lucide-react";
import { Link } from "react-router-dom";

const Timeline = () => {
  const timelineEvents = [
    { time: "11:07 AM", type: "location", description: "Ward 91, Zone 7 Ambattur, Ayanambakkam, Ambattur, Thiruvallur District, Tamil Nadu, 600037, India" },
    { time: "12:14 PM", type: "drive", description: "Drive - 0.15 km in 14m" },
    { time: "12:28 PM", type: "stop", description: "Stop - 3h 10m" },
    { time: "03:39 PM", type: "walk", description: "Walk - 0 km in 11m" },
    { time: "03:51 PM", type: "drive", description: "Drive - 1.45 km in 14m" },
    { time: "04:05 PM", type: "outage", description: "Outage - 8m", alert: "Tracking service terminated" },
    { time: "04:13 PM", type: "stop", description: "Stop - 1h 3m" },
    { time: "05:17 PM", type: "drive", description: "Drive - 0.19 km in 17m" },
    { time: "05:34 PM", type: "stop", description: "Stop - 1h 48m" },
    { time: "07:23 PM", type: "geotag", description: "Geotag - Punch Out", id: "2d837870bb0d028e126b94fb9e0986e6" },
    { time: "07:23 PM", type: "stopped", description: "Tracking Stopped" },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "location":
      case "geotag":
        return <MapPin className="w-4 h-4" />;
      case "drive":
        return <Car className="w-4 h-4" />;
      case "walk":
        return <Footprints className="w-4 h-4" />;
      case "stop":
        return <Map className="w-4 h-4" />;
      case "outage":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

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
          <Tabs defaultValue="timeline" className="w-full">
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

            <TabsContent value="timeline" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Timeline</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Individual staff member activity timeline
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="harsha">
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="harsha">Harsha Varthannan (ASKEV...)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">29 Jan 2026</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Timeline List */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {timelineEvents.map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              event.type === "outage" ? "bg-red-100 text-red-600" :
                              event.type === "geotag" ? "bg-blue-100 text-blue-600" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {getIcon(event.type)}
                            </div>
                            {index < timelineEvents.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-2"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.time}</span>
                              <span className="text-sm text-muted-foreground">{event.description}</span>
                            </div>
                            {event.alert && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                {event.alert}
                              </div>
                            )}
                            {event.id && (
                              <div className="mt-2">
                                <Button variant="outline" size="sm">Punch Out</Button>
                                <p className="text-xs text-muted-foreground mt-1">{event.id}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Map View */}
                    <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Map className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">Map View</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Interactive map showing route and locations
                        </p>
                      </div>
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

export default Timeline;
