import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetPerformanceReviewByIdQuery,
  useUpdatePerformanceReviewMutation,
} from "@/store/api/performanceReviewApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";

const EditPerformanceReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading, error } = useGetPerformanceReviewByIdQuery(id || "", {
    skip: !id,
  });
  const [updateReview, { isLoading: isUpdating }] = useUpdatePerformanceReviewMutation();
  const { data: staffData } = useGetStaffQuery({ page: 1, limit: 1000 });
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });

  const [formData, setFormData] = useState({
    employeeId: "",
    reviewCycle: "",
    reviewType: "Quarterly" as "Quarterly" | "Half-Yearly" | "Annual" | "Probation" | "Custom",
    reviewPeriod: {
      startDate: "",
      endDate: "",
    },
    managerId: "",
    status: "draft" as string,
  });

  useEffect(() => {
    if (data?.data?.review) {
      const review = data.data.review;
      setFormData({
        employeeId: typeof review.employeeId === 'object' && review.employeeId?._id 
          ? review.employeeId._id 
          : review.employeeId || "",
        reviewCycle: review.reviewCycle || "",
        reviewType: review.reviewType || "Quarterly",
        reviewPeriod: {
          startDate: review.reviewPeriod?.startDate 
            ? new Date(review.reviewPeriod.startDate).toISOString().split('T')[0]
            : "",
          endDate: review.reviewPeriod?.endDate
            ? new Date(review.reviewPeriod.endDate).toISOString().split('T')[0]
            : "",
        },
        managerId: typeof review.managerId === 'object' && review.managerId?._id
          ? review.managerId._id
          : review.managerId || "",
        status: review.status || "draft",
      });
    }
  }, [data]);

  const handleSubmit = async () => {
    if (!id) return;

    if (!formData.employeeId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    if (!formData.reviewCycle) {
      toast({
        title: "Validation Error",
        description: "Please enter a review cycle",
        variant: "destructive",
      });
      return;
    }

    if (!formData.reviewPeriod.startDate || !formData.reviewPeriod.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select review period dates",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateReview({
        id,
        data: {
          employeeId: formData.employeeId,
          reviewCycle: formData.reviewCycle,
          reviewType: formData.reviewType,
          reviewPeriod: {
            startDate: new Date(formData.reviewPeriod.startDate),
            endDate: new Date(formData.reviewPeriod.endDate),
          },
          managerId: formData.managerId || undefined,
          status: formData.status,
        },
      }).unwrap();

      toast({
        title: "Success",
        description: "Performance review updated successfully",
      });

      navigate(`/performance/reviews/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update review",
        variant: "destructive",
      });
    }
  };

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

  if (error || !data?.data?.review) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-red-500 mb-4">
                <h3 className="text-lg font-semibold mb-2">Error loading review</h3>
                <p className="text-sm">
                  {(error as any)?.data?.error?.message || "Review not found"}
                </p>
              </div>
              <Button onClick={() => navigate("/performance/reviews")} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const staffList = staffData?.data?.staff || [];
  const cycles = cyclesData?.data?.cycles || [];

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/performance/reviews/${id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Edit Performance Review
              </h1>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Review Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff: any) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.name} ({staff.employeeId}) - {staff.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Review Cycle *</Label>
                <Select
                  value={formData.reviewCycle}
                  onValueChange={(value) => setFormData({ ...formData, reviewCycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or enter cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((cycle: any) => (
                      <SelectItem key={cycle._id} value={cycle.name}>
                        {cycle.name} ({cycle.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.reviewCycle && !cycles.find((c: any) => c.name === formData.reviewCycle) && (
                  <Input
                    className="mt-2"
                    value={formData.reviewCycle}
                    onChange={(e) => setFormData({ ...formData, reviewCycle: e.target.value })}
                    placeholder="Or enter custom cycle name"
                  />
                )}
              </div>

              <div>
                <Label>Review Type *</Label>
                <Select
                  value={formData.reviewType}
                  onValueChange={(value: any) => setFormData({ ...formData, reviewType: value })}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.reviewPeriod.startDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reviewPeriod: { ...formData.reviewPeriod, startDate: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.reviewPeriod.endDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reviewPeriod: { ...formData.reviewPeriod, endDate: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Manager (Optional)</Label>
                <Select
                  value={formData.managerId}
                  onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">No Manager</SelectItem>
                    {staffList.map((staff: any) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.name} ({staff.employeeId}) - {staff.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="self-review-pending">Self Review Pending</SelectItem>
                    <SelectItem value="self-review-submitted">Self Review Submitted</SelectItem>
                    <SelectItem value="manager-review-pending">Manager Review Pending</SelectItem>
                    <SelectItem value="manager-review-submitted">Manager Review Submitted</SelectItem>
                    <SelectItem value="hr-review-pending">HR Review Pending</SelectItem>
                    <SelectItem value="hr-review-submitted">HR Review Submitted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate(`/performance/reviews/${id}`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isUpdating}>
              <Save className="w-4 h-4 mr-2" />
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default EditPerformanceReview;


