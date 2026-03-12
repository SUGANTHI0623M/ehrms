import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Download,
  FileText,
  Upload,
  X,
  Filter,
  Eye,
  Edit,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useImportCustomersFromExcelMutation,
  useExportCustomersToExcelMutation,
  useDownloadSampleCustomersFileMutation,
  useUpdateCustomerMutation,
  useGetCustomerByIdQuery,
} from "@/store/api/customerApi";
import { useGetCustomerDataFieldsQuery } from "@/store/api/settingsApi";
import { message, DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { Pagination } from "@/components/ui/pagination";
import type {
  Customer,
  CreateCustomerRequest,
  CustomerDataField,
} from "@/store/api/customerApi";
import { getCountryOptions, phoneUtils } from "@/utils/countryCodeUtils";

const { RangePicker } = DatePicker;
const countryOptions = getCountryOptions();

const CustomersList = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Determine active tab from route - use precise matching
  const getActiveTab = () => {
    const path = location.pathname.split("?")[0]; // Remove query params
    const normalizedPath = path.replace(/\/$/, ""); // Remove trailing slash
    
    // Use precise path matching instead of includes() to avoid false matches
    if (normalizedPath === "/hrms-geo/customers/dashboard" || normalizedPath.startsWith("/hrms-geo/customers/dashboard/")) {
      return "dashboard";
    }
    if (normalizedPath === "/hrms-geo/customers/list" || normalizedPath.startsWith("/hrms-geo/customers/list/")) {
      return "list";
    }
    if (normalizedPath === "/hrms-geo/customers/settings" || normalizedPath.startsWith("/hrms-geo/customers/settings/")) {
      return "settings";
    }
    // Default to list if path doesn't match any specific tab
    return "list";
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // Edit form state
  const [editFormData, setEditFormData] = useState<
    CreateCustomerRequest & { customFields: Record<string, any> }
  >({
    customerName: "",
    customerNumber: "",
    companyName: "",
    address: "",
    emailId: "",
    city: "",
    pincode: "",
    countryCode: "",
    customFields: {},
  });
  const [editCountryCode, setEditCountryCode] = useState<string>("91");
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>(
    {},
  );
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [formData, setFormData] = useState<
    CreateCustomerRequest & { customFields: Record<string, any> }
  >({
    customerName: "",
    customerNumber: "",
    companyName: "",
    address: "",
    emailId: "",
    city: "",
    pincode: "",
    countryCode: "",
    customFields: {},
  });
  const [countryCode, setCountryCode] = useState<string>("91");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Fetch customers
  const {
    data: customersData,
    isLoading,
    refetch,
  } = useGetCustomersQuery({
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageSize,
    startDate: dateRange?.[0]?.format("YYYY-MM-DD"),
    endDate: dateRange?.[1]?.format("YYYY-MM-DD"),
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Fetch custom fields
  const { data: customFieldsData } = useGetCustomerDataFieldsQuery();
  const customFields = customFieldsData?.data?.fields || [];

  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [importCustomers, { isLoading: isImporting }] =
    useImportCustomersFromExcelMutation();
  const [exportCustomers, { isLoading: isExporting }] =
    useExportCustomersToExcelMutation();
  const [downloadSample, { isLoading: isDownloadingSample }] =
    useDownloadSampleCustomersFileMutation();

  // Fetch customer details for view/edit
  const { data: customerDetails } = useGetCustomerByIdQuery(
    selectedCustomer?._id || "",
    {
      skip: !selectedCustomer || (!isViewModalOpen && !isEditModalOpen),
    },
  );

  const customers = customersData?.data?.customers || [];

  // Max digits for customer number based on selected country code
  const addMaxDigits = phoneUtils.getLimits(countryCode)?.max ?? 15;
  const editMaxDigits = phoneUtils.getLimits(editCountryCode ?? "")?.max ?? 15;

  // Handle form input change
  const handleInputChange = (field: string, value: any) => {
    // For pincode, only allow numeric characters
    let processedValue = value;
    if (field === 'pincode') {
      processedValue = String(value).replace(/\D/g, ''); // Remove all non-digit characters
    }
    
    if (field.startsWith("custom_")) {
      const customFieldName = field.replace("custom_", "");
      setFormData((prev) => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [customFieldName]: processedValue,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: processedValue }));
    }
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle edit form input change
  const handleEditInputChange = (field: string, value: any) => {
    // For pincode, only allow numeric characters
    let processedValue = value;
    if (field === 'pincode') {
      processedValue = String(value).replace(/\D/g, ''); // Remove all non-digit characters
    }
    
    if (field.startsWith("custom_")) {
      const customFieldName = field.replace("custom_", "");
      setEditFormData((prev) => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [customFieldName]: processedValue,
        },
      }));
    } else {
      setEditFormData((prev) => ({ ...prev, [field]: processedValue }));
    }
    // Clear error for this field
    if (editFormErrors[field]) {
      setEditFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate edit form
  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate mandatory fields
    if (!editFormData.customerName.trim())
      errors.customerName = "Customer Name is required";
    if (!editFormData.customerNumber.trim())
      errors.customerNumber = "Customer Number is required";
    if (!editFormData.address.trim()) errors.address = "Address is required";
    if (!editFormData.emailId.trim()) {
      errors.emailId = "Email ID is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.emailId)) {
      errors.emailId = "Invalid email format";
    }
    if (!editFormData.city.trim()) errors.city = "City is required";
    if (!editFormData.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d+$/.test(editFormData.pincode)) {
      errors.pincode = "Pincode must contain only numbers";
    } else if (editFormData.pincode.length < 4 || editFormData.pincode.length > 10) {
      errors.pincode = "Pincode must be between 4 and 10 digits";
    }

    // Customer number length when country code is set (same as Add form)
    const editCode = editCountryCode?.trim();
    if (editCode && editFormData.customerNumber.trim()) {
      const limits = phoneUtils.getLimits(editCode);
      if (limits) {
        const digitsOnly = editFormData.customerNumber.replace(/\D/g, "");
        if (digitsOnly.length > 0 && (digitsOnly.length < limits.min || digitsOnly.length > limits.max)) {
          errors.customerNumber = `Number must be ${limits.min}-${limits.max} digits for selected country`;
        }
      }
    }

    // Validate custom fields
    customFields.forEach((field: any) => {
      if (field.required) {
        const value = editFormData.customFields[field.name];
        if (!value || String(value).trim() === "") {
          errors[`custom_${field.name}`] = `${field.label} is required`;
        }
      }
    });

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle edit form submit
  const handleEditSubmit = async () => {
    if (!validateEditForm()) {
      message.error("Please fill all required fields correctly");
      return;
    }

    if (!selectedCustomer) return;

    try {
      await updateCustomer({
        id: selectedCustomer._id,
        data: {
          customerName: editFormData.customerName.trim(),
          customerNumber: editFormData.customerNumber.trim(),
          companyName: editFormData.companyName?.trim() || undefined,
          address: editFormData.address.trim(),
          emailId: editFormData.emailId.trim(),
          city: editFormData.city.trim(),
          pincode: editFormData.pincode.trim(),
          countryCode: editCountryCode?.trim() || undefined,
          customFields: editFormData.customFields,
        },
      }).unwrap();

      message.success("Customer updated successfully");
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      refetch();
    } catch (error: any) {
      const errorMessage =
        error?.data?.error?.message ||
        error?.message ||
        "Failed to update customer";
      message.error(errorMessage);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate mandatory fields
    if (!formData.customerName.trim())
      errors.customerName = "Customer Name is required";
    if (!formData.customerNumber.trim())
      errors.customerNumber = "Customer Number is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.emailId.trim()) {
      errors.emailId = "Email ID is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
      errors.emailId = "Invalid email format";
    }
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d+$/.test(formData.pincode)) {
      errors.pincode = "Pincode must contain only numbers";
    } else if (formData.pincode.length < 4 || formData.pincode.length > 10) {
      errors.pincode = "Pincode must be between 4 and 10 digits";
    }

    // Validate customer number (mobile) length when country code is selected
    if (formData.customerNumber.trim() && countryCode) {
      const limits = phoneUtils.getLimits(countryCode);
      if (limits) {
        const digitsOnly = formData.customerNumber.replace(/\D/g, "");
        if (digitsOnly.length > 0 && (digitsOnly.length < limits.min || digitsOnly.length > limits.max)) {
          errors.customerNumber = `Number must be ${limits.min}–${limits.max} digits for selected country`;
        }
      }
    }

    // Validate custom fields
    customFields.forEach((field: any) => {
      if (field.required) {
        const value = formData.customFields[field.name];
        if (!value || String(value).trim() === "") {
          errors[`custom_${field.name}`] = `${field.label} is required`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      message.error("Please fill all required fields correctly");
      return;
    }

    try {
      await createCustomer({
        customerName: formData.customerName.trim(),
        customerNumber: formData.customerNumber.trim(),
        companyName: formData.companyName?.trim() || undefined,
        address: formData.address.trim(),
        emailId: formData.emailId.trim(),
        city: formData.city.trim(),
        pincode: formData.pincode.trim(),
        countryCode: countryCode || undefined,
        customFields: formData.customFields,
      }).unwrap();

      message.success("Customer added successfully");
      setIsAddModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      // Handle validation errors
      const errorMessage =
        error?.data?.error?.message ||
        error?.message ||
        "Failed to add customer";

      // If there are missing fields, show them and update form errors
      if (error?.data?.error?.missingFields) {
        const missingFields = error.data.error.missingFields.join(", ");
        message.error(`Missing required fields: ${missingFields}`);

        // Map backend field names to form field names
        const fieldMapping: Record<string, string> = {
          "Customer Name": "customerName",
          "Customer Number": "customerNumber",
          Address: "address",
          "Email ID": "emailId",
          City: "city",
          Pincode: "pincode",
        };

        const backendErrors: Record<string, string> = {};
        error.data.error.missingFields.forEach((field: string) => {
          const fieldKey =
            fieldMapping[field] || field.toLowerCase().replace(/\s+/g, "");
          backendErrors[fieldKey] = `${field} is required`;
        });
        setFormErrors((prev) => ({ ...prev, ...backendErrors }));
      } else if (error?.data?.error?.message) {
        // Handle other validation errors (e.g., email format, duplicate customer number)
        message.error(errorMessage);

        // Try to map error to specific field
        if (errorMessage.toLowerCase().includes("email")) {
          setFormErrors((prev) => ({
            ...prev,
            emailId: "Invalid email format",
          }));
        } else if (errorMessage.toLowerCase().includes("customer number")) {
          setFormErrors((prev) => ({
            ...prev,
            customerNumber: "Customer number already exists",
          }));
        }
      } else {
        message.error(errorMessage);
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      customerName: "",
      customerNumber: "",
      companyName: "",
      address: "",
      emailId: "",
      city: "",
      pincode: "",
      countryCode: "",
      customFields: {},
    });
    setCountryCode("91");
    setFormErrors({});
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      message.error("Please select a file");
      return;
    }

    try {
      const result = await importCustomers({ file: importFile }).unwrap();

      if (
        result.data.failed > 0 &&
        result.data.failedItems &&
        result.data.failedItems.length > 0
      ) {
        // Show detailed error message with failed items
        const errorDetails = result.data.failedItems
          .slice(0, 5) // Show first 5 errors
          .map((item: any) => `Row ${item.row}: ${item.error}`)
          .join("\n");
        const moreErrors =
          result.data.failedItems.length > 5
            ? `\n... and ${result.data.failedItems.length - 5} more errors`
            : "";
        message.warning(
          `Imported ${result.data.imported} customers. ${result.data.failed} failed.\n${errorDetails}${moreErrors}`,
          10,
        );
      } else {
        message.success(
          `Imported ${result.data.imported} customers successfully.`,
        );
      }

      setIsImportModalOpen(false);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch (error: any) {
      console.error("Import error:", error);
      const errorMessage =
        error?.data?.error?.message ||
        error?.message ||
        "Failed to import customers";
      
      // Show missing headers if any, otherwise show general error
      if (error?.data?.error?.missingHeaders) {
        message.error(
          `Missing required columns: ${error.data.error.missingHeaders.join(", ")}`,
        );
      } else {
        message.error(errorMessage);
      }
    }
  };

  // Download sample file (matches table columns + how to import sheet)
  const handleDownloadSample = async () => {
    try {
      const blob = await downloadSample().unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers_import_sample.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Sample file downloaded");
    } catch (error: any) {
      message.error("Failed to download sample file");
    }
  };

  // Handle export (use same filters as list: search + date range)
  const handleExport = async () => {
    try {
      const blob = await exportCustomers({
        search: debouncedSearch || undefined,
        startDate: dateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: dateRange?.[1]?.format("YYYY-MM-DD"),
      }).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Customers exported successfully");
    } catch (error: any) {
      message.error("Failed to export customers");
    }
  };

  // Handle view customer
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditFormData({
      customerName: customer.customerName,
      customerNumber: customer.customerNumber,
      companyName: customer.companyName || "",
      address: customer.address,
      emailId: customer.emailId,
      city: customer.city,
      pincode: customer.pincode,
      countryCode: customer.countryCode || "",
      customFields: customer.customFields || {},
    });
    setEditCountryCode(customer.countryCode || "91");
    setIsEditModalOpen(true);
  };

  // Render custom field input
  const renderCustomFieldInput = (
    field: any,
    valueOverride?: any,
    errorOverride?: string,
    onChangeOverride?: (field: string, value: any) => void,
    idPrefix: string = "",
  ) => {
    const fieldName = `custom_${field.name}`;
    const value =
      valueOverride !== undefined
        ? valueOverride
        : formData.customFields[field.name] || "";
    const error =
      errorOverride !== undefined ? errorOverride : formErrors[fieldName];
    const handleChange = onChangeOverride || handleInputChange;
    const fieldId = idPrefix || fieldName;

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldId}
              type={
                field.type === "email"
                  ? "email"
                  : field.type === "phone"
                    ? "tel"
                    : "text"
              }
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => handleChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case "number":
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="number"
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => handleChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case "date":
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={value}
              onChange={(e) => handleChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case "textarea":
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => handleChange(fieldName, e.target.value)}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case "dropdown":
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleChange(fieldName, val)}
            >
              <SelectTrigger className={error ? "border-red-500" : ""}>
                <SelectValue
                  placeholder={field.placeholder || `Select ${field.label}`}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      case "boolean":
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value ? "true" : "false"}
              onValueChange={(val) => handleChange(fieldName, val === "true")}
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

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Customers
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Access your customer details, or add more from this page
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 sm:flex-none"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        <Tabs value={getActiveTab()} className="w-full">
          <div className="flex overflow-x-auto pb-1">
            <TabsList className="h-auto p-1 bg-muted/50 justify-start inline-flex min-w-full sm:min-w-0">
              <TabsTrigger
                value="dashboard"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/customers/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild className="flex-1 sm:flex-none">
                <Link to="/hrms-geo/customers/list">Customers List</Link>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/customers/settings">
                  Customers Settings
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg sm:text-xl">
                    Customers List
                  </CardTitle>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search customers..."
                        className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
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
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowFilters(!showFilters)}
                      className={showFilters ? "bg-muted" : ""}
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date Range</Label>
                        <RangePicker
                          value={dateRange}
                          onChange={(dates) => {
                            setDateRange(dates as [Dayjs | null, Dayjs | null]);
                            setCurrentPage(1);
                          }}
                          format="DD MMM YYYY"
                          className="w-full"
                          allowClear
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={statusFilter}
                          onValueChange={(value) => {
                            setStatusFilter(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Not yet Started">Not yet Started</SelectItem>
                            <SelectItem value="In progress">In progress</SelectItem>
                            <SelectItem value="Completed Tasks">Completed Tasks</SelectItem>
                            <SelectItem value="Reopened">Reopened</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                            <SelectItem value="Hold">Hold</SelectItem>
                            <SelectItem value="Delayed Tasks">Delayed Tasks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(dateRange[0] || dateRange[1] || statusFilter !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDateRange([null, null]);
                          setStatusFilter("all");
                          setCurrentPage(1);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto border-t sm:border-t-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 sm:bg-transparent border-b">
                        <th className="text-left p-3 font-medium min-w-[150px]">
                          Customer Name
                        </th>
                        <th className="text-left p-3 font-medium min-w-[120px]">
                          Number
                        </th>
                        <th className="text-left p-3 font-medium min-w-[150px]">
                          City
                        </th>
                        <th className="text-left p-3 font-medium min-w-[150px]">
                          Email
                        </th>
                        <th className="text-left p-3 font-medium min-w-[100px]">
                          Status
                        </th>
                        <th className="text-left p-3 font-medium min-w-[100px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-muted-foreground"
                          >
                            Loading customers...
                          </td>
                        </tr>
                      ) : customers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-muted-foreground"
                          >
                            No customers found
                          </td>
                        </tr>
                      ) : (
                        customers.map((customer) => (
                          <tr
                            key={customer._id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-3">
                              <div className="font-medium text-foreground">
                                {customer.customerName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {customer.companyName || "No Company"}
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {customer.customerNumber}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {customer.city}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {customer.emailId}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  String(customer.status).toLowerCase() === "active"
                                    ? "bg-green-100 "
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {customer.status || "Active"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewCustomer(customer)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditCustomer(customer)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {customersData?.data?.pagination && (
                  <div className="mt-4 pt-4 border-t">
                    <Pagination
                      page={currentPage}
                      pageSize={pageSize}
                      total={customersData.data.pagination.total}
                      pages={customersData.data.pagination.pages}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit/View Modals would go here - for brevity, I'm keeping the logic but focus on the layout above */}
      {/* View Modal - API returns data.customer, not data at root */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Customer Name
              </Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.customerName ?? selectedCustomer?.customerName ?? "Loading..."}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Customer Number
              </Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.customerNumber ?? selectedCustomer?.customerNumber ?? "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Company Name
              </Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.companyName ?? selectedCustomer?.companyName ?? "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email ID</Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.emailId ?? selectedCustomer?.emailId ?? "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">City</Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.city ?? selectedCustomer?.city ?? "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pincode</Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.pincode ?? selectedCustomer?.pincode ?? "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Country Code</Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.countryCode ?? selectedCustomer?.countryCode ?? "—"}
              </div>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Address</Label>
              <div className="text-sm font-medium">
                {customerDetails?.data?.customer?.address ?? selectedCustomer?.address ?? "N/A"}
              </div>
            </div>
            {/* Custom Fields */}
            {customFields.map((field: any) => (
              <div key={field._id} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {field.label}
                </Label>
                <div className="text-sm font-medium">
                  {(customerDetails?.data?.customer?.customFields?.[field.name] ?? selectedCustomer?.customFields?.[field.name])?.toString() ?? "N/A"}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.customerName}
                onChange={(e) =>
                  handleInputChange("customerName", e.target.value)
                }
                className={formErrors.customerName ? "border-red-500" : ""}
              />
              {formErrors.customerName && (
                <p className="text-[10px] text-red-500">
                  {formErrors.customerName}
                </p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>
                Customer Number (mobile) <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-3 items-stretch flex-wrap sm:flex-nowrap">
                <Select
                  value={countryCode}
                  onValueChange={(v) => {
                    setCountryCode(v);
                    const maxD = phoneUtils.getLimits(v)?.max ?? 15;
                    setFormData((prev) => ({
                      ...prev,
                      customerNumber: prev.customerNumber.replace(/\D/g, "").slice(0, maxD),
                    }));
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.customerNumber;
                      return next;
                    });
                  }}
                >
                  <SelectTrigger className="w-[140px] shrink-0">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder={`${addMaxDigits} digits`}
                  maxLength={addMaxDigits}
                  value={formData.customerNumber}
                  onChange={(e) =>
                    handleInputChange("customerNumber", e.target.value.replace(/\D/g, "").slice(0, addMaxDigits))
                  }
                  className={`flex-1 min-w-0 ${formErrors.customerNumber ? "border-red-500" : ""}`}
                />
              </div>
              {formErrors.customerNumber && (
                <p className="text-[10px] text-red-500">
                  {formErrors.customerNumber}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={formData.companyName}
                onChange={(e) =>
                  handleInputChange("companyName", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Email ID <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                value={formData.emailId}
                onChange={(e) => handleInputChange("emailId", e.target.value)}
                className={formErrors.emailId ? "border-red-500" : ""}
              />
              {formErrors.emailId && (
                <p className="text-[10px] text-red-500">{formErrors.emailId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={formErrors.city ? "border-red-500" : ""}
              />
              {formErrors.city && (
                <p className="text-[10px] text-red-500">{formErrors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Pincode <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={formData.pincode}
                onChange={(e) => handleInputChange("pincode", e.target.value)}
                className={formErrors.pincode ? "border-red-500" : ""}
                placeholder="Enter pincode (numbers only)"
              />
              {formErrors.pincode && (
                <p className="text-[10px] text-red-500">{formErrors.pincode}</p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>
                Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className={formErrors.address ? "border-red-500" : ""}
              />
              {formErrors.address && (
                <p className="text-[10px] text-red-500">{formErrors.address}</p>
              )}
            </div>
            {customFields.map((field: any) => renderCustomFieldInput(field))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto">
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={editFormData.customerName}
                onChange={(e) =>
                  handleEditInputChange("customerName", e.target.value)
                }
                className={editFormErrors.customerName ? "border-red-500" : ""}
              />
              {editFormErrors.customerName && (
                <p className="text-[10px] text-red-500">
                  {editFormErrors.customerName}
                </p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>
                Customer Number (mobile) <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-3 items-stretch flex-wrap sm:flex-nowrap">
                <Select
                  value={editCountryCode}
                  onValueChange={(v) => {
                    setEditCountryCode(v);
                    const maxD = phoneUtils.getLimits(v)?.max ?? 15;
                    handleEditInputChange("customerNumber", editFormData.customerNumber.replace(/\D/g, "").slice(0, maxD));
                  }}
                >
                  <SelectTrigger className="w-[140px] shrink-0">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder={`${editMaxDigits} digits`}
                  maxLength={editMaxDigits}
                  value={editFormData.customerNumber}
                  onChange={(e) =>
                    handleEditInputChange("customerNumber", e.target.value.replace(/\D/g, "").slice(0, editMaxDigits))
                  }
                  className={`flex-1 min-w-0 ${editFormErrors.customerNumber ? "border-red-500" : ""}`}
                />
              </div>
              {editFormErrors.customerNumber && (
                <p className="text-[10px] text-red-500">
                  {editFormErrors.customerNumber}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={editFormData.companyName}
                onChange={(e) =>
                  handleEditInputChange("companyName", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Email ID <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                value={editFormData.emailId}
                onChange={(e) =>
                  handleEditInputChange("emailId", e.target.value)
                }
                className={editFormErrors.emailId ? "border-red-500" : ""}
              />
              {editFormErrors.emailId && (
                <p className="text-[10px] text-red-500">
                  {editFormErrors.emailId}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                value={editFormData.city}
                onChange={(e) => handleEditInputChange("city", e.target.value)}
                className={editFormErrors.city ? "border-red-500" : ""}
              />
              {editFormErrors.city && (
                <p className="text-[10px] text-red-500">
                  {editFormErrors.city}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Pincode <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={editFormData.pincode}
                onChange={(e) =>
                  handleEditInputChange("pincode", e.target.value)
                }
                className={editFormErrors.pincode ? "border-red-500" : ""}
                placeholder="Enter pincode (numbers only)"
              />
              {editFormErrors.pincode && (
                <p className="text-[10px] text-red-500">
                  {editFormErrors.pincode}
                </p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>
                Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={editFormData.address}
                onChange={(e) =>
                  handleEditInputChange("address", e.target.value)
                }
                className={editFormErrors.address ? "border-red-500" : ""}
              />
              {editFormErrors.address && (
                <p className="text-[10px] text-red-500">
                  {editFormErrors.address}
                </p>
              )}
            </div>
            {customFields.map((field: any) =>
              renderCustomFieldInput(
                field,
                editFormData.customFields[field.name],
                editFormErrors[`custom_${field.name}`],
                handleEditInputChange,
                `edit_custom_${field.name}`,
              ),
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} className="w-full sm:w-auto">
              Update Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-left text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">How to import</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Download the sample file to see the exact column format (matches the table).</li>
                <li>Required columns: Customer Name, Customer Number, Address, Email ID, City, Pincode.</li>
                <li>Optional: Company Name, Country Code (e.g. 91 for India).</li>
                <li>Customer Number is the mobile/contact number; use Country Code for that number&apos;s country.</li>
                <li>Save as .xlsx and upload below. Duplicate customer numbers will be skipped.</li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              disabled={isDownloadingSample}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloadingSample ? "Downloading..." : "Download sample file"}
            </Button>
            <div className="p-6 border-2 border-dashed rounded-lg text-center space-y-2">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
              <div className="text-sm font-medium">
                Click to upload or drag and drop
              </div>
              <p className="text-xs text-muted-foreground">
                Excel files (.xlsx, .xls)
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                Select File
              </Button>
            </div>
            {importFile && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs truncate">{importFile.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setImportFile(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="w-full sm:w-auto"
            >
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CustomersList;
