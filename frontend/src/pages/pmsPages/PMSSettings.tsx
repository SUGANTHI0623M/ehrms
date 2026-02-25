import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Settings, Target, Calendar, Users, Star, Info } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { useGetPerformanceAnalyticsQuery } from "@/store/api/performanceReviewApi";
import { Skeleton } from "@/components/ui/skeleton";

export default function PMSSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch current cycles and analytics
  const { data: cyclesData, isLoading: cyclesLoading } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  const { data: analyticsData, isLoading: analyticsLoading } = useGetPerformanceAnalyticsQuery();

  const cycles = cyclesData?.data?.cycles || [];
  const analytics = analyticsData?.data;

  // Settings state
  const [autoUpdateCycleStatus, setAutoUpdateCycleStatus] = useState(true);
  const [notifyOnReviewSubmission, setNotifyOnReviewSubmission] = useState(true);
  const [autoLinkGoals, setAutoLinkGoals] = useState(true);
  const [requireManagerApproval, setRequireManagerApproval] = useState(true);

  const handleSave = () => {
    // TODO: Save settings to backend when settings API is available
    toast({
      title: "Settings Saved",
      description: "PMS settings have been updated successfully.",
    });
  };

  const activeCycles = cycles.filter((c: any) => c.status !== "completed" && c.status !== "cancelled");
  const completedCycles = cycles.filter((c: any) => c.status === "completed");

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">PMS Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure performance management system preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* System Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Configure how the PMS system operates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-update">Auto-Update Cycle Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically update cycle status based on deadlines
                    </p>
                  </div>
                  <Switch
                    id="auto-update"
                    checked={autoUpdateCycleStatus}
                    onCheckedChange={setAutoUpdateCycleStatus}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notify">Notify on Review Submission</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications when reviews are submitted
                    </p>
                  </div>
                  <Switch
                    id="notify"
                    checked={notifyOnReviewSubmission}
                    onCheckedChange={setNotifyOnReviewSubmission}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-link">Auto-Link Goals to Reviews</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically link goals when creating reviews
                    </p>
                  </div>
                  <Switch
                    id="auto-link"
                    checked={autoLinkGoals}
                    onCheckedChange={setAutoLinkGoals}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="manager-approval">Require Manager Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Employee-created goals require manager approval
                    </p>
                  </div>
                  <Switch
                    id="manager-approval"
                    checked={requireManagerApproval}
                    onCheckedChange={setRequireManagerApproval}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rating Scale Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Rating Scale
                </CardTitle>
                <CardDescription>
                  Current performance rating system (1-5 scale)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { value: 5, label: "Outstanding", color: "bg-green-500", desc: "Exceptional performance" },
                    { value: 4, label: "Exceeds Expectations", color: "bg-blue-500", desc: "Above average performance" },
                    { value: 3, label: "Meets Expectations", color: "bg-yellow-500", desc: "Satisfactory performance" },
                    { value: 2, label: "Needs Improvement", color: "bg-orange-500", desc: "Below expectations" },
                    { value: 1, label: "Poor", color: "bg-red-500", desc: "Unsatisfactory performance" },
                  ].map((rating) => (
                    <div
                      key={rating.value}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full ${rating.color} flex items-center justify-center text-white font-bold`}
                        >
                          {rating.value}
                        </div>
                        <div>
                          <span className="font-medium">{rating.label}</span>
                          <p className="text-xs text-muted-foreground">{rating.desc}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{rating.value}/5</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Statistics */}
          <div className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : analytics ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Total Reviews</span>
                        <span className="font-semibold">{analytics.summary?.totalReviews || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completed</span>
                        <span className="font-semibold text-green-600">{analytics.summary?.completedReviews || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pending</span>
                        <span className="font-semibold text-yellow-600">{analytics.summary?.pendingReviews || 0}</span>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Average Rating</span>
                        <span className="font-semibold">
                          {analytics.summary?.avgRating ? analytics.summary.avgRating.toFixed(1) : "0.0"}/5
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Review Cycles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Review Cycles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cyclesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Active Cycles</span>
                        <Badge variant="default">{activeCycles.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Completed Cycles</span>
                        <Badge variant="secondary">{completedCycles.length}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate("/performance/cycles")}
                    >
                      Manage Cycles
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">PMS Workflow</p>
                    <p className="text-xs text-blue-700">
                      The system follows: Cycle Creation → Goals → Reviews → Completion. 
                      Settings here control automation and notifications.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </main>
    </MainLayout>
  );
}
