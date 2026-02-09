import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Check, X, Edit, User, Target, Calendar } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetGoalsQuery, useApproveGoalMutation, useRejectGoalMutation } from "@/store/api/pmsApi";
import { message } from "antd";
import { format } from "date-fns";

interface PendingGoal {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  title: string;
  type: string;
  kpi: string;
  target: string;
  weightage: number;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected" | "modified";
}

export default function GoalApproval() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [modificationNotes, setModificationNotes] = useState("");

  const { data: goalsData, isLoading } = useGetGoalsQuery({
    status: "pending",
    page: 1,
    limit: 50
  });
  const [approveGoal, { isLoading: isApproving }] = useApproveGoalMutation();
  const [rejectGoal, { isLoading: isRejecting }] = useRejectGoalMutation();

  const pendingGoals = goalsData?.data?.goals || [];
  const selectedGoalData = pendingGoals.find(g => g._id === selectedGoal);

  const handleApprove = async (goalId: string) => {
    try {
      await approveGoal({ id: goalId }).unwrap();
      message.success("Goal approved successfully!");
      setSelectedGoal(null);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve goal");
    }
  };

  const handleReject = async (goalId: string) => {
    if (!modificationNotes.trim()) {
      message.error("Please provide rejection reason");
      return;
    }
    try {
      await rejectGoal({ id: goalId, notes: modificationNotes }).unwrap();
      message.success("Goal rejected");
      setSelectedGoal(null);
      setModificationNotes("");
      setModifyDialogOpen(false);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject goal");
    }
  };

  const handleModify = () => {
    if (selectedGoal) {
      setPendingGoals(
        pendingGoals.map((g) =>
          g.id === selectedGoal.id ? { ...g, status: "modified" as const } : g
        )
      );
      setModifyDialogOpen(false);
      setSelectedGoal(null);
      setModificationNotes("");
      toast({
        title: "Goal Modified",
        description: "Modification request sent to employee.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      case "modified":
        return <Badge className="bg-orange-500">Modification Requested</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Goal Approval</h2>
            <p className="text-sm text-muted-foreground">
              Review and approve team goals
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {isLoading ? "..." : pendingGoals.filter((g) => g.status === "pending").length}
              </p>
              <p className="text-sm text-yellow-700">Pending Approval</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {isLoading ? "..." : pendingGoals.filter((g) => g.status === "approved").length}
              </p>
              <p className="text-sm text-green-700">Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">
                {isLoading ? "..." : pendingGoals.filter((g) => g.status === "rejected").length}
              </p>
              <p className="text-sm text-red-700">Rejected</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">
                {isLoading ? "..." : pendingGoals.filter((g) => g.status === "modified").length}
              </p>
              <p className="text-sm text-orange-700">Modified</p>
            </CardContent>
          </Card>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading goals...</div>
          ) : pendingGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pending goals found</div>
          ) : (
            pendingGoals.map((goal) => {
              const employee = goal.employeeId as any;
              const employeeName = employee?.name || "N/A";
              const employeeId = employee?.employeeId || "N/A";
              const department = employee?.department || "N/A";
              
              return (
                <Card key={goal._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{employeeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {employeeId} • {department}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(goal.status)}
                        </div>

                        <div className="pl-12 space-y-2">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="font-medium">{goal.title}</span>
                            <Badge variant="outline">{goal.type}</Badge>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                            <span>KPI: {goal.kpi}</span>
                            <span>Target: {goal.target}</span>
                            <span>Weight: {goal.weightage}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(goal.startDate), "MMM dd, yyyy")} - {format(new Date(goal.endDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {goal.status === "pending" && (
                        <div className="flex gap-2 pl-12 lg:pl-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(goal._id)}
                            disabled={isApproving}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {isApproving ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedGoal(goal._id);
                              setModifyDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedGoal(goal._id);
                              setModifyDialogOpen(true);
                            }}
                            disabled={isRejecting}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {isRejecting ? "Rejecting..." : "Reject"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Modify Dialog */}
        <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Modification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Goal: <strong>{selectedGoalData?.title}</strong>
              </p>
              <Textarea
                placeholder="Enter modification notes or rejection reason..."
                value={modificationNotes}
                onChange={(e) => setModificationNotes(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setModifyDialogOpen(false);
                setModificationNotes("");
              }}>
                Cancel
              </Button>
              {selectedGoal && (
                <Button 
                  onClick={() => {
                    if (modificationNotes.trim()) {
                      handleReject(selectedGoal);
                    } else {
                      message.error("Please provide a reason");
                    }
                  }}
                  disabled={isRejecting}
                >
                  {isRejecting ? "Rejecting..." : "Reject Goal"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
