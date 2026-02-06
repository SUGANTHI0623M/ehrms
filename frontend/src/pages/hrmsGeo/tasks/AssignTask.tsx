import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, List, Plus, BarChart3, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useGetCustomersQuery } from "@/store/api/customerApi";
import { useCreateTaskMutation } from "@/store/api/taskApi";
import { useGetTaskCustomFieldsQuery, TaskCustomField } from "@/store/api/settingsApi";
import { useToast } from "@/hooks/use-toast";

const AssignTask = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    staffId: "",
    customerId: "",
    taskTitle: "",
    description: "",
    earliestCompletionDate: "",
    latestCompletionDate: "",
  });
  
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch staff list
  const { data: staffData, isLoading: isLoadingStaff } = useGetStaffQuery({ 
    limit: 1000, 
    status: 'Active' 
  });
  const staffList = staffData?.data?.staff || [];

  // Fetch customers list (unassigned customers)
  const { data: customersData, isLoading: isLoadingCustomers } = useGetCustomersQuery({ 
    limit: 1000 
  });
  const customersList = customersData?.data?.customers || [];

  // Fetch task custom fields
  const { data: taskCustomFieldsResponse, isLoading: isLoadingCustomFields } = useGetTaskCustomFieldsQuery();
  const customFields = taskCustomFieldsResponse?.data?.fields || [];

  // Create task mutation
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();

  // Generate task ID preview
  const generateTaskId = () => {
    if (formData.customerId) {
      const customer = customersList.find(c => c._id === formData.customerId);
      if (customer) {
        return `TASK-${customer._id.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      }
    }
    return "TASK-XXXXXXXX-XXXX";
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFieldsData(prev => ({ ...prev, [fieldName]: value }));
    const errorKey = `custom_${fieldName}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: "" }));
    }
  };

  const renderCustomFieldInput = (field: TaskCustomField) => {
    const fieldName = field.name;
    const value = customFieldsData[fieldName] || '';
    const errorKey = `custom_${fieldName}`;
    const error = errors[errorKey];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldName}
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case 'number':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldName}
              type="number"
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case 'date':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldName}
              type="date"
              value={value}
              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case 'textarea':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={fieldName}
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case 'dropdown':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleCustomFieldChange(fieldName, val)}
            >
              <SelectTrigger className={error ? "border-red-500" : ""}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case 'boolean':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value ? 'true' : 'false'}
              onValueChange={(val) => handleCustomFieldChange(fieldName, val === 'true')}
            >
              <SelectTrigger className={error ? "border-red-500" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.staffId) {
      newErrors.staffId = "Please select a staff member";
    }
    if (!formData.customerId) {
      newErrors.customerId = "Please select a customer";
    }
    if (!formData.taskTitle.trim()) {
      newErrors.taskTitle = "Task title is required";
    }
    if (!formData.earliestCompletionDate) {
      newErrors.earliestCompletionDate = "Earliest completion date is required";
    }
    if (!formData.latestCompletionDate) {
      newErrors.latestCompletionDate = "Latest completion date is required";
    }
    if (formData.earliestCompletionDate && formData.latestCompletionDate) {
      if (new Date(formData.earliestCompletionDate) > new Date(formData.latestCompletionDate)) {
        newErrors.latestCompletionDate = "Latest completion date must be after earliest completion date";
      }
    }

    // Validate custom fields
    customFields.forEach((field: TaskCustomField) => {
      if (field.required) {
        const value = customFieldsData[field.name];
        if (!value || String(value).trim() === '') {
          newErrors[`custom_${field.name}`] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await createTask({
        staffId: formData.staffId,
        customerId: formData.customerId,
        taskTitle: formData.taskTitle,
        description: formData.description,
        earliestCompletionDate: formData.earliestCompletionDate,
        latestCompletionDate: formData.latestCompletionDate,
        customFields: customFieldsData,
      }).unwrap();

      toast({
        title: "Success",
        description: "Task assigned successfully",
      });

      // Reset form
      setFormData({
        staffId: "",
        customerId: "",
        taskTitle: "",
        description: "",
        earliestCompletionDate: "",
        latestCompletionDate: "",
      });
      setCustomFieldsData({});

      // Navigate to tasks list
      navigate("/hrms-geo/tasks/list");
    } catch (error: any) {
      console.error('Error creating task:', error);
      const errorMessage = error?.data?.error?.message || error?.message || "Failed to assign task";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assign Task</h1>
            <p className="text-muted-foreground mt-1">Create and assign new tasks to staff members</p>
          </div>

          <Tabs defaultValue="assign" className="w-full">
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

            <TabsContent value="assign" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Task</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Create and assign new tasks to staff members</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Staff *</label>
                        <Select 
                          value={formData.staffId} 
                          onValueChange={(value) => handleInputChange("staffId", value)}
                        >
                          <SelectTrigger className={errors.staffId ? "border-red-500" : ""}>
                            <SelectValue placeholder="Choose staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingStaff ? (
                              <SelectItem value="loading" disabled>Loading staff...</SelectItem>
                            ) : staffList.length === 0 ? (
                              <SelectItem value="none" disabled>No staff available</SelectItem>
                            ) : (
                              staffList.map((staff) => (
                                <SelectItem key={staff._id} value={staff._id}>
                                  {staff.name} ({staff.employeeId})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {errors.staffId && (
                          <p className="text-sm text-red-500">{errors.staffId}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Task Title *</label>
                        <Input 
                          placeholder="Enter task title" 
                          value={formData.taskTitle}
                          onChange={(e) => handleInputChange("taskTitle", e.target.value)}
                          className={errors.taskTitle ? "border-red-500" : ""}
                        />
                        {errors.taskTitle && (
                          <p className="text-sm text-red-500">{errors.taskTitle}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea 
                        className="w-full min-h-[120px] p-3 border rounded-md resize-none"
                        placeholder="Enter task description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Earliest Completion Date *</label>
                        <Input 
                          type="date" 
                          value={formData.earliestCompletionDate}
                          onChange={(e) => handleInputChange("earliestCompletionDate", e.target.value)}
                          className={errors.earliestCompletionDate ? "border-red-500" : ""}
                        />
                        {errors.earliestCompletionDate && (
                          <p className="text-sm text-red-500">{errors.earliestCompletionDate}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Latest Completion Date *</label>
                        <Input 
                          type="date" 
                          value={formData.latestCompletionDate}
                          onChange={(e) => handleInputChange("latestCompletionDate", e.target.value)}
                          min={formData.earliestCompletionDate}
                          className={errors.latestCompletionDate ? "border-red-500" : ""}
                        />
                        {errors.latestCompletionDate && (
                          <p className="text-sm text-red-500">{errors.latestCompletionDate}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Customer *</label>
                      <Select 
                        value={formData.customerId} 
                        onValueChange={(value) => handleInputChange("customerId", value)}
                      >
                        <SelectTrigger className={errors.customerId ? "border-red-500" : ""}>
                          <SelectValue placeholder="Choose customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingCustomers ? (
                            <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                          ) : customersList.length === 0 ? (
                            <SelectItem value="none" disabled>No customers available</SelectItem>
                          ) : (
                            customersList.map((customer) => (
                              <SelectItem key={customer._id} value={customer._id}>
                                {customer.customerName} ({customer.customerNumber})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.customerId && (
                        <p className="text-sm text-red-500">{errors.customerId}</p>
                      )}
                    </div>
                    {customFields.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Custom Fields</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {customFields.map((field) => renderCustomFieldInput(field))}
                        </div>
                      </div>
                    )}
                    <div className="p-4 bg-muted rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Generated Task ID:</span>
                        <span className="text-sm font-mono text-blue-600">{generateTaskId()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This task ID will be automatically generated when you assign the task
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => navigate("/hrms-geo/tasks/list")}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? "Assigning..." : "Assign Task"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AssignTask;
