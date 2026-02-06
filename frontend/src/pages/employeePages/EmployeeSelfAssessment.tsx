import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetPerformanceReviewByIdQuery,
  useGetPerformanceReviewsQuery,
  useSubmitSelfReviewMutation,
} from "@/store/api/performanceReviewApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, X, Save, CheckCircle, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeeSelfAssessment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useGetPerformanceReviewByIdQuery(id || "", {
    skip: !id,
  });
  const [submitReview, { isLoading: isSubmitting }] = useSubmitSelfReviewMutation();

  const [formData, setFormData] = useState({
    overallRating: 0,
    strengths: [""],
    areasForImprovement: [""],
    achievements: [""],
    challenges: [""],
    goalsAchieved: [""],
    comments: "",
  });

  useEffect(() => {
    if (data?.data?.review) {
      const review = data.data.review;
      // Only load existing self-review data if it exists and hasn't been submitted yet
      // If status is self-review-pending or draft, allow editing
      if (review.selfReview && (review.status === 'self-review-pending' || review.status === 'draft')) {
        setFormData({
          overallRating: review.selfReview.overallRating || 0,
          strengths: review.selfReview.strengths?.length
            ? review.selfReview.strengths
            : [""],
          areasForImprovement: review.selfReview.areasForImprovement?.length
            ? review.selfReview.areasForImprovement
            : [""],
          achievements: review.selfReview.achievements?.length
            ? review.selfReview.achievements
            : [""],
          challenges: review.selfReview.challenges?.length
            ? review.selfReview.challenges
            : [""],
          goalsAchieved: review.selfReview.goalsAchieved?.length
            ? review.selfReview.goalsAchieved
            : [""],
          comments: review.selfReview.comments || "",
        });
      } else if (!review.selfReview) {
        // If no self-review exists yet, start with empty form
        setFormData({
          overallRating: 0,
          strengths: [""],
          areasForImprovement: [""],
          achievements: [""],
          challenges: [""],
          goalsAchieved: [""],
          comments: "",
        });
      }
    }
  }, [data]);

  const handleAddItem = (field: keyof typeof formData) => {
    if (Array.isArray(formData[field])) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] as string[]), ""],
      });
    }
  };

  const handleRemoveItem = (field: keyof typeof formData, index: number) => {
    if (Array.isArray(formData[field])) {
      const newArray = [...(formData[field] as string[])];
      newArray.splice(index, 1);
      setFormData({
        ...formData,
        [field]: newArray.length > 0 ? newArray : [""],
      });
    }
  };

  const handleArrayChange = (
    field: keyof typeof formData,
    index: number,
    value: string
  ) => {
    if (Array.isArray(formData[field])) {
      const newArray = [...(formData[field] as string[])];
      newArray[index] = value;
      setFormData({
        ...formData,
        [field]: newArray,
      });
    }
  };

  const handleSubmit = async () => {
    if (!id) return;

    // Validation
    if (formData.overallRating === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide an overall rating",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitReview({
        id,
        data: {
          overallRating: formData.overallRating,
          strengths: formData.strengths.filter((s) => s.trim() !== ""),
          areasForImprovement: formData.areasForImprovement.filter((s) => s.trim() !== ""),
          achievements: formData.achievements.filter((s) => s.trim() !== ""),
          challenges: formData.challenges.filter((s) => s.trim() !== ""),
          goalsAchieved: formData.goalsAchieved.filter((s) => s.trim() !== ""),
          comments: formData.comments,
        },
      }).unwrap();

      toast({
        title: "Success",
        description: "Self review submitted successfully",
      });

      navigate("/employee/performance/reviews");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to submit review",
        variant: "destructive",
      });
    }
  };

  // If no ID is provided, show list of pending reviews
  const { data: pendingReviewsData, isLoading: isLoadingPending } = useGetPerformanceReviewsQuery({
    status: "self-review-pending",
    page: 1,
    limit: 20,
    myReviews: true, // Flag to indicate this is employee route - should only show own reviews
  }, { skip: !!id });

  if (!id) {
    const pendingReviews = pendingReviewsData?.data?.reviews || [];

    if (isLoadingPending) {
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

    return (
      <MainLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Self Assessment
            </h1>
            <p className="text-sm text-muted-foreground">
              Select a review to submit your self-assessment
            </p>
          </div>

          {pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You don't have any pending self-assessments at the moment.
                </p>
                <Button onClick={() => navigate("/employee/performance/reviews")}>
                  View All Reviews
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingReviews.map((review: any) => (
                <Card key={review._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{review.reviewCycle}</h3>
                          <Badge variant="outline">{review.reviewType}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(review.reviewPeriod.startDate).toLocaleDateString()} -{" "}
                              {new Date(review.reviewPeriod.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {review.goalIds && review.goalIds.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {review.goalIds.length} goal{review.goalIds.length !== 1 ? "s" : ""} linked
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/employee/performance/review/${review._id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          onClick={() => navigate(`/employee/performance/self-assessment/${review._id}`)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Start Assessment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

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
                <Button variant="outline" onClick={() => navigate("/employee/performance/reviews")}>
                  Go Back to Reviews
                </Button>
                <Button onClick={() => refetch()}>
                  Retry
                </Button>
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
              <Button onClick={() => navigate("/employee/performance/reviews")} className="mt-4">
                Go Back to Reviews
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const review = data.data.review;

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Self Assessment
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {review.reviewCycle} · {review.reviewType}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(review.reviewPeriod.startDate).toLocaleDateString()} -{" "}
              {new Date(review.reviewPeriod.endDate).toLocaleDateString()}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Overall Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, overallRating: rating })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        rating <= formData.overallRating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-4 text-sm text-muted-foreground">
                  {formData.overallRating}/5
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.strengths.map((strength, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={strength}
                    onChange={(e) =>
                      handleArrayChange("strengths", index, e.target.value)
                    }
                    placeholder="Enter a strength"
                  />
                  {formData.strengths.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem("strengths", index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => handleAddItem("strengths")}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Strength
              </Button>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card>
            <CardHeader>
              <CardTitle>Areas for Improvement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.areasForImprovement.map((area, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={area}
                    onChange={(e) =>
                      handleArrayChange("areasForImprovement", index, e.target.value)
                    }
                    placeholder="Enter an area for improvement"
                  />
                  {formData.areasForImprovement.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem("areasForImprovement", index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => handleAddItem("areasForImprovement")}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Area
              </Button>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.achievements.map((achievement, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={achievement}
                    onChange={(e) =>
                      handleArrayChange("achievements", index, e.target.value)
                    }
                    placeholder="Enter an achievement"
                  />
                  {formData.achievements.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem("achievements", index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => handleAddItem("achievements")}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Achievement
              </Button>
            </CardContent>
          </Card>

          {/* Challenges */}
          <Card>
            <CardHeader>
              <CardTitle>Challenges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.challenges.map((challenge, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={challenge}
                    onChange={(e) =>
                      handleArrayChange("challenges", index, e.target.value)
                    }
                    placeholder="Enter a challenge"
                  />
                  {formData.challenges.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem("challenges", index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => handleAddItem("challenges")}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Challenge
              </Button>
            </CardContent>
          </Card>

          {/* Goals Achieved */}
          <Card>
            <CardHeader>
              <CardTitle>Goals Achieved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.goalsAchieved.map((goal, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={goal}
                    onChange={(e) =>
                      handleArrayChange("goalsAchieved", index, e.target.value)
                    }
                    placeholder="Enter a goal achieved"
                  />
                  {formData.goalsAchieved.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem("goalsAchieved", index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => handleAddItem("goalsAchieved")}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.comments}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value })
                }
                placeholder="Add any additional comments about your performance..."
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Review Status Info */}
          {review.status === 'self-review-submitted' && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-blue-700">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium">Your self-review has been submitted and is awaiting manager review.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate("/employee/performance/reviews")}>
              {review.status === 'self-review-submitted' ? 'Back to Reviews' : 'Cancel'}
            </Button>
            {review.status !== 'self-review-submitted' && review.status !== 'completed' && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default EmployeeSelfAssessment;

