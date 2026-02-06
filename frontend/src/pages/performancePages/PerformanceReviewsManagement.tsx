import { useState, useMemo, useEffect } from "react";
import {
  useGetPerformanceReviewsQuery,
  useCreatePerformanceReviewMutation,
  useBulkCreatePerformanceReviewsMutation,
} from "@/store/api/performanceReviewApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Star, Calendar, FileText, Plus, Eye, Search, AlertCircle, Clock, Info, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { useDebounce } from "@/hooks/useDebounce";

const PerformanceReviewsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewCycleFilter, setReviewCycleFilter] = useState<string>("all");
  const [reviewTypeFilter, setReviewTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, reviewCycleFilter, reviewTypeFilter, debouncedSearchTerm]);

  // Get current month and year for filtering
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  const { data, isLoading, error } = useGetPerformanceReviewsQuery({
    status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
    reviewCycle: reviewCycleFilter && reviewCycleFilter !== "all" ? reviewCycleFilter : undefined,
    reviewType: reviewTypeFilter && reviewTypeFilter !== "all" ? reviewTypeFilter : undefined,
    search: debouncedSearchTerm && debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    month: currentMonth,
    year: currentYear,
    page,
    limit: 20,
  });

  const { data: staffData, isLoading: isLoadingStaff } = useGetStaffQuery({ page: 1, limit: 1000 });
  const { data: cyclesData, isLoading: isLoadingCycles } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  const [createReview, { isLoading: isCreating }] = useCreatePerformanceReviewMutation();
  const [bulkCreateReviews, { isLoading: isBulkCreating }] = useBulkCreatePerformanceReviewsMutation();

  const reviews = data?.data?.reviews || [];
  const staffList = staffData?.data?.staff || [];
  const cycles = cyclesData?.data?.cycles || [];

  // Get all cycles from cyclesData (all cycles)
  const uniqueCycles = useMemo(() => {
    const cycleNames = cycles.map((c: any) => c.name).filter(Boolean);
    return Array.from(new Set(cycleNames)).sort();
  }, [cycles]);
  
  // Get all review types from cycles API (all available types)
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    cycles.forEach((c: any) => {
      if (c.type) types.add(c.type);
    });
    // Also include all possible types as fallback
    const allPossibleTypes = ['Quarterly', 'Half-Yearly', 'Annual', 'Probation', 'Custom'];
    allPossibleTypes.forEach(type => types.add(type));
    return Array.from(types).sort();
  }, [cycles]);

  const [newReview, setNewReview] = useState({
    employeeId: "",
    reviewCycle: "",
    reviewCycleId: "",
    reviewType: "Quarterly" as "Quarterly" | "Half-Yearly" | "Annual" | "Probation" | "Custom",
    startDate: "",
    endDate: "",
  });

  const [bulkReview, setBulkReview] = useState({
    reviewCycleId: "",
    reviewCycle: "",
    reviewType: "Quarterly" as "Quarterly" | "Half-Yearly" | "Annual" | "Probation" | "Custom",
    startDate: "",
    endDate: "",
  });

  const handleCreateReview = async () => {
    if (!newReview.employeeId || !newReview.reviewCycle || !newReview.startDate || !newReview.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createReview({
        employeeId: newReview.employeeId,
        reviewCycle: newReview.reviewCycle,
        reviewType: newReview.reviewType,
        reviewPeriod: {
          startDate: newReview.startDate,
          endDate: newReview.endDate,
        },
      }).unwrap();

      toast({
        title: "Success",
        description: "Performance review created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewReview({
        employeeId: "",
        reviewCycle: "",
        reviewCycleId: "",
        reviewType: "Quarterly",
        startDate: "",
        endDate: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to create review",
        variant: "destructive",
      });
    }
  };

  const handleBulkCreateReviews = async () => {
    if (!bulkReview.reviewCycleId || !bulkReview.reviewCycle || !bulkReview.startDate || !bulkReview.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await bulkCreateReviews({
        reviewCycleId: bulkReview.reviewCycleId,
        reviewCycle: bulkReview.reviewCycle,
        reviewType: bulkReview.reviewType,
        reviewPeriod: {
          startDate: bulkReview.startDate,
          endDate: bulkReview.endDate,
        },
      }).unwrap();

      toast({
        title: "Success",
        description: `Successfully created ${result.data.created} performance reviews. ${result.data.skipped} employees already had reviews for this cycle.`,
      });

      setIsBulkCreateDialogOpen(false);
      setBulkReview({
        reviewCycleId: "",
        reviewCycle: "",
        reviewType: "Quarterly",
        startDate: "",
        endDate: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to create bulk reviews",
        variant: "destructive",
      });
    }
  };

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
      case "draft":
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

  // Reviews are already filtered by backend, no need for frontend filtering
  const filteredReviews = reviews;

  // Helper functions
  const isFromLastMonth = (review: any) => {
    if (!review.reviewPeriod?.startDate) return false;
    const reviewDate = new Date(review.reviewPeriod.startDate);
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    return reviewDate.getMonth() + 1 === lastMonth && reviewDate.getFullYear() === lastMonthYear;
  };

  const isPendingReview = (status: string) => {
    return ['draft', 'self-review-pending', 'manager-review-pending', 'hr-review-pending'].includes(status);
  };

  // Calculate statistics for pending reviews
  const pendingStats = useMemo(() => {
    const pendingStatuses = ['draft', 'self-review-pending', 'manager-review-pending', 'hr-review-pending'];
    const pendingReviews = filteredReviews.filter((r: any) => pendingStatuses.includes(r.status));
    const fromLastMonth = pendingReviews.filter((r: any) => isFromLastMonth(r));
    
    return {
      total: filteredReviews.length,
      pending: pendingReviews.length,
      fromLastMonth: fromLastMonth.length,
      currentMonthPending: pendingReviews.length - fromLastMonth.length,
    };
  }, [filteredReviews, currentMonth, currentYear]);

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

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Performance Reviews Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all performance reviews
              </p>
            </div>

            <div className="flex gap-2">
              <Dialog open={isBulkCreateDialogOpen} onOpenChange={setIsBulkCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default">
                    <Plus className="w-4 h-4 mr-2" />
                    Bulk Create Reviews
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Create Performance Reviews</DialogTitle>
                    <DialogDescription>
                      Create performance reviews for all active employees based on a review cycle
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Review Cycle *</Label>
                      <Select
                        value={bulkReview.reviewCycleId}
                        onValueChange={(value) => {
                          const selectedCycle = cycles.find((c: any) => c._id === value);
                          if (selectedCycle) {
                            setBulkReview({
                              ...bulkReview,
                              reviewCycleId: value,
                              reviewCycle: selectedCycle.name,
                              reviewType: selectedCycle.type as any,
                              startDate: new Date(selectedCycle.startDate).toISOString().split('T')[0],
                              endDate: new Date(selectedCycle.endDate).toISOString().split('T')[0],
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select review cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingCycles ? (
                            <SelectItem value="loading" disabled>Loading cycles...</SelectItem>
                          ) : cycles.length === 0 ? (
                            <SelectItem value="none" disabled>No cycles available. Create one first.</SelectItem>
                          ) : (
                            cycles.map((cycle: any) => (
                              <SelectItem key={cycle._id} value={cycle._id}>
                                {cycle.name} ({cycle.type}) - {new Date(cycle.startDate).toLocaleDateString()} to {new Date(cycle.endDate).toLocaleDateString()}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {bulkReview.reviewCycleId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: {bulkReview.reviewCycle}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Review Type *</Label>
                      <Select
                        value={bulkReview.reviewType}
                        onValueChange={(value: any) =>
                          setBulkReview({ ...bulkReview, reviewType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                          <SelectItem value="Annual">Annual</SelectItem>
                          <SelectItem value="Probation">Probation</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date *</Label>
                        <Input
                          type="date"
                          value={bulkReview.startDate}
                          onChange={(e) =>
                            setBulkReview({ ...bulkReview, startDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>End Date *</Label>
                        <Input
                          type="date"
                          value={bulkReview.endDate}
                          onChange={(e) =>
                            setBulkReview({ ...bulkReview, endDate: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        This will create performance reviews for all active employees. Employees who already have a review for this cycle will be skipped.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsBulkCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleBulkCreateReviews} disabled={isBulkCreating}>
                      {isBulkCreating ? "Creating..." : "Create Reviews for All Employees"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Single Review
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Performance Review</DialogTitle>
                  <DialogDescription>
                    Create a new performance review for an employee
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Employee *</Label>
                    <Select
                      value={newReview.employeeId}
                      onValueChange={(value) =>
                        setNewReview({ ...newReview, employeeId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingStaff ? "Loading employees..." : "Select employee"} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingStaff ? (
                          <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                        ) : staffList.length === 0 ? (
                          <SelectItem value="none" disabled>No employees found</SelectItem>
                        ) : (
                          staffList.map((staff: any) => (
                            <SelectItem key={staff._id} value={staff._id}>
                              {staff.name} ({staff.employeeId}) - {staff.designation} {staff.department ? `- ${staff.department}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Review Cycle *</Label>
                    <Select
                      value={newReview.reviewCycleId}
                      onValueChange={(value) => {
                        const selectedCycle = cycles.find((c: any) => c._id === value);
                        if (selectedCycle) {
                          setNewReview({
                            ...newReview,
                            reviewCycleId: value,
                            reviewCycle: selectedCycle.name,
                            reviewType: selectedCycle.type as any,
                            startDate: new Date(selectedCycle.startDate).toISOString().split('T')[0],
                            endDate: new Date(selectedCycle.endDate).toISOString().split('T')[0],
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select review cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCycles ? (
                          <SelectItem value="loading" disabled>Loading cycles...</SelectItem>
                        ) : cycles.length === 0 ? (
                          <SelectItem value="none" disabled>No cycles available. Create one first.</SelectItem>
                        ) : (
                          cycles.map((cycle: any) => (
                            <SelectItem key={cycle._id} value={cycle._id}>
                              {cycle.name} ({cycle.type}) - {new Date(cycle.startDate).toLocaleDateString()} to {new Date(cycle.endDate).toLocaleDateString()}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {newReview.reviewCycleId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected: {newReview.reviewCycle}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Review Type *</Label>
                    <Select
                      value={newReview.reviewType}
                      onValueChange={(value: any) =>
                        setNewReview({ ...newReview, reviewType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                        <SelectItem value="Annual">Annual</SelectItem>
                        <SelectItem value="Probation">Probation</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={newReview.startDate}
                        onChange={(e) =>
                          setNewReview({ ...newReview, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <Input
                        type="date"
                        value={newReview.endDate}
                        onChange={(e) =>
                          setNewReview({ ...newReview, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReview} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Review"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reviews</p>
                    <p className="text-2xl font-bold">{pendingStats.total}</p>
                  </div>
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Pending Reviews</p>
                    <p className="text-2xl font-bold text-orange-700">{pendingStats.pending}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      {pendingStats.currentMonthPending} current + {pendingStats.fromLastMonth} from last month
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 font-medium">From Last Month</p>
                    <p className="text-2xl font-bold text-red-700">{pendingStats.fromLastMonth}</p>
                    <p className="text-xs text-red-600 mt-1">Needs attention</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">
                      {filteredReviews.filter((r: any) => r.status === 'completed').length}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Banner */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Current Month Reviews + Last Month Pending
                  </p>
                  <p className="text-xs text-blue-700">
                    Showing all reviews from {new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. 
                    Pending reviews from last month are also included to ensure nothing is missed. 
                    {pendingStats.fromLastMonth > 0 && (
                      <span className="font-semibold"> {pendingStats.fromLastMonth} pending review{pendingStats.fromLastMonth !== 1 ? 's' : ''} from last month need attention.</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by employee name, ID, or cycle..."
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
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="self-review-pending">Self Review Pending</SelectItem>
                    <SelectItem value="self-review-submitted">Self Review Submitted</SelectItem>
                    <SelectItem value="manager-review-pending">Manager Review Pending</SelectItem>
                    <SelectItem value="manager-review-submitted">Manager Review Submitted</SelectItem>
                    <SelectItem value="hr-review-pending">HR Review Pending</SelectItem>
                    <SelectItem value="hr-review-submitted">HR Review Submitted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={reviewCycleFilter} onValueChange={(value) => {
                  setReviewCycleFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cycles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cycles</SelectItem>
                    {uniqueCycles.map((cycle) => (
                      <SelectItem key={cycle} value={cycle}>
                        {cycle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4">
                <Select value={reviewTypeFilter} onValueChange={(value) => {
                  setReviewTypeFilter(value);
                  setPage(1);
                }}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No performance reviews found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review: any) => {
                const fromLastMonth = isFromLastMonth(review);
                const isPending = isPendingReview(review.status);
                
                return (
                <Card 
                  key={review._id}
                  className={fromLastMonth && isPending ? "border-orange-300 bg-orange-50/30" : ""}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold">
                            {review.employeeId?.name || "Unknown"}
                          </h3>
                          <Badge 
                            variant={getStatusBadgeVariant(review.status)}
                            className={isPending ? "border-orange-500 text-orange-700" : ""}
                          >
                            {isPending && <Clock className="w-3 h-3 mr-1" />}
                            {formatStatus(review.status)}
                          </Badge>
                          {fromLastMonth && isPending && (
                            <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-100">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              From Last Month
                            </Badge>
                          )}
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
                          <div>
                            <span className="font-medium">Cycle:</span> {review.reviewCycle}
                          </div>
                          <div>
                            <span className="font-medium">Employee ID:</span>{" "}
                            {review.employeeId?.employeeId}
                          </div>
                        </div>

                        {review.finalRating && (
                          <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            <span className="text-lg font-bold">
                              {review.finalRating.toFixed(1)}/5.0
                            </span>
                            <span className="text-sm text-muted-foreground">Final Rating</span>
                          </div>
                        )}
                        
                        {fromLastMonth && isPending && (
                          <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-100 p-2 rounded">
                            <AlertCircle className="w-4 h-4" />
                            <span>
                              This pending review from last month needs attention
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/performance/reviews/${review._id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}

          {/* Pagination */}
          {data?.data?.pagination && data.data.pagination.total > 0 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {data.data.pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setPage((p) => Math.min(data.data.pagination.pages, p + 1))
                }
                disabled={page === data.data.pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  );
};

export default PerformanceReviewsManagement;

