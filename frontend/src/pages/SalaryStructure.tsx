import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Receipt, Users, Search, ChevronRight, Upload, FileText, AlertCircle, CheckCircle2, Edit2, Save, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetStaffByIdQuery, useGetStaffQuery } from "@/store/api/staffApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/Pagination";
import SalaryStructureForm from "@/components/SalaryStructureForm";

const SalaryStructure = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(id || "");
  
  // Staff list state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("all");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  // Fetch staff list (only when no id)
  const { data: staffListData, isLoading: isLoadingStaff } = useGetStaffQuery(
    {
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: pageSize,
    },
    { skip: !!id }
  );

  const staffList = staffListData?.data?.staff || [];
  const staffPagination = staffListData?.data?.pagination;

  // Update selectedEmployeeId when id changes
  useEffect(() => {
    if (id) {
      setSelectedEmployeeId(id);
    }
  }, [id]);

  // Handle employee selection
  const handleEmployeeSelect = (staffId: string) => {
    setSelectedEmployeeId(staffId);
    navigate(`/salary-structure/${staffId}`);
  };

  const { data: staffDataResponse, isLoading: isLoadingStaffDetail } = useGetStaffByIdQuery(selectedEmployeeId || "", {
    skip: !selectedEmployeeId
  });

  const staff = staffDataResponse?.data?.staff;

  // If no employee ID, show staff list
  if (!selectedEmployeeId) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Receipt className="w-6 h-6 sm:w-8 sm:h-8" />
                Salary Structure
              </h1>
              <Button variant="outline" onClick={() => navigate('/staff')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Staff
              </Button>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Select Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, employee ID, or designation..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {isLoadingStaff ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No employees found</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staffList.map((staff) => (
                            <TableRow
                              key={staff._id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleEmployeeSelect(staff._id)}
                            >
                              <TableCell className="font-medium">{staff.employeeId}</TableCell>
                              <TableCell className="font-medium">{staff.name}</TableCell>
                              <TableCell>{staff.designation}</TableCell>
                              <TableCell>{staff.department}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    staff.status === "Active"
                                      ? "default"
                                      : staff.status === "On Leave"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {staff.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEmployeeSelect(staff._id);
                                  }}
                                >
                                  View Structure
                                  <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {staffPagination && (
                      <div className="mt-4">
                        <Pagination
                          page={currentPage}
                          pageSize={pageSize}
                          total={staffPagination.total}
                          pages={staffPagination.pages}
                          onPageChange={(newPage) => {
                            setCurrentPage(newPage);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setCurrentPage(1);
                          }}
                          showPageSizeSelector={true}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isLoadingStaffDetail) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full mt-4" />
        </div>
      </MainLayout>
    );
  }

  if (!staff) {
    return (
      <MainLayout>
        <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
          <div className="text-center py-8 text-muted-foreground">
            Staff member not found.
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/salary-structure')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Salary Structure</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {staff.name} ({staff.employeeId})
              </p>
            </div>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                    <AvatarFallback className="text-lg sm:text-xl">
                      {staff.name?.charAt(0).toUpperCase() || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">{staff.name}</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      ID {staff.employeeId} | {staff.staffType} ({staff.designation})
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/staff-profile/${staff._id}`)}>
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/staff-overview/${staff._id}`)}>
                      Salary Overview
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Use SalaryStructureForm component to display and edit salary structure */}
          <SalaryStructureForm 
            staffId={selectedEmployeeId || ''} 
            staff={staff}
            onSave={() => {
              // Refetch staff data after save
              window.location.reload();
            }}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default SalaryStructure;
