import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, X, Calendar, Wallet, FileText, Receipt, Download, Upload, Trash2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useSearchParams } from "react-router-dom";
import { message } from "antd";
import {
  useGetLeavesQuery,
  useCreateLeaveMutation,
} from "@/store/api/leaveApi";
import {
  useGetLoansQuery,
  useCreateLoanMutation,
} from "@/store/api/loanApi";
import {
  useGetReimbursementsQuery,
  useCreateReimbursementMutation,
} from "@/store/api/reimbursementApi";
import {
  useGetPayslipRequestsQuery,
  useCreatePayslipRequestMutation,
} from "@/store/api/payslipRequestApi";
import { useLazyViewPayslipQuery } from "@/store/api/payrollApi";
import { useGetEmployeeProfileQuery } from "@/store/api/employeeApi";
import { useGetLeaveTemplateByIdQuery } from "@/store/api/settingsApi";

const EmployeeRequests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "leave";

  // Leave state
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [leavePage, setLeavePage] = useState(1);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: "" as any,
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Loan state
  const [loanSearch, setLoanSearch] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState("all");
  const [loanPage, setLoanPage] = useState(1);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [loanFormData, setLoanFormData] = useState({
    loanType: "Personal" as const,
    amount: "",
    purpose: "",
    tenure: "",
    interestRate: "0",
  });

  // Expense/Reimbursement state
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [expensePage, setExpensePage] = useState(1);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    type: "Travel" as const,
    amount: "",
    description: "",
    date: "",
  });
  const [expenseProofFiles, setExpenseProofFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payslip Request state
  const [payslipSearch, setPayslipSearch] = useState("");
  const [payslipStatusFilter, setPayslipStatusFilter] = useState("all");
  const [payslipPage, setPayslipPage] = useState(1);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [payslipFormData, setPayslipFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    reason: "",
  });

  // Debounce refs
  const leaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const loanDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const expenseDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const payslipDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [debouncedLeaveSearch, setDebouncedLeaveSearch] = useState("");
  const [debouncedLoanSearch, setDebouncedLoanSearch] = useState("");
  const [debouncedExpenseSearch, setDebouncedExpenseSearch] = useState("");
  const [debouncedPayslipSearch, setDebouncedPayslipSearch] = useState("");

  // Debounce functions
  useEffect(() => {
    if (leaveDebounceRef.current) clearTimeout(leaveDebounceRef.current);
    leaveDebounceRef.current = setTimeout(() => {
      setDebouncedLeaveSearch(leaveSearch);
      setLeavePage(1);
    }, 500);
    return () => {
      if (leaveDebounceRef.current) clearTimeout(leaveDebounceRef.current);
    };
  }, [leaveSearch]);

  useEffect(() => {
    if (loanDebounceRef.current) clearTimeout(loanDebounceRef.current);
    loanDebounceRef.current = setTimeout(() => {
      setDebouncedLoanSearch(loanSearch);
      setLoanPage(1);
    }, 500);
    return () => {
      if (loanDebounceRef.current) clearTimeout(loanDebounceRef.current);
    };
  }, [loanSearch]);

  useEffect(() => {
    if (expenseDebounceRef.current) clearTimeout(expenseDebounceRef.current);
    expenseDebounceRef.current = setTimeout(() => {
      setDebouncedExpenseSearch(expenseSearch);
      setExpensePage(1);
    }, 500);
    return () => {
      if (expenseDebounceRef.current) clearTimeout(expenseDebounceRef.current);
    };
  }, [expenseSearch]);

  useEffect(() => {
    if (payslipDebounceRef.current) clearTimeout(payslipDebounceRef.current);
    payslipDebounceRef.current = setTimeout(() => {
      setDebouncedPayslipSearch(payslipSearch);
      setPayslipPage(1);
    }, 500);
    return () => {
      if (payslipDebounceRef.current) clearTimeout(payslipDebounceRef.current);
    };
  }, [payslipSearch]);

  // API Queries - Only fetch when respective tab is active (lazy loading)
  const { data: leavesData, isLoading: isLoadingLeaves } = useGetLeavesQuery({
    status: leaveStatusFilter !== "all" ? leaveStatusFilter : undefined,
    search: debouncedLeaveSearch || undefined,
    page: leavePage,
    limit: 10,
  }, {
    skip: activeTab !== "leave"
  });

  const { data: loansData, isLoading: isLoadingLoans } = useGetLoansQuery({
    status: loanStatusFilter !== "all" ? loanStatusFilter : undefined,
    search: debouncedLoanSearch || undefined,
    page: loanPage,
    limit: 10,
  }, {
    skip: activeTab !== "loan"
  });

  const { data: expensesData, isLoading: isLoadingExpenses } = useGetReimbursementsQuery({
    status: expenseStatusFilter !== "all" ? expenseStatusFilter : undefined,
    search: debouncedExpenseSearch || undefined,
    page: expensePage,
    limit: 10,
  }, {
    skip: activeTab !== "expense"
  });

  const { data: payslipRequestsData, isLoading: isLoadingPayslips } = useGetPayslipRequestsQuery({
    status: payslipStatusFilter !== "all" ? payslipStatusFilter : undefined,
    search: debouncedPayslipSearch || undefined,
    page: payslipPage,
    limit: 10,
  }, {
    skip: activeTab !== "payslip"
  });

  // Mutations
  const [createLeave, { isLoading: isCreatingLeave }] = useCreateLeaveMutation();
  const [createLoan, { isLoading: isCreatingLoan }] = useCreateLoanMutation();
  const [createExpense, { isLoading: isCreatingExpense }] = useCreateReimbursementMutation();
  const [createPayslipRequest, { isLoading: isCreatingPayslip }] = useCreatePayslipRequestMutation();
  const [viewPayslip] = useLazyViewPayslipQuery();

  // Fetch employee profile to get leave template
  const { data: employeeProfileData } = useGetEmployeeProfileQuery(undefined, {
    skip: activeTab !== "leave"
  });
  
  const leaveTemplateId = employeeProfileData?.data?.staffData?.leaveTemplateId;
  const leaveTemplateIdStr = typeof leaveTemplateId === 'string' 
    ? leaveTemplateId 
    : (leaveTemplateId as any)?._id || '';
  
  // Fetch leave template details
  const { data: leaveTemplateData } = useGetLeaveTemplateByIdQuery(leaveTemplateIdStr, {
    skip: !leaveTemplateIdStr || activeTab !== "leave"
  });
  
  // Get available leave types from template
  const availableLeaveTypes = leaveTemplateData?.data?.template?.leaveTypes || [];

  const leaves = leavesData?.data?.leaves || [];
  const loans = loansData?.data?.loans || [];
  const expenses = expensesData?.data?.reimbursements || [];
  const payslipRequests = payslipRequestsData?.data?.requests || [];
  
  // Set default leave type from template if available (first one from template)
  useEffect(() => {
    if (availableLeaveTypes.length > 0) {
      const firstLeaveType = availableLeaveTypes[0].type;
      if (!leaveFormData.leaveType || leaveFormData.leaveType === "") {
        setLeaveFormData(prev => ({
          ...prev,
          leaveType: firstLeaveType as any
        }));
      } else {
        // Validate that selected leave type is still in template
        const isValidType = availableLeaveTypes.some(lt => lt.type === leaveFormData.leaveType);
        if (!isValidType) {
          setLeaveFormData(prev => ({
            ...prev,
            leaveType: firstLeaveType as any
          }));
        }
      }
    }
  }, [availableLeaveTypes]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Approved: "default",
      Pending: "secondary",
      Rejected: "destructive",
      Active: "default",
      Completed: "default",
      Paid: "default",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateEMI = (amount: number, tenure: number, interestRate: number) => {
    if (interestRate === 0) return amount / tenure;
    const monthlyRate = interestRate / 100 / 12;
    return (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
      (Math.pow(1 + monthlyRate, tenure) - 1);
  };

  const handleCreateLeave = async () => {
    try {
      // Validate dates
      if (!leaveFormData.startDate || !leaveFormData.endDate) {
        message.error("Please select both start and end dates");
        return;
      }

      const startDate = new Date(leaveFormData.startDate);
      const endDate = new Date(leaveFormData.endDate);
      
      if (endDate < startDate) {
        message.error("End date cannot be before start date");
        return;
      }

      const days = calculateDays(leaveFormData.startDate, leaveFormData.endDate);
      
      // Validate against available leave types from template
      if (availableLeaveTypes.length > 0) {
        const selectedLeaveType = availableLeaveTypes.find(
          (lt: any) => lt.type === leaveFormData.leaveType
        );
        
        if (selectedLeaveType) {
          // All leave types are validated per month
          if (days > selectedLeaveType.days) {
            message.error(
              `${leaveFormData.leaveType} leave request exceeds monthly limit. Monthly limit: ${selectedLeaveType.days} days, Requested: ${days} days`
            );
            return;
          }
        }
      }

      await createLeave({
        ...leaveFormData,
        days,
      }).unwrap();
      message.success("Leave request submitted successfully!");
      setIsLeaveDialogOpen(false);
      setLeaveFormData({
        leaveType: availableLeaveTypes.length > 0 ? availableLeaveTypes[0].type : "",
        startDate: "",
        endDate: "",
        reason: "",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to submit leave request");
    }
  };

  const handleCreateLoan = async () => {
    try {
      const emi = calculateEMI(
        Number(loanFormData.amount),
        Number(loanFormData.tenure),
        Number(loanFormData.interestRate)
      );
      await createLoan({
        ...loanFormData,
        amount: Number(loanFormData.amount),
        tenure: Number(loanFormData.tenure),
        interestRate: Number(loanFormData.interestRate),
        emi: Math.round(emi),
        remainingAmount: Number(loanFormData.amount),
      }).unwrap();
      message.success("Loan request submitted successfully!");
      setIsLoanDialogOpen(false);
      setLoanFormData({
        loanType: "Personal",
        amount: "",
        purpose: "",
        tenure: "",
        interestRate: "0",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to submit loan request");
    }
  };

  // Get API URL using same logic as apiSlice
  // This ensures local uses localhost:8000/api and production uses VITE_API_URL
  const getApiUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // Check if hostname is local (localhost, 127.0.0.1, or any local IP)
      const isLocal = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname === '0.0.0.0' ||
                     hostname.startsWith('192.168.') ||
                     hostname.startsWith('10.') ||
                     hostname.startsWith('172.16.') ||
                     hostname === '[::1]';
      
      if (isLocal) {
        // Use localhost for local development
        return 'http://localhost:8000/api';
      }
    }
    
    // For production/non-local environments, use VITE_API_URL from environment
    if (import.meta.env.VITE_API_URL) {
      let apiUrl = import.meta.env.VITE_API_URL.trim();
      // Remove trailing slash if present
      if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl.slice(0, -1);
      }
      // Fix double /api/api issue - normalize to single /api
      if (apiUrl.endsWith('/api/api')) {
        apiUrl = apiUrl.replace(/\/api\/api$/, '/api');
      } else if (!apiUrl.endsWith('/api')) {
        // If it doesn't end with /api, add it
        apiUrl = apiUrl + '/api';
      }
      return apiUrl;
    }
    
    // Fallback: if no VITE_API_URL is set and not local, use current origin
    if (typeof window !== 'undefined') {
      return window.location.origin + '/api';
    }
    
    // Default fallback for SSR or other cases
    return 'http://localhost:8000/api';
  };

  const handleCreateExpense = async () => {
    try {
      // Upload proof files first if any
      let proofFileUrls: string[] = [];
      if (expenseProofFiles.length > 0) {
        message.loading("Uploading proof files...", 0);
        try {
          const uploadPromises = expenseProofFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/reimbursements/upload-proof`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
              body: formData,
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
              throw new Error(data.error?.message || 'Upload failed');
            }
            return data.data.url;
          });
          proofFileUrls = await Promise.all(uploadPromises);
          message.destroy();
        } catch (uploadError: any) {
          message.destroy();
          message.error(uploadError.message || "Failed to upload proof files");
          return;
        }
      }

      // Create reimbursement with proof file URLs
      await createExpense({
        ...expenseFormData,
        amount: Number(expenseFormData.amount),
        proofFiles: proofFileUrls,
      }).unwrap();
      message.success("Expense claim submitted successfully!");
      setIsExpenseDialogOpen(false);
      setExpenseFormData({
        type: "Travel",
        amount: "",
        description: "",
        date: "",
      });
      setExpenseProofFiles([]);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to submit expense claim");
    }
  };

  const handleCreatePayslipRequest = async () => {
    try {
      await createPayslipRequest({
        month: payslipFormData.month,
        year: payslipFormData.year,
        reason: payslipFormData.reason,
      }).unwrap();
      message.success("Payslip request submitted successfully!");
      setIsPayslipDialogOpen(false);
      setPayslipFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        reason: "",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to submit payslip request");
    }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">My Requests</h1>
            <p className="text-muted-foreground mt-1">Manage your leave, loan, expense, and payslip requests</p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setSearchParams({ tab: value }, { replace: true });
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leave">
                <Calendar className="w-4 h-4 mr-2" />
                Leave
              </TabsTrigger>
              <TabsTrigger value="loan">
                <Wallet className="w-4 h-4 mr-2" />
                Loan
              </TabsTrigger>
              <TabsTrigger value="expense">
                <FileText className="w-4 h-4 mr-2" />
                Expense
              </TabsTrigger>
              <TabsTrigger value="payslip">
                <Receipt className="w-4 h-4 mr-2" />
                Payslip
              </TabsTrigger>
            </TabsList>

            {/* Leave Requests Tab */}
            <TabsContent value="leave" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Leave Requests</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={leaveSearch}
                          onChange={(e) => setLeaveSearch(e.target.value)}
                        />
                        {leaveSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setLeaveSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={leaveStatusFilter}
                        onValueChange={(value) => {
                          setLeaveStatusFilter(value);
                          setLeavePage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Apply Leave
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Apply for Leave</DialogTitle>
                            <DialogDescription>Submit a new leave request</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Leave Type</Label>
                              {availableLeaveTypes.length > 0 ? (
                                <Select
                                  value={leaveFormData.leaveType || availableLeaveTypes[0]?.type}
                                  onValueChange={(value: any) =>
                                    setLeaveFormData({ ...leaveFormData, leaveType: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select leave type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableLeaveTypes.map((leaveType: any) => (
                                      <SelectItem key={leaveType.type} value={leaveType.type}>
                                        {leaveType.type} - {leaveType.days} {leaveType.days === 1 ? 'day' : 'days'} per month
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div>
                                  <Select disabled>
                                    <SelectTrigger>
                                      <SelectValue placeholder="No leave template assigned" />
                                    </SelectTrigger>
                                  </Select>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    No leave template assigned. Please contact HR.
                                  </p>
                                </div>
                              )}
                            </div>
                            <div>
                              <Label>Start Date</Label>
                              <Input
                                type="date"
                                value={leaveFormData.startDate}
                                onChange={(e) =>
                                  setLeaveFormData({ ...leaveFormData, startDate: e.target.value })
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label>End Date</Label>
                              <Input
                                type="date"
                                value={leaveFormData.endDate}
                                onChange={(e) =>
                                  setLeaveFormData({ ...leaveFormData, endDate: e.target.value })
                                }
                                required
                              />
                            </div>
                            {leaveFormData.startDate && leaveFormData.endDate && (
                              <div className="space-y-1">
                                <div className="text-sm text-muted-foreground">
                                  Total Days: {calculateDays(leaveFormData.startDate, leaveFormData.endDate)}
                                </div>
                                {availableLeaveTypes.length > 0 && (() => {
                                  const selectedLeaveType = availableLeaveTypes.find(
                                    (lt: any) => lt.type === leaveFormData.leaveType
                                  );
                                  const days = calculateDays(leaveFormData.startDate, leaveFormData.endDate);
                                  if (selectedLeaveType) {
                                    const limit = selectedLeaveType.days;
                                    const remaining = limit - days;
                                    return (
                                      <div className={`text-xs ${days > limit ? 'text-red-600 font-semibold' : remaining < 3 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                                        Monthly limit: {limit} days
                                        {days > limit && ` (Exceeds limit by ${days - limit} days)`}
                                        {days <= limit && ` (${remaining} days remaining)`}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            )}
                            <div>
                              <Label>Reason</Label>
                              <Textarea
                                value={leaveFormData.reason}
                                onChange={(e) =>
                                  setLeaveFormData({ ...leaveFormData, reason: e.target.value })
                                }
                                placeholder="Enter reason for leave"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsLeaveDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateLeave} disabled={isCreatingLeave}>
                              {isCreatingLeave ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLeaves ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : leaves.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No leave requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaves.map((leave: any) => (
                          <TableRow key={leave._id}>
                            <TableCell>{leave.leaveType}</TableCell>
                            <TableCell>{formatDate(leave.startDate)}</TableCell>
                            <TableCell>{formatDate(leave.endDate)}</TableCell>
                            <TableCell>{leave.days}</TableCell>
                            <TableCell>{getStatusBadge(leave.status)}</TableCell>
                            <TableCell>
                              {leave.approvedBy ? (
                                <div>
                                  <div className="font-medium">{leave.approvedBy.name || 'N/A'}</div>
                                  {leave.approvedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(leave.approvedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {leavesData?.data?.pagination && leavesData.data.pagination.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {leavesData.data.pagination.page} of {leavesData.data.pagination.pages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeavePage((p) => Math.max(1, p - 1))}
                          disabled={leavePage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setLeavePage((p) =>
                              Math.min(leavesData.data.pagination.pages, p + 1)
                            )
                          }
                          disabled={leavePage === leavesData.data.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Loan Requests Tab */}
            <TabsContent value="loan" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Loan Requests</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={loanSearch}
                          onChange={(e) => setLoanSearch(e.target.value)}
                        />
                        {loanSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setLoanSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={loanStatusFilter}
                        onValueChange={(value) => {
                          setLoanStatusFilter(value);
                          setLoanPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Request Loan
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Loan</DialogTitle>
                            <DialogDescription>Submit a new loan request</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Loan Type</Label>
                              <Select
                                value={loanFormData.loanType}
                                onValueChange={(value: any) =>
                                  setLoanFormData({ ...loanFormData, loanType: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Personal">Personal</SelectItem>
                                  <SelectItem value="Advance">Advance</SelectItem>
                                  <SelectItem value="Emergency">Emergency</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                value={loanFormData.amount}
                                onChange={(e) =>
                                  setLoanFormData({ ...loanFormData, amount: e.target.value })
                                }
                                placeholder="Enter loan amount"
                                required
                              />
                            </div>
                            <div>
                              <Label>Tenure (Months)</Label>
                              <Input
                                type="number"
                                value={loanFormData.tenure}
                                onChange={(e) =>
                                  setLoanFormData({ ...loanFormData, tenure: e.target.value })
                                }
                                placeholder="Enter tenure in months"
                                required
                              />
                            </div>
                            <div>
                              <Label>Interest Rate (%)</Label>
                              <Input
                                type="number"
                                value={loanFormData.interestRate}
                                onChange={(e) =>
                                  setLoanFormData({ ...loanFormData, interestRate: e.target.value })
                                }
                                placeholder="Enter interest rate"
                                step="0.1"
                              />
                            </div>
                            {loanFormData.amount &&
                              loanFormData.tenure &&
                              Number(loanFormData.amount) > 0 &&
                              Number(loanFormData.tenure) > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Estimated EMI: ₹
                                  {Math.round(
                                    calculateEMI(
                                      Number(loanFormData.amount),
                                      Number(loanFormData.tenure),
                                      Number(loanFormData.interestRate)
                                    )
                                  )}
                                </div>
                              )}
                            <div>
                              <Label>Purpose</Label>
                              <Textarea
                                value={loanFormData.purpose}
                                onChange={(e) =>
                                  setLoanFormData({ ...loanFormData, purpose: e.target.value })
                                }
                                placeholder="Enter purpose of loan"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsLoanDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateLoan} disabled={isCreatingLoan}>
                              {isCreatingLoan ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loan Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>EMI</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLoans ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : loans.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No loan requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        loans.map((loan: any) => (
                          <TableRow key={loan._id}>
                            <TableCell>{loan.loanType}</TableCell>
                            <TableCell>₹{loan.amount.toLocaleString()}</TableCell>
                            <TableCell>{loan.tenure} months</TableCell>
                            <TableCell>₹{loan.emi.toLocaleString()}</TableCell>
                            <TableCell>{getStatusBadge(loan.status)}</TableCell>
                            <TableCell>
                              {loan.approvedBy ? (
                                <div>
                                  <div className="font-medium">{loan.approvedBy.name || 'N/A'}</div>
                                  {loan.approvedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(loan.approvedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {loansData?.data?.pagination && loansData.data.pagination.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {loansData.data.pagination.page} of {loansData.data.pagination.pages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLoanPage((p) => Math.max(1, p - 1))}
                          disabled={loanPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setLoanPage((p) =>
                              Math.min(loansData.data.pagination.pages, p + 1)
                            )
                          }
                          disabled={loanPage === loansData.data.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expense Claims Tab */}
            <TabsContent value="expense" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Expense Claims</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={expenseSearch}
                          onChange={(e) => setExpenseSearch(e.target.value)}
                        />
                        {expenseSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setExpenseSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={expenseStatusFilter}
                        onValueChange={(value) => {
                          setExpenseStatusFilter(value);
                          setExpensePage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Claim Expense
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Claim Expense</DialogTitle>
                            <DialogDescription>Submit a new expense claim</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Expense Type</Label>
                              <Select
                                value={expenseFormData.type}
                                onValueChange={(value: any) =>
                                  setExpenseFormData({ ...expenseFormData, type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Travel">Travel</SelectItem>
                                  <SelectItem value="Meal">Meal</SelectItem>
                                  <SelectItem value="Accommodation">Accommodation</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                value={expenseFormData.amount}
                                onChange={(e) =>
                                  setExpenseFormData({ ...expenseFormData, amount: e.target.value })
                                }
                                placeholder="Enter expense amount"
                                required
                              />
                            </div>
                            <div>
                              <Label>Date</Label>
                              <Input
                                type="date"
                                value={expenseFormData.date}
                                onChange={(e) =>
                                  setExpenseFormData({ ...expenseFormData, date: e.target.value })
                                }
                                required
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={expenseFormData.description}
                                onChange={(e) =>
                                  setExpenseFormData({
                                    ...expenseFormData,
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Enter expense description"
                                required
                              />
                            </div>
                            <div>
                              <Label>Proof Documents (Optional)</Label>
                              <div className="space-y-2">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    setExpenseProofFiles((prev) => [...prev, ...files]);
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = '';
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-full"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Proof Files
                                </Button>
                                {expenseProofFiles.length > 0 && (
                                  <div className="space-y-1">
                                    {expenseProofFiles.map((file, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-2 bg-muted rounded"
                                      >
                                        <span className="text-sm truncate flex-1">{file.name}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setExpenseProofFiles((prev) =>
                                              prev.filter((_, i) => i !== index)
                                            );
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Upload receipts, bills, or other proof documents (PDF, Images, Word)
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsExpenseDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateExpense} disabled={isCreatingExpense}>
                              {isCreatingExpense ? "Submitting..." : "Submit Claim"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Proof Files</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingExpenses ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : expenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No expense claims found
                          </TableCell>
                        </TableRow>
                      ) : (
                        expenses.map((expense: any) => (
                          <TableRow key={expense._id}>
                            <TableCell>{expense.type}</TableCell>
                            <TableCell>₹{expense.amount.toLocaleString()}</TableCell>
                            <TableCell>{formatDate(expense.date)}</TableCell>
                            <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                            <TableCell>
                              {expense.proofFiles && expense.proofFiles.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {expense.proofFiles.map((fileUrl: string, idx: number) => (
                                    <Button
                                      key={idx}
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      onClick={() => window.open(fileUrl, '_blank')}
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      View Proof {idx + 1}
                                    </Button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No files</span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(expense.status)}</TableCell>
                            <TableCell>
                              {expense.approvedBy ? (
                                <div>
                                  <div className="font-medium">{expense.approvedBy.name || 'N/A'}</div>
                                  {expense.approvedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(expense.approvedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {expensesData?.data?.pagination && expensesData.data.pagination.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {expensesData.data.pagination.page} of {expensesData.data.pagination.pages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                          disabled={expensePage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpensePage((p) =>
                              Math.min(expensesData.data.pagination.pages, p + 1)
                            )
                          }
                          disabled={expensePage === expensesData.data.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payslip Requests Tab */}
            <TabsContent value="payslip" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle>Payslip Requests</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          className="pl-10"
                          value={payslipSearch}
                          onChange={(e) => setPayslipSearch(e.target.value)}
                        />
                        {payslipSearch && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setPayslipSearch("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <Select
                        value={payslipStatusFilter}
                        onValueChange={(value) => {
                          setPayslipStatusFilter(value);
                          setPayslipPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isPayslipDialogOpen} onOpenChange={setIsPayslipDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full sm:w-auto">
                            <Plus className="w-4 h-4 mr-2" /> Request Payslip
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Payslip</DialogTitle>
                            <DialogDescription>Request a payslip for a specific month</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Month</Label>
                              <Select
                                value={payslipFormData.month.toString()}
                                onValueChange={(value) =>
                                  setPayslipFormData({
                                    ...payslipFormData,
                                    month: Number(value),
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                    <SelectItem key={month} value={month.toString()}>
                                      {new Date(2000, month - 1).toLocaleString("default", {
                                        month: "long",
                                      })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Year</Label>
                              <Input
                                type="number"
                                value={payslipFormData.year}
                                onChange={(e) =>
                                  setPayslipFormData({
                                    ...payslipFormData,
                                    year: Number(e.target.value),
                                  })
                                }
                                min={2020}
                                max={2100}
                                required
                              />
                            </div>
                            <div>
                              <Label>Reason (Optional)</Label>
                              <Textarea
                                value={payslipFormData.reason}
                                onChange={(e) =>
                                  setPayslipFormData({ ...payslipFormData, reason: e.target.value })
                                }
                                placeholder="Enter reason for payslip request"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setIsPayslipDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCreatePayslipRequest}
                              disabled={isCreatingPayslip}
                            >
                              {isCreatingPayslip ? "Submitting..." : "Submit Request"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month/Year</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingPayslips ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : payslipRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            No payslip requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        payslipRequests.map((request: any) => (
                          <TableRow key={request._id}>
                            <TableCell>
                              {new Date(2000, request.month - 1).toLocaleString("default", {
                                month: "long",
                              })}{" "}
                              {request.year}
                            </TableCell>
                            <TableCell>{request.reason || "N/A"}</TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
                            <TableCell>
                              {request.approvedBy ? (
                                <div>
                                  <div className="font-medium">{request.approvedBy.name || 'N/A'}</div>
                                  {request.approvedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {formatDate(request.approvedAt)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {request.status === "Approved" &&
                                request.payrollId?.payslipUrl &&
                                request.payrollId?._id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const blob = await viewPayslip(request.payrollId._id).unwrap();
                                        const url = window.URL.createObjectURL(blob);
                                        window.open(url, '_blank');
                                        setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                      } catch (error: any) {
                                        message.error(error?.data?.error?.message || "Failed to view payslip");
                                      }
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    View
                                  </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                  {payslipRequestsData?.data?.pagination &&
                    payslipRequestsData.data.pagination.pages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                          Page {payslipRequestsData.data.pagination.page} of{" "}
                          {payslipRequestsData.data.pagination.pages}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPayslipPage((p) => Math.max(1, p - 1))}
                            disabled={payslipPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPayslipPage((p) =>
                                Math.min(payslipRequestsData.data.pagination.pages, p + 1)
                              )
                            }
                            disabled={payslipPage === payslipRequestsData.data.pagination.pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeRequests;

