import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit, Eye, EyeOff, Users as UsersIcon, X, Mail, Phone, Calendar, Building2, Filter, Upload, Download, FileSpreadsheet, Check } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { useGetStaffQuery, useGetStaffStatsQuery, useCreateStaffMutation, useGetAvailableShiftsQuery, useGetAvailableTemplatesQuery, useImportStaffFromExcelMutation, useExportStaffToExcelMutation, useDownloadSampleStaffFileMutation } from "@/store/api/staffApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
import { useGetDepartmentsQuery, useCreateDepartmentMutation } from "@/store/api/jobOpeningApi";
import { useGetAttendanceQuery } from "@/store/api/attendanceApi";
import { format } from "date-fns";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCountryOptions } from "@/utils/countryCodeUtils"; "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { message } from "antd";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { Pagination } from "@/components/ui/Pagination";

const Staff = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get("department") || "all");
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get("limit")) || 20);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    alternativePhone: "",
    countryCode: "91", // Default to India
    designation: "",
    department: "",
    staffType: "Full Time" as const,
    branchId: "",
    password: "",
    confirmPassword: "",
    shiftName: "",
    attendanceTemplateId: "",
    leaveTemplateId: "",
    holidayTemplateId: "",
    managerId: "",
    role: ""
  });
  const [openDepartment, setOpenDepartment] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false
  });
  const navigate = useNavigate();
  const { data: branchesData } = useGetActiveBranchesQuery();
  const branches = branchesData?.data?.branches || [];
  const { data: shiftsData } = useGetAvailableShiftsQuery();
  const { data: templatesData } = useGetAvailableTemplatesQuery();
  const shifts = shiftsData?.data?.shifts || [];
  const attendanceTemplates = templatesData?.data?.attendanceTemplates || [];
  const leaveTemplates = templatesData?.data?.leaveTemplates || [];
  const holidayTemplates = templatesData?.data?.holidayTemplates || [];
  const { data: departmentsData, refetch: refetchDepartments } = useGetDepartmentsQuery();
  const [createDepartment] = useCreateDepartmentMutation();
  const departments = departmentsData?.data?.departments || [];
  
  // Get all staff for reporting manager selection
  const { data: allStaffData } = useGetStaffQuery({ limit: 1000, status: "Active" });
  const allStaffForManager = allStaffData?.data?.staff || [];

  // Get all staff to extract unique departments (not just current page)
  const { data: allStaffForDepartments } = useGetStaffQuery({ limit: 10000 });
  const allStaffMembers = allStaffForDepartments?.data?.staff || [];

  // Permission Checks
  const { user } = useAppSelector((state) => state.auth);
  const permissions = user ? getUserPermissions(user.role, user.roleId as any, user.permissions) : [];
  const canView = hasAction(permissions, 'staff', 'view') || hasAction(permissions, 'staff', 'read');
  const canEdit = hasAction(permissions, 'staff', 'update') || hasAction(permissions, 'staff', 'edit');
  const canCreate = hasAction(permissions, 'staff', 'create');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get("search") || "");

  // Sync search with URL query params on mount
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setDebouncedSearchQuery(urlSearch);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        if (searchQuery.trim()) {
          newParams.set("search", searchQuery.trim());
        } else {
          newParams.delete("search");
        }
        return newParams;
      }, { replace: true });
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, setSearchParams]);

  // When "On Leave" is selected, we want to show staff who are absent today based on attendance
  // So we fetch all active staff (not filtered by status) and then filter by attendance records
  const { data: staffData, isLoading: isLoadingStaff } = useGetStaffQuery({
    search: debouncedSearchQuery || undefined,
    status: statusFilter !== "all" && statusFilter !== "On Leave" ? statusFilter : undefined,
    department: departmentFilter !== "all" ? departmentFilter : undefined,
    page: currentPage,
    limit: statusFilter === "On Leave" ? 1000 : pageSize // Get more records when filtering by attendance
  });

  const { data: statsData, isLoading: isLoadingStats } = useGetStaffStatsQuery();
  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast.error("Please enter a department name");
      return;
    }

    // Check if department already exists (case-insensitive)
    const existing = departments.find(d => d.name.toLowerCase() === newDepartmentName.trim().toLowerCase());
    if (existing) {
      toast.info("Department already exists");
      setFormData({ ...formData, department: existing.name });
      setNewDepartmentName("");
      setDepartmentSearch("");
      setOpenDepartment(false);
      return;
    }

    try {
      const result = await createDepartment({ name: newDepartmentName.trim() }).unwrap();
      if (result.success) {
        setFormData({ ...formData, department: result.data.department.name });
        toast.success("Department created successfully");
        setNewDepartmentName("");
        setDepartmentSearch("");
        setOpenDepartment(false);
        refetchDepartments();
      }
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to create department";
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
        toast.info("Department already exists");
        refetchDepartments().then(() => {
          const existingDept = departments.find(d => d.name.toLowerCase() === newDepartmentName.trim().toLowerCase());
          if (existingDept) {
            setFormData({ ...formData, department: existingDept.name });
          }
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };
  const [importStaffFromExcel, { isLoading: isImporting }] = useImportStaffFromExcelMutation();
  const [exportStaffToExcel, { isLoading: isExporting }] = useExportStaffToExcelMutation();
  const [downloadSampleStaffFile, { isLoading: isDownloadingSample }] = useDownloadSampleStaffFileMutation();

  const allStaffFromQuery = staffData?.data?.staff || [];
  const pagination = staffData?.data?.pagination;

  // Fetch today's absent attendance records to show count in stats card and for filtering
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const { data: todayAttendanceData, isLoading: isLoadingAttendance } = useGetAttendanceQuery({
    date: todayDateStr,
    status: "Absent",
    includeAllEmployees: true,
    limit: 1000
  });

  const todayAbsentRecords = todayAttendanceData?.data?.attendance || [];
  const todayAbsentEmployeeIds = new Set(todayAbsentRecords.map((record: any) => {
    // Handle both populated and non-populated employeeId
    let employeeId: string;
    if (typeof record.employeeId === 'object' && record.employeeId !== null) {
      employeeId = String(record.employeeId._id || record.employeeId);
    } else {
      employeeId = String(record.employeeId);
    }
    return employeeId;
  }));

  // Calculate today's absent count from attendance records
  const todayAbsentCount = todayAbsentEmployeeIds.size;

  const stats = statsData?.data?.stats ? [
    { title: "Total Staff", value: statsData.data.stats.total.toString(), color: "text-primary", icon: UsersIcon },
    { title: "Active", value: statsData.data.stats.active.toString(), color: "text-green-600", icon: UsersIcon },
    { title: "On Leave", value: todayAbsentCount.toString(), color: "text-yellow-600", icon: UsersIcon },
    { title: "Deactivated", value: statsData.data.stats.deactivated.toString(), color: "text-gray-500", icon: UsersIcon },
  ] : [
    { title: "Total Staff", value: "0", color: "text-primary", icon: UsersIcon },
    { title: "Active", value: "0", color: "text-green-600", icon: UsersIcon },
    { title: "On Leave", value: todayAbsentCount.toString(), color: "text-yellow-600", icon: UsersIcon },
    { title: "Deactivated", value: "0", color: "text-gray-500", icon: UsersIcon },
  ];

  // Filter staff list: when "On Leave" is selected, show only staff who are absent today
  const staff = useMemo(() => {
    if (statusFilter === "On Leave") {
      // Filter to show only staff who are absent today based on attendance records
      // Convert staff._id to string for comparison
      return allStaffFromQuery.filter((staffMember) => 
        todayAbsentEmployeeIds.has(String(staffMember._id))
      );
    }
    return allStaffFromQuery;
  }, [allStaffFromQuery, statusFilter, todayAbsentEmployeeIds]);

  // Get unique departments from all staff data (not just current page) and combine with API departments
  const uniqueDepartments = useMemo(() => {
    const departmentsSet = new Set<string>();
    
    // Add departments from the API (source of truth)
    departments.forEach((dept) => {
      if (dept.name) {
        departmentsSet.add(dept.name);
      }
    });
    
    // Add departments from all staff records (to catch any that might not be in the departments table)
    allStaffMembers.forEach((member) => {
      if (member.department) {
        departmentsSet.add(member.department);
      }
    });
    
    return Array.from(departmentsSet).sort();
  }, [departments, allStaffMembers]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (departmentFilter !== "all") params.set("department", departmentFilter);
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (pageSize !== 20) params.set("limit", pageSize.toString());
    setSearchParams(params, { replace: true });
  }, [debouncedSearchQuery, statusFilter, departmentFilter, currentPage, pageSize, setSearchParams]);

  // Format date helper
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "On Leave":
        return "secondary";
      case "Deactivated":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Staff Overview</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage and view all company staff members</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {canCreate && (
                <>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full md:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add Staff
                      </Button>
                    </DialogTrigger>
                <DialogContent className="max-w-2xl w-[95%]">
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>Enter staff details</DialogDescription>
                  </DialogHeader>

                  {/* FORM */}
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    
                    // Validate passwords - both are mandatory
                    if (!formData.password || !formData.confirmPassword) {
                      message.error("Both password and confirm password are required");
                      return;
                    }

                    if (formData.password !== formData.confirmPassword) {
                      message.error("Passwords do not match");
                      return;
                    }

                    if (formData.password.length < 8) {
                      message.error("Password must be at least 8 characters long");
                      return;
                    }

                    // Validate phone number is exactly 10 digits
                    if (!formData.phone || formData.phone.length !== 10 || !/^\d{10}$/.test(formData.phone)) {
                      message.error("Phone number must be exactly 10 digits");
                      return;
                    }

                    try {
                      await createStaff({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        alternativePhone: formData.alternativePhone || undefined,
                        countryCode: formData.countryCode,
                        designation: formData.designation,
                        department: formData.department,
                        staffType: formData.staffType,
                        status: "Active",
                        branchId: formData.branchId || undefined,
                        password: formData.password,
                        shiftName: formData.shiftName && formData.shiftName !== "none" ? formData.shiftName : undefined,
                        attendanceTemplateId: formData.attendanceTemplateId && formData.attendanceTemplateId !== "none" ? formData.attendanceTemplateId : undefined,
                        leaveTemplateId: formData.leaveTemplateId && formData.leaveTemplateId !== "none" ? formData.leaveTemplateId : undefined,
                        holidayTemplateId: formData.holidayTemplateId && formData.holidayTemplateId !== "none" ? formData.holidayTemplateId : undefined,
                        managerId: formData.managerId && formData.managerId !== "none" ? formData.managerId : undefined,
                        role: formData.role && formData.role !== "none" ? formData.role : undefined,
                      }).unwrap();
                      message.success("Staff added successfully!");
                      setIsAddDialogOpen(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        alternativePhone: "",
                        countryCode: "91",
                        designation: "",
                        department: "",
                        staffType: "Full Time",
                        branchId: "",
                        password: "",
                        confirmPassword: "",
                        shiftName: "",
                        attendanceTemplateId: "",
                        leaveTemplateId: "",
                        holidayTemplateId: "",
                        managerId: "",
                        role: ""
                      });
                      setDepartmentSearch("");
                      setNewDepartmentName("");
                      setOpenDepartment(false);
                      setShowPasswords({
                        password: false,
                        confirmPassword: false
                      });
                    } catch (error: any) {
                      message.error(error?.data?.error?.message || "Failed to add staff");
                    }
                  }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                      <div className="space-y-1">
                        <Label>Name <span className="text-red-500">*</span></Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Email <span className="text-red-500">*</span></Label>
                        <Input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Country Code <span className="text-red-500">*</span></Label>
                        <Select
                          value={formData.countryCode}
                          onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country code" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {getCountryOptions().map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.flag} +{option.code} {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Phone Number <span className="text-red-500">*</span></Label>
                        <Input
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                            if (value.length <= 10) {
                              setFormData({ ...formData, phone: value });
                            }
                          }}
                          placeholder="Enter 10 digit phone number"
                          required
                          maxLength={10}
                          minLength={10}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter exactly 10 digits
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label>Alternative Phone Number (Optional)</Label>
                        <Input
                          name="alternativePhone"
                          type="tel"
                          value={formData.alternativePhone || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                            if (value.length <= 10) {
                              setFormData({ ...formData, alternativePhone: value || undefined });
                            }
                          }}
                          placeholder="Enter 10 digit alternative phone number"
                          maxLength={10}
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional - Enter exactly 10 digits
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label>Designation <span className="text-red-500">*</span></Label>
                        <Input
                          name="designation"
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Department <span className="text-red-500">*</span></Label>
                        <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openDepartment} className="w-full justify-between">
                              {formData.department ? formData.department : "Select or enter department..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search or type new department..."
                                value={departmentSearch}
                                onValueChange={(value) => {
                                  setDepartmentSearch(value);
                                  setNewDepartmentName(value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && departmentSearch.trim()) {
                                    e.preventDefault();
                                    setNewDepartmentName(departmentSearch);
                                    handleCreateDepartment();
                                  }
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 space-y-2">
                                    <div className="text-sm text-muted-foreground text-center">
                                      No department found.
                                    </div>
                                    {departmentSearch.trim() && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                          setNewDepartmentName(departmentSearch);
                                          handleCreateDepartment();
                                        }}
                                      >
                                        <X className="h-4 w-4 mr-2 rotate-45" />
                                        Add "{departmentSearch}"
                                      </Button>
                                    )}
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {departments
                                    .filter((dept) =>
                                      !departmentSearch || dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
                                    )
                                    .map((dept) => (
                                      <CommandItem
                                        key={dept._id}
                                        value={dept.name}
                                        onSelect={(currentValue) => {
                                          setFormData({ ...formData, department: dept.name });
                                          setOpenDepartment(false);
                                          setDepartmentSearch("");
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", formData.department === dept.name ? "opacity-100" : "opacity-0")} />
                                        {dept.name}
                                      </CommandItem>
                                    ))}
                                  {uniqueDepartments
                                    .filter((dept) => !departments.some(d => d.name.toLowerCase() === dept.toLowerCase()))
                                    .filter((dept) =>
                                      !departmentSearch || dept.toLowerCase().includes(departmentSearch.toLowerCase())
                                    )
                                    .map((dept) => (
                                      <CommandItem
                                        key={dept}
                                        value={dept}
                                        onSelect={(currentValue) => {
                                          setFormData({ ...formData, department: dept });
                                          setOpenDepartment(false);
                                          setDepartmentSearch("");
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", formData.department === dept ? "opacity-100" : "opacity-0")} />
                                        {dept}
                                      </CommandItem>
                                    ))}
                                  {departmentSearch.trim() && 
                                   !departments.some(d => d.name.toLowerCase() === departmentSearch.toLowerCase()) &&
                                   !uniqueDepartments.some(d => d.toLowerCase() === departmentSearch.toLowerCase()) && (
                                    <CommandItem
                                      onSelect={() => {
                                        setNewDepartmentName(departmentSearch);
                                        handleCreateDepartment();
                                      }}
                                      className="text-primary font-medium"
                                    >
                                      <X className="h-4 w-4 mr-2 rotate-45" />
                                      Add "{departmentSearch}" as new department
                                    </CommandItem>
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label>Staff Type <span className="text-red-500">*</span></Label>
                        <Select
                          value={formData.staffType}
                          onValueChange={(value: any) => setFormData({ ...formData, staffType: value })}
                          required
                        >
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full Time">Full Time</SelectItem>
                            <SelectItem value="Part Time">Part Time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {branches.length > 0 && (
                        <div className="space-y-1">
                          <Label>Branch</Label>
                          <Select
                            value={formData.branchId}
                            onValueChange={(value) => setFormData({ ...formData, branchId: value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch._id} value={branch._id}>
                                  {branch.branchName} {branch.isHeadOffice ? "(Head Office)" : ""} - {branch.branchCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label>Password <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type={showPasswords.password ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Set login password for employee"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                          >
                            {showPasswords.password ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Password is required for employee login (minimum 8 characters)
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label>Confirm Password <span className="text-red-500">*</span></Label>
                        <div className="relative">
                          <Input
                            type={showPasswords.confirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="Confirm password"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                          >
                            {showPasswords.confirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                          <p className="text-xs text-red-500">
                            Passwords do not match
                          </p>
                        )}
                      </div>
                      {shifts.length > 0 && (
                        <div className="space-y-1">
                          <Label>Shift</Label>
                          <Select
                            value={formData.shiftName || undefined}
                            onValueChange={(value) => setFormData({ ...formData, shiftName: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select shift (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {shifts.map((shift, index) => (
                                <SelectItem key={index} value={shift.name}>
                                  {shift.name} ({shift.startTime} - {shift.endTime})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {attendanceTemplates.length > 0 && (
                        <div className="space-y-1">
                          <Label>Attendance Template</Label>
                          <Select
                            value={formData.attendanceTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, attendanceTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select attendance template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {attendanceTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {leaveTemplates.length > 0 && (
                        <div className="space-y-1">
                          <Label>Leave Template</Label>
                          <Select
                            value={formData.leaveTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, leaveTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select leave template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {leaveTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {holidayTemplates.length > 0 && (
                        <div className="space-y-1">
                          <Label>Holiday Template</Label>
                          <Select
                            value={formData.holidayTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, holidayTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select holiday template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {holidayTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label>Reporting Manager</Label>
                        <Select
                          value={formData.managerId}
                          onValueChange={(value) => setFormData({ ...formData, managerId: value === "none" ? "" : value })}
                        >
                          <SelectTrigger><SelectValue placeholder="Select reporting manager (optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {allStaffForManager.map((staffMember) => (
                              <SelectItem key={staffMember._id} value={staffMember._id}>
                                {staffMember.name} ({staffMember.employeeId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => setFormData({ ...formData, role: value === "none" ? "" : value })}
                        >
                          <SelectTrigger><SelectValue placeholder="Select role (optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="Intern">Intern</SelectItem>
                            <SelectItem value="Employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsAddDialogOpen(false);
                        setFormData({
                          name: "",
                          email: "",
                          phone: "",
                          designation: "",
                          department: "",
                          staffType: "Full Time",
                          branchId: "",
                          password: "",
                          confirmPassword: "",
                          shiftName: "",
                          attendanceTemplateId: "",
                          leaveTemplateId: "",
                          holidayTemplateId: "",
                          managerId: "",
                          role: ""
                        });
                        setDepartmentSearch("");
                        setNewDepartmentName("");
                        setOpenDepartment(false);
                        setShowPasswords({
                          password: false,
                          confirmPassword: false
                        });
                      }}>Cancel</Button>
                      <Button type="submit" disabled={isCreating}>{isCreating ? "Adding..." : "Add Staff"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto">
                    <Upload className="w-4 h-4 mr-2" /> Import Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl w-[95%]">
                  <DialogHeader>
                    <DialogTitle>Import Staff from Excel</DialogTitle>
                    <DialogDescription>
                      Upload an Excel file to import staff members. Download the sample file to see the required format.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Excel File</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.xlsm"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                            }
                          }}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          {selectedFile ? selectedFile.name : "Choose File"}
                        </Button>
                        {selectedFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Only Excel files (.xlsx, .xls, .xlsm) are allowed. Maximum file size: 10MB
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isDownloadingSample}
                        onClick={async () => {
                          try {
                            const blob = await downloadSampleStaffFile().unwrap();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'samplestafffile.xlsx';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            message.success("Sample file downloaded successfully");
                          } catch (error: any) {
                            const errorMessage = error?.data?.error?.message || error?.error?.data?.error?.message || "Failed to download sample file";
                            message.error(errorMessage);
                          }
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" /> {isDownloadingSample ? "Downloading..." : "Download Sample File"}
                      </Button>
                    </div>

                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-2">Required Columns:</p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>Name (Mandatory)</li>
                        <li>Email (Mandatory)</li>
                        <li>Phone (Mandatory)</li>
                        <li>Designation (Mandatory)</li>
                        <li>Department (Mandatory)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsImportDialogOpen(false);
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={!selectedFile || isImporting}
                      onClick={async () => {
                        if (!selectedFile) {
                          message.error("Please select a file");
                          return;
                        }

                        try {
                          const result = await importStaffFromExcel({ file: selectedFile }).unwrap();
                          message.success(
                            `Import completed! ${result.data.imported} imported, ${result.data.failed} failed`
                          );
                          
                          if (result.data.failed.length > 0) {
                            const failedList = result.data.failed
                              .map((f: any) => `Row ${f.row}: ${f.error}`)
                              .join('\n');
                            message.warning(`Some rows failed:\n${failedList}`, 10);
                          }

                          setIsImportDialogOpen(false);
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        } catch (error: any) {
                          message.error(
                            error?.data?.error?.message || "Failed to import staff from Excel"
                          );
                        }
                      }}
                    >
                      {isImporting ? "Importing..." : "Import Staff"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                className="w-full md:w-auto"
                disabled={isExporting}
                onClick={async () => {
                  try {
                    const blob = await exportStaffToExcel().unwrap();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `staff_export_${Date.now()}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    message.success("Staff data exported successfully");
                  } catch (error: any) {
                    const errorMessage = error?.data?.error?.message || error?.error?.data?.error?.message || "Failed to export staff data";
                    message.error(errorMessage);
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" /> {isExporting ? "Exporting..." : "Export Staff"}
              </Button>
                </>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* STAFF TABLE */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Staff List</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {pagination ? `Showing ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, pagination.total)} of ${pagination.total}` : "Loading..."}
                  </div>
                </div>

                {/* SEARCH + FILTERS */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, or email..."
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
                        onClick={() => {
                          setSearchQuery("");
                        }}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    )}
                  </div>

                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-full sm:w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={departmentFilter} onValueChange={(value) => {
                    setDepartmentFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {uniqueDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Employee ID</TableHead>
                        <TableHead className="min-w-[180px]">Name</TableHead>
                        <TableHead className="min-w-[150px]">Designation</TableHead>
                        <TableHead className="min-w-[130px]">Department</TableHead>
                        <TableHead className="min-w-[150px]">Job Position</TableHead>
                        <TableHead className="min-w-[100px]">Type</TableHead>
                        <TableHead className="min-w-[200px]">Contact</TableHead>
                        <TableHead className="min-w-[120px]">Joining Date</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[200px]">Policies & Templates</TableHead>
                        {statusFilter !== "On Leave" && (
                          <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {(isLoadingStaff || (statusFilter === "On Leave" && isLoadingAttendance)) ? (
                        <TableRow>
                          <TableCell colSpan={statusFilter === "On Leave" ? 10 : 11} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              <span className="text-muted-foreground">Loading staff data...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : staff.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={statusFilter === "On Leave" ? 10 : 11} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <UsersIcon className="w-12 h-12 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">No staff found</span>
                              <span className="text-sm text-muted-foreground">
                                {statusFilter === "On Leave" && todayAbsentEmployeeIds.size === 0
                                  ? "No staff members are absent today"
                                  : searchQuery || statusFilter !== "all" || departmentFilter !== "all"
                                  ? "Try adjusting your filters"
                                  : "Get started by adding a new staff member"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        staff.map((staffMember) => (
                          <TableRow
                            key={staffMember._id}
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${!canView ? 'pointer-events-none opacity-60' : ''}`}
                            onClick={() => canView && navigate(`/staff-profile/${staffMember._id}`)}
                          >
                            <TableCell className="font-medium">{staffMember.employeeId}</TableCell>
                            <TableCell>
                              <div className="font-medium">{staffMember.name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{staffMember.designation}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{staffMember.department}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {staffMember.designation || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {staffMember.staffType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs">{staffMember.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs">
                                    {staffMember.countryCode ? `+${staffMember.countryCode} ` : ''}{staffMember.phone}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(staffMember.joiningDate)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(staffMember.status)}>
                                {staffMember.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs">
                                {staffMember.shiftName && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Shift:</span>
                                    <Badge variant="outline" className="text-xs">{staffMember.shiftName}</Badge>
                                  </div>
                                )}
                                {staffMember.attendanceTemplateId && typeof staffMember.attendanceTemplateId === 'object' && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Att:</span>
                                    <span className="text-xs">{staffMember.attendanceTemplateId.name}</span>
                                  </div>
                                )}
                                {staffMember.leaveTemplateId && typeof staffMember.leaveTemplateId === 'object' && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Leave:</span>
                                    <span className="text-xs">{staffMember.leaveTemplateId.name}</span>
                                  </div>
                                )}
                                {staffMember.holidayTemplateId && typeof staffMember.holidayTemplateId === 'object' && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Holiday:</span>
                                    <span className="text-xs">{staffMember.holidayTemplateId.name}</span>
                                  </div>
                                )}
                                {!staffMember.shiftName && 
                                 (!staffMember.attendanceTemplateId || typeof staffMember.attendanceTemplateId === 'string') &&
                                 (!staffMember.leaveTemplateId || typeof staffMember.leaveTemplateId === 'string') &&
                                 (!staffMember.holidayTemplateId || typeof staffMember.holidayTemplateId === 'string') && (
                                  <span className="text-muted-foreground text-xs">Not assigned</span>
                                )}
                              </div>
                            </TableCell>

                            {/* STOP PROPAGATION FOR ACTION BUTTONS */}
                            {statusFilter !== "On Leave" && (
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-2">
                                  {canView && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => navigate(`/staff-profile/${staffMember._id}`)}
                                      title="View Profile"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* PAGINATION */}
              {pagination && statusFilter !== "On Leave" && (
                <div className="px-6 py-4 border-t">
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
                </div>
              )}
              {statusFilter === "On Leave" && staff.length > 0 && (
                <div className="px-6 py-4 border-t text-sm text-muted-foreground text-center">
                  Showing {staff.length} staff member{staff.length !== 1 ? 's' : ''} absent today
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </MainLayout>
  );
};

export default Staff;
