import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Eye, Edit, Search, MapPin, Settings, X, BarChart3, Briefcase, TrendingUp, TrendingDown, Users, CheckCircle2, XCircle, Filter } from "lucide-react";
import {
  useGetJobOpeningsQuery,
  useDeleteJobOpeningMutation,
  useGetJobOpeningDashboardQuery,
  useGetDepartmentsQuery,
} from "@/store/api/jobOpeningApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

const JobOpeningsList = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const userPermissions = useMemo(() => {
    if (!currentUser) return [];
    const roleId = typeof currentUser.roleId === 'object' ? currentUser.roleId : null;
    return getUserPermissions(currentUser?.role, roleId as any, currentUser?.permissions || []);
  }, [currentUser]);
  const canAdd = hasAction(userPermissions, 'job_openings', 'add');
  const canEdit = hasAction(userPermissions, 'job_openings', 'edit');
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const sizeParam = searchParams.get("limit");
    return sizeParam ? parseInt(sizeParam, 10) : 10; // Default 10
  });
  
  // Advanced filter states
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState<string[]>([]); // ['Intern', 'Fresher', 'Experienced']
  const [roleFilters, setRoleFilters] = useState<{
    Intern: string[];
    Fresher: string[];
    Experienced: string[];
  }>({
    Intern: [],
    Fresher: [],
    Experienced: [],
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get("search") || "");
  const isInitialMount = useRef(true);
  const lastSearchQuery = useRef(searchQuery);
  const lastPage = useRef(page);
  const lastPageSize = useRef(pageSize);
  const lastStatusFilter = useRef(statusFilter);

  // Sync search, page, and page size with URL query params on mount only
  useEffect(() => {
    if (isInitialMount.current) {
      const urlSearch = searchParams.get("search") || "";
      const urlPage = searchParams.get("page");
      const urlLimit = searchParams.get("limit");
      
      if (urlSearch) {
        setSearchQuery(urlSearch);
        setDebouncedSearchQuery(urlSearch);
        lastSearchQuery.current = urlSearch;
      }
      if (urlPage) {
        const pageNum = parseInt(urlPage, 10);
        if (pageNum > 0) {
          setPage(pageNum);
          lastPage.current = pageNum;
        }
      }
      if (urlLimit) {
        const limitNum = parseInt(urlLimit, 10);
        if (limitNum > 0 && [10, 20, 50, 100].includes(limitNum)) {
          setPageSize(limitNum);
          lastPageSize.current = limitNum;
        }
      }
      
      isInitialMount.current = false;
    }
  }, []);

  // Debounce search input and update URL
  useEffect(() => {
    if (isInitialMount.current) return;
    if (lastSearchQuery.current === searchQuery) return;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      lastSearchQuery.current = searchQuery;
      setDebouncedSearchQuery(searchQuery);
      
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        if (searchQuery.trim()) {
          newParams.set("search", searchQuery.trim());
        } else {
          newParams.delete("search");
        }
        newParams.set("page", "1");
        return newParams;
      }, { replace: true });
      
      if (lastPage.current !== 1) {
        lastPage.current = 1;
        setPage(1);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, setSearchParams]);

  // Reset to page 1 when debounced search or filter changes
  useEffect(() => {
    if (isInitialMount.current) return;
    if (lastStatusFilter.current === statusFilter && lastSearchQuery.current === debouncedSearchQuery) return;
    
    lastStatusFilter.current = statusFilter;
    
    if (lastPage.current !== 1) {
      lastPage.current = 1;
      setPage(1);
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        newParams.set("page", "1");
        return newParams;
      }, { replace: true });
    }
  }, [debouncedSearchQuery, statusFilter, setSearchParams]);

  // Update page size in URL when it changes
  useEffect(() => {
    if (isInitialMount.current) return;
    if (lastPageSize.current === pageSize) return;
    
    lastPageSize.current = pageSize;
    
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (pageSize !== 10) {
        newParams.set("limit", pageSize.toString());
      } else {
        newParams.delete("limit");
      }
      newParams.set("page", "1");
      return newParams;
    }, { replace: true });
    
    if (lastPage.current !== 1) {
      lastPage.current = 1;
      setPage(1);
    }
  }, [pageSize, setSearchParams]);

  // Update page in URL when page changes
  useEffect(() => {
    if (isInitialMount.current) return;
    if (lastPage.current === page) return;
    
    lastPage.current = page;
    
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (page > 1) {
        newParams.set("page", page.toString());
      } else {
        newParams.delete("page");
      }
      return newParams;
    }, { replace: true });
  }, [page, setSearchParams]);

  const { data, isLoading, error } = useGetJobOpeningsQuery({
    search: debouncedSearchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: pageSize,
  });

  const { data: dashboardData, isLoading: isLoadingDashboard } = useGetJobOpeningDashboardQuery();
  const { data: departmentsData } = useGetDepartmentsQuery();
  
  const departments = departmentsData?.data?.departments || [];

  const [deleteJobOpening] = useDeleteJobOpeningMutation();

  const allJobOpenings = data?.data?.jobOpenings || [];
  const pagination = data?.data?.pagination;
  
  // Filter job openings based on department and advanced filters
  const filteredJobOpenings = useMemo(() => {
    let filtered = [...allJobOpenings];
    
    // Filter by department
    if (departmentFilter !== "all") {
      filtered = filtered.filter((job) => job.department === departmentFilter);
    }
    
    // Filter by experience range
    if (experienceFilter.length > 0) {
      filtered = filtered.filter((job) => {
        const minExp = job.minExperience || 0;
        const maxExp = job.maxExperience || 0;
        
        return experienceFilter.some((exp) => {
          if (exp === "Intern") {
            return minExp === 0 && maxExp === 0;
          } else if (exp === "Fresher") {
            return minExp === 0 && maxExp <= 1;
          } else if (exp === "Experienced") {
            return minExp >= 1;
          }
          return false;
        });
      });
    }
    
    // Filter by roles
    const hasRoleFilters = Object.values(roleFilters).some((roles) => roles.length > 0);
    if (hasRoleFilters) {
      filtered = filtered.filter((job) => {
        const minExp = job.minExperience || 0;
        const maxExp = job.maxExperience || 0;
        
        // Determine experience category
        let expCategory: "Intern" | "Fresher" | "Experienced" | null = null;
        if (minExp === 0 && maxExp === 0) {
          expCategory = "Intern";
        } else if (minExp === 0 && maxExp <= 1) {
          expCategory = "Fresher";
        } else if (minExp >= 1) {
          expCategory = "Experienced";
        }
        
        if (!expCategory) return true; // Include if no category match
        
        const selectedRoles = roleFilters[expCategory];
        if (selectedRoles.length === 0) return true; // No filter for this category
        
        return selectedRoles.includes(job.title);
      });
    }
    
    return filtered;
  }, [allJobOpenings, departmentFilter, experienceFilter, roleFilters]);
  
  // Paginate filtered results
  const jobOpenings = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredJobOpenings.slice(startIndex, endIndex);
  }, [filteredJobOpenings, page, pageSize]);
  
  // Get unique job titles for role filters, grouped by experience (from filtered jobs by department)
  const availableRoles = useMemo(() => {
    const roles: {
      Intern: string[];
      Fresher: string[];
      Experienced: string[];
    } = {
      Intern: [],
      Fresher: [],
      Experienced: [],
    };
    
    // Use department-filtered jobs for role options
    let jobsForRoles = [...allJobOpenings];
    if (departmentFilter !== "all") {
      jobsForRoles = jobsForRoles.filter((job) => job.department === departmentFilter);
    }
    
    jobsForRoles.forEach((job) => {
      const minExp = job.minExperience || 0;
      const maxExp = job.maxExperience || 0;
      const title = job.title;
      
      if (minExp === 0 && maxExp === 0 && !roles.Intern.includes(title)) {
        roles.Intern.push(title);
      } else if (minExp === 0 && maxExp <= 1 && !roles.Fresher.includes(title)) {
        roles.Fresher.push(title);
      } else if (minExp >= 1 && !roles.Experienced.includes(title)) {
        roles.Experienced.push(title);
      }
    });
    
    return roles;
  }, [allJobOpenings, departmentFilter]);
  
  // Calculate filtered stats (using all filtered jobs, not just paginated)
  const filteredStats = useMemo(() => {
    const stats = {
      totalOpenings: filteredJobOpenings.length,
      activeOpenings: filteredJobOpenings.filter((j) => j.status === "ACTIVE").length,
      closedOpenings: filteredJobOpenings.filter((j) => j.status === "CLOSED").length,
      totalApplicants: 0,
      selectedCandidates: 0,
      rejectedCandidates: 0,
      jobRoles: new Set<string>(),
    };
    
    filteredJobOpenings.forEach((job) => {
      const jobStats = dashboardData?.data?.jobOpenings?.find((j: any) => j._id === job._id);
      if (jobStats) {
        stats.totalApplicants += jobStats.totalApplicants || 0;
        stats.selectedCandidates += jobStats.selectedCandidates || 0;
        stats.rejectedCandidates += jobStats.rejectedCandidates || 0;
      }
      stats.jobRoles.add(job.title);
    });
    
    return stats;
  }, [filteredJobOpenings, dashboardData]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      DRAFT: { label: "Draft", variant: "outline" },
      ACTIVE: { label: "Active", variant: "default" },
      INACTIVE: { label: "Inactive", variant: "secondary" },
      CLOSED: { label: "Closed", variant: "secondary" },
      CANCELLED: { label: "Cancelled", variant: "destructive" },
    };
    const statusInfo = statusMap[status] || { label: status, variant: "secondary" as const };
    return (
      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
    );
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this job opening?")) {
      try {
        await deleteJobOpening(id).unwrap();
        toast.success("Job opening deleted successfully");
      } catch (error: any) {
        toast.error(error?.data?.error?.message || "Failed to delete job opening");
      }
    }
  };

  if (error) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12 text-destructive">
            Error loading job openings
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Job Openings</h1>
              <p className="text-muted-foreground mt-1">
                Manage and track all job openings with analytics
              </p>
            </div>
              <div className="flex items-center gap-3">
              <Select
                value={departmentFilter}
                onValueChange={(value) => {
                  setDepartmentFilter(value);
                  setPage(1);
                  // Clear role filters when department changes
                  setRoleFilters({ Intern: [], Fresher: [], Experienced: [] });
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canAdd && (
                <Button onClick={() => navigate("/job-openings/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Job
                </Button>
              )}
            </div>
          </div>

          {/* Dashboard Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Job Openings
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {filteredStats.totalOpenings}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      All job positions
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Openings
                </CardTitle>
                <TrendingUp className="h-4 w-4 " />
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold ">
                      {filteredStats.activeOpenings}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Currently hiring
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Applicants
                </CardTitle>
                <Users className="h-4 w-4 " />
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {filteredStats.totalApplicants}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all jobs
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Selected Candidates
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 " />
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold ">
                      {filteredStats.selectedCandidates}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Successfully selected
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Closed Openings
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {filteredStats.closedOpenings}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      No longer hiring
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Rejected Candidates
                </CardTitle>
                <XCircle className="h-4 w-4 " />
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold ">
                      {filteredStats.rejectedCandidates}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Not selected
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Job Roles
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingDashboard ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {filteredStats.jobRoles.size}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique positions
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search job openings..."
                    className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery((e.target.value || "").replace(/\s+/g, " "))
                    }
                    onPaste={(e) => {
                      const pasted = (e.clipboardData?.getData("text") ?? "").replace(/\s+/g, " ").trim();
                      e.preventDefault();
                      setSearchQuery(pasted);
                    }}
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchParams((prevParams) => {
                          const newParams = new URLSearchParams(prevParams);
                          newParams.delete("search");
                          return newParams;
                        }, { replace: true });
                      }}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setIsAdvancedFilterOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Advanced Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Openings Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Job Openings</CardTitle>
                
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading job openings...</p>
                </div>
              ) : jobOpenings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No job openings found</p>
                  {canAdd && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate("/job-openings/create")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Job Opening
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Code</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Job Type</TableHead>
                        <TableHead>Experience Level</TableHead>
                        <TableHead>Status</TableHead>
                        {/* <TableHead className="text-center">Applicants</TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3  " />
                            Selected
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <XCircle className="w-3 h-3   " />
                            Rejected
                          </div>
                        </TableHead> */}
                        <TableHead>Date Opened</TableHead>
                        <TableHead>Positions</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobOpenings.map((job) => {
                        // Find job stats from dashboard data
                        const jobStats = dashboardData?.data?.jobOpenings?.find((j: any) => j._id === job._id);
                        
                        return (
                          <TableRow key={job._id}>
                            <TableCell className="font-medium">{(job as any).jobCode || "-"}</TableCell>
                            <TableCell className="font-medium">{job.title}</TableCell>
                            <TableCell>
                              {(job as any).branchId ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span>
                                    {typeof (job as any).branchId === 'object' 
                                      ? (job as any).branchId.branchName 
                                      : 'Branch'}
                                    {typeof (job as any).branchId === 'object' && (job as any).branchId.isHeadOffice && " (Head Office)"}
                                  </span>
                                  {typeof (job as any).branchId === 'object' && (
                                    <span className="text-muted-foreground">
                                      - {(job as any).branchId.address?.city || (job as any).branchId.city}
                                    </span>
                                  )}
                                </div>
                              ) : job.location ? (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {job.location}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Remote</span>
                              )}
                            </TableCell>
                            <TableCell>{job.employmentType}</TableCell>
                            <TableCell>
                              {(job as any).minExperience !== undefined && (job as any).maxExperience !== undefined
                                ? `${(job as any).minExperience} - ${(job as any).maxExperience} Yrs`
                                : (job as any).experienceLevel || "N/A"}
                            </TableCell>
                            <TableCell>{getStatusBadge(job.status)}</TableCell>
                            {/* <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="w-fit">
                                  {jobStats?.totalApplicants || 0}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Total</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="bg-green-50  border-green-200 w-fit">
                                  {jobStats?.selectedCandidates || 0}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Selected</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 w-fit">
                                  {jobStats?.rejectedCandidates || 0}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Rejected</span>
                              </div>
                            </TableCell> */}
                            <TableCell>
                              {new Date(job.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{job.numberOfPositions}</TableCell>
                            <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/job-openings/${job._id}/view`)}
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/job-openings/${job._id}/edit`)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {filteredJobOpenings.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={filteredJobOpenings.length}
                    pages={Math.ceil(filteredJobOpenings.length / pageSize) || 1}
                    onPageChange={(newPage) => {
                      setPage(newPage);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setPage(1);
                    }}
                    showPageSizeSelector={true}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Advanced Filter Modal */}
      <Dialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>
              Filter job openings by experience range and specific roles
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Experience Range Filter */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Experience Range</Label>
              <div className="space-y-2">
                {["Intern", "Fresher", "Experienced"].map((exp) => (
                  <div key={exp} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exp-${exp}`}
                      checked={experienceFilter.includes(exp)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setExperienceFilter([...experienceFilter, exp]);
                        } else {
                          setExperienceFilter(experienceFilter.filter((e) => e !== exp));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`exp-${exp}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {exp}
                      {exp === "Intern" && " (0 years)"}
                      {exp === "Fresher" && " (0-1 years)"}
                      {exp === "Experienced" && " (1+ years)"}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Filters by Experience */}
            {(experienceFilter.length > 0 || Object.values(roleFilters).some(r => r.length > 0)) && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">Filter by Roles</Label>
                
                {experienceFilter.includes("Intern") && availableRoles.Intern.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Intern Roles
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                      {availableRoles.Intern.map((role) => (
                        <div key={`intern-${role}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-intern-${role}`}
                            checked={roleFilters.Intern.includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRoleFilters({
                                  ...roleFilters,
                                  Intern: [...roleFilters.Intern, role],
                                });
                              } else {
                                setRoleFilters({
                                  ...roleFilters,
                                  Intern: roleFilters.Intern.filter((r) => r !== role),
                                });
                              }
                            }}
                          />
                          <Label
                            htmlFor={`role-intern-${role}`}
                            className="text-sm font-normal cursor-pointer truncate"
                          >
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {experienceFilter.includes("Fresher") && availableRoles.Fresher.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Fresher Roles
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                      {availableRoles.Fresher.map((role) => (
                        <div key={`fresher-${role}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-fresher-${role}`}
                            checked={roleFilters.Fresher.includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRoleFilters({
                                  ...roleFilters,
                                  Fresher: [...roleFilters.Fresher, role],
                                });
                              } else {
                                setRoleFilters({
                                  ...roleFilters,
                                  Fresher: roleFilters.Fresher.filter((r) => r !== role),
                                });
                              }
                            }}
                          />
                          <Label
                            htmlFor={`role-fresher-${role}`}
                            className="text-sm font-normal cursor-pointer truncate"
                          >
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {experienceFilter.includes("Experienced") && availableRoles.Experienced.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Experienced Roles
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                      {availableRoles.Experienced.map((role) => (
                        <div key={`experienced-${role}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-experienced-${role}`}
                            checked={roleFilters.Experienced.includes(role)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRoleFilters({
                                  ...roleFilters,
                                  Experienced: [...roleFilters.Experienced, role],
                                });
                              } else {
                                setRoleFilters({
                                  ...roleFilters,
                                  Experienced: roleFilters.Experienced.filter((r) => r !== role),
                                });
                              }
                            }}
                          />
                          <Label
                            htmlFor={`role-experienced-${role}`}
                            className="text-sm font-normal cursor-pointer truncate"
                          >
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {experienceFilter.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Select an experience range above to filter by roles
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExperienceFilter([]);
                setRoleFilters({ Intern: [], Fresher: [], Experienced: [] });
              }}
            >
              Clear All
            </Button>
            <Button onClick={() => {
              setIsAdvancedFilterOpen(false);
              setPage(1);
            }}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default JobOpeningsList;

