import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft, Users, Search, DollarSign, X } from "lucide-react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useGetPayrollsQuery, useLazyViewPayslipQuery } from "@/store/api/payrollApi";
import { useGetStaffQuery, useGetStaffByIdQuery } from "@/store/api/staffApi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  calculateSalaryStructure,
  formatCurrency as formatSalaryCurrency,
  type SalaryStructureInputs,
  type CalculatedSalaryStructure
} from "@/utils/salaryStructureCalculation.util";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import MainLayout from "@/components/MainLayout";
import { Pagination } from "@/components/ui/Pagination";

interface SalaryOverviewProps {
  employeeId?: string; // For when used in a tab
}

const SalaryOverview = ({ employeeId: propEmployeeId }: SalaryOverviewProps = {}) => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const employeeId = propEmployeeId || routeId; // Use prop if provided, otherwise route param
  const [selectedMonth, setSelectedMonth] = useState<any>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeId || "");
  
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

  // Fetch staff list for selection (only when no employeeId and not in tab)
  const { data: staffListData, isLoading: isLoadingStaff } = useGetStaffQuery(
    {
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: pageSize,
    },
    { skip: !!employeeId || !!propEmployeeId }
  );

  const staffList = staffListData?.data?.staff || [];
  const staffPagination = staffListData?.data?.pagination;

  // Update selectedEmployeeId when route changes - this ensures component updates on navigation
  useEffect(() => {
    const newEmployeeId = propEmployeeId || routeId;
    if (newEmployeeId && newEmployeeId !== selectedEmployeeId) {
      setSelectedEmployeeId(newEmployeeId);
    } else if (!newEmployeeId) {
      setSelectedEmployeeId("");
    }
  }, [routeId, propEmployeeId, location.pathname]); // Added location.pathname to detect route changes

  // Handle employee selection
  const handleEmployeeSelect = (staffId: string) => {
    setSelectedEmployeeId(staffId);
    navigate(`/staff-overview/${staffId}`);
  };

  // Use selectedEmployeeId for fetching payroll data
  const currentEmployeeId = employeeId || selectedEmployeeId;

  // Fetch employee details when viewing individual employee - refetch when route changes
  const { data: employeeData } = useGetStaffByIdQuery(currentEmployeeId || "", {
    skip: !currentEmployeeId || (!propEmployeeId && !routeId),
    refetchOnMountOrArgChange: true // Ensure data refetches when route changes
  });

  // Fetch payroll data for the staff member
  const { data: payrollData, isLoading: isLoadingPayroll } = useGetPayrollsQuery({
    employeeId: currentEmployeeId,
    page: 1,
    limit: 100, // Get all payroll records
  }, {
    skip: !currentEmployeeId
  });

  const payrolls = payrollData?.data?.payrolls || [];

  // Transform payroll data to display format
  const salaryData = payrolls.map((payroll) => {
    const date = new Date(payroll.year, payroll.month - 1, 1);
    const lastDay = new Date(payroll.year, payroll.month, 0);
    return {
      id: payroll._id,
      month: format(date, "MMMM yyyy"),
      duration: `${format(date, "dd MMMM yyyy")} - ${format(lastDay, "dd MMMM yyyy")}`,
      dueAmount: `₹ ${payroll.netPay?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      payroll: payroll
    };
  }).sort((a, b) => {
    // Sort by date descending (newest first)
    const dateA = new Date(a.payroll.year, a.payroll.month - 1);
    const dateB = new Date(b.payroll.year, b.payroll.month - 1);
    return dateB.getTime() - dateA.getTime();
  });

  // If no employee ID and not in tab, show staff list
  if (!currentEmployeeId && !propEmployeeId) {
    const staffListContent = (
      <div className="container max-w-7xl mx-auto w-full p-4 sm:p-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
              Salary Overview
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
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
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
                          <TableHead className="text-center">Action</TableHead>
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
                                View Salary
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
    );

    return <MainLayout>{staffListContent}</MainLayout>;
  }

  // Get selected employee name for display
  const selectedEmployee = staffList.find((s) => s._id === currentEmployeeId);

  // If used standalone (not in a tab), wrap with MainLayout
  const content = (
    <div className={`w-full ${propEmployeeId ? '' : 'container max-w-7xl mx-auto p-4 sm:p-6'}`}>
      <div className="space-y-6">
        {/* Header - Only show when not in tab */}
        {!propEmployeeId && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/staff-overview');
                  }
                }}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Salary Overview</h1>
                {(selectedEmployee || employeeData?.data?.staff) && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {(selectedEmployee || employeeData?.data?.staff)?.name} ({(selectedEmployee || employeeData?.data?.staff)?.employeeId})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Salary Structure */}
        {employeeData?.data?.staff?.salary && 'basicSalary' in employeeData.data.staff.salary && (
          <Card>
            <CardHeader>
              <CardTitle>Current Salary Structure</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const staffSalary = employeeData.data.staff.salary as SalaryStructureInputs;
                const calculatedSalary = calculateSalaryStructure(staffSalary);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Monthly Gross</p>
                        <p className="text-2xl font-bold">
                          {formatSalaryCurrency(calculatedSalary.monthly.grossSalary)}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Monthly Net</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatSalaryCurrency(calculatedSalary.monthly.netMonthlySalary)}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total CTC</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatSalaryCurrency(calculatedSalary.totalCTC)}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Basic: {formatSalaryCurrency(calculatedSalary.monthly.basicSalary)} | 
                      DA: {formatSalaryCurrency(calculatedSalary.monthly.dearnessAllowance)} | 
                      HRA: {formatSalaryCurrency(calculatedSalary.monthly.houseRentAllowance)}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Salary Records</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 mt-4">
            {isLoadingPayroll ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                {/* If NO MONTH SELECTED → List View */}
                {!selectedMonth && (
                  <>

                    {salaryData.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No salary records found</p>
                        <p className="text-sm">No payroll records available for this employee.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {salaryData.map((item, index) => (
                          <div
                            key={index}
                            onClick={() => setSelectedMonth(item)}
                            className="border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/40 cursor-pointer transition"
                          >
                            <div className="flex items-start gap-4 w-full sm:w-auto">
                              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-semibold shrink-0">
                                ₹
                              </div>
                              <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-semibold">{item.month}</h2>
                                <p className="text-sm text-muted-foreground">
                                  Duration: {item.duration}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-left sm:text-right">
                                <p className="text-sm text-muted-foreground">Due Amount</p>
                                <p className="text-lg font-semibold">{item.dueAmount}</p>
                              </div>
                              <ChevronRight className="text-muted-foreground shrink-0" size={22} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* If MONTH SELECTED → Detailed Salary Structure UI */}
                {selectedMonth && selectedMonth.payroll && (
                  <div className="space-y-6">
                    {/* Back Button */}
                    <Button
                      onClick={() => setSelectedMonth(null)}
                      className="w-full sm:w-auto"
                    >
                      <ArrowLeft size={18} className="mr-1" /> Back
                    </Button>

                    {/* Header */}
                    <h2 className="text-xl font-semibold">
                      Salary Details — {selectedMonth.month}
                    </h2>

                    {/* Salary Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Gross Salary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">₹ {selectedMonth.payroll.grossSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Deductions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-destructive">₹ {selectedMonth.payroll.deductions?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">₹ {selectedMonth.payroll.netPay?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Salary Components */}
                    {selectedMonth.payroll.components && selectedMonth.payroll.components.length > 0 && (
                      <div className="space-y-6">
                        {/* Earnings */}
                        <div>
                          <h3 className="font-semibold text-lg mb-3">Earnings</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Component</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedMonth.payroll.components
                                  .filter((comp: any) => comp.type === 'earning')
                                  .map((comp: any, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell>{comp.name}</TableCell>
                                      <TableCell className="text-right">₹ {comp.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Deductions */}
                        <div>
                          <h3 className="font-semibold text-lg mb-3">Deductions</h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Component</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedMonth.payroll.components
                                  .filter((comp: any) => comp.type === 'deduction')
                                  .map((comp: any, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell>{comp.name}</TableCell>
                                      <TableCell className="text-right">₹ {comp.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</TableCell>
                                    </TableRow>
                                  ))}
                                {selectedMonth.payroll.components.filter((comp: any) => comp.type === 'deduction').length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">No deductions</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status and Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/40 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-semibold capitalize">{selectedMonth.payroll.status}</p>
                      </div>
                      {selectedMonth.payroll.payslipUrl && selectedMonth.payroll._id && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              const blob = await viewPayslip(selectedMonth.payroll._id).unwrap();
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, '_blank');
                              setTimeout(() => window.URL.revokeObjectURL(url), 100);
                            } catch (error: any) {
                              console.error('Failed to view payslip:', error);
                            }
                          }}
                        >
                          View Payslip
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // If used in a tab (propEmployeeId provided), return without MainLayout
  if (propEmployeeId) {
    return content;
  }

  // If used standalone, wrap with MainLayout
  return <MainLayout>{content}</MainLayout>;
};

export default SalaryOverview;
