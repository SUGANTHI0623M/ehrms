import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useGetPerformanceReviewByIdQuery } from "@/store/api/performanceReviewApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Calendar, FileText, ArrowLeft, User, Award, Edit, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminPerformanceReviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Handle invalid IDs (like "new") - redirect to reviews page
  useEffect(() => {
    if (id && (id === "new" || id.length !== 24)) {
      // Invalid ObjectId format, redirect to reviews page
      navigate("/performance/reviews");
    }
  }, [id, navigate]);

  const { data, isLoading, error, refetch } = useGetPerformanceReviewByIdQuery(id || "", {
    skip: !id || id === "new" || (id && id.length !== 24),
  });

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
      "Failed to load review";

    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-red-500 mb-4">
                <h3 className="text-lg font-semibold mb-2">Error loading review</h3>
                <p className="text-sm">{errorMessage}</p>
              </div>
              <div className="flex gap-4 justify-center mt-6">
                <Button variant="outline" onClick={() => navigate("/performance/reviews")}>
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

  if (!data?.data?.review) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground mb-4">
                <h3 className="text-lg font-semibold mb-2">Review not found</h3>
                <p className="text-sm">The requested review could not be found.</p>
              </div>
              <Button onClick={() => navigate("/performance/reviews")} className="mt-4">
                Go Back to Reviews
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const review = data.data.review;

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
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/performance/reviews")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Performance Review Details
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {review.reviewCycle} · {review.reviewType}
                </p>
              </div>
            </div>
            <Badge variant={getStatusBadgeVariant(review.status)} className="text-sm">
              {formatStatus(review.status)}
            </Badge>
          </div>

          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{review.employeeId?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Employee ID</p>
                  <p className="font-medium">{review.employeeId?.employeeId || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Designation</p>
                  <p className="font-medium">{review.employeeId?.designation || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Department</p>
                  <p className="font-medium">{review.employeeId?.department || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Period */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Review Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {new Date(review.reviewPeriod.startDate).toLocaleDateString()}
                </span>
                <span>to</span>
                <span className="font-medium">
                  {new Date(review.reviewPeriod.endDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Final Rating */}
          {review.finalRating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Final Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                    <span className="text-3xl font-bold">{review.finalRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">/ 5.0</span>
                  </div>
                  <Progress value={(review.finalRating / 5) * 100} className="h-3 flex-1" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Goals */}
          {review.goalIds && review.goalIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Linked Goals ({review.goalIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {review.goalIds.map((goal: any, index: number) => (
                    <div key={goal._id || index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{goal.title || "Goal"}</p>
                        {goal.progress !== undefined && (
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={goal.progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground">{goal.progress}%</span>
                          </div>
                        )}
                      </div>
                      <Badge variant={goal.status === "completed" ? "default" : "outline"}>
                        {goal.status || "N/A"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Self Review */}
          {review.selfReview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Self Review
                  {review.selfReview.submittedAt && (
                    <Badge variant="secondary" className="ml-2">
                      Submitted {new Date(review.selfReview.submittedAt).toLocaleDateString()}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Overall Rating</p>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(review.selfReview.overallRating / 5) * 100}
                      className="h-2 flex-1"
                    />
                    <span className="font-semibold">
                      {review.selfReview.overallRating}/5.0
                    </span>
                  </div>
                </div>

                {review.selfReview.strengths && review.selfReview.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Strengths</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {review.selfReview.strengths.map((strength: string, index: number) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.selfReview.areasForImprovement &&
                  review.selfReview.areasForImprovement.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Areas for Improvement</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {review.selfReview.areasForImprovement.map(
                          (area: string, index: number) => (
                            <li key={index}>{area}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {review.selfReview.achievements && review.selfReview.achievements.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Achievements</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {review.selfReview.achievements.map((achievement: string, index: number) => (
                        <li key={index}>{achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.selfReview.challenges && review.selfReview.challenges.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Challenges</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {review.selfReview.challenges.map((challenge: string, index: number) => (
                        <li key={index}>{challenge}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.selfReview.goalsAchieved && review.selfReview.goalsAchieved.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Goals Achieved</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {review.selfReview.goalsAchieved.map((goal: string, index: number) => (
                        <li key={index}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.selfReview.comments && (
                  <div>
                    <p className="text-sm font-medium mb-2">Additional Comments</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.selfReview.comments}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manager Review */}
          {review.managerReview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Manager Review
                  {review.managerId && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      by {review.managerId.name}
                    </span>
                  )}
                  {review.managerReview.submittedAt && (
                    <Badge variant="secondary" className="ml-2">
                      Submitted {new Date(review.managerReview.submittedAt).toLocaleDateString()}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Overall</p>
                    <Progress
                      value={(review.managerReview.overallRating / 5) * 100}
                      className="h-2"
                    />
                    <p className="text-sm font-medium mt-1">
                      {review.managerReview.overallRating}/5.0
                    </p>
                  </div>
                  {review.managerReview.technicalSkills !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Technical Skills</p>
                      <Progress
                        value={(review.managerReview.technicalSkills / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.managerReview.technicalSkills}/5.0
                      </p>
                    </div>
                  )}
                  {review.managerReview.communication !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Communication</p>
                      <Progress
                        value={(review.managerReview.communication / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.managerReview.communication}/5.0
                      </p>
                    </div>
                  )}
                  {review.managerReview.teamwork !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Teamwork</p>
                      <Progress
                        value={(review.managerReview.teamwork / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.managerReview.teamwork}/5.0
                      </p>
                    </div>
                  )}
                  {review.managerReview.leadership !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Leadership</p>
                      <Progress
                        value={(review.managerReview.leadership / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.managerReview.leadership}/5.0
                      </p>
                    </div>
                  )}
                  {review.managerReview.problemSolving !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Problem Solving</p>
                      <Progress
                        value={(review.managerReview.problemSolving / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.managerReview.problemSolving}/5.0
                      </p>
                    </div>
                  )}
                  {review.managerReview.punctuality !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Punctuality</p>
                      <Progress
                        value={(review.managerReview.punctuality / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.managerReview.punctuality}/5.0
                      </p>
                    </div>
                  )}
                </div>

                {review.managerReview.strengths && review.managerReview.strengths.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Strengths</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {review.managerReview.strengths.map((strength: string, index: number) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.managerReview.areasForImprovement &&
                  review.managerReview.areasForImprovement.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Areas for Improvement</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {review.managerReview.areasForImprovement.map(
                          (area: string, index: number) => (
                            <li key={index}>{area}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {review.managerReview.achievements &&
                  review.managerReview.achievements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Achievements</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {review.managerReview.achievements.map(
                          (achievement: string, index: number) => (
                            <li key={index}>{achievement}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {review.managerReview.feedback && (
                  <div>
                    <p className="text-sm font-medium mb-2">Feedback</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.managerReview.feedback}
                    </p>
                  </div>
                )}

                {review.managerReview.recommendations && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recommendations</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.managerReview.recommendations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* HR Review */}
          {review.hrReview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  HR Review
                  {review.hrReview.submittedAt && (
                    <Badge variant="secondary" className="ml-2">
                      Submitted {new Date(review.hrReview.submittedAt).toLocaleDateString()}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Overall Rating</p>
                    <Progress
                      value={(review.hrReview.overallRating / 5) * 100}
                      className="h-2"
                    />
                    <p className="text-sm font-medium mt-1">
                      {review.hrReview.overallRating}/5.0
                    </p>
                  </div>
                  {review.hrReview.alignmentWithCompanyValues !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Company Values Alignment</p>
                      <Progress
                        value={(review.hrReview.alignmentWithCompanyValues / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.hrReview.alignmentWithCompanyValues}/5.0
                      </p>
                    </div>
                  )}
                  {review.hrReview.growthPotential !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Growth Potential</p>
                      <Progress
                        value={(review.hrReview.growthPotential / 5) * 100}
                        className="h-2"
                      />
                      <p className="text-sm font-medium mt-1">
                        {review.hrReview.growthPotential}/5.0
                      </p>
                    </div>
                  )}
                </div>

                {review.hrReview.feedback && (
                  <div>
                    <p className="text-sm font-medium mb-2">Feedback</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.hrReview.feedback}
                    </p>
                  </div>
                )}

                {review.hrReview.recommendations && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recommendations</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {review.hrReview.recommendations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Final Comments */}
          {review.finalComments && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Final Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {review.finalComments}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate("/performance/reviews")}>
              Back to Reviews
            </Button>
            <Button variant="outline" onClick={() => navigate(`/performance/reviews/${review._id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Review
            </Button>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default AdminPerformanceReviewDetail;


