import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Download, FileText, Upload, X, Filter, Eye, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { useGetCustomersQuery, useCreateCustomerMutation, useImportCustomersFromExcelMutation, useExportCustomersToExcelMutation, useUpdateCustomerMutation, useGetCustomerByIdQuery } from "@/store/api/customerApi";
import { useGetCustomerDataFieldsQuery } from "@/store/api/settingsApi";
import { message, DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import type { Customer, CreateCustomerRequest, CustomerDataField } from "@/store/api/customerApi";

const { RangePicker } = DatePicker;

const CustomersList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Edit form state
  const [editFormData, setEditFormData] = useState<CreateCustomerRequest & { customFields: Record<string, any> }>({
    customerName: "",
    customerNumber: "",
    companyName: "",
    address: "",
    emailId: "",
    city: "",
    pincode: "",
    phone: "",
    customFields: {}
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCustomerRequest & { customFields: Record<string, any> }>({
    customerName: "",
    customerNumber: "",
    companyName: "",
    address: "",
    emailId: "",
    city: "",
    pincode: "",
    phone: "",
    customFields: {}
  });

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
  const { data: customersData, isLoading, refetch } = useGetCustomersQuery({
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: pageSize,
    startDate: dateRange[0]?.format('YYYY-MM-DD'),
    endDate: dateRange[1]?.format('YYYY-MM-DD'),
  });

  // Fetch custom fields
  const { data: customFieldsData } = useGetCustomerDataFieldsQuery();
  const customFields = customFieldsData?.data?.fields || [];

  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [importCustomers, { isLoading: isImporting }] = useImportCustomersFromExcelMutation();
  const [exportCustomers, { isLoading: isExporting }] = useExportCustomersToExcelMutation();

  // Fetch customer details for view/edit
  const { data: customerDetails } = useGetCustomerByIdQuery(selectedCustomer?._id || "", {
    skip: !selectedCustomer || (!isViewModalOpen && !isEditModalOpen)
  });


  const customers = customersData?.data?.customers || [];

  // Handle form input change
  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('custom_')) {
      const customFieldName = field.replace('custom_', '');
      setFormData(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [customFieldName]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle edit form input change
  const handleEditInputChange = (field: string, value: any) => {
    if (field.startsWith('custom_')) {
      const customFieldName = field.replace('custom_', '');
      setEditFormData(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [customFieldName]: value
        }
      }));
    } else {
      setEditFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (editFormErrors[field]) {
      setEditFormErrors(prev => {
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
    if (!editFormData.customerName.trim()) errors.customerName = "Customer Name is required";
    if (!editFormData.customerNumber.trim()) errors.customerNumber = "Customer Number is required";
    if (!editFormData.address.trim()) errors.address = "Address is required";
    if (!editFormData.emailId.trim()) {
      errors.emailId = "Email ID is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.emailId)) {
      errors.emailId = "Invalid email format";
    }
    if (!editFormData.city.trim()) errors.city = "City is required";
    if (!editFormData.pincode.trim()) errors.pincode = "Pincode is required";

    // Validate custom fields
    customFields.forEach((field: any) => {
      if (field.required) {
        const value = editFormData.customFields[field.name];
        if (!value || String(value).trim() === '') {
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
          phone: editFormData.phone?.trim() || undefined,
          customFields: editFormData.customFields
        }
      }).unwrap();

      message.success("Customer updated successfully");
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || error?.message || "Failed to update customer";
      message.error(errorMessage);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate mandatory fields
    if (!formData.customerName.trim()) errors.customerName = "Customer Name is required";
    if (!formData.customerNumber.trim()) errors.customerNumber = "Customer Number is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.emailId.trim()) {
      errors.emailId = "Email ID is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
      errors.emailId = "Invalid email format";
    }
    if (!formData.city.trim()) errors.city = "City is required";
    if (!formData.pincode.trim()) errors.pincode = "Pincode is required";

    // Validate custom fields
    customFields.forEach((field: any) => {
      if (field.required) {
        const value = formData.customFields[field.name];
        if (!value || String(value).trim() === '') {
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
        phone: formData.phone?.trim() || undefined,
        customFields: formData.customFields
      }).unwrap();

      message.success("Customer added successfully");
      setIsAddModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      // Handle validation errors
      const errorMessage = error?.data?.error?.message || error?.message || "Failed to add customer";
      
      // If there are missing fields, show them and update form errors
      if (error?.data?.error?.missingFields) {
        const missingFields = error.data.error.missingFields.join(', ');
        message.error(`Missing required fields: ${missingFields}`);
        
        // Map backend field names to form field names
        const fieldMapping: Record<string, string> = {
          'Customer Name': 'customerName',
          'Customer Number': 'customerNumber',
          'Address': 'address',
          'Email ID': 'emailId',
          'City': 'city',
          'Pincode': 'pincode'
        };
        
        const backendErrors: Record<string, string> = {};
        error.data.error.missingFields.forEach((field: string) => {
          const fieldKey = fieldMapping[field] || field.toLowerCase().replace(/\s+/g, '');
          backendErrors[fieldKey] = `${field} is required`;
        });
        setFormErrors(prev => ({ ...prev, ...backendErrors }));
      } else if (error?.data?.error?.message) {
        // Handle other validation errors (e.g., email format, duplicate customer number)
        message.error(errorMessage);
        
        // Try to map error to specific field
        if (errorMessage.toLowerCase().includes('email')) {
          setFormErrors(prev => ({ ...prev, emailId: 'Invalid email format' }));
        } else if (errorMessage.toLowerCase().includes('customer number')) {
          setFormErrors(prev => ({ ...prev, customerNumber: 'Customer number already exists' }));
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
      phone: "",
      customFields: {}
    });
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
      
      if (result.data.failed > 0 && result.data.failedItems && result.data.failedItems.length > 0) {
        // Show detailed error message with failed items
        const errorDetails = result.data.failedItems
          .slice(0, 5) // Show first 5 errors
          .map((item: any) => `Row ${item.row}: ${item.error}`)
          .join('\n');
        const moreErrors = result.data.failedItems.length > 5 ? `\n... and ${result.data.failedItems.length - 5} more errors` : '';
        message.warning(
          `Imported ${result.data.imported} customers. ${result.data.failed} failed.\n${errorDetails}${moreErrors}`,
          10
        );
      } else {
        message.success(`Imported ${result.data.imported} customers successfully.`);
      }
      
      setIsImportModalOpen(false);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error?.data?.error?.message || error?.message || "Failed to import customers";
      message.error(errorMessage);
      
      // Show missing headers if any
      if (error?.data?.error?.missingHeaders) {
        message.error(`Missing required columns: ${error.data.error.missingHeaders.join(', ')}`);
      }
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const blob = await exportCustomers().unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Customers exported successfully");
    } catch (error: any) {
      message.error("Failed to export customers");
    }
  };

  // Render custom field input
  const renderCustomFieldInput = (field: any, valueOverride?: any, errorOverride?: string, onChangeOverride?: (field: string, value: any) => void, idPrefix: string = "") => {
    const fieldName = `custom_${field.name}`;
    const value = valueOverride !== undefined ? valueOverride : (formData.customFields[field.name] || '');
    const error = errorOverride !== undefined ? errorOverride : formErrors[fieldName];
    const handleChange = onChangeOverride || handleInputChange;
    const fieldId = idPrefix || fieldName;

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
              id={fieldId}
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              placeholder={field.placeholder || field.label}
              value={value}
              onChange={(e) => handleChange(fieldName, e.target.value)}
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
      case 'date':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
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
      case 'textarea':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
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
      case 'dropdown':
        return (
          <div key={field._id} className="space-y-2">
            <Label htmlFor={fieldName}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleChange(fieldName, val)}
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
              onValueChange={(val) => handleChange(fieldName, val === 'true')}
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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Access your customer details, or add more from this page</p>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="dashboard" asChild>
                <Link to="/hrms-geo/customers/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild>
                <Link to="/hrms-geo/customers/list">Customers List</Link>
              </TabsTrigger>
              <TabsTrigger value="settings" asChild>
                <Link to="/hrms-geo/customers/settings">Customers Settings</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Customers List</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                      </Button>
                      <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? "Exporting..." : "Export"}
                      </Button>
                      <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input 
                        placeholder="Search by customer name, number, email, or city" 
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
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>

                  {showFilters && (
                    <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label className="mb-2 block">Date Range</Label>
                          <RangePicker
                            value={dateRange}
                            onChange={(dates) => {
                              if (dates && dates[0] && dates[1]) {
                                setDateRange([dates[0], dates[1]]);
                                setCurrentPage(1);
                              } else {
                                setDateRange([null, null]);
                                setCurrentPage(1);
                              }
                            }}
                            format="DD MMM YYYY"
                            className="w-full"
                            allowClear
                          />
                        </div>
                        {(dateRange[0] || dateRange[1]) && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setDateRange([null, null]);
                              setCurrentPage(1);
                            }}
                          >
                            Clear Date Filter
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No customers found</div>
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Customer Name</th>
                          <th className="text-left p-3 text-sm font-medium">Customer Number</th>
                          <th className="text-left p-3 text-sm font-medium">Address</th>
                          <th className="text-left p-3 text-sm font-medium">Email ID</th>
                          <th className="text-left p-3 text-sm font-medium">City</th>
                          <th className="text-left p-3 text-sm font-medium">Pincode</th>
                          <th className="text-left p-3 text-sm font-medium">Phone</th>
                          <th className="text-left p-3 text-sm font-medium">Status</th>
                          <th className="text-left p-3 text-sm font-medium">Added By</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                          {customers.map((customer: Customer) => (
                            <tr key={customer._id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                                <span className="text-blue-600 cursor-pointer">{customer.customerName}</span>
                            </td>
                              <td className="p-3 text-sm">{customer.customerNumber}</td>
                            <td className="p-3 text-sm">{customer.address}</td>
                              <td className="p-3 text-sm">{customer.emailId}</td>
                            <td className="p-3 text-sm">{customer.city}</td>
                            <td className="p-3 text-sm">{customer.pincode}</td>
                              <td className="p-3 text-sm">{customer.phone || "-"}</td>
                              <td className="p-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  customer.status === 'Completed Tasks' ? 'bg-green-100 text-green-800' :
                                  customer.status === 'In progress' ? 'bg-blue-100 text-blue-800' :
                                  customer.status === 'Serving Today' ? 'bg-purple-100 text-purple-800' :
                                  customer.status === 'Delayed Tasks' ? 'bg-yellow-100 text-yellow-800' :
                                  customer.status === 'Reopened' ? 'bg-orange-100 text-orange-800' :
                                  customer.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                  customer.status === 'Hold' ? 'bg-gray-200 text-gray-800' :
                                  customer.status === 'Pending' ? 'bg-yellow-50 text-yellow-700' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {customer.status || 'Not yet Started'}
                                </span>
                              </td>
                              <td className="p-3 text-sm">
                                {typeof customer.addedBy === 'object' ? customer.addedBy.name : customer.addedBy}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setIsViewModalOpen(true);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      // Load customer data into edit form
                                      setEditFormData({
                                        customerName: customer.customerName,
                                        customerNumber: customer.customerNumber,
                                        companyName: customer.companyName || "",
                                        address: customer.address,
                                        emailId: customer.emailId,
                                        city: customer.city,
                                        pincode: customer.pincode,
                                        phone: customer.phone || "",
                                        customFields: customer.customFields || {}
                                      });
                                      setEditFormErrors({});
                                      setIsEditModalOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                          </tr>
                        ))}
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

      {/* Add Customer Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Mandatory Fields Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Mandatory Fields</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    className={formErrors.customerName ? "border-red-500" : ""}
                  />
                  {formErrors.customerName && <p className="text-sm text-red-500">{formErrors.customerName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    Company Name (Optional)
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName || ""}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerNumber">
                  Customer Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customerNumber"
                  value={formData.customerNumber}
                  onChange={(e) => handleInputChange("customerNumber", e.target.value)}
                  className={formErrors.customerNumber ? "border-red-500" : ""}
                />
                {formErrors.customerNumber && <p className="text-sm text-red-500">{formErrors.customerNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className={formErrors.address ? "border-red-500" : ""}
                />
                {formErrors.address && <p className="text-sm text-red-500">{formErrors.address}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailId">
                  Email ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emailId"
                  type="email"
                  value={formData.emailId}
                  onChange={(e) => handleInputChange("emailId", e.target.value)}
                  className={formErrors.emailId ? "border-red-500" : ""}
                />
                {formErrors.emailId && <p className="text-sm text-red-500">{formErrors.emailId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className={formErrors.city ? "border-red-500" : ""}
                  />
                  {formErrors.city && <p className="text-sm text-red-500">{formErrors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">
                    Pincode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange("pincode", e.target.value)}
                    className={formErrors.pincode ? "border-red-500" : ""}
                  />
                  {formErrors.pincode && <p className="text-sm text-red-500">{formErrors.pincode}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </div>

            {/* Custom Fields Section */}
            {customFields.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="border-b pb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Custom Fields</h3>
                </div>
                {customFields.map((field: any) => renderCustomFieldInput(field))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Customer Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Customer Name</Label>
                  <p className="text-sm">{selectedCustomer.customerName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Customer Number</Label>
                  <p className="text-sm">{selectedCustomer.customerNumber}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-semibold">Address</Label>
                  <p className="text-sm">{selectedCustomer.address}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email ID</Label>
                  <p className="text-sm">{selectedCustomer.emailId}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Phone</Label>
                  <p className="text-sm">{selectedCustomer.phone || "-"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">City</Label>
                  <p className="text-sm">{selectedCustomer.city}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Pincode</Label>
                  <p className="text-sm">{selectedCustomer.pincode}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Added By</Label>
                  <p className="text-sm">
                    {typeof selectedCustomer.addedBy === 'object' 
                      ? selectedCustomer.addedBy.name 
                      : selectedCustomer.addedBy}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Created At</Label>
                  <p className="text-sm">{dayjs(selectedCustomer.createdAt).format('DD MMM YYYY, hh:mm A')}</p>
                </div>
              </div>

              {/* Custom Fields */}
              {customFields.length > 0 && selectedCustomer.customFields && Object.keys(selectedCustomer.customFields).length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold">Custom Fields</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {customFields.map((field: any) => {
                      const value = selectedCustomer.customFields?.[field.name];
                      if (!value) return null;
                      return (
                        <div key={field._id} className="space-y-2">
                          <Label className="text-sm font-semibold">{field.label}</Label>
                          <p className="text-sm">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsViewModalOpen(false);
              setSelectedCustomer(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Mandatory Fields</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_customerName">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_customerName"
                    value={editFormData.customerName}
                    onChange={(e) => handleEditInputChange("customerName", e.target.value)}
                    className={editFormErrors.customerName ? "border-red-500" : ""}
                  />
                  {editFormErrors.customerName && <p className="text-sm text-red-500">{editFormErrors.customerName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_companyName">
                    Company Name (Optional)
                  </Label>
                  <Input
                    id="edit_companyName"
                    value={editFormData.companyName || ""}
                    onChange={(e) => handleEditInputChange("companyName", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_customerNumber">
                  Customer Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_customerNumber"
                  value={editFormData.customerNumber}
                  onChange={(e) => handleEditInputChange("customerNumber", e.target.value)}
                  className={editFormErrors.customerNumber ? "border-red-500" : ""}
                />
                {editFormErrors.customerNumber && <p className="text-sm text-red-500">{editFormErrors.customerNumber}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="edit_address"
                  value={editFormData.address}
                  onChange={(e) => handleEditInputChange("address", e.target.value)}
                  className={editFormErrors.address ? "border-red-500" : ""}
                />
                {editFormErrors.address && <p className="text-sm text-red-500">{editFormErrors.address}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_emailId">
                  Email ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_emailId"
                  type="email"
                  value={editFormData.emailId}
                  onChange={(e) => handleEditInputChange("emailId", e.target.value)}
                  className={editFormErrors.emailId ? "border-red-500" : ""}
                />
                {editFormErrors.emailId && <p className="text-sm text-red-500">{editFormErrors.emailId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_city"
                    value={editFormData.city}
                    onChange={(e) => handleEditInputChange("city", e.target.value)}
                    className={editFormErrors.city ? "border-red-500" : ""}
                  />
                  {editFormErrors.city && <p className="text-sm text-red-500">{editFormErrors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_pincode">
                    Pincode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_pincode"
                    value={editFormData.pincode}
                    onChange={(e) => handleEditInputChange("pincode", e.target.value)}
                    className={editFormErrors.pincode ? "border-red-500" : ""}
                  />
                  {editFormErrors.pincode && <p className="text-sm text-red-500">{editFormErrors.pincode}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone (Optional)</Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => handleEditInputChange("phone", e.target.value)}
                />
              </div>
            </div>

            {customFields.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="border-b pb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Custom Fields</h3>
                </div>
                {customFields.map((field: any) => {
                  const fieldName = `custom_${field.name}`;
                  const value = editFormData.customFields[field.name] || '';
                  const error = editFormErrors[fieldName];
                  return renderCustomFieldInput(field, value, error, handleEditInputChange, `edit_${fieldName}`);
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditModalOpen(false);
              setSelectedCustomer(null);
              setEditFormData({
                customerName: "",
                customerNumber: "",
                companyName: "",
                address: "",
                emailId: "",
                city: "",
                pincode: "",
                phone: "",
                customFields: {}
              });
              setEditFormErrors({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>
              Update Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Excel File</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Required columns: Customer Name, Customer Number, Address, Email ID, City, Pincode
              </p>
            </div>
            {importFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <FileText className="w-4 h-4" />
                <span className="text-sm flex-1">{importFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImportFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportModalOpen(false); setImportFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || isImporting}>
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersList;
