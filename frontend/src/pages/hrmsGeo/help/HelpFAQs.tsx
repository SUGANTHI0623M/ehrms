import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, HelpCircle, Video, FileQuestion, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const HelpFAQs = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
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

          <Tabs defaultValue="faqs" className="w-full">
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

            <TabsContent value="faqs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">How do I enable location tracking for staff?</h3>
                      <p className="text-sm text-muted-foreground">Go to HRMS Geo Settings {'>'} Staff Location Access and toggle the switch for the staff member you want to track.</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">What is Geo Fence?</h3>
                      <p className="text-sm text-muted-foreground">Geo Fence allows you to set a geographic boundary. Tasks can only be completed when staff are within this boundary.</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">How do I create a form template?</h3>
                      <p className="text-sm text-muted-foreground">Navigate to Forms {'>'} Templates and click "Create Template" to design your custom form.</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">What is OTP Verification?</h3>
                      <p className="text-sm text-muted-foreground">OTP Verification requires staff to enter a One-Time Password sent to the customer to complete tasks, ensuring task authenticity.</p>
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

export default HelpFAQs;
