import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Search, Users, X } from "lucide-react";
import { useGetStaffQuery, useUpdateStaffMutation } from "@/store/api/staffApi";
import { message } from "antd";
import { Pagination } from "@/components/ui/pagination";

const HRMSGeoSettings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default page size
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search - reset to page 1 when search changes
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch staff with pagination
  const {
    data: staffData,
    isLoading,
    refetch,
  } = useGetStaffQuery(
    {
      search: debouncedSearch.trim() || undefined,
      status: "Active",
      page: currentPage,
      limit: pageSize,
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const [updateStaff] = useUpdateStaffMutation();

  const allStaff = staffData?.data?.staff || [];
  const staffPagination = staffData?.data?.pagination;

  // Show ALL staff from current page - no filtering by role
  const filteredStaff = allStaff;

  // Use pagination total if available, otherwise use filtered count
  const totalCount = staffPagination?.total || filteredStaff.length;

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

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

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              HRMS Geo Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Configure HRMS Geo system settings and staff location access
            </p>
          </div>
        </div>

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
                Loading staff access details...
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No staff found
              </div>
            ) : (
              <>
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
                              <span className="font-medium">{staff.name}</span>
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

                {/* Pagination Controls */}
                {staffPagination && staffPagination.pages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground order-2 sm:order-1">
                      Showing {(currentPage - 1) * pageSize + 1} to{" "}
                      {Math.min(currentPage * pageSize, totalCount)} of{" "}
                      {totalCount} staff
                    </div>
                    <div className="order-1 sm:order-2 w-full sm:w-auto">
                      <Pagination
                        page={currentPage}
                        pageSize={pageSize}
                        total={staffPagination.total}
                        pages={staffPagination.pages}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        showPageSizeSelector={true}
                        pageSizeOptions={[10, 20, 50, 100]}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default HRMSGeoSettings;
