import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Upload, MessageSquare, Clock, TrendingUp, FileText, Send } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetGoalsQuery, useUpdateGoalProgressMutation } from "@/store/api/pmsApi";
import { message } from "antd";
import { format } from "date-fns";

export default function GoalProgress() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [cycle] = useState("Q1 2024");

  const { data: goalsData, isLoading } = useGetGoalsQuery({
    status: "approved",
    cycle,
    page: 1,
    limit: 50
  });
  const [updateProgress, { isLoading: isUpdating }] = useUpdateGoalProgressMutation();

  const goals = goalsData?.data?.goals || [];
  const selectedGoal = goals.find(g => g._id === selectedGoalId);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">My Goals</h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading goals...</div>
            ) : goals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No approved goals found</div>
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
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{goal.title}</h4>
                      <Badge variant="outline">{goal.progress}%</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span>KPI: {goal.kpi}</span> • <span>Target: {goal.target}</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <Badge variant={goal.status === "completed" ? "default" : "secondary"}>
                        {goal.status}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(goal.endDate), "MMM dd, yyyy")}
                      </span>
                    </div>
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
                  <CardTitle className="text-base">{selectedGoal.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Current Progress</p>
                      <Progress value={selectedGoal.progress} className="h-3" />
                      <p className="text-xs text-muted-foreground mt-1">{selectedGoal.progress}% complete</p>
                    </div>
                    
                    {selectedGoal.achievements && (
                      <div>
                        <p className="text-sm font-medium mb-2">Achievements</p>
                        <p className="text-sm text-muted-foreground">{selectedGoal.achievements}</p>
                      </div>
                    )}
                    
                    {selectedGoal.challenges && (
                      <div>
                        <p className="text-sm font-medium mb-2">Challenges</p>
                        <p className="text-sm text-muted-foreground">{selectedGoal.challenges}</p>
                      </div>
                    )}

                    {selectedGoal.selfReview && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">Self Review</p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Rating: {selectedGoal.selfReview.rating}/5</Badge>
                          <span className="text-xs text-muted-foreground">
                            {selectedGoal.selfReview.submittedAt && format(new Date(selectedGoal.selfReview.submittedAt), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedGoal.selfReview.comments}</p>
                      </div>
                    )}

                    {selectedGoal.managerReview && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">Manager Review</p>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Rating: {selectedGoal.managerReview.rating}/5</Badge>
                          <span className="text-xs text-muted-foreground">
                            {selectedGoal.managerReview.submittedAt && format(new Date(selectedGoal.managerReview.submittedAt), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{selectedGoal.managerReview.comments}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a goal to view its details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
