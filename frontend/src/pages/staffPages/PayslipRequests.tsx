import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, CheckCircle, XCircle, Download, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetPayslipRequestsQuery,
  useApprovePayslipRequestMutation,
  useRejectPayslipRequestMutation,
} from "@/store/api/payslipRequestApi";
import { useLazyViewPayslipQuery } from "@/store/api/payrollApi";
import { message } from "antd";
import { Pagination } from "@/components/ui/pagination";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AdminPayslipDashboard from "@/components/payslip/AdminPayslipDashboard";

interface PayslipRequestsProps {
  employeeId?: string;
}

const PayslipRequests = ({ employeeId }: PayslipRequestsProps = {}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [approveConfirmRequest, setApproveConfirmRequest] = useState<any | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
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

  const { data: requestsData, isLoading, refetch } = useGetPayslipRequestsQuery({
    employeeId: employeeId || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageSize,
  });
  const { data: allRequestsData, isLoading: isAllRequestsLoading } = useGetPayslipRequestsQuery(
    { page: 1, limit: 5000 },
    { skip: !!employeeId }
  );

  const [approvePayslipRequest, { isLoading: isApproving }] = useApprovePayslipRequestMutation();
  const [rejectPayslipRequest, { isLoading: isRejecting }] = useRejectPayslipRequestMutation();
  const [viewPayslip] = useLazyViewPayslipQuery();

  const requests = requestsData?.data?.requests || [];
  const pagination = requestsData?.data?.pagination;
  const allRequests = allRequestsData?.data?.requests || [];

  const stats = {
    total: requests.length,
    pending: requests.filter((r: any) => r.status === "Pending").length,
    approved: requests.filter((r: any) => r.status === "Approved").length,
    rejected: requests.filter((r: any) => r.status === "Rejected").length,
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
      Pending: "secondary",
      Rejected: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const handleApprove = async (request: any) => {
    try {
      await approvePayslipRequest(request._id).unwrap();
      message.success("Payslip request approved successfully");
      setApproveConfirmRequest(null);
      
      // Get employeeId from the request
      const employeeId = typeof request.employeeId === 'object' 
        ? request.employeeId._id 
        : request.employeeId;
      
      // Redirect to payroll preview with month and year from the request
      navigate(`/payroll/preview?employeeId=${employeeId}&month=${request.month}&year=${request.year}`);
      
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve payslip request");
    }
  };

  const handleReject = async () => {
    if (!rejectRequestId) return;
    if (!rejectionReason.trim()) {
      message.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectPayslipRequest({ id: rejectRequestId, reason: rejectionReason }).unwrap();
      message.success("Payslip request rejected");
      setRejectDialogOpen(false);
      setRejectRequestId(null);
      setRejectionReason("");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject payslip request");
    }
  };

  const content = (
    <div className="w-full space-y-6">
      {!employeeId && (
        <>
          <h1 className="text-3xl font-bold">Payslip Requests</h1>
          <p className="text-muted-foreground mt-1">Manage employee payslip requests</p>
          <AdminPayslipDashboard
            requests={allRequests}
            isLoading={isAllRequestsLoading}
          />
        </>
      )}

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle>All Payslip Requests</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search (case-insensitive)..."
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
                        onClick={() => setSearchQuery("")}
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
                      <TableHead className="min-w-[120px]">Month/Year</TableHead>
                      <TableHead className="min-w-[150px]">Reason</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Requested Date</TableHead>
                      <TableHead className="min-w-[200px]">Remarks/Reason</TableHead>
                      <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No payslip requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request: any) => (
                        <TableRow key={request._id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="font-medium">{request.employeeId?.name || "N/A"}</div>
                              {request.employeeId?.employeeId && (
                                <div className="text-xs text-muted-foreground">
                                  {request.employeeId.employeeId}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(2000, request.month - 1).toLocaleString("default", {
                              month: "long",
                            })}{" "}
                            {request.year}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{request.reason || "N/A"}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-sm">{formatDate(request.createdAt)}</TableCell>
                          <TableCell>
                            {request.status === "Approved" && request.approvedBy ? (
                              <div className="text-xs space-y-1">
                                <div className="font-medium text-[#efaa1f]">Approved by: {request.approvedBy.name || 'N/A'}</div>
                                {request.approvedAt && (
                                  <div className="text-muted-foreground">
                                    {formatDate(request.approvedAt)}
                                  </div>
                                )}
                              </div>
                            ) : request.status === "Rejected" && (request.rejectionReason || request.rejectedBy) ? (
                              <div className="text-xs space-y-1">
                                {request.rejectionReason && (
                                  <div className="font-medium text-red-600 mb-1">Reason: {request.rejectionReason}</div>
                                )}
                                {request.rejectedBy && (
                                  <div className="text-muted-foreground">
                                    Rejected by: {request.rejectedBy.name || 'N/A'}
                                    {request.rejectedAt && ` on ${formatDate(request.rejectedAt)}`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {request.status === "Pending" ? (
                              <div className="flex justify-end gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setApproveConfirmRequest(request)}
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
                                    setRejectRequestId(request._id);
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
                            ) : request.status === "Approved" ? (
                              <div className="flex justify-end gap-2 flex-wrap items-center">
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approved
                                </Badge>
                                {request.payrollId?.payslipUrl && request.payrollId?._id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
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
                                    className="text-xs"
                                  >
                                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    <span className="hidden sm:inline">View</span>
                                    <span className="sm:hidden">View</span>
                                  </Button>
                                )}
                              </div>
                            ) : request.status === "Rejected" ? (
                              <div className="flex justify-end flex-col items-end gap-1">
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </Badge>
                                {request.rejectedBy && (
                                  <div className="text-xs text-muted-foreground">
                                    by {request.rejectedBy.name || 'N/A'}
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
        <AlertDialog open={!!approveConfirmRequest} onOpenChange={(open) => !open && setApproveConfirmRequest(null)}>
          <AlertDialogContent className="w-[95%] sm:w-full max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this payslip request? This action will redirect you to the payroll preview page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => approveConfirmRequest && handleApprove(approveConfirmRequest)}
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
            setRejectRequestId(null);
            setRejectionReason("");
          }
        }}>
          <DialogContent className="w-[95%] sm:w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Payslip Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this payslip request. This will be visible to the employee.
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
                  setRejectRequestId(null);
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
                {isRejecting ? "Rejecting..." : "Reject Request"}
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

export default PayslipRequests;

