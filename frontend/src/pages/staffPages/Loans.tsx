import { useState, useEffect } from "react";
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
import { message } from "antd";
import MainLayout from "@/components/MainLayout";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [subTab, searchQuery]);

  const { data: loansData, isLoading, refetch } = useGetLoansQuery({
    employeeId: employeeId || undefined,
    status: subTab === "applications" ? "Pending" : subTab === "loans" ? "Active" : undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: pageSize
  });
  const [approveLoan, { isLoading: isApproving }] = useApproveLoanMutation();
  const [rejectLoan, { isLoading: isRejecting }] = useRejectLoanMutation();

  const loans = loansData?.data?.loans || [];
  const pagination = loansData?.data?.pagination;

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
                  placeholder="Search by employee name, loan type, or purpose..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
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
                            <TableCell className="font-medium">₹{loan.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-sm">{loan.tenure} months</TableCell>
                            <TableCell className="font-medium">₹{loan.emi.toLocaleString()}</TableCell>
                            <TableCell className="max-w-xs truncate text-sm">{loan.purpose}</TableCell>
                            <TableCell>{getStatusBadge(loan.status)}</TableCell>
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
                        {loans.map((loan) => (
                          <TableRow key={loan._id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{loan.employeeId?.name || "N/A"}</div>
                                <div className="text-sm text-muted-foreground">{loan.employeeId?.employeeId || ""}</div>
                              </div>
                            </TableCell>
                            <TableCell>{loan.loanType}</TableCell>
                            <TableCell>₹{loan.amount.toLocaleString()}</TableCell>
                            <TableCell>₹{loan.emi.toLocaleString()}</TableCell>
                            <TableCell>₹{loan.remainingAmount.toLocaleString()}</TableCell>
                            <TableCell>{formatDate(loan.startDate)}</TableCell>
                            <TableCell>{getStatusBadge(loan.status)}</TableCell>
                          </TableRow>
                        ))}
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
                            <TableCell>₹{loan.amount.toLocaleString()}</TableCell>
                            <TableCell>{loan.tenure} months</TableCell>
                            <TableCell>₹{loan.emi.toLocaleString()}</TableCell>
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
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
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
