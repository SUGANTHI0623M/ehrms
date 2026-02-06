import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, Users, MapPin, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useGetStaffQuery, useUpdateStaffMutation } from "@/store/api/staffApi";
import { message } from "antd";

const LocationSettings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch staff (excluding employees)
  const { data: staffData, isLoading, refetch } = useGetStaffQuery({
    search: debouncedSearch || undefined,
    status: "Active",
    page: currentPage,
    limit: pageSize,
  });

  const [updateStaff] = useUpdateStaffMutation();

  const allStaff = staffData?.data?.staff || [];
  
  // Filter to show only staff (exclude employees with role='Employee')
  const filteredStaff = allStaff.filter((staff) => {
    return staff.role !== "Employee";
  });

  // Handle location access toggle
  const handleLocationAccessToggle = async (staffId: string, currentValue: boolean) => {
    try {
      await updateStaff({
        id: staffId,
        data: { locationAccess: !currentValue },
      }).unwrap();
      message.success(`Location access ${!currentValue ? "enabled" : "disabled"} successfully`);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update location access");
    }
  };

  const totalCount = filteredStaff.length;

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
                      <Input 
                        placeholder="Search by name or staff ID" 
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">
                      Staff ({totalCount})
                    </h3>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : filteredStaff.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No staff found
                    </div>
                  ) : (
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
                          {filteredStaff.map((staff) => (
                            <tr key={staff._id} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{staff.name}</span>
                                </div>
                              </td>
                              <td className="p-3 text-sm">{staff.employeeId}</td>
                              <td className="p-3 text-sm">{staff.phone}</td>
                              <td className="p-3">
                                <Switch 
                                  checked={staff.locationAccess || false}
                                  onCheckedChange={() => handleLocationAccessToggle(staff._id, staff.locationAccess || false)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
