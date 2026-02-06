import { useGetPerformanceAnalyticsQuery, useGetPerformanceReviewsQuery } from "@/store/api/performanceReviewApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Calendar, FileText, Award, TrendingUp, Users } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Performance = () => {
  const navigate = useNavigate();
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useGetPerformanceAnalyticsQuery({});
  const { data: reviewsData, isLoading: isLoadingReviews } = useGetPerformanceReviewsQuery({
    status: "completed",
    limit: 10,
    page: 1,
  });

  const analytics = analyticsData?.data;
  const reviews = reviewsData?.data?.reviews || [];

  // Get upcoming/pending reviews
  const { data: pendingReviewsData } = useGetPerformanceReviewsQuery({
    status: "self-review-pending",
    limit: 5,
    page: 1,
  });

  const upcomingReviews = pendingReviewsData?.data?.reviews || [];

  if (isLoadingAnalytics || isLoadingReviews) {
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

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Performance Dashboard
            </h1>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/performance/reviews")}
              >
                <FileText className="w-4 h-4 mr-2" /> View All Reviews
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => navigate("/performance/reviews")}
              >
                <Calendar className="w-4 h-4 mr-2" /> Manage Reviews
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Rating
                </CardTitle>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.summary?.avgRating?.toFixed(1) || "0.0"}/5.0
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.summary?.completedReviews || 0} completed reviews
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Reviews
                </CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
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
                  Completed Reviews
                </CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.summary?.completedReviews || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {analytics?.summary?.totalReviews || 0} total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top Performers
                </CardTitle>
                <Award className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {analytics?.ratingDistribution?.excellent || 0}
                </div>
                <p className="text-xs text-success mt-1">Rating ≥ 4.5</p>
              </CardContent>
            </Card>
          </div>

          {/* MAIN CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* left 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Performance Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed reviews yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div
                        key={review._id}
                        className="p-4 border border-border rounded-lg space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {review.employeeId?.name || "Unknown"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {review.employeeId?.designation} · {review.employeeId?.department}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {review.reviewCycle} · {review.reviewType}
                            </p>
                          </div>
                          <div className="text-right">
                            {review.finalRating ? (
                              <>
                                <div className="text-2xl font-bold text-foreground">
                                  {review.finalRating.toFixed(1)}
                                </div>
                                <Badge variant="default">Final Rating</Badge>
                              </>
                            ) : (
                              <Badge variant="outline">{review.status}</Badge>
                            )}
                          </div>
                        </div>

                        {review.managerReview && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Technical</p>
                              <Progress
                                value={(review.managerReview.technicalSkills / 5) * 100}
                                className="h-2"
                              />
                              <p className="text-sm font-medium text-foreground">
                                {review.managerReview.technicalSkills}/5
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Communication</p>
                              <Progress
                                value={(review.managerReview.communication / 5) * 100}
                                className="h-2"
                              />
                              <p className="text-sm font-medium text-foreground">
                                {review.managerReview.communication}/5
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Teamwork</p>
                              <Progress
                                value={(review.managerReview.teamwork / 5) * 100}
                                className="h-2"
                              />
                              <p className="text-sm font-medium text-foreground">
                                {review.managerReview.teamwork}/5
                              </p>
                            </div>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => navigate(`/performance/reviews/${review._id}`)}
                        >
                          View Full Review
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* right 1/3 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics?.topPerformers && analytics.topPerformers.length > 0 ? (
                    analytics.topPerformers.map((performer: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{performer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {performer.department}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-foreground">
                            {performer.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No top performers yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics?.ratingDistribution && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Excellent (≥4.5)</span>
                        <span className="font-semibold">
                          {analytics.ratingDistribution.excellent}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Good (3.5-4.4)</span>
                        <span className="font-semibold">
                          {analytics.ratingDistribution.good}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average (2.5-3.4)</span>
                        <span className="font-semibold">
                          {analytics.ratingDistribution.average}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Needs Improvement (&lt;2.5)</span>
                        <span className="font-semibold">
                          {analytics.ratingDistribution.needsImprovement}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingReviews.length > 0 ? (
                    upcomingReviews.map((review: any) => (
                      <div
                        key={review._id}
                        className="p-3 border border-border rounded-lg space-y-2"
                      >
                        <p className="font-semibold text-sm text-foreground">
                          {review.employeeId?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {review.employeeId?.designation}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{review.reviewType}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {review.reviewCycle}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No pending reviews
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default Performance;
