import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ClipboardList, BarChart3, Search, Download, Package, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useGetFormResponsesQuery, useSubmitFormResponseMutation } from "@/store/api/formApi";
import { useGetFormTemplatesQuery } from "@/store/api/formApi";
import { useGetTasksQuery } from "@/store/api/taskApi";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const { RangePicker } = DatePicker;

const FormResponses = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [submitFormResponse] = useSubmitFormResponseMutation();

  // Fetch responses - Always fetch all responses, filter on frontend
  // Only apply date filter if both dates are selected
  const { data: responsesData, isLoading: isLoadingResponses, error, refetch } = useGetFormResponsesQuery({
    startDate: dateRange[0] && dateRange[1] ? dateRange[0].format("YYYY-MM-DD") : undefined,
    endDate: dateRange[0] && dateRange[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
    limit: 10000, // Fetch all records
  });

  const handleSubmitForm = async (responseId: string) => {
    try {
      await submitFormResponse(responseId).unwrap();
      toast({
        title: "Success",
        description: "Form has been submitted successfully",
      });
      // Refetch responses to update the UI
      await refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to submit form",
        variant: "destructive",
      });
    }
  };

  // Fetch templates
  const { data: templatesData } = useGetFormTemplatesQuery();
  const templates = templatesData?.data?.templates || [];

  // Get selected template data
  const selectedTemplateData = useMemo(() => {
    if (selectedTemplate === "all") return null;
    return templates.find((t) => String(t._id) === String(selectedTemplate));
  }, [selectedTemplate, templates]);

  // Get assigned staff IDs from selected template
  const assignedStaffIds = useMemo(() => {
    if (!selectedTemplateData || !selectedTemplateData.assignedTo) return [];
    return selectedTemplateData.assignedTo.map((staff: any) =>
      typeof staff === "string" ? String(staff) : String(staff._id || staff)
    );
  }, [selectedTemplateData]);

  // Fetch all tasks (we'll filter by assigned staff on frontend)
  const { data: tasksData, isLoading: isLoadingTasks } = useGetTasksQuery({
    startDate: dateRange[0] && dateRange[1] ? dateRange[0].format("YYYY-MM-DD") : undefined,
    endDate: dateRange[0] && dateRange[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
    limit: 10000,
  });

  // Filter tasks based on selected template's assigned staff
  const tasks = useMemo(() => {
    const allTasks = tasksData?.data?.tasks || [];
    
    if (selectedTemplate === "all") {
      return allTasks;
    }
    
    // If template has assigned staff, filter tasks by those staff
    if (assignedStaffIds.length > 0) {
      return allTasks.filter((task: any) => {
        if (!task) return false;
        const taskStaffId = typeof task.assignedTo === "object" && task.assignedTo
          ? String(task.assignedTo._id || task.assignedTo)
          : String(task.assignedTo);
        return assignedStaffIds.some((id: string) => String(id) === String(taskStaffId));
      });
    }
    
    // If template has no assigned staff, return empty array
    return [];
  }, [tasksData, selectedTemplate, assignedStaffIds]);

  const allResponses = responsesData?.data?.responses || [];
  const isLoading = isLoadingResponses || isLoadingTasks;

  // Get dynamic columns based on selected template
  const dynamicColumns = useMemo(() => {
    if (selectedTemplate === "all") {
      // When "All Forms" is selected, get all unique field names from all templates
      // But maintain order from templates
      const allFields = new Map<string, number>(); // Map to track field names and their minimum order
      templates.forEach((template) => {
        template.fields.forEach((field) => {
          if (!allFields.has(field.name)) {
            allFields.set(field.name, field.order || 0);
          } else {
            // Keep the minimum order
            const currentOrder = allFields.get(field.name) || 0;
            allFields.set(field.name, Math.min(currentOrder, field.order || 0));
          }
        });
      });
      // Sort by order and return field names
      return Array.from(allFields.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([fieldName]) => fieldName);
    } else {
      // When a specific template is selected, show only that template's fields in order
      const template = templates.find((t) => String(t._id) === String(selectedTemplate));
      if (template) {
        // Create a copy of fields array before sorting to avoid read-only error
        const fieldsCopy = [...template.fields];
        // Sort fields by order and return field names
        return fieldsCopy
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((field) => field.name);
      }
      return [];
    }
  }, [selectedTemplate, templates]);

  // Create combined data from tasks and responses
  const combinedData = useMemo(() => {
    // Create a map of taskId -> form response
    const responseMap = new Map<string, any>();
    allResponses.forEach((response: any) => {
      if (!response) return;
      const taskId = typeof response.taskId === "object" && response.taskId
        ? response.taskId._id 
        : response.taskId;
      if (taskId) {
        responseMap.set(String(taskId), response);
      }
    });

    // Combine tasks with their responses
    const combined = tasks
      .filter((task: any) => task && task._id) // Filter out null/undefined tasks
      .map((task: any) => {
        const taskId = task._id;
        const response = responseMap.get(String(taskId));
        
        return {
          _id: response?._id || task._id, // Use response ID if available, otherwise task ID
          taskId: task,
          staffId: task.assignedTo,
          customerId: task.customerId,
          responses: response?.responses || {},
          templateId: response?.templateId || (selectedTemplate !== "all" ? selectedTemplate : null),
          createdAt: response?.createdAt || task.assignedDate,
          isSubmitted: response?.isSubmitted || false, // Include submission status
          submittedAt: response?.submittedAt || null, // Include submission date
          hasResponse: !!response,
        };
      });

    // Also include responses that don't have matching tasks
    allResponses.forEach((response: any) => {
      if (!response) return;
      const taskId = typeof response.taskId === "object" && response.taskId
        ? response.taskId._id 
        : response.taskId;
      if (!tasks.find((t: any) => t && t._id && String(t._id) === String(taskId))) {
        combined.push({
          _id: response._id,
          taskId: response.taskId,
          staffId: response.staffId,
          customerId: typeof response.taskId === "object" && response.taskId?.customerId
            ? response.taskId.customerId
            : null,
          responses: response.responses || {},
          templateId: response.templateId,
          createdAt: response.createdAt,
          isSubmitted: response.isSubmitted || false, // Include submission status
          submittedAt: response.submittedAt || null, // Include submission date
          hasResponse: true,
        });
      }
    });

    return combined;
  }, [tasks, allResponses, selectedTemplate]);

  // Filter combined data based on template selection, assigned staff, search, and date range
  const filteredResponses = useMemo(() => {
    let filtered = [...combinedData];

    // Filter by selected template if not "all"
    if (selectedTemplate !== "all") {
      filtered = filtered.filter((item: any) => {
        if (!item) return false;
        const itemTemplateId = typeof item.templateId === "object" && item.templateId
          ? String(item.templateId._id || item.templateId)
          : String(item.templateId);
        // Include items with matching template OR items without responses (tasks that should have forms)
        return itemTemplateId === String(selectedTemplate) || !item.hasResponse;
      });

      // Filter by staff assigned to the template (only if template has assigned staff)
      if (assignedStaffIds.length > 0) {
        filtered = filtered.filter((item: any) => {
          if (!item) return false;
          const itemStaffId = typeof item.staffId === "object" && item.staffId
            ? String(item.staffId._id || item.staffId)
            : String(item.staffId);
          return assignedStaffIds.some((assignedId: string) => String(assignedId) === String(itemStaffId));
        });
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) => {
        const staffName = typeof item.staffId === "object" ? item.staffId?.name?.toLowerCase() || "" : "";
        const taskId = typeof item.taskId === "object" ? item.taskId?.taskId?.toLowerCase() : "";
        const customerName = typeof item.customerId === "object" 
          ? item.customerId?.customerName?.toLowerCase() || ""
          : "";
        return staffName.includes(query) || taskId.includes(query) || customerName.includes(query);
      });
    }

    return filtered;
  }, [combinedData, searchQuery, selectedTemplate, assignedStaffIds]);

  const handleDownload = () => {
    if (filteredResponses.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to download",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const headers = ["Name", "Task ID", "Address", "Client Name", "Company Name", "Company Number"];
    
    // Use dynamic columns for field headers
    headers.push(...dynamicColumns);
    headers.push("Task created on", "Form created at");

    const rows = filteredResponses.map((item: any) => {
      const staffName = typeof item.staffId === "object" ? item.staffId.name : "Unknown";
      const task = typeof item.taskId === "object" ? item.taskId : null;
      const taskId = task?.taskId || "Unknown";
      const customer = item.customerId || (task?.customerId || null);
      const address = customer?.address || "-";
      const clientName = customer?.customerName || "-";
      const companyName = customer?.companyName || customer?.customFields?.companyName || customer?.customFields?.CompanyName || "-";
      const companyNumber = customer?.customerNumber || customer?.customFields?.companyNumber || customer?.customFields?.CompanyNumber || "-";
      const taskCreatedOn = task?.assignedDate
        ? format(new Date(task.assignedDate), "dd MMM yyyy")
        : "-";
      const formCreatedAt = item.createdAt
        ? format(new Date(item.createdAt), "dd MMM yyyy HH:mm")
        : "-";

      const row = [staffName, taskId, address, clientName, companyName, companyNumber];
      dynamicColumns.forEach(field => {
        const value = item.responses?.[field];
        row.push(value !== undefined && value !== null ? String(value) : "");
      });
      row.push(taskCreatedOn, formCreatedAt);
      return row;
    });

    // Create CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Form_Responses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your responses download has been initiated",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forms</h1>
            <p className="text-muted-foreground mt-1">See form responses of forms filled by staff while completing a task</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="responses" className="w-full">
            <TabsList>
              <TabsTrigger value="responses" asChild>
                <Link to="/hrms-geo/forms/responses">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Responses
                </Link>
              </TabsTrigger>
              <TabsTrigger value="templates" asChild>
                <Link to="/hrms-geo/forms/templates">
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Link>
              </TabsTrigger>
              <TabsTrigger value="reports" asChild>
                <Link to="/hrms-geo/forms/reports">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="responses" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Responses</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        View form submissions collected during task execution
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search by staff name or task ID"
                          className="pl-10 w-[250px]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setDateRange([dates[0], dates[1]]);
                          } else {
                            setDateRange([null, null]);
                          }
                        }}
                        format="DD MMM YYYY"
                        className="w-[250px]"
                        placeholder={["Start Date", "End Date"]}
                        allowClear
                      />
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select Form" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Forms</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template._id} value={template._id}>
                              {template.templateName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-red-500">Error Loading Data</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {(error as any)?.data?.error?.message || "Failed to load form responses"}
                        </p>
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading responses...</div>
                  ) : filteredResponses.length === 0 && tasks.length === 0 && allResponses.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No Data</p>
                        <p className="text-sm text-muted-foreground mt-2">No tasks or form responses found</p>
                      </div>
                    </div>
                  ) : filteredResponses.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-muted-foreground">No Data</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          No tasks or form responses found for the selected filters
                          {(tasks.length > 0 || allResponses.length > 0) && (
                            <span className="block mt-1 text-xs">
                              ({tasks.length} task{tasks.length !== 1 ? 's' : ''}, {allResponses.length} response{allResponses.length !== 1 ? 's' : ''} available)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm font-medium">Name</th>
                            <th className="text-left p-3 text-sm font-medium">Task ID</th>
                            <th className="text-left p-3 text-sm font-medium">Address</th>
                            <th className="text-left p-3 text-sm font-medium">Client Name</th>
                            <th className="text-left p-3 text-sm font-medium">Company Name</th>
                            <th className="text-left p-3 text-sm font-medium">Company Number</th>
                            {dynamicColumns.map((column) => (
                              <th key={column} className="text-left p-3 text-sm font-medium">
                                {column}
                              </th>
                            ))}
                            <th className="text-left p-3 text-sm font-medium">Task created on</th>
                            <th className="text-left p-3 text-sm font-medium">Form created at</th>
                            <th className="text-left p-3 text-sm font-medium">Form Submitted On</th>
                            <th className="text-left p-3 text-sm font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResponses.map((item: any) => {
                            const staffName = typeof item.staffId === "object" ? item.staffId.name : "Unknown";
                            const task = typeof item.taskId === "object" ? item.taskId : null;
                            const taskId = task?.taskId || "Unknown";
                            const customer = item.customerId || (task?.customerId || null);
                            const address = customer?.address || "-";
                            const clientName = customer?.customerName || "-";
                            const companyName = customer?.companyName || customer?.customFields?.companyName || customer?.customFields?.CompanyName || "-";
                            const companyNumber = customer?.customerNumber || customer?.customFields?.companyNumber || customer?.customFields?.CompanyNumber || "-";
                            const taskCreatedOn = task?.assignedDate
                              ? format(new Date(task.assignedDate), "dd MMM yyyy")
                              : "-";
                            const formCreatedAt = item.createdAt
                              ? format(new Date(item.createdAt), "dd MMM yyyy HH:mm")
                              : "-";

                            return (
                              <tr key={item._id} className="border-b hover:bg-muted/50">
                                <td className="p-3 text-sm">{staffName}</td>
                                <td className="p-3 text-sm">{taskId}</td>
                                <td className="p-3 text-sm">{address}</td>
                                <td className="p-3 text-sm">{clientName}</td>
                                <td className="p-3 text-sm">{companyName}</td>
                                <td className="p-3 text-sm">{companyNumber}</td>
                                {dynamicColumns.map((column) => {
                                  const value = item.responses?.[column];
                                  let displayValue = "-";
                                  
                                  if (value !== undefined && value !== null) {
                                    if (typeof value === "string" && (value.startsWith("http") || value.startsWith("data:"))) {
                                      // Image URL
                                      displayValue = (
                                        <img src={value} alt={column} className="w-16 h-16 object-cover rounded" />
                                      );
                                    } else if (Array.isArray(value)) {
                                      displayValue = value.join(", ");
                                    } else {
                                      displayValue = String(value);
                                    }
                                  }

                                  return (
                                    <td key={column} className="p-3 text-sm">
                                      {displayValue}
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-sm">{taskCreatedOn}</td>
                                <td className="p-3 text-sm">{formCreatedAt}</td>
                                <td className="p-3 text-sm">
                                  {item.isSubmitted && item.submittedAt
                                    ? format(new Date(item.submittedAt), "dd MMM yyyy HH:mm")
                                    : "-"}
                                </td>
                                <td className="p-3">
                                  {item.hasResponse && !item.isSubmitted ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSubmitForm(item._id)}
                                      className="flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      Submit
                                    </Button>
                                  ) : item.hasResponse && item.isSubmitted ? (
                                    <span className="text-sm text-green-600 flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Submitted
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default FormResponses;
