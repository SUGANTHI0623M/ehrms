import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Upload, MessageSquare, Clock, TrendingUp, FileText, Send, Link2, ExternalLink, Filter, Target, Award, Calendar, User, BarChart3, Eye } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetGoalsQuery, useUpdateGoalProgressMutation } from "@/store/api/pmsApi";
import { useGetKRAsQuery } from "@/store/api/kraApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { message } from "antd";
import { format } from "date-fns";

export default function GoalProgress() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("approved");

  // Fetch all cycles from cycles API
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  const cycles = cyclesData?.data?.cycles || [];
  
  // Get all cycles from cycles API (not from goals)
  const uniqueCycles = useMemo(() => {
    return cycles.map((c: any) => c.name).filter(Boolean).sort();
  }, [cycles]);

  // Fetch all goals for statistics display
  const { data: allGoalsData } = useGetGoalsQuery({ limit: 1000 });
  const allGoals = allGoalsData?.data?.goals || [];

  const { data: goalsData, isLoading } = useGetGoalsQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    cycle: cycleFilter !== "all" ? cycleFilter : undefined,
    page: 1,
    limit: 100
  });
  const { data: krasData } = useGetKRAsQuery({ page: 1, limit: 1000 });
  const [updateProgress, { isLoading: isUpdating }] = useUpdateGoalProgressMutation();

  const goals = goalsData?.data?.goals || [];
  const kras = krasData?.data?.kras || [];
  const selectedGoal = goals.find(g => g._id === selectedGoalId);
  
  // Find linked KRA for selected goal
  const linkedKRA = selectedGoal?.kraId 
    ? (typeof selectedGoal.kraId === 'string' 
        ? kras.find(k => k._id === selectedGoal.kraId)
        : selectedGoal.kraId)
    : null;

  // Calculate statistics
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const avgProgress = goals.length > 0 
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0;
  const onTrackGoals = goals.filter(g => g.progress >= 50 && g.progress < 100).length;

  const handleUpdateProgress = async () => {
    if (!selectedGoalId) return;
    
    try {
      await updateProgress({
        id: selectedGoalId,
        progress: newProgress,
        achievements: newComment
      }).unwrap();
      
      message.success("Progress updated successfully!");
      setUpdateDialogOpen(false);
      setNewProgress(0);
      setNewComment("");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update progress");
    }
  };

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Goal Progress Tracking</h2>
              <p className="text-sm text-muted-foreground">
                Update and monitor your goal progress
              </p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Cycle" />
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
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Goals</p>
                  <p className="text-2xl font-bold">{totalGoals}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Progress</p>
                  <p className="text-2xl font-bold">{avgProgress}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedGoals}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On Track</p>
                  <p className="text-2xl font-bold">{onTrackGoals}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">My Goals</h3>
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-muted-foreground">Loading goals...</div>
                </CardContent>
              </Card>
            ) : goals.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                      <Target className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {statusFilter === "all" 
                          ? "No Goals Found" 
                          : `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Goals`}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {statusFilter === "all" 
                          ? "Try adjusting your filters or create a new goal to get started." 
                          : `No goals with "${statusFilter}" status found. Try selecting a different status or cycle.`}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button variant="outline" onClick={() => {
                          setStatusFilter("all");
                          setCycleFilter("all");
                        }}>
                          Clear Filters
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/pms/my-goals")}>
                          Create New Goal
                        </Button>
                      </div>
                    </div>
                    {allGoals.length > 0 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg w-full max-w-md">
                        <p className="text-xs font-semibold mb-2">Available Goals by Status:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Badge variant="outline">All: {allGoals.length}</Badge>
                          <Badge variant="outline">Approved: {allGoals.filter((g: any) => g.status === "approved").length}</Badge>
                          <Badge variant="outline">Pending: {allGoals.filter((g: any) => g.status === "pending").length}</Badge>
                          <Badge variant="outline">Completed: {allGoals.filter((g: any) => g.status === "completed").length}</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => (
                <Card
                  key={goal._id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedGoalId === goal._id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedGoalId(goal._id);
                    setNewProgress(goal.progress);
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-1">{goal.title}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{goal.type}</Badge>
                          <Badge variant={goal.status === "completed" ? "default" : goal.status === "approved" ? "secondary" : "outline"} className="text-xs">
                            {goal.status}
                          </Badge>
                          {goal.cycle && (
                            <Badge variant="outline" className="text-xs">{goal.cycle}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{goal.progress}%</p>
                        <p className="text-xs text-muted-foreground">Progress</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">KPI</p>
                        <p className="font-medium">{goal.kpi}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Target</p>
                        <p className="font-medium">{goal.target}</p>
                      </div>
                    </div>
                    
                    <Progress value={goal.progress} className="h-2" />
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(goal.startDate), "MMM dd")} - {format(new Date(goal.endDate), "MMM dd")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>Weight: {goal.weightage}%</span>
                      </div>
                    </div>
                    
                    {goal.kraId && (
                      <div className="flex items-center gap-1 text-xs text-primary pt-1 border-t">
                        <Link2 className="w-3 h-3" />
                        <span>Linked to KRA</span>
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/pms/goals/${goal._id}`);
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Timeline & Updates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Progress Timeline</h3>
              {selectedGoal && (
                <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Update Progress
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Goal Progress</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Progress: {newProgress}%</Label>
                        <Slider
                          value={[newProgress]}
                          onValueChange={(v) => setNewProgress(v[0])}
                          max={100}
                          step={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Comment / Achievement</Label>
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Describe your progress..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Attachments (Optional)</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">
                            Upload proof (docs, screenshots, links)
                          </p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateProgress} disabled={isUpdating}>
                        <Send className="w-4 h-4 mr-2" />
                        {isUpdating ? "Updating..." : "Submit Update"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {selectedGoal ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{selectedGoal.title}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{selectedGoal.type}</Badge>
                        <Badge variant={selectedGoal.status === "completed" ? "default" : "secondary"}>
                          {selectedGoal.status}
                        </Badge>
                        {selectedGoal.cycle && (
                          <Badge variant="outline">{selectedGoal.cycle}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/pms/goals/${selectedGoal._id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Full Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Employee Info */}
                  {selectedGoal.employeeId && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">Employee</p>
                      </div>
                      <p className="text-sm font-medium">{(selectedGoal.employeeId as any)?.name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedGoal.employeeId as any)?.employeeId || "N/A"} • {(selectedGoal.employeeId as any)?.department || "N/A"}
                      </p>
                    </div>
                  )}

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">KPI</p>
                      </div>
                      <p className="text-sm font-semibold">{selectedGoal.kpi}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Target</p>
                      </div>
                      <p className="text-sm font-semibold">{selectedGoal.target}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Weightage</p>
                      </div>
                      <p className="text-sm font-semibold">{selectedGoal.weightage}%</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">End Date</p>
                      </div>
                      <p className="text-sm font-semibold">{format(new Date(selectedGoal.endDate), "MMM dd, yyyy")}</p>
                    </div>
                  </div>

                  {/* Linked KRA Section */}
                  {linkedKRA && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-primary" />
                          <p className="text-sm font-semibold">Linked KRA</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={() => navigate("/kra")}
                        >
                          View KRA <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                      <p className="text-sm font-medium mb-1">{typeof linkedKRA === 'object' && 'title' in linkedKRA ? linkedKRA.title : 'KRA'}</p>
                      <div className="text-xs text-muted-foreground">
                        KPI: {typeof linkedKRA === 'object' && 'kpi' in linkedKRA ? linkedKRA.kpi : 'N/A'} • 
                        Target: {typeof linkedKRA === 'object' && 'target' in linkedKRA ? linkedKRA.target : 'N/A'}
                      </div>
                    </div>
                  )}
                    
                  {/* Progress Section */}
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">Current Progress</p>
                      <p className="text-sm font-bold text-primary">{selectedGoal.progress}%</p>
                    </div>
                    <Progress value={selectedGoal.progress} className="h-3" />
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Started: {format(new Date(selectedGoal.startDate), "MMM dd, yyyy")}</span>
                      <span>Due: {format(new Date(selectedGoal.endDate), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                    
                  {/* Achievements & Challenges */}
                  <div className="grid grid-cols-1 gap-3">
                    {selectedGoal.achievements && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-green-800">Achievements</p>
                        <p className="text-sm text-green-700 whitespace-pre-wrap">{selectedGoal.achievements}</p>
                      </div>
                    )}
                    
                    {selectedGoal.challenges && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm font-semibold mb-1 text-orange-800">Challenges</p>
                        <p className="text-sm text-orange-700 whitespace-pre-wrap">{selectedGoal.challenges}</p>
                      </div>
                    )}
                  </div>

                  {/* Reviews Section */}
                  {(selectedGoal.selfReview || selectedGoal.managerReview || selectedGoal.hrReview) && (
                    <div className="space-y-3 pt-3 border-t">
                      <p className="text-sm font-semibold">Reviews</p>
                      
                      {selectedGoal.selfReview && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-blue-800">Self Review</p>
                            <Badge variant="outline" className="text-xs">Rating: {selectedGoal.selfReview.rating}/5</Badge>
                          </div>
                          {selectedGoal.selfReview.comments && (
                            <p className="text-sm text-blue-700 mt-1">{selectedGoal.selfReview.comments}</p>
                          )}
                          {selectedGoal.selfReview.submittedAt && (
                            <p className="text-xs text-blue-600 mt-1">
                              Submitted: {format(new Date(selectedGoal.selfReview.submittedAt), "MMM dd, yyyy")}
                            </p>
                          )}
                        </div>
                      )}

                      {selectedGoal.managerReview && (
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-purple-800">Manager Review</p>
                            <Badge variant="outline" className="text-xs">Rating: {selectedGoal.managerReview.rating}/5</Badge>
                          </div>
                          {selectedGoal.managerReview.comments && (
                            <p className="text-sm text-purple-700 mt-1">{selectedGoal.managerReview.comments}</p>
                          )}
                          {selectedGoal.managerReview.submittedAt && (
                            <p className="text-xs text-purple-600 mt-1">
                              Submitted: {format(new Date(selectedGoal.managerReview.submittedAt), "MMM dd, yyyy")}
                            </p>
                          )}
                        </div>
                      )}

                      {selectedGoal.hrReview && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-green-800">HR Review</p>
                            <Badge variant="outline" className="text-xs">Rating: {selectedGoal.hrReview.rating}/5</Badge>
                          </div>
                          {selectedGoal.hrReview.comments && (
                            <p className="text-sm text-green-700 mt-1">{selectedGoal.hrReview.comments}</p>
                          )}
                          {selectedGoal.hrReview.submittedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Submitted: {format(new Date(selectedGoal.hrReview.submittedAt), "MMM dd, yyyy")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                      <TrendingUp className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Select a Goal</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click on any goal from the list to view detailed progress, achievements, challenges, and reviews.
                      </p>
                    </div>
                    <div className="w-full max-w-md space-y-3">
                      <div className="p-4 bg-muted/50 rounded-lg text-left">
                        <p className="text-xs font-semibold mb-2">What you can do:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          <li>View detailed progress and timeline</li>
                          <li>Update goal progress percentage</li>
                          <li>Add achievements and challenges</li>
                          <li>See linked KRA information</li>
                          <li>Review self, manager, and HR reviews</li>
                        </ul>
                      </div>
                      {goals.length > 0 && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-xs font-semibold mb-2 text-primary">Quick Actions:</p>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedGoalId(goals[0]._id)}
                              className="w-full"
                            >
                              View First Goal
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate("/pms/goals")}
                              className="w-full"
                            >
                              Manage All Goals
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
