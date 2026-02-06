import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Star, Send, User, TrendingUp, Award, AlertCircle, ChevronDown, ChevronUp, FileText, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useGetPerformanceReviewsQuery, 
  useSubmitManagerReviewMutation,
  useGetPerformanceReviewByIdQuery 
} from "@/store/api/performanceReviewApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

export default function ManagerReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Pagination and filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewCycleFilter, setReviewCycleFilter] = useState<string>("all");
  const [reviewTypeFilter, setReviewTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 10;

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, reviewCycleFilter, reviewTypeFilter, debouncedSearchTerm]);

  // Build query params
  const queryParams = useMemo(() => {
    const params: any = {
      page,
      limit,
    };

    // Status filter - for manager reviews, we want reviews that are ready for manager review
    // When "all", send multiple statuses to backend to get all manager-relevant reviews including completed ones for history
    if (statusFilter === "all") {
      // Include all manager-relevant statuses plus completed reviews for history
      params.status = "self-review-submitted,manager-review-pending,manager-review-submitted,hr-review-submitted,completed";
    } else if (statusFilter === "pending") {
      params.status = "self-review-submitted";
    } else if (statusFilter === "completed") {
      // Show completed reviews for history
      params.status = "hr-review-submitted,completed";
    } else {
      params.status = statusFilter;
    }

    if (reviewCycleFilter !== "all") {
      params.reviewCycle = reviewCycleFilter;
    }

    if (reviewTypeFilter !== "all") {
      params.reviewType = reviewTypeFilter;
    }

    if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
      params.search = debouncedSearchTerm.trim();
    }

    return params;
  }, [page, statusFilter, reviewCycleFilter, reviewTypeFilter, debouncedSearchTerm]);

  // Fetch reviews with proper pagination
  const { data: reviewsData, isLoading, refetch } = useGetPerformanceReviewsQuery(queryParams);

  // Fetch all reviews for stats (without pagination)
  const { data: allReviewsData } = useGetPerformanceReviewsQuery({
    limit: 1000,
  });

  const { data: selectedReviewData } = useGetPerformanceReviewByIdQuery(selectedReviewId || "", {
    skip: !selectedReviewId,
  });

  const [submitManagerReview, { isLoading: isSubmitting }] = useSubmitManagerReviewMutation();
  
  // Fetch all cycles for filter dropdown
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  const cycles = cyclesData?.data?.cycles || [];

  // Get all reviews for filtering and stats
  const allReviews = allReviewsData?.data?.reviews || [];
  
  // Get unique review cycles from cyclesData (all cycles), not just from reviews
  const reviewCycles = useMemo(() => {
    // Get cycles from cyclesData (all cycles)
    const cycleNames = cycles.map((c: any) => c.name).filter(Boolean);
    return Array.from(new Set(cycleNames)).sort();
  }, [cycles]);

  // Get all review types from cycles API (all available types)
  const reviewTypes = useMemo(() => {
    const types = new Set<string>();
    cycles.forEach((c: any) => {
      if (c.type) types.add(c.type);
    });
    // Also include all possible types as fallback
    const allPossibleTypes = ['Quarterly', 'Half-Yearly', 'Annual', 'Probation', 'Custom'];
    allPossibleTypes.forEach(type => types.add(type));
    return Array.from(types).sort();
  }, [cycles]);

  // Filter reviews for manager - reviews that need manager review OR completed reviews (for history)
  const reviewsForManager = allReviews.filter(
    (r: any) =>
      r.status === "self-review-submitted" ||
      r.status === "manager-review-pending" ||
      r.status === "manager-review-submitted" ||
      r.status === "hr-review-submitted" ||
      r.status === "completed"
  );

  // Backend already filters by manager-relevant statuses, so use reviews directly
  // Backend sends reviews with status: self-review-submitted, manager-review-pending, or manager-review-submitted
  const filteredReviews = reviewsData?.data?.reviews || [];

  // Use reviews directly (backend handles all filtering)
  const searchedReviews = filteredReviews;

  const selectedReview = selectedReviewData?.data?.review;

  // Manager review form state
  const [managerReviewForm, setManagerReviewForm] = useState({
    overallRating: 0,
    technicalSkills: 0,
    communication: 0,
    teamwork: 0,
    leadership: 0,
    problemSolving: 0,
    punctuality: 0,
    strengths: [] as string[],
    areasForImprovement: [] as string[],
    achievements: [] as string[],
    feedback: "",
    recommendations: "",
  });

  const [strengthInput, setStrengthInput] = useState("");
  const [improvementInput, setImprovementInput] = useState("");
  const [achievementInput, setAchievementInput] = useState("");

  // Update form when selected review data loads
  useEffect(() => {
    if (selectedReview?.managerReview) {
      const mr = selectedReview.managerReview;
      setManagerReviewForm({
        overallRating: mr.overallRating || 0,
        technicalSkills: mr.technicalSkills || 0,
        communication: mr.communication || 0,
        teamwork: mr.teamwork || 0,
        leadership: mr.leadership || 0,
        problemSolving: mr.problemSolving || 0,
        punctuality: mr.punctuality || 0,
        strengths: mr.strengths || [],
        areasForImprovement: mr.areasForImprovement || [],
        achievements: mr.achievements || [],
        feedback: mr.feedback || "",
        recommendations: mr.recommendations || "",
      });
    } else if (selectedReview) {
      setManagerReviewForm({
        overallRating: 0,
        technicalSkills: 0,
        communication: 0,
        teamwork: 0,
        leadership: 0,
        problemSolving: 0,
        punctuality: 0,
        strengths: [],
        areasForImprovement: [],
        achievements: [],
        feedback: "",
        recommendations: "",
      });
    }
  }, [selectedReview]);

  const handleOpenReviewDialog = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setReviewDialogOpen(true);
  };

  const handleAddStrength = () => {
    if (strengthInput.trim()) {
      setManagerReviewForm({
        ...managerReviewForm,
        strengths: [...managerReviewForm.strengths, strengthInput.trim()],
      });
      setStrengthInput("");
    }
  };

  const handleRemoveStrength = (index: number) => {
    setManagerReviewForm({
      ...managerReviewForm,
      strengths: managerReviewForm.strengths.filter((_, i) => i !== index),
    });
  };

  const handleAddImprovement = () => {
    if (improvementInput.trim()) {
      setManagerReviewForm({
        ...managerReviewForm,
        areasForImprovement: [...managerReviewForm.areasForImprovement, improvementInput.trim()],
      });
      setImprovementInput("");
    }
  };

  const handleRemoveImprovement = (index: number) => {
    setManagerReviewForm({
      ...managerReviewForm,
      areasForImprovement: managerReviewForm.areasForImprovement.filter((_, i) => i !== index),
    });
  };

  const handleAddAchievement = () => {
    if (achievementInput.trim()) {
      setManagerReviewForm({
        ...managerReviewForm,
        achievements: [...managerReviewForm.achievements, achievementInput.trim()],
      });
      setAchievementInput("");
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setManagerReviewForm({
      ...managerReviewForm,
      achievements: managerReviewForm.achievements.filter((_, i) => i !== index),
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedReviewId) return;

    // Validation
    if (
      managerReviewForm.overallRating === 0 ||
      managerReviewForm.technicalSkills === 0 ||
      managerReviewForm.communication === 0 ||
      managerReviewForm.teamwork === 0 ||
      managerReviewForm.leadership === 0 ||
      managerReviewForm.problemSolving === 0 ||
      managerReviewForm.punctuality === 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please provide all ratings",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitManagerReview({
        id: selectedReviewId,
        data: managerReviewForm,
      }).unwrap();

      toast({
        title: "Success",
        description: "Manager review submitted successfully. The employee will be notified.",
      });

      setReviewDialogOpen(false);
      setSelectedReviewId(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to submit manager review",
        variant: "destructive",
      });
    }
  };

  // Calculate statistics from all manager reviews
  const pendingCount = reviewsForManager.filter(
    (r) => r.status === "self-review-submitted" || r.status === "manager-review-pending"
  ).length;
  const avgSelfRating =
    reviewsForManager.length > 0
      ? reviewsForManager.reduce((sum, r) => sum + (r.selfReview?.overallRating || 0), 0) / reviewsForManager.length
      : 0;
  // Completed count includes manager-review-submitted, hr-review-submitted, and completed statuses
  const completedCount = reviewsForManager.filter(
    (r) => r.status === "manager-review-submitted" || r.status === "hr-review-submitted" || r.status === "completed"
  ).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "self-review-submitted":
        return <Badge className="bg-yellow-500">Self Review Submitted</Badge>;
      case "manager-review-pending":
        return <Badge className="bg-orange-500">Manager Review Pending</Badge>;
      case "manager-review-submitted":
        return <Badge className="bg-green-500">Manager Review Submitted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pagination = reviewsData?.data?.pagination;

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
              Review and rate team member performance (Available to Managers and Admin/HR)
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
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Self Rating</p>
                <p className="text-2xl font-bold">{avgSelfRating.toFixed(1)}</p>
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
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, ID, department..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setPage(1);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="self-review-submitted">Self Submitted</SelectItem>
                    <SelectItem value="manager-review-pending">Manager Pending</SelectItem>
                    <SelectItem value="manager-review-submitted">Manager Submitted</SelectItem>
                    <SelectItem value="completed">Completed (History)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={reviewCycleFilter} onValueChange={(value) => {
                  setReviewCycleFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Review Cycle" />
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
              </div>
              <div>
                <Select value={reviewTypeFilter} onValueChange={(value) => {
                  setReviewTypeFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Review Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {reviewTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Reviews */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchedReviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No reviews found. Try adjusting your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {searchedReviews.map((review: any) => {
                const employee = review.employeeId as any;
                const selfReview = review.selfReview;
                return (
                  <Card key={review._id}>
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedReview(expandedReview === review._id ? null : review._id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {employee?.name || "N/A"}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {employee?.designation || "N/A"} • {employee?.department || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Review Cycle: {review.reviewCycle} • {review.reviewType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Self Rating</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-semibold">
                                {selfReview?.overallRating?.toFixed(1) || "N/A"}
                              </span>
                            </div>
                          </div>
                          {getStatusBadge(review.status)}
                          {expandedReview === review._id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedReview === review._id && (
                      <CardContent className="space-y-4 pt-0">
                        {/* Self Review Summary */}
                        {selfReview && (
                          <div className="p-4 bg-muted rounded-lg space-y-2">
                            <h4 className="font-semibold">Self Review Summary</h4>
                            {selfReview.strengths && selfReview.strengths.length > 0 && (
                              <div>
                                <p className="text-sm font-medium">Strengths:</p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {selfReview.strengths.map((s: string, i: number) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {selfReview.areasForImprovement &&
                              selfReview.areasForImprovement.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium">Areas for Improvement:</p>
                                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                                    {selfReview.areasForImprovement.map((a: string, i: number) => (
                                      <li key={i}>{a}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            {selfReview.comments && (
                              <div>
                                <p className="text-sm font-medium">Comments:</p>
                                <p className="text-sm text-muted-foreground">
                                  {selfReview.comments}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Review Period */}
                        <div className="text-sm text-muted-foreground">
                          <p>
                            Review Period:{" "}
                            {format(new Date(review.reviewPeriod.startDate), "PPP")} -{" "}
                            {format(new Date(review.reviewPeriod.endDate), "PPP")}
                          </p>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleOpenReviewDialog(review._id)}
                            className="gap-2"
                            variant={review.status === "completed" || review.status === "hr-review-submitted" ? "outline" : "default"}
                          >
                            <FileText className="w-4 h-4" />
                            {review.status === "completed" || review.status === "hr-review-submitted" 
                              ? "View Review (Completed)" 
                              : review.managerReview 
                                ? "View/Edit Review" 
                                : "Submit Manager Review"}
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages || isLoading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Manager Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manager Review</DialogTitle>
            </DialogHeader>
            {selectedReview && (
              <div className="space-y-6 py-4">
                {/* Employee Info */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">
                    {(selectedReview.employeeId as any)?.name || "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedReview.employeeId as any)?.designation || "N/A"} •{" "}
                    {(selectedReview.employeeId as any)?.department || "N/A"}
                  </p>
                </div>

                {/* Ratings */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Performance Ratings (1-5)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { key: "overallRating", label: "Overall Rating" },
                      { key: "technicalSkills", label: "Technical Skills" },
                      { key: "communication", label: "Communication" },
                      { key: "teamwork", label: "Teamwork" },
                      { key: "leadership", label: "Leadership" },
                      { key: "problemSolving", label: "Problem Solving" },
                      { key: "punctuality", label: "Punctuality" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <Label>{label} *</Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                              key={rating}
                              type="button"
                              variant={
                                managerReviewForm[key as keyof typeof managerReviewForm] === rating
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="w-10 h-10 p-0"
                              onClick={() =>
                                setManagerReviewForm({
                                  ...managerReviewForm,
                                  [key]: rating,
                                })
                              }
                            >
                              {rating}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div className="space-y-2">
                  <Label>Strengths</Label>
                  {selectedReview.status === "completed" || selectedReview.status === "hr-review-submitted" ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedReview.managerReview?.strengths?.map((s: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {s}
                        </Badge>
                      )) || <p className="text-sm text-muted-foreground">No strengths listed</p>}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={strengthInput}
                          onChange={(e) => setStrengthInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddStrength()}
                          placeholder="Add strength..."
                        />
                        <Button type="button" onClick={handleAddStrength} size="sm">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {managerReviewForm.strengths.map((s, i) => (
                          <Badge key={i} variant="secondary" className="gap-2">
                            {s}
                            <button
                              onClick={() => handleRemoveStrength(i)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Areas for Improvement */}
                <div className="space-y-2">
                  <Label>Areas for Improvement</Label>
                  {selectedReview.status === "completed" || selectedReview.status === "hr-review-submitted" ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedReview.managerReview?.areasForImprovement?.map((a: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {a}
                        </Badge>
                      )) || <p className="text-sm text-muted-foreground">No areas for improvement listed</p>}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={improvementInput}
                          onChange={(e) => setImprovementInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddImprovement()}
                          placeholder="Add area for improvement..."
                        />
                        <Button type="button" onClick={handleAddImprovement} size="sm">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {managerReviewForm.areasForImprovement.map((a, i) => (
                          <Badge key={i} variant="secondary" className="gap-2">
                            {a}
                            <button
                              onClick={() => handleRemoveImprovement(i)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Achievements */}
                <div className="space-y-2">
                  <Label>Achievements</Label>
                  {selectedReview.status === "completed" || selectedReview.status === "hr-review-submitted" ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedReview.managerReview?.achievements?.map((a: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {a}
                        </Badge>
                      )) || <p className="text-sm text-muted-foreground">No achievements listed</p>}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={achievementInput}
                          onChange={(e) => setAchievementInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddAchievement()}
                          placeholder="Add achievement..."
                        />
                        <Button type="button" onClick={handleAddAchievement} size="sm">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {managerReviewForm.achievements.map((a, i) => (
                          <Badge key={i} variant="secondary" className="gap-2">
                            {a}
                            <button
                              onClick={() => handleRemoveAchievement(i)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <Label>Feedback</Label>
                  {selectedReview.status === "completed" || selectedReview.status === "hr-review-submitted" ? (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedReview.managerReview?.feedback || "No feedback provided"}
                      </p>
                    </div>
                  ) : (
                    <Textarea
                      value={managerReviewForm.feedback}
                      onChange={(e) =>
                        setManagerReviewForm({ ...managerReviewForm, feedback: e.target.value })
                      }
                      placeholder="Provide detailed feedback..."
                      rows={4}
                    />
                  )}
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <Label>Recommendations</Label>
                  {selectedReview.status === "completed" || selectedReview.status === "hr-review-submitted" ? (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedReview.managerReview?.recommendations || "No recommendations provided"}
                      </p>
                    </div>
                  ) : (
                    <Textarea
                      value={managerReviewForm.recommendations}
                      onChange={(e) =>
                        setManagerReviewForm({
                          ...managerReviewForm,
                          recommendations: e.target.value,
                        })
                      }
                      placeholder="Provide recommendations for growth..."
                      rows={3}
                    />
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                {selectedReview?.status === "completed" || selectedReview?.status === "hr-review-submitted" ? "Close" : "Cancel"}
              </Button>
              {selectedReview?.status !== "completed" && selectedReview?.status !== "hr-review-submitted" && (
                <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
