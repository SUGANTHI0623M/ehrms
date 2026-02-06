import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DollarSign, 
  Download, 
  Send, 
  CheckCircle, 
  Clock, 
  Plus, 
  Edit, 
  FileDown,
  Users,
  FileText,
  X,
  Search
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  useGetPayrollsQuery, 
  useGetPayrollStatsQuery, 
  useProcessPayrollMutation, 
  useGeneratePayrollMutation,
  useBulkGeneratePayrollMutation,
  useMarkPayrollAsPaidMutation,
  useGeneratePayslipMutation,
  useLazyViewPayslipQuery,
  useLazyDownloadPayslipQuery,
  useLazyExportPayrollQuery,
  useUpdatePayrollMutation
} from "@/store/api/payrollApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { message } from "antd";
import { format } from "date-fns";

const Payroll = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset to page 1 when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Dialog states
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isBulkGenerateDialogOpen, setIsBulkGenerateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [generateMonth, setGenerateMonth] = useState(currentDate.getMonth() + 1);
  const [generateYear, setGenerateYear] = useState(currentDate.getFullYear());

  const { data: payrollsData, isLoading: isLoadingPayrolls, refetch: refetchPayrolls } = useGetPayrollsQuery({
    month: selectedMonth,
    year: selectedYear,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchQuery && searchQuery.trim().length > 0 ? searchQuery.trim() : undefined,
    page: currentPage,
    limit: pageSize
  });

  const { data: statsData, isLoading: isLoadingStats } = useGetPayrollStatsQuery({
    month: selectedMonth,
    year: selectedYear
  });

  const { data: staffData } = useGetStaffQuery({
    status: "Active",
    limit: 1000
  }, { skip: !isGenerateDialogOpen && !isBulkGenerateDialogOpen });

  const [processPayroll, { isLoading: isProcessing }] = useProcessPayrollMutation();
  // const [generatePayroll, { isLoading: isGenerating }] = useGeneratePayrollMutation();
  const [bulkGeneratePayroll, { isLoading: isBulkGenerating }] = useBulkGeneratePayrollMutation();
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkPayrollAsPaidMutation();
  const [generatePayslip, { isLoading: isGeneratingPayslip }] = useGeneratePayslipMutation();
  const [viewPayslip] = useLazyViewPayslipQuery();
  const [downloadPayslip] = useLazyDownloadPayslipQuery();
  const [updatePayroll] = useUpdatePayrollMutation();
  const [exportPayroll] = useLazyExportPayrollQuery();
  const [generatePayroll, { isLoading: isGenerating }] = useGeneratePayrollMutation();

  const stats = statsData?.data?.stats;
  const payrolls = payrollsData?.data?.payrolls || [];
  const pagination = payrollsData?.data?.pagination;
  const staffList = staffData?.data?.staff || [];

  // const handleGeneratePayroll = async () => {
  //   try {
  //     const result = await generatePayroll({ month: currentMonth, year: currentYear }).unwrap();
  //     message.success(
  //       `Payroll generated successfully! Generated: ${result.data.generated}, Skipped: ${result.data.skipped}, Errors: ${result.data.errors}`
  //     );
  //     if (result.data.errors > 0) {
  //       console.warn('Payroll generation errors:', result.data.details.errors);
  //     }
  //   } catch (error: any) {
  //     message.error(error?.data?.error?.message || "Failed to generate payroll");
  //   }
  // };

  const handleProcessPayroll = async () => {
    try {
      await processPayroll({ month: selectedMonth, year: selectedYear }).unwrap();
      message.success("Payroll processed successfully!");
      refetchPayrolls();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to process payroll");
    }
  };

  const handleGeneratePayroll = () => {
    if (!selectedEmployeeId) {
      message.error("Please select an employee");
      return;
    }
    setIsGenerateDialogOpen(false);
    navigate(`/payroll/preview?employeeId=${selectedEmployeeId}&month=${generateMonth}&year=${generateYear}`);
    setSelectedEmployeeId("");
  };

  const handleBulkGeneratePayroll = () => {
    setIsBulkGenerateDialogOpen(false);
    navigate(`/payroll/preview?bulk=true&month=${generateMonth}&year=${generateYear}`);
  };

  const handleMarkAsPaid = async (payrollId: string) => {
    try {
      await markAsPaid(payrollId).unwrap();
      message.success("Payroll marked as paid!");
      refetchPayrolls();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to mark payroll as paid");
    }
  };

  const handleGeneratePayslip = async (payrollId: string) => {
    try {
      const result = await generatePayslip(payrollId).unwrap();
      if (result.data.payslipUrl) {
        // Use view endpoint to open in new tab
        await handleViewPayslip(payrollId);
        message.success("Payslip generated successfully!");
      }
      refetchPayrolls();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to generate payslip");
    }
  };

  const handleViewPayslip = async (payrollId: string) => {
    try {
      const blob = await viewPayslip(payrollId).unwrap();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up the URL after a delay to allow the browser to load it
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to view payslip");
    }
  };

  const handleDownloadPayslip = async (payrollId: string, employeeName: string, month: number, year: number) => {
    try {
      const blob = await downloadPayslip(payrollId).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      a.download = `Payslip_${employeeName}_${monthNames[month - 1]}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Payslip downloaded successfully!");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to download payslip");
    }
  };

  const handleExportPayroll = async () => {
    try {
      const result = await exportPayroll({
        month: selectedMonth,
        year: selectedYear,
        status: statusFilter !== "all" ? statusFilter : undefined
      }).unwrap();
      
      // Create download link
      const url = window.URL.createObjectURL(result);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${selectedYear}_${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Payroll exported successfully!");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to export payroll");
    }
  };

  const handleEditPayroll = (payroll: any) => {
    setSelectedPayroll(payroll);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePayroll = async (payrollId: string, data: any) => {
    try {
      await updatePayroll({ id: payrollId, data }).unwrap();
      message.success("Payroll updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedPayroll(null);
      refetchPayrolls();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update payroll");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(amount);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: new Date(2000, i).toLocaleString('default', { month: 'long' })
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payroll Management</h1>

            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={handleExportPayroll}
                className="flex-1 sm:flex-none"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsBulkGenerateDialogOpen(true)}
                className="flex-1 sm:flex-none"
              >
                <Users className="w-4 h-4 mr-2" />
                Bulk Generate
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsGenerateDialogOpen(true)}
                className="flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate
              </Button>
              <Button 
                onClick={handleProcessPayroll}
                disabled={isProcessing}
                className="flex-1 sm:flex-none"
              >
                <Send className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Process"}
              </Button>
            </div>
          </div>

          {/* FILTERS */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label>Month</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Processed">Processed</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by employee name or ID..."
                      className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    {searchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                        onClick={() => handleSearchChange("")}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SUMMARY CARD */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                {[
                  { label: "Period", value: `${monthOptions[selectedMonth - 1]?.label} ${selectedYear}` },
                  { label: "Total Employees", value: stats?.totalEmployees || 0 },
                  { label: "Total Payroll", value: `₹${stats ? formatCurrency(stats.totalPayroll) : "0"}` },
                  { label: "Processed", value: stats?.processed || 0, class: "text-green-600" },
                  { label: "Pending", value: stats?.pending || 0, class: "text-red-600" },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className={`text-lg font-bold ${item.class || "text-foreground"}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* METRIC BOXES */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Gross Salary</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {isLoadingStats ? "Loading..." : `₹${stats ? formatCurrency(stats.totalPayroll) : "0"}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Deductions</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {isLoadingStats ? "Loading..." : `₹${stats ? formatCurrency(stats.totalDeductions) : "0"}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">PF, ESI, Tax</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Net Payable</CardTitle>
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {isLoadingStats ? "Loading..." : `₹${stats ? formatCurrency(stats.netPayable) : "0"}`}
                </div>
                <p className="text-xs text-success mt-1">Ready to disburse</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Processed</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {isLoadingStats ? "Loading..." : stats?.processed || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Out of {stats?.totalEmployees || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* EMPLOYEE PAYROLL TABLE */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Payroll Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPayrolls ? (
                <div className="text-center py-8 text-muted-foreground">Loading payroll data...</div>
              ) : payrolls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payroll records found</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Deductions</TableHead>
                          <TableHead className="text-right">Net Pay</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrolls.map((payroll) => {
                          // Handle both populated and aggregated employee data
                          const employee = (payroll.employeeId as any);
                          const employeeName = employee?.name || (typeof employee === 'object' && employee !== null ? employee.name : null) || "N/A";
                          const employeeId = employee?.employeeId || (typeof employee === 'object' && employee !== null ? employee.employeeId : null) || "";
                          const designation = employee?.designation || (typeof employee === 'object' && employee !== null ? employee.designation : null) || "N/A";
                          
                          return (
                            <TableRow key={payroll._id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{employeeName}</div>
                                  <div className="text-sm text-muted-foreground">{employeeId}</div>
                                </div>
                              </TableCell>
                              <TableCell>{designation}</TableCell>
                              <TableCell className="text-right">₹{formatCurrency(payroll.grossSalary)}</TableCell>
                              <TableCell className="text-right text-red-600">₹{formatCurrency(payroll.deductions)}</TableCell>
                              <TableCell className="text-right text-green-600 font-semibold">₹{formatCurrency(payroll.netPay)}</TableCell>
                              <TableCell>
                                <Badge variant={payroll.status === "Paid" ? "default" : payroll.status === "Processed" ? "secondary" : "outline"}>
                                  {payroll.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <TooltipProvider>
                                  <div className="flex items-center justify-center gap-2">
                                    {payroll.payslipUrl ? (
                                      <>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleDownloadPayslip(
                                                payroll._id,
                                                employeeName !== "N/A" ? employeeName : 'Employee',
                                                payroll.month,
                                                payroll.year
                                              )}
                                            >
                                              <Download className="w-4 h-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Download PDF</p>
                                          </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleViewPayslip(payroll._id)}
                                            >
                                              <FileText className="w-4 h-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>View in new tab</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleGeneratePayslip(payroll._id)}
                                            disabled={isGeneratingPayslip}
                                          >
                                            <FileText className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Generate payslip</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditPayroll(payroll)}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Edit payroll</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    {payroll.status !== "Paid" && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleMarkAsPaid(payroll._id)}
                                            disabled={isMarkingPaid}
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Mark as paid</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {pagination && pagination.pages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={pagination.page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                          disabled={pagination.page === pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* GENERATE PAYROLL DIALOG */}
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Payroll</DialogTitle>
                <DialogDescription>
                  Generate payroll for an employee based on salary structure and attendance
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff: any) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name} ({staff.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Month</Label>
                    <Select value={generateMonth.toString()} onValueChange={(v) => setGenerateMonth(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={generateYear.toString()} onValueChange={(v) => setGenerateYear(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleGeneratePayroll} disabled={isGenerating || !selectedEmployeeId}>
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* BULK GENERATE PAYROLL DIALOG */}
          <Dialog open={isBulkGenerateDialogOpen} onOpenChange={setIsBulkGenerateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Generate Payroll</DialogTitle>
                <DialogDescription>
                  Generate payroll for all active employees for the selected period
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Month</Label>
                    <Select value={generateMonth.toString()} onValueChange={(v) => setGenerateMonth(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={generateYear.toString()} onValueChange={(v) => setGenerateYear(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkGenerateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleBulkGeneratePayroll} disabled={isBulkGenerating}>
                  {isBulkGenerating ? "Generating..." : "Generate All"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* EDIT PAYROLL DIALOG */}
          {selectedPayroll && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Payroll</DialogTitle>
                  <DialogDescription>
                    Update payroll components and amounts
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Gross Salary</Label>
                      <Input
                        type="number"
                        value={selectedPayroll.grossSalary}
                        onChange={(e) => setSelectedPayroll({ ...selectedPayroll, grossSalary: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Deductions</Label>
                      <Input
                        type="number"
                        value={selectedPayroll.deductions}
                        onChange={(e) => {
                          const deductions = Number(e.target.value);
                          setSelectedPayroll({
                            ...selectedPayroll,
                            deductions,
                            netPay: selectedPayroll.grossSalary - deductions
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Net Pay</Label>
                    <Input
                      type="number"
                      value={selectedPayroll.netPay}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label>Components</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                      {selectedPayroll.components?.map((comp: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{comp.name}</div>
                            <Badge variant={comp.type === 'earning' ? 'default' : 'destructive'} className="text-xs">
                              {comp.type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">₹{formatCurrency(comp.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleUpdatePayroll(selectedPayroll._id, {
                    grossSalary: selectedPayroll.grossSalary,
                    deductions: selectedPayroll.deductions,
                    netPay: selectedPayroll.netPay
                  })}>
                    Update
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </main>
    </MainLayout>
  );
};

export default Payroll;
