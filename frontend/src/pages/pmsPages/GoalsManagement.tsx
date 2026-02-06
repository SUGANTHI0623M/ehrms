import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Target,
  Calendar,
  TrendingUp,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Eye,
  Filter,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useApproveGoalMutation,
  useRejectGoalMutation,
  useApproveGoalCompletionMutation,
  Goal,
} from "@/store/api/pmsApi";
import { useGetKRAsQuery } from "@/store/api/kraApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { format } from "date-fns";

const GoalsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const limit = 20;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, cycleFilter, employeeFilter, searchTerm]);

  // Fetch goals with filters
  const { data: goalsData, isLoading, refetch } = useGetGoalsQuery({
    employeeId: employeeFilter !== "all" ? employeeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    cycle: cycleFilter !== "all" ? cycleFilter : undefined,
    page,
    limit,
  });

  // Fetch all goals for filter options
  const { data: allGoalsData } = useGetGoalsQuery({ limit: 1000 });
  const { data: staffData } = useGetStaffQuery({ page: 1, limit: 1000 });
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });

  const [createGoal, { isLoading: isCreating }] = useCreateGoalMutation();
  const [updateGoal, { isLoading: isUpdating }] = useUpdateGoalMutation();
  const [approveGoal, { isLoading: isApproving }] = useApproveGoalMutation();
  const [rejectGoal, { isLoading: isRejecting }] = useRejectGoalMutation();
  const [approveGoalCompletion, { isLoading: isApprovingCompletion }] = useApproveGoalCompletionMutation();
  
  const { data: krasData } = useGetKRAsQuery({ page: 1, limit: 1000 });
  const kras = krasData?.data?.kras || [];

  const goals = goalsData?.data?.goals || [];
  const allGoals = allGoalsData?.data?.goals || [];
  const staffList = staffData?.data?.staff || [];
  const cycles = cyclesData?.data?.cycles || [];

  // Get all cycles from cycles API (not from goals)
  const uniqueCycles = useMemo(() => {
    return cycles.map((c: any) => c.name).filter(Boolean).sort();
  }, [cycles]);

  const [newGoal, setNewGoal] = useState({
    employeeId: "",
    title: "",
    type: "",
    kpi: "",
    target: "",
    weightage: 10,
    startDate: "",
    endDate: "",
    cycle: "",
  });

  const handleCreateGoal = async () => {
    if (
      !newGoal.employeeId ||
      !newGoal.title ||
      !newGoal.type ||
      !newGoal.kpi ||
      !newGoal.target ||
      !newGoal.startDate ||
      !newGoal.endDate ||
      !newGoal.cycle
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createGoal(newGoal).unwrap();
      toast({
        title: "Success",
        description: "Goal assigned to employee successfully",
      });
      setIsCreateDialogOpen(false);
      setNewGoal({
        employeeId: "",
        title: "",
        type: "",
        kpi: "",
        target: "",
        weightage: 10,
        startDate: "",
        endDate: "",
        cycle: "",
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

  const handleApproveGoal = async (goalId: string) => {
    try {
      await approveGoal({ id: goalId }).unwrap();
      toast({
        title: "Success",
        description: "Goal approved successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to approve goal",
        variant: "destructive",
      });
    }
  };

  const handleRejectGoal = async (goalId: string, notes: string) => {
    if (!notes.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide rejection reason",
        variant: "destructive",
      });
      return;
    }
    try {
      await rejectGoal({ id: goalId, notes }).unwrap();
      toast({
        title: "Success",
        description: "Goal rejected",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to reject goal",
        variant: "destructive",
      });
    }
  };

  const handleApproveCompletion = async (goalId: string) => {
    try {
      await approveGoalCompletion({ id: goalId }).unwrap();
      toast({
        title: "Success",
        description: "Goal completion approved",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to approve goal completion",
        variant: "destructive",
      });
    }
  };

  // Calculate KRA/KPI stats
  const goalsWithKRA = allGoals.filter((g: Goal) => g.kraId).length;
  const completedGoalsWithKRA = allGoals.filter((g: Goal) => g.kraId && g.status === "completed").length;
  const avgKRAProgress = kras.length > 0
    ? Math.round(kras.reduce((sum: number, k: any) => sum + (k.overallPercent || 0), 0) / kras.length)
    : 0;

  // Filter goals by search term
  const filteredGoals = useMemo(() => {
    if (!searchTerm.trim()) return goals;
    const search = searchTerm.toLowerCase();
    return goals.filter((goal: Goal) => {
      const employee = goal.employeeId as any;
      return (
        goal.title?.toLowerCase().includes(search) ||
        goal.kpi?.toLowerCase().includes(search) ||
        goal.type?.toLowerCase().includes(search) ||
        employee?.name?.toLowerCase().includes(search) ||
        employee?.employeeId?.toLowerCase().includes(search) ||
        employee?.department?.toLowerCase().includes(search)
      );
    });
  }, [goals, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pagination = goalsData?.data?.pagination;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Goals Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all employee goals
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Assign Goal to Employee</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a performance goal for an employee. This goal will be automatically approved.
                  </p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Employee *</Label>
                    <Select
                      value={newGoal.employeeId}
                      onValueChange={(value) =>
                        setNewGoal({ ...newGoal, employeeId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map((staff: any) => (
                          <SelectItem key={staff._id} value={staff._id}>
                            {staff.name} ({staff.employeeId}) - {staff.designation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Review Cycle *</Label>
                    <Select
                      value={newGoal.cycle}
                      onValueChange={(value) =>
                        setNewGoal({ ...newGoal, cycle: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((cycle: any) => (
                          <SelectItem key={cycle._id} value={cycle.name}>
                            {cycle.name} ({cycle.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Goal Title *</Label>
                    <Input
                      value={newGoal.title}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, title: e.target.value })
                      }
                      placeholder="Enter goal title"
                    />
                  </div>
                  <div>
                    <Label>Goal Type *</Label>
                    <Input
                      value={newGoal.type}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, type: e.target.value })
                      }
                      placeholder="e.g., Code Quality, Revenue, etc."
                    />
                  </div>
                  <div>
                    <Label>KPI *</Label>
                    <Input
                      value={newGoal.kpi}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, kpi: e.target.value })
                      }
                      placeholder="e.g., Code Review Score, Revenue, Customer Satisfaction"
                    />
                  </div>
                  <div>
                    <Label>Target *</Label>
                    <Input
                      value={newGoal.target}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, target: e.target.value })
                      }
                      placeholder="e.g., 4.5/5, $50K, 95%, 100 units"
                    />
                  </div>
                  <div>
                    <Label>Weightage (%) *</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newGoal.weightage}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          weightage: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={newGoal.startDate}
                        onChange={(e) =>
                          setNewGoal({ ...newGoal, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <Input
                        type="date"
                        value={newGoal.endDate}
                        onChange={(e) =>
                          setNewGoal({ ...newGoal, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGoal} disabled={isCreating}>
                    {isCreating ? "Assigning..." : "Assign Goal"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Goals
                </CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pagination?.total || allGoals.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {allGoals.filter((g: Goal) => g.status === "approved").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Approval
                </CardTitle>
                <Clock className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {allGoals.filter((g: Goal) => g.status === "pending").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {allGoals.filter((g: Goal) => g.status === "completed").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KRA/KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">
                  Goals Linked to KRA
                </CardTitle>
                <Target className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {goalsWithKRA}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {allGoals.length > 0 
                    ? `${Math.round((goalsWithKRA / allGoals.length) * 100)}% of total goals`
                    : "0%"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700">
                  Completed Goals with KRA
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {completedGoalsWithKRA}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {goalsWithKRA > 0 
                    ? `${Math.round((completedGoalsWithKRA / goalsWithKRA) * 100)}% completion rate`
                    : "No KRA-linked goals"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">
                  Average KRA Progress
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  {avgKRAProgress}%
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Across {kras.length} KRA{kras.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by goal title, KPI, employee name..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
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
              </div>
              <div className="mt-4">
                <Select
                  value={employeeFilter}
                  onValueChange={(value) => {
                    setEmployeeFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {staffList.map((staff: any) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.name} ({staff.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Goals List */}
          {filteredGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No goals found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredGoals.map((goal: Goal) => {
                const employee = goal.employeeId as any;
                const isEmployeeCreated = goal.createdBy && !goal.assignedBy;
                return (
                  <Card key={goal._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg">{goal.title}</h3>
                            {getStatusBadge(goal.status)}
                            <Badge variant="outline">{goal.type}</Badge>
                            {isEmployeeCreated && (
                              <Badge variant="secondary">Self-Created</Badge>
                            )}
                            {goal.assignedBy && (
                              <Badge variant="default">Admin-Assigned</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>
                                {employee?.name || "N/A"} ({employee?.employeeId || "N/A"})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{goal.cycle}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>KPI: {goal.kpi}</span>
                            <span>Target: {goal.target}</span>
                            <span>Weight: {goal.weightage}%</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {format(new Date(goal.startDate), "MMM dd, yyyy")} -{" "}
                              {format(new Date(goal.endDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {goal.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveGoal(goal._id)}
                                disabled={isApproving}
                                className="w-full"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const notes = prompt("Rejection reason:");
                                  if (notes) handleRejectGoal(goal._id, notes);
                                }}
                                disabled={isRejecting}
                                className="w-full"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          {goal.status === "completed" && !(goal as any).completedApprovedAt && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white w-full"
                              onClick={() => handleApproveCompletion(goal._id)}
                              disabled={isApprovingCompletion}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {isApprovingCompletion ? "Approving..." : "Approve Completion"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/pms/goals/${goal._id}`)}
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages, p + 1))
                }
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  );
};

export default GoalsManagement;

