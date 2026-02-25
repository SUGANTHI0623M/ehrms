import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, HelpCircle, Video, FileQuestion, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const HelpVideos = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const brands = ["OnePlus", "Samsung", "VIVO", "Redmi", "POCO", "OPPO", "Realme"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Help</h1>
            <p className="text-muted-foreground mt-1">Technical support and educational resources</p>
          </div>

          <Tabs defaultValue="videos" className="w-full">
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

            <TabsContent value="videos" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>App Whitelisting Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <div
                        key={brand}
                        className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpanded(expanded === brand ? null : brand)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{brand}</span>
                          {expanded === brand ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        {expanded === brand && (
                          <div className="mt-4 p-4 bg-muted rounded">
                            <p className="text-sm text-muted-foreground">Video tutorials for {brand} device configuration</p>
                          </div>
                        )}
                      </div>
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

export default HelpVideos;
