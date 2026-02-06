import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Check, X, Edit, User, Target, Calendar, Link2, ExternalLink, Eye, Award, TrendingUp, Clock, CheckCircle, History } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetGoalsQuery, useApproveGoalMutation, useRejectGoalMutation, useModifyGoalMutation, useApproveGoalCompletionMutation, useReopenGoalMutation } from "@/store/api/pmsApi";
import { useGetKRAsQuery } from "@/store/api/kraApi";
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
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [modificationNotes, setModificationNotes] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [reopenNotes, setReopenNotes] = useState("");
  const [actionType, setActionType] = useState<"modify" | "reject" | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  // Fetch all goals for summary stats
  const { data: allGoalsData, refetch: refetchAllGoals } = useGetGoalsQuery({ limit: 1000 });
  const allGoals = allGoalsData?.data?.goals || [];
  
  // Fetch pending goals for the list
  const { data: goalsData, isLoading, refetch: refetchPendingGoals } = useGetGoalsQuery({
    status: "pending",
    page: 1,
    limit: 100
  });
  
  // Fetch all goals to find completed ones awaiting approval
  const { data: allGoalsForCompletion, refetch: refetchCompletedGoals } = useGetGoalsQuery({
    page: 1,
    limit: 1000
  });
  
  const { data: krasData } = useGetKRAsQuery({ page: 1, limit: 1000 });
  const [approveGoal, { isLoading: isApproving }] = useApproveGoalMutation();
  const [rejectGoal, { isLoading: isRejecting }] = useRejectGoalMutation();
  const [modifyGoal, { isLoading: isModifying }] = useModifyGoalMutation();
  const [approveGoalCompletion, { isLoading: isApprovingCompletion }] = useApproveGoalCompletionMutation();
  const [reopenGoal, { isLoading: isReopening }] = useReopenGoalMutation();

  const pendingGoals = goalsData?.data?.goals || [];
  const allGoalsList = allGoalsForCompletion?.data?.goals || [];
  
  // Filter goals that are completed by employee but not yet approved by admin
  // This includes:
  // 1. Goals with status="completed" that don't have completedApprovedAt (not yet approved by admin)
  // 2. Goals with status="approved" and 100% progress that haven't been marked as completed yet
  const goalsAwaitingCompletion = allGoalsList.filter((g: any) => {
    // Primary case: Goal is marked as "completed" by employee but admin hasn't approved it yet
    if (g.status === 'completed' && !g.completedApprovedAt) {
      return true;
    }
    // Secondary case: Goal is approved and has 100% progress but employee hasn't marked it as completed yet
    // (This shouldn't happen in normal flow, but we include it for safety)
    if (g.status === 'approved' && g.progress >= 100 && !g.completedAt) {
      return true;
    }
    return false;
  });
  
  const kras = krasData?.data?.kras || [];
  const selectedGoalData = pendingGoals.find(g => g._id === selectedGoal) || goalsAwaitingCompletion.find((g: any) => g._id === selectedGoal);
  
  // Helper to get linked KRA for a goal
  const getLinkedKRA = (goal: any) => {
    if (!goal?.kraId) return null;
    if (typeof goal.kraId === 'string') {
      return kras.find(k => k._id === goal.kraId);
    }
    return goal.kraId;
  };

  const handleApprove = async (goalId: string) => {
    try {
      await approveGoal({ id: goalId, notes: approvalNotes || undefined }).unwrap();
      message.success("Goal approved successfully!");
      setSelectedGoal(null);
      setApprovalNotes("");
      setApproveDialogOpen(false);
      // Refetch data to update the UI
      await Promise.all([refetchAllGoals(), refetchPendingGoals(), refetchCompletedGoals()]);
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
      // Refetch data to update the UI
      await Promise.all([refetchAllGoals(), refetchPendingGoals(), refetchCompletedGoals()]);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject goal");
    }
  };

  const handleModify = async (goalId: string) => {
    if (!modificationNotes.trim()) {
      message.error("Please provide modification notes");
      return;
    }
    try {
      await modifyGoal({ id: goalId, notes: modificationNotes }).unwrap();
      message.success("Modification request sent to employee");
      setSelectedGoal(null);
      setModificationNotes("");
      setModifyDialogOpen(false);
      // Refetch data to update the UI
      await Promise.all([refetchAllGoals(), refetchPendingGoals(), refetchCompletedGoals()]);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to request modification");
    }
  };

  const handleApproveCompletion = async (goalId: string) => {
    try {
      await approveGoalCompletion({ id: goalId, approvalNotes: completionNotes || undefined }).unwrap();
      message.success("Goal completion approved successfully!");
      setSelectedGoal(null);
      setCompletionNotes("");
      setCompletionDialogOpen(false);
      // Refetch data to update the UI
      await Promise.all([refetchAllGoals(), refetchPendingGoals(), refetchCompletedGoals()]);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve goal completion");
    }
  };

  const handleReopen = async (goalId: string) => {
    try {
      await reopenGoal({ id: goalId, reopenNotes: reopenNotes || undefined }).unwrap();
      message.success("Goal reopened successfully");
      setSelectedGoal(null);
      setReopenNotes("");
      setReopenDialogOpen(false);
      // Refetch data to update the UI
      await Promise.all([refetchAllGoals(), refetchPendingGoals(), refetchCompletedGoals()]);
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reopen goal");
    }
  };

  // Helper function to safely format dates
  const safeFormatDate = (dateValue: string | Date | undefined | null, formatString: string = "MMM dd, yyyy 'at' h:mm a") => {
    if (!dateValue) return "N/A";
    try {
      let date: Date;
      if (typeof dateValue === 'string') {
        if (!dateValue.trim()) return "N/A";
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else {
        return "N/A";
      }
      
      if (isNaN(date.getTime()) || !date.getTime()) {
        return "N/A";
      }
      
      return format(date, formatString);
    } catch (error) {
      return "N/A";
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

        {/* Summary Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-gray-700">
                  {allGoals.length}
                </p>
                <p className="text-xs text-gray-600 mt-1">Total Goals</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-700">
                  {allGoals.filter((g) => g.status === "pending").length}
                </p>
                <p className="text-xs text-yellow-700 mt-1">Pending</p>
                <p className="text-xs text-yellow-600 mt-1">Awaiting review</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-700">
                  {allGoals.filter((g) => g.status === "approved").length}
                </p>
                <p className="text-xs text-green-700 mt-1">Approved</p>
                <p className="text-xs text-green-600 mt-1">Active goals</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">
                  {allGoals.filter((g) => g.status === "completed" && (g as any).completedApprovedAt).length}
                </p>
                <p className="text-xs text-blue-700 mt-1">Completed</p>
                <p className="text-xs text-blue-600 mt-1">Finalized</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-700">
                  {goalsAwaitingCompletion.length}
                </p>
                <p className="text-xs text-purple-700 mt-1">Awaiting Completion</p>
                <p className="text-xs text-purple-600 mt-1">Need approval</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-700">
                  {allGoals.filter((g) => g.status === "rejected").length}
                </p>
                <p className="text-xs text-red-700 mt-1">Rejected</p>
                <p className="text-xs text-red-600 mt-1">Declined</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">
                  {allGoals.filter((g) => g.status === "modified").length}
                </p>
                <p className="text-xs text-orange-700 mt-1">Modified</p>
                <p className="text-xs text-orange-600 mt-1">Needs revision</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-300">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">
                  {allGoals.length > 0 
                    ? Math.round(allGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / allGoals.length)
                    : 0}%
                </p>
                <p className="text-xs text-indigo-700 mt-1">Avg Progress</p>
                <p className="text-xs text-indigo-600 mt-1">Across all goals</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-300">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-teal-700">
                  {allGoals.filter((g) => g.progress >= 100).length}
                </p>
                <p className="text-xs text-teal-700 mt-1">100% Progress</p>
                <p className="text-xs text-teal-600 mt-1">Fully completed</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-300">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-pink-700">
                  {allGoals.filter((g) => g.progress > 0 && g.progress < 50).length}
                </p>
                <p className="text-xs text-pink-700 mt-1">Below 50%</p>
                <p className="text-xs text-pink-600 mt-1">Need attention</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Goal History & Timeline */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Goal History & Timeline</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete history of all goals with their status changes and timeline ({allGoals.length} total)
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? "Hide" : "Show"} History
              </Button>
            </div>

            {showHistory && (
              <>
                {allGoals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No goals found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {[...allGoals]
                  .sort((a: any, b: any) => {
                    // Sort by most recent first (by updatedAt or createdAt)
                    try {
                      const dateA = (a.updatedAt || a.createdAt) ? new Date(a.updatedAt || a.createdAt).getTime() : 0;
                      const dateB = (b.updatedAt || b.createdAt) ? new Date(b.updatedAt || b.createdAt).getTime() : 0;
                      if (isNaN(dateA)) return 1;
                      if (isNaN(dateB)) return -1;
                      return dateB - dateA;
                    } catch (error) {
                      return 0;
                    }
                  })
                  .map((goal: any, index: number) => {
                    const employee = goal.employeeId as any;
                    const employeeName = employee?.name || "N/A";
                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
                      approved: "bg-green-100 text-green-800 border-green-300",
                      completed: "bg-blue-100 text-blue-800 border-blue-300",
                      rejected: "bg-red-100 text-red-800 border-red-300",
                      modified: "bg-orange-100 text-orange-800 border-orange-300",
                      draft: "bg-gray-100 text-gray-800 border-gray-300"
                    };

                    return (
                      <div
                        key={goal._id}
                        className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors relative"
                      >
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            statusColors[goal.status] || statusColors.draft
                          }`}></div>
                          {index < allGoals.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-1 min-h-[60px]"></div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-semibold text-base">{goal.title}</h4>
                                <Badge className={statusColors[goal.status] || statusColors.draft}>
                                  {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                                </Badge>
                                {goal.progress >= 100 && (
                                  <Badge className="bg-green-500 text-white">
                                    {goal.progress}% Complete
                                  </Badge>
                                )}
                                {goal.progress > 0 && goal.progress < 100 && (
                                  <Badge variant="outline">
                                    {goal.progress}% Progress
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mb-2">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {employeeName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {goal.kpi}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {goal.cycle}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/pms/goals/${goal._id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Timeline Events */}
                          <div className="space-y-1.5 text-xs">
                            {goal.createdAt && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>
                                  Created: {safeFormatDate(goal.createdAt)}
                                </span>
                              </div>
                            )}
                            {goal.status === "approved" && goal.updatedAt && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                <span>
                                  Approved: {safeFormatDate(goal.updatedAt)}
                                </span>
                              </div>
                            )}
                            {goal.status === "completed" && goal.completedAt && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <CheckCircle className="w-3 h-3" />
                                <span>
                                  Completed by employee: {safeFormatDate(goal.completedAt)}
                                </span>
                              </div>
                            )}
                            {goal.completedApprovedAt && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                <span>
                                  Completion approved: {safeFormatDate(goal.completedApprovedAt)}
                                </span>
                              </div>
                            )}
                            {goal.status === "rejected" && goal.updatedAt && (
                              <div className="flex items-center gap-2 text-red-600">
                                <X className="w-3 h-3" />
                                <span>
                                  Rejected: {safeFormatDate(goal.updatedAt)}
                                </span>
                              </div>
                            )}
                            {goal.status === "modified" && goal.updatedAt && (
                              <div className="flex items-center gap-2 text-orange-600">
                                <Edit className="w-3 h-3" />
                                <span>
                                  Modification requested: {safeFormatDate(goal.updatedAt)}
                                </span>
                              </div>
                            )}
                            {goal.progress > 0 && goal.progress < 100 && (
                              <div className="flex items-center gap-2 text-primary">
                                <TrendingUp className="w-3 h-3" />
                                <span>Current Progress: {goal.progress}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Goals List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-muted-foreground">Loading goals...</div>
              </CardContent>
            </Card>
          ) : pendingGoals.length === 0 && goalsAwaitingCompletion.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                    <Target className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No Goals Awaiting Review</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      There are currently no goals awaiting your approval. All goals have been reviewed or employees haven't submitted new goals yet.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button variant="outline" onClick={() => navigate("/pms/my-goals")}>
                        View All Goals
                      </Button>
                      <Button variant="outline" onClick={() => navigate("/pms/goal-progress")}>
                        Check Goal Progress
                      </Button>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md w-full">
                    <p className="text-xs font-semibold mb-2 text-left">Quick Stats:</p>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Goals</p>
                        <p className="text-sm font-semibold">{allGoals.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Approved</p>
                        <p className="text-sm font-semibold text-green-600">{allGoals.filter((g) => g.status === "approved").length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rejected</p>
                        <p className="text-sm font-semibold text-red-600">{allGoals.filter((g) => g.status === "rejected").length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Modified</p>
                        <p className="text-sm font-semibold text-orange-600">{allGoals.filter((g) => g.status === "modified").length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingGoals.map((goal) => {
              const employee = goal.employeeId as any;
              const employeeName = employee?.name || "N/A";
              const employeeId = employee?.employeeId || "N/A";
              const department = employee?.department || "N/A";
              
              return (
                <Card key={goal._id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header Section */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-lg">{employeeName}</p>
                              {getStatusBadge(goal.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {employeeId} • {department}
                            </p>
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-base">{goal.title}</span>
                              <Badge variant="outline">{goal.type}</Badge>
                              {goal.cycle && (
                                <Badge variant="outline" className="text-xs">{goal.cycle}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/pms/goals/${goal._id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">KPI</p>
                          </div>
                          <p className="text-sm font-semibold">{goal.kpi}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Target</p>
                          </div>
                          <p className="text-sm font-semibold">{goal.target}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Weightage</p>
                          </div>
                          <p className="text-sm font-semibold">{goal.weightage}%</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Timeline</p>
                          </div>
                          <p className="text-xs font-semibold">
                            {safeFormatDate(goal.startDate, "MMM dd")} - {safeFormatDate(goal.endDate, "MMM dd")}
                          </p>
                        </div>
                      </div>

                      {/* Progress if available */}
                      {goal.progress !== undefined && goal.progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current Progress</span>
                            <span className="font-semibold">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                      )}

                      {/* Linked KRA */}
                      {getLinkedKRA(goal) && (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Linked KRA</p>
                                <p className="text-sm font-semibold">
                                  {typeof getLinkedKRA(goal) === 'object' && 'title' in getLinkedKRA(goal)! ? getLinkedKRA(goal)!.title : 'KRA'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => navigate("/kra")}
                            >
                              View <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {goal.status === "pending" && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setSelectedGoal(goal._id);
                              setApproveDialogOpen(true);
                            }}
                            disabled={isApproving}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {isApproving ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            onClick={() => {
                              setSelectedGoal(goal._id);
                              setActionType("modify");
                              setModifyDialogOpen(true);
                            }}
                            disabled={isModifying}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {isModifying ? "Processing..." : "Modify"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedGoal(goal._id);
                              setActionType("reject");
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

          {/* Goals Awaiting Completion Approval (100% Progress) */}
          {goalsAwaitingCompletion.length > 0 && (
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-12 bg-blue-500 rounded"></div>
                <div>
                  <h3 className="text-xl font-bold">Goals Awaiting Completion Approval</h3>
                  <p className="text-sm text-muted-foreground">
                    These goals have been completed by employees (100% progress) and are waiting for your approval
                  </p>
                </div>
                <Badge className="bg-blue-500 text-white text-base px-3 py-1">{goalsAwaitingCompletion.length}</Badge>
              </div>
              
              {goalsAwaitingCompletion.map((goal: any) => {
                const employee = goal.employeeId as any;
                const employeeName = employee?.name || "N/A";
                const employeeId = employee?.employeeId || "N/A";
                const department = employee?.department || "N/A";
                
                return (
                  <Card key={goal._id} className="hover:shadow-lg transition-all border-l-4 border-l-blue-500 bg-blue-50/30">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header Section */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-lg">{employeeName}</p>
                                <Badge className="bg-green-500 text-white">100% Complete</Badge>
                                <Badge className="bg-yellow-500 text-white">Awaiting Approval</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {employeeId} • {department}
                              </p>
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-base">{goal.title}</span>
                                <Badge variant="outline">{goal.type}</Badge>
                                {goal.cycle && (
                                  <Badge variant="outline" className="text-xs">{goal.cycle}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/pms/goals/${goal._id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">KPI</p>
                            </div>
                            <p className="text-sm font-semibold">{goal.kpi}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Award className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Target</p>
                            </div>
                            <p className="text-sm font-semibold">{goal.target}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Weightage</p>
                            </div>
                            <p className="text-sm font-semibold">{goal.weightage}%</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">Timeline</p>
                            </div>
                            <p className="text-xs font-semibold">
                              {safeFormatDate(goal.startDate, "MMM dd")} - {safeFormatDate(goal.endDate, "MMM dd")}
                            </p>
                          </div>
                        </div>

                        {/* Progress - 100% */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Progress</span>
                            <span className="font-bold text-green-600 text-lg">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-3" />
                          <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>Goal completed by employee - Awaiting admin approval</span>
                          </div>
                        </div>

                        {/* Completion Info */}
                        {goal.completedAt && (
                          <div className="p-3 bg-blue-100 rounded-lg border border-blue-300">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <p className="text-sm font-semibold text-blue-800">Completion Details</p>
                            </div>
                            <p className="text-xs text-blue-700 mb-1">
                              <span className="font-medium">Completed on:</span> {safeFormatDate(goal.completedAt)}
                            </p>
                            {goal.achievements && (
                              <p className="text-xs text-blue-700 mt-2">
                                <span className="font-medium">Achievements:</span> {goal.achievements}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Linked KRA */}
                        {getLinkedKRA(goal) && (
                          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-primary" />
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Linked KRA</p>
                                  <p className="text-sm font-semibold">
                                    {typeof getLinkedKRA(goal) === 'object' && 'title' in getLinkedKRA(goal)! ? getLinkedKRA(goal)!.title : 'KRA'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => navigate("/kra")}
                              >
                                View <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons - Prominent */}
                        <div className="bg-white p-4 rounded-lg border-2 border-blue-200 shadow-sm">
                          <p className="text-sm font-semibold text-center mb-3 text-blue-700">
                            Admin Action Required
                          </p>
                          <div className="flex gap-3">
                            <Button
                              size="lg"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md"
                              onClick={() => {
                                setSelectedGoal(goal._id);
                                setCompletionDialogOpen(true);
                              }}
                              disabled={isApprovingCompletion}
                            >
                              <CheckCircle className="w-5 h-5 mr-2" />
                              {isApprovingCompletion ? "Approving..." : "✓ Approve Completion"}
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              className="flex-1 text-orange-600 border-2 border-orange-600 hover:bg-orange-50 shadow-md font-semibold"
                              onClick={() => {
                                setSelectedGoal(goal._id);
                                setReopenDialogOpen(true);
                              }}
                              disabled={isReopening}
                            >
                              <X className="w-5 h-5 mr-2" />
                              {isReopening ? "Reopening..." : "↻ Reopen Goal"}
                            </Button>
                          </div>
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            Approve to finalize completion • Reopen to send back to employee
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={(open) => {
          setApproveDialogOpen(open);
          if (!open) {
            setApprovalNotes("");
            setSelectedGoal(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Goal: <strong>{selectedGoalData?.title}</strong>
              </p>
              <div>
                <label className="text-sm font-medium mb-2 block">Approval Notes (Optional)</label>
                <Textarea
                  placeholder="Add any notes or comments about this approval..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setApproveDialogOpen(false);
                setApprovalNotes("");
                setSelectedGoal(null);
              }}>
                Cancel
              </Button>
              {selectedGoal && (
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(selectedGoal)}
                  disabled={isApproving}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {isApproving ? "Approving..." : "Confirm Approval"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modify/Reject Dialog */}
        <Dialog open={modifyDialogOpen} onOpenChange={(open) => {
          setModifyDialogOpen(open);
          if (!open) {
            setModificationNotes("");
            setSelectedGoal(null);
            setActionType(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "modify" ? "Request Modification" : actionType === "reject" ? "Reject Goal" : "Modify or Reject Goal"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Goal: <strong>{selectedGoalData?.title}</strong>
              </p>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {actionType === "modify" ? "Modification Notes *" : actionType === "reject" ? "Rejection Reason *" : "Notes / Reason *"}
                </label>
                <Textarea
                  placeholder={
                    actionType === "modify" 
                      ? "Explain what needs to be modified in this goal..." 
                      : actionType === "reject"
                      ? "Explain why this goal is being rejected..."
                      : "Enter modification notes or rejection reason..."
                  }
                  value={modificationNotes}
                  onChange={(e) => setModificationNotes(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {actionType === "modify" 
                    ? "Provide clear feedback about what needs to be changed. The employee will need to update and resubmit the goal."
                    : actionType === "reject"
                    ? "Provide a clear reason for rejection. This will notify the employee."
                    : "Provide clear feedback for the employee about what needs to be changed or why the goal is being rejected."}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => {
                setModifyDialogOpen(false);
                setModificationNotes("");
                setSelectedGoal(null);
                setActionType(null);
              }}>
                Cancel
              </Button>
              {selectedGoal && (
                <>
                  {actionType === "modify" ? (
                    <Button 
                      variant="outline"
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      onClick={() => {
                        if (modificationNotes.trim()) {
                          handleModify(selectedGoal);
                        } else {
                          message.error("Please provide modification notes");
                        }
                      }}
                      disabled={isModifying}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {isModifying ? "Processing..." : "Request Modification"}
                    </Button>
                  ) : actionType === "reject" ? (
                    <Button 
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (modificationNotes.trim()) {
                          handleReject(selectedGoal);
                        } else {
                          message.error("Please provide a rejection reason");
                        }
                      }}
                      disabled={isRejecting}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          if (modificationNotes.trim()) {
                            handleModify(selectedGoal);
                          } else {
                            message.error("Please provide modification notes");
                          }
                        }}
                        disabled={isModifying}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {isModifying ? "Processing..." : "Request Modification"}
                      </Button>
                      <Button 
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (modificationNotes.trim()) {
                            handleReject(selectedGoal);
                          } else {
                            message.error("Please provide a rejection reason");
                          }
                        }}
                        disabled={isRejecting}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {isRejecting ? "Rejecting..." : "Reject Goal"}
                      </Button>
                    </>
                  )}
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Completion Dialog */}
        <Dialog open={completionDialogOpen} onOpenChange={(open) => {
          setCompletionDialogOpen(open);
          if (!open) {
            setCompletionNotes("");
            setSelectedGoal(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Goal Completion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Goal: <strong>{selectedGoalData?.title}</strong>
              </p>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">
                  This goal has been completed by the employee with 100% progress. Approving will finalize the completion and update related KRA progress.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Approval Notes (Optional)</label>
                <Textarea
                  placeholder="Add any notes or comments about this completion approval..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setCompletionDialogOpen(false);
                setCompletionNotes("");
                setSelectedGoal(null);
              }}>
                Cancel
              </Button>
              {selectedGoal && (
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApproveCompletion(selectedGoal)}
                  disabled={isApprovingCompletion}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {isApprovingCompletion ? "Approving..." : "Confirm Approval"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reopen Goal Dialog */}
        <Dialog open={reopenDialogOpen} onOpenChange={(open) => {
          setReopenDialogOpen(open);
          if (!open) {
            setReopenNotes("");
            setSelectedGoal(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reopen Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Goal: <strong>{selectedGoalData?.title}</strong>
              </p>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-700 font-medium mb-2">
                  ⚠️ Reopening this goal will:
                </p>
                <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                  <li>Change status back to "approved"</li>
                  <li>Reset completion date and approval status</li>
                  <li>Allow the employee to continue working on it</li>
                  <li>Send a notification to the employee with your reason</li>
                </ul>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reopen Reason (Optional)</label>
                <Textarea
                  placeholder="Explain why this goal is being reopened..."
                  value={reopenNotes}
                  onChange={(e) => setReopenNotes(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This reason will be sent to the employee as a notification.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setReopenDialogOpen(false);
                setReopenNotes("");
                setSelectedGoal(null);
              }}>
                Cancel
              </Button>
              {selectedGoal && (
                <Button 
                  variant="outline"
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  onClick={() => handleReopen(selectedGoal)}
                  disabled={isReopening}
                >
                  <X className="w-4 h-4 mr-1" />
                  {isReopening ? "Reopening..." : "Confirm Reopen"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
