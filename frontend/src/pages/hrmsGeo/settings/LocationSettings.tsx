import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users, MapPin, Settings } from "lucide-react";
import { Link } from "react-router-dom";

const LocationSettings = () => {
  const staffMembers = [
    { name: "ABILASH S", id: "ASKEVA/MDU-79", phone: "+91 9585837520", enabled: false },
    { name: "ABIRAMI KATHIRESAN", id: "ASKEVA/MDU-93", phone: "+91 6381114196", enabled: false },
    { name: "AMIRTHA VALLI", id: "ASKEVA/MDU-100", phone: "+91 9025734853", enabled: false },
    { name: "Harsha Varthannan", id: "ASKEVA/MDU-96", phone: "+91 9751506163", enabled: true },
    { name: "Hemavathi V", id: "ASKEVA/MDU-105", phone: "+91 8939776886", enabled: false },
    { name: "J SHAROOK", id: "YIT-0005", phone: "+91 8072345995", enabled: false },
    { name: "Judit Asha", id: "ASKEVA/MDU-78", phone: "+91 7305634155", enabled: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Location Settings</h1>
            <p className="text-muted-foreground mt-1">Configure staff location access and tracking permissions</p>
          </div>

          <Tabs defaultValue="location" className="w-full">
            <TabsList>
              <TabsTrigger value="outage" asChild>
                <Link to="/hrms-geo/help/outage">Outage</Link>
              </TabsTrigger>
              <TabsTrigger value="videos" asChild>
                <Link to="/hrms-geo/help/videos">Help Videos</Link>
              </TabsTrigger>
              <TabsTrigger value="faqs" asChild>
                <Link to="/hrms-geo/help/faqs">FAQs</Link>
              </TabsTrigger>
              <TabsTrigger value="location" asChild>
                <Link to="/hrms-geo/settings/location">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location Settings
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="location" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Staff Location Access</CardTitle>
                      <Badge className="bg-green-100 text-green-800 mt-2">0 of 1 Licenses Left</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Staff you have added in your Web subscription will appear here
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input placeholder="Search by name or staff ID" className="pl-10" />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Monthly Regular (34)</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Name</th>
                          <th className="text-left p-3 text-sm font-medium">ID</th>
                          <th className="text-left p-3 text-sm font-medium">Phone Number</th>
                          <th className="text-left p-3 text-sm font-medium">Enable/Disable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffMembers.map((staff, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span>{staff.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm">{staff.id}</td>
                            <td className="p-3 text-sm">{staff.phone}</td>
                            <td className="p-3">
                              <Switch checked={staff.enabled} />
                            </td>
                          </tr>
                        ))}
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

export default LocationSettings;
