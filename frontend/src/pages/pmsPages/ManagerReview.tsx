import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Star, Send, User, TrendingUp, Award, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  selfRating: number;
  goals: {
    id: string;
    title: string;
    progress: number;
    selfRating: number;
    managerRating: number;
  }[];
  managerRating: number;
  strengths: string;
  improvements: string;
  recommendation: string;
  incrementPercent: number;
  bonusPercent: number;
}

export default function ManagerReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "1",
      name: "John Doe",
      role: "Developer",
      department: "Engineering",
      selfRating: 4.2,
      goals: [
        { id: "g1", title: "Code Quality", progress: 85, selfRating: 4, managerRating: 0 },
        { id: "g2", title: "On-time Delivery", progress: 90, selfRating: 5, managerRating: 0 },
        { id: "g3", title: "Bug Resolution", progress: 75, selfRating: 4, managerRating: 0 },
      ],
      managerRating: 0,
      strengths: "",
      improvements: "",
      recommendation: "",
      incrementPercent: 0,
      bonusPercent: 0,
    },
    {
      id: "2",
      name: "Jane Smith",
      role: "Marketing Executive",
      department: "Marketing",
      selfRating: 4.5,
      goals: [
        { id: "g4", title: "Lead Generation", progress: 95, selfRating: 5, managerRating: 0 },
        { id: "g5", title: "Campaign ROI", progress: 80, selfRating: 4, managerRating: 0 },
      ],
      managerRating: 0,
      strengths: "",
      improvements: "",
      recommendation: "",
      incrementPercent: 0,
      bonusPercent: 0,
    },
  ]);

  const handleGoalRating = (employeeId: string, goalId: string, rating: number) => {
    setEmployees(
      employees.map((emp) => {
        if (emp.id === employeeId) {
          const updatedGoals = emp.goals.map((g) =>
            g.id === goalId ? { ...g, managerRating: rating } : g
          );
          const avgRating =
            updatedGoals.reduce((sum, g) => sum + g.managerRating, 0) / updatedGoals.length;
          return { ...emp, goals: updatedGoals, managerRating: avgRating };
        }
        return emp;
      })
    );
  };

  const handleFieldChange = (employeeId: string, field: keyof Employee, value: any) => {
    setEmployees(
      employees.map((emp) => (emp.id === employeeId ? { ...emp, [field]: value } : emp))
    );
  };

  const handleSubmitReview = (employeeId: string) => {
    toast({
      title: "Review Submitted",
      description: "The performance review has been submitted for HR validation.",
    });
  };

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Manager Review</h2>
            <p className="text-sm text-muted-foreground">
              Review and rate team member performance
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <User className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Team Rating</p>
                <p className="text-2xl font-bold">
                  {(employees.reduce((sum, e) => sum + e.selfRating, 0) / employees.length).toFixed(1)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Reviews */}
        <div className="space-y-4">
          {employees.map((employee) => (
            <Card key={employee.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedEmployee(expandedEmployee === employee.id ? null : employee.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{employee.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {employee.role} • {employee.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Self Rating</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{employee.selfRating.toFixed(1)}</span>
                      </div>
                    </div>
                    {expandedEmployee === employee.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedEmployee === employee.id && (
                <CardContent className="space-y-6 pt-0">
                  {/* Goals Table */}
                  <div>
                    <h4 className="font-semibold mb-3">Goal Ratings</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Goal</TableHead>
                          <TableHead className="text-center">Progress</TableHead>
                          <TableHead className="text-center">Self Rating</TableHead>
                          <TableHead className="text-center">Manager Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employee.goals.map((goal) => (
                          <TableRow key={goal.id}>
                            <TableCell className="font-medium">{goal.title}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={goal.progress} className="w-16 h-2" />
                                <span className="text-sm">{goal.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{goal.selfRating}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-1">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <Button
                                    key={rating}
                                    variant={goal.managerRating === rating ? "default" : "outline"}
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => handleGoalRating(employee.id, goal.id, rating)}
                                  >
                                    {rating}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Feedback */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-500" />
                        Strengths
                      </Label>
                      <Textarea
                        value={employee.strengths}
                        onChange={(e) =>
                          handleFieldChange(employee.id, "strengths", e.target.value)
                        }
                        placeholder="List employee strengths..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        Areas for Improvement
                      </Label>
                      <Textarea
                        value={employee.improvements}
                        onChange={(e) =>
                          handleFieldChange(employee.id, "improvements", e.target.value)
                        }
                        placeholder="List areas for improvement..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Recommendation</Label>
                      <Select
                        value={employee.recommendation}
                        onValueChange={(v) => handleFieldChange(employee.id, "recommendation", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="increment">Increment</SelectItem>
                          <SelectItem value="bonus">Bonus</SelectItem>
                          <SelectItem value="promotion">Promotion</SelectItem>
                          <SelectItem value="pip">PIP (Performance Improvement Plan)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Increment %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={employee.incrementPercent}
                        onChange={(e) =>
                          handleFieldChange(employee.id, "incrementPercent", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bonus %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={employee.bonusPercent}
                        onChange={(e) =>
                          handleFieldChange(employee.id, "bonusPercent", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  {/* Manager Rating Summary */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Manager Rating</p>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(employee.managerRating)
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                        <span className="font-bold ml-2">{employee.managerRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <Button onClick={() => handleSubmitReview(employee.id)} className="gap-2">
                      <Send className="w-4 h-4" />
                      Submit Review
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </main>
    </MainLayout>
  );
}
