import { useParams, useNavigate } from "react-router-dom";
import { useGetGoalByIdQuery } from "@/store/api/pmsApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Calendar, FileText, ArrowLeft, User, Target, TrendingUp, Award, CheckCircle, XCircle, Clock, Link2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useGetKRAsQuery } from "@/store/api/kraApi";

const GoalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useGetGoalByIdQuery(id || "", {
    skip: !id,
  });
  const { data: krasData } = useGetKRAsQuery({ page: 1, limit: 1000 });
  
  const goal = data?.data?.goal;
  const kras = krasData?.data?.kras || [];
  
  // Find linked KRA for the goal
  const linkedKRA = goal?.kraId 
    ? (typeof goal.kraId === 'string' 
        ? kras.find(k => k._id === goal.kraId)
        : goal.kraId)
    : null;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    const errorMessage =
      (error as any)?.data?.error?.message ||
      (error as any)?.error?.message ||
      "Failed to load goal";

    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-red-500 mb-4">
                <h3 className="text-lg font-semibold mb-2">Error loading goal</h3>
                <p className="text-sm">{errorMessage}</p>
              </div>
              <div className="flex gap-4 justify-center mt-6">
                <Button variant="outline" onClick={() => navigate("/pms/goals")}>
                  Go Back
                </Button>
                <Button onClick={() => refetch()}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!goal) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Goal not found</p>
              <Button variant="outline" onClick={() => navigate("/pms/goals")} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const employee = goal.employeeId as any;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "rejected":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      case "modified":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "pending":
        return "Pending Approval";
      case "rejected":
        return "Rejected";
      case "completed":
        return "Completed";
      case "modified":
        return "Modified";
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={() => navigate("/pms/goals")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Goal Details</h2>
              <p className="text-sm text-muted-foreground">
                View complete goal information and progress
              </p>
            </div>
          </div>
        </div>

        {/* Goal Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{goal.title}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(goal.status)}>
                    {getStatusLabel(goal.status)}
                  </Badge>
                  <Badge variant="outline">{goal.type}</Badge>
                  <Badge variant="outline">{goal.cycle}</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employee Info */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{employee?.name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">
                  {employee?.employeeId || "N/A"} • {employee?.designation || "N/A"} • {employee?.department || "N/A"}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-bold">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>

            {/* Linked KRA Section */}
            {linkedKRA && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">Linked KRA</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/kra")}
                  >
                    View KRA <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <p className="font-medium mb-1">{typeof linkedKRA === 'object' && 'title' in linkedKRA ? linkedKRA.title : 'KRA'}</p>
                <div className="text-sm text-muted-foreground">
                  KPI: {typeof linkedKRA === 'object' && 'kpi' in linkedKRA ? linkedKRA.kpi : 'N/A'} • 
                  Target: {typeof linkedKRA === 'object' && 'target' in linkedKRA ? linkedKRA.target : 'N/A'}
                </div>
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">KPI</span>
                </div>
                <p className="font-semibold">{goal.kpi}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Target</span>
                </div>
                <p className="font-semibold">{goal.target}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Weightage</span>
                </div>
                <p className="font-semibold">{goal.weightage}%</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {goal.startDate ? format(new Date(goal.startDate), "PPP") : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {goal.endDate ? format(new Date(goal.endDate), "PPP") : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            {goal.achievements && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Achievements
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{goal.achievements}</p>
              </div>
            )}

            {/* Challenges */}
            {goal.challenges && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  Challenges
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{goal.challenges}</p>
              </div>
            )}

            {/* Reviews */}
            {(goal.selfReview || goal.managerReview || goal.hrReview) && (
              <div className="space-y-4">
                <h3 className="font-semibold">Reviews</h3>
                
                {goal.selfReview && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Self Review</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{goal.selfReview.rating}/5</span>
                      </div>
                    </div>
                    {goal.selfReview.comments && (
                      <p className="text-sm text-muted-foreground">{goal.selfReview.comments}</p>
                    )}
                    {goal.selfReview.submittedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted: {format(new Date(goal.selfReview.submittedAt), "PPP")}
                      </p>
                    )}
                  </div>
                )}

                {goal.managerReview && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Manager Review</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-blue-400 text-blue-400" />
                        <span className="font-semibold">{goal.managerReview.rating}/5</span>
                      </div>
                    </div>
                    {goal.managerReview.comments && (
                      <p className="text-sm text-muted-foreground">{goal.managerReview.comments}</p>
                    )}
                    {goal.managerReview.submittedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted: {format(new Date(goal.managerReview.submittedAt), "PPP")}
                      </p>
                    )}
                  </div>
                )}

                {goal.hrReview && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">HR Review</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-green-400 text-green-400" />
                        <span className="font-semibold">{goal.hrReview.rating}/5</span>
                      </div>
                    </div>
                    {goal.hrReview.comments && (
                      <p className="text-sm text-muted-foreground">{goal.hrReview.comments}</p>
                    )}
                    {goal.hrReview.submittedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted: {format(new Date(goal.hrReview.submittedAt), "PPP")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {goal.managerNotes && (
              <div className="space-y-2">
                <h3 className="font-semibold">Manager Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{goal.managerNotes}</p>
              </div>
            )}

            {goal.hrNotes && (
              <div className="space-y-2">
                <h3 className="font-semibold">HR Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{goal.hrNotes}</p>
              </div>
            )}

            {/* Created/Assigned Info */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {goal.createdBy && (
                  <div>
                    <span className="text-muted-foreground">Created by: </span>
                    <span className="font-medium">{(goal.createdBy as any)?.name || "N/A"}</span>
                  </div>
                )}
                {goal.assignedBy && (
                  <div>
                    <span className="text-muted-foreground">Assigned by: </span>
                    <span className="font-medium">{(goal.assignedBy as any)?.name || "N/A"}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default GoalDetail;


