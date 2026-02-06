import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, HelpCircle, Video, FileQuestion, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const HelpOutage = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const outages = [
    {
      reason: "Location permission not determined",
      description: "The worker did not grant location permissions. For iOS 11/12: Open app, allow 'Always'. For iOS 13+: Open app, allow 'Allow While in Use' then 'Change to Always Allow' or go to Settings > App Name > Location > 'Always'."
    },
    {
      reason: "Location unavailable battery saver",
      description: "Android OS disables location services when battery saver is on and the screen is locked. Turn off Battery Saver in Settings > Battery > Battery saver."
    },
    {
      reason: "Low battery",
      description: "The worker's phone is turned off because of low battery."
    },
    {
      reason: "Notifications permission denied",
      description: "Notifications permission was denied by the worker. Check system prompts or Settings > Apps > App Name > Notifications."
    },
    {
      reason: "Airplane mode detected",
      description: "The worker has activated airplane mode on the phone."
    },
    {
      reason: "Uninstalled",
      description: "App detected that the worker uninstalled the app."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Header onMenuClick={() => setMobileOpen(!mobileOpen)} />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Help</h1>
            <p className="text-muted-foreground mt-1">Technical support and educational resources</p>
          </div>

          <Tabs defaultValue="outage" className="w-full">
            <TabsList>
              <TabsTrigger value="outage" asChild>
                <Link to="/hrms-geo/help/outage">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Outage
                </Link>
              </TabsTrigger>
              <TabsTrigger value="videos" asChild>
                <Link to="/hrms-geo/help/videos">
                  <Video className="w-4 h-4 mr-2" />
                  Help Videos
                </Link>
              </TabsTrigger>
              <TabsTrigger value="faqs" asChild>
                <Link to="/hrms-geo/help/faqs">
                  <FileQuestion className="w-4 h-4 mr-2" />
                  FAQs
                </Link>
              </TabsTrigger>
              <TabsTrigger value="location" asChild>
                <Link to="/hrms-geo/settings/location">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location Settings
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outage" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service Status Report</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Behavioral Outages</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {outages.map((outage, index) => (
                      <Card key={index}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
                            <div className="flex-1">
                              <p className="text-red-600 font-semibold mb-2">Outage Reason: {outage.reason}</p>
                              <p className="text-sm text-muted-foreground">{outage.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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

export default HelpOutage;
