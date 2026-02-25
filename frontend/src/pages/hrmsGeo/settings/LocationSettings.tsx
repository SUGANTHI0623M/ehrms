import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Search, Users, MapPin, X } from "lucide-react";
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
  const {
    data: staffData,
    isLoading,
    refetch,
  } = useGetStaffQuery({
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
  const handleLocationAccessToggle = async (
    staffId: string,
    currentValue: boolean,
  ) => {
    try {
      await updateStaff({
        id: staffId,
        data: { locationAccess: !currentValue },
      }).unwrap();
      message.success(
        `Location access ${!currentValue ? "enabled" : "disabled"} successfully`,
      );
      refetch();
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to update location access",
      );
    }
  };

  const totalCount = filteredStaff.length;

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Location Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Configure staff location access and tracking permissions
          </p>
        </div>

        <Tabs defaultValue="location" className="w-full">
          <div className="flex overflow-x-auto pb-1">
            <TabsList className="h-auto p-1 bg-muted/50 justify-start inline-flex min-w-full sm:min-w-0">
              <TabsTrigger
                value="outage"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/help/outage">Outage</Link>
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/help/videos">Help Videos</Link>
              </TabsTrigger>
              <TabsTrigger value="faqs" asChild className="flex-1 sm:flex-none">
                <Link to="/hrms-geo/help/faqs">FAQs</Link>
              </TabsTrigger>
              <TabsTrigger
                value="location"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link
                  to="/hrms-geo/settings/location"
                  className="flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Location Settings
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="location" className="mt-6">
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                <CardTitle className="text-lg sm:text-xl">
                  Staff Location Access
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Staff you have added in your Web subscription will appear here
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by name or staff ID"
                      className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold text-sm sm:text-base">
                    Staff ({totalCount})
                  </h3>
                </div>

                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading access details...
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No staff found
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-3 font-medium min-w-[200px]">
                            Name
                          </th>
                          <th className="text-left p-3 font-medium min-w-[120px]">
                            ID
                          </th>
                          <th className="text-left p-3 font-medium min-w-[150px]">
                            Phone Number
                          </th>
                          <th className="text-center p-3 font-medium min-w-[120px]">
                            Location Access
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredStaff.map((staff) => (
                          <tr
                            key={staff._id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {staff.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {staff.employeeId}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {staff.phone}
                            </td>
                            <td className="p-3 text-center">
                              <Switch
                                checked={staff.locationAccess || false}
                                onCheckedChange={() =>
                                  handleLocationAccessToggle(
                                    staff._id,
                                    staff.locationAccess || false,
                                  )
                                }
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
    </MainLayout>
  );
};

export default LocationSettings;
