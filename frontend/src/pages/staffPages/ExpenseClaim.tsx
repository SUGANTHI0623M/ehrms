import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
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
import { Search, CheckCircle, XCircle, FileText, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetReimbursementsQuery,
  useApproveReimbursementMutation,
  useRejectReimbursementMutation,
} from "@/store/api/reimbursementApi";
import { message } from "antd";
import { Pagination } from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatINR } from "@/utils/currencyUtils";
import AdminExpenseDashboard from "@/components/expense/AdminExpenseDashboard";

interface ExpenseClaimProps {
  employeeId?: string;
}

const ExpenseClaim = ({ employeeId }: ExpenseClaimProps = {}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReimbursementId, setRejectReimbursementId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const normalizeSearch = (q: string) => q.trim().replace(/\s+/g, " ");

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

  const { data: reimbursementsData, isLoading, refetch } = useGetReimbursementsQuery({
    employeeId: employeeId || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageSize,
  });
  const { data: allReimbursementsData, isLoading: isAllExpensesLoading } = useGetReimbursementsQuery(
    { page: 1, limit: 5000 },
    { skip: !!employeeId }
  );

  const [approveReimbursement, { isLoading: isApproving }] = useApproveReimbursementMutation();
  const [rejectReimbursement, { isLoading: isRejecting }] = useRejectReimbursementMutation();

  const reimbursements = reimbursementsData?.data?.reimbursements || [];
  const pagination = reimbursementsData?.data?.pagination;
  const allReimbursements = allReimbursementsData?.data?.reimbursements || [];

  const stats = {
    total: reimbursements.length,
    pending: reimbursements.filter((r: any) => r.status === "Pending").length,
    approved: reimbursements.filter((r: any) => r.status === "Approved").length,
    paid: reimbursements.filter((r: any) => r.status === "Paid").length,
    totalAmount: reimbursements.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
    pendingAmount: reimbursements
      .filter((r: any) => r.status === "Pending")
      .reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
  };

  const handleApprove = async (id: string) => {
    try {
      await approveReimbursement(id).unwrap();
      message.success("Expense claim approved successfully");
      setApproveConfirmId(null);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve expense claim");
    }
  };

  const handleReject = async () => {
    if (!rejectReimbursementId) return;
    if (!rejectionReason.trim()) {
      message.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectReimbursement({ id: rejectReimbursementId, reason: rejectionReason }).unwrap();
      message.success("Expense claim rejected");
      setRejectDialogOpen(false);
      setRejectReimbursementId(null);
      setRejectionReason("");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject expense claim");
    }
  };

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
      Processed: "default",
      Paid: "default",
      Pending: "secondary",
      Rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const content = (
    <div className="w-full space-y-6">
      {!employeeId && (
        <>
          <h1 className="text-3xl font-bold">Expense Claims</h1>
          <p className="text-muted-foreground mt-1">Manage employee expense reimbursement requests</p>
          <AdminExpenseDashboard
            expenses={allReimbursements}
            isLoading={isAllExpensesLoading}
          />
        </>
      )}

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>All Expense Claims</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by description, type, or employee name (case-insensitive)..."
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
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Processed">Processed</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Employee Name</TableHead>
                      <TableHead className="min-w-[100px]">Type</TableHead>
                      <TableHead className="min-w-[100px]">Amount</TableHead>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[150px]">Description</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Proof Files</TableHead>
                      <TableHead className="min-w-[200px]">Remarks/Reason</TableHead>
                      <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : reimbursements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No expense claims found
                        </TableCell>
                      </TableRow>
                    ) : (
                      reimbursements.map((reimbursement: any) => (
                        <TableRow key={reimbursement._id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="font-medium">{reimbursement.employeeId?.name || "N/A"}</div>
                              {reimbursement.employeeId?.employeeId && (
                                <div className="text-xs text-muted-foreground">
                                  {reimbursement.employeeId.employeeId}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{reimbursement.type}</TableCell>
                          <TableCell className="font-medium">
                            {formatINR(reimbursement.amount)}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(reimbursement.date)}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{reimbursement.description}</TableCell>
                        <TableCell>{getStatusBadge(reimbursement.status)}</TableCell>
                        <TableCell>
                          {reimbursement.proofFiles && reimbursement.proofFiles.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {reimbursement.proofFiles.map((fileUrl: string, idx: number) => (
                                <Button
                                  key={idx}
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs justify-start"
                                  onClick={() => window.open(fileUrl, '_blank')}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  View {idx + 1}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">No files</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {reimbursement.status === "Approved" || reimbursement.status === "Processed" || reimbursement.status === "Paid" ? (
                            reimbursement.approvedBy ? (
                              <div className="text-xs space-y-1">
                                <div className="font-medium text-[#efaa1f]">Approved by: {reimbursement.approvedBy.name || 'N/A'}</div>
                                {reimbursement.approvedAt && (
                                  <div className="text-muted-foreground">
                                    {new Date(reimbursement.approvedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )
                          ) : reimbursement.status === "Rejected" && (reimbursement.rejectionReason || reimbursement.rejectedBy) ? (
                            <div className="text-xs space-y-1">
                              {reimbursement.rejectionReason && (
                                <div className="font-medium    mb-1">Reason: {reimbursement.rejectionReason}</div>
                              )}
                              {reimbursement.rejectedBy && (
                                <div className="text-muted-foreground">
                                  Rejected by: {reimbursement.rejectedBy.name || 'N/A'}
                                  {reimbursement.rejectedAt && ` on ${new Date(reimbursement.rejectedAt).toLocaleDateString()}`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                          <TableCell className="text-right">
                            {reimbursement.status === "Pending" ? (
                              <div className="flex justify-end gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setApproveConfirmId(reimbursement._id)}
                                  disabled={isApproving}
                                  className="text-xs"
                                >
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden sm:inline">Approve</span>
                                  <span className="sm:hidden">OK</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRejectReimbursementId(reimbursement._id);
                                    setRejectDialogOpen(true);
                                  }}
                                  disabled={isRejecting}
                                  className="text-xs"
                                >
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden sm:inline">Reject</span>
                                  <span className="sm:hidden">X</span>
                                </Button>
                              </div>
                            ) : reimbursement.status === "Approved" || reimbursement.status === "Processed" || reimbursement.status === "Paid" ? (
                              <div className="flex justify-end">
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approved
                                </Badge>
                              </div>
                            ) : reimbursement.status === "Rejected" ? (
                              <div className="flex justify-end flex-col items-end gap-1">
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </Badge>
                                {reimbursement.rejectedBy && (
                                  <div className="text-xs text-muted-foreground">
                                    by {reimbursement.rejectedBy.name || 'N/A'}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="mt-4">
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
            </CardContent>
          </Card>

        {/* APPROVE CONFIRMATION DIALOG */}
        <AlertDialog open={!!approveConfirmId} onOpenChange={(open) => !open && setApproveConfirmId(null)}>
          <AlertDialogContent className="w-[95%] sm:w-full max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this expense claim? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => approveConfirmId && handleApprove(approveConfirmId)}
                disabled={isApproving}
                className="w-full sm:w-auto bg-[#efaa1f] hover:bg-[#d97706]"
              >
                {isApproving ? "Approving..." : "OK, Approve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* REJECT DIALOG */}
        <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setRejectReimbursementId(null);
            setRejectionReason("");
          }
        }}>
          <DialogContent className="w-[95%] sm:w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Expense Claim</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this expense claim. This will be visible to the employee.
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
                  setRejectReimbursementId(null);
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
                {isRejecting ? "Rejecting..." : "Reject Claim"}
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
      <main className="p-4 sm:p-6">
        {content}
      </main>
    </MainLayout>
  );
};

export default ExpenseClaim;
