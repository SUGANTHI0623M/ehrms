import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Star, Check, AlertTriangle, TrendingUp, Users, Award, FileCheck, BarChart3 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { useGetGoalsQuery, useSubmitReviewMutation } from "@/store/api/pmsApi";
import { message } from "antd";

interface ReviewData {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  role: string;
  selfRating: number;
  managerRating: number;
  incrementPercent: number;
  bonusPercent: number;
  recommendation: string;
  status: "pending" | "approved" | "flagged";
  biasFlag: boolean;
}

export default function HRReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const { data: goalsData, isLoading } = useGetGoalsQuery({
    status: "approved",
    page: 1,
    limit: 100
  });
  const [submitReview, { isLoading: isSubmitting }] = useSubmitReviewMutation();

  const goals = goalsData?.data?.goals || [];
  
  // Filter goals that have manager review but no HR review
  const pendingHRReviews = goals.filter(g => 
    g.managerReview && !g.hrReview
  );

  // Calculate reviews data from goals
  const reviews = pendingHRReviews.map(goal => {
    const employee = goal.employeeId as any;
    const selfRating = goal.selfReview?.rating || 0;
    const managerRating = goal.managerReview?.rating || 0;
    
    // Calculate recommendations based on ratings
    let recommendation = "increment";
    let incrementPercent = 0;
    let bonusPercent = 0;
    
    if (managerRating >= 4.5) {
      recommendation = "promotion";
      incrementPercent = 20;
      bonusPercent = 15;
    } else if (managerRating >= 4.0) {
      recommendation = "increment";
      incrementPercent = 15;
      bonusPercent = 10;
    } else if (managerRating >= 3.5) {
      recommendation = "increment";
      incrementPercent = 8;
      bonusPercent = 5;
    } else if (managerRating < 2.5) {
      recommendation = "pip";
      incrementPercent = 0;
      bonusPercent = 0;
    }
    
    // Check for bias (large gap between self and manager rating)
    const biasFlag = Math.abs(selfRating - managerRating) > 1.5;
    
    return {
      id: goal._id,
      employeeName: employee?.name || "N/A",
      employeeId: employee?.employeeId || "N/A",
      department: employee?.department || "N/A",
      role: employee?.designation || "N/A",
      selfRating,
      managerRating,
      incrementPercent,
      bonusPercent,
      recommendation,
      status: goal.hrReview ? "approved" : "pending" as const,
      biasFlag
    };
  });

  const selectedReview = reviews.find(r => r.id === selectedReviewId);
  const selectedGoal = goals.find(g => g._id === selectedReviewId);

  const handleApprove = async (reviewId: string) => {
    if (!selectedGoal) return;
    
    try {
      // Submit HR review with same rating as manager for approval
      await submitReview({
        id: reviewId,
        type: 'hr',
        rating: selectedGoal.managerReview?.rating || 4,
        comments: flagReason || "Approved by HR"
      }).unwrap();
      
      message.success("Review approved successfully!");
      setSelectedReviewId(null);
      setFlagReason("");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to approve review");
    }
  };

  const handleFlag = async () => {
    if (!selectedReviewId || !selectedGoal) return;
    
    try {
      // Submit HR review with flag/rejection
      await submitReview({
        id: selectedReviewId,
        type: 'hr',
        rating: selectedGoal.managerReview?.rating || 3,
        comments: flagReason || "Flagged for review"
      }).unwrap();
      
      message.success("Review flagged successfully!");
      setFlagDialogOpen(false);
      setSelectedReviewId(null);
      setFlagReason("");
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to flag review");
    }
  };

  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const rating = Math.round(r.managerRating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++;
      }
    });
    return distribution;
  };

  const distribution = getRatingDistribution();
  const avgRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.managerRating, 0) / reviews.length 
    : 0;

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "promotion":
        return <Badge className="bg-purple-500">Promotion</Badge>;
      case "increment":
        return <Badge className="bg-green-500">Increment</Badge>;
      case "bonus":
        return <Badge className="bg-blue-500">Bonus</Badge>;
      case "pip":
        return <Badge className="bg-red-500">PIP</Badge>;
      default:
        return <Badge variant="outline">{rec}</Badge>;
    }
  };

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
                Validate ratings and finalize PMS cycle
              </p>
            </div>
          </div>
          <Button 
            onClick={() => {
              message.info("Finalize all functionality - to be implemented");
            }} 
            className="gap-2"
            variant="outline"
          >
            <FileCheck className="w-4 h-4" />
            Finalize All & Close Cycle
          </Button>
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
                <p className="text-2xl font-bold">{reviews.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {reviews.filter((r) => r.status === "approved").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bias Flags</p>
                <p className="text-2xl font-bold">
                  {reviews.filter((r) => r.biasFlag).length}
                </p>
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
                      height: reviews.length > 0 
                        ? `${(distribution[rating as keyof typeof distribution] / reviews.length) * 100}%`
                        : "0%",
                      minHeight: distribution[rating as keyof typeof distribution] > 0 ? "20px" : "0",
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

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No reviews pending HR approval</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-center">Self Rating</TableHead>
                      <TableHead className="text-center">Manager Rating</TableHead>
                      <TableHead className="text-center">Increment %</TableHead>
                      <TableHead className="text-center">Bonus %</TableHead>
                      <TableHead className="text-center">Recommendation</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            {review.employeeName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{review.employeeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {review.employeeId} • {review.department}
                            </p>
                          </div>
                          {review.biasFlag && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {review.selfRating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                          {review.managerRating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-green-600">
                        {review.incrementPercent}%
                      </TableCell>
                      <TableCell className="text-center font-medium text-blue-600">
                        {review.bonusPercent}%
                      </TableCell>
                      <TableCell className="text-center">
                        {getRecommendationBadge(review.recommendation)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            review.status === "approved"
                              ? "bg-green-500"
                              : review.status === "flagged"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                          }
                        >
                          {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {review.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => {
                                setSelectedReviewId(review.id);
                                handleApprove(review.id);
                              }}
                              disabled={isSubmitting}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => {
                                setSelectedReviewId(review.id);
                                setFlagDialogOpen(true);
                              }}
                              disabled={isSubmitting}
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flag Dialog */}
        <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Flag Review for Reconsideration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Employee: <strong>{selectedReview?.employeeName || "N/A"}</strong>
              </p>
              <Textarea
                placeholder="Reason for flagging (bias check, inconsistency, etc.)..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleFlag}>
                Flag & Send Back
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
