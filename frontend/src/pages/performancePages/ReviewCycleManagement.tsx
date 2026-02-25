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
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock, AlertCircle } from "lucide-react";
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
  const { data: allReviewsData } = useGetPerformanceReviewsQuery({ limit: 50, page: 1 });
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

  // Helper function to format date as YYYY-MM-DD string without timezone conversion
  // This preserves the date the user selected regardless of timezone
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to normalize date to midnight (start of day) to avoid timezone issues
  // This must be defined before getInitialDates since it's used there
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Initialize form with default dates based on Quarterly type (only start and end dates)
  const getInitialDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to midnight
    const start = normalizeDate(startOfQuarter(today));
    const end = normalizeDate(endOfQuarter(today));
    return {
      startDate: start,
      endDate: end,
    };
  };

  const initialDates = getInitialDates();
  const [formData, setFormData] = useState<{
    name: string;
    type: "Quarterly" | "Half-Yearly" | "Annual" | "Probation" | "Custom";
    startDate: Date | undefined;
    endDate: Date | undefined;
    goalSubmissionDeadline: Date | undefined;
    selfReviewDeadline: Date | undefined;
    managerReviewDeadline: Date | undefined;
    hrReviewDeadline: Date | undefined;
    description: string;
  }>({
    name: "",
    type: "Quarterly",
    startDate: initialDates.startDate,
    endDate: initialDates.endDate,
    goalSubmissionDeadline: undefined,
    selfReviewDeadline: undefined,
    managerReviewDeadline: undefined,
    hrReviewDeadline: undefined,
    description: "",
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    goalSubmissionDeadline?: string;
    selfReviewDeadline?: string;
    managerReviewDeadline?: string;
    hrReviewDeadline?: string;
  }>({});

  // Helper function to check if a date is within the start and end date range
  const isDateInRange = (date: Date | undefined, startDate: Date | undefined, endDate: Date | undefined): boolean => {
    if (!date || !startDate || !endDate) return false;
    const dateTime = date.getTime();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };

  // Helper function to clamp a date within the range
  const clampDate = (date: Date | undefined, startDate: Date | undefined, endDate: Date | undefined): Date | undefined => {
    if (!date || !startDate || !endDate) return date;
    const dateTime = date.getTime();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    if (dateTime < startTime) return new Date(startDate);
    if (dateTime > endTime) return new Date(endDate);
    return date;
  };

  // Validate all deadline dates are within the range
  const validateDeadlineDates = (startDate: Date | undefined, endDate: Date | undefined, deadlines: {
    goalSubmissionDeadline: Date | undefined;
    selfReviewDeadline: Date | undefined;
    managerReviewDeadline: Date | undefined;
    hrReviewDeadline: Date | undefined;
  }): { isValid: boolean; errors: typeof validationErrors } => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    // Only validate if start and end dates are set
    if (!startDate || !endDate) {
      return { isValid: true, errors: {} };
    }

    if (deadlines.goalSubmissionDeadline && !isDateInRange(deadlines.goalSubmissionDeadline, startDate, endDate)) {
      errors.goalSubmissionDeadline = "Goal submission deadline must be within the cycle date range";
      isValid = false;
    }

    if (deadlines.selfReviewDeadline && !isDateInRange(deadlines.selfReviewDeadline, startDate, endDate)) {
      errors.selfReviewDeadline = "Self review deadline must be within the cycle date range";
      isValid = false;
    }

    if (deadlines.managerReviewDeadline && !isDateInRange(deadlines.managerReviewDeadline, startDate, endDate)) {
      errors.managerReviewDeadline = "Manager review deadline must be within the cycle date range";
      isValid = false;
    }

    if (deadlines.hrReviewDeadline && !isDateInRange(deadlines.hrReviewDeadline, startDate, endDate)) {
      errors.hrReviewDeadline = "HR review deadline must be within the cycle date range";
      isValid = false;
    }

    return { isValid, errors };
  };

  // Adjust deadline dates when start or end date changes
  const adjustDeadlineDates = (newStartDate: Date | undefined, newEndDate: Date | undefined) => {
    // Normalize dates to midnight to avoid timezone issues
    const normalizedStart = newStartDate ? normalizeDate(newStartDate) : undefined;
    const normalizedEnd = newEndDate ? normalizeDate(newEndDate) : undefined;

    if (!normalizedStart || !normalizedEnd) {
      // If dates are not set, just update them without adjusting deadlines
      setFormData((prev) => ({
        ...prev,
        startDate: normalizedStart,
        endDate: normalizedEnd,
      }));
      return;
    }

    setFormData((prev) => {
      // If start date is after end date, just update the dates without adjusting deadlines
      // The validation will catch this error when submitting
      if (normalizedStart >= normalizedEnd) {
        return {
          ...prev,
          startDate: normalizedStart,
          endDate: normalizedEnd,
        };
      }

      // Only adjust deadlines if they are already set
      const adjusted = {
        ...prev,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        goalSubmissionDeadline: prev.goalSubmissionDeadline 
          ? clampDate(prev.goalSubmissionDeadline, normalizedStart, normalizedEnd)
          : undefined,
        selfReviewDeadline: prev.selfReviewDeadline
          ? clampDate(prev.selfReviewDeadline, normalizedStart, normalizedEnd)
          : undefined,
        managerReviewDeadline: prev.managerReviewDeadline
          ? clampDate(prev.managerReviewDeadline, normalizedStart, normalizedEnd)
          : undefined,
        hrReviewDeadline: prev.hrReviewDeadline
          ? clampDate(prev.hrReviewDeadline, normalizedStart, normalizedEnd)
          : undefined,
      };

      // Validate and update errors
      const validation = validateDeadlineDates(normalizedStart, normalizedEnd, {
        goalSubmissionDeadline: adjusted.goalSubmissionDeadline,
        selfReviewDeadline: adjusted.selfReviewDeadline,
        managerReviewDeadline: adjusted.managerReviewDeadline,
        hrReviewDeadline: adjusted.hrReviewDeadline,
      });
      setValidationErrors(validation.errors);

      return adjusted;
    });
  };

  // Calculate dates based on cycle type (only start and end dates, no deadlines)
  const calculateDatesByType = (type: string): { startDate: Date | undefined; endDate: Date | undefined } => {
    // For Custom type, return undefined - user must pick dates manually
    if (type === "Custom") {
      return {
        startDate: undefined,
        endDate: undefined,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to midnight
    let start: Date;
    let end: Date;

    switch (type) {
      case "Quarterly":
        // Current quarter
        start = normalizeDate(startOfQuarter(today));
        end = normalizeDate(endOfQuarter(today));
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
        start = normalizeDate(start);
        end = normalizeDate(end);
        break;
      case "Annual":
        // Current year
        start = normalizeDate(startOfYear(today));
        end = normalizeDate(endOfYear(today));
        break;
      case "Probation":
        // 3 months from today
        start = normalizeDate(today);
        end = normalizeDate(addMonths(today, 3));
        break;
      default:
        // Should not reach here, but default to current quarter
        start = normalizeDate(startOfQuarter(today));
        end = normalizeDate(endOfQuarter(today));
    }

    return {
      startDate: start,
      endDate: end,
    };
  };

  // Handle type change - auto-calculate only start and end dates, clear deadline dates
  const handleTypeChange = (type: string) => {
    const calculatedDates = calculateDatesByType(type);
    // Use functional update to ensure state is properly updated
    setFormData((prev) => ({
      ...prev,
      type: type as any,
      startDate: calculatedDates.startDate,
      endDate: calculatedDates.endDate,
      // Clear all deadline dates - user must set them manually
      goalSubmissionDeadline: undefined,
      selfReviewDeadline: undefined,
      managerReviewDeadline: undefined,
      hrReviewDeadline: undefined,
    }));
    // Clear validation errors when type changes
    setValidationErrors({});
  };

  const handleCreateCycle = async () => {
    // Validate required fields with specific error messages
    if (!formData.name || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a cycle name",
        variant: "destructive",
      });
      return;
    }
    if (!formData.type) {
      toast({
        title: "Validation Error",
        description: "Please select a cycle type",
        variant: "destructive",
      });
      return;
    }
    if (!formData.startDate) {
      toast({
        title: "Validation Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }
    if (!formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select an end date",
        variant: "destructive",
      });
      return;
    }
    // Validate date range
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        toast({
          title: "Validation Error",
          description: "End date must be after start date",
          variant: "destructive",
        });
        return;
      }
    }

    // Multiple cycles are allowed (e.g. for new joiners). Assign staff to the appropriate cycle when creating reviews.

    // Validate deadline dates with specific error messages
    if (!formData.goalSubmissionDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select a goal submission deadline",
        variant: "destructive",
      });
      return;
    }
    if (!formData.selfReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select a self review deadline",
        variant: "destructive",
      });
      return;
    }
    if (!formData.managerReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select a manager review deadline",
        variant: "destructive",
      });
      return;
    }
    if (!formData.hrReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select an HR review deadline",
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

    // Validate start date is before end date
    if (formData.startDate >= formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    // Validate all deadline dates are within the range
    const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
      goalSubmissionDeadline: formData.goalSubmissionDeadline,
      selfReviewDeadline: formData.selfReviewDeadline,
      managerReviewDeadline: formData.managerReviewDeadline,
      hrReviewDeadline: formData.hrReviewDeadline,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: "Please ensure all deadline dates are within the cycle date range",
        variant: "destructive",
      });
      return;
    }

    // Clear validation errors if validation passes
    setValidationErrors({});

    try {
      await createCycle({
        name: formData.name,
        type: formData.type,
        startDate: formatDateForAPI(formData.startDate),
        endDate: formatDateForAPI(formData.endDate),
        goalSubmissionDeadline: formatDateForAPI(formData.goalSubmissionDeadline),
        selfReviewDeadline: formatDateForAPI(formData.selfReviewDeadline),
        managerReviewDeadline: formatDateForAPI(formData.managerReviewDeadline),
        hrReviewDeadline: formatDateForAPI(formData.hrReviewDeadline),
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

    // Validate required fields with specific error messages
    if (!formData.name || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a cycle name",
        variant: "destructive",
      });
      return;
    }
    if (!formData.type) {
      toast({
        title: "Validation Error",
        description: "Please select a cycle type",
        variant: "destructive",
      });
      return;
    }
    if (!formData.startDate) {
      toast({
        title: "Validation Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }
    if (!formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select an end date",
        variant: "destructive",
      });
      return;
    }
    if (!formData.goalSubmissionDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select a goal submission deadline",
        variant: "destructive",
      });
      return;
    }
    if (!formData.selfReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select a self review deadline",
        variant: "destructive",
      });
      return;
    }
    if (!formData.managerReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select a manager review deadline",
        variant: "destructive",
      });
      return;
    }
    if (!formData.hrReviewDeadline) {
      toast({
        title: "Validation Error",
        description: "Please select an HR review deadline",
        variant: "destructive",
      });
      return;
    }

    // Validate start date is before end date
    if (formData.startDate >= formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    // Validate all deadline dates are within the range
    const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
      goalSubmissionDeadline: formData.goalSubmissionDeadline,
      selfReviewDeadline: formData.selfReviewDeadline,
      managerReviewDeadline: formData.managerReviewDeadline,
      hrReviewDeadline: formData.hrReviewDeadline,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: "Please ensure all deadline dates are within the cycle date range",
        variant: "destructive",
      });
      return;
    }

    // Clear validation errors if validation passes
    setValidationErrors({});

    try {
      await updateCycle({
        id: editingCycle._id,
        data: {
          ...formData,
          startDate: formatDateForAPI(formData.startDate),
          endDate: formatDateForAPI(formData.endDate),
          goalSubmissionDeadline: formatDateForAPI(formData.goalSubmissionDeadline),
          selfReviewDeadline: formatDateForAPI(formData.selfReviewDeadline),
          managerReviewDeadline: formatDateForAPI(formData.managerReviewDeadline),
          hrReviewDeadline: formatDateForAPI(formData.hrReviewDeadline),
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
      goalSubmissionDeadline: undefined,
      selfReviewDeadline: undefined,
      managerReviewDeadline: undefined,
      hrReviewDeadline: undefined,
      description: "",
    });
    setValidationErrors({});
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
      startDate: normalizeDate(new Date(cycle.startDate)),
      endDate: normalizeDate(new Date(cycle.endDate)),
      goalSubmissionDeadline: normalizeDate(new Date(cycle.goalSubmissionDeadline)),
      selfReviewDeadline: normalizeDate(new Date(cycle.selfReviewDeadline)),
      managerReviewDeadline: normalizeDate(new Date(cycle.managerReviewDeadline)),
      hrReviewDeadline: normalizeDate(new Date(cycle.hrReviewDeadline)),
      description: cycle.description || "",
    });
    setValidationErrors({});
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
                    Define a new performance review cycle with deadlines. You can have multiple cycles (e.g. for new joiners) and assign staff to the appropriate cycle when creating reviews.
                  </DialogDescription>
                </DialogHeader>
                {(() => {
                  const now = new Date();
                  const activeCycleWithReviews = cycles.find((c: any) => {
                    const cycleEnd = new Date(c.endDate);
                    cycleEnd.setHours(23, 59, 59, 999);
                    const isActive = cycleEnd >= now && c.status !== 'completed' && c.status !== 'cancelled';
                    const hasReviews = allReviews.some((r: any) => r.reviewCycle === c.name);
                    return isActive && hasReviews;
                  });
                  return activeCycleWithReviews ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-blue-800 font-medium mb-1">
                            You have an active cycle
                          </p>
                          <p className="text-xs text-blue-700">
                            Active cycle &quot;{activeCycleWithReviews.name}&quot; ({activeCycleWithReviews.type}) ends on {new Date(activeCycleWithReviews.endDate).toLocaleDateString()}. 
                            You can still create a new cycle (e.g. for new staff) and assign each employee to the right cycle when creating reviews.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
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
                          <SelectValue placeholder="Select type" />
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
                        Changing type will auto-calculate start and end dates only
                      </p>
                    </div>
                  </div>
                  {(() => {
                    // Check if cycle has reviews - if reviews exist, dates should not be editable
                    const hasReviews = editingCycle ? allReviews.some((r: any) => r.reviewCycle === editingCycle.name) : false;
                    const shouldDisableDates = hasReviews; // Disable if reviews exist, regardless of end date
                    
                    return (
                      <>
                        {shouldDisableDates && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <p className="text-sm text-yellow-800">
                                This cycle has reviews created for employees. Dates cannot be edited. Please create a new cycle if you need different dates.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date *</Label>
                            <DatePicker
                              value={formData.startDate}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                adjustDeadlineDates(normalizedDate, formData.endDate);
                              }}
                              placeholder="Select start date"
                              disabled={shouldDisableDates}
                            />
                          </div>
                          <div>
                            <Label>End Date *</Label>
                            <DatePicker
                              value={formData.endDate}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                adjustDeadlineDates(formData.startDate, normalizedDate);
                              }}
                              placeholder="Select end date"
                              fromDate={formData.startDate}
                              disabled={shouldDisableDates}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Goal Submission Deadline *</Label>
                            <DatePicker
                              value={formData.goalSubmissionDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: normalizedDate,
                                  selfReviewDeadline: formData.selfReviewDeadline,
                                  managerReviewDeadline: formData.managerReviewDeadline,
                                  hrReviewDeadline: formData.hrReviewDeadline,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, goalSubmissionDeadline: normalizedDate });
                              }}
                              placeholder="Select goal submission deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.goalSubmissionDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.goalSubmissionDeadline}</p>
                            )}
                          </div>
                          <div>
                            <Label>Self Review Deadline *</Label>
                            <DatePicker
                              value={formData.selfReviewDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: formData.goalSubmissionDeadline,
                                  selfReviewDeadline: normalizedDate,
                                  managerReviewDeadline: formData.managerReviewDeadline,
                                  hrReviewDeadline: formData.hrReviewDeadline,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, selfReviewDeadline: normalizedDate });
                              }}
                              placeholder="Select self review deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.selfReviewDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.selfReviewDeadline}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Manager Review Deadline *</Label>
                            <DatePicker
                              value={formData.managerReviewDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: formData.goalSubmissionDeadline,
                                  selfReviewDeadline: formData.selfReviewDeadline,
                                  managerReviewDeadline: normalizedDate,
                                  hrReviewDeadline: formData.hrReviewDeadline,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, managerReviewDeadline: normalizedDate });
                              }}
                              placeholder="Select manager review deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.managerReviewDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.managerReviewDeadline}</p>
                            )}
                          </div>
                          <div>
                            <Label>HR Review Deadline *</Label>
                            <DatePicker
                              value={formData.hrReviewDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: formData.goalSubmissionDeadline,
                                  selfReviewDeadline: formData.selfReviewDeadline,
                                  managerReviewDeadline: formData.managerReviewDeadline,
                                  hrReviewDeadline: normalizedDate,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, hrReviewDeadline: normalizedDate });
                              }}
                              placeholder="Select HR review deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.hrReviewDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.hrReviewDeadline}</p>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
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
                        <SelectValue placeholder="Select type" />
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
                        Changing type will auto-calculate start and end dates only
                      </p>
                    </div>
                  </div>
                  {(() => {
                    // Check if cycle has reviews - if reviews exist, dates should not be editable
                    const hasReviews = editingCycle ? allReviews.some((r: any) => r.reviewCycle === editingCycle.name) : false;
                    const shouldDisableDates = hasReviews; // Disable if reviews exist, regardless of end date
                    
                    return (
                      <>
                        {shouldDisableDates && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <p className="text-sm text-yellow-800">
                                This cycle has reviews created for employees. Dates cannot be edited. Please create a new cycle if you need different dates.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Date *</Label>
                            <DatePicker
                              value={formData.startDate}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                adjustDeadlineDates(normalizedDate, formData.endDate);
                              }}
                              placeholder="Select start date"
                              disabled={shouldDisableDates}
                            />
                          </div>
                          <div>
                            <Label>End Date *</Label>
                            <DatePicker
                              value={formData.endDate}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                adjustDeadlineDates(formData.startDate, normalizedDate);
                              }}
                              placeholder="Select end date"
                              fromDate={formData.startDate}
                              disabled={shouldDisableDates}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Goal Submission Deadline *</Label>
                            <DatePicker
                              value={formData.goalSubmissionDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: normalizedDate,
                                  selfReviewDeadline: formData.selfReviewDeadline,
                                  managerReviewDeadline: formData.managerReviewDeadline,
                                  hrReviewDeadline: formData.hrReviewDeadline,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, goalSubmissionDeadline: normalizedDate });
                              }}
                              placeholder="Select deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.goalSubmissionDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.goalSubmissionDeadline}</p>
                            )}
                          </div>
                          <div>
                            <Label>Self Review Deadline *</Label>
                            <DatePicker
                              value={formData.selfReviewDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: formData.goalSubmissionDeadline,
                                  selfReviewDeadline: normalizedDate,
                                  managerReviewDeadline: formData.managerReviewDeadline,
                                  hrReviewDeadline: formData.hrReviewDeadline,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, selfReviewDeadline: normalizedDate });
                              }}
                              placeholder="Select deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.selfReviewDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.selfReviewDeadline}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Manager Review Deadline *</Label>
                            <DatePicker
                              value={formData.managerReviewDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: formData.goalSubmissionDeadline,
                                  selfReviewDeadline: formData.selfReviewDeadline,
                                  managerReviewDeadline: normalizedDate,
                                  hrReviewDeadline: formData.hrReviewDeadline,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, managerReviewDeadline: normalizedDate });
                              }}
                              placeholder="Select deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.managerReviewDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.managerReviewDeadline}</p>
                            )}
                          </div>
                          <div>
                            <Label>HR Review Deadline *</Label>
                            <DatePicker
                              value={formData.hrReviewDeadline}
                              onChange={(date) => {
                                const normalizedDate = date ? normalizeDate(date) : undefined;
                                const validation = validateDeadlineDates(formData.startDate, formData.endDate, {
                                  goalSubmissionDeadline: formData.goalSubmissionDeadline,
                                  selfReviewDeadline: formData.selfReviewDeadline,
                                  managerReviewDeadline: formData.managerReviewDeadline,
                                  hrReviewDeadline: normalizedDate,
                                });
                                setValidationErrors(validation.errors);
                                setFormData({ ...formData, hrReviewDeadline: normalizedDate });
                              }}
                              placeholder="Select deadline"
                              fromDate={formData.startDate}
                              toDate={formData.endDate}
                              disabled={shouldDisableDates}
                            />
                            {validationErrors.hrReviewDeadline && (
                              <p className="text-xs text-red-500 mt-1">{validationErrors.hrReviewDeadline}</p>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
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

