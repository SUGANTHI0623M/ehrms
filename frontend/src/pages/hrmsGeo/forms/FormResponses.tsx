import { useState, useMemo, useEffect, useRef, ReactNode } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  ClipboardList,
  BarChart3,
  Search,
  Download,
  Package,
  CheckCircle2,
  X,
  Eye,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  useGetFormResponsesQuery,
  useGetFormResponseByIdQuery,
  useSubmitFormResponseMutation,
} from "@/store/api/formApi";
import { useGetFormTemplatesQuery } from "@/store/api/formApi";
import { useGetTasksQuery } from "@/store/api/taskApi";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const { RangePicker } = DatePicker;

const FormResponses = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewingResponseId, setViewingResponseId] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch form response details by ID when viewing
  const {
    data: responseDetailsData,
    isLoading: isLoadingResponseDetails,
    error: responseDetailsError,
  } = useGetFormResponseByIdQuery(viewingResponseId || "", {
    skip: !viewingResponseId || !isViewModalOpen,
  });

  const viewingResponse = responseDetailsData?.data?.response;

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 800); // 300ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Determine active tab from route - use precise matching
  const getActiveTab = () => {
    const path = location.pathname.split("?")[0]; // Remove query params
    const normalizedPath = path.replace(/\/$/, ""); // Remove trailing slash
    
    // Use precise path matching instead of includes() to avoid false matches
    if (normalizedPath === "/hrms-geo/forms/responses" || normalizedPath.startsWith("/hrms-geo/forms/responses/")) {
      return "responses";
    }
    if (normalizedPath === "/hrms-geo/forms/templates" || normalizedPath.startsWith("/hrms-geo/forms/templates/")) {
      return "templates";
    }
    if (normalizedPath === "/hrms-geo/forms/reports" || normalizedPath.startsWith("/hrms-geo/forms/reports/")) {
      return "reports";
    }
    // Default to responses if path doesn't match any specific tab
    return "responses";
  };
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [submitFormResponse] = useSubmitFormResponseMutation();

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, dateRange, selectedTemplate]);

  // Fetch responses with debounced search query and pagination
  const {
    data: responsesData,
    isLoading: isLoadingResponses,
    error,
    refetch,
  } = useGetFormResponsesQuery({
    startDate:
      dateRange[0] && dateRange[1]
        ? dateRange[0].format("YYYY-MM-DD")
        : undefined,
    endDate:
      dateRange[0] && dateRange[1]
        ? dateRange[1].format("YYYY-MM-DD")
        : undefined,
    search: debouncedSearchQuery.trim() || undefined, // Pass debounced search to backend
    page: currentPage,
    limit: pageSize,
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
      typeof staff === "string" ? String(staff) : String(staff._id || staff),
    );
  }, [selectedTemplateData]);

  // Fetch tasks with debounced search query and pagination
  const { data: tasksData, isLoading: isLoadingTasks } = useGetTasksQuery({
    startDate:
      dateRange[0] && dateRange[1]
        ? dateRange[0].format("YYYY-MM-DD")
        : undefined,
    endDate:
      dateRange[0] && dateRange[1]
        ? dateRange[1].format("YYYY-MM-DD")
        : undefined,
    search: debouncedSearchQuery.trim() || undefined, // Pass debounced search to backend
    page: currentPage,
    limit: pageSize,
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
        const taskStaffId =
          typeof task.assignedTo === "object" && task.assignedTo
            ? String(task.assignedTo._id || task.assignedTo)
            : String(task.assignedTo);
        return assignedStaffIds.some(
          (id: string) => String(id) === String(taskStaffId),
        );
      });
    }

    // If template has no assigned staff, return empty array
    return [];
  }, [tasksData, selectedTemplate, assignedStaffIds]);

  const allResponses = responsesData?.data?.responses || [];
  const responsesPagination = responsesData?.data?.pagination;
  const tasksPagination = tasksData?.data?.pagination;
  const isLoading = isLoadingResponses || isLoadingTasks;

  // Use responses pagination as primary (since responses are the main data)
  const pagination = responsesPagination || tasksPagination;

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
      const template = templates.find(
        (t) => String(t._id) === String(selectedTemplate),
      );
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

  // Columns for export: same as dynamicColumns but exclude Image-type fields (export data only, not image paths)
  const exportColumns = useMemo(() => {
    if (selectedTemplate === "all") {
      const allFields = new Map<string, number>();
      templates.forEach((template) => {
        template.fields.forEach((field) => {
          if (field.type === "Image") return;
          if (!allFields.has(field.name)) {
            allFields.set(field.name, field.order || 0);
          } else {
            const currentOrder = allFields.get(field.name) || 0;
            allFields.set(field.name, Math.min(currentOrder, field.order || 0));
          }
        });
      });
      return Array.from(allFields.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([fieldName]) => fieldName);
    } else {
      const template = templates.find(
        (t) => String(t._id) === String(selectedTemplate),
      );
      if (template) {
        const fieldsCopy = [...template.fields];
        return fieldsCopy
          .filter((field) => field.type !== "Image")
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
      const taskId =
        typeof response.taskId === "object" && response.taskId
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
          templateId:
            response?.templateId ||
            (selectedTemplate !== "all" ? selectedTemplate : null),
          createdAt: response?.createdAt || task.assignedDate,
          isSubmitted: response?.isSubmitted || false, // Include submission status
          submittedAt: response?.submittedAt || null, // Include submission date
          hasResponse: !!response,
        };
      });

    // Also include responses that don't have matching tasks
    allResponses.forEach((response: any) => {
      if (!response) return;
      const taskId =
        typeof response.taskId === "object" && response.taskId
          ? response.taskId._id
          : response.taskId;
      if (
        !tasks.find((t: any) => t && t._id && String(t._id) === String(taskId))
      ) {
        combined.push({
          _id: response._id,
          taskId: response.taskId,
          staffId: response.staffId,
          customerId:
            typeof response.taskId === "object" && response.taskId?.customerId
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
        const itemTemplateId =
          typeof item.templateId === "object" && item.templateId
            ? String(item.templateId._id || item.templateId)
            : String(item.templateId);
        // Include items with matching template OR items without responses (tasks that should have forms)
        return itemTemplateId === String(selectedTemplate) || !item.hasResponse;
      });

      // Filter by staff assigned to the template (only if template has assigned staff)
      if (assignedStaffIds.length > 0) {
        filtered = filtered.filter((item: any) => {
          if (!item) return false;
          const itemStaffId =
            typeof item.staffId === "object" && item.staffId
              ? String(item.staffId._id || item.staffId)
              : String(item.staffId);
          return assignedStaffIds.some(
            (assignedId: string) => String(assignedId) === String(itemStaffId),
          );
        });
      }
    }

    // Search filtering is now handled by the backend via debouncedSearchQuery parameter

    return filtered;
  }, [combinedData, selectedTemplate, assignedStaffIds]);

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
    const headers = [
      "Name",
      "Task ID",
      "Address",
      "Client Name",
      "Company Name",
      "Company Number",
    ];

    // Use export columns (excludes Image fields – data only, no image paths)
    headers.push(...exportColumns);
    headers.push("Task created on", "Form created at");

    const rows = filteredResponses.map((item: any) => {
      const staffName =
        item.staffId && typeof item.staffId === "object"
          ? item.staffId.name
          : "Unknown";
      const task = item.taskId && typeof item.taskId === "object" ? item.taskId : null;
      const taskId = task?.taskId || "Unknown";
      const customer = item.customerId || task?.customerId || null;
      const address = customer?.address || "-";
      const clientName = customer?.customerName || "-";
      const companyName =
        customer?.companyName ||
        customer?.customFields?.companyName ||
        customer?.customFields?.CompanyName ||
        "-";
      const companyNumber =
        customer?.customerNumber ||
        customer?.customFields?.companyNumber ||
        customer?.customFields?.CompanyNumber ||
        "-";
      const taskCreatedOn = task?.assignedDate
        ? format(new Date(task.assignedDate), "dd MMM yyyy")
        : "-";
      const formCreatedAt = item.createdAt
        ? format(new Date(item.createdAt), "dd MMM yyyy HH:mm")
        : "-";

      const row = [
        staffName,
        taskId,
        address,
        clientName,
        companyName,
        companyNumber,
      ];
      exportColumns.forEach((field) => {
        const value = item.responses?.[field];
        // Skip image URLs/paths: export data only
        const str = value !== undefined && value !== null ? String(value) : "";
        const isImageUrl =
          str.startsWith("http") && /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i.test(str);
        row.push(isImageUrl ? "" : str);
      });
      row.push(taskCreatedOn, formCreatedAt);
      return row;
    });

    // Create CSV with BOM so Excel opens UTF-8 correctly
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // Download: keep link and URL alive briefly so the browser can start the download
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `Form_Responses_${new Date().toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
    link.style.position = "absolute";
    document.body.appendChild(link);
    link.click();

    // Revoke and remove after a short delay so the download actually starts
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);

    toast({
      title: "Download Started",
      description: "Your responses download has been initiated",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Forms</h1>
          <p className="text-muted-foreground mt-1">
            See form responses of forms filled by staff while completing a task
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={getActiveTab()} className="w-full">
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
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Form Responses</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      View form submissions collected during task execution
                    </p>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-3 w-full xl:w-auto flex-wrap">
                    <div className="relative w-full lg:w-[250px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search..."
                        className="pl-10 w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                          onClick={() => setSearchQuery("")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
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
                        className="flex-1 sm:w-[250px]"
                        placeholder={["Start", "End"]}
                      />
                      <Select
                        value={selectedTemplate}
                        onValueChange={setSelectedTemplate}
                      >
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="All Forms" />
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
                    </div>
                    <Button
                      onClick={handleDownload}
                      className="w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Content... */}
                {error ? (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium text-red-500">
                        Error Loading Data
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {(error as any)?.data?.error?.message ||
                          "Failed to load form responses"}
                      </p>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading responses...
                  </div>
                ) : filteredResponses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">
                        No Data
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        No tasks or form responses found for the selected
                        filters
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Task ID</th>
                          <th className="text-left p-3 font-medium">Address</th>
                          <th className="text-left p-3 font-medium">
                            Client Name
                          </th>
                          <th className="text-left p-3 font-medium">
                            Company Name
                          </th>
                          <th className="text-left p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResponses.map((item: any) => {
                          const staffName =
                            item.staffId && typeof item.staffId === "object"
                              ? item.staffId.name
                              : "Unknown";
                          const task =
                            item.taskId && typeof item.taskId === "object"
                              ? item.taskId
                              : null;
                          const taskId = task?.taskId || "Unknown";
                          const customer =
                            item.customerId || task?.customerId || null;
                          const address = customer?.address || "-";
                          const clientName = customer?.customerName || "-";
                          const companyName =
                            customer?.companyName ||
                            customer?.customFields?.companyName ||
                            "-";

                          return (
                            <tr
                              key={item._id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="p-3 whitespace-nowrap">
                                {staffName}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {taskId}
                              </td>
                              <td className="p-3 max-w-[200px] truncate">
                                {address}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {clientName}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                {companyName}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {item.hasResponse ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        // Use the response ID if available, otherwise use the combined item ID
                                        const responseId = item._id;
                                        if (responseId) {
                                          setViewingResponseId(responseId);
                                          setIsViewModalOpen(true);
                                        }
                                      }}
                                      className="h-8"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8"
                                            disabled
                                          >
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>No form response available. The form has not been filled yet for this task.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {item.hasResponse && !item.isSubmitted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSubmitForm(item._id)}
                                      className="h-8"
                                    >
                                      Submit
                                    </Button>
                                  )}
                                  {item.hasResponse && item.isSubmitted && (
                                    <span className="  flex items-center gap-1">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Done
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination with page count and number buttons */}
                {pagination && (
                  <Pagination
                    page={currentPage}
                    pageSize={pageSize}
                    total={pagination.total}
                    pages={pagination.pages}
                    onPageChange={(newPage) => {
                      setCurrentPage(newPage);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    showPageSizeSelector={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Response Details Modal */}
      <Dialog 
        open={isViewModalOpen} 
        onOpenChange={(open) => {
          setIsViewModalOpen(open);
          if (!open) {
            setViewingResponseId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Response Details</DialogTitle>
          </DialogHeader>
          {isLoadingResponseDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground">Loading form response details...</p>
              </div>
            </div>
          ) : responseDetailsError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-red-500">
                  {(responseDetailsError as any)?.data?.error?.message || "Failed to load form response details"}
                </p>
              </div>
            </div>
          ) : viewingResponse ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.staffId && typeof viewingResponse.staffId === "object"
                      ? viewingResponse.staffId.name
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Employee ID</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.staffId && typeof viewingResponse.staffId === "object"
                      ? viewingResponse.staffId.employeeId || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Task ID</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object"
                      ? viewingResponse.taskId.taskId || "Unknown"
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Task Title</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object"
                      ? viewingResponse.taskId.taskTitle || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object" && viewingResponse.taskId.customerId
                      ? viewingResponse.taskId.customerId.address || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client Name</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object" && viewingResponse.taskId.customerId
                      ? viewingResponse.taskId.customerId.customerName || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object" && viewingResponse.taskId.customerId
                      ? viewingResponse.taskId.customerId.companyName || 
                        viewingResponse.taskId.customerId.customFields?.companyName || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Number</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object" && viewingResponse.taskId.customerId
                      ? viewingResponse.taskId.customerId.customerNumber || 
                        viewingResponse.taskId.customerId.customFields?.companyNumber || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object" && viewingResponse.taskId.customerId
                      ? viewingResponse.taskId.customerId.city || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pincode</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object" && viewingResponse.taskId.customerId
                      ? viewingResponse.taskId.customerId.pincode || "-"
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Task Created</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.taskId && typeof viewingResponse.taskId === "object" && viewingResponse.taskId.assignedDate
                      ? format(new Date(viewingResponse.taskId.assignedDate), "dd MMM yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Form Created</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.createdAt
                      ? format(new Date(viewingResponse.createdAt), "dd MMM yyyy HH:mm")
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                  <p className="text-sm mt-1">
                    {viewingResponse.isSubmitted && viewingResponse.submittedAt
                      ? format(new Date(viewingResponse.submittedAt), "dd MMM yyyy HH:mm")
                      : "Not Submitted"}
                  </p>
                </div>
                {viewingResponse.submittedBy && typeof viewingResponse.submittedBy === "object" && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Submitted By</label>
                    <p className="text-sm mt-1">
                      {viewingResponse.submittedBy.name || "-"}
                    </p>
                  </div>
                )}
              </div>

              {/* Form Template Info */}
              {viewingResponse.templateId && typeof viewingResponse.templateId === "object" && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Form Template</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingResponse.templateId.templateName}
                  </p>
                </div>
              )}

              {/* Form Responses */}
              {viewingResponse.responses && Object.keys(viewingResponse.responses).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Form Responses</h3>
                  <div className="space-y-4">
                    {Object.entries(viewingResponse.responses).map(([fieldName, value]) => {
                      let displayValue: string | ReactNode = "-";

                      if (value !== undefined && value !== null) {
                        if (
                          typeof value === "string" &&
                          (value.startsWith("http") || value.startsWith("data:"))
                        ) {
                          displayValue = (
                            <div className="mt-2">
                              <img
                                src={value}
                                alt={fieldName}
                                className="max-w-full h-auto max-h-64 object-contain rounded border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline hidden"
                              >
                                Open Image
                              </a>
                            </div>
                          );
                        } else if (Array.isArray(value)) {
                          displayValue = value.join(", ");
                        } else {
                          displayValue = String(value);
                        }
                      }

                      return (
                        <div key={fieldName} className="border-b pb-3">
                          <label className="text-sm font-medium text-muted-foreground">{fieldName}</label>
                          <div className="mt-1 text-sm">{displayValue}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground">No form response data available</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default FormResponses;
