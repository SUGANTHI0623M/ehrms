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
import { Search, Plus, Edit, Eye, EyeOff, Users as UsersIcon, X, Mail, Phone, Calendar, Building2, Filter } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { useGetStaffQuery, useGetStaffStatsQuery, useCreateStaffMutation, useGetAvailableShiftsQuery, useGetAvailableTemplatesQuery } from "@/store/api/staffApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    department: "",
    staffType: "Full Time" as const,
    branchId: "",
    password: "",
    confirmPassword: "",
    shiftName: "",
    attendanceTemplateId: "",
    leaveTemplateId: "",
    holidayTemplateId: ""
  });
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

  const { data: staffData, isLoading: isLoadingStaff } = useGetStaffQuery({
    search: debouncedSearchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    department: departmentFilter !== "all" ? departmentFilter : undefined,
    page: currentPage,
    limit: pageSize
  });

  const { data: statsData, isLoading: isLoadingStats } = useGetStaffStatsQuery();
  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();

  const stats = statsData?.data?.stats ? [
    { title: "Total Staff", value: statsData.data.stats.total.toString(), color: "text-primary", icon: UsersIcon },
    { title: "Active", value: statsData.data.stats.active.toString(), color: "text-green-600", icon: UsersIcon },
    { title: "On Leave", value: statsData.data.stats.onLeave.toString(), color: "text-yellow-600", icon: UsersIcon },
    { title: "Deactivated", value: statsData.data.stats.deactivated.toString(), color: "text-gray-500", icon: UsersIcon },
  ] : [
    { title: "Total Staff", value: "0", color: "text-primary", icon: UsersIcon },
    { title: "Active", value: "0", color: "text-green-600", icon: UsersIcon },
    { title: "On Leave", value: "0", color: "text-yellow-600", icon: UsersIcon },
    { title: "Deactivated", value: "0", color: "text-gray-500", icon: UsersIcon },
  ];

  const staff = staffData?.data?.staff || [];
  const pagination = staffData?.data?.pagination;

  // Get unique departments from staff data
  const uniqueDepartments = useMemo(() => {
    const departments = new Set<string>();
    staff.forEach((member) => {
      if (member.department) {
        departments.add(member.department);
      }
    });
    return Array.from(departments).sort();
  }, [staff]);

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

            {canCreate && (
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
                    
                    // Validate passwords if provided
                    if (formData.password && formData.password !== formData.confirmPassword) {
                      message.error("Passwords do not match");
                      return;
                    }

                    if (formData.password && formData.password.length < 6) {
                      message.error("Password must be at least 6 characters long");
                      return;
                    }

                    try {
                      await createStaff({
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        designation: formData.designation,
                        department: formData.department,
                        staffType: formData.staffType,
                        status: "Active",
                        branchId: formData.branchId || undefined,
                        password: formData.password || undefined,
                        shiftName: formData.shiftName && formData.shiftName !== "none" ? formData.shiftName : undefined,
                        attendanceTemplateId: formData.attendanceTemplateId && formData.attendanceTemplateId !== "none" ? formData.attendanceTemplateId : undefined,
                        leaveTemplateId: formData.leaveTemplateId && formData.leaveTemplateId !== "none" ? formData.leaveTemplateId : undefined,
                        holidayTemplateId: formData.holidayTemplateId && formData.holidayTemplateId !== "none" ? formData.holidayTemplateId : undefined,
                      }).unwrap();
                      message.success("Staff added successfully!");
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
                        holidayTemplateId: ""
                      });
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
                        <Label>Phone <span className="text-red-500">*</span></Label>
                        <Input
                          name="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
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
                        <Select
                          value={formData.department}
                          onValueChange={(value) => setFormData({ ...formData, department: value })}
                          required
                        >
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {uniqueDepartments.length > 0 ? (
                              uniqueDepartments.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="HR">HR</SelectItem>
                                <SelectItem value="Development">Development</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Sales">Sales</SelectItem>
                                <SelectItem value="Operations">Operations</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="IT">IT</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
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
                        <Label>Password (Optional)</Label>
                        <div className="relative">
                          <Input
                            type={showPasswords.password ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Set login password for employee"
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
                          If not provided, a random password will be generated
                        </p>
                      </div>
                      {formData.password && (
                        <div className="space-y-1">
                          <Label>Confirm Password</Label>
                          <div className="relative">
                            <Input
                              type={showPasswords.confirmPassword ? "text" : "password"}
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                              placeholder="Confirm password"
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
                        </div>
                      )}
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
                          holidayTemplateId: ""
                        });
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
            )}
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
                        <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoadingStaff ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              <span className="text-muted-foreground">Loading staff data...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : staff.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <UsersIcon className="w-12 h-12 text-muted-foreground" />
                              <span className="text-muted-foreground font-medium">No staff found</span>
                              <span className="text-sm text-muted-foreground">
                                {searchQuery || statusFilter !== "all" || departmentFilter !== "all"
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
                              {staffMember.jobOpeningId && typeof staffMember.jobOpeningId === 'object' ? (
                                <div className="text-sm">
                                  <div className="font-medium">{staffMember.jobOpeningId.title}</div>
                                  {staffMember.jobOpeningId.department && (
                                    <div className="text-xs text-muted-foreground">{staffMember.jobOpeningId.department}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
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
                                  <span className="text-xs">{staffMember.phone}</span>
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
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* PAGINATION */}
              {pagination && (
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
            </CardContent>
          </Card>

        </div>
      </main>
    </MainLayout>
  );
};

export default Staff;
