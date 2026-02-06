import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, List, Plus, BarChart3, Settings, Search, Download, Calendar, RotateCcw, CheckCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useGetTasksQuery, taskApi, useGenerateTaskOTPMutation, useVerifyTaskOTPMutation } from "@/store/api/taskApi";
import { useReopenTaskMutation, useApproveTaskCompletionMutation, useRejectTaskCompletionMutation } from "@/store/api/taskApi";
import { useGetTaskSettingsQuery } from "@/store/api/settingsApi";
import { useAppDispatch } from "@/store/hooks";
import { DatePicker, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const { RangePicker } = DatePicker;

const TasksList = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [isExporting, setIsExporting] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenTask] = useReopenTaskMutation();
  const [approveTaskCompletion] = useApproveTaskCompletionMutation();
  const [rejectTaskCompletion] = useRejectTaskCompletionMutation();
  const [generateTaskOTP] = useGenerateTaskOTPMutation();
  const [verifyTaskOTP] = useVerifyTaskOTPMutation();
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [pendingApprovalTask, setPendingApprovalTask] = useState<any>(null);
  const pageSize = 10;

  // Fetch task settings to check OTP verification
  const { data: taskSettingsData } = useGetTaskSettingsQuery();
  const taskSettings = taskSettingsData?.data?.settings || {
    autoApprove: false,
    requireApprovalOnComplete: false,
    enableOtpVerification: false,
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tasks
  const { data: tasksData, isLoading, refetch } = useGetTasksQuery({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    startDate: dateRange[0]?.format('YYYY-MM-DD'),
    endDate: dateRange[1]?.format('YYYY-MM-DD'),
    page: currentPage,
    limit: pageSize,
  });

  // Refetch tasks periodically to get updates from employee side
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000); // Refetch every 5 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  const tasks = tasksData?.data?.tasks || [];
  const pagination = tasksData?.data?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    pages: 0,
  };

  // Debug: Log tasks with pending completion (remove after testing)
  useEffect(() => {
    const pendingTasks = tasks.filter(t => t.status === "Pending" || t.customFields?.pendingCompletion);
    if (pendingTasks.length > 0) {
      console.log("Tasks with pending completion:", pendingTasks.map(t => ({
        id: t._id,
        status: t.status,
        pendingCompletion: t.customFields?.pendingCompletion,
        customFields: t.customFields
      })));
    }
  }, [tasks]);


  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return dayjs(dateStr).format("DD MMM YYYY");
  };

  // Get status badge variant
  const getStatusBadge = (task: any) => {
    // Check if task has pending completion (waiting for admin approval)
    if (task.customFields?.pendingCompletion === true) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
    
    const status = task.status || task;
    // Normalize status to handle both correct enum values and incorrect lowercase/underscore values
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase().replace(/_/g, ' ') : status;
    
    switch (normalizedStatus) {
      case "not yet started":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Not yet Started</Badge>;
      case "in progress":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In progress</Badge>;
      case "delayed tasks":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Delayed</Badge>;
      case "completed tasks":
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case "serving today":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Serving Today</Badge>;
      case "reopened":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Reopened</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      case "exited":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Exited</Badge>;
      case "hold":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Hold</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  // Get customer name
  const getCustomerName = (task: any) => {
    if (typeof task.customerId === 'object' && task.customerId?.customerName) {
      return task.customerId.customerName;
    }
    return "Unknown";
  };

  // Get staff name
  const getStaffName = (task: any) => {
    if (typeof task.assignedTo === 'object' && task.assignedTo?.name) {
      return task.assignedTo.name;
    }
    return "Not Assigned";
  };

  // Handle reopen task
  const handleReopen = (task: any) => {
    setSelectedTask(task);
    setReopenModalOpen(true);
  };

  // Handle approve task completion with OTP check
  const handleApproveTaskCompletion = async (task: any) => {
    // Check if OTP verification is enabled and if OTP is not verified
    if (taskSettings.enableOtpVerification && !task.customFields?.otpVerified) {
      // OTP verification is required
      setPendingApprovalTask(task);
      setOtpModalOpen(true);
      // Generate OTP first
      try {
        await generateTaskOTP(task._id).unwrap();
        toast({
          title: "OTP Sent",
          description: "OTP has been sent to customer's email. Please verify OTP to approve task completion.",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.data?.error?.message || "Failed to generate OTP",
          variant: "destructive",
        });
      }
      return;
    }

    // If OTP is not required or already verified, approve directly
    try {
      await approveTaskCompletion(task._id).unwrap();
      toast({
        title: "Task Approved",
        description: "Task completion has been approved",
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

  // Handle OTP verification and approve
  const handleOTPSubmit = async () => {
    if (!otpInput.trim()) {
      message.error("Please enter OTP");
      return;
    }

    if (!pendingApprovalTask) return;

    try {
      // Verify OTP
      await verifyTaskOTP({ id: pendingApprovalTask._id, otp: otpInput }).unwrap();
      
      // After OTP verification, approve the task
      await approveTaskCompletion(pendingApprovalTask._id).unwrap();
      
      toast({
        title: "Task Approved",
        description: "OTP verified and task completion has been approved",
      });
      setOtpModalOpen(false);
      setOtpInput("");
      setPendingApprovalTask(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "OTP Verification Failed",
        description: error?.data?.error?.message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReopenSubmit = async () => {
    if (!reopenReason.trim()) {
      message.error("Please provide a reason for reopening");
      return;
    }

    if (!selectedTask) return;

    try {
      await reopenTask({ id: selectedTask._id, reason: reopenReason }).unwrap();
      toast({
        title: "Task Reopened",
        description: "Task has been reopened successfully",
      });
      setReopenModalOpen(false);
      setReopenReason("");
      setSelectedTask(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to reopen task",
        variant: "destructive",
      });
    }
  };

  // Export to Excel
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Fetch all tasks matching current filters for export
      const result = await dispatch(
        taskApi.endpoints.getTasks.initiate({
          search: debouncedSearch || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          startDate: dateRange[0]?.format('YYYY-MM-DD'),
          endDate: dateRange[1]?.format('YYYY-MM-DD'),
          page: 1,
          limit: 10000, // Get all tasks
        })
      ).unwrap();

      const allTasks = result?.data?.tasks || tasks;

      // Prepare Excel data
      const excelData = allTasks.map((task) => ({
        'Task ID': task.taskId || `TASK-${task._id.substring(0, 8).toUpperCase()}`,
        'Task Title': task.taskTitle || "Unknown",
        'Customer Name': typeof task.customerId === 'object' ? (task.customerId.customerName || "Unknown") : "Unknown",
        'Customer Number': typeof task.customerId === 'object' ? (task.customerId.customerNumber || "") : "",
        'Assigned Staff': getStaffName(task),
        'Status': task.status || "Unknown",
        'Earliest Completion Date': formatDate(task.earliestCompletionDate),
        'Latest Completion Date': formatDate(task.latestCompletionDate),
        'Actual Start Date': formatDate(task.assignedDate),
        'Task Completion Date': formatDate(task.completedDate),
        'Email': typeof task.customerId === 'object' ? (task.customerId.emailId || "") : "",
        'Address': task.address || "",
        'City': task.city || "",
        'Pincode': task.pincode || "",
        'Phone': task.phone || "",
      }));

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks_export_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Tasks data has been exported to Excel successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error?.message || "Failed to export tasks data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks List</h1>
            <p className="text-muted-foreground mt-1">Access Tasks completed by your staff here</p>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/tasks/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/tasks/list">Tasks List</Link>
              </TabsTrigger>
              <TabsTrigger value="assign" asChild>
                <Link to="/hrms-geo/tasks/assign">Assign Task</Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/tasks/settings">Task Settings</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tasks List</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input 
                          placeholder="Search" 
                          className={`pl-10 ${searchQuery ? "pr-10" : ""} w-[200px]`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        )}
                      </div>
                      <RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                          if (dates) {
                            setDateRange(dates);
                          } else {
                            setDateRange([null, null]);
                          }
                        }}
                        format="DD MMM YY"
                        className="w-[250px]"
                        allowClear
                      />
                      <Button onClick={handleExport} disabled={isExporting}>
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? "Exporting..." : "Export"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                      <TabsList>
                        <TabsTrigger value="all">All Tasks</TabsTrigger>
                        <TabsTrigger value="Not yet Started">Not yet Started</TabsTrigger>
                        <TabsTrigger value="In progress">In progress</TabsTrigger>
                        <TabsTrigger value="Pending">Pending</TabsTrigger>
                        <TabsTrigger value="Completed Tasks">Completed</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Task ID</th>
                            <th className="text-left p-3 text-sm font-medium">Status</th>
                            <th className="text-left p-3 text-sm font-medium">Earliest Completion Date</th>
                            <th className="text-left p-3 text-sm font-medium">Latest Completion Date</th>
                            <th className="text-left p-3 text-sm font-medium">Actual Start Date</th>
                            <th className="text-left p-3 text-sm font-medium">Task Completion Date</th>
                            <th className="text-left p-3 text-sm font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoading ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <p className="text-muted-foreground">Loading tasks...</p>
                                </div>
                              </td>
                            </tr>
                          ) : tasks.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-8 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <ClipboardCheck className="w-16 h-16 text-muted-foreground mb-4" />
                                  <p className="text-lg font-medium text-muted-foreground">No Tasks Found</p>
                                  <p className="text-sm text-muted-foreground mt-2">No tasks match your search criteria</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            tasks.map((task) => (
                              <tr key={task._id} className="border-b hover:bg-muted/50">
                                <td className="p-3">
                                  <div className="font-medium">{getCustomerName(task)}</div>
                                </td>
                                <td className="p-3 text-sm font-mono whitespace-nowrap">{task.taskId || `TASK-${task._id.substring(0, 8).toUpperCase()}`}</td>
                                <td className="p-3 whitespace-nowrap">{getStatusBadge(task)}</td>
                                <td className="p-3 text-sm whitespace-nowrap">{formatDate(task.assignedDate)}</td>
                                <td className="p-3 text-sm">{formatDate(task.expectedCompletionDate)}</td>
                                <td className="p-3 text-sm">{formatDate(task.assignedDate)}</td>
                                <td className="p-3 text-sm">{formatDate(task.completedDate)}</td>
                                <td className="p-3">
                                  {/* Approve/Reject completion buttons - shown when task has pending completion */}
                                  {/* Show buttons if task has pendingCompletion flag (when requireApprovalOnComplete is ON) */}
                                  {/* Debug: Uncomment to check task data */}
                                  {/* Show buttons if task has pendingCompletion flag (when requireApprovalOnComplete is ON) */}
                                  {(task.status === "Pending" || task.status?.toLowerCase() === "pending") && task.customFields?.pendingCompletion === true && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveTaskCompletion(task)}
                                        className="gap-2 bg-green-600 hover:bg-green-700 mr-2"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            await rejectTaskCompletion({ id: task._id }).unwrap();
                                            toast({
                                              title: "Task Rejected",
                                              description: "Task completion has been rejected. Status changed to In progress.",
                                            });
                                            refetch();
                                          } catch (error: any) {
                                            toast({
                                              title: "Error",
                                              description: error?.data?.error?.message || "Failed to reject task",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                        className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                                      >
                                        <X className="w-4 h-4" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {/* Reopen button - shown for completed, rejected, or exited tasks */}
                                  {((task.status === "Completed Tasks" || task.status?.toLowerCase() === "completed" || 
                                     task.status === "Rejected" || task.status?.toLowerCase() === "rejected" ||
                                     task.status === "Exited" || task.status?.toLowerCase() === "exited")) && 
                                   !task.customFields?.pendingCompletion && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleReopen(task)}
                                      className="gap-2"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                      Reopen
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Reopen Task Modal */}
                    <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reopen Task</DialogTitle>
                          <DialogDescription>
                            Provide a reason for reopening this task. The employee will be notified.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Reopening *</Label>
                            <Textarea
                              id="reason"
                              value={reopenReason}
                              onChange={(e) => setReopenReason(e.target.value)}
                              placeholder="Enter the reason for reopening this task..."
                              rows={4}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {
                            setReopenModalOpen(false);
                            setReopenReason("");
                            setSelectedTask(null);
                          }}>
                            Cancel
                          </Button>
                          <Button onClick={handleReopenSubmit}>
                            Reopen Task
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* OTP Verification Modal */}
                    <Dialog open={otpModalOpen} onOpenChange={setOtpModalOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Verify OTP</DialogTitle>
                          <DialogDescription>
                            OTP verification is required to approve this task completion. Please enter the OTP sent to the customer's email.
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
                            setPendingApprovalTask(null);
                          }}>
                            Cancel
                          </Button>
                          <Button onClick={handleOTPSubmit}>
                            Verify & Approve
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {pagination.pages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} tasks
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={currentPage === pagination.pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TasksList;
