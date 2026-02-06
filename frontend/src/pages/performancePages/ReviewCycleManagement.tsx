import { useState, useEffect } from "react";
import {
  useGetReviewCyclesQuery,
  useCreateReviewCycleMutation,
  useUpdateReviewCycleMutation,
  useDeleteReviewCycleMutation,
} from "@/store/api/reviewCycleApi";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { format, addMonths, addDays, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetPerformanceReviewsQuery } from "@/store/api/performanceReviewApi";
import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

const ReviewCycleManagement = () => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  const [createCycle, { isLoading: isCreating }] = useCreateReviewCycleMutation();
  const [updateCycle, { isLoading: isUpdating }] = useUpdateReviewCycleMutation();
  const [deleteCycle, { isLoading: isDeleting }] = useDeleteReviewCycleMutation();

  const cycles = data?.data?.cycles || [];
  
  // Fetch all reviews to check if cycles have reviews
  const { data: allReviewsData } = useGetPerformanceReviewsQuery({ limit: 1000 });
  const allReviews = allReviewsData?.data?.reviews || [];
  
  // Check if a cycle is active and has reviews
  const isCycleActiveWithReviews = (cycle: any) => {
    const now = new Date();
    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);
    const isActive = now >= start && now <= end;
    
    if (!isActive) return false;
    
    // Check if cycle has any reviews
    const hasReviews = allReviews.some((r: any) => r.reviewCycle === cycle.name);
    return hasReviews;
  };

  // Initialize form with default dates based on Quarterly type
  const getInitialDates = () => {
    const today = new Date();
    const start = startOfQuarter(today);
    const end = endOfQuarter(today);
    return {
      startDate: start,
      endDate: end,
      goalSubmissionDeadline: addDays(start, 7),
      selfReviewDeadline: addDays(end, -7),
      managerReviewDeadline: addDays(end, -3),
      hrReviewDeadline: end,
    };
  };

  const initialDates = getInitialDates();
  const [formData, setFormData] = useState({
    name: "",
    type: "Quarterly" as "Quarterly" | "Half-Yearly" | "Annual" | "Probation" | "Custom",
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
    goalSubmissionDeadline: initialDates.goalSubmissionDeadline,
    selfReviewDeadline: initialDates.selfReviewDeadline,
    managerReviewDeadline: initialDates.managerReviewDeadline,
    hrReviewDeadline: initialDates.hrReviewDeadline,
    description: "",
  });

  // Calculate dates based on cycle type
  const calculateDatesByType = (type: string) => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case "Quarterly":
        // Current quarter
        start = startOfQuarter(today);
        end = endOfQuarter(today);
        break;
      case "Half-Yearly":
        // Current half year (Jan-Jun or Jul-Dec)
        const month = today.getMonth();
        if (month < 6) {
          start = new Date(today.getFullYear(), 0, 1);
          end = new Date(today.getFullYear(), 5, 30);
        } else {
          start = new Date(today.getFullYear(), 6, 1);
          end = new Date(today.getFullYear(), 11, 31);
        }
        break;
      case "Annual":
        // Current year
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case "Probation":
        // 3 months from today
        start = today;
        end = addMonths(today, 3);
        break;
      default:
        // Custom - default to current quarter
        start = startOfQuarter(today);
        end = endOfQuarter(today);
    }

    // Calculate deadlines (default: goal submission 1 week after start, others near end)
    const goalDeadline = addDays(start, 7);
    const selfDeadline = addDays(end, -7);
    const managerDeadline = addDays(end, -3);
    const hrDeadline = end;

    return {
      startDate: start,
      endDate: end,
      goalSubmissionDeadline: goalDeadline,
      selfReviewDeadline: selfDeadline,
      managerReviewDeadline: managerDeadline,
      hrReviewDeadline: hrDeadline,
    };
  };

  // Handle type change - auto-calculate dates
  const handleTypeChange = (type: string) => {
    const calculatedDates = calculateDatesByType(type);
    setFormData({
      ...formData,
      type: type as any,
      startDate: calculatedDates.startDate,
      endDate: calculatedDates.endDate,
      goalSubmissionDeadline: calculatedDates.goalSubmissionDeadline,
      selfReviewDeadline: calculatedDates.selfReviewDeadline,
      managerReviewDeadline: calculatedDates.managerReviewDeadline,
      hrReviewDeadline: calculatedDates.hrReviewDeadline,
    });
  };

  const handleCreateCycle = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!formData.goalSubmissionDeadline || !formData.selfReviewDeadline || 
        !formData.managerReviewDeadline || !formData.hrReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please set all deadline dates",
        variant: "destructive",
      });
      return;
    }

    // Validate that all dates are Date objects
    const dates = [
      formData.startDate,
      formData.endDate,
      formData.goalSubmissionDeadline,
      formData.selfReviewDeadline,
      formData.managerReviewDeadline,
      formData.hrReviewDeadline,
    ];

    if (dates.some(date => !date || !(date instanceof Date))) {
      toast({
        title: "Validation Error",
        description: "Please ensure all dates are properly selected",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCycle({
        name: formData.name,
        type: formData.type,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        goalSubmissionDeadline: formData.goalSubmissionDeadline.toISOString(),
        selfReviewDeadline: formData.selfReviewDeadline.toISOString(),
        managerReviewDeadline: formData.managerReviewDeadline.toISOString(),
        hrReviewDeadline: formData.hrReviewDeadline.toISOString(),
        description: formData.description || undefined,
      }).unwrap();

      toast({
        title: "Success",
        description: "Review cycle created successfully",
      });

      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Create cycle error:", error);
      toast({
        title: "Error",
        description: error?.data?.error?.message || error?.message || "Failed to create review cycle",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCycle = async () => {
    if (!editingCycle) return;

    if (!formData.startDate || !formData.endDate || !formData.goalSubmissionDeadline || 
        !formData.selfReviewDeadline || !formData.managerReviewDeadline || !formData.hrReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateCycle({
        id: editingCycle._id,
        data: {
          ...formData,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
          goalSubmissionDeadline: formData.goalSubmissionDeadline.toISOString(),
          selfReviewDeadline: formData.selfReviewDeadline.toISOString(),
          managerReviewDeadline: formData.managerReviewDeadline.toISOString(),
          hrReviewDeadline: formData.hrReviewDeadline.toISOString(),
        },
      }).unwrap();

      toast({
        title: "Success",
        description: "Review cycle updated successfully",
      });

      setEditingCycle(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update review cycle",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setCycleToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cycleToDelete) return;

    try {
      await deleteCycle(cycleToDelete).unwrap();
      toast({
        title: "Success",
        description: "Review cycle deleted successfully",
      });
      setDeleteModalOpen(false);
      setCycleToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to delete review cycle",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCycleToDelete(null);
  };

  const resetForm = () => {
    const defaultDates = getInitialDates();
    setFormData({
      name: "",
      type: "Quarterly",
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
      goalSubmissionDeadline: defaultDates.goalSubmissionDeadline,
      selfReviewDeadline: defaultDates.selfReviewDeadline,
      managerReviewDeadline: defaultDates.managerReviewDeadline,
      hrReviewDeadline: defaultDates.hrReviewDeadline,
      description: "",
    });
  };

  // Initialize form when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen && !editingCycle) {
      resetForm();
    }
  }, [isCreateDialogOpen]);

  const openEditDialog = (cycle: any) => {
    setEditingCycle(cycle);
    setFormData({
      name: cycle.name,
      type: cycle.type,
      startDate: new Date(cycle.startDate),
      endDate: new Date(cycle.endDate),
      goalSubmissionDeadline: new Date(cycle.goalSubmissionDeadline),
      selfReviewDeadline: new Date(cycle.selfReviewDeadline),
      managerReviewDeadline: new Date(cycle.managerReviewDeadline),
      hrReviewDeadline: new Date(cycle.hrReviewDeadline),
      description: cycle.description || "",
    });
  };

  const getStatusBadge = (cycle: any) => {
    const now = new Date();
    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);

    if (now < start) return <Badge variant="outline">Upcoming</Badge>;
    if (now >= start && now <= end) return <Badge variant="default">Active</Badge>;
    return <Badge variant="secondary">Completed</Badge>;
  };

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

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Review Cycle Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage performance review cycles
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Cycle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Review Cycle</DialogTitle>
                  <DialogDescription>
                    Define a new performance review cycle with deadlines
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cycle Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Q1 2024, Annual 2024"
                      />
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={handleTypeChange}
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Changing type will auto-calculate dates
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <DatePicker
                        value={formData.startDate}
                        onChange={(date) => setFormData({ ...formData, startDate: date })}
                        placeholder="Select start date"
                      />
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <DatePicker
                        value={formData.endDate}
                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                        placeholder="Select end date"
                        fromDate={formData.startDate}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Goal Submission Deadline *</Label>
                      <DatePicker
                        value={formData.goalSubmissionDeadline}
                        onChange={(date) => setFormData({ ...formData, goalSubmissionDeadline: date })}
                        placeholder="Select goal submission deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                    <div>
                      <Label>Self Review Deadline *</Label>
                      <DatePicker
                        value={formData.selfReviewDeadline}
                        onChange={(date) => setFormData({ ...formData, selfReviewDeadline: date })}
                        placeholder="Select self review deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Manager Review Deadline *</Label>
                      <DatePicker
                        value={formData.managerReviewDeadline}
                        onChange={(date) => setFormData({ ...formData, managerReviewDeadline: date })}
                        placeholder="Select manager review deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                    <div>
                      <Label>HR Review Deadline *</Label>
                      <DatePicker
                        value={formData.hrReviewDeadline}
                        onChange={(date) => setFormData({ ...formData, hrReviewDeadline: date })}
                        placeholder="Select HR review deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description for this cycle"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCycle} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Cycle"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={!!editingCycle} onOpenChange={(open) => !open && setEditingCycle(null)}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Review Cycle</DialogTitle>
                  <DialogDescription>Update review cycle details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cycle Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={handleTypeChange}
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Changing type will auto-calculate dates
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <DatePicker
                        value={formData.startDate}
                        onChange={(date) => setFormData({ ...formData, startDate: date })}
                        placeholder="Select start date"
                      />
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <DatePicker
                        value={formData.endDate}
                        onChange={(date) => setFormData({ ...formData, endDate: date })}
                        placeholder="Select end date"
                        fromDate={formData.startDate}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Goal Submission Deadline *</Label>
                      <DatePicker
                        value={formData.goalSubmissionDeadline}
                        onChange={(date) => setFormData({ ...formData, goalSubmissionDeadline: date })}
                        placeholder="Select deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                    <div>
                      <Label>Self Review Deadline *</Label>
                      <DatePicker
                        value={formData.selfReviewDeadline}
                        onChange={(date) => setFormData({ ...formData, selfReviewDeadline: date })}
                        placeholder="Select deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Manager Review Deadline *</Label>
                      <DatePicker
                        value={formData.managerReviewDeadline}
                        onChange={(date) => setFormData({ ...formData, managerReviewDeadline: date })}
                        placeholder="Select deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                    <div>
                      <Label>HR Review Deadline *</Label>
                      <DatePicker
                        value={formData.hrReviewDeadline}
                        onChange={(date) => setFormData({ ...formData, hrReviewDeadline: date })}
                        placeholder="Select deadline"
                        fromDate={formData.startDate}
                        toDate={formData.endDate}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingCycle(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateCycle} disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update Cycle"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {cycles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Review Cycles</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first review cycle to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cycles.map((cycle: any) => (
                <Card key={cycle._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{cycle.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">{cycle.type}</Badge>
                      </div>
                      {getStatusBadge(cycle)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">
                          Self Review: {new Date(cycle.selfReviewDeadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {cycle.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cycle.description}
                      </p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(cycle)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(cycle._id)}
                        disabled={isDeleting || isCycleActiveWithReviews(cycle)}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                            </span>
                          </TooltipTrigger>
                          {isCycleActiveWithReviews(cycle) && (
                            <TooltipContent>
                              <p>Cannot delete an active cycle that has reviews in progress</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true, loading: isDeleting }}
        title={
          <div className="flex items-center gap-2">
            <ExclamationCircleOutlined className="text-red-500" />
            <span>Delete Review Cycle</span>
          </div>
        }
      >
        <p>Are you sure you want to delete this review cycle? This action cannot be undone.</p>
      </Modal>
    </MainLayout>
  );
};

export default ReviewCycleManagement;

