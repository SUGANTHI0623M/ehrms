import { useGetPerformanceReviewsQuery } from "@/store/api/performanceReviewApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, FileText, Eye, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeePerformanceReviews = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetPerformanceReviewsQuery({
    page: 1,
    limit: 20,
    myReviews: true, // Flag to indicate this is employee route - should only show own reviews
  });

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

  if (error) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-red-500">Error loading reviews</div>
        </div>
      </MainLayout>
    );
  }

  const reviews = data?.data?.reviews || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "self-review-submitted":
      case "manager-review-submitted":
      case "hr-review-submitted":
        return "secondary";
      case "self-review-pending":
      case "manager-review-pending":
      case "hr-review-pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .replace(/-/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                My Performance Reviews
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                View and track all your performance reviews
              </p>
            </div>
          </div>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No performance reviews found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <Card key={review._id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{review.reviewCycle}</h3>
                          <Badge variant={getStatusBadgeVariant(review.status)}>
                            {formatStatus(review.status)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(review.reviewPeriod.startDate).toLocaleDateString()} -{" "}
                              {new Date(review.reviewPeriod.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Type:</span> {review.reviewType}
                          </div>
                          {review.reviewCycleInfo?.selfReviewDeadline && 
                           (review.status === "self-review-pending" || review.status === "draft") && (
                            <div className="flex items-center gap-2 text-orange-600 font-medium">
                              <Clock className="w-4 h-4" />
                              <span>
                                Self Review Deadline: {new Date(review.reviewCycleInfo.selfReviewDeadline).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {review.reviewCycleInfo?.selfReviewDeadline && 
                         (review.status === "self-review-pending" || review.status === "draft") && (
                          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-orange-800">
                                  Self Review Deadline: {new Date(review.reviewCycleInfo.selfReviewDeadline).toLocaleDateString()}
                                </p>
                                {(() => {
                                  const deadline = new Date(review.reviewCycleInfo.selfReviewDeadline);
                                  const now = new Date();
                                  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                  if (daysLeft < 0) {
                                    return <p className="text-xs text-red-600 mt-1">Deadline has passed. Please submit as soon as possible.</p>;
                                  } else if (daysLeft === 0) {
                                    return <p className="text-xs text-red-600 mt-1">Deadline is today! Please submit your review.</p>;
                                  } else if (daysLeft <= 3) {
                                    return <p className="text-xs text-orange-600 mt-1">Only {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining. Please submit soon.</p>;
                                  } else {
                                    return <p className="text-xs text-orange-700 mt-1">{daysLeft} days remaining to submit your self-review.</p>;
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        )}

                        {review.managerId && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Reviewer:</span>{" "}
                            {review.managerId.name} ({review.managerId.designation})
                          </div>
                        )}

                        {review.finalRating && (
                          <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            <span className="text-lg font-bold">
                              {review.finalRating.toFixed(1)}/5.0
                            </span>
                            <span className="text-sm text-muted-foreground">Final Rating</span>
                          </div>
                        )}

                        {review.selfReview && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-1">Your Self Review</p>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm">
                                {review.selfReview.overallRating}/5.0
                              </span>
                              {review.selfReview.submittedAt && (
                                <span className="text-xs text-muted-foreground">
                                  · Submitted{" "}
                                  {new Date(review.selfReview.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {review.managerReview && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-1">Manager Review</p>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm">
                                {review.managerReview.overallRating}/5.0
                              </span>
                              {review.managerReview.submittedAt && (
                                <span className="text-xs text-muted-foreground">
                                  · Submitted{" "}
                                  {new Date(review.managerReview.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {review.managerReview.feedback && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {review.managerReview.feedback}
                              </p>
                            )}
                          </div>
                        )}

                        {review.hrReview && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-1">HR Review</p>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm">
                                {review.hrReview.overallRating}/5.0
                              </span>
                              {review.hrReview.submittedAt && (
                                <span className="text-xs text-muted-foreground">
                                  · Submitted{" "}
                                  {new Date(review.hrReview.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {review.hrReview.feedback && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {review.hrReview.feedback}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(`/employee/performance/review/${review._id}`)
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        {(review.status === "self-review-pending" ||
                          review.status === "draft") && (
                          <Button
                            onClick={() =>
                              navigate(`/employee/performance/self-assessment/${review._id}`)
                            }
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Submit Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  );
};

export default EmployeePerformanceReviews;


