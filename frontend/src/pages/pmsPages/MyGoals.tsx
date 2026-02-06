import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Target, Calendar, TrendingUp, Clock, Edit, Trash2, Search, User, CheckCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetGoalsQuery, useCreateGoalMutation, useUpdateGoalProgressMutation, useCompleteGoalMutation, Goal } from "@/store/api/pmsApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { useGetKRAsQuery } from "@/store/api/kraApi";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector } from "@/store/hooks";

export default function MyGoals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // Check if accessed from employee route or admin route
  // Employee route: /employee/performance/my-goals → show only own goals
  // Admin route: /pms/my-goals → show all goals (if user has permissions)
  const isEmployeeRoute = location.pathname === '/employee/performance/my-goals';
  
  // Determine if we should show all goals:
  // 1. If accessed from admin route (/pms/my-goals) AND user has admin permissions → show all
  // 2. If accessed from employee route (/employee/performance/my-goals) → show only own goals
  const shouldShowAllGoals = useMemo(() => {
    // Employee route always shows only own goals
    if (isEmployeeRoute) {
      return false;
    }
    
    // Admin route: check if user has admin permissions
    if (!currentUser) return false;
    const role = currentUser.role;
    
    // Admin, HR, Manager always see all goals
    if (role === 'Admin' || role === 'HR' || role === 'Manager' || role === 'Super Admin') {
      return true;
    }
    
    // Employees with performance sidebarPermission see all goals (admin access)
    if (role === 'Employee' || role === 'EmployeeAdmin') {
      const sidebarPerms = (currentUser as any).sidebarPermissions || [];
      return sidebarPerms.includes('performance');
    }
    
    return false;
  }, [currentUser, isEmployeeRoute]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [progressUpdate, setProgressUpdate] = useState({ progress: 0, achievements: "", challenges: "" });
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch all cycles for filter
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  const cycles = cyclesData?.data?.cycles || [];

  // Get all cycles from cycles API (not from goals)
  const uniqueCycles = useMemo(() => {
    return cycles.map((c: any) => c.name).filter(Boolean).sort();
  }, [cycles]);

  const { data: goalsData, isLoading, refetch } = useGetGoalsQuery({ 
    cycle: cycleFilter !== "all" ? cycleFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit,
    myGoals: !shouldShowAllGoals // If admin access, show all goals. Otherwise, show only own goals.
  });
  const [createGoal, { isLoading: isCreating }] = useCreateGoalMutation();
  const [updateProgress] = useUpdateGoalProgressMutation();
  const [completeGoal, { isLoading: isCompleting }] = useCompleteGoalMutation();

  const goals = goalsData?.data?.goals || [];
  const pagination = goalsData?.data?.pagination;

  const { data: krasData } = useGetKRAsQuery({ page: 1, limit: 1000 });
  const kras = krasData?.data?.kras || [];

  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "",
    kpi: "",
    target: "",
    weightage: 10,
    startDate: "",
    endDate: "",
    cycle: "",
    kraId: "",
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [cycleFilter, statusFilter]);

  const handleAddGoal = async () => {
    if (!newGoal.title || !newGoal.type || !newGoal.kpi || !newGoal.target || !newGoal.startDate || !newGoal.endDate || !newGoal.cycle) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields including review cycle",
        variant: "destructive",
      });
      return;
    }

    try {
      const goalData: any = {
        title: newGoal.title,
        type: newGoal.type,
        kpi: newGoal.kpi,
        target: newGoal.target,
        weightage: newGoal.weightage,
        startDate: newGoal.startDate,
        endDate: newGoal.endDate,
        cycle: newGoal.cycle,
      };
      
      // Add kraId if selected
      if (newGoal.kraId) {
        goalData.kraId = newGoal.kraId;
      }
      
      await createGoal(goalData).unwrap();
      
      setNewGoal({
        title: "",
        type: "",
        kpi: "",
        target: "",
        weightage: 10,
        startDate: "",
        endDate: "",
        cycle: "",
        kraId: "",
      });
      setIsDialogOpen(false);
      toast({
        title: "Goal Created",
        description: "Your goal has been submitted for approval.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to create goal",
        variant: "destructive",
      });
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await completeGoal({ id: goalId }).unwrap();
      toast({
        title: "Goal Completed",
        description: "Your goal has been marked as completed. Waiting for admin approval.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to complete goal",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoalForProgress) return;

    try {
      await updateProgress({
        id: selectedGoalForProgress._id,
        progress: progressUpdate.progress,
        achievements: progressUpdate.achievements,
        challenges: progressUpdate.challenges,
      }).unwrap();
      
      toast({
        title: "Success",
        description: "Progress updated successfully",
      });
      setIsProgressDialogOpen(false);
      setSelectedGoalForProgress(null);
      setProgressUpdate({ progress: 0, achievements: "", challenges: "" });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update progress",
        variant: "destructive",
      });
    }
  };

  const openProgressDialog = (goal: Goal) => {
    setSelectedGoalForProgress(goal);
    setProgressUpdate({
      progress: goal.progress || 0,
      achievements: goal.achievements || "",
      challenges: goal.challenges || "",
    });
    setIsProgressDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Separate goals by type
  const selfCreatedGoals = useMemo(() => {
    return goals.filter((g: Goal) => g.createdBy && !g.assignedBy);
  }, [goals]);

  const adminAssignedGoals = useMemo(() => {
    return goals.filter((g: Goal) => g.assignedBy);
  }, [goals]);

  const totalWeightage = goals.reduce((sum: number, goal: Goal) => sum + (goal.weightage || 0), 0);
  const approvedGoals = goals.filter((g: Goal) => g.status === "approved");
  const pendingGoals = goals.filter((g: Goal) => g.status === "pending");
  const completedGoals = goals.filter((g: Goal) => g.status === "completed");

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">My Goals</h2>
              <p className="text-sm text-muted-foreground">
                Manage your goals and track progress
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a new performance goal for yourself. This will be submitted for manager approval.
                </p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Review Cycle *</Label>
                  <Select
                    value={newGoal.cycle}
                    onValueChange={(value) => setNewGoal({ ...newGoal, cycle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCycles.map((cycle) => (
                        <SelectItem key={cycle} value={cycle}>
                          {cycle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Goal Title *</Label>
                  <Input
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="Enter goal title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Goal Type *</Label>
                  <Input
                    value={newGoal.type}
                    onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
                    placeholder="e.g., Code Quality, Revenue, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label>KPI *</Label>
                  <Input
                    value={newGoal.kpi}
                    onChange={(e) => setNewGoal({ ...newGoal, kpi: e.target.value })}
                    placeholder="e.g., Code Review Score, Revenue, Customer Satisfaction"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target *</Label>
                  <Input
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    placeholder="e.g., 4.5/5, $50K, 95%, 100 units"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Weightage (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={newGoal.weightage}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, weightage: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newGoal.startDate}
                      onChange={(e) => setNewGoal({ ...newGoal, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newGoal.endDate}
                      onChange={(e) => setNewGoal({ ...newGoal, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Link to KRA (Optional)</Label>
                  <Select
                    value={newGoal.kraId || "none"}
                    onValueChange={(value) => setNewGoal({ ...newGoal, kraId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a KRA to link this goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - Don't link to KRA</SelectItem>
                      {kras.map((kra: any) => (
                        <SelectItem key={kra._id} value={kra._id}>
                          {kra.title} - {kra.kpi} ({kra.timeframe})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Linking to a KRA will automatically update the KRA's progress based on this goal's progress.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddGoal} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Submit for Approval"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Goals</p>
                <p className="text-2xl font-bold">{pagination?.total || goals.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedGoals.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingGoals.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedGoals.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={cycleFilter}
                onValueChange={(value) => {
                  setCycleFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Cycles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  {uniqueCycles.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {cycle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Goals List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {goals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No goals found. Create your first goal!</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Admin Assigned Goals */}
                {adminAssignedGoals.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Goals Assigned by Admin ({adminAssignedGoals.length})
                    </h3>
                    {adminAssignedGoals.map((goal: Goal) => (
                      <Card key={goal._id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-semibold text-lg">{goal.title}</h3>
                                <Badge variant="outline">{goal.type}</Badge>
                                <Badge className={`${getStatusColor(goal.status)} text-white`}>
                                  {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                                </Badge>
                                <Badge variant="default">Admin-Assigned</Badge>
                              </div>
                              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                                <span>KPI: {goal.kpi}</span>
                                <span>Target: {goal.target}</span>
                                <span>Weight: {goal.weightage}%</span>
                                <span>Cycle: {goal.cycle}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Progress</span>
                                  <span>{goal.progress}%</span>
                                </div>
                                <Progress value={goal.progress} className="h-2" />
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(goal.startDate), "MMM dd, yyyy")} - {format(new Date(goal.endDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {(goal.status === "approved" || (goal.status === "completed" && goal.progress < 100)) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openProgressDialog(goal)}
                                  >
                                    Update Progress
                                  </Button>
                                  {goal.progress >= 100 && goal.status === "approved" && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleCompleteGoal(goal._id)}
                                      disabled={isCompleting}
                                    >
                                      {isCompleting ? "Completing..." : "Complete Goal"}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Self Created Goals */}
                {selfCreatedGoals.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      My Goals ({selfCreatedGoals.length})
                    </h3>
                    {selfCreatedGoals.map((goal: Goal) => (
                      <Card key={goal._id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-semibold text-lg">{goal.title}</h3>
                                <Badge variant="outline">{goal.type}</Badge>
                                <Badge className={`${getStatusColor(goal.status)} text-white`}>
                                  {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                                </Badge>
                                <Badge variant="secondary">Self-Created</Badge>
                              </div>
                              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                                <span>KPI: {goal.kpi}</span>
                                <span>Target: {goal.target}</span>
                                <span>Weight: {goal.weightage}%</span>
                                <span>Cycle: {goal.cycle}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Progress</span>
                                  <span>{goal.progress}%</span>
                                </div>
                                <Progress value={goal.progress} className="h-2" />
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(goal.startDate), "MMM dd, yyyy")} - {format(new Date(goal.endDate), "MMM dd, yyyy")}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {(goal.status === "approved" || (goal.status === "completed" && goal.progress < 100)) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openProgressDialog(goal)}
                                  >
                                    Update Progress
                                  </Button>
                                  {goal.progress >= 100 && goal.status === "approved" && (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleCompleteGoal(goal._id)}
                                      disabled={isCompleting}
                                    >
                                      {isCompleting ? "Completing..." : "Complete Goal"}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Progress Update Dialog */}
        <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Goal Progress</DialogTitle>
            </DialogHeader>
            {selectedGoalForProgress && (
              <div className="space-y-4 py-4">
                <div>
                  <Label>Goal: {selectedGoalForProgress.title}</Label>
                </div>
                <div>
                  <Label>Progress (%) *</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={progressUpdate.progress}
                    onChange={(e) =>
                      setProgressUpdate({
                        ...progressUpdate,
                        progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Achievements</Label>
                  <Textarea
                    value={progressUpdate.achievements}
                    onChange={(e) =>
                      setProgressUpdate({ ...progressUpdate, achievements: e.target.value })
                    }
                    placeholder="Describe your achievements..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Challenges</Label>
                  <Textarea
                    value={progressUpdate.challenges}
                    onChange={(e) =>
                      setProgressUpdate({ ...progressUpdate, challenges: e.target.value })
                    }
                    placeholder="Describe any challenges faced..."
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsProgressDialogOpen(false);
                  setSelectedGoalForProgress(null);
                  setProgressUpdate({ progress: 0, achievements: "", challenges: "" });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateProgress}>
                Update Progress
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
