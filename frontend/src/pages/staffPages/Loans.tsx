import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGetLoansQuery, useApproveLoanMutation, useRejectLoanMutation } from "@/store/api/loanApi";
import { useGetPayrollsQuery } from "@/store/api/payrollApi";
import { message } from "antd";
import MainLayout from "@/components/MainLayout";
import { Search, CheckCircle, XCircle, X, ChevronDown, ChevronRight, Calendar, DollarSign, Clock } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatINR } from "@/utils/currencyUtils";
import AdminLoanDashboard from "@/components/loan/AdminLoanDashboard";

interface LoansProps {
  employeeId?: string;
}

const Loans = ({ employeeId }: LoansProps = {}) => {
  const [subTab, setSubTab] = useState("applications");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectLoanId, setRejectLoanId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  const normalizeSearch = (q: string) => q.trim().replace(/\s+/g, " ");

  useEffect(() => {
    setCurrentPage(1);
  }, [subTab]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(normalizeSearch(searchQuery));
      setCurrentPage(1);
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  const { data: loansData, isLoading, refetch } = useGetLoansQuery({
    employeeId: employeeId || undefined,
    status: subTab === "applications" ? "Pending" : undefined, // For "loans" tab, we'll filter to show both Approved and Active
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageSize
  });
  
  // Filter loans based on tab - Active Loans tab should show both Approved and Active loans
  const filteredLoans = subTab === "loans" 
    ? (loansData?.data?.loans || []).filter((loan: any) => loan.status === "Active" || loan.status === "Approved")
    : loansData?.data?.loans || [];
  const { data: allLoansData, isLoading: isAllLoansLoading } = useGetLoansQuery(
    {
      page: 1,
      limit: 5000,
    },
    { skip: !!employeeId }
  );
  const [approveLoan, { isLoading: isApproving }] = useApproveLoanMutation();
  const [rejectLoan, { isLoading: isRejecting }] = useRejectLoanMutation();

  const loans = filteredLoans;
  const pagination = loansData?.data?.pagination;
  const allLoans = allLoansData?.data?.loans || [];

  // Fetch payrolls to get loan EMI payment information
  const { data: payrollsData } = useGetPayrollsQuery(
    { employeeId: employeeId || undefined, limit: 1000 },
    { skip: false }
  );
  const payrolls = payrollsData?.data?.payrolls || [];

  // Create a map to track which payroll month/year each loan EMI was paid in
  const loanEMIPaymentMap = useMemo(() => {
    const map = new Map<string, Map<string, { month: number; year: number }>>();
    
    payrolls.forEach((payroll: any) => {
      if (!payroll.components || !Array.isArray(payroll.components)) return;
      
      payroll.components.forEach((component: any) => {
        // Check if this component is a loan EMI deduction
        if (component.type === 'deduction' && component.name?.includes('Loan EMI')) {
          const loanId = component.loanId;
          const installmentDueDate = component.installmentDueDate;
          
          if (loanId && installmentDueDate) {
            // Convert due date to string key (YYYY-MM-DD format)
            const dueDateStr = new Date(installmentDueDate).toISOString().split('T')[0];
            
            if (!map.has(loanId)) {
              map.set(loanId, new Map());
            }
            
            const loanMap = map.get(loanId)!;
            loanMap.set(dueDateStr, {
              month: payroll.month,
              year: payroll.year
            });
          }
        }
      });
    });
    
    return map;
  }, [payrolls]);

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || 'Unknown';
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLoan(id).unwrap();
      message.success("Loan approved successfully");
      setApproveConfirmId(null);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve loan");
    }
  };

  const handleReject = async () => {
    if (!rejectLoanId) return;
    if (!rejectionReason.trim()) {
      message.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectLoan({ id: rejectLoanId, reason: rejectionReason }).unwrap();
      message.success("Loan rejected");
      setRejectDialogOpen(false);
      setRejectLoanId(null);
      setRejectionReason("");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject loan");
    }
  };

  const formatDate = (dateString?: string) => {
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
      Active: "default",
      Pending: "secondary",
      Rejected: "destructive",
      Completed: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  }; 

  const content = (
    <div className="w-full space-y-6">
      {!employeeId && (
        <AdminLoanDashboard
          loans={allLoans}
          isLoading={isAllLoansLoading}
        />
      )}
      <Card>
          <CardHeader className="pb-2">
            <CardTitle>{employeeId ? "Employee Loans" : "Loans"}</CardTitle>
          </CardHeader>

          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name, loan type, or purpose (case-insensitive)..."
                  className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted rounded-sm"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {/* Sub Tabs */}
            <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
              <TabsList className="rounded-md mb-8 flex-wrap h-auto">
                <TabsTrigger value="applications" className="px-3 sm:px-6 text-xs sm:text-sm">Pending Applications</TabsTrigger>
                <TabsTrigger value="loans" className="px-3 sm:px-6 text-xs sm:text-sm">Active Loans</TabsTrigger>
                <TabsTrigger value="all" className="px-3 sm:px-6 text-xs sm:text-sm">All Loans</TabsTrigger>
              </TabsList>

              {/* Loan Applications Tab */}
              <TabsContent value="applications">
                {isLoading ? (
                  <div className="text-center py-20">Loading applications...</div>
                ) : loans.length === 0 ? (
                  <div className="flex flex-col gap-4 items-center justify-center py-20 text-center">
                    <p className="text-muted-foreground text-lg font-medium">No Pending Loan Applications</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Employee Name</TableHead>
                          <TableHead className="min-w-[100px]">Loan Type</TableHead>
                          <TableHead className="min-w-[100px]">Amount</TableHead>
                          <TableHead className="min-w-[80px]">Tenure</TableHead>
                          <TableHead className="min-w-[100px]">EMI</TableHead>
                          <TableHead className="min-w-[120px]">Purpose</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="min-w-[200px]">Remarks/Reason</TableHead>
                          <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan) => (
                          <TableRow key={loan._id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="font-medium">{loan.employeeId?.name || "N/A"}</div>
                                {loan.employeeId?.employeeId && (
                                  <div className="text-xs text-muted-foreground">{loan.employeeId.employeeId}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{loan.loanType}</TableCell>
                            <TableCell className="font-medium">{formatINR(loan.amount)}</TableCell>
                            <TableCell className="text-sm">{loan.tenure} months</TableCell>
                            <TableCell className="font-medium">{formatINR(loan.emi)}</TableCell>
                            <TableCell className="max-w-xs truncate text-sm">{loan.purpose}</TableCell>
                            <TableCell>{getStatusBadge(loan.status)}</TableCell>
                            <TableCell>
                              {loan.status === "Approved" && loan.approvedBy ? (
                                <div className="text-xs space-y-1">
                                  <div className="font-medium text-[#efaa1f]">Approved by: {loan.approvedBy.name || 'N/A'}</div>
                                  {loan.approvedAt && (
                                    <div className="text-muted-foreground">
                                      {new Date(loan.approvedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : loan.status === "Rejected" && (loan.rejectionReason || loan.rejectedBy) ? (
                                <div className="text-xs space-y-1">
                                  {loan.rejectionReason && (
                                    <div className="font-medium text-red-600 mb-1">Reason: {loan.rejectionReason}</div>
                                  )}
                                  {loan.rejectedBy && (
                                    <div className="text-muted-foreground">
                                      Rejected by: {loan.rejectedBy.name || 'N/A'}
                                      {loan.rejectedAt && ` on ${new Date(loan.rejectedAt).toLocaleDateString()}`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {loan.status === "Pending" ? (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => setApproveConfirmId(loan._id)}
                                    disabled={isApproving}
                                    className="text-xs"
                                  >
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Approve</span>
                                    <span className="sm:hidden">OK</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRejectLoanId(loan._id);
                                      setRejectDialogOpen(true);
                                    }}
                                    disabled={isRejecting}
                                    className="text-xs"
                                  >
                                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    <span className="hidden sm:inline">Reject</span>
                                    <span className="sm:hidden">X</span>
                                  </Button>
                                </div>
                              ) : loan.status === "Approved" || loan.status === "Active" ? (
                                <div className="flex justify-end">
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approved
                                  </Badge>
                                </div>
                              ) : loan.status === "Rejected" ? (
                                <div className="flex justify-end">
                                  <Badge variant="destructive" className="text-xs">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Rejected
                                  </Badge>
                                </div>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {/* Pagination for Applications Tab */}
                {pagination && (
                  <div className="mt-4 pt-4 border-t">
                    <Pagination
                      page={currentPage}
                      pageSize={pageSize}
                      total={pagination.total}
                      pages={pagination.pages}
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
              </TabsContent>

              {/* Active Loans Tab */}
              <TabsContent value="loans">
                {isLoading ? (
                  <div className="text-center py-20">Loading loans...</div>
                ) : loans.length === 0 ? (
                  <div className="flex flex-col gap-4 items-center justify-center py-20 text-center">
                    <p className="text-muted-foreground text-lg font-medium">No Active Loans</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Loan Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>EMI</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan) => {
                          const paidInstallments = loan.installments?.filter((inst: any) => inst.paid) || [];
                          const unpaidInstallments = loan.installments?.filter((inst: any) => !inst.paid) || [];
                          const totalInstallments = loan.installments?.length || 0;
                          const isExpanded = expandedLoanId === loan._id;
                          
                          return (
                            <>
                              <TableRow key={loan._id} className="cursor-pointer" onClick={() => setExpandedLoanId(isExpanded ? null : loan._id)}>
                                <TableCell>
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{loan.employeeId?.name || "N/A"}</div>
                                    <div className="text-sm text-muted-foreground">{loan.employeeId?.employeeId || ""}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{loan.loanType}</TableCell>
                                <TableCell>{formatINR(loan.amount)}</TableCell>
                                <TableCell>{formatINR(loan.emi)}</TableCell>
                                <TableCell>{formatINR(loan.remainingAmount)}</TableCell>
                                <TableCell>{formatDate(loan.startDate)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {getStatusBadge(loan.status)}
                                    <span className="text-xs text-muted-foreground">
                                      {paidInstallments.length}/{totalInstallments} EMIs paid
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={8} className="bg-muted/30">
                                    <div className="p-4 space-y-4">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-3 border rounded-lg">
                                          <div className="text-xs text-muted-foreground">Total EMIs</div>
                                          <div className="text-lg font-semibold">{totalInstallments}</div>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                                          <div className="text-xs text-muted-foreground">Paid EMIs</div>
                                          <div className="text-lg font-semibold text-green-600">{paidInstallments.length}</div>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                                          <div className="text-xs text-muted-foreground">Remaining EMIs</div>
                                          <div className="text-lg font-semibold text-yellow-600">{unpaidInstallments.length}</div>
                                        </div>
                                        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                                          <div className="text-xs text-muted-foreground">Remaining Amount</div>
                                          <div className="text-lg font-semibold text-blue-600">{formatINR(loan.remainingAmount)}</div>
                                        </div>
                                      </div>
                                      
                                      {paidInstallments.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            Payment History
                                          </h4>
                                          <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {paidInstallments.map((inst: any, idx: number) => {
                                              // Match installment by due date
                                              const dueDateStr = new Date(inst.dueDate).toISOString().split('T')[0];
                                              const paymentInfo = loanEMIPaymentMap.get(loan._id)?.get(dueDateStr);
                                              const paymentMonthYear = paymentInfo 
                                                ? `${getMonthName(paymentInfo.month)} ${paymentInfo.year}`
                                                : inst.paidAt 
                                                  ? `${getMonthName(new Date(inst.paidAt).getMonth() + 1)} ${new Date(inst.paidAt).getFullYear()}`
                                                  : 'N/A';
                                              
                                              return (
                                                <div key={idx} className="flex items-center justify-between p-2 border rounded bg-green-50 dark:bg-green-950">
                                                  <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                      <Calendar className="w-4 h-4 text-muted-foreground" />
                                                      <span className="text-sm font-medium">
                                                        Due: {formatDate(inst.dueDate)}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-6">
                                                      <span className="text-xs text-muted-foreground">
                                                        Paid in: <span className="font-semibold text-green-700">{paymentMonthYear}</span> Payroll
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-green-600" />
                                                    <span className="font-semibold text-green-600">{formatINR(inst.amount || loan.emi)}</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {unpaidInstallments.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-yellow-600" />
                                            Upcoming EMIs
                                          </h4>
                                          <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {unpaidInstallments.slice(0, 5).map((inst: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                                                <div className="flex items-center gap-2">
                                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                                  <span className="text-sm">
                                                    Due: {formatDate(inst.dueDate)}
                                                  </span>
                                                </div>
                                                <span className="font-semibold">{formatINR(inst.amount || loan.emi)}</span>
                                              </div>
                                            ))}
                                            {unpaidInstallments.length > 5 && (
                                              <div className="text-xs text-muted-foreground text-center py-2">
                                                +{unpaidInstallments.length - 5} more EMIs remaining
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {/* Pagination for Active Loans Tab */}
                {pagination && (
                  <div className="mt-4 pt-4 border-t">
                    <Pagination
                      page={currentPage}
                      pageSize={pageSize}
                      total={pagination.total}
                      pages={pagination.pages}
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
              </TabsContent>

              {/* All Loans Tab */}
              <TabsContent value="all">
                {isLoading ? (
                  <div className="text-center py-20">Loading loans...</div>
                ) : loans.length === 0 ? (
                  <div className="flex flex-col gap-4 items-center justify-center py-20 text-center">
                    <p className="text-muted-foreground text-lg font-medium">No Loans Found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Loan Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Tenure</TableHead>
                          <TableHead>EMI</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.map((loan) => (
                          <TableRow key={loan._id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{loan.employeeId?.name || "N/A"}</div>
                                <div className="text-sm text-muted-foreground">{loan.employeeId?.employeeId || ""}</div>
                              </div>
                            </TableCell>
                            <TableCell>{loan.loanType}</TableCell>
                            <TableCell>{formatINR(loan.amount)}</TableCell>
                            <TableCell>{loan.tenure} months</TableCell>
                            <TableCell>{formatINR(loan.emi)}</TableCell>
                            <TableCell>{getStatusBadge(loan.status)}</TableCell>
                            <TableCell>{formatDate(loan.createdAt as any)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {/* Pagination for All Loans Tab */}
                {pagination && (
                  <div className="mt-4 pt-4 border-t">
                    <Pagination
                      page={currentPage}
                      pageSize={pageSize}
                      total={pagination.total}
                      pages={pagination.pages}
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* APPROVE CONFIRMATION DIALOG */}
        <AlertDialog open={!!approveConfirmId} onOpenChange={(open) => !open && setApproveConfirmId(null)}>
          <AlertDialogContent className="w-[95%] sm:w-full max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Loan Approval</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this loan application? This action will create installments and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => approveConfirmId && handleApprove(approveConfirmId)}
                disabled={isApproving}
                className="w-full sm:w-auto bg-[#efaa1f] hover:bg-[#d97706]"
              >
                {isApproving ? "Approving..." : "Sure, Approve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* REJECT DIALOG */}
        <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setRejectLoanId(null);
            setRejectionReason("");
          }
        }}>
          <DialogContent className="w-[95%] sm:w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Loan Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this loan application. This will be visible to the employee.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason <span className="text-red-500">*</span></Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectLoanId(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isRejecting}
              >
                {isRejecting ? "Rejecting..." : "Reject Loan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );

  // If used in a tab (employeeId provided), return without MainLayout
  if (employeeId) {
    return content;
  }

  // If used standalone, wrap with MainLayout
  return (
    <MainLayout>
      <main className="p-4">
        {content}
      </main>
    </MainLayout>
  );
};

export default Loans;
