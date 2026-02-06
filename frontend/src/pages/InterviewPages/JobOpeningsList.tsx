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
import { Plus, Eye, Edit, Search, MapPin, Settings, X } from "lucide-react";
import {
  useGetJobOpeningsQuery,
  useDeleteJobOpeningMutation,
} from "@/store/api/jobOpeningApi";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { Pagination } from "@/components/ui/Pagination";

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
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const sizeParam = searchParams.get("limit");
    return sizeParam ? parseInt(sizeParam, 10) : 10; // Default 10
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

  const [deleteJobOpening] = useDeleteJobOpeningMutation();

  const jobOpenings = data?.data?.jobOpenings || [];
  const pagination = data?.data?.pagination;

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
                Manage and track all job openings
              </p>
            </div>
            {canAdd && (
              <Button onClick={() => navigate("/job-openings/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Add Job
              </Button>
            )}
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
              </div>
            </CardContent>
          </Card>

          {/* Job Openings Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Job Openings</CardTitle>
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
                        <TableHead>Date Opened</TableHead>
                        <TableHead>Positions</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobOpenings.map((job) => (
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {(pagination || data?.data) && (
                <div className="mt-6 pt-4 border-t">
                  <Pagination
                    page={pagination?.page || page}
                    pageSize={pageSize}
                    total={pagination?.total || (data?.data?.jobOpenings?.length || 0)}
                    pages={pagination?.pages || Math.ceil((pagination?.total || data?.data?.jobOpenings?.length || 0) / pageSize) || 1}
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
    </MainLayout>
  );
};

export default JobOpeningsList;

