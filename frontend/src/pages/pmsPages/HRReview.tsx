import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Star, Check, AlertTriangle, TrendingUp, Users, Award, FileCheck, BarChart3, FileText, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useGetPerformanceReviewsQuery, 
  useSubmitHRReviewMutation,
  useGetPerformanceReviewByIdQuery 
} from "@/store/api/performanceReviewApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

export default function HRReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

    // Status filter - for HR reviews, we want reviews that have manager review submitted
    // When "all", send multiple statuses to backend to get all HR-relevant reviews
    if (statusFilter === "all") {
      // Send comma-separated statuses that are relevant for HR review
      params.status = "manager-review-submitted,hr-review-pending,hr-review-submitted,completed";
    } else if (statusFilter === "pending") {
      params.status = "manager-review-submitted";
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

  // Fetch all reviews for stats and filter options (without pagination)
  const { data: allReviewsData } = useGetPerformanceReviewsQuery({
    limit: 1000,
  });

  const { data: selectedReviewData } = useGetPerformanceReviewByIdQuery(selectedReviewId || "", {
    skip: !selectedReviewId,
  });

  const [submitHRReview, { isLoading: isSubmitting }] = useSubmitHRReviewMutation();
  
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

  // Filter reviews for HR - reviews that have manager review submitted or are ready for HR
  // Also include reviews where managerReview exists (even if status hasn't been updated yet)
  const reviewsForHR = allReviews.filter(
    (r: any) => {
      // Check by status
      if (
        r.status === "manager-review-submitted" ||
        r.status === "hr-review-pending" ||
        r.status === "hr-review-submitted" ||
        r.status === "completed"
      ) {
        return true;
      }
      // Also include if managerReview has been submitted (has overallRating)
      if (r.managerReview && r.managerReview.overallRating) {
        return true;
      }
      return false;
    }
  );

  // Backend already filters by HR-relevant statuses, so use reviews directly
  // Backend sends reviews with status: manager-review-submitted, hr-review-pending, hr-review-submitted, or completed
  const filteredReviews = reviewsData?.data?.reviews || [];

  // Use reviews directly (backend handles all filtering)
  const searchedReviews = filteredReviews;

  const selectedReview = selectedReviewData?.data?.review;

  // HR review form state
  const [hrReviewForm, setHrReviewForm] = useState({
    overallRating: 0,
    alignmentWithCompanyValues: 0,
    growthPotential: 0,
    feedback: "",
    recommendations: "",
  });

  const handleOpenReviewDialog = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setReviewDialogOpen(true);
  };

  // Update form when selected review data loads
  useEffect(() => {
    if (selectedReview?.hrReview) {
      const hr = selectedReview.hrReview;
      setHrReviewForm({
        overallRating: hr.overallRating || 0,
        alignmentWithCompanyValues: hr.alignmentWithCompanyValues || 0,
        growthPotential: hr.growthPotential || 0,
        feedback: hr.feedback || "",
        recommendations: hr.recommendations || "",
      });
    } else if (selectedReview) {
      setHrReviewForm({
        overallRating: 0,
        alignmentWithCompanyValues: 0,
        growthPotential: 0,
        feedback: "",
        recommendations: "",
      });
    }
  }, [selectedReview]);

  const handleSubmitReview = async () => {
    if (!selectedReviewId) return;

    // Validation
    if (
      hrReviewForm.overallRating === 0 ||
      hrReviewForm.alignmentWithCompanyValues === 0 ||
      hrReviewForm.growthPotential === 0
    ) {
      toast({
        title: "Validation Error",
        description: "Please provide all ratings",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitHRReview({
        id: selectedReviewId,
        data: hrReviewForm,
      }).unwrap();

      toast({
        title: "Success",
        description: "HR review submitted successfully. The employee will be notified.",
      });

      setReviewDialogOpen(false);
      setSelectedReviewId(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to submit HR review",
        variant: "destructive",
      });
    }
  };

  // Calculate statistics from all HR reviews
  const totalReviews = reviewsForHR.length;
  const completedReviews = reviewsForHR.filter((r) => r.status === "completed").length;
  const pendingReviews = reviewsForHR.filter(
    (r) => r.status === "manager-review-submitted" || r.status === "hr-review-pending"
  ).length;

  // Calculate average ratings
  const reviewsWithRatings = reviewsForHR.filter((r) => r.managerReview?.overallRating);
  const avgRating =
    reviewsWithRatings.length > 0
      ? reviewsWithRatings.reduce((sum, r) => sum + (r.managerReview?.overallRating || 0), 0) /
        reviewsWithRatings.length
      : 0;

  // Rating distribution
  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsWithRatings.forEach((r) => {
      const rating = Math.round(r.managerReview?.overallRating || 0);
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++;
      }
    });
    return distribution;
  };

  const distribution = getRatingDistribution();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "manager-review-submitted":
        return <Badge className="bg-blue-500">Manager Review Submitted</Badge>;
      case "hr-review-pending":
        return <Badge className="bg-orange-500">HR Review Pending</Badge>;
      case "hr-review-submitted":
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pagination = reviewsData?.data?.pagination;
  const totalPages = pagination?.pages || 1;

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">HR Review & Finalization</h2>
              <p className="text-sm text-muted-foreground">
                Validate ratings and finalize performance reviews
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{totalReviews}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedReviews}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingReviews}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        {reviewsWithRatings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" />
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 h-32">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary/80 rounded-t transition-all"
                      style={{
                        height:
                          reviewsWithRatings.length > 0
                            ? `${
                                (distribution[rating as keyof typeof distribution] /
                                  reviewsWithRatings.length) *
                                100
                              }%`
                            : "0%",
                        minHeight:
                          distribution[rating as keyof typeof distribution] > 0 ? "20px" : "0",
                      }}
                    />
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{rating}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {distribution[rating as keyof typeof distribution]} emp
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                      setPage(1); // Reset to first page on search
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
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="manager-review-submitted">Manager Submitted</SelectItem>
                    <SelectItem value="hr-review-pending">HR Pending</SelectItem>
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

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">All Reviews</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {searchedReviews.length} of {reviewsForHR.length} HR reviews
                {pagination && ` (${pagination.total} total in system)`}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : searchedReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reviews found. Try adjusting your filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">Self Rating</TableHead>
                        <TableHead className="text-center">Manager Rating</TableHead>
                        <TableHead className="text-center">HR Rating</TableHead>
                        <TableHead className="text-center">Review Cycle</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchedReviews.map((review: any) => {
                        const employee = review.employeeId as any;
                        const selfRating = review.selfReview?.overallRating || 0;
                        const managerRating = review.managerReview?.overallRating || 0;
                        return (
                          <TableRow key={review._id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  {employee?.name?.charAt(0) || "N"}
                                </div>
                                <div>
                                  <p className="font-medium">{employee?.name || "N/A"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {employee?.employeeId || "N/A"} • {employee?.department || "N/A"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                {selfRating > 0 ? selfRating.toFixed(1) : "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                                {managerRating > 0 ? managerRating.toFixed(1) : "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-green-500 fill-green-500" />
                                {review.hrReview?.overallRating ? review.hrReview.overallRating.toFixed(1) : "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <p className="text-sm">{review.reviewCycle}</p>
                              <p className="text-xs text-muted-foreground">{review.reviewType}</p>
                            </TableCell>
                            <TableCell className="text-center">{getStatusBadge(review.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReviewDialog(review._id)}
                                disabled={isSubmitting}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {review.hrReview ? "View/Edit Review" : "Submit HR Review"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination && pagination.total > 0 && (
                  <div className="flex items-center justify-between mt-4">
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
          </CardContent>
        </Card>

        {/* HR Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>HR Review</DialogTitle>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Review Cycle: {selectedReview.reviewCycle} • {selectedReview.reviewType}
                  </p>
                </div>

                {/* Review Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Self Rating</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">
                        {selectedReview.selfReview?.overallRating?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Manager Rating</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                      <span className="font-semibold">
                        {selectedReview.managerReview?.overallRating?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                  </div>
                  {selectedReview.hrReview && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">HR Rating</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-green-500 fill-green-500" />
                        <span className="font-semibold">
                          {selectedReview.hrReview?.overallRating?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* HR Ratings */}
                <div className="space-y-4">
                  <h4 className="font-semibold">HR Performance Ratings (1-5)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { key: "overallRating", label: "Overall Rating" },
                      { key: "alignmentWithCompanyValues", label: "Alignment with Company Values" },
                      { key: "growthPotential", label: "Growth Potential" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <Label>{label} *</Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                              key={rating}
                              type="button"
                              variant={
                                hrReviewForm[key as keyof typeof hrReviewForm] === rating
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="w-10 h-10 p-0"
                              onClick={() =>
                                setHrReviewForm({
                                  ...hrReviewForm,
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

                {/* Feedback */}
                <div className="space-y-2">
                  <Label>Feedback</Label>
                  <Textarea
                    value={hrReviewForm.feedback}
                    onChange={(e) =>
                      setHrReviewForm({ ...hrReviewForm, feedback: e.target.value })
                    }
                    placeholder="Provide HR feedback..."
                    rows={4}
                  />
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                  <Label>Recommendations</Label>
                  <Textarea
                    value={hrReviewForm.recommendations}
                    onChange={(e) =>
                      setHrReviewForm({ ...hrReviewForm, recommendations: e.target.value })
                    }
                    placeholder="Provide recommendations..."
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit HR Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
