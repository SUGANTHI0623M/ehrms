import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Play, Pause, CheckCircle, RotateCcw, AlertCircle, FileText } from "lucide-react";
import { useGetTasksQuery } from "@/store/api/taskApi";
import { useGetEmployeeProfileQuery } from "@/store/api/employeeApi";
import { useGetFormTemplatesQuery, useGetFormResponsesQuery, useCreateFormResponseMutation } from "@/store/api/formApi";
import { useUpdateTaskStatusMutation, useApproveTaskMutation, useRejectTaskMutation, useGenerateTaskOTPMutation, useVerifyTaskOTPMutation } from "@/store/api/taskApi";
import { useGetTaskSettingsQuery } from "@/store/api/settingsApi";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/hooks/use-toast";
import { message } from "antd";
import dayjs from "dayjs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

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

  // Get employee's staff record to get staff ID
  const { data: employeeProfile } = useGetEmployeeProfileQuery(undefined, {
    skip: !currentUser?.id
  });
  const staffId = employeeProfile?.data?.staffData?._id;

  // Fetch tasks assigned to current employee
  const { data: tasksData, isLoading, refetch } = useGetTasksQuery({
    staffId: staffId, // Filter by current employee's staff ID
    page: 1,
    limit: 100,
  }, {
    skip: !staffId
  });

  const employeeTasks = tasksData?.data?.tasks || [];

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

  // Fetch existing form responses for tasks
  const { data: responsesData } = useGetFormResponsesQuery({
    staffId: staffId || undefined,
    limit: 10000,
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

  // Check if task has assigned forms
  const getTaskForms = (task: any) => {
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

  const handleOpenFormModal = (task: any, template: any) => {
    setSelectedTask(task);
    setSelectedFormTemplate(template);
    setFormData({});
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
      refetch();
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

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading tasks...</p>
            </CardContent>
          </Card>
        ) : employeeTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No Tasks Assigned</p>
              <p className="text-sm text-muted-foreground mt-2">You don't have any tasks assigned yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {employeeTasks.map((task: any) => (
              <Card key={task._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">{typeof task.customerId === 'object' ? (task.customerId.customerName || "Task") : task.taskTitle || "Task"}</CardTitle>
                        {getStatusBadge(task)}
                        <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                          {task.taskId || `TASK-${task._id.substring(0, 8).toUpperCase()}`}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Date</p>
                      <p className="text-sm font-medium">{formatDate(task.assignedDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Completion</p>
                      <p className="text-sm font-medium">{formatDate(task.expectedCompletionDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="text-sm font-medium">
                        {typeof task.customerId === 'object' && task.customerId 
                          ? (task.customerId.customerName || "-") 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer Number</p>
                      <p className="text-sm font-medium">
                        {typeof task.customerId === 'object' && task.customerId 
                          ? (task.customerId.customerNumber || "-") 
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Reopen Reason - Display when task is reopened by admin */}
                  {task.status === "Reopened" && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-orange-800 mb-1">Reopened by Admin</p>
                          {task.customFields?.reopenReason ? (
                            <p className="text-sm text-orange-700">Reason: {task.customFields.reopenReason}</p>
                          ) : (
                            <p className="text-sm text-orange-700">This task has been reopened by admin</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forms Section */}
                  {getTaskForms(task).length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-800 mb-2">Forms</p>
                      <div className="flex flex-wrap gap-2">
                        {getTaskForms(task).map((template: any) => {
                          const hasResponse = hasFormResponse(task._id, template._id);
                          return (
                            <Button
                              key={template._id}
                              size="sm"
                              variant={hasResponse ? "outline" : "default"}
                              onClick={() => handleOpenFormModal(task, template)}
                              className="gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              {template.templateName}
                              {hasResponse && (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {/* Approve/Reject buttons - shown when task is Pending and autoApprove is off */}
                    {canApproveTask(task) && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApproveTask(task)}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectTask(task)}
                          className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Start Task button - shown after approval or if autoApprove is on */}
                    {canStartTask(task) && (
                      <Button
                        size="sm"
                        onClick={() => handleStartTask(task)}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Task
                      </Button>
                    )}
                    
                    {/* Status Update Options - shown when task is in progress */}
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
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In progress">In Progress</SelectItem>
                          <SelectItem value="Hold">Hold</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Resume button - shown when task is on hold */}
                    {canResumeTask(task) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(task, "In progress")}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </Button>
                    )}

                    {/* Reopen button removed - only admin can reopen tasks */}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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

      {/* Form Filling Modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFormTemplate?.templateName || "Fill Form"}
            </DialogTitle>
            <DialogDescription>
              Fill in the required information for this form
            </DialogDescription>
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
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForm}>
              Submit Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default EmployeeTasks;
