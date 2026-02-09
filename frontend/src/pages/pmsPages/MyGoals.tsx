import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Target, Calendar, TrendingUp, Clock, Edit, Trash2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetGoalsQuery, useCreateGoalMutation, useUpdateGoalProgressMutation } from "@/store/api/pmsApi";
import { message } from "antd";

interface Goal {
  id: string;
  title: string;
  type: string;
  kpi: string;
  target: string;
  weightage: number;
  startDate: string;
  endDate: string;
  progress: number;
  status: "draft" | "pending" | "approved" | "rejected";
}

const goalTypes = {
  Developer: ["Code Quality", "Delivery", "Bug Fixes", "Code Reviews"],
  Marketing: ["Leads Generated", "CTR", "Campaign ROI", "Social Engagement"],
  BDE: ["Revenue", "Conversions", "New Clients", "Proposals Sent"],
  "Tech Support": ["Tickets Resolved", "Response Time", "Customer Rating"],
  Videographer: ["Projects Completed", "Quality Score", "Delivery Time"],
  Editor: ["Videos Edited", "Quality Score", "Turnaround Time"],
};

export default function MyGoals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Developer");
  const [cycle] = useState("Q1 2024");

  const { data: goalsData, isLoading } = useGetGoalsQuery({ 
    cycle,
    page: 1,
    limit: 50
  });
  const [createGoal, { isLoading: isCreating }] = useCreateGoalMutation();
  const [updateProgress] = useUpdateGoalProgressMutation();

  const goals = goalsData?.data?.goals?.map(g => ({
    id: g._id,
    title: g.title,
    type: g.type,
    kpi: g.kpi,
    target: g.target,
    weightage: g.weightage,
    startDate: g.startDate,
    endDate: g.endDate,
    progress: g.progress,
    status: g.status as Goal['status']
  })) || [];

  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "",
    kpi: "",
    target: "",
    weightage: 10,
    startDate: "",
    endDate: "",
  });

  const handleAddGoal = async () => {
    try {
      await createGoal({
        ...newGoal,
        cycle,
        status: 'pending'
      }).unwrap();
      
      setNewGoal({
        title: "",
        type: "",
        kpi: "",
        target: "",
        weightage: 10,
        startDate: "",
        endDate: "",
      });
      setIsDialogOpen(false);
      toast({
        title: "Goal Created",
        description: "Your goal has been submitted for approval.",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to create goal");
    }
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

  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);

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
                Q1 2024 Performance Cycle
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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(goalTypes).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <Select
                    value={newGoal.type}
                    onValueChange={(v) => setNewGoal({ ...newGoal, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal type" />
                    </SelectTrigger>
                    <SelectContent>
                      {goalTypes[selectedRole as keyof typeof goalTypes]?.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Goal Title</Label>
                  <Input
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder="Enter goal title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>KPI / Metric</Label>
                  <Input
                    value={newGoal.kpi}
                    onChange={(e) => setNewGoal({ ...newGoal, kpi: e.target.value })}
                    placeholder="e.g., Code review score"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target</Label>
                  <Input
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                    placeholder="e.g., 95%"
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
                <p className="text-2xl font-bold">{goals.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {goals.filter((g) => g.status === "approved").length}
                </p>
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
                <p className="text-2xl font-bold">
                  {goals.filter((g) => g.status === "pending").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weightage Used</p>
                <p className="text-2xl font-bold">{totalWeightage}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals List */}
        {isLoading ? (
          <div className="text-center py-8">Loading goals...</div>
        ) : (
          <div className="space-y-4">
            {goals.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No goals found. Create your first goal!</p>
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => (
            <Card key={goal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{goal.title}</h3>
                      <Badge variant="outline">{goal.type}</Badge>
                      <Badge className={`${getStatusColor(goal.status)} text-white`}>
                        {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
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
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {goal.startDate} - {goal.endDate}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
            </CardContent>
          </Card>
        ))
            )}
          </div>
        )}
      </main>
    </MainLayout>
  );
}
