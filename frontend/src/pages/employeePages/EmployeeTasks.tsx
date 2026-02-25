import { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { ClipboardCheck, Play, Pause, CheckCircle, RotateCcw, AlertCircle, FileText, Eye, MapPin, Image as ImageIcon, Shield, Navigation, Flag, Camera, LogOut, PlayCircle, CheckCircle2, Clock, Timer, X, Loader2, User, Search } from "lucide-react";
import { useGetTasksQuery, useGetTaskDetailsQuery } from "@/store/api/taskApi";
import { useGetEmployeeProfileQuery } from "@/store/api/employeeApi";
import { useGetFormTemplatesQuery, useGetFormResponsesQuery, useCreateFormResponseMutation } from "@/store/api/formApi";
import { useUpdateTaskStatusMutation, useApproveTaskMutation, useRejectTaskMutation, useGenerateTaskOTPMutation, useVerifyTaskOTPMutation } from "@/store/api/taskApi";
import { useGetTaskSettingsQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/hooks/use-toast";
import { message } from "antd";
import dayjs from "dayjs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EmployeeTasks = () => {
  const { toast } = useToast();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedFormTemplate, setSelectedFormTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [existingFormResponse, setExistingFormResponse] = useState<any>(null);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get employee's staff record to get staff ID
  const { data: employeeProfile } = useGetEmployeeProfileQuery(undefined, {
    skip: !currentUser?.id
  });
  const staffId = employeeProfile?.data?.staffData?._id;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tasks assigned to current employee with server-side search and pagination
  const { data: tasksData, isLoading, isFetching, refetch } = useGetTasksQuery({
    staffId: staffId, // Filter by current employee's staff ID
    search: debouncedSearch || undefined, // Use debounced search for server-side filtering
    page: currentPage,
    limit: pageSize,
  }, {
    skip: !staffId,
    refetchOnMountOrArgChange: true
  });

  const employeeTasks = tasksData?.data?.tasks || [];
  const pagination = tasksData?.data?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 0,
  };

  // Fetch form templates assigned to this staff
  const { data: templatesData } = useGetFormTemplatesQuery();
  const allTemplates = templatesData?.data?.templates || [];
  const assignedTemplates = allTemplates.filter((template: any) => {
    if (!template || !template.isActive) return false;
    if (!template.assignedTo || template.assignedTo.length === 0) return false;
    return template.assignedTo.some((assignedStaff: any) => {
      if (!assignedStaff) return false;
      const assignedId = typeof assignedStaff === 'string' ? assignedStaff : assignedStaff._id;
      return String(assignedId) === String(staffId);
    });
  });

  // Fetch existing form responses for tasks with pagination
  const [responsesPage, setResponsesPage] = useState(1);
  const { data: responsesData, refetch: refetchResponses } = useGetFormResponsesQuery({
    staffId: staffId || undefined,
    page: responsesPage,
    limit: 10,
  }, { skip: !staffId });

  const existingResponses = responsesData?.data?.responses || [];
  const [createFormResponse] = useCreateFormResponseMutation();

  // Load task settings
  const { data: taskSettingsData } = useGetTaskSettingsQuery();
  const taskSettings = taskSettingsData?.data?.settings || {
    autoApprove: false,
    requireApprovalOnComplete: false,
    enableOtpVerification: false,
  };

  // Mutations for updating task status
  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [approveTask] = useApproveTaskMutation();
  const [rejectTask] = useRejectTaskMutation();
  const [generateTaskOTP] = useGenerateTaskOTPMutation();
  const [verifyTaskOTP] = useVerifyTaskOTPMutation();
  
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return dayjs(dateStr).format("DD MMM YYYY");
  };

  const getStatusBadge = (task: any) => {
    const status = task.status;
    
    // For employee side: if task was completed but pending approval, still show as "Completed"
    // The admin side will show "Pending" status
    if (task.customFields?.pendingCompletion === true && status === "Pending") {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
    }
    switch (status) {
      case "Not yet Started":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Not Started</Badge>;
      case "In progress":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "Delayed Tasks":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Delayed</Badge>;
      case "Completed Tasks":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case "Reopened":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Reopened</Badge>;
      case "Pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      case "Rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      case "Hold":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">On Hold</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  const handleApproveTask = async (task: any) => {
    try {
      await approveTask(task._id).unwrap();
      toast({
        title: "Task Approved",
        description: "Task has been approved and is ready to start",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to approve task",
        variant: "destructive",
      });
    }
  };

  const handleRejectTask = (task: any) => {
    setSelectedTask(task);
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedTask) return;

    try {
      await rejectTask({ id: selectedTask._id, reason: rejectReason }).unwrap();
      toast({
        title: "Task Rejected",
        description: "Task has been rejected",
      });
      setRejectModalOpen(false);
      setRejectReason("");
      setSelectedTask(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to reject task",
        variant: "destructive",
      });
    }
  };

  const handleStartTask = async (task: any) => {
    try {
      await updateTaskStatus({
        id: task._id,
        status: "In progress"
      }).unwrap();
      toast({
        title: "Task Started",
        description: "Task has been started successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to start task",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (task: any, newStatus: string) => {
    try {
      // If completing task and requireApprovalOnComplete is enabled
      if (newStatus === "Completed Tasks" && taskSettings.requireApprovalOnComplete) {
        // Check if OTP verification is required
        if (taskSettings.enableOtpVerification) {
          handleCompleteWithOTP(task);
          return;
        } else {
          // Complete task - backend will handle approval requirement
          await updateTaskStatus({
            id: task._id,
            status: "Completed Tasks"
          }).unwrap();
          toast({
            title: "Task Completed",
            description: "Task completion is pending admin approval",
          });
          refetch();
          return;
        }
      }

      // If completing with OTP verification
      if (newStatus === "Completed Tasks" && taskSettings.enableOtpVerification) {
        handleCompleteWithOTP(task);
        return;
      }

      await updateTaskStatus({
        id: task._id,
        status: newStatus as 'Not yet Started' | 'Pending' | 'In progress' | 'Serving Today' | 'Delayed Tasks' | 'Completed Tasks' | 'Reopened' | 'Rejected' | 'Hold'
      }).unwrap();
      toast({
        title: "Status Updated",
        description: `Task status updated to ${newStatus}`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const handleCompleteWithOTP = async (task: any) => {
    // First generate OTP and send to customer email
    await handleGenerateOTP(task);
  };

  const handleOTPSubmit = async () => {
    if (!otpInput.trim()) {
      message.error("Please enter OTP");
      return;
    }

    if (!selectedTask) return;

    try {
      // Verify OTP and complete task (backend handles completion logic)
      const result = await verifyTaskOTP({ id: selectedTask._id, otp: otpInput }).unwrap();

      toast({
        title: "Task Completed",
        description: result.data?.message || (taskSettings.requireApprovalOnComplete 
          ? "OTP verified. Task completion is pending admin approval"
          : "OTP verified and task completed successfully"),
      });
      setOtpModalOpen(false);
      setOtpInput("");
      setSelectedTask(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "OTP Verification Failed",
        description: error?.data?.error?.message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateOTP = async (task: any) => {
    try {
      await generateTaskOTP(task._id).unwrap();
      toast({
        title: "OTP Sent",
        description: "OTP has been sent to customer's email",
      });
      // Open OTP modal after generating
      setSelectedTask(task);
      setOtpModalOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to generate OTP",
        variant: "destructive",
      });
    }
  };

  const canApproveTask = (task: any) => {
    // Can approve if status is Pending and autoApprove is off
    // BUT NOT if pendingCompletion is true (that's for admin approval of completion)
    // Also allow approve/reject for Reopened tasks if autoApprove is off
    if (task.customFields?.pendingCompletion === true) {
      return false; // This is completion approval, not initial task approval
    }
    return (task.status === "Pending" || task.status === "Reopened") && !taskSettings.autoApprove;
  };

  const canRejectTask = (task: any) => {
    // Can reject if status is Pending and autoApprove is off
    // BUT NOT if pendingCompletion is true (that's for admin approval of completion)
    // Also allow approve/reject for Reopened tasks if autoApprove is off
    if (task.customFields?.pendingCompletion === true) {
      return false; // This is completion approval, not initial task approval
    }
    return (task.status === "Pending" || task.status === "Reopened") && !taskSettings.autoApprove;
  };

  const canStartTask = (task: any) => {
    // Task can be started if:
    // 1. Status is "Not yet Started" (after approval or auto-approve)
    // 2. Status is "Reopened" BUT only if autoApprove is ON (no need to approve again)
    // If autoApprove is OFF and status is Reopened, show approve/reject buttons instead
    if (task.status === "Not yet Started") {
      return true;
    }
    if (task.status === "Reopened" && taskSettings.autoApprove) {
      return true;
    }
    return false;
  };

  const canUpdateStatus = (task: any) => {
    // Can update status if task is in progress and not pending completion approval
    return task.status === "In progress" && !task.customFields?.pendingCompletion;
  };

  const canResumeTask = (task: any) => {
    // Can resume if task is on hold
    return task.status === "Hold";
  };

  // Employees cannot reopen tasks - only admin can
  const canReopen = (task: any) => {
    return false; // Reopen is only available on admin side
  };

  // Check if task has assigned forms - only for completed tasks
  const getTaskForms = (task: any) => {
    // Only show forms for completed tasks
    const isCompleted = task.status === "Completed Tasks" || 
                       task.status === "completed" || 
                       task.status === "waiting_for_approval";
    if (!isCompleted) {
      return [];
    }
    return assignedTemplates.filter((template: any) => {
      // Check if template is assigned to this staff and task
      return template.isActive;
    });
  };

  // Check if form response already exists for this task and template
  const hasFormResponse = (taskId: string, templateId: string) => {
    return existingResponses.some((response: any) => {
      if (!response) return false;
      const respTaskId = typeof response.taskId === 'object' && response.taskId ? response.taskId._id : response.taskId;
      const respTemplateId = typeof response.templateId === 'object' && response.templateId ? response.templateId._id : response.templateId;
      return String(respTaskId) === String(taskId) && String(respTemplateId) === String(templateId);
    });
  };

  // Get existing form response for a task and template
  const getExistingFormResponse = (taskId: string, templateId: string) => {
    return existingResponses.find((response: any) => {
      if (!response) return false;
      const respTaskId = typeof response.taskId === 'object' && response.taskId ? response.taskId._id : response.taskId;
      const respTemplateId = typeof response.templateId === 'object' && response.templateId ? response.templateId._id : response.templateId;
      return String(respTaskId) === String(taskId) && String(respTemplateId) === String(templateId);
    });
  };

  const handleOpenFormModal = (task: any, template: any) => {
    setSelectedTask(task);
    setSelectedFormTemplate(template);
    
    // Check if there's an existing response
    const existingResponse = getExistingFormResponse(task._id, template._id);
    if (existingResponse) {
      // If response exists, show the submitted data
      setExistingFormResponse(existingResponse);
      setFormData(existingResponse.responses || {});
    } else {
      // If no response, show empty form for filling
      setExistingFormResponse(null);
      setFormData({});
    }
    setFormErrors({});
    setFormModalOpen(true);
  };

  const handleFormFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Clear error for this field
    if (formErrors[fieldName]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedFormTemplate) return errors;

    selectedFormTemplate.fields.forEach((field: any) => {
      if (field.mandatory && !formData[field.name]) {
        errors[field.name] = `${field.name} is required`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async () => {
    if (!validateForm() || !selectedTask || !selectedFormTemplate || !staffId) {
      return;
    }

    try {
      await createFormResponse({
        templateId: selectedFormTemplate._id,
        taskId: selectedTask._id,
        staffId: staffId,
        responses: formData,
      }).unwrap();

      toast({
        title: "Success",
        description: "Form submitted successfully",
      });

      setFormModalOpen(false);
      setSelectedTask(null);
      setSelectedFormTemplate(null);
      setFormData({});
      setFormErrors({});
      setExistingFormResponse(null);
      refetch();
      refetchResponses(); // Refetch form responses to update the existing responses list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to submit form",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground mt-1">View and manage your assigned tasks</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by Task ID or Title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                  disabled={isLoading && !tasksData}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    disabled={isLoading && !tasksData}
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && !tasksData ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading tasks...</p>
              </div>
            ) : employeeTasks.length === 0 && !isFetching ? (
              <div className="text-center py-8">
                <ClipboardCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {debouncedSearch ? "No tasks found matching your search" : "No Tasks Assigned"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {debouncedSearch ? "Try adjusting your search terms" : "You don't have any tasks assigned yet"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead>Expected Completion</TableHead>
                        <TableHead>Forms</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isFetching && employeeTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Loading tasks...</p>
                          </TableCell>
                        </TableRow>
                      ) : employeeTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="p-8 text-center">
                            <p className="text-muted-foreground">
                              {debouncedSearch ? "No tasks found matching your search" : "No tasks assigned"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        employeeTasks.map((task: any) => {
                          const taskForms = getTaskForms(task);
                          return (
                            <TableRow key={task._id}>
                              <TableCell className="font-mono text-sm">
                                {task.taskId || `TASK-${task._id.substring(0, 8).toUpperCase()}`}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {task.taskTitle || (typeof task.customerId === 'object' 
                                      ? task.customerId?.customerName || "Task"
                                      : "Task")}
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(task)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(task.assignedDate)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(task.expectedCompletionDate)}
                              </TableCell>
                              <TableCell>
                                {taskForms.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {taskForms.map((template: any) => {
                                      const hasResponse = hasFormResponse(task._id, template._id);
                                      return (
                                        <Button
                                          key={template._id}
                                          size="sm"
                                          variant={hasResponse ? "outline" : "default"}
                                          onClick={() => handleOpenFormModal(task, template)}
                                          className="h-7 text-xs gap-1"
                                        >
                                          <FileText className="w-3 h-3" />
                                          {template.templateName}
                                          {hasResponse && (
                                            <CheckCircle className="w-3 h-3 text-green-600" />
                                          )}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  {/* View Task Details button */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTaskForDetails(task);
                                      setTaskDetailsModalOpen(true);
                                    }}
                                    className="gap-1"
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>

                                  {/* Approve/Reject buttons */}
                                  {canApproveTask(task) && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveTask(task)}
                                        className="gap-1 bg-green-600 hover:bg-green-700 h-7"
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectTask(task)}
                                        className="gap-1 border-red-300 text-red-600 hover:bg-red-50 h-7"
                                      >
                                        <X className="w-3 h-3" />
                                        Reject
                                      </Button>
                                    </>
                                  )}

                                  {/* Start Task button */}
                                  {canStartTask(task) && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleStartTask(task)}
                                      className="gap-1 h-7"
                                    >
                                      <Play className="w-3 h-3" />
                                      Start
                                    </Button>
                                  )}
                                  
                                  {/* Status Update Options */}
                                  {canUpdateStatus(task) && (
                                    <Select
                                      value=""
                                      onValueChange={(value) => {
                                        if (value === "complete") {
                                          handleUpdateStatus(task, "Completed Tasks");
                                        } else {
                                          handleUpdateStatus(task, value);
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-[130px] h-7 text-xs">
                                        <SelectValue placeholder="Update Status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="In progress">In Progress</SelectItem>
                                        <SelectItem value="Hold">Hold</SelectItem>
                                        <SelectItem value="complete">Complete</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}

                                  {/* Resume button */}
                                  {canResumeTask(task) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUpdateStatus(task, "In progress")}
                                      className="gap-1 h-7"
                                    >
                                      <Play className="w-3 h-3" />
                                      Resume
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.total > 0 && (
                  <Pagination
                    page={currentPage}
                    pageSize={pageSize}
                    total={pagination.total}
                    pages={pagination.pages}
                    onPageChange={(newPage) => {
                      setCurrentPage(newPage);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    showPageSizeSelector={true}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Task Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this task (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this task (optional)..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectModalOpen(false);
              setRejectReason("");
              setSelectedTask(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleRejectSubmit}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Modal */}
      <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
            <DialogDescription>
              Please enter the OTP sent to the customer's email to complete this task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">OTP *</Label>
              <Input
                id="otp"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="Enter OTP"
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOtpModalOpen(false);
              setOtpInput("");
              setSelectedTask(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleOTPSubmit}>
              Verify & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Filling/Viewing Modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {existingFormResponse 
                ? `${selectedFormTemplate?.templateName || "Form"} - Submission Details`
                : selectedFormTemplate?.templateName || "Fill Form"}
            </DialogTitle>
            <DialogDescription>
              {existingFormResponse 
                ? "View your submitted form details"
                : "Fill in the required information for this form"}
            </DialogDescription>
            {existingFormResponse && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Submitted on: {dayjs(existingFormResponse.createdAt).format("DD MMM YYYY, hh:mm A")}</p>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFormTemplate?.fields ? (
              [...selectedFormTemplate.fields]
                .sort((a: any, b: any) => a.order - b.order)
                .map((field: any) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>
                      {field.name}
                      {field.mandatory && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {existingFormResponse ? (
                      // Read-only view for submitted forms
                      <div className="p-3 bg-muted rounded-md border">
                        {field.type === "Image" && formData[field.name] ? (
                          <img
                            src={formData[field.name]}
                            alt={field.name}
                            className="w-full max-w-md h-auto object-cover rounded border"
                          />
                        ) : (
                          <p className="text-sm font-medium">
                            {formData[field.name] || <span className="text-muted-foreground italic">Not provided</span>}
                          </p>
                        )}
                      </div>
                    ) : (
                      // Editable form fields
                      <>
                        {field.type === "Text" && (
                        <Input
                          id={field.name}
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                          className={formErrors[field.name] ? "border-red-500" : ""}
                        />
                      )}
                      {field.type === "Textarea" && (
                        <Textarea
                          id={field.name}
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                          className={formErrors[field.name] ? "border-red-500" : ""}
                          rows={4}
                        />
                      )}
                      {field.type === "Number" && (
                        <Input
                          id={field.name}
                          type="number"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                          className={formErrors[field.name] ? "border-red-500" : ""}
                        />
                      )}
                      {field.type === "Email" && (
                        <Input
                          id={field.name}
                          type="email"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                          className={formErrors[field.name] ? "border-red-500" : ""}
                        />
                      )}
                      {field.type === "Phone" && (
                        <Input
                          id={field.name}
                          type="tel"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                          className={formErrors[field.name] ? "border-red-500" : ""}
                        />
                      )}
                      {field.type === "Date" && (
                        <Input
                          id={field.name}
                          type="date"
                          value={formData[field.name] || ""}
                          onChange={(e) => handleFormFieldChange(field.name, e.target.value)}
                          className={formErrors[field.name] ? "border-red-500" : ""}
                        />
                      )}
                      {field.type === "Dropdown" && field.options && (
                        <Select
                          value={formData[field.name] || ""}
                          onValueChange={(value) => handleFormFieldChange(field.name, value)}
                        >
                          <SelectTrigger className={formErrors[field.name] ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option: string) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === "Image" && (
                        <div className="space-y-2">
                          <Input
                            id={field.name}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  handleFormFieldChange(field.name, reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className={formErrors[field.name] ? "border-red-500" : ""}
                            capture={field.cameraOnly ? "environment" : undefined}
                          />
                          {formData[field.name] && (
                            <img
                              src={formData[field.name]}
                              alt={field.name}
                              className="w-32 h-32 object-cover rounded border"
                            />
                          )}
                        </div>
                      )}
                        {formErrors[field.name] && (
                          <p className="text-sm text-red-500">{formErrors[field.name]}</p>
                        )}
                      </>
                    )}
                  </div>
                ))
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setFormModalOpen(false);
              setSelectedTask(null);
              setSelectedFormTemplate(null);
              setFormData({});
              setFormErrors({});
              setExistingFormResponse(null);
            }}>
              {existingFormResponse ? "Close" : "Cancel"}
            </Button>
            {!existingFormResponse && (
              <Button onClick={handleSubmitForm}>
                Submit Form
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Timeline Modal */}
      <TaskDetailsTimelineModal
        isOpen={taskDetailsModalOpen}
        onClose={() => {
          setTaskDetailsModalOpen(false);
          setSelectedTaskForDetails(null);
        }}
        task={selectedTaskForDetails}
      />
    </MainLayout>
  );
};

// Task Details Timeline Modal Component
const TaskDetailsTimelineModal = ({ isOpen, onClose, task }: { isOpen: boolean; onClose: () => void; task: any }) => {
  // Use MongoDB ObjectId (_id) instead of taskId for fetching task details
  const taskIdentifier = task?._id || task?.taskId || "";
  const { data, isLoading, error } = useGetTaskDetailsQuery(taskIdentifier, {
    skip: !taskIdentifier || !isOpen,
  });

  const taskDetails = data?.data?.taskDetails;
  const taskData = data?.data?.task || task;

  // Build timeline events in chronological order
  const timelineEvents: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    icon: any;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    timestamp?: Date;
    data?: any;
    updatedBy?: string;
  }> = [];

  if (taskData) {
    // 1. Task Created timestamp
    if (taskData.createdAt) {
      timelineEvents.push({
        id: 'created',
        type: 'created',
        title: 'Task Created',
        description: `Task ${taskData.taskId} was created`,
        icon: FileText,
        iconColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        timestamp: new Date(taskData.createdAt),
        data: { task: taskData }
      });
    }

    // 2. Task Created/Assigned
    if (taskData.assignedDate) {
      const assignedToName = typeof taskData.assignedTo === 'object' && taskData.assignedTo?.name 
        ? taskData.assignedTo.name 
        : 'N/A';
      const assignedByName = typeof taskData.assignedBy === 'object' && taskData.assignedBy?.name
        ? taskData.assignedBy.name
        : 'Admin';
      timelineEvents.push({
        id: 'assigned',
        type: 'assigned',
        title: 'Task Assigned',
        description: `Assigned to ${assignedToName} by ${assignedByName}`,
        icon: FileText,
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        timestamp: new Date(taskData.assignedDate),
        data: { task: taskData },
        updatedBy: assignedByName
      });
    }

    // 3. Task Approved (if applicable)
    if (taskDetails?.approvedAt) {
      const approvedByName = typeof taskDetails.approvedBy === 'object' && taskDetails.approvedBy?.name
        ? taskDetails.approvedBy.name
        : 'Employee';
      timelineEvents.push({
        id: 'approved',
        type: 'approved',
        title: 'Task Approved',
        description: `Task approved by ${approvedByName}`,
        icon: CheckCircle2,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        timestamp: new Date(taskDetails.approvedAt),
        data: { approvedBy: taskDetails.approvedBy },
        updatedBy: approvedByName
      });
    }

    // 4. Task Rejected (if applicable)
    if (taskDetails?.rejectedAt) {
      const rejectedByName = typeof taskDetails.rejectedBy === 'object' && taskDetails.rejectedBy?.name
        ? taskDetails.rejectedBy.name
        : 'Employee';
      timelineEvents.push({
        id: 'rejected',
        type: 'rejected',
        title: 'Task Rejected',
        description: `Task rejected by ${rejectedByName}`,
        icon: X,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        timestamp: new Date(taskDetails.rejectedAt),
        data: { rejectedBy: taskDetails.rejectedBy },
        updatedBy: rejectedByName
      });
    }

    // 5. Status Changes
    if (taskData.updatedAt && taskData.status) {
      const statusLabels: Record<string, string> = {
        'Pending': 'Pending',
        'Not yet Started': 'Not Yet Started',
        'In progress': 'In Progress',
        'Serving Today': 'Serving Today',
        'Delayed Tasks': 'Delayed',
        'Completed Tasks': 'Completed',
        'Reopened': 'Reopened',
        'reopened': 'Reopened',
        'reopenedOnArrival': 'Reopened on Arrival',
        'Rejected': 'Rejected',
        'Hold': 'On Hold',
        'exited': 'Exited',
        'exitOnArrival': 'Exit on Arrival',
        'exitedOnArrival': 'Exited on Arrival',
        'waiting_for_approval': 'Waiting for Approval'
      };
      
      if (taskData.status !== 'Pending' && taskData.status !== 'approved') {
        timelineEvents.push({
          id: 'status-change',
          type: 'status-change',
          title: `Status Changed to ${statusLabels[taskData.status] || taskData.status}`,
          description: `Task status updated`,
          icon: AlertCircle,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
          timestamp: new Date(taskData.updatedAt),
          data: { status: taskData.status }
        });
      }
    }

    // 6. Ride Started
    if (taskDetails?.rideStartedAt) {
      timelineEvents.push({
        id: 'ride-started',
        type: 'ride-started',
        title: 'Ride Started',
        description: taskDetails.rideStartLocation?.address || 'Location recorded',
        icon: PlayCircle,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        timestamp: new Date(taskDetails.rideStartedAt),
        data: { location: taskDetails.rideStartLocation },
        updatedBy: 'Employee'
      });
    }

    // 7. Start Location
    if (taskDetails?.startTime) {
      timelineEvents.push({
        id: 'start-location',
        type: 'start-location',
        title: 'Start Location',
        description: taskDetails.sourceLocation?.fullAddress || 'Location recorded',
        icon: MapPin,
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-300',
        timestamp: new Date(taskDetails.startTime),
        data: { location: taskDetails.startLocation || taskDetails.sourceLocation },
        updatedBy: 'Employee'
      });
    }

    // 8. Travel Segments
    if (taskDetails?.taskTravelDistance && taskDetails.taskTravelDistance.length > 0) {
      taskDetails.taskTravelDistance.forEach((segment: any, idx: number) => {
        const durationSegment = taskDetails.taskTravelDuration?.[idx];
        timelineEvents.push({
          id: `travel-segment-${idx}`,
          type: 'travel',
          title: `Travel Segment ${idx + 1}`,
          description: `${segment.distanceKm?.toFixed(3) || 0} km in ${durationSegment ? Math.round(durationSegment.durationSeconds / 60) : 0} min`,
          icon: Navigation,
          iconColor: 'text-indigo-600',
          bgColor: 'bg-indigo-50',
          borderColor: 'border-indigo-300',
          timestamp: segment.endTime ? new Date(segment.endTime) : undefined,
          data: { segment, durationSegment },
          updatedBy: 'Employee'
        });
      });
    }

    // 9. Destination Location
    if (taskDetails?.destinationLocation) {
      timelineEvents.push({
        id: 'destination',
        type: 'destination',
        title: 'Destination Location',
        description: taskDetails.destinationLocation.fullAddress || 'Destination set',
        icon: Flag,
        iconColor: 'text-cyan-600',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-300',
        timestamp: taskDetails.arrivalTime ? new Date(taskDetails.arrivalTime) : undefined,
        data: { location: taskDetails.destinationLocation },
        updatedBy: 'Employee'
      });
    }

    // 10. Arrival
    if (taskDetails?.arrived || taskDetails?.arrivalTime || taskDetails?.arrivedAt) {
      const arrivalTimestamp = taskDetails.arrived || taskDetails.arrivalTime || taskDetails.arrivedAt || taskDetails.arrivalLocation?.recordedAt;
      timelineEvents.push({
        id: 'arrived',
        type: 'arrived',
        title: 'Arrived at Location',
        description: taskDetails.arrivedFullAddress || taskDetails.arrivalLocation?.address || 'Location reached',
        icon: CheckCircle2,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        timestamp: arrivalTimestamp ? new Date(arrivalTimestamp) : undefined,
        data: { 
          location: taskDetails.arrivalLocation, 
          address: taskDetails.arrivedFullAddress,
          arrivedLatitude: taskDetails.arrivedLatitude,
          arrivedLongitude: taskDetails.arrivedLongitude,
          arrivedPincode: taskDetails.arrivedPincode,
          arrivedTime: taskDetails.arrivedTime
        },
        updatedBy: 'Employee'
      });
    }

    // 11. Photo Proof
    if (taskDetails?.photoProofUrl) {
      timelineEvents.push({
        id: 'photo-proof',
        type: 'photo-proof',
        title: 'Photo Proof Uploaded',
        description: taskDetails.photoProofDescription || 'Photo uploaded',
        icon: Camera,
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        timestamp: taskDetails.photoProofUploadedAt ? new Date(taskDetails.photoProofUploadedAt) : undefined,
        data: { 
          photo: taskDetails.photoProofUrl, 
          description: taskDetails.photoProofDescription, 
          address: taskDetails.photoProofAddress,
          photoProofLat: taskDetails.photoProofLat,
          photoProofLng: taskDetails.photoProofLng
        },
        updatedBy: 'Employee'
      });
    }

    // 12. OTP Sent
    if (taskDetails?.otpSentAt) {
      timelineEvents.push({
        id: 'otp-sent',
        type: 'otp-sent',
        title: 'OTP Sent',
        description: `OTP Code: ${taskDetails.otpCode || 'N/A'}`,
        icon: Shield,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        timestamp: new Date(taskDetails.otpSentAt),
        data: { code: taskDetails.otpCode },
        updatedBy: 'System'
      });
    }

    // 13. OTP Verified
    if (taskDetails?.otpCode && taskDetails?.otpVerifiedAt) {
      timelineEvents.push({
        id: 'otp-verified',
        type: 'otp-verified',
        title: 'OTP Verified',
        description: `OTP Code: ${taskDetails.otpCode}`,
        icon: Shield,
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
        timestamp: new Date(taskDetails.otpVerifiedAt),
        data: { 
          code: taskDetails.otpCode, 
          address: taskDetails.otpVerifiedAddress,
          otpVerifiedLat: taskDetails.otpVerifiedLat,
          otpVerifiedLng: taskDetails.otpVerifiedLng
        },
        updatedBy: 'Employee'
      });
    }

    // 14. Task Completed
    if (taskDetails?.completedDate || taskDetails?.completedAt) {
      const completedByName = typeof taskDetails.completedBy === 'object' && taskDetails.completedBy?.name
        ? taskDetails.completedBy.name
        : 'Employee';
      const approvedByName = typeof taskDetails.approvedBy === 'object' && taskDetails.approvedBy?.name
        ? taskDetails.approvedBy.name
        : null;
      
      // If approvedBy exists, it means admin approved the completion
      const description = approvedByName 
        ? `Completed by ${completedByName}, Approved by ${approvedByName}`
        : `Completed by ${completedByName}`;
      
      timelineEvents.push({
        id: 'completed',
        type: 'completed',
        title: approvedByName ? 'Task Completed & Approved' : 'Task Completed',
        description: description,
        icon: CheckCircle2,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        timestamp: new Date(taskDetails.completedDate || taskDetails.completedAt),
        data: { 
          completedBy: taskDetails.completedBy,
          approvedBy: taskDetails.approvedBy,
          approvedAt: taskDetails.approvedAt
        },
        updatedBy: completedByName
      });
    }

    // 15. Admin Reopen History (from tasks_restarted array) - IMPORTANT: Shows admin comments
    if (taskData?.tasks_restarted && Array.isArray(taskData.tasks_restarted) && taskData.tasks_restarted.length > 0) {
      taskData.tasks_restarted.forEach((reopen: any, idx: number) => {
        const reopenedByName = reopen.reopenedBy 
          ? (typeof reopen.reopenedBy === 'object' ? reopen.reopenedBy.name : 'Admin')
          : 'Admin';
        timelineEvents.push({
          id: `admin-reopen-${idx}`,
          type: 'admin-reopen',
          title: 'Task Reopened by Admin',
          description: reopen.reason || 'Task has been reopened by admin',
          icon: RotateCcw,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300',
          timestamp: reopen.reopenedAt ? new Date(reopen.reopenedAt) : undefined,
          data: { 
            reason: reopen.reason,
            reopenedBy: reopen.reopenedBy,
            reopen: reopen
          },
          updatedBy: reopenedByName
        });
      });
    }

    // 16. Exit History
    if (taskData?.task_exit && (taskData.task_exit.status || taskData.task_exit.exitReason)) {
      timelineEvents.push({
        id: 'exit',
        type: 'exit',
        title: 'Task Exited',
        description: taskData.task_exit.exitReason || 'Task exited',
        icon: LogOut,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        timestamp: taskData.task_exit.exitedAt ? new Date(taskData.task_exit.exitedAt) : undefined,
        data: { exit: taskData.task_exit },
        updatedBy: 'Employee'
      });
    }

    if (taskDetails?.exit && taskDetails.exit.length > 0) {
      taskDetails.exit.forEach((exit: any, idx: number) => {
        timelineEvents.push({
          id: `exit-${idx}`,
          type: 'exit',
          title: 'Task Exited',
          description: exit.exitReason || 'Task exited',
          icon: LogOut,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-300',
          timestamp: exit.exitedAt ? new Date(exit.exitedAt) : undefined,
          data: { exit },
          updatedBy: 'Employee'
        });
      });
    }

    // 17. Restart History
    if (taskDetails?.restarted && taskDetails.restarted.length > 0) {
      taskDetails.restarted.forEach((restart: any, idx: number) => {
        timelineEvents.push({
          id: `restart-${idx}`,
          type: 'restart',
          title: 'Task Restarted',
          description: restart.restartLocation?.address || 'Task restarted',
          icon: PlayCircle,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
          timestamp: restart.restartedAt ? new Date(restart.restartedAt) : undefined,
          data: { restart },
          updatedBy: 'Employee'
        });
      });
    }

    // Sort timeline events by timestamp
    timelineEvents.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Task Details Timeline
            {taskData && (
              <span className="text-sm font-normal text-muted-foreground">
                - {taskData.taskId}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            View all task updates and activities in chronological order
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading task details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Failed to load task details</p>
            </div>
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No timeline events available</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Timeline events */}
              <div className="space-y-6">
                {timelineEvents.map((event, index) => {
                  const Icon = event.icon;
                  return (
                    <div key={event.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${event.bgColor} ${event.borderColor} border-2`}>
                        <Icon className={`w-5 h-5 ${event.iconColor}`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className={`p-4 rounded-lg border ${event.borderColor} ${event.bgColor}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{event.title}</h4>
                                {event.updatedBy && (
                                  <Badge variant="outline" className="text-xs">
                                    by {event.updatedBy}
                                  </Badge>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                              )}
                              
                              {/* Admin Reopen Comment - Highlighted */}
                              {event.type === 'admin-reopen' && event.data?.reason && (
                                <div className="mt-2 p-3 bg-white/70 rounded border-2 border-orange-300">
                                  <p className="text-xs font-semibold text-orange-800 mb-1">Admin Comment:</p>
                                  <p className="text-sm text-orange-900 font-medium">{event.data.reason}</p>
                                </div>
                              )}
                              
                              {/* Additional data display */}
                              {event.data && (
                                <div className="mt-2 space-y-1">
                                  {event.data.location && (
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                      <MapPin className="w-3 h-3 mt-0.5" />
                                      <span>{event.data.location.address || event.data.location.fullAddress || 'Location recorded'}</span>
                                    </div>
                                  )}
                                  {event.data.photo && (
                                    <div className="mt-2">
                                      <img 
                                        src={event.data.photo} 
                                        alt="Photo proof" 
                                        className="w-full max-w-xs h-auto rounded border"
                                      />
                                    </div>
                                  )}
                                  {event.data.segment && (
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Navigation className="w-3 h-3" />
                                        <span>Distance: {event.data.segment.distanceKm?.toFixed(2) || 0} km</span>
                                      </div>
                                      {event.data.durationSegment && (
                                        <div className="flex items-center gap-1">
                                          <Timer className="w-3 h-3" />
                                          <span>Duration: {Math.round(event.data.durationSegment.durationSeconds / 60)} min</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {event.type === 'completed' && event.data?.completedBy && (
                                    <div className="space-y-2 text-xs">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-3 h-3" />
                                        <span>
                                          Completed by: {
                                            typeof event.data.completedBy === 'object' && event.data.completedBy?.name
                                              ? `${event.data.completedBy.name}${event.data.completedBy.employeeId ? ` (${event.data.completedBy.employeeId})` : ''}`
                                              : 'Employee'
                                          }
                                        </span>
                                      </div>
                                      {event.data.approvedBy && (
                                        <div className="flex items-center gap-2 text-green-700 font-medium">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>
                                            Approved by: {
                                              typeof event.data.approvedBy === 'object' && event.data.approvedBy?.name
                                                ? event.data.approvedBy.name
                                                : 'Admin'
                                            }
                                          </span>
                                          {event.data.approvedAt && (
                                            <span className="text-muted-foreground ml-2">
                                              ({dayjs(event.data.approvedAt).format("DD MMM YYYY, hh:mm A")})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Timestamp */}
                            {event.timestamp && (
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {dayjs(event.timestamp).format("DD MMM YYYY, hh:mm A")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeTasks;
