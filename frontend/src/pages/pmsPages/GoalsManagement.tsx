import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Target,
  Calendar,
  TrendingUp,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Eye,
  Filter,
  X,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useApproveGoalMutation,
  useRejectGoalMutation,
  useApproveGoalCompletionMutation,
  Goal,
} from "@/store/api/pmsApi";
import { useGetKRAsQuery } from "@/store/api/kraApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { format } from "date-fns";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { disabledDatePast } from "@/utils/dateTimePickerUtils";
import { useAppSelector } from "@/store/hooks";

const GoalsManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // Check if user is Admin or Super Admin
  // Also check localStorage as fallback
  const isAdmin = useMemo(() => {
    let user = currentUser;
    
    // Fallback to localStorage if Redux state not available
    if (!user) {
      try {
        const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (storedUserStr) {
          user = JSON.parse(storedUserStr);
        }
      } catch (e) {
        console.error('[GoalsManagement] Error parsing user from localStorage:', e);
      }
    }
    
    if (!user) {
      console.warn('[GoalsManagement] No user found in Redux or localStorage');
      return false;
    }
    
    if (!user.role) {
      console.warn('[GoalsManagement] User found but no role property', { user });
      return false;
    }
    
    const role = String(user.role).trim();
    // Check for Admin or Super Admin (case-insensitive for safety)
    const roleLower = role.toLowerCase();
    const isAdminUser = 
      role === "Admin" || 
      role === "Super Admin" ||
      roleLower === "admin" ||
      roleLower === "super admin";
    
    // Debug log to help troubleshoot
    if (process.env.NODE_ENV === 'development') {
      console.log('[GoalsManagement] Role check result', { 
        role, 
        roleLower,
        isAdmin: isAdminUser, 
        userId: user.id || user._id,
        userFromRedux: !!currentUser,
        userFromLocalStorage: !currentUser && !!user,
        fullUser: user
      });
    }
    
    return isAdminUser;
  }, [currentUser]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const limit = 20;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, cycleFilter, employeeFilter, searchTerm]);

  // Fetch goals with filters
  const { data: goalsData, isLoading, refetch } = useGetGoalsQuery({
    employeeId: employeeFilter !== "all" ? employeeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    cycle: cycleFilter !== "all" ? cycleFilter : undefined,
    page,
    limit,
  });

  // Fetch goals for filter options (limited for performance)
  const { data: allGoalsData } = useGetGoalsQuery({ limit: 50, page: 1 });
  const { data: staffData } = useGetStaffQuery({ page: 1, limit: 50 });
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });

  const [createGoal, { isLoading: isCreating }] = useCreateGoalMutation();
  const [updateGoal, { isLoading: isUpdating }] = useUpdateGoalMutation();
  const [approveGoal, { isLoading: isApproving }] = useApproveGoalMutation();
  const [rejectGoal, { isLoading: isRejecting }] = useRejectGoalMutation();
  const [approveGoalCompletion, { isLoading: isApprovingCompletion }] = useApproveGoalCompletionMutation();
  
  const { data: krasData } = useGetKRAsQuery({ page: 1, limit: 50 });
  const kras = krasData?.data?.kras || [];

  const goals = goalsData?.data?.goals || [];
  const allGoals = allGoalsData?.data?.goals || [];
  const staffList = staffData?.data?.staff || [];
  const cycles = cyclesData?.data?.cycles || [];

  // Get all cycles from cycles API (not from goals)
  const uniqueCycles = useMemo(() => {
    return cycles.map((c: any) => c.name).filter(Boolean).sort();
  }, [cycles]);

  // Handle edit query parameter - must be after variable declarations
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const editGoalId = searchParams.get('edit');
    
    if (!editGoalId) return;
    
    // Wait for goals to load
    if (isLoading) return;
    
    // Try to find goal in current filtered goals first
    let goalToEdit = goals.find((g: Goal) => g._id === editGoalId);
    
    // If not found, try in all goals
    if (!goalToEdit && allGoals.length > 0) {
      goalToEdit = allGoals.find((g: Goal) => g._id === editGoalId);
    }
    
    if (goalToEdit) {
      setSelectedGoal(goalToEdit);
      setIsEditDialogOpen(true);
      
      // Pre-fill the edit form
      const employeeId = typeof goalToEdit.employeeId === 'object' && goalToEdit.employeeId !== null
        ? (goalToEdit.employeeId as any)._id || (goalToEdit.employeeId as any).toString()
        : goalToEdit.employeeId?.toString() || '';
      
      setNewGoal({
        employeeId: employeeId,
        title: goalToEdit.title || "",
        type: goalToEdit.type || "",
        kpi: goalToEdit.kpi || "",
        target: goalToEdit.target || "",
        weightage: goalToEdit.weightage || 10,
        startDate: goalToEdit.startDate ? dayjs(goalToEdit.startDate) : null,
        endDate: goalToEdit.endDate ? dayjs(goalToEdit.endDate) : null,
        cycle: goalToEdit.cycle || "",
      });

      // Set cycle dates if cycle is selected
      if (goalToEdit.cycle && cycles.length > 0) {
        const selectedCycle = cycles.find((c: any) => c.name === goalToEdit.cycle);
        if (selectedCycle) {
          setSelectedCycleDates({
            startDate: new Date(selectedCycle.startDate),
            endDate: new Date(selectedCycle.endDate),
          });
        }
      }
      
      // Remove the edit parameter from URL
      searchParams.delete('edit');
      navigate(`${location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`, { replace: true });
    } else if (!isLoading && allGoals.length > 0) {
      // Only show error if we've finished loading and still can't find it
      toast({
        title: "Error",
        description: "Goal not found. It may have been deleted or you don't have access to it.",
        variant: "destructive",
      });
      searchParams.delete('edit');
      navigate(`${location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`, { replace: true });
    }
  }, [location.search, goals, allGoals, cycles, navigate, location.pathname, toast, isLoading]);

  const [newGoal, setNewGoal] = useState({
    employeeId: "",
    title: "",
    type: "",
    kpi: "",
    target: "",
    weightage: 10,
    startDate: "" as string | Dayjs | null,
    endDate: "" as string | Dayjs | null,
    cycle: "",
  });

  // Store selected cycle's date range to restrict goal dates
  const [selectedCycleDates, setSelectedCycleDates] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const handleCreateGoal = async () => {
    // For admin: employeeId is required
    // For non-admin: use current user's ID (with localStorage fallback)
    let user = currentUser;
    if (!user) {
      try {
        const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (storedUserStr) {
          user = JSON.parse(storedUserStr);
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
    
    const employeeId = isAdmin 
      ? newGoal.employeeId 
      : (user?.id || user?._id || "");
    
    // Validate required fields with specific error messages
    if (isAdmin && !newGoal.employeeId) {
      toast({
        title: "Validation Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }
    if (!isAdmin && !employeeId) {
      toast({
        title: "Validation Error",
        description: "Employee information is missing",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.title || !newGoal.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a goal title",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.type || !newGoal.type.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a goal type",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.kpi || !newGoal.kpi.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a KPI",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.target || !newGoal.target.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a target",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.cycle) {
      toast({
        title: "Validation Error",
        description: "Please select a review cycle",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.startDate) {
      toast({
        title: "Validation Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select an end date",
        variant: "destructive",
      });
      return;
    }

    // Convert Dayjs objects to ISO strings if needed
    const startDateStr = dayjs.isDayjs(newGoal.startDate) 
      ? newGoal.startDate.format('YYYY-MM-DD') 
      : String(newGoal.startDate);
    const endDateStr = dayjs.isDayjs(newGoal.endDate) 
      ? newGoal.endDate.format('YYYY-MM-DD') 
      : String(newGoal.endDate);

    // Validate that end date is after start date
    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);
    
    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Validate that dates are within the selected cycle period
    if (selectedCycleDates.startDate && selectedCycleDates.endDate) {
      const cycleStart = dayjs(selectedCycleDates.startDate);
      const cycleEnd = dayjs(selectedCycleDates.endDate);
      
      if (startDate.isBefore(cycleStart) || startDate.isAfter(cycleEnd)) {
        toast({
          title: "Validation Error",
          description: `Start date must be within the review cycle period (${format(selectedCycleDates.startDate, "MMM dd, yyyy")} - ${format(selectedCycleDates.endDate, "MMM dd, yyyy")})`,
          variant: "destructive",
        });
        return;
      }
      
      if (endDate.isBefore(cycleStart) || endDate.isAfter(cycleEnd)) {
        toast({
          title: "Validation Error",
          description: `End date must be within the review cycle period (${format(selectedCycleDates.startDate, "MMM dd, yyyy")} - ${format(selectedCycleDates.endDate, "MMM dd, yyyy")})`,
          variant: "destructive",
        });
        return;
      }
    }

    const goalData = {
      ...newGoal,
      employeeId: employeeId, // Use the determined employeeId
      startDate: startDateStr,
      endDate: endDateStr,
    };

    try {
      await createGoal(goalData).unwrap();
      toast({
        title: "Success",
        description: isAdmin 
          ? "Goal assigned to employee successfully" 
          : "Goal created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewGoal({
        employeeId: "",
        title: "",
        type: "",
        kpi: "",
        target: "",
        weightage: 10,
        startDate: null,
        endDate: null,
        cycle: "",
      });
      setSelectedCycleDates({
        startDate: null,
        endDate: null,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to create goal",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;

    // Validate required fields
    if (!newGoal.title || !newGoal.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a goal title",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.type || !newGoal.type.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a goal type",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.kpi || !newGoal.kpi.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a KPI",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.target || !newGoal.target.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a target",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.cycle) {
      toast({
        title: "Validation Error",
        description: "Please select a review cycle",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.startDate) {
      toast({
        title: "Validation Error",
        description: "Please select a start date",
        variant: "destructive",
      });
      return;
    }
    if (!newGoal.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select an end date",
        variant: "destructive",
      });
      return;
    }

    // Convert Dayjs objects to ISO strings if needed
    const startDateStr = dayjs.isDayjs(newGoal.startDate) 
      ? newGoal.startDate.format('YYYY-MM-DD') 
      : String(newGoal.startDate);
    const endDateStr = dayjs.isDayjs(newGoal.endDate) 
      ? newGoal.endDate.format('YYYY-MM-DD') 
      : String(newGoal.endDate);

    // Validate that end date is after start date
    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);
    
    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Validate that dates are within the selected cycle period
    if (selectedCycleDates.startDate && selectedCycleDates.endDate) {
      const cycleStart = dayjs(selectedCycleDates.startDate);
      const cycleEnd = dayjs(selectedCycleDates.endDate);
      
      if (startDate.isBefore(cycleStart) || startDate.isAfter(cycleEnd)) {
        toast({
          title: "Validation Error",
          description: `Start date must be within the review cycle period (${format(selectedCycleDates.startDate, "MMM dd, yyyy")} - ${format(selectedCycleDates.endDate, "MMM dd, yyyy")})`,
          variant: "destructive",
        });
        return;
      }
      
      if (endDate.isBefore(cycleStart) || endDate.isAfter(cycleEnd)) {
        toast({
          title: "Validation Error",
          description: `End date must be within the review cycle period (${format(selectedCycleDates.startDate, "MMM dd, yyyy")} - ${format(selectedCycleDates.endDate, "MMM dd, yyyy")})`,
          variant: "destructive",
        });
        return;
      }
    }

    const goalData: any = {
      title: newGoal.title,
      type: newGoal.type,
      kpi: newGoal.kpi,
      target: newGoal.target,
      weightage: newGoal.weightage,
      startDate: startDateStr,
      endDate: endDateStr,
      cycle: newGoal.cycle,
    };

    // Only include employeeId if admin is editing
    if (isAdmin && newGoal.employeeId) {
      goalData.employeeId = newGoal.employeeId;
    }

    try {
      await updateGoal({ id: selectedGoal._id, ...goalData }).unwrap();
      toast({
        title: "Success",
        description: "Goal updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedGoal(null);
      setNewGoal({
        employeeId: "",
        title: "",
        type: "",
        kpi: "",
        target: "",
        weightage: 10,
        startDate: null,
        endDate: null,
        cycle: "",
      });
      setSelectedCycleDates({
        startDate: null,
        endDate: null,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update goal",
        variant: "destructive",
      });
    }
  };

  const handleApproveGoal = async (goalId: string) => {
    try {
      await approveGoal({ id: goalId }).unwrap();
      toast({
        title: "Success",
        description: "Goal approved successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to approve goal",
        variant: "destructive",
      });
    }
  };

  const handleRejectGoal = async (goalId: string, notes: string) => {
    if (!notes.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide rejection reason",
        variant: "destructive",
      });
      return;
    }
    try {
      await rejectGoal({ id: goalId, notes }).unwrap();
      toast({
        title: "Success",
        description: "Goal rejected",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to reject goal",
        variant: "destructive",
      });
    }
  };

  const handleApproveCompletion = async (goalId: string) => {
    try {
      await approveGoalCompletion({ id: goalId }).unwrap();
      toast({
        title: "Success",
        description: "Goal completion approved",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to approve goal completion",
        variant: "destructive",
      });
    }
  };

  // Calculate KRA/KPI stats
  const goalsWithKRA = allGoals.filter((g: Goal) => g.kraId).length;
  const completedGoalsWithKRA = allGoals.filter((g: Goal) => g.kraId && g.status === "completed").length;
  const avgKRAProgress = kras.length > 0
    ? Math.round(kras.reduce((sum: number, k: any) => sum + (k.overallPercent || 0), 0) / kras.length)
    : 0;

  // Filter goals by search term
  const filteredGoals = useMemo(() => {
    if (!searchTerm.trim()) return goals;
    const search = searchTerm.toLowerCase();
    return goals.filter((goal: Goal) => {
      const employee = goal.employeeId as any;
      return (
        goal.title?.toLowerCase().includes(search) ||
        goal.kpi?.toLowerCase().includes(search) ||
        goal.type?.toLowerCase().includes(search) ||
        employee?.name?.toLowerCase().includes(search) ||
        employee?.employeeId?.toLowerCase().includes(search) ||
        employee?.department?.toLowerCase().includes(search)
      );
    });
  }, [goals, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pagination = goalsData?.data?.pagination;

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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Goals Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all employee goals
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  {isAdmin ? "Assign Goal" : "Create Goal"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isAdmin ? "Assign Goal to Employee" : "Create New Goal"}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAdmin 
                      ? "Create a performance goal for an employee. This goal will be automatically approved."
                      : "Create a new performance goal for yourself. This will be submitted for manager approval."
                    }
                  </p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Employee Selection Field - Only for Admins */}
                  {isAdmin && (
                    <div>
                      <Label>Employee *</Label>
                      <Select
                        value={newGoal.employeeId}
                        onValueChange={(value) =>
                          setNewGoal({ ...newGoal, employeeId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.length > 0 ? (
                            staffList.map((staff: any) => (
                              <SelectItem key={staff._id} value={staff._id}>
                                {staff.name} ({staff.employeeId}) - {staff.designation}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {staffList.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No employees found. Please ensure staff data is available.
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label>Review Cycle *</Label>
                    <Select
                      value={newGoal.cycle}
                      onValueChange={(value) => {
                        // Find the selected cycle to get its date range
                        const selectedCycle = cycles.find((c: any) => c.name === value);
                        if (selectedCycle) {
                          const cycleStartDate = new Date(selectedCycle.startDate);
                          const cycleEndDate = new Date(selectedCycle.endDate);
                          
                          // Set cycle date range
                          setSelectedCycleDates({
                            startDate: cycleStartDate,
                            endDate: cycleEndDate,
                          });

                          // Check if current dates are outside the cycle range
                          let updatedStartDate = newGoal.startDate;
                          let updatedEndDate = newGoal.endDate;

                          if (newGoal.startDate) {
                            const startDate = dayjs.isDayjs(newGoal.startDate) 
                              ? newGoal.startDate.toDate()
                              : new Date(newGoal.startDate);
                            
                            // If start date is before cycle start or after cycle end, reset it
                            if (startDate < cycleStartDate || startDate > cycleEndDate) {
                              updatedStartDate = null;
                            }
                          }

                          if (newGoal.endDate) {
                            const endDate = dayjs.isDayjs(newGoal.endDate) 
                              ? newGoal.endDate.toDate()
                              : new Date(newGoal.endDate);
                            
                            // If end date is before cycle start or after cycle end, reset it
                            if (endDate < cycleStartDate || endDate > cycleEndDate) {
                              updatedEndDate = null;
                            }
                          }

                          setNewGoal({ 
                            ...newGoal, 
                            cycle: value,
                            startDate: updatedStartDate,
                            endDate: updatedEndDate,
                          });
                        } else {
                          // Cycle not found, clear dates
                          setSelectedCycleDates({
                            startDate: null,
                            endDate: null,
                          });
                          setNewGoal({ 
                            ...newGoal, 
                            cycle: value,
                            startDate: null,
                            endDate: null,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((cycle: any) => (
                          <SelectItem key={cycle._id} value={cycle.name}>
                            {cycle.name} ({cycle.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCycleDates.startDate && selectedCycleDates.endDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Goal dates must be between {format(selectedCycleDates.startDate, "MMM dd, yyyy")} and {format(selectedCycleDates.endDate, "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Goal Title *</Label>
                    <Input
                      value={newGoal.title}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, title: e.target.value })
                      }
                      placeholder="Enter goal title"
                    />
                  </div>
                  <div>
                    <Label>Goal Type *</Label>
                    <Input
                      value={newGoal.type}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, type: e.target.value })
                      }
                      placeholder="e.g., Code Quality, Revenue, etc."
                    />
                  </div>
                  <div>
                    <Label>KPI *</Label>
                    <Input
                      value={newGoal.kpi}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, kpi: e.target.value })
                      }
                      placeholder="e.g., Code Review Score, Revenue, Customer Satisfaction"
                    />
                  </div>
                  <div>
                    <Label>Target *</Label>
                    <Input
                      value={newGoal.target}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, target: e.target.value })
                      }
                      placeholder="e.g., 4.5/5, $50K, 95%, 100 units"
                    />
                  </div>
                  <div>
                    <Label>Weightage (%) *</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newGoal.weightage}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          weightage: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <div className="[&_.ant-picker]:h-10 [&_.ant-picker]:w-full [&_.ant-picker-input]:h-10 [&_.ant-picker-input]:text-sm">
                        <DatePicker
                          className="w-full"
                          style={{ width: '100%', height: '40px' }}
                          value={newGoal.startDate ? (dayjs.isDayjs(newGoal.startDate) ? newGoal.startDate : dayjs(newGoal.startDate)) : null}
                          onChange={(date) =>
                            setNewGoal({ ...newGoal, startDate: date })
                          }
                          disabledDate={(current) => {
                            if (!current) return false;
                            
                            // If a cycle is selected, restrict dates to cycle period only
                            if (selectedCycleDates.startDate && selectedCycleDates.endDate) {
                              const cycleStart = dayjs(selectedCycleDates.startDate).startOf('day');
                              const cycleEnd = dayjs(selectedCycleDates.endDate).endOf('day');
                              
                              // Disable dates before cycle start
                              if (current < cycleStart) {
                                return true;
                              }
                              // Disable dates after cycle end
                              if (current > cycleEnd) {
                                return true;
                              }
                              
                              // Within cycle period, also disable past dates
                              if (disabledDatePast(current)) {
                                return true;
                              }
                              
                              return false;
                            }
                            
                            // If no cycle selected, only disable past dates
                            return disabledDatePast(current);
                          }}
                          format="YYYY-MM-DD"
                          placeholder="Select start date"
                          size="large"
                          disabled={!newGoal.cycle}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {newGoal.cycle && selectedCycleDates.startDate && selectedCycleDates.endDate
                          ? `Only dates between ${format(selectedCycleDates.startDate, "MMM dd, yyyy")} and ${format(selectedCycleDates.endDate, "MMM dd, yyyy")} can be selected`
                          : newGoal.cycle
                          ? "Please select a review cycle first"
                          : "Please select a review cycle first"
                        }
                      </p>
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <div className="[&_.ant-picker]:h-10 [&_.ant-picker]:w-full [&_.ant-picker-input]:h-10 [&_.ant-picker-input]:text-sm">
                        <DatePicker
                          className="w-full"
                          style={{ width: '100%', height: '40px' }}
                          value={newGoal.endDate ? (dayjs.isDayjs(newGoal.endDate) ? newGoal.endDate : dayjs(newGoal.endDate)) : null}
                          onChange={(date) =>
                            setNewGoal({ ...newGoal, endDate: date })
                          }
                          disabledDate={(current) => {
                            if (!current) return false;
                            
                            // If a cycle is selected, restrict dates to cycle period only
                            if (selectedCycleDates.startDate && selectedCycleDates.endDate) {
                              const cycleStart = dayjs(selectedCycleDates.startDate).startOf('day');
                              const cycleEnd = dayjs(selectedCycleDates.endDate).endOf('day');
                              
                              // Disable dates before cycle start
                              if (current < cycleStart) {
                                return true;
                              }
                              // Disable dates after cycle end
                              if (current > cycleEnd) {
                                return true;
                              }
                              
                              // Within cycle period, also disable past dates
                              if (disabledDatePast(current)) {
                                return true;
                              }
                              
                              // Disable dates before start date if start date is selected
                              if (newGoal.startDate) {
                                const startDate = dayjs.isDayjs(newGoal.startDate) 
                                  ? newGoal.startDate 
                                  : dayjs(newGoal.startDate);
                                if (current < startDate.startOf('day')) {
                                  return true;
                                }
                              }
                              
                              return false;
                            }
                            
                            // If no cycle selected, disable past dates and dates before start date
                            if (disabledDatePast(current)) {
                              return true;
                            }
                            
                            if (newGoal.startDate) {
                              const startDate = dayjs.isDayjs(newGoal.startDate) 
                                ? newGoal.startDate 
                                : dayjs(newGoal.startDate);
                              if (current < startDate.startOf('day')) {
                                return true;
                              }
                            }
                            
                            return false;
                          }}
                          format="YYYY-MM-DD"
                          placeholder="Select end date"
                          size="large"
                          disabled={!newGoal.cycle}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {newGoal.cycle && selectedCycleDates.startDate && selectedCycleDates.endDate
                          ? `Only dates between ${format(selectedCycleDates.startDate, "MMM dd, yyyy")} and ${format(selectedCycleDates.endDate, "MMM dd, yyyy")} can be selected, and must be after start date`
                          : newGoal.cycle
                          ? "Please select a review cycle first"
                          : "Please select a review cycle first"
                        }
                      </p>
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
                  <Button onClick={handleCreateGoal} disabled={isCreating}>
                    {isCreating 
                      ? (isAdmin ? "Assigning..." : "Creating...") 
                      : (isAdmin ? "Assign Goal" : "Create Goal")
                    }
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Goal Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
              setIsEditDialogOpen(open);
              if (!open) {
                setSelectedGoal(null);
                setNewGoal({
                  employeeId: "",
                  title: "",
                  type: "",
                  kpi: "",
                  target: "",
                  weightage: 10,
                  startDate: null,
                  endDate: null,
                  cycle: "",
                });
                setSelectedCycleDates({
                  startDate: null,
                  endDate: null,
                });
              }
            }}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Goal</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedGoal?.status === 'modified' 
                      ? "Update your goal based on the modification request. The status will change to 'pending' for re-review."
                      : "Update the goal details below."
                    }
                  </p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Employee Selection Field - Only for Admins */}
                  {isAdmin && (
                    <div>
                      <Label>Employee *</Label>
                      <Select
                        value={newGoal.employeeId}
                        onValueChange={(value) =>
                          setNewGoal({ ...newGoal, employeeId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.length > 0 ? (
                            staffList.map((staff: any) => (
                              <SelectItem key={staff._id} value={staff._id}>
                                {staff.name} ({staff.employeeId}) - {staff.designation}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Review Cycle *</Label>
                    <Select
                      value={newGoal.cycle}
                      onValueChange={(value) => {
                        const selectedCycle = cycles.find((c: any) => c.name === value);
                        if (selectedCycle) {
                          const cycleStartDate = new Date(selectedCycle.startDate);
                          const cycleEndDate = new Date(selectedCycle.endDate);
                          
                          setSelectedCycleDates({
                            startDate: cycleStartDate,
                            endDate: cycleEndDate,
                          });

                          let updatedStartDate = newGoal.startDate;
                          let updatedEndDate = newGoal.endDate;

                          if (newGoal.startDate) {
                            const startDate = dayjs.isDayjs(newGoal.startDate) 
                              ? newGoal.startDate.toDate()
                              : new Date(newGoal.startDate);
                            
                            if (startDate < cycleStartDate || startDate > cycleEndDate) {
                              updatedStartDate = null;
                            }
                          }

                          if (newGoal.endDate) {
                            const endDate = dayjs.isDayjs(newGoal.endDate) 
                              ? newGoal.endDate.toDate()
                              : new Date(newGoal.endDate);
                            
                            if (endDate < cycleStartDate || endDate > cycleEndDate) {
                              updatedEndDate = null;
                            }
                          }

                          setNewGoal({ 
                            ...newGoal, 
                            cycle: value,
                            startDate: updatedStartDate,
                            endDate: updatedEndDate,
                          });
                        } else {
                          setSelectedCycleDates({
                            startDate: null,
                            endDate: null,
                          });
                          setNewGoal({ 
                            ...newGoal, 
                            cycle: value,
                            startDate: null,
                            endDate: null,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {cycles.map((cycle: any) => (
                          <SelectItem key={cycle._id} value={cycle.name}>
                            {cycle.name} ({cycle.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCycleDates.startDate && selectedCycleDates.endDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Goal dates must be between {format(selectedCycleDates.startDate, "MMM dd, yyyy")} and {format(selectedCycleDates.endDate, "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Goal Title *</Label>
                    <Input
                      value={newGoal.title}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, title: e.target.value })
                      }
                      placeholder="Enter goal title"
                    />
                  </div>
                  <div>
                    <Label>Goal Type *</Label>
                    <Input
                      value={newGoal.type}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, type: e.target.value })
                      }
                      placeholder="e.g., Code Quality, Revenue, etc."
                    />
                  </div>
                  <div>
                    <Label>KPI *</Label>
                    <Input
                      value={newGoal.kpi}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, kpi: e.target.value })
                      }
                      placeholder="e.g., Code Review Score, Revenue, Customer Satisfaction"
                    />
                  </div>
                  <div>
                    <Label>Target *</Label>
                    <Input
                      value={newGoal.target}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, target: e.target.value })
                      }
                      placeholder="e.g., 4.5/5, $50K, 95%, 100 units"
                    />
                  </div>
                  <div>
                    <Label>Weightage (%) *</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newGoal.weightage}
                      onChange={(e) =>
                        setNewGoal({
                          ...newGoal,
                          weightage: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date *</Label>
                      <div className="[&_.ant-picker]:h-10 [&_.ant-picker]:w-full [&_.ant-picker-input]:h-10 [&_.ant-picker-input]:text-sm">
                        <DatePicker
                          className="w-full"
                          style={{ width: '100%', height: '40px' }}
                          value={newGoal.startDate ? (dayjs.isDayjs(newGoal.startDate) ? newGoal.startDate : dayjs(newGoal.startDate)) : null}
                          onChange={(date) =>
                            setNewGoal({ ...newGoal, startDate: date })
                          }
                          disabledDate={(current) => {
                            if (!current) return false;
                            
                            if (selectedCycleDates.startDate && selectedCycleDates.endDate) {
                              const cycleStart = dayjs(selectedCycleDates.startDate).startOf('day');
                              const cycleEnd = dayjs(selectedCycleDates.endDate).endOf('day');
                              
                              if (current < cycleStart) return true;
                              if (current > cycleEnd) return true;
                              if (disabledDatePast(current)) return true;
                              return false;
                            }
                            
                            return disabledDatePast(current);
                          }}
                          format="YYYY-MM-DD"
                          placeholder="Select start date"
                          size="large"
                          disabled={!newGoal.cycle}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <div className="[&_.ant-picker]:h-10 [&_.ant-picker]:w-full [&_.ant-picker-input]:h-10 [&_.ant-picker-input]:text-sm">
                        <DatePicker
                          className="w-full"
                          style={{ width: '100%', height: '40px' }}
                          value={newGoal.endDate ? (dayjs.isDayjs(newGoal.endDate) ? newGoal.endDate : dayjs(newGoal.endDate)) : null}
                          onChange={(date) =>
                            setNewGoal({ ...newGoal, endDate: date })
                          }
                          disabledDate={(current) => {
                            if (!current) return false;
                            
                            if (selectedCycleDates.startDate && selectedCycleDates.endDate) {
                              const cycleStart = dayjs(selectedCycleDates.startDate).startOf('day');
                              const cycleEnd = dayjs(selectedCycleDates.endDate).endOf('day');
                              
                              if (current < cycleStart) return true;
                              if (current > cycleEnd) return true;
                              if (disabledDatePast(current)) return true;
                              
                              if (newGoal.startDate) {
                                const startDate = dayjs.isDayjs(newGoal.startDate) 
                                  ? newGoal.startDate 
                                  : dayjs(newGoal.startDate);
                                if (current < startDate.startOf('day')) return true;
                              }
                              
                              return false;
                            }
                            
                            if (disabledDatePast(current)) return true;
                            
                            if (newGoal.startDate) {
                              const startDate = dayjs.isDayjs(newGoal.startDate) 
                                ? newGoal.startDate 
                                : dayjs(newGoal.startDate);
                              if (current < startDate.startOf('day')) return true;
                            }
                            
                            return false;
                          }}
                          format="YYYY-MM-DD"
                          placeholder="Select end date"
                          size="large"
                          disabled={!newGoal.cycle}
                        />
                      </div>
                    </div>
                  </div>
                  {selectedGoal?.modificationNotes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">Modification Request:</p>
                      <p className="text-sm text-yellow-700">{selectedGoal.modificationNotes}</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setSelectedGoal(null);
                      setNewGoal({
                        employeeId: "",
                        title: "",
                        type: "",
                        kpi: "",
                        target: "",
                        weightage: 10,
                        startDate: null,
                        endDate: null,
                        cycle: "",
                      });
                      setSelectedCycleDates({
                        startDate: null,
                        endDate: null,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateGoal} disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update Goal"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Goals
                </CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pagination?.total || allGoals.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {allGoals.filter((g: Goal) => g.status === "approved").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Approval
                </CardTitle>
                <Clock className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {allGoals.filter((g: Goal) => g.status === "pending").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {allGoals.filter((g: Goal) => g.status === "completed").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KRA/KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">
                  Goals Linked to KRA
                </CardTitle>
                <Target className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {goalsWithKRA}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {allGoals.length > 0 
                    ? `${Math.round((goalsWithKRA / allGoals.length) * 100)}% of total goals`
                    : "0%"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium ">
                  Completed Goals with KRA
                </CardTitle>
                <CheckCircle className="w-4 h-4  " />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold ">
                  {completedGoalsWithKRA}
                </div>
                <p className="text-xs   mt-1">
                  {goalsWithKRA > 0 
                    ? `${Math.round((completedGoalsWithKRA / goalsWithKRA) * 100)}% completion rate`
                    : "No KRA-linked goals"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">
                  Average KRA Progress
                </CardTitle>
                <TrendingUp className="w-4 h-4 " />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  {avgKRAProgress}%
                </div>
                <p className="text-xs  mt-1">
                  Across {kras.length} KRA{kras.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

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
                      placeholder="Search by goal title, KPI, employee name..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10 pr-10"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setPage(1);
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={cycleFilter}
                  onValueChange={(value) => {
                    setCycleFilter(value);
                    setPage(1);
                  }}
                >
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
                <Select
                  value={employeeFilter}
                  onValueChange={(value) => {
                    setEmployeeFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {staffList.map((staff: any) => (
                      <SelectItem key={staff._id} value={staff._id}>
                        {staff.name} ({staff.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Goals List */}
          {filteredGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No goals found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredGoals.map((goal: Goal) => {
                const employee = goal.employeeId as any;
                const isEmployeeCreated = goal.createdBy && !goal.assignedBy;
                return (
                  <Card key={goal._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg">{goal.title}</h3>
                            {getStatusBadge(goal.status)}
                            <Badge variant="outline">{goal.type}</Badge>
                            {isEmployeeCreated && (
                              <Badge variant="secondary">Self-Created</Badge>
                            )}
                            {goal.assignedBy && (
                              <Badge variant="default">Admin-Assigned</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>
                                {employee?.name || "N/A"} ({employee?.employeeId || "N/A"})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{goal.cycle}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>KPI: {goal.kpi}</span>
                            <span>Target: {goal.target}</span>
                            <span>Weight: {goal.weightage}%</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {format(new Date(goal.startDate), "MMM dd, yyyy")} -{" "}
                              {format(new Date(goal.endDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {goal.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveGoal(goal._id)}
                                disabled={isApproving}
                                className="w-full"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const notes = prompt("Rejection reason:");
                                  if (notes) handleRejectGoal(goal._id, notes);
                                }}
                                disabled={isRejecting}
                                className="w-full"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                          {goal.status === "completed" && !(goal as any).completedApprovedAt && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white w-full"
                              onClick={() => handleApproveCompletion(goal._id)}
                              disabled={isApprovingCompletion}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {isApprovingCompletion ? "Approving..." : "Approve Completion"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/pms/goals/${goal._id}`)}
                            className="w-full"
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
          {pagination && pagination.total > 0 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages, p + 1))
                }
                disabled={page === pagination.pages}
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

export default GoalsManagement;

