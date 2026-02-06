import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, ClipboardList, BarChart3, FileCheck, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useGetFormResponsesQuery } from "@/store/api/formApi";
import { useGetFormTemplatesQuery } from "@/store/api/formApi";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const FormReports = () => {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch staff list
  const { data: staffData } = useGetStaffQuery({ limit: 1000, status: "Active" });
  const staffList = staffData?.data?.staff || [];

  // Fetch templates to get field names
  const { data: templatesData } = useGetFormTemplatesQuery();
  const templates = templatesData?.data?.templates || [];

  // Fetch responses based on filters (only when modal is open and we have both filters)
  const shouldFetch = isModalOpen && selectedDate && selectedStaff;
  const { data: responsesData, refetch: refetchResponses, isLoading: isLoadingResponses } = useGetFormResponsesQuery(
    {
      staffId: selectedStaff || undefined,
      startDate: selectedDate ? selectedDate.format("YYYY-MM-DD") : undefined,
      endDate: selectedDate ? selectedDate.format("YYYY-MM-DD") : undefined, // Same date for start and end
      limit: 10000,
    },
    { skip: !shouldFetch }
  );

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedStaff("");
    setSelectedDate(null);
  };

  const handleDownload = async () => {
    if (!selectedDate) {
      toast({
        title: "Validation Error",
        description: "Date is required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStaff) {
      toast({
        title: "Validation Error",
        description: "Please select a staff member",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      // Always refetch to ensure we have the latest data with current filters
      const result = await refetchResponses();
      const responses = result.data?.data?.responses || [];

      if (responses.length === 0) {
        const staffName = staffList.find((s: any) => s._id === selectedStaff)?.name || "selected staff";
        const dateStr = selectedDate.format("DD MMM YYYY");
        toast({
          title: "No Data",
          description: `No responses found for ${staffName} on ${dateStr}. Please check if forms were submitted on this date.`,
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      // Prepare CSV data
      const headers = ["Name", "Task ID", "Address", "Client Name", "Company Name", "Company Number"];
      
      // Get all unique field names from all templates
      const allFields = new Set<string>();
      templates.forEach((template) => {
        template.fields.forEach((field) => {
          allFields.add(field.name);
        });
      });
      const fieldHeaders = Array.from(allFields);
      headers.push(...fieldHeaders);
      headers.push("Task created on", "Form created at");

      const rows = responses.map((response: any) => {
        const staffName = typeof response.staffId === "object" ? response.staffId.name : "Unknown";
        const taskId = typeof response.taskId === "object" ? response.taskId.taskId : "Unknown";
        const task = typeof response.taskId === "object" ? response.taskId : null;
        const customer = task?.customerId || null;
        const address = customer?.address || "-";
        const clientName = customer?.customerName || "-";
        const companyName = customer?.companyName || customer?.customFields?.companyName || customer?.customFields?.CompanyName || "-";
        const companyNumber = customer?.customerNumber || customer?.customFields?.companyNumber || customer?.customFields?.CompanyNumber || "-";
        const taskCreatedOn = task?.assignedDate
          ? format(new Date(task.assignedDate), "dd MMM yyyy")
          : "-";
        const formCreatedAt = response.createdAt
          ? format(new Date(response.createdAt), "dd MMM yyyy HH:mm")
          : "-";

        const row = [staffName, taskId, address, clientName, companyName, companyNumber];
        fieldHeaders.forEach(field => {
          const value = response.responses?.[field];
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

      // Get selected staff name for filename
      const selectedStaffObj = staffList.find((s: any) => s._id === selectedStaff);
      const staffName = selectedStaffObj?.name || "Staff";
      const dateStr = selectedDate 
        ? selectedDate.format("YYYY-MM-DD")
        : new Date().toISOString().split('T')[0];

      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Form_Details_${staffName}_${dateStr}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Report for ${staffName} has been downloaded`,
      });
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to download report",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
            <p className="text-muted-foreground mt-1">Generate compliance reports and audit trail documentation</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="reports" className="w-full">
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

            <TabsContent value="reports" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Reports</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Form Details Report - Shows details of forms filled by employees during task completion
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={handleOpenModal}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Form Details</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          See the details of forms filled by employees while completing tasks
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Form Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Form Details</DialogTitle>
            <DialogDescription>
              Select staff and date to download the report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff">
                Staff <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger id="staff" className="w-full">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff: any) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {staff.name} {staff.employeeId ? `(${staff.employeeId})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                id="date"
                value={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                }}
                format="DD MMM YYYY"
                className="w-full"
                placeholder="Select date"
                allowClear
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDownload}
              disabled={!selectedDate || !selectedStaff || isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormReports;
