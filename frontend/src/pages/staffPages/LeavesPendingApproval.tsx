import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Check, X, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetLeavesQuery, useApproveLeaveMutation, useRejectLeaveMutation } from "@/store/api/leaveApi";
import { message } from "antd";
import MainLayout from "@/components/MainLayout";
import { Pagination } from "@/components/ui/pagination";
import AdminLeaveDashboard from "@/components/leave/AdminLeaveDashboard";

interface LeavesPendingApprovalProps {
  employeeId?: string;
}

const LeavesPendingApproval = ({ employeeId }: LeavesPendingApprovalProps = {}) => {
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectLeaveId, setRejectLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(employeeId ? undefined : undefined);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [searchInput, setSearchInput] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const { data: leavesData, isLoading } = useGetLeavesQuery({
    employeeId: employeeId || undefined,
    status: employeeId ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageSize
  });
  const [approveLeave, { isLoading: isApproving }] = useApproveLeaveMutation();
  const [rejectLeave] = useRejectLeaveMutation();

  const rawLeaves = leavesData?.data?.leaves || [];
  const pagination = leavesData?.data?.pagination;

  const leaves = useMemo(() => {
    const list = [...rawLeaves];
    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (sortBy === "employee-az") {
      list.sort((a, b) => (a.employeeId?.name || "").localeCompare(b.employeeId?.name || ""));
    } else if (sortBy === "employee-za") {
      list.sort((a, b) => (b.employeeId?.name || "").localeCompare(a.employeeId?.name || ""));
    } else if (sortBy === "status") {
      const order = { Pending: 0, Approved: 1, Rejected: 2 };
      list.sort((a, b) => (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3));
    }
    return list;
  }, [rawLeaves, sortBy]);

  const handleApprove = async (id: string) => {
    try {
      await approveLeave(id).unwrap();
      message.success("Leave approved successfully");
      setApproveConfirmId(null);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve leave");
    }
  };

  const handleReject = async () => {
    if (!rejectLeaveId) return;
    if (!rejectionReason.trim()) {
      message.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectLeave({ id: rejectLeaveId, reason: rejectionReason }).unwrap();
      message.success("Leave rejected");
      setRejectDialogOpen(false);
      setRejectLeaveId(null);
      setRejectionReason("");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject leave");
    }
  };

  const content = (
    <div className="w-full space-y-6">
      {!employeeId && (
        <AdminLeaveDashboard
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
        />
      )}
      <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>{employeeId ? "Leaves" : "Leaves Pending Approval"}</CardTitle>
              {!employeeId && (
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Select
                    value={statusFilter ?? "all"}
                    onValueChange={(v) => {
                      setStatusFilter(v === "all" ? undefined : v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="employee-az">Employee A-Z</SelectItem>
                      <SelectItem value="employee-za">Employee Z-A</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by employee name or ID..."
                      className="pl-10"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading leaves...</div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {statusFilter ? `No ${statusFilter.toLowerCase()} leaves` : "No leaves found"}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="p-3 text-left min-w-[150px]">Employee Name</th>
                          <th className="p-3 text-left min-w-[100px]">Type</th>
                          <th className="p-3 text-left min-w-[80px]">Duration</th>
                          <th className="p-3 text-left min-w-[180px]">Dates</th>
                          <th className="p-3 text-left min-w-[100px]">Status</th>
                          <th className="p-3 text-left min-w-[200px]">Remarks/Reason</th>
                          <th className="p-3 text-left min-w-[200px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaves.map((leave) => (
                          <tr key={leave._id} className="border-b hover:bg-muted/20">
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-medium">{leave.employeeId?.name || "N/A"}</span>
                                {leave.employeeId?.employeeId && (
                                  <span className="text-xs text-muted-foreground">{leave.employeeId.employeeId}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">{leave.leaveType}</td>
                            <td className="p-3">{leave.days} {leave.days === 1 ? 'day' : 'days'}</td>
                            <td className="p-3 text-sm">
                              <div className="flex flex-col">
                                <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                                <span className="text-muted-foreground">to</span>
                                <span>{new Date(leave.endDate).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                  leave.status === "Approved"
                                    ? "bg-[#fef3c7] text-[#b45309]"
                                    : leave.status === "Pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : leave.status === "Rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {leave.status}
                              </span>
                            </td>
                            <td className="p-3">
                              {leave.status === "Approved" && leave.approvedBy ? (
                                <div className="text-xs space-y-1">
                                  <div className="font-medium text-[#efaa1f]">Approved by: {leave.approvedBy.name || 'N/A'}</div>
                                  {leave.approvedAt && (
                                    <div className="text-muted-foreground">
                                      {new Date(leave.approvedAt).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : leave.status === "Rejected" && (leave.rejectionReason || leave.rejectedBy) ? (
                                <div className="text-xs space-y-1">
                                  {leave.rejectionReason && (
                                    <div className="font-medium    mb-1">Reason: {leave.rejectionReason}</div>
                                  )}
                                  {leave.rejectedBy && (
                                    <div className="text-muted-foreground">
                                      Rejected by: {leave.rejectedBy.name || 'N/A'}
                                      {leave.rejectedAt && ` on ${new Date(leave.rejectedAt).toLocaleDateString()}`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedLeave(leave)}
                                  className="text-xs"
                                >
                                  <Eye size={14} className="mr-1" /> View
                                </Button>
                                {leave.status === "Pending" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-[#efaa1f] hover:bg-[#d97706] text-xs"
                                      onClick={() => setApproveConfirmId(leave._id)}
                                      disabled={isApproving}
                                    >
                                      <Check size={14} className="mr-1" /> Approve
                                    </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setRejectLeaveId(leave._id);
                                    setRejectDialogOpen(true);
                                  }}
                                  className="text-xs"
                                >
                                  <X size={14} className="mr-1" /> Reject
                                </Button>
                                  </>
                                ) : leave.status === "Approved" ? (
                                  <span className="bg-[#fef3c7] text-[#d97706] px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center">
                                    <Check size={12} className="mr-1" /> Approved
                                  </span>
                                ) : leave.status === "Rejected" ? (
                                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center">
                                    <X size={12} className="mr-1" /> Rejected
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination */}
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
          </CardContent>
        </Card>

        {/* VIEW MODAL */}
        <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
          <DialogContent className="max-w-lg rounded-xl w-[95%] sm:w-full">
            <DialogHeader>
              <DialogTitle>Leave Details</DialogTitle>
            </DialogHeader>

            {selectedLeave && (
              <div className="space-y-4 text-sm">
                <Detail label="Employee Name" value={selectedLeave.employeeId?.name || "N/A"} />
                {selectedLeave.employeeId?.employeeId && (
                  <Detail label="Employee ID" value={selectedLeave.employeeId.employeeId} />
                )}
                <Detail label="Leave Type" value={selectedLeave.leaveType} />
                <Detail label="Days" value={`${selectedLeave.days} ${selectedLeave.days === 1 ? 'Day' : 'Days'}`} />
                <Detail 
                  label="Dates" 
                  value={`${new Date(selectedLeave.startDate).toLocaleDateString()} - ${new Date(selectedLeave.endDate).toLocaleDateString()}`} 
                />
                <Detail label="Status" value={selectedLeave.status} />
                <Detail label="Reason" value={selectedLeave.reason || "N/A"} />
                {selectedLeave.approvedBy && (
                  <Detail label="Approved By" value={selectedLeave.approvedBy.name || "N/A"} />
                )}
                {selectedLeave.approvedAt && (
                  <Detail label="Approved On" value={new Date(selectedLeave.approvedAt).toLocaleDateString()} />
                )}
                <Detail label="Applied On" value={new Date(selectedLeave.createdAt).toLocaleDateString()} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* APPROVE CONFIRMATION DIALOG */}
        <AlertDialog open={!!approveConfirmId} onOpenChange={(open) => !open && setApproveConfirmId(null)}>
          <AlertDialogContent className="w-[95%] sm:w-full max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this leave request? This action cannot be undone.
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
            setRejectLeaveId(null);
            setRejectionReason("");
          }
        }}>
          <DialogContent className="w-[95%] sm:w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Leave Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this leave request. This will be visible to the employee.
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
                  setRejectLeaveId(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Reject Leave
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

export default LeavesPendingApproval;

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b pb-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);
