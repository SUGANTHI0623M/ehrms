import { useGetPerformanceAnalyticsQuery, useGetPerformanceReviewsQuery } from "@/store/api/performanceReviewApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Users, Award, Star, FileText, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

const PerformanceAnalytics = () => {
  const [reviewCycle, setReviewCycle] = useState<string>("all");
  const [department, setDepartment] = useState<string>("all");

  // Fetch all cycles from cycles API
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  // Fetch all staff to get all departments
  const { data: staffData } = useGetStaffQuery({ page: 1, limit: 1000 });

  const { data, isLoading, error } = useGetPerformanceAnalyticsQuery({
    reviewCycle: reviewCycle && reviewCycle !== "all" ? reviewCycle : undefined,
    department: department && department !== "all" ? department : undefined,
  });

  const analytics = data?.data;
  const cycles = cyclesData?.data?.cycles || [];
  const staff = staffData?.data?.staff || [];
  
  // Get unique review cycles from cycles API (all available cycles)
  const reviewCycles = useMemo(() => {
    return cycles.map((c: any) => c.name).filter(Boolean).sort();
  }, [cycles]);

  // Get all departments from staff API (all available departments)
  const departments = useMemo(() => {
    const depts = new Set<string>();
    staff.forEach((s: any) => {
      if (s.department) depts.add(s.department);
    });
    return Array.from(depts).sort();
  }, [staff]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-red-500">Error loading analytics</div>
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
                Performance Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive performance metrics and insights
              </p>
            </div>

            <div className="flex gap-3">
              <Select value={reviewCycle} onValueChange={setReviewCycle}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Cycles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  {reviewCycles.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {cycle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Reviews
                </CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.summary?.totalReviews || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed Reviews
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.summary?.completedReviews || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.summary?.totalReviews
                    ? Math.round(
                        (analytics.summary.completedReviews /
                          analytics.summary.totalReviews) *
                          100
                      )
                    : 0}
                  % completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Reviews
                </CardTitle>
                <Clock className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.summary?.pendingReviews || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting completion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Rating
                </CardTitle>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.summary?.avgRating?.toFixed(1) || "0.0"}/5.0
                </div>
                <p className="text-xs text-muted-foreground mt-1">Overall average</p>
              </CardContent>
            </Card>
          </div>

          {/* Rating Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Excellent (≥4.5)</span>
                    <span className="text-sm font-bold">
                      {analytics?.ratingDistribution?.excellent || 0}
                    </span>
                  </div>
                  <Progress
                    value={
                      analytics?.summary?.completedReviews
                        ? ((analytics.ratingDistribution?.excellent || 0) /
                            analytics.summary.completedReviews) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Good (3.5-4.4)</span>
                    <span className="text-sm font-bold">
                      {analytics?.ratingDistribution?.good || 0}
                    </span>
                  </div>
                  <Progress
                    value={
                      analytics?.summary?.completedReviews
                        ? ((analytics.ratingDistribution?.good || 0) /
                            analytics.summary.completedReviews) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Average (2.5-3.4)</span>
                    <span className="text-sm font-bold">
                      {analytics?.ratingDistribution?.average || 0}
                    </span>
                  </div>
                  <Progress
                    value={
                      analytics?.summary?.completedReviews
                        ? ((analytics.ratingDistribution?.average || 0) /
                            analytics.summary.completedReviews) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Needs Improvement (&lt;2.5)</span>
                    <span className="text-sm font-bold">
                      {analytics?.ratingDistribution?.needsImprovement || 0}
                    </span>
                  </div>
                  <Progress
                    value={
                      analytics?.summary?.completedReviews
                        ? ((analytics.ratingDistribution?.needsImprovement || 0) /
                            analytics.summary.completedReviews) *
                          100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          {analytics?.topPerformers && analytics.topPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topPerformers.map((performer: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{performer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {performer.designation} · {performer.department}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold">{performer.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department Statistics */}
          {analytics?.departmentStats &&
            Object.keys(analytics.departmentStats).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Department Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.departmentStats).map(
                      ([dept, stats]: [string, any]) => (
                        <div key={dept} className="border-b pb-4 last:border-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">{dept}</span>
                            <span className="text-sm text-muted-foreground">
                              {stats.completed}/{stats.total} completed
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={
                                stats.total ? (stats.completed / stats.total) * 100 : 0
                              }
                              className="h-2 flex-1"
                            />
                            <span className="text-sm font-medium">
                              {stats.avgRating.toFixed(1)}/5.0
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </main>
    </MainLayout>
  );
};

export default PerformanceAnalytics;

