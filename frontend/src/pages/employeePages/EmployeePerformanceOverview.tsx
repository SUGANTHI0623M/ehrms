import { useGetEmployeePerformanceSummaryQuery } from "@/store/api/performanceReviewApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, Target, FileText, Calendar, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeePerformanceOverview = () => {
  const { data, isLoading, error } = useGetEmployeePerformanceSummaryQuery();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-red-500">Error loading performance data</div>
        </div>
      </MainLayout>
    );
  }

  const summary = data?.data;
  const latestReview = summary?.latestReview;

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                My Performance Overview
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {summary?.employee?.name} · {summary?.employee?.designation} · {summary?.employee?.department}
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Rating
                </CardTitle>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {summary?.averageRating?.toFixed(1) || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Out of 5.0</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Reviews
                </CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {summary?.totalReviews || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary?.completedReviews || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Goals
                </CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {summary?.currentGoals || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active goals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Latest Review
                </CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {latestReview?.reviewCycle || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestReview?.reviewType || "No reviews yet"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Latest Review Details */}
          {latestReview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Latest Performance Review - {latestReview.reviewCycle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Review Period</p>
                    <p className="font-medium">
                      {new Date(latestReview.reviewPeriod.startDate).toLocaleDateString()} -{" "}
                      {new Date(latestReview.reviewPeriod.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Final Rating</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {latestReview.finalRating?.toFixed(1) || "N/A"}
                      </span>
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <Badge
                    variant={
                      latestReview.status === "completed"
                        ? "default"
                        : latestReview.status === "self-review-pending"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {latestReview.status.replace(/-/g, " ").toUpperCase()}
                  </Badge>
                </div>

                {latestReview.managerReview && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold">Manager Review</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Overall</p>
                        <Progress
                          value={(latestReview.managerReview.overallRating / 5) * 100}
                          className="h-2"
                        />
                        <p className="text-sm font-medium">
                          {latestReview.managerReview.overallRating}/5
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Technical Skills</p>
                        <Progress
                          value={(latestReview.managerReview.technicalSkills / 5) * 100}
                          className="h-2"
                        />
                        <p className="text-sm font-medium">
                          {latestReview.managerReview.technicalSkills}/5
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Communication</p>
                        <Progress
                          value={(latestReview.managerReview.communication / 5) * 100}
                          className="h-2"
                        />
                        <p className="text-sm font-medium">
                          {latestReview.managerReview.communication}/5
                        </p>
                      </div>
                    </div>
                    {latestReview.managerReview.feedback && (
                      <div>
                        <p className="text-sm font-medium mb-1">Feedback</p>
                        <p className="text-sm text-muted-foreground">
                          {latestReview.managerReview.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {latestReview.hrReview && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold">HR Review</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Overall</p>
                        <Progress
                          value={(latestReview.hrReview.overallRating / 5) * 100}
                          className="h-2"
                        />
                        <p className="text-sm font-medium">
                          {latestReview.hrReview.overallRating}/5
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Company Values Alignment</p>
                        <Progress
                          value={(latestReview.hrReview.alignmentWithCompanyValues / 5) * 100}
                          className="h-2"
                        />
                        <p className="text-sm font-medium">
                          {latestReview.hrReview.alignmentWithCompanyValues}/5
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Growth Potential</p>
                        <Progress
                          value={(latestReview.hrReview.growthPotential / 5) * 100}
                          className="h-2"
                        />
                        <p className="text-sm font-medium">
                          {latestReview.hrReview.growthPotential}/5
                        </p>
                      </div>
                    </div>
                    {latestReview.hrReview.feedback && (
                      <div>
                        <p className="text-sm font-medium mb-1">Feedback</p>
                        <p className="text-sm text-muted-foreground">
                          {latestReview.hrReview.feedback}
                        </p>
                      </div>
                    )}
                    {latestReview.hrReview.recommendations && (
                      <div>
                        <p className="text-sm font-medium mb-1">Recommendations</p>
                        <p className="text-sm text-muted-foreground">
                          {latestReview.hrReview.recommendations}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {latestReview.selfReview && (
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold">Your Self Review</h4>
                    <div>
                      <p className="text-sm font-medium mb-1">Overall Rating</p>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(latestReview.selfReview.overallRating / 5) * 100}
                          className="h-2 flex-1"
                        />
                        <span className="text-sm font-medium">
                          {latestReview.selfReview.overallRating}/5
                        </span>
                      </div>
                    </div>
                    {latestReview.selfReview.comments && (
                      <div>
                        <p className="text-sm font-medium mb-1">Comments</p>
                        <p className="text-sm text-muted-foreground">
                          {latestReview.selfReview.comments}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Reviews */}
          {summary?.recentReviews && summary.recentReviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary.recentReviews.map((review: any) => (
                    <div
                      key={review._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{review.reviewCycle}</p>
                        <p className="text-sm text-muted-foreground">
                          {review.reviewType} ·{" "}
                          {new Date(review.reviewPeriod.startDate).toLocaleDateString()} -{" "}
                          {new Date(review.reviewPeriod.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {review.finalRating ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">
                              {review.finalRating.toFixed(1)}
                            </span>
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          </div>
                        ) : (
                          <Badge variant="outline">{review.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </MainLayout>
  );
};

export default EmployeePerformanceOverview;


