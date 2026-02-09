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
import { Search, CheckCircle, XCircle, Download } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetPayslipRequestsQuery,
  useApprovePayslipRequestMutation,
  useRejectPayslipRequestMutation,
} from "@/store/api/payslipRequestApi";
import { useLazyViewPayslipQuery } from "@/store/api/payrollApi";
import { message } from "antd";
import { Pagination } from "@/components/ui/Pagination";

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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  const { data: requestsData, isLoading, refetch } = useGetPayslipRequestsQuery({
    employeeId: employeeId || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageSize,
  });

  const [approvePayslipRequest, { isLoading: isApproving }] = useApprovePayslipRequestMutation();
  const [rejectPayslipRequest, { isLoading: isRejecting }] = useRejectPayslipRequestMutation();
  const [viewPayslip] = useLazyViewPayslipQuery();

  const requests = requestsData?.data?.requests || [];
  const pagination = requestsData?.data?.pagination;

  // Calculate stats
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

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectPayslipRequest({ id, reason }).unwrap();
      message.success("Payslip request rejected");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject payslip request");
    }
  };

  const content = (
    <div className="w-full space-y-6">
      {!employeeId && (
        <div>
          <h1 className="text-3xl font-bold">Payslip Requests</h1>
          <p className="text-muted-foreground mt-1">Manage employee payslip requests</p>
        </div>
      )}

          {/* Stats Cards */}
          {!employeeId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              </CardContent>
            </Card>
          </div>
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
                      placeholder="Search..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
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
                      <TableHead className="min-w-[120px]">Approved By</TableHead>
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
                            {request.approvedBy ? (
                              <div className="flex flex-col">
                                <div className="font-medium text-sm">{request.approvedBy.name || 'N/A'}</div>
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
                                    const reason = prompt("Enter rejection reason:");
                                    if (reason) handleReject(request._id, reason);
                                  }}
                                  disabled={isRejecting}
                                  className="text-xs"
                                >
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden sm:inline">Reject</span>
                                  <span className="sm:hidden">X</span>
                                </Button>
                              </div>
                            ) : request.status === "Approved" && request.payrollId?.payslipUrl && request.payrollId?._id ? (
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
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {isApproving ? "Approving..." : "Sure, Approve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

