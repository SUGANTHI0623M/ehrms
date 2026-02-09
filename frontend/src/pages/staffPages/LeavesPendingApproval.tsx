import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Eye, Check, X } from "lucide-react";
import { useGetLeavesQuery, useApproveLeaveMutation, useRejectLeaveMutation } from "@/store/api/leaveApi";
import { message } from "antd";
import MainLayout from "@/components/MainLayout";
import { Pagination } from "@/components/ui/Pagination";

interface LeavesPendingApprovalProps {
  employeeId?: string;
}

const LeavesPendingApproval = ({ employeeId }: LeavesPendingApprovalProps = {}) => {
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: leavesData, isLoading } = useGetLeavesQuery({
    employeeId: employeeId || undefined,
    status: employeeId ? undefined : "Pending", // When viewing specific employee, show all statuses; otherwise show only pending for admin
    page: currentPage,
    limit: pageSize
  });
  const [approveLeave, { isLoading: isApproving }] = useApproveLeaveMutation();
  const [rejectLeave] = useRejectLeaveMutation();

  const leaves = leavesData?.data?.leaves || [];
  const pagination = leavesData?.data?.pagination;

  const handleApprove = async (id: string) => {
    try {
      await approveLeave(id).unwrap();
      message.success("Leave approved successfully");
      setApproveConfirmId(null);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve leave");
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectLeave({ id, reason }).unwrap();
      message.success("Leave rejected");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject leave");
    }
  };

  const content = (
    <div className="w-full space-y-6">
      <Card>
          <CardHeader>
            <CardTitle>{employeeId ? "Leaves" : "Leaves Pending Approval"}</CardTitle>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading leaves...</div>
            ) : leaves.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No pending leaves</div>
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="p-3 text-left min-w-[150px]">Employee Name</th>
                          <th className="p-3 text-left min-w-[100px]">Type</th>
                          <th className="p-3 text-left min-w-[80px]">Days</th>
                          <th className="p-3 text-left min-w-[180px]">Dates</th>
                          <th className="p-3 text-left min-w-[100px]">Status</th>
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
                            <td className="p-3">{leave.days} {leave.days === 1 ? 'Day' : 'Days'}</td>
                            <td className="p-3 text-sm">
                              <div className="flex flex-col">
                                <span>{new Date(leave.startDate).toLocaleDateString()}</span>
                                <span className="text-muted-foreground">to</span>
                                <span>{new Date(leave.endDate).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                ● {leave.status}
                              </span>
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
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-xs"
                                  onClick={() => setApproveConfirmId(leave._id)}
                                  disabled={isApproving}
                                >
                                  <Check size={14} className="mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = prompt("Enter rejection reason:");
                                    if (reason) handleReject(leave._id, reason);
                                  }}
                                  className="text-xs"
                                >
                                  <X size={14} className="mr-1" /> Reject
                                </Button>
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
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {isApproving ? "Approving..." : "OK, Approve"}
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
